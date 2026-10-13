import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { QrTokenEngine } from '@surplusiq/core';
import { CreateOrderDto, CancelOrderDto, QueryOrdersDto } from './dto';
import { ORDERS_CONSTANTS } from './orders.constants';

export interface OrdersListResult {
  data: OrderEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'surplusiq_super_secret_jwt_key_2026';

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(OrderLockEntity)
    private readonly orderLockRepo: Repository<OrderLockEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Sinh mã đơn hàng duy nhất có định dạng 12 ký tự: SQ-YYMMDD-XXXX
   */
  private generateOrderCode(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SQ${yy}${mm}${dd}${randomHex}`.slice(0, 12);
  }

  /**
   * Đặt giữ suất cứu món với Transaction & Lock FOR UPDATE (R1-040, BR-017, BR-019, BR-020, BR-064)
   * Giữ suất 10 phút, trừ tồn nguyên tử, khóa giá chốt, chặn khách bị phạt (BR-020).
   */
  async holdOrder(
    customerId: string,
    dto: CreateOrderDto,
    actorId = customerId,
  ): Promise<OrderEntity> {
    // 1. Kiểm tra tài khoản có bị khóa đặt hàng hay không (BR-020)
    const lock = await this.orderLockRepo.findOne({
      where: { customerId },
    });

    if (lock && new Date(lock.lockedUntil) > new Date()) {
      throw new BadRequestException(
        `Tài khoản của bạn đang bị tạm khóa quyền đặt hàng đến ${new Date(lock.lockedUntil).toLocaleString('vi-VN')} do không đến nhận nhiều lần (BR-020).`,
      );
    }

    // 2. Kiểm tra số lượng hợp lệ (1 đến 5 suất per BR-019)
    if (
      dto.quantity < ORDERS_CONSTANTS.MIN_QUANTITY_PER_ORDER ||
      dto.quantity > ORDERS_CONSTANTS.MAX_QUANTITY_PER_ORDER
    ) {
      throw new BadRequestException(
        `Số lượng đặt phải từ ${ORDERS_CONSTANTS.MIN_QUANTITY_PER_ORDER} đến ${ORDERS_CONSTANTS.MAX_QUANTITY_PER_ORDER} suất (BR-019).`,
      );
    }

    // 3. Mở Database Transaction với khóa bi quan FOR UPDATE (pessimistic_write) chống bán vượt tồn kho
    return this.dataSource.transaction(async (manager) => {
      const offer = await manager
        .createQueryBuilder(OfferEntity, 'offer')
        .setLock('pessimistic_write')
        .where('offer.id = :id', { id: dto.offerId })
        .getOne();

      if (!offer) {
        throw new NotFoundException(`Không tìm thấy suất bán với ID [${dto.offerId}].`);
      }

      if (offer.status !== OfferStatus.OPEN) {
        throw new BadRequestException('Suất bán hiện không mở để đặt hàng.');
      }

      if (offer.remainingQuantity < dto.quantity) {
        throw new BadRequestException(
          `Món này đã hết suất hoặc không còn đủ số lượng yêu cầu (còn ${offer.remainingQuantity}/${dto.quantity}).`,
        );
      }

      // 4. Trừ tồn kho nguyên tử
      offer.remainingQuantity -= dto.quantity;
      if (offer.remainingQuantity === 0) {
        offer.status = OfferStatus.SOLD_OUT;
      }
      await manager.save(offer);

      // 5. Khóa giá chốt đơn (R1-040)
      const unitPrice = offer.currentPrice;
      const discountAmount = 0; // Giảm giá từ promotion nếu có
      const totalAmount = unitPrice * dto.quantity - discountAmount;

      // 6. Tính thời gian hết hạn giữ suất 10 phút (BR-017)
      const now = new Date();
      const holdExpiresAt = new Date(
        now.getTime() + ORDERS_CONSTANTS.HOLD_DURATION_MINUTES * 60 * 1000,
      );

      const code = this.generateOrderCode();
      const pickupSlot = dto.pickupSlot ? new Date(dto.pickupSlot) : null;

      const order = manager.create(OrderEntity, {
        code,
        customerId,
        storeId: offer.storeId,
        offerId: offer.id,
        quantity: dto.quantity,
        unitPrice,
        promotionId: dto.promotionId || null,
        discountAmount,
        totalAmount,
        status: OrderStatus.PENDING_PAYMENT,
        holdExpiresAt,
        pickupSlot,
        note: dto.note || null,
      });

      const savedOrder = await manager.save(order);

      // 7. Ghi nhật ký kiểm toán
      await this.auditLogService.log({
        storeId: offer.storeId,
        actorId,
        actorRole: 'CUSTOMER',
        action: 'ORDER_HELD',
        targetType: 'ORDER',
        targetId: savedOrder.id,
        newValue: {
          code: savedOrder.code,
          quantity: savedOrder.quantity,
          unitPrice: savedOrder.unitPrice,
          totalAmount: savedOrder.totalAmount,
          holdExpiresAt: savedOrder.holdExpiresAt,
        },
      });

      return savedOrder;
    });
  }

  /**
   * Khách hàng hủy giữ suất chủ động trong vòng 10 phút (R1-043)
   * Hoàn trả tồn kho nguyên tử ngay lập tức, không ghi nhận noshow hay phạt.
   */
  async cancelHoldByCustomer(
    customerId: string,
    orderId: string,
    dto?: CancelOrderDto,
  ): Promise<OrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(OrderEntity, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id AND order.customer_id = :customerId', {
          id: orderId,
          customerId,
        })
        .getOne();

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException(
          `Chỉ có thể hủy giữ suất đối với đơn hàng đang chờ thanh toán (hiện tại: ${order.status}) (R1-043).`,
        );
      }

      // 1. Cập nhật trạng thái đơn
      order.status = OrderStatus.CANCELLED;
      order.cancelledBy = CancelledBy.CUSTOMER;
      order.cancelReason = dto?.reason || 'Khách hủy giữ suất';
      order.cancelledAt = new Date();
      const savedOrder = await manager.save(order);

      // 2. Hoàn trả tồn kho suất bán
      const offer = await manager
        .createQueryBuilder(OfferEntity, 'offer')
        .setLock('pessimistic_write')
        .where('offer.id = :id', { id: order.offerId })
        .getOne();

      if (offer) {
        offer.remainingQuantity += order.quantity;
        if (offer.status === OfferStatus.SOLD_OUT) {
          offer.status = OfferStatus.OPEN;
        }
        await manager.save(offer);
      }

      // 3. Ghi nhật ký kiểm toán
      await this.auditLogService.log({
        storeId: order.storeId,
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action: 'ORDER_HOLD_CANCELLED',
        targetType: 'ORDER',
        targetId: order.id,
        newValue: {
          status: OrderStatus.CANCELLED,
          reason: order.cancelReason,
        },
      });

      return savedOrder;
    });
  }

  /**
   * Tự động nhả suất hết hạn giữ 10 phút (R1-044, BR-017)
   * Chạy bởi background worker hoặc định kỳ giải phóng tồn kho cho các suất hết hạn.
   */
  async releaseExpiredHolds(): Promise<number> {
    const now = new Date();
    const expiredOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
      },
    });

    const toRelease = expiredOrders.filter((o) => new Date(o.holdExpiresAt) <= now);
    let releasedCount = 0;

    for (const order of toRelease) {
      await this.dataSource.transaction(async (manager) => {
        const lockedOrder = await manager
          .createQueryBuilder(OrderEntity, 'order')
          .setLock('pessimistic_write')
          .where('order.id = :id AND order.status = :status', {
            id: order.id,
            status: OrderStatus.PENDING_PAYMENT,
          })
          .getOne();

        if (!lockedOrder) return;

        lockedOrder.status = OrderStatus.HOLD_EXPIRED;
        lockedOrder.cancelledBy = CancelledBy.SYSTEM;
        lockedOrder.cancelReason = 'Hết hạn giữ suất 10 phút (BR-017)';
        lockedOrder.cancelledAt = new Date();
        await manager.save(lockedOrder);

        const offer = await manager
          .createQueryBuilder(OfferEntity, 'offer')
          .setLock('pessimistic_write')
          .where('offer.id = :id', { id: lockedOrder.offerId })
          .getOne();

        if (offer) {
          offer.remainingQuantity += lockedOrder.quantity;
          if (offer.status === OfferStatus.SOLD_OUT) {
            offer.status = OfferStatus.OPEN;
          }
          await manager.save(offer);
        }

        releasedCount++;
      });
    }

    if (releasedCount > 0) {
      this.logger.log(`[RELEASE_HOLDS] Đã nhả ${releasedCount} đơn giữ suất quá hạn 10 phút.`);
    }

    return releasedCount;
  }

  /**
   * Xem chi tiết đơn hàng phía khách hàng (R1-046)
   */
  async getOrderById(
    customerId: string,
    orderId: string,
  ): Promise<OrderEntity & { offer?: OfferEntity | null }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    const offer = await this.offerRepo.findOne({
      where: { id: order.offerId },
    });

    return {
      ...order,
      offer,
    };
  }

  /**
   * Lịch sử đơn hàng của khách hàng (R1-048)
   */
  async getCustomerOrders(customerId: string, query: QueryOrdersDto): Promise<OrdersListResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .where('order.customer_id = :customerId', { customerId });

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.date) {
      qb.andWhere('order.created_at >= :start AND order.created_at <= :end', {
        start: new Date(`${query.date}T00:00:00.000Z`),
        end: new Date(`${query.date}T23:59:59.999Z`),
      });
    }

    qb.orderBy('order.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Danh sách đơn đang hoạt động / chờ nhận hàng của khách (R1-055)
   */
  async getCustomerActiveOrders(customerId: string): Promise<OrderEntity[]> {
    return this.orderRepo.find({
      where: {
        customerId,
        status: In([OrderStatus.PENDING_PAYMENT, OrderStatus.PAID]),
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Khách thông báo sắp đến cửa hàng nhận hàng
   */
  async notifyCustomerArriving(customerId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        'Chỉ có thể thông báo đến cho đơn hàng đã thanh toán thành công.',
      );
    }

    order.arrivingNotifiedAt = new Date();
    return this.orderRepo.save(order);
  }

  /**
   * Danh sách đơn hàng thực tế của cửa hàng (R2-049)
   */
  async getStoreOrders(storeId: string, query: QueryOrdersDto): Promise<OrdersListResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .where('order.store_id = :storeId', { storeId });

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.date) {
      qb.andWhere('order.created_at >= :start AND order.created_at <= :end', {
        start: new Date(`${query.date}T00:00:00.000Z`),
        end: new Date(`${query.date}T23:59:59.999Z`),
      });
    }

    qb.orderBy('order.created_at', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Chi tiết đơn hàng phía cửa hàng (R2-051)
   */
  async getStoreOrderById(
    storeId: string,
    orderId: string,
  ): Promise<OrderEntity & { offer?: OfferEntity | null }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, storeId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}] trong cửa hàng.`);
    }

    const offer = await this.offerRepo.findOne({
      where: { id: order.offerId },
    });

    return {
      ...order,
      offer,
    };
  }

  /**
   * Cửa hàng hủy đơn do sự cố quán (hoàn tiền 100%, ghi lý do) (R2-053)
   */
  async cancelOrderByStore(
    storeId: string,
    orderId: string,
    dto: CancelOrderDto,
    actorId = 'SYSTEM',
  ): Promise<OrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(OrderEntity, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id AND order.store_id = :storeId', {
          id: orderId,
          storeId,
        })
        .getOne();

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}] trong cửa hàng.`);
      }

      if (
        order.status === OrderStatus.PICKED_UP ||
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.REFUNDED
      ) {
        throw new BadRequestException(`Không thể hủy đơn hàng đã ở trạng thái ${order.status}.`);
      }

      const wasPending = order.status === OrderStatus.PENDING_PAYMENT;
      order.status = OrderStatus.CANCELLED;
      order.cancelledBy = CancelledBy.STORE;
      order.cancelReason = dto?.reason || 'Cửa hàng hủy đơn (Hoàn tiền 100%)';
      order.cancelledAt = new Date();

      const savedOrder = await manager.save(order);

      // Nếu đơn đang giữ suất chưa thanh toán -> hoàn trả tồn kho vào suất bán
      if (wasPending) {
        const offer = await manager
          .createQueryBuilder(OfferEntity, 'offer')
          .setLock('pessimistic_write')
          .where('offer.id = :id', { id: order.offerId })
          .getOne();

        if (offer) {
          offer.remainingQuantity += order.quantity;
          if (offer.status === OfferStatus.SOLD_OUT) {
            offer.status = OfferStatus.OPEN;
          }
          await manager.save(offer);
        }
      }

      // Ghi nhật ký kiểm toán
      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_MEMBER',
        action: 'ORDER_CANCELLED_BY_STORE',
        targetType: 'ORDER',
        targetId: savedOrder.id,
        newValue: {
          status: OrderStatus.CANCELLED,
          reason: order.cancelReason,
        },
      });

      return savedOrder;
    });
  }

  /**
   * Quét QR nhận hàng tại quầy (Legacy & Hỗ trợ xác nhận nhận hàng)
   */
  async claimOrder(qrToken: string, storeId: string) {
    const verification = QrTokenEngine.verifyToken(qrToken, this.jwtSecret);

    if (!verification.isValid || !verification.payload) {
      throw new BadRequestException(`Mã QR không hợp lệ hoặc đã hết hạn: ${verification.error}`);
    }

    const { orderId } = verification.payload;
    const order = await this.orderRepo.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    if (order.storeId !== storeId) {
      throw new BadRequestException('Mã QR này thuộc về cửa hàng khác.');
    }

    if (order.status === OrderStatus.PICKED_UP) {
      throw new BadRequestException('Đơn hàng này đã được nhận trước đó rồi.');
    }

    order.status = OrderStatus.PICKED_UP;
    order.pickedUpAt = new Date();
    await this.orderRepo.save(order);

    return {
      success: true,
      orderId: order.id,
      code: order.code,
      message: 'Xác nhận nhận hàng thành công.',
    };
  }
}
