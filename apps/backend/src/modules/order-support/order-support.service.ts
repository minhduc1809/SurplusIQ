import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import {
  IncidentStatus,
  IncidentType,
  PickupIncidentEntity,
} from '../../entities/order-support/pickup-incident.entity';
import { OrderMessageEntity } from '../../entities/order-support/order-message.entity';
import { NotificationType } from '../../entities/notifications/notification.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createRefundTransaction } from '../payments/refund-transaction';
import { CreateIncidentDto, RespondIncidentDto, SendOrderMessageDto } from './order-support.dto';

/** Loại sự cố do cửa hàng gây ra: khách không bị tính không đến nhận khi đang chờ xử lý, và tự hoàn tiền nếu cửa hàng im lặng. */
export const STORE_FAULT_TYPES = [IncidentType.STORE_CLOSED, IncidentType.NOT_READY];

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  [IncidentType.STORE_CLOSED]: 'Cửa hàng đóng cửa',
  [IncidentType.NOT_READY]: 'Món chưa sẵn sàng',
  [IncidentType.WRONG_ITEM]: 'Sai món',
  [IncidentType.LONG_WAIT]: 'Chờ quá lâu',
  [IncidentType.OTHER]: 'Sự cố khác',
};

const INCIDENT_WINDOW_BEFORE_MIN = 15;
const INCIDENT_WINDOW_AFTER_MIN = 60;
const MAX_INCIDENTS_PER_ORDER = 3;
const AUTO_REFUND_AFTER_HOURS = 2;
const CHAT_OPEN_AFTER_END_HOURS = 24;
const CHAT_MAX_PER_HOUR = 30;

const maskCustomer = (id: string) => `Khách KH-${id.slice(-4).toUpperCase()}`;

/** KX12 theo dõi đơn, KX03 sự cố khi nhận, KX11 trò chuyện theo đơn. */
@Injectable()
export class OrderSupportService implements OnModuleInit {
  private readonly logger = new Logger(OrderSupportService.name);

  constructor(
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OfferEntity) private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(StoreEntity) private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(PickupIncidentEntity)
    private readonly incidentRepo: Repository<PickupIncidentEntity>,
    @InjectRepository(OrderMessageEntity)
    private readonly messageRepo: Repository<OrderMessageEntity>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditLogService,
  ) {}

  /**
   * shortcut: hẹn giờ trong tiến trình thay vì hàng đợi BullMQ; an toàn khi chạy nhiều bản nhờ khóa tư vấn Postgres.
   */
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    setInterval(
      () =>
        void this.processIncidentDeadlines().catch((e) =>
          this.logger.error(`[INCIDENT_DEADLINES] ${e}`),
        ),
      10 * 60 * 1000,
    ).unref();
  }

  private async ownOrder(customerId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, customerId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    return order;
  }

  // ---------------------------------------------------------------- KX12 theo dõi đơn

  async getTracking(customerId: string, orderId: string) {
    const order = await this.ownOrder(customerId, orderId);
    const [offer, store, coords, openIncident, unread] = await Promise.all([
      this.offerRepo.findOne({ where: { id: order.offerId } }),
      this.storeRepo.findOne({ where: { id: order.storeId } }),
      this.dataSource.query(
        'SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM stores WHERE id = $1',
        [order.storeId],
      ),
      this.incidentRepo.count({
        where: { orderId, status: In([IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED]) },
      }),
      this.messageRepo.count({ where: { orderId, senderRole: 'STORE', readAt: IsNull() } }),
    ]);

    const now = Date.now();
    const start = offer ? new Date(offer.pickupStart).getTime() : null;
    const end = offer ? new Date(offer.pickupEnd).getTime() : null;
    const paid = order.status === OrderStatus.PAID || order.status === OrderStatus.PICKED_UP;
    const inWindow = start !== null && end !== null && now >= start && now <= end;

    type State = 'done' | 'current' | 'pending';
    const steps: { key: string; label: string; at: Date | null; state: State }[] = [
      { key: 'PLACED', label: 'Đã đặt suất', at: order.createdAt, state: 'done' },
      {
        key: 'PAID',
        label: 'Đã thanh toán',
        at: order.paidAt,
        state: paid ? 'done' : order.status === OrderStatus.PENDING_PAYMENT ? 'current' : 'pending',
      },
      {
        key: 'READY',
        label: 'Đến giờ nhận hàng',
        at: offer ? new Date(offer.pickupStart) : null,
        state:
          order.status === OrderStatus.PICKED_UP || (paid && start !== null && now >= start)
            ? order.status === OrderStatus.PICKED_UP
              ? 'done'
              : 'current'
            : 'pending',
      },
      {
        key: 'PICKED_UP',
        label: 'Đã nhận hàng',
        at: order.pickedUpAt,
        state: order.status === OrderStatus.PICKED_UP ? 'done' : 'pending',
      },
    ];

    const terminalLabels: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.CANCELLED]: 'Đơn đã hủy',
      [OrderStatus.HOLD_EXPIRED]: 'Hết hạn giữ suất',
      [OrderStatus.PICKUP_EXPIRED]: 'Quá hạn nhận hàng',
      [OrderStatus.REFUNDED]: 'Đã hoàn tiền',
    };
    const terminalLabel = terminalLabels[order.status];
    const terminal = terminalLabel
      ? {
          key: order.status,
          label: terminalLabel,
          at: order.cancelledAt ?? order.updatedAt,
          reason: order.cancelReason,
        }
      : null;

    return {
      orderId: order.id,
      code: order.code,
      status: order.status,
      steps: terminal ? steps.filter((s) => s.state === 'done') : steps,
      terminal,
      holdSecondsLeft:
        order.status === OrderStatus.PENDING_PAYMENT
          ? Math.max(0, Math.floor((new Date(order.holdExpiresAt).getTime() - now) / 1000))
          : null,
      pickup: offer
        ? {
            start: offer.pickupStart,
            end: offer.pickupEnd,
            inWindow,
            minutesLeft: end !== null && now <= end ? Math.floor((end - now) / 60000) : 0,
            slot: order.pickupSlot,
          }
        : null,
      store: store
        ? {
            id: store.id,
            name: store.name,
            address: store.address,
            latitude: coords?.[0]?.lat ?? null,
            longitude: coords?.[0]?.lng ?? null,
          }
        : null,
      hasOpenIncident: openIncident > 0,
      unreadMessages: unread,
      arrivingNotifiedAt: order.arrivingNotifiedAt,
    };
  }

  // ---------------------------------------------------------------- KX03 sự cố khi nhận

  async createIncident(customerId: string, orderId: string, dto: CreateIncidentDto) {
    const order = await this.ownOrder(customerId, orderId);
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Chỉ báo sự cố cho đơn đã thanh toán và chưa nhận hàng.');
    }
    const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });
    const now = Date.now();
    if (
      !offer ||
      now < new Date(offer.pickupStart).getTime() - INCIDENT_WINDOW_BEFORE_MIN * 60000 ||
      now > new Date(offer.pickupEnd).getTime() + INCIDENT_WINDOW_AFTER_MIN * 60000
    ) {
      throw new BadRequestException('Chỉ báo sự cố trong khung giờ nhận hàng của đơn.');
    }
    const existing = await this.incidentRepo.find({ where: { orderId } });
    if (existing.length >= MAX_INCIDENTS_PER_ORDER) {
      throw new BadRequestException(`Mỗi đơn chỉ báo tối đa ${MAX_INCIDENTS_PER_ORDER} sự cố.`);
    }
    if (existing.some((i) => i.type === dto.type && i.status === IncidentStatus.OPEN)) {
      throw new ConflictException('Bạn đã báo sự cố này và đang chờ cửa hàng phản hồi.');
    }

    const incident = await this.incidentRepo.save(
      this.incidentRepo.create({
        orderId,
        storeId: order.storeId,
        customerId,
        type: dto.type,
        note: dto.note?.trim() || null,
        status: IncidentStatus.OPEN,
        outcome: null,
        storeResponse: null,
        respondedBy: null,
        resolvedAt: null,
      }),
    );
    await this.audit.log({
      storeId: order.storeId,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: 'PICKUP_INCIDENT_REPORTED',
      targetType: 'ORDER',
      targetId: orderId,
      newValue: { incidentId: incident.id, type: dto.type },
    });
    await this.notifications.createNotification({
      storeId: order.storeId,
      type: NotificationType.ORDER,
      title: 'Khách báo sự cố khi nhận hàng',
      body: `${INCIDENT_LABELS[dto.type]} - đơn ${order.code}. Vui lòng phản hồi sớm.`,
      data: { orderId, incidentId: incident.id, kind: 'PICKUP_INCIDENT' },
    });
    return this.presentIncident(incident);
  }

  async listCustomerIncidents(customerId: string, orderId: string) {
    await this.ownOrder(customerId, orderId);
    const rows = await this.incidentRepo.find({ where: { orderId }, order: { createdAt: 'DESC' } });
    return rows.map((i) => this.presentIncident(i));
  }

  async listStoreIncidents(storeId: string, status?: IncidentStatus) {
    const rows = await this.incidentRepo.find({
      where: { storeId, ...(status ? { status } : {}) },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const orders = rows.length
      ? await this.orderRepo.find({ where: { id: In(rows.map((r) => r.orderId)) } })
      : [];
    const byId = new Map(orders.map((o) => [o.id, o]));
    return rows.map((i) => ({
      ...this.presentIncident(i),
      orderCode: byId.get(i.orderId)?.code ?? null,
      totalAmount: byId.get(i.orderId)?.totalAmount ?? null,
      customerLabel: maskCustomer(i.customerId),
    }));
  }

  async respondIncident(
    storeId: string,
    actorId: string,
    incidentId: string,
    dto: RespondIncidentDto,
  ) {
    const note = dto.note?.trim() || null;
    if (dto.action === 'REJECT' && (!note || note.length < 5)) {
      throw new BadRequestException('Cần ghi lý do khi không công nhận sự cố (ít nhất 5 ký tự).');
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const incident = await manager.findOne(PickupIncidentEntity, {
        where: { id: incidentId, storeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!incident) throw new NotFoundException('Không tìm thấy sự cố của cửa hàng.');
      if (![IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED].includes(incident.status)) {
        throw new ConflictException('Sự cố này đã được xử lý.');
      }
      incident.respondedBy = actorId;
      incident.storeResponse = note;
      if (dto.action === 'ACKNOWLEDGE') {
        incident.status = IncidentStatus.ACKNOWLEDGED;
      } else if (dto.action === 'FIXED') {
        incident.status = IncidentStatus.RESOLVED;
        incident.outcome = 'FIXED';
        incident.resolvedAt = new Date();
      } else if (dto.action === 'REJECT') {
        incident.status = IncidentStatus.REJECTED;
        incident.outcome = 'REJECTED';
        incident.resolvedAt = new Date();
      } else {
        await this.refundOrderForIncident(manager, incident, 'REFUNDED');
      }
      return manager.save(incident);
    });
    await this.audit.log({
      storeId,
      actorId,
      actorRole: 'STORE',
      action: 'PICKUP_INCIDENT_RESPONDED',
      targetType: 'ORDER',
      targetId: result.orderId,
      newValue: { incidentId, action: dto.action, outcome: result.outcome },
    });
    await this.notifyCustomerAboutIncident(result);
    return this.presentIncident(result);
  }

  /** Hoàn toàn bộ tiền đơn chưa nhận: hủy đơn do cửa hàng, tạo lệnh hoàn chờ chuyển khoản. Chạy trong giao dịch của người gọi. */
  private async refundOrderForIncident(
    manager: import('typeorm').EntityManager,
    incident: PickupIncidentEntity,
    outcome: 'REFUNDED' | 'AUTO_REFUNDED',
  ) {
    const order = await manager.findOne(OrderEntity, {
      where: { id: incident.orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng của sự cố.');
    if (order.status !== OrderStatus.PAID) {
      throw new ConflictException(
        'Đơn không còn ở trạng thái chờ nhận nên không hoàn tiền theo sự cố được.',
      );
    }
    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    order.cancelledBy = outcome === 'AUTO_REFUNDED' ? CancelledBy.SYSTEM : CancelledBy.STORE;
    order.cancelReason = `Sự cố khi nhận hàng: ${INCIDENT_LABELS[incident.type]}`;
    await manager.save(order);
    await createRefundTransaction(
      manager,
      order,
      order.totalAmount,
      `INCIDENT_REFUND_${incident.id}`,
    );
    incident.status = IncidentStatus.RESOLVED;
    incident.outcome = outcome;
    incident.resolvedAt = new Date();
  }

  /** Sự cố do cửa hàng mà không phản hồi sau 2 giờ: hệ thống hoàn tiền cho khách, khách không bị tính không đến nhận. */
  async processIncidentDeadlines(now = new Date()): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const [lock] = await manager.query('SELECT pg_try_advisory_xact_lock(710002) AS locked');
      if (!lock?.locked) return 0;
      const cutoff = new Date(now.getTime() - AUTO_REFUND_AFTER_HOURS * 3600_000);
      const stale = await manager
        .createQueryBuilder(PickupIncidentEntity, 'i')
        .where('i.status = :open', { open: IncidentStatus.OPEN })
        .andWhere('i.type IN (:...types)', { types: STORE_FAULT_TYPES })
        .andWhere('i.created_at <= :cutoff', { cutoff })
        .getMany();
      let done = 0;
      for (const incident of stale) {
        try {
          await this.refundOrderForIncident(manager, incident, 'AUTO_REFUNDED');
          incident.storeResponse =
            'Cửa hàng chưa phản hồi trong 2 giờ nên hệ thống hoàn tiền cho bạn.';
          await manager.save(incident);
          done += 1;
        } catch (e) {
          // Đơn đã đổi trạng thái (đã nhận/đã hủy): đóng sự cố, không hoàn.
          incident.status = IncidentStatus.RESOLVED;
          incident.outcome = 'FIXED';
          incident.resolvedAt = now;
          await manager.save(incident);
          this.logger.warn(`[INCIDENT_DEADLINES] ${incident.id}: ${(e as Error).message}`);
        }
      }
      return done;
    });
  }

  private async notifyCustomerAboutIncident(incident: PickupIncidentEntity) {
    const text: Record<string, string> = {
      ACKNOWLEDGED: 'Cửa hàng đã nhận thông tin sự cố của bạn.',
      FIXED: 'Cửa hàng báo đã khắc phục sự cố, bạn có thể nhận hàng.',
      REFUNDED: 'Cửa hàng đã hoàn tiền cho đơn của bạn.',
      AUTO_REFUNDED: 'Hệ thống đã hoàn tiền cho đơn của bạn do cửa hàng chưa phản hồi.',
      REJECTED: 'Cửa hàng không công nhận sự cố. Bạn có thể gửi khiếu nại nếu không đồng ý.',
    };
    const key = incident.outcome ?? incident.status;
    await this.notifications.createNotification({
      userId: incident.customerId,
      type: NotificationType.ORDER,
      title: 'Phản hồi sự cố nhận hàng',
      body: `${text[key] ?? 'Sự cố của bạn đã được cập nhật.'}${incident.storeResponse ? ` Lời nhắn: ${incident.storeResponse}` : ''}`,
      data: { orderId: incident.orderId, incidentId: incident.id, kind: 'PICKUP_INCIDENT' },
    });
  }

  private presentIncident(i: PickupIncidentEntity) {
    return {
      id: i.id,
      orderId: i.orderId,
      type: i.type,
      typeLabel: INCIDENT_LABELS[i.type],
      note: i.note,
      status: i.status,
      outcome: i.outcome,
      storeResponse: i.storeResponse,
      createdAt: i.createdAt,
      resolvedAt: i.resolvedAt,
    };
  }

  // ---------------------------------------------------------------- KX11 trò chuyện theo đơn

  private assertChatOpen(order: OrderEntity) {
    const closedStatuses = [OrderStatus.PENDING_PAYMENT, OrderStatus.HOLD_EXPIRED];
    if (closedStatuses.includes(order.status)) {
      throw new BadRequestException('Trò chuyện mở sau khi đơn được thanh toán.');
    }
    if (order.status !== OrderStatus.PAID) {
      const closedSince = (order.pickedUpAt ?? order.cancelledAt ?? order.updatedAt).getTime();
      if (Date.now() - closedSince > CHAT_OPEN_AFTER_END_HOURS * 3600_000) {
        throw new BadRequestException(
          `Trò chuyện đóng sau ${CHAT_OPEN_AFTER_END_HOURS} giờ kể từ khi đơn kết thúc.`,
        );
      }
    }
  }

  private async sendMessage(
    order: OrderEntity,
    role: 'CUSTOMER' | 'STORE',
    senderId: string,
    dto: SendOrderMessageDto,
  ) {
    this.assertChatOpen(order);
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('Tin nhắn không được để trống.');
    const hourAgo = new Date(Date.now() - 3600_000);
    const recent = await this.messageRepo
      .createQueryBuilder('m')
      .where('m.order_id = :id AND m.sender_role = :role AND m.created_at >= :hourAgo', {
        id: order.id,
        role,
        hourAgo,
      })
      .getCount();
    if (recent >= CHAT_MAX_PER_HOUR) {
      throw new BadRequestException('Bạn gửi quá nhiều tin trong một giờ, vui lòng thử lại sau.');
    }
    const previous = await this.messageRepo.findOne({
      where: { orderId: order.id, senderRole: role },
      order: { createdAt: 'DESC' },
    });
    const message = await this.messageRepo.save(
      this.messageRepo.create({
        orderId: order.id,
        storeId: order.storeId,
        senderRole: role,
        senderId,
        body,
        readAt: null,
      }),
    );
    // Chỉ báo mới khi người này im lặng quá 2 phút, tránh dội thông báo.
    if (!previous || Date.now() - new Date(previous.createdAt).getTime() > 120_000) {
      await this.notifications.createNotification({
        ...(role === 'CUSTOMER' ? { storeId: order.storeId } : { userId: order.customerId }),
        type: NotificationType.ORDER,
        title:
          role === 'CUSTOMER'
            ? `Tin nhắn mới từ khách, đơn ${order.code}`
            : `Tin nhắn mới từ cửa hàng, đơn ${order.code}`,
        body: body.length > 80 ? `${body.slice(0, 77)}...` : body,
        data: { orderId: order.id, kind: 'ORDER_MESSAGE' },
      });
    }
    return this.presentMessage(message, role);
  }

  private presentMessage(m: OrderMessageEntity, viewer: 'CUSTOMER' | 'STORE') {
    return {
      id: m.id,
      fromMe: m.senderRole === viewer,
      senderRole: m.senderRole,
      body: m.body,
      createdAt: m.createdAt,
      readAt: m.readAt,
    };
  }

  private async readThread(order: OrderEntity, viewer: 'CUSTOMER' | 'STORE', sinceIso?: string) {
    const other = viewer === 'CUSTOMER' ? 'STORE' : 'CUSTOMER';
    // Mở luồng là đã đọc tin của bên kia.
    await this.messageRepo
      .createQueryBuilder()
      .update(OrderMessageEntity)
      .set({ readAt: new Date() })
      .where('order_id = :id AND sender_role = :other AND read_at IS NULL', { id: order.id, other })
      .execute();
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.order_id = :id', { id: order.id })
      .orderBy('m.created_at', 'ASC')
      .limit(200);
    if (sinceIso) qb.andWhere('m.created_at > :since', { since: sinceIso });
    const rows = await qb.getMany();
    let open = true;
    try {
      this.assertChatOpen(order);
    } catch {
      open = false;
    }
    const store = await this.storeRepo.findOne({ where: { id: order.storeId } });
    return {
      orderId: order.id,
      orderCode: order.code,
      storeName: store?.name ?? null,
      isOpen: open,
      messages: rows.map((m) => this.presentMessage(m, viewer)),
    };
  }

  async customerThread(customerId: string, orderId: string, since?: string) {
    return this.readThread(await this.ownOrder(customerId, orderId), 'CUSTOMER', since);
  }

  async customerSend(customerId: string, orderId: string, dto: SendOrderMessageDto) {
    return this.sendMessage(await this.ownOrder(customerId, orderId), 'CUSTOMER', customerId, dto);
  }

  private async storeOrder(storeId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.storeId !== storeId)
      throw new ForbiddenException('Đơn hàng không thuộc cửa hàng của bạn.');
    return order;
  }

  async storeThread(storeId: string, orderId: string, since?: string) {
    return this.readThread(await this.storeOrder(storeId, orderId), 'STORE', since);
  }

  async storeSend(storeId: string, actorId: string, orderId: string, dto: SendOrderMessageDto) {
    return this.sendMessage(await this.storeOrder(storeId, orderId), 'STORE', actorId, dto);
  }
}
