import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { RescuePoolEntity, RescuePoolStatus } from '../../entities/rescue-pool/rescue-pool.entity';
import {
  RescuePoolRegistrationEntity,
  RescuePoolRegistrationStatus,
} from '../../entities/rescue-pool/rescue-pool-registration.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';
import { NotificationType } from '../../entities/notifications/notification.entity';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ClosePoolDto,
  ConfirmOfferDto,
  CreateRescuePoolDto,
  PublishSupplyOfferDto,
  QueryCustomerRescuePoolsDto,
  QueryStoreRescuePoolsDto,
  RegisterDemandDto,
  UpdateDemandDto,
} from './dto/rescue-pool.dto';

const S = RescuePoolStatus;
const R = RescuePoolRegistrationStatus;

/**
 * Máy trạng thái đợt Rescue Pool (BBRD phần 4):
 * Nháp → Mở đăng ký → Tổng hợp nhu cầu → Chờ cửa hàng → Đề nghị cung ứng → Mở đặt hàng
 *   → Hoàn tất / Không đủ điều kiện / Hủy / Hết hạn.
 * Tự chuyển OFFER_PUBLISHED→OFFER_PUBLISHED / ORDERING_OPEN→ORDERING_OPEN = cửa hàng sửa đề nghị (tăng offer_version).
 */
export const POOL_TRANSITIONS: Record<RescuePoolStatus, readonly RescuePoolStatus[]> = {
  [S.DRAFT]: [S.OPEN, S.CANCELLED],
  [S.OPEN]: [S.AGGREGATING, S.CANCELLED],
  [S.AGGREGATING]: [S.PENDING_STORE, S.INSUFFICIENT],
  [S.PENDING_STORE]: [S.OFFER_PUBLISHED, S.INSUFFICIENT, S.CANCELLED, S.EXPIRED],
  [S.OFFER_PUBLISHED]: [S.OFFER_PUBLISHED, S.ORDERING_OPEN, S.CANCELLED, S.EXPIRED],
  [S.ORDERING_OPEN]: [S.ORDERING_OPEN, S.COMPLETED, S.CANCELLED],
  [S.COMPLETED]: [],
  [S.INSUFFICIENT]: [],
  [S.CANCELLED]: [],
  [S.EXPIRED]: [],
};

export function assertPoolTransition(from: RescuePoolStatus, to: RescuePoolStatus): void {
  if (!POOL_TRANSITIONS[from]?.includes(to)) {
    throw new ConflictException({
      code: 'POOL_INVALID_TRANSITION',
      message: `Không thể chuyển đợt từ trạng thái ${from} sang ${to}.`,
    });
  }
}

/** Đơn còn "sống" chiếm nguồn cung của đợt (đơn hết hạn giữ/hủy trả suất lại cho người khác). */
const LIVE_ORDER_STATUSES = [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.PICKED_UP];
const OFFER_STAGES = [S.OFFER_PUBLISHED, S.ORDERING_OPEN];
const NON_TERMINAL = [
  S.OPEN,
  S.AGGREGATING,
  S.PENDING_STORE,
  S.OFFER_PUBLISHED,
  S.ORDERING_OPEN,
] as RescuePoolStatus[];
const SYSTEM_ACTOR: Actor = { id: '00000000-0000-0000-0000-000000000000', role: 'SYSTEM' };
const DEFAULT_END_CONDITION = 'Đóng khi hết suất cung ứng hoặc hết hạn đề nghị';

interface Actor {
  id: string;
  role: 'STORE_USER' | 'CUSTOMER' | 'SYSTEM';
}

type PoolNotice =
  | 'PENDING_STORE'
  | 'OFFER_PUBLISHED'
  | 'OFFER_REVISED'
  | 'INSUFFICIENT'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED';

const vnd = (n: number | null) => `${(n ?? 0).toLocaleString('vi-VN')}đ`;
const vnTime = (d: Date | null) =>
  d ? new Date(d).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';

@Injectable()
export class RescuePoolService {
  private readonly logger = new Logger(RescuePoolService.name);

  constructor(
    @InjectRepository(RescuePoolEntity)
    private readonly poolRepo: Repository<RescuePoolEntity>,
    @InjectRepository(RescuePoolRegistrationEntity)
    private readonly regRepo: Repository<RescuePoolRegistrationEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  // ══════════════════════════ STORE SIDE (CM-B02) ══════════════════════════

  async createPool(storeId: string, userId: string, dto: CreateRescuePoolDto) {
    const pool = this.poolRepo.create({
      storeId,
      poolTitle: dto.poolTitle.trim(),
      targetCategory: dto.targetCategory.trim(),
      targetItemId: dto.targetItemId ?? null,
      serviceArea: dto.serviceArea.trim(),
      registrationOpenAt: new Date(dto.registrationOpenAt),
      registrationCloseAt: new Date(dto.registrationCloseAt),
      confirmDeadlineAt: new Date(dto.confirmDeadlineAt),
      minimumDemand: dto.minimumDemand,
      maximumSupply: dto.maximumSupply,
      targetBudgetMin: dto.targetBudgetMin ?? null,
      targetBudgetMax: dto.targetBudgetMax ?? null,
      pickupWindowStart: new Date(dto.pickupWindowStart),
      pickupWindowEnd: new Date(dto.pickupWindowEnd),
      endCondition: dto.endCondition?.trim() || DEFAULT_END_CONDITION,
      poolStatus: S.DRAFT,
      createdBy: userId,
    });
    this.validatePoolDefinition(pool);

    if (pool.targetItemId) {
      const item = await this.itemRepo.findOne({ where: { id: pool.targetItemId, storeId } });
      if (!item) throw new NotFoundException('Món mục tiêu không thuộc cửa hàng.');
      if (item.category !== pool.targetCategory) {
        throw new BadRequestException('Món mục tiêu không thuộc nhóm món đã chọn.');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(pool);
      await this.audit(
        manager,
        saved,
        { id: userId, role: 'STORE_USER' },
        'RESCUE_POOL_CREATED',
        null,
        {
          status: S.DRAFT,
          minimumDemand: saved.minimumDemand,
          maximumSupply: saved.maximumSupply,
        },
      );
      return saved;
    });
  }

  async listStorePools(storeId: string, query: QueryStoreRescuePoolsDto) {
    return this.poolRepo.find({
      where: { storeId, ...(query.status ? { poolStatus: query.status } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  /** Chi tiết + nhu cầu tổng hợp. Chỉ số đếm/tổng/phân bố - không bao giờ trả danh sách khách (BR-B02-08). */
  async getStorePool(storeId: string, poolId: string) {
    const pool = await this.findStorePool(storeId, poolId);
    const demand = await this.aggregateDemand(pool);
    const confirmedQuantity = await this.liveConfirmedQuantity(this.dataSource.manager, pool.id);
    return {
      ...pool,
      demand,
      confirmedQuantity,
      remainingSupply:
        pool.offeredQuantity !== null
          ? Math.max(0, pool.offeredQuantity - confirmedQuantity)
          : null,
      allowedTransitions: POOL_TRANSITIONS[pool.poolStatus],
    };
  }

  async openPool(storeId: string, userId: string, poolId: string) {
    return this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId, storeId);
      assertPoolTransition(pool.poolStatus, S.OPEN);
      // Không mở khi thiếu điều kiện bắt buộc/ngưỡng/thời hạn công bố (BR-B02-03/04)
      this.validatePoolDefinition(pool);
      if (new Date(pool.registrationCloseAt).getTime() <= Date.now()) {
        throw new BadRequestException('Hạn đóng đăng ký đã qua - không thể mở đợt.');
      }
      await this.transition(manager, pool, S.OPEN, { id: userId, role: 'STORE_USER' });
      return pool;
    });
  }

  /** Cửa hàng chốt đăng ký sớm (thay đổi thời hạn đã công bố nên bắt buộc có lý do - BR-B02-09). */
  async closeRegistration(storeId: string, userId: string, poolId: string, reason: string) {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId, storeId);
      return this.aggregateAndDecide(manager, pool, { id: userId, role: 'STORE_USER' }, reason);
    });
    await this.deliver(outcome.pool, outcome.notice, outcome.recipients);
    return outcome.pool;
  }

  /**
   * Cửa hàng công bố/sửa đề nghị cung ứng. Nguồn cung gắn với một suất bán (offer) thật của cửa hàng;
   * giá & khung nhận lấy từ suất đó và được chụp lại làm điều kiện trọng yếu cho khách xác nhận.
   * Mỗi lần công bố tăng offer_version => mọi xác nhận cũ phải xác nhận lại (BR-B02-06).
   */
  async publishSupplyOffer(
    storeId: string,
    userId: string,
    poolId: string,
    dto: PublishSupplyOfferDto,
  ) {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId, storeId);
      const isRevision = pool.offerVersion > 0;
      const target = pool.poolStatus === S.ORDERING_OPEN ? S.ORDERING_OPEN : S.OFFER_PUBLISHED;
      assertPoolTransition(pool.poolStatus, target);

      const changeReason = dto.changeReason?.trim();
      if (isRevision && !changeReason) {
        throw new BadRequestException('Sửa đề nghị đã công bố bắt buộc phải có lý do (BR-B02-09).');
      }
      const now = new Date();
      if (!isRevision && now > new Date(pool.confirmDeadlineAt)) {
        throw new ConflictException('Đã quá hạn quyết định cung ứng của đợt.');
      }

      const offer = await manager.findOne(OfferEntity, { where: { id: dto.offerId, storeId } });
      if (!offer) throw new NotFoundException('Không tìm thấy suất bán nguồn của cửa hàng.');
      if (offer.status !== OfferStatus.OPEN) {
        throw new BadRequestException('Suất bán nguồn phải đang mở bán để cung ứng cho đợt.');
      }
      await this.assertOfferMatchesTarget(manager, pool, offer);

      if (dto.offeredQuantity > pool.maximumSupply) {
        throw new BadRequestException(
          `Không xác nhận vượt nguồn cung tối đa đã công bố (${pool.maximumSupply} suất).`,
        );
      }
      const confirmed = await this.liveConfirmedQuantity(manager, pool.id);
      if (dto.offeredQuantity < confirmed) {
        throw new BadRequestException(
          `Không thể giảm nguồn cung dưới số suất đã có đơn (${confirmed}).`,
        );
      }
      if (dto.offeredQuantity - confirmed > offer.remainingQuantity) {
        throw new BadRequestException(
          `Tồn hiện tại của suất nguồn chỉ còn ${offer.remainingQuantity} - hãy cập nhật nguồn cung.`,
        );
      }
      const demandQty = await this.activeDemandQuantity(manager, pool.id);
      if (!isRevision && demandQty < pool.minimumDemand) {
        throw new BadRequestException(
          `Nhu cầu hiện tại (${demandQty}) dưới ngưỡng tối thiểu (${pool.minimumDemand}). Hãy đóng đợt "Không đủ điều kiện".`,
        );
      }
      const expiry = new Date(dto.offerExpiryAt);
      if (expiry <= now) throw new BadRequestException('Hạn xác nhận đề nghị phải ở tương lai.');
      if (expiry > new Date(offer.pickupEnd) || expiry > new Date(offer.expiresAt)) {
        throw new BadRequestException('Hạn xác nhận phải trước khi suất nguồn hết khung nhận.');
      }

      const oldOffer = this.offerSnapshot(pool);
      pool.linkedOfferId = offer.id;
      pool.offeredQuantity = dto.offeredQuantity;
      pool.proposedPrice = offer.currentPrice;
      pool.offerPickupStart = offer.pickupStart;
      pool.offerPickupEnd = offer.pickupEnd;
      pool.offerExpiryAt = expiry;
      pool.offerVersion += 1;
      await this.transition(
        manager,
        pool,
        target,
        { id: userId, role: 'STORE_USER' },
        {
          reason: changeReason,
          oldValue: oldOffer,
          newValue: this.offerSnapshot(pool),
          action: isRevision ? 'RESCUE_POOL_OFFER_REVISED' : 'RESCUE_POOL_OFFER_PUBLISHED',
        },
      );

      const recipients = await this.registrantIds(manager, pool.id, [R.ACTIVE]);
      return {
        pool,
        recipients,
        notice: (isRevision ? 'OFFER_REVISED' : 'OFFER_PUBLISHED') as PoolNotice,
      };
    });
    await this.deliver(outcome.pool, outcome.notice, outcome.recipients);
    return outcome.pool;
  }

  /**
   * Cửa hàng từ chối/hủy (CANCELLED) hoặc chốt không đủ nhu cầu (INSUFFICIENT). Lý do bắt buộc.
   * Đơn đã phát sinh từ đợt bị hủy được xử lý qua luồng hủy/hoàn tiền hiện có của cửa hàng.
   */
  async closePool(storeId: string, userId: string, poolId: string, dto: ClosePoolDto) {
    const actor: Actor = { id: userId, role: 'STORE_USER' };
    const outcome = await this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId, storeId);
      assertPoolTransition(pool.poolStatus, dto.outcome);
      pool.cancellationReason = dto.reason.trim();
      const recipients = await this.registrantIds(manager, pool.id, [R.ACTIVE, R.ORDERED]);
      await this.closeActiveRegistrations(manager, pool.id);
      await this.transition(manager, pool, dto.outcome, actor, { reason: pool.cancellationReason });

      let orderIds: string[] = [];
      if (dto.outcome === S.CANCELLED) {
        const rows = await manager
          .createQueryBuilder(RescuePoolRegistrationEntity, 'r')
          .innerJoin(OrderEntity, 'o', 'o.id = r.linked_order_id')
          .select('o.id', 'id')
          .where('r.pool_id = :poolId', { poolId: pool.id })
          .andWhere('o.status IN (:...st)', { st: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID] })
          .getRawMany<{ id: string }>();
        orderIds = rows.map((r) => r.id);
      }
      return { pool, recipients, orderIds };
    });

    const cancelledOrderIds: string[] = [];
    const failedOrderCancellations: { orderId: string; error: string }[] = [];
    for (const orderId of outcome.orderIds) {
      try {
        await this.ordersService.cancelOrderByStore(
          storeId,
          orderId,
          { reason: `Đợt Rescue Pool bị hủy: ${dto.reason}`.slice(0, 255) },
          userId,
        );
        cancelledOrderIds.push(orderId);
      } catch (e: unknown) {
        failedOrderCancellations.push({
          orderId,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    await this.deliver(outcome.pool, dto.outcome as PoolNotice, outcome.recipients);
    return { pool: outcome.pool, cancelledOrderIds, failedOrderCancellations };
  }

  /** Báo cáo đợt: số đăng ký, đơn tạo, đơn nhận, số lượng bán, lý do thất bại (bước 10). */
  async getReport(storeId: string, poolId: string) {
    const pool = await this.findStorePool(storeId, poolId);

    const regRows = await this.regRepo
      .createQueryBuilder('r')
      .select('r.registration_status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('r.pool_id = :poolId', { poolId })
      .groupBy('r.registration_status')
      .getRawMany<{ status: RescuePoolRegistrationStatus; count: number }>();
    const regCount = (st: RescuePoolRegistrationStatus) =>
      Number(regRows.find((r) => r.status === st)?.count ?? 0);

    const orderRows = await this.regRepo
      .createQueryBuilder('r')
      .innerJoin(OrderEntity, 'o', 'o.id = r.linked_order_id')
      .select('o.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(o.quantity), 0)::int', 'quantity')
      .where('r.pool_id = :poolId', { poolId })
      .groupBy('o.status')
      .getRawMany<{ status: OrderStatus; count: number; quantity: number }>();
    const orderAgg = (statuses: OrderStatus[], field: 'count' | 'quantity') =>
      orderRows
        .filter((r) => statuses.includes(r.status))
        .reduce((s, r) => s + Number(r[field]), 0);

    const withdrawalReasons = await this.regRepo
      .createQueryBuilder('r')
      .select(`COALESCE(NULLIF(TRIM(r.withdrawal_reason), ''), 'Không nêu lý do')`, 'reason')
      .addSelect('COUNT(*)::int', 'count')
      .where('r.pool_id = :poolId AND r.registration_status = :st', { poolId, st: R.WITHDRAWN })
      .groupBy('1')
      .orderBy('2', 'DESC')
      .limit(10)
      .getRawMany<{ reason: string; count: number }>();

    const failureReasons: { reason: string; count: number }[] = [];
    if ([S.CANCELLED, S.INSUFFICIENT, S.EXPIRED].includes(pool.poolStatus)) {
      failureReasons.push({
        reason: `Đợt ${pool.poolStatus}${pool.cancellationReason ? `: ${pool.cancellationReason}` : ''}`,
        count: 1,
      });
    }
    const orderFailures: [OrderStatus, string][] = [
      [OrderStatus.HOLD_EXPIRED, 'Khách không thanh toán kịp hạn giữ suất'],
      [OrderStatus.CANCELLED, 'Đơn bị hủy'],
      [OrderStatus.REFUNDED, 'Đơn đã hoàn tiền'],
      [OrderStatus.PICKUP_EXPIRED, 'Khách không đến nhận'],
    ];
    for (const [st, label] of orderFailures) {
      const c = orderAgg([st], 'count');
      if (c > 0) failureReasons.push({ reason: label, count: c });
    }
    if (regCount(R.CLOSED) > 0) {
      failureReasons.push({
        reason: 'Đăng ký chưa thành đơn khi đợt kết thúc',
        count: regCount(R.CLOSED),
      });
    }
    for (const w of withdrawalReasons) {
      failureReasons.push({ reason: `Khách rút nhu cầu: ${w.reason}`, count: Number(w.count) });
    }

    return {
      poolId: pool.id,
      poolTitle: pool.poolTitle,
      poolStatus: pool.poolStatus,
      offerVersion: pool.offerVersion,
      registrations: {
        total: regRows.reduce((s, r) => s + Number(r.count), 0),
        active: regCount(R.ACTIVE),
        ordered: regCount(R.ORDERED),
        withdrawn: regCount(R.WITHDRAWN),
        closedWithoutOrder: regCount(R.CLOSED),
      },
      ordersCreated: pool.confirmedOrderCount,
      ordersFulfilled: orderAgg([OrderStatus.PICKED_UP], 'count'),
      soldQuantity: orderAgg([OrderStatus.PAID, OrderStatus.PICKED_UP], 'quantity'),
      ordersByStatus: orderRows.map((r) => ({
        status: r.status,
        count: Number(r.count),
        quantity: Number(r.quantity),
      })),
      failureReasons,
    };
  }

  // ══════════════════════════ CUSTOMER SIDE (CM-C02) ══════════════════════════

  async listForCustomer(customerId: string, query: QueryCustomerRescuePoolsDto) {
    const myRegs = await this.regRepo.find({
      where: { customerId },
      order: { registeredAt: 'DESC' },
    });
    const myPoolIds = [...new Set(myRegs.map((r) => r.poolId))];

    const qb = this.poolRepo
      .createQueryBuilder('p')
      .where('p.pool_status <> :draft', { draft: S.DRAFT })
      .andWhere(
        new Brackets((b) => {
          b.where('p.pool_status = :open', { open: S.OPEN });
          if (myPoolIds.length) b.orWhere('p.id IN (:...myPoolIds)', { myPoolIds });
        }),
      );
    if (query.serviceArea?.trim()) {
      qb.andWhere('p.service_area ILIKE :area', { area: `%${query.serviceArea.trim()}%` });
    }
    const pools = await qb.orderBy('p.registration_close_at', 'ASC').take(100).getMany();
    if (pools.length === 0) return [];

    const [stores, demandRows] = await Promise.all([
      this.storeRepo.find({ where: { id: In([...new Set(pools.map((p) => p.storeId))]) } }),
      this.demandByPool(pools.map((p) => p.id)),
    ]);
    return pools.map((p) =>
      this.toCustomerView(
        p,
        stores.find((s) => s.id === p.storeId)?.name ?? null,
        this.pickMyRegistration(myRegs, p.id),
        demandRows.get(p.id) ?? 0,
        null,
      ),
    );
  }

  async getCustomerPool(customerId: string, poolId: string) {
    const pool = await this.poolRepo.findOne({ where: { id: poolId, poolStatus: Not(S.DRAFT) } });
    if (!pool) throw new NotFoundException('Không tìm thấy đợt Rescue Pool.');
    const [store, myRegs, demand, confirmed] = await Promise.all([
      this.storeRepo.findOne({ where: { id: pool.storeId } }),
      this.regRepo.find({ where: { poolId, customerId }, order: { registeredAt: 'DESC' } }),
      this.demandByPool([poolId]),
      this.liveConfirmedQuantity(this.dataSource.manager, poolId),
    ]);
    const remaining =
      pool.offeredQuantity !== null ? Math.max(0, pool.offeredQuantity - confirmed) : null;
    return this.toCustomerView(
      pool,
      store?.name ?? null,
      this.pickMyRegistration(myRegs, poolId),
      demand.get(poolId) ?? 0,
      remaining,
    );
  }

  /*
   * ┌─────────────────────────────────────────────────────────────────────────────┐
   * │ GUARD-RAIL (BR-B02-01, BR-B02-10, BR-C02-01, BR-C02-05):                     │
   * │ register / updateRegistration / withdraw CHỈ được ghi rescue_pools và        │
   * │ rescue_pool_registrations. TUYỆT ĐỐI không gọi OrdersService, không đọc/ghi   │
   * │ OfferEntity/OrderEntity/PaymentTransaction, không giữ tồn, không thu tiền.    │
   * │ Đơn hàng chỉ phát sinh ở confirmOffer khi khách chủ động xác nhận đề nghị.    │
   * │ rescue-pool.service.spec.ts kiểm tra bất biến này.                           │
   * └─────────────────────────────────────────────────────────────────────────────┘
   */
  async register(customerId: string, poolId: string, dto: RegisterDemandDto) {
    this.validateDemandFields(dto);
    await this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId);
      this.assertRegistrationOpen(pool);
      this.assertDemandFitsPool(pool, dto);

      const existing = await manager.findOne(RescuePoolRegistrationEntity, {
        where: { poolId, customerId, registrationStatus: Not(R.WITHDRAWN) },
      });
      if (existing) throw this.duplicateRegistrationError();

      const reg = manager.create(RescuePoolRegistrationEntity, {
        poolId,
        customerId,
        // Lựa chọn = mục tiêu của đợt (một đợt một lựa chọn); khóa unique DB vẫn tính theo lựa chọn.
        selectedCategory: pool.targetCategory,
        selectedItemId: pool.targetItemId,
        requestedQuantity: dto.requestedQuantity,
        budgetMin: dto.budgetMin ?? null,
        budgetMax: dto.budgetMax ?? null,
        preferredPickupStart: dto.preferredPickupStart ? new Date(dto.preferredPickupStart) : null,
        preferredPickupEnd: dto.preferredPickupEnd ? new Date(dto.preferredPickupEnd) : null,
        registrationStatus: R.ACTIVE,
      });
      try {
        await manager.save(reg);
      } catch (e: unknown) {
        if ((e as { code?: string })?.code === '23505') throw this.duplicateRegistrationError();
        throw e;
      }
      pool.registrationCount += 1;
      await manager.save(pool);
      await this.auditRegistration(manager, customerId, 'RESCUE_POOL_REGISTERED', reg, {
        requestedQuantity: reg.requestedQuantity,
      });
    });
    return this.getCustomerPool(customerId, poolId);
  }

  /** Sửa nhu cầu khi đợt còn mở đăng ký (xem GUARD-RAIL ở register). */
  async updateRegistration(customerId: string, poolId: string, dto: UpdateDemandDto) {
    this.validateDemandFields(dto);
    await this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId);
      this.assertRegistrationOpen(pool);
      this.assertDemandFitsPool(pool, dto);
      const reg = await this.lockMyRegistration(manager, poolId, customerId);
      if (reg.registrationStatus !== R.ACTIVE) {
        throw new ConflictException('Chỉ sửa được đăng ký nhu cầu đang hiệu lực.');
      }
      const old = { requestedQuantity: reg.requestedQuantity, budgetMax: reg.budgetMax };
      reg.requestedQuantity = dto.requestedQuantity;
      reg.budgetMin = dto.budgetMin ?? null;
      reg.budgetMax = dto.budgetMax ?? null;
      reg.preferredPickupStart = dto.preferredPickupStart
        ? new Date(dto.preferredPickupStart)
        : null;
      reg.preferredPickupEnd = dto.preferredPickupEnd ? new Date(dto.preferredPickupEnd) : null;
      await manager.save(reg);
      await this.auditRegistration(manager, customerId, 'RESCUE_POOL_REGISTRATION_UPDATED', reg, {
        old,
        requestedQuantity: reg.requestedQuantity,
      });
    });
    return this.getCustomerPool(customerId, poolId);
  }

  /** Rút nhu cầu. Không bao giờ hủy đơn đã có - đơn đi luồng hủy/hoàn tiền hiện tại (BR-C02-10). */
  async withdraw(customerId: string, poolId: string, reason: string) {
    await this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId);
      const reg = await this.lockMyRegistration(manager, poolId, customerId);
      if (reg.linkedOrderId || reg.registrationStatus === R.ORDERED) {
        throw new ConflictException({
          code: 'POOL_REGISTRATION_HAS_ORDER',
          message:
            'Bạn đã có đơn chính thức từ đợt này. Rút nhu cầu không thay thế hủy đơn - vui lòng hủy đơn trong "Đơn hàng của tôi" theo chính sách hủy/hoàn tiền hiện hành.',
        });
      }
      if (reg.registrationStatus !== R.ACTIVE || !NON_TERMINAL.includes(pool.poolStatus)) {
        throw new ConflictException('Đợt đã kết thúc, đăng ký không còn hiệu lực để rút.');
      }
      reg.registrationStatus = R.WITHDRAWN;
      reg.withdrawnAt = new Date();
      reg.withdrawalReason = reason.trim();
      await manager.save(reg);
      pool.registrationCount = Math.max(0, pool.registrationCount - 1);
      await manager.save(pool);
      await this.auditRegistration(manager, customerId, 'RESCUE_POOL_REGISTRATION_WITHDRAWN', reg, {
        reason: reg.withdrawalReason,
      });
    });
    return this.getCustomerPool(customerId, poolId);
  }

  /**
   * Khách chủ động xác nhận mua theo đề nghị cung ứng (BR-B02-06/07, BR-C02-06).
   * Một transaction duy nhất: khóa đợt FOR UPDATE (tuần tự hóa mọi người xác nhận cùng đợt → không vượt
   * nguồn cung), khóa đăng ký (idempotent: đã có đơn → trả lại đơn cũ), khóa suất nguồn rồi gọi
   * OrdersService.holdOrder (luồng giữ tồn nguyên tử hiện có) trong cùng transaction.
   */
  async confirmOffer(customerId: string, poolId: string, dto: ConfirmOfferDto) {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const pool = await this.lockPool(manager, poolId);
      const reg = await this.lockMyRegistration(manager, poolId, customerId);

      if (reg.linkedOrderId) {
        const existing = await manager.findOne(OrderEntity, { where: { id: reg.linkedOrderId } });
        return { pool, order: existing, idempotent: true, recipients: [] as string[] };
      }
      if (reg.registrationStatus !== R.ACTIVE) {
        throw new ConflictException('Đăng ký nhu cầu không còn hiệu lực để xác nhận mua.');
      }
      if (!OFFER_STAGES.includes(pool.poolStatus)) {
        throw new ConflictException({
          code: 'POOL_NOT_ORDERING',
          message: 'Đợt hiện không mở đặt hàng theo đề nghị cung ứng.',
        });
      }
      const now = new Date();
      if (!pool.offerExpiryAt || now >= new Date(pool.offerExpiryAt)) {
        throw new ConflictException({
          code: 'POOL_OFFER_EXPIRED',
          message: 'Đề nghị cung ứng đã hết hạn - không thể đặt từ đề nghị cũ.',
        });
      }
      if (dto.offerVersion !== pool.offerVersion) {
        throw new ConflictException({
          code: 'POOL_OFFER_VERSION_MISMATCH',
          message:
            'Điều kiện đề nghị (giá/số lượng/khung nhận) đã thay đổi. Vui lòng xem lại và xác nhận lại.',
          currentOfferVersion: pool.offerVersion,
        });
      }
      const quantity = dto.quantity ?? reg.requestedQuantity;
      if (quantity > reg.requestedQuantity) {
        throw new BadRequestException('Số lượng mua không được vượt số đã đăng ký.');
      }
      const remaining =
        (pool.offeredQuantity ?? 0) - (await this.liveConfirmedQuantity(manager, pool.id));
      if (quantity > remaining) {
        throw new ConflictException({
          code: 'POOL_SUPPLY_EXCEEDED',
          message:
            remaining > 0 ? `Đợt chỉ còn ${remaining} suất cung ứng.` : 'Đợt đã hết suất cung ứng.',
          remaining: Math.max(0, remaining),
        });
      }

      // Điều kiện trọng yếu khách đã thấy phải còn nguyên ở suất nguồn (khóa để giá không đổi giữa chừng).
      const offer = pool.linkedOfferId
        ? await manager
            .createQueryBuilder(OfferEntity, 'o')
            .setLock('pessimistic_write')
            .where('o.id = :id', { id: pool.linkedOfferId })
            .getOne()
        : null;
      if (
        !offer ||
        offer.status !== OfferStatus.OPEN ||
        offer.currentPrice !== pool.proposedPrice ||
        new Date(offer.pickupStart).getTime() !== new Date(pool.offerPickupStart!).getTime() ||
        new Date(offer.pickupEnd).getTime() !== new Date(pool.offerPickupEnd!).getTime()
      ) {
        throw new ConflictException({
          code: 'POOL_OFFER_STALE',
          message:
            'Giá/tồn/khung nhận của nguồn cung đã thay đổi. Cửa hàng cần cập nhật đề nghị trước khi bạn đặt.',
        });
      }

      const order = await this.ordersService.holdOrder(
        customerId,
        { offerId: offer.id, quantity },
        customerId,
        manager,
      );

      reg.linkedOrderId = order.id;
      reg.registrationStatus = R.ORDERED;
      reg.offerVersionAcknowledged = pool.offerVersion;
      await manager.save(reg);

      pool.confirmedOrderCount += 1;
      const actor: Actor = { id: customerId, role: 'CUSTOMER' };
      if (pool.poolStatus === S.OFFER_PUBLISHED) {
        await this.transition(manager, pool, S.ORDERING_OPEN, actor, { storeScoped: false });
      }
      let recipients: string[] = [];
      if (quantity >= remaining) {
        recipients = await this.registrantIds(manager, pool.id, [R.ACTIVE]);
        await this.closeActiveRegistrations(manager, pool.id);
        await this.transition(manager, pool, S.COMPLETED, actor, { storeScoped: false });
      } else {
        await manager.save(pool);
      }
      await this.auditRegistration(manager, customerId, 'RESCUE_POOL_OFFER_CONFIRMED', reg, {
        orderId: order.id,
        offerVersion: pool.offerVersion,
        quantity,
      });
      return { pool, order, idempotent: false, recipients };
    });

    if (!outcome.idempotent && outcome.order) {
      await this.safeNotify({
        userId: customerId,
        type: NotificationType.ORDER,
        title: 'Đơn chính thức đã tạo',
        body: `Đơn ${outcome.order.code} từ đợt "${outcome.pool.poolTitle}" đã được tạo. Vui lòng thanh toán trong 10 phút để giữ suất.`,
        data: { kind: 'RESCUE_POOL_ORDER_CREATED', poolId, orderId: outcome.order.id },
      });
    }
    if (outcome.recipients.length) {
      await this.deliver(outcome.pool, 'COMPLETED', outcome.recipients);
    }
    return {
      idempotent: outcome.idempotent,
      order: outcome.order,
      message: outcome.idempotent
        ? 'Bạn đã đặt hàng từ đợt này trước đó - trả lại đơn hiện có.'
        : 'Đã tạo đơn chính thức. Vui lòng thanh toán trong 10 phút để giữ suất.',
    };
  }

  // ══════════════════════════ JOB (deadline sweep) ══════════════════════════

  /** Tự đóng đăng ký khi hết hạn, hết hạn khi cửa hàng không phản hồi, kết thúc khi đề nghị hết hạn. */
  async processDeadlines(now: Date = new Date()) {
    const due = await this.poolRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.pool_status = :open AND p.registration_close_at <= :now')
      .orWhere('p.pool_status = :pending AND p.confirm_deadline_at <= :now')
      .orWhere('p.pool_status IN (:...offerStages) AND p.offer_expiry_at <= :now')
      .setParameters({ open: S.OPEN, pending: S.PENDING_STORE, offerStages: OFFER_STAGES, now })
      .getRawMany<{ id: string }>();

    let processed = 0;
    for (const { id } of due) {
      try {
        const outcome = await this.dataSource.transaction(async (manager) => {
          const pool = await this.lockPool(manager, id);
          if (pool.poolStatus === S.OPEN && new Date(pool.registrationCloseAt) <= now) {
            return this.aggregateAndDecide(manager, pool, SYSTEM_ACTOR);
          }
          if (pool.poolStatus === S.PENDING_STORE && new Date(pool.confirmDeadlineAt) <= now) {
            return this.finish(
              manager,
              pool,
              S.EXPIRED,
              'Cửa hàng không phản hồi trước hạn quyết định',
            );
          }
          if (
            OFFER_STAGES.includes(pool.poolStatus) &&
            pool.offerExpiryAt &&
            new Date(pool.offerExpiryAt) <= now
          ) {
            return pool.confirmedOrderCount > 0
              ? this.finish(manager, pool, S.COMPLETED, null)
              : this.finish(manager, pool, S.EXPIRED, 'Đề nghị cung ứng hết hạn, không có đơn');
          }
          return null; // đã được xử lý bởi luồng khác
        });
        if (outcome) {
          await this.deliver(outcome.pool, outcome.notice, outcome.recipients);
          processed += 1;
        }
      } catch (e: unknown) {
        this.logger.error(`[RESCUE_POOL_JOB] Pool ${id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    return { count: processed };
  }

  // ══════════════════════════ internals ══════════════════════════

  private async finish(
    manager: EntityManager,
    pool: RescuePoolEntity,
    to: RescuePoolStatus,
    reason: string | null,
  ) {
    const recipients = await this.registrantIds(manager, pool.id, [R.ACTIVE]);
    await this.closeActiveRegistrations(manager, pool.id);
    if (reason) pool.cancellationReason = reason;
    await this.transition(manager, pool, to, SYSTEM_ACTOR, { reason: reason ?? undefined });
    return { pool, recipients, notice: to as PoolNotice };
  }

  /** OPEN → AGGREGATING → PENDING_STORE (đủ ngưỡng) | INSUFFICIENT (không tạo đơn, không thu tiền). */
  private async aggregateAndDecide(
    manager: EntityManager,
    pool: RescuePoolEntity,
    actor: Actor,
    reason?: string,
  ) {
    await this.transition(manager, pool, S.AGGREGATING, actor, { reason });
    const demandQty = await this.activeDemandQuantity(manager, pool.id);
    const recipients = await this.registrantIds(manager, pool.id, [R.ACTIVE]);
    if (demandQty >= pool.minimumDemand) {
      await this.transition(manager, pool, S.PENDING_STORE, actor, {
        newValue: { demandQuantity: demandQty },
      });
      return { pool, recipients, notice: 'PENDING_STORE' as PoolNotice };
    }
    pool.cancellationReason = `Không đủ nhu cầu tối thiểu (${demandQty}/${pool.minimumDemand} suất)`;
    await this.closeActiveRegistrations(manager, pool.id);
    await this.transition(manager, pool, S.INSUFFICIENT, actor, {
      reason: pool.cancellationReason,
    });
    return { pool, recipients, notice: 'INSUFFICIENT' as PoolNotice };
  }

  private async transition(
    manager: EntityManager,
    pool: RescuePoolEntity,
    to: RescuePoolStatus,
    actor: Actor,
    opts: {
      reason?: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
      action?: string;
      storeScoped?: boolean;
    } = {},
  ) {
    const from = pool.poolStatus;
    assertPoolTransition(from, to);
    pool.poolStatus = to;
    if (actor.role === 'STORE_USER') pool.updatedBy = actor.id;
    await manager.save(pool);
    await this.audit(
      manager,
      pool,
      actor,
      opts.action ?? `RESCUE_POOL_${to}`,
      { status: from, ...(opts.oldValue ?? {}) },
      { status: to, ...(opts.reason ? { reason: opts.reason } : {}), ...(opts.newValue ?? {}) },
      opts.storeScoped ?? true,
    );
  }

  /** Nhật ký cùng transaction với thay đổi trạng thái (BR-B02-09) - dùng chung bảng audit_logs. */
  private async audit(
    manager: EntityManager,
    pool: RescuePoolEntity,
    actor: Actor,
    action: string,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
    storeScoped = true,
  ) {
    // Hành động do khách thực hiện không gắn store_id để cửa hàng không thấy định danh người tham gia (BR-B02-08)
    await manager.save(
      manager.create(AuditLogEntity, {
        storeId: storeScoped && actor.role !== 'CUSTOMER' ? pool.storeId : null,
        actorId: actor.id,
        actorRole: actor.role,
        action,
        targetType: 'RESCUE_POOL',
        targetId: pool.id,
        oldValue,
        newValue,
      }),
    );
    this.logger.log(`[AUDIT_LOG] ${action} pool#${pool.id} by ${actor.role}`);
  }

  private async auditRegistration(
    manager: EntityManager,
    customerId: string,
    action: string,
    reg: RescuePoolRegistrationEntity,
    newValue: Record<string, unknown>,
  ) {
    await manager.save(
      manager.create(AuditLogEntity, {
        storeId: null, // BR-B02-08: không lộ người tham gia trong nhật ký cửa hàng
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action,
        targetType: 'RESCUE_POOL_REGISTRATION',
        targetId: reg.id,
        oldValue: null,
        newValue: { poolId: reg.poolId, ...newValue },
      }),
    );
  }

  private async lockPool(manager: EntityManager, poolId: string, storeId?: string) {
    const qb = manager
      .createQueryBuilder(RescuePoolEntity, 'p')
      .setLock('pessimistic_write')
      .where('p.id = :poolId', { poolId });
    if (storeId) qb.andWhere('p.store_id = :storeId', { storeId });
    else qb.andWhere('p.pool_status <> :draft', { draft: S.DRAFT });
    const pool = await qb.getOne();
    if (!pool) throw new NotFoundException('Không tìm thấy đợt Rescue Pool.');
    return pool;
  }

  private async lockMyRegistration(manager: EntityManager, poolId: string, customerId: string) {
    const reg = await manager
      .createQueryBuilder(RescuePoolRegistrationEntity, 'r')
      .setLock('pessimistic_write')
      .where('r.pool_id = :poolId AND r.customer_id = :customerId', { poolId, customerId })
      .andWhere('r.registration_status <> :w', { w: R.WITHDRAWN })
      .getOne();
    if (!reg) throw new NotFoundException('Bạn chưa có đăng ký nhu cầu hiệu lực trong đợt này.');
    return reg;
  }

  private async findStorePool(storeId: string, poolId: string) {
    const pool = await this.poolRepo.findOne({ where: { id: poolId, storeId } });
    if (!pool) throw new NotFoundException('Không tìm thấy đợt Rescue Pool của cửa hàng.');
    return pool;
  }

  private async registrantIds(
    manager: EntityManager,
    poolId: string,
    statuses: RescuePoolRegistrationStatus[],
  ) {
    const rows = await manager.find(RescuePoolRegistrationEntity, {
      where: { poolId, registrationStatus: In(statuses) },
      select: { customerId: true },
    });
    return [...new Set(rows.map((r) => r.customerId))];
  }

  private async closeActiveRegistrations(manager: EntityManager, poolId: string) {
    await manager.update(
      RescuePoolRegistrationEntity,
      { poolId, registrationStatus: R.ACTIVE },
      { registrationStatus: R.CLOSED },
    );
  }

  private async activeDemandQuantity(manager: EntityManager, poolId: string): Promise<number> {
    const row = await manager
      .createQueryBuilder(RescuePoolRegistrationEntity, 'r')
      .select('COALESCE(SUM(r.requested_quantity), 0)::int', 'qty')
      .where('r.pool_id = :poolId AND r.registration_status IN (:...st)', {
        poolId,
        st: [R.ACTIVE, R.ORDERED],
      })
      .getRawOne<{ qty: number }>();
    return Number(row?.qty ?? 0);
  }

  private async liveConfirmedQuantity(manager: EntityManager, poolId: string): Promise<number> {
    const row = await manager
      .createQueryBuilder(RescuePoolRegistrationEntity, 'r')
      .innerJoin(OrderEntity, 'o', 'o.id = r.linked_order_id')
      .select('COALESCE(SUM(o.quantity), 0)::int', 'qty')
      .where('r.pool_id = :poolId', { poolId })
      .andWhere('o.status IN (:...live)', { live: LIVE_ORDER_STATUSES })
      .getRawOne<{ qty: number }>();
    return Number(row?.qty ?? 0);
  }

  private async demandByPool(poolIds: string[]) {
    const rows = await this.regRepo
      .createQueryBuilder('r')
      .select('r.pool_id', 'poolId')
      .addSelect('COALESCE(SUM(r.requested_quantity), 0)::int', 'qty')
      .where('r.pool_id IN (:...poolIds) AND r.registration_status IN (:...st)', {
        poolIds,
        st: [R.ACTIVE, R.ORDERED],
      })
      .groupBy('r.pool_id')
      .getRawMany<{ poolId: string; qty: number }>();
    return new Map(rows.map((r) => [r.poolId, Number(r.qty)]));
  }

  /** Chỉ dữ liệu tổng hợp: đếm/tổng/phân bố theo nhóm. Không có customer_id/tên/SĐT (BR-B02-08). */
  private async aggregateDemand(pool: RescuePoolEntity) {
    const base = () =>
      this.regRepo
        .createQueryBuilder('r')
        .where('r.pool_id = :poolId AND r.registration_status IN (:...st)', {
          poolId: pool.id,
          st: [R.ACTIVE, R.ORDERED],
        })
        .groupBy('1')
        .orderBy('1');

    const budgetRows = await base()
      .select(
        `CASE WHEN r.budget_max IS NULL THEN 'UNSPECIFIED'
              WHEN r.budget_max < 30000 THEN 'UNDER_30K'
              WHEN r.budget_max < 50000 THEN '30K_50K'
              WHEN r.budget_max < 100000 THEN '50K_100K'
              ELSE 'OVER_100K' END`,
        'bucket',
      )
      .addSelect('COUNT(*)::int', 'registrations')
      .addSelect('COALESCE(SUM(r.requested_quantity), 0)::int', 'quantity')
      .getRawMany<{ bucket: string; registrations: number; quantity: number }>();

    const pickupRows = await base()
      .select(
        `COALESCE(to_char(r.preferred_pickup_start AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:00'), 'FLEXIBLE')`,
        'slot',
      )
      .addSelect('COUNT(*)::int', 'registrations')
      .addSelect('COALESCE(SUM(r.requested_quantity), 0)::int', 'quantity')
      .getRawMany<{ slot: string; registrations: number; quantity: number }>();

    const totalRegistrations = budgetRows.reduce((s, r) => s + Number(r.registrations), 0);
    const totalRequestedQuantity = budgetRows.reduce((s, r) => s + Number(r.quantity), 0);
    const num = <T extends { registrations: number; quantity: number }>(r: T) => ({
      ...r,
      registrations: Number(r.registrations),
      quantity: Number(r.quantity),
    });
    return {
      totalRegistrations,
      totalRequestedQuantity,
      minimumDemand: pool.minimumDemand,
      maximumSupply: pool.maximumSupply,
      meetsMinimumDemand: totalRequestedQuantity >= pool.minimumDemand,
      exceedsMaximumSupply: totalRequestedQuantity > pool.maximumSupply,
      budgetDistribution: budgetRows.map(num),
      pickupWindowDistribution: pickupRows.map(num),
    };
  }

  private pickMyRegistration(regs: RescuePoolRegistrationEntity[], poolId: string) {
    const mine = regs.filter((r) => r.poolId === poolId);
    return mine.find((r) => r.registrationStatus !== R.WITHDRAWN) ?? mine[0] ?? null;
  }

  /** Không lộ người tham gia khác (BR-C02-08); giá đề nghị chỉ hiện cho khách đủ điều kiện (đã đăng ký). */
  private toCustomerView(
    pool: RescuePoolEntity,
    storeName: string | null,
    myReg: RescuePoolRegistrationEntity | null,
    expectedQuantity: number,
    remainingSupply: number | null,
  ) {
    const eligible = !!myReg && myReg.registrationStatus !== R.WITHDRAWN && pool.offerVersion > 0;
    const now = Date.now();
    return {
      id: pool.id,
      storeId: pool.storeId,
      storeName,
      poolTitle: pool.poolTitle,
      targetCategory: pool.targetCategory,
      targetItemId: pool.targetItemId,
      serviceArea: pool.serviceArea,
      registrationOpenAt: pool.registrationOpenAt,
      registrationCloseAt: pool.registrationCloseAt,
      confirmDeadlineAt: pool.confirmDeadlineAt,
      minimumDemand: pool.minimumDemand,
      maximumSupply: pool.maximumSupply,
      targetBudgetMin: pool.targetBudgetMin,
      targetBudgetMax: pool.targetBudgetMax,
      pickupWindowStart: pool.pickupWindowStart,
      pickupWindowEnd: pool.pickupWindowEnd,
      endCondition: pool.endCondition,
      poolStatus: pool.poolStatus,
      cancellationReason: pool.cancellationReason,
      expectedQuantity,
      canRegister:
        pool.poolStatus === S.OPEN &&
        now >= new Date(pool.registrationOpenAt).getTime() &&
        now < new Date(pool.registrationCloseAt).getTime() &&
        (!myReg || myReg.registrationStatus === R.WITHDRAWN),
      offer: eligible
        ? {
            offerVersion: pool.offerVersion,
            proposedPrice: pool.proposedPrice,
            offeredQuantity: pool.offeredQuantity,
            remainingQuantity: remainingSupply,
            pickupStart: pool.offerPickupStart,
            pickupEnd: pool.offerPickupEnd,
            offerExpiryAt: pool.offerExpiryAt,
            canConfirm:
              OFFER_STAGES.includes(pool.poolStatus) &&
              myReg!.registrationStatus === R.ACTIVE &&
              !!pool.offerExpiryAt &&
              now < new Date(pool.offerExpiryAt).getTime(),
          }
        : null,
      myRegistration: myReg
        ? {
            id: myReg.id,
            registrationStatus: myReg.registrationStatus,
            requestedQuantity: myReg.requestedQuantity,
            budgetMin: myReg.budgetMin,
            budgetMax: myReg.budgetMax,
            preferredPickupStart: myReg.preferredPickupStart,
            preferredPickupEnd: myReg.preferredPickupEnd,
            registeredAt: myReg.registeredAt,
            offerVersionAcknowledged: myReg.offerVersionAcknowledged,
            linkedOrderId: myReg.linkedOrderId,
            withdrawnAt: myReg.withdrawnAt,
          }
        : null,
    };
  }

  private offerSnapshot(pool: RescuePoolEntity) {
    return {
      offerVersion: pool.offerVersion,
      linkedOfferId: pool.linkedOfferId,
      offeredQuantity: pool.offeredQuantity,
      proposedPrice: pool.proposedPrice,
      offerPickupStart: pool.offerPickupStart,
      offerPickupEnd: pool.offerPickupEnd,
      offerExpiryAt: pool.offerExpiryAt,
    };
  }

  private async assertOfferMatchesTarget(
    manager: EntityManager,
    pool: RescuePoolEntity,
    offer: OfferEntity,
  ) {
    if (pool.targetItemId) {
      if (offer.itemId !== pool.targetItemId) {
        throw new BadRequestException('Suất nguồn phải là món mục tiêu của đợt.');
      }
      return;
    }
    const item = offer.itemId
      ? await manager.findOne(ItemEntity, { where: { id: offer.itemId } })
      : null;
    if (!item || item.category !== pool.targetCategory) {
      throw new BadRequestException('Suất nguồn phải thuộc nhóm món mục tiêu của đợt.');
    }
  }

  private validatePoolDefinition(p: RescuePoolEntity) {
    const t = (d: Date) => new Date(d).getTime();
    const missing = [
      !p.poolTitle?.trim() && 'tên đợt',
      !p.serviceArea?.trim() && 'khu vực phục vụ',
      !p.targetCategory?.trim() && 'nhóm món',
      !p.endCondition?.trim() && 'điều kiện kết thúc',
    ].filter(Boolean);
    if (missing.length) {
      throw new BadRequestException(`Thiếu thông tin bắt buộc: ${missing.join(', ')} (BR-B02-03).`);
    }
    if (t(p.registrationOpenAt) >= t(p.registrationCloseAt)) {
      throw new BadRequestException('Thời gian mở đăng ký phải trước thời gian đóng.');
    }
    if (t(p.confirmDeadlineAt) < t(p.registrationCloseAt)) {
      throw new BadRequestException('Hạn quyết định cung ứng phải sau khi đóng đăng ký.');
    }
    if (t(p.pickupWindowStart) >= t(p.pickupWindowEnd)) {
      throw new BadRequestException('Khung nhận không hợp lệ (bắt đầu phải trước kết thúc).');
    }
    if (t(p.confirmDeadlineAt) >= t(p.pickupWindowEnd)) {
      throw new BadRequestException('Hạn quyết định cung ứng phải trước khi khung nhận kết thúc.');
    }
    if (p.minimumDemand < 1 || p.maximumSupply < p.minimumDemand) {
      throw new BadRequestException('Ngưỡng tối đa phải ≥ ngưỡng tối thiểu ≥ 1 (BR-B02-04).');
    }
    if (
      p.targetBudgetMin !== null &&
      p.targetBudgetMax !== null &&
      p.targetBudgetMin > p.targetBudgetMax
    ) {
      throw new BadRequestException('Ngân sách tối thiểu phải ≤ ngân sách tối đa.');
    }
  }

  private validateDemandFields(dto: RegisterDemandDto) {
    if (dto.budgetMin != null && dto.budgetMax != null && dto.budgetMin > dto.budgetMax) {
      throw new BadRequestException('Ngân sách tối thiểu phải ≤ ngân sách tối đa.');
    }
    if (
      dto.preferredPickupStart &&
      dto.preferredPickupEnd &&
      new Date(dto.preferredPickupStart) >= new Date(dto.preferredPickupEnd)
    ) {
      throw new BadRequestException('Khung nhận mong muốn không hợp lệ.');
    }
  }

  private assertRegistrationOpen(pool: RescuePoolEntity) {
    const now = Date.now();
    if (pool.poolStatus !== S.OPEN || now >= new Date(pool.registrationCloseAt).getTime()) {
      throw new ConflictException({ code: 'POOL_NOT_OPEN', message: 'Đợt đã đóng đăng ký.' });
    }
    if (now < new Date(pool.registrationOpenAt).getTime()) {
      throw new ConflictException({
        code: 'POOL_NOT_OPEN',
        message: `Đợt chưa mở đăng ký (mở lúc ${vnTime(pool.registrationOpenAt)}).`,
      });
    }
  }

  private assertDemandFitsPool(pool: RescuePoolEntity, dto: RegisterDemandDto) {
    if (dto.requestedQuantity > pool.maximumSupply) {
      throw new BadRequestException(
        `Vượt giới hạn: đợt chỉ dự kiến tối đa ${pool.maximumSupply} suất.`,
      );
    }
    const ws = new Date(pool.pickupWindowStart).getTime();
    const we = new Date(pool.pickupWindowEnd).getTime();
    for (const v of [dto.preferredPickupStart, dto.preferredPickupEnd]) {
      if (v && (new Date(v).getTime() < ws || new Date(v).getTime() > we)) {
        throw new BadRequestException('Khung nhận mong muốn phải nằm trong khung nhận của đợt.');
      }
    }
  }

  private duplicateRegistrationError() {
    return new ConflictException({
      code: 'POOL_ALREADY_REGISTERED',
      message: 'Bạn đã đăng ký nhu cầu cho đợt này. Hãy sửa đăng ký hiện có thay vì đăng ký mới.',
    });
  }

  /** Thông báo sau commit; lỗi gửi không làm sai trạng thái (BRD CM-C02 ngoại lệ "Thông báo lỗi"). */
  private async deliver(pool: RescuePoolEntity, notice: PoolNotice, recipients: string[]) {
    const window = `${vnTime(pool.offerPickupStart)} – ${vnTime(pool.offerPickupEnd)}`;
    const messages: Record<PoolNotice, { title: string; body: string }> = {
      PENDING_STORE: {
        title: 'Đợt đã đủ ngưỡng nhu cầu',
        body: `Đợt "${pool.poolTitle}" đủ ngưỡng, đang chờ cửa hàng quyết định cung ứng. Đây chưa phải đơn hàng, bạn chưa bị thu tiền.`,
      },
      OFFER_PUBLISHED: {
        title: 'Đề nghị cung ứng mới - đặt hàng ngay nếu bạn muốn',
        body: `Đợt "${pool.poolTitle}": ${vnd(pool.proposedPrice)}/suất, nhận ${window}. Đây là đề nghị, chưa phải đơn - hãy xác nhận mua trước ${vnTime(pool.offerExpiryAt)}.`,
      },
      OFFER_REVISED: {
        title: 'Điều kiện đề nghị đã thay đổi - cần xác nhận lại',
        body: `Đợt "${pool.poolTitle}" cập nhật đề nghị: ${vnd(pool.proposedPrice)}/suất, nhận ${window}, hạn ${vnTime(pool.offerExpiryAt)}. Vui lòng xem lại trước khi đặt.`,
      },
      INSUFFICIENT: {
        title: 'Đợt không đủ điều kiện',
        body: `Đợt "${pool.poolTitle}" không đủ nhu cầu tối thiểu và đã đóng. Không có đơn nào được tạo, bạn không bị thu tiền.`,
      },
      CANCELLED: {
        title: 'Cửa hàng đã từ chối/hủy đợt',
        body: `Đợt "${pool.poolTitle}" đã hủy${pool.cancellationReason ? ` (lý do: ${pool.cancellationReason})` : ''}. Đăng ký nhu cầu đã đóng; đơn chính thức (nếu có) được hủy/hoàn tiền theo chính sách hiện hành.`,
      },
      EXPIRED: {
        title: 'Đợt đã hết hạn',
        body: `Đợt "${pool.poolTitle}" đã hết hạn${pool.cancellationReason ? ` (${pool.cancellationReason})` : ''}. Không có đơn nào được tạo từ đăng ký của bạn.`,
      },
      COMPLETED: {
        title: 'Đợt đã kết thúc',
        body: `Đợt "${pool.poolTitle}" đã kết thúc/hết suất cung ứng. Đăng ký nhu cầu chưa thành đơn của bạn đã đóng, không có khoản thu nào.`,
      },
    };
    const msg = messages[notice];
    const data = {
      kind: `RESCUE_POOL_${notice}`,
      poolId: pool.id,
      offerVersion: pool.offerVersion,
    };
    for (const userId of recipients) {
      await this.safeNotify({ userId, type: NotificationType.SYSTEM, ...msg, data });
    }
    if (notice === 'PENDING_STORE' || notice === 'EXPIRED') {
      await this.safeNotify({
        storeId: pool.storeId,
        type: NotificationType.SYSTEM,
        title:
          notice === 'PENDING_STORE'
            ? 'Đợt Rescue Pool chờ bạn quyết định'
            : 'Đợt Rescue Pool đã hết hạn',
        body:
          notice === 'PENDING_STORE'
            ? `Đợt "${pool.poolTitle}" đủ ngưỡng nhu cầu. Hãy công bố đề nghị cung ứng hoặc từ chối trước ${vnTime(pool.confirmDeadlineAt)}.`
            : `Đợt "${pool.poolTitle}" đã hết hạn: ${pool.cancellationReason ?? ''}`,
        data,
      });
    }
  }

  private async safeNotify(params: Parameters<NotificationsService['createNotification']>[0]) {
    try {
      await this.notificationsService.createNotification(params);
    } catch (e: unknown) {
      this.logger.warn(`[RESCUE_POOL_NOTIFY_FAILED] ${e instanceof Error ? e.message : e}`);
    }
  }
}
