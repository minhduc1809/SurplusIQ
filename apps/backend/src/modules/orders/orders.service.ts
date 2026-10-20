import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import {
  ProxyPickupCodeEntity,
  ProxyPickupCodeStatus,
} from '../../entities/orders/proxy-pickup-code.entity';
import { PickupTokenEntity, PickupTokenStatus } from '../../entities/orders/pickup-token.entity';
import {
  PaymentTransactionEntity,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../entities/orders/payment-transaction.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity, StoreStatus } from '../../entities/stores/store.entity';
import { FavoriteStoreEntity } from '../../entities/auth/favorite-store.entity';
import { CustomerSegmentEntity } from '../../entities/stores/customer-segment.entity';
import {
  PromotionEntity,
  PromotionStatus,
  PromotionTarget,
  PromotionType,
} from '../../entities/marketing/promotion.entity';
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
    @InjectRepository(ProxyPickupCodeEntity)
    private readonly proxyCodeRepo: Repository<ProxyPickupCodeEntity>,
    @InjectRepository(PickupTokenEntity)
    private readonly pickupTokenRepo: Repository<PickupTokenEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly paymentTxRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
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
    /** Cho phép chạy trong transaction bên ngoài (vd. Rescue Pool confirm-offer khóa đợt + đơn cùng lúc). */
    outerManager?: EntityManager,
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
    const work = async (manager: EntityManager): Promise<OrderEntity> => {
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

      const store = await manager.findOne(StoreEntity, {
        where: { id: offer.storeId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!store || store.status !== StoreStatus.ACTIVE) {
        throw new BadRequestException('Cửa hàng hiện không nhận đơn mới.');
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

      // 5. Khóa giá chốt đơn (R1-040) & Áp dụng ưu đãi giảm giá (R1-053)
      const unitPrice = offer.currentPrice;
      const subtotal = unitPrice * dto.quantity;
      let discountAmount = 0;
      let appliedPromotionId: string | null = null;

      if (dto.promotionId) {
        const promo = await manager.findOne(PromotionEntity, {
          where: { id: dto.promotionId },
        });

        if (!promo) {
          throw new BadRequestException('Mã ưu đãi không tồn tại trên hệ thống.');
        }

        if (promo.storeId !== offer.storeId) {
          throw new BadRequestException('Mã ưu đãi này không thuộc cửa hàng đã chọn.');
        }

        if (promo.status !== PromotionStatus.ACTIVE) {
          throw new BadRequestException(
            'Mã ưu đãi hiện không khả dụng (đã tạm dừng hoặc đã kết thúc).',
          );
        }

        const nowTime = new Date().getTime();
        if (promo.startAt && nowTime < new Date(promo.startAt).getTime()) {
          throw new BadRequestException('Chương trình ưu đãi này chưa bắt đầu.');
        }

        if (promo.endAt && nowTime > new Date(promo.endAt).getTime()) {
          throw new BadRequestException('Mã ưu đãi này đã hết hạn sử dụng.');
        }

        if (promo.maxUses && promo.usedCount >= promo.maxUses) {
          throw new BadRequestException('Mã ưu đãi đã hết lượt sử dụng.');
        }

        if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
          throw new BadRequestException(
            `Đơn hàng chưa đạt giá trị tối thiểu ${promo.minOrderAmount.toLocaleString('vi-VN')} ₫ để áp dụng mã này.`,
          );
        }

        // Ưu đãi chỉ dành cho đúng nhóm khách đã chọn
        if (promo.target !== PromotionTarget.ALL) {
          const eligible =
            promo.target === PromotionTarget.FAVORITES
              ? await manager.exists(FavoriteStoreEntity, {
                  where: { userId: customerId, storeId: offer.storeId },
                })
              : await manager.exists(CustomerSegmentEntity, {
                  where: { storeId: offer.storeId, customerId, segment: promo.target as never },
                });
          if (!eligible) {
            throw new BadRequestException('Ưu đãi này không dành cho tài khoản của bạn.');
          }
        }

        // Tính toán số tiền chiết khấu theo loại ưu đãi
        if (promo.type === PromotionType.PERCENT) {
          discountAmount = Math.round((subtotal * promo.value) / 100);
        } else {
          discountAmount = Math.min(promo.value, subtotal);
        }

        // Ưu đãi không đưa giá xuống dưới giá sàn của suất (BR-019)
        discountAmount = Math.min(
          discountAmount,
          Math.max(0, subtotal - offer.floorPrice * dto.quantity),
        );

        // Tăng số lượt sử dụng của promotion
        promo.usedCount += 1;
        await manager.save(promo);
        appliedPromotionId = promo.id;
      }

      const totalAmount = Math.max(0, subtotal - discountAmount);

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
        promotionId: appliedPromotionId,
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
    };
    return outerManager ? work(outerManager) : this.dataSource.transaction(work);
  }

  /**
   * Khách hàng hủy giữ suất chủ động trong vòng 10 phút hoặc hủy đơn đã thanh toán trước khung nhận 60 phút (R1-043)
   * Hoàn trả tồn kho nguyên tử ngay lập tức, hoàn tiền 100% nếu đã thanh toán, vô hiệu QR và mã nhận hộ.
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

      if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAID) {
        throw new BadRequestException(
          `Chỉ có thể hủy đơn hàng đang chờ thanh toán hoặc đã thanh toán trước khung nhận (hiện tại: ${order.status}) (R1-043).`,
        );
      }

      const offer = await manager
        .createQueryBuilder(OfferEntity, 'offer')
        .setLock('pessimistic_write')
        .where('offer.id = :id', { id: order.offerId })
        .getOne();

      const wasPaid = order.status === OrderStatus.PAID;

      // Kiểm tra mốc 60 phút trước giờ nhận nếu đơn đã thanh toán (R1-043)
      if (wasPaid) {
        const now = new Date();
        if (offer) {
          const pickupStart = new Date(offer.pickupStart);
          const cutoff = new Date(
            pickupStart.getTime() - ORDERS_CONSTANTS.CANCEL_CUTOFF_MINUTES * 60 * 1000,
          );
          if (now > cutoff) {
            throw new BadRequestException(
              `Chỉ có thể hủy đơn đã thanh toán trước giờ bắt đầu nhận hàng ít nhất ${ORDERS_CONSTANTS.CANCEL_CUTOFF_MINUTES} phút (R1-043). Vui lòng gửi khiếu nại nếu bạn gặp sự cố.`,
            );
          }
        }

        // Vô hiệu hóa vé nhận hàng QR và mã nhận hộ
        await manager.update(
          PickupTokenEntity,
          { orderId: order.id, status: PickupTokenStatus.UNUSED },
          { status: PickupTokenStatus.REVOKED },
        );
        await manager.update(
          ProxyPickupCodeEntity,
          { orderId: order.id, status: ProxyPickupCodeStatus.UNUSED },
          { status: ProxyPickupCodeStatus.REVOKED },
        );

        // Tạo giao dịch hoàn tiền 100% tự động (R1-043)
        const refundTx = manager.create(PaymentTransactionEntity, {
          orderId: order.id,
          storeId: order.storeId,
          kind: PaymentKind.ORDER_REFUND,
          amount: order.totalAmount,
          method: PaymentMethod.VIETQR,
          gatewayTxnId: `REFUND-${order.code}-${Date.now()}`,
          status: PaymentStatus.SUCCEEDED,
        });
        await manager.save(refundTx);
      }

      // 1. Cập nhật trạng thái đơn
      order.status = OrderStatus.CANCELLED;
      order.cancelledBy = CancelledBy.CUSTOMER;
      order.cancelReason =
        dto?.reason || (wasPaid ? 'Khách hủy trước khung nhận 60 phút' : 'Khách hủy giữ suất');
      order.cancelledAt = new Date();
      const savedOrder = await manager.save(order);

      // 2. Hoàn trả tồn kho suất bán
      if (offer) {
        offer.remainingQuantity += order.quantity;
        if (offer.status === OfferStatus.SOLD_OUT) {
          offer.status = OfferStatus.OPEN;
        }
        await manager.save(offer);
      }
      await this.releasePromotion(manager, order);

      // 3. Ghi nhật ký kiểm toán
      await this.auditLogService.log({
        storeId: order.storeId,
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action: wasPaid ? 'ORDER_PAID_CANCELLED' : 'ORDER_HOLD_CANCELLED',
        targetType: 'ORDER',
        targetId: order.id,
        newValue: {
          status: OrderStatus.CANCELLED,
          reason: order.cancelReason,
          wasPaid,
          refundAmount: wasPaid ? order.totalAmount : 0,
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
        await this.releasePromotion(manager, lockedOrder);

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
  /** Hủy hoặc hết hạn giữ suất thì trả lại lượt dùng ưu đãi (BR-019). */
  private async releasePromotion(manager: EntityManager, order: OrderEntity) {
    if (order.promotionId) {
      await manager.decrement(PromotionEntity, { id: order.promotionId }, 'usedCount', 1);
    }
  }

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
      .leftJoin('stores', 'store', 'store.id = order.store_id')
      .where('order.customer_id = :customerId', { customerId });

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.date) {
      qb.andWhere('order.created_at >= :start AND order.created_at <= :end', {
        start: new Date(`${query.date}T00:00:00.000Z`),
        end: new Date(`${query.date}T23:59:59.999Z`),
      });
    } else if (query.fromDate || query.toDate) {
      const maxRangeMs = ORDERS_CONSTANTS.ORDERS_FILTER_MAX_RANGE_MONTHS * 31 * 24 * 60 * 60 * 1000;
      const to = query.toDate ? new Date(`${query.toDate}T23:59:59.999Z`) : new Date();
      const earliestAllowed = new Date(to.getTime() - maxRangeMs);
      const requestedFrom = query.fromDate
        ? new Date(`${query.fromDate}T00:00:00.000Z`)
        : earliestAllowed;
      const from = requestedFrom < earliestAllowed ? earliestAllowed : requestedFrom;

      qb.andWhere('order.created_at >= :from AND order.created_at <= :to', { from, to });
    }

    if (query.search) {
      qb.andWhere('(order.code ILIKE :search OR store.name ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('order.createdAt', 'DESC').skip(skip).take(limit);

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

    if (order.arrivingNotifiedAt) {
      throw new BadRequestException('Đơn hàng này đã được báo "đang tới" trước đó.');
    }

    const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });
    const now = new Date();
    if (offer && (now < new Date(offer.pickupStart) || now > new Date(offer.pickupEnd))) {
      throw new BadRequestException('Chỉ có thể báo "đang tới" trong khung giờ nhận hàng.');
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

    qb.orderBy('order.createdAt', 'DESC').skip(skip).take(limit);

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
    actorId = '00000000-0000-0000-0000-000000000000',
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
        await this.releasePromotion(manager, order);
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

  /**
   * Sinh mã nhận hộ 8 ký tự ngẫu nhiên gồm chữ in hoa và số, loại bỏ ký tự dễ nhầm lẫn (R1-052)
   */
  private generateProxyPickupCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Tạo mã nhận hộ 8 ký tự cho người thân nhận thay (R1-052)
   * Chỉ áp dụng cho đơn đã thanh toán. Mã hết hạn theo khung nhận. Thu hồi mã cũ nếu có.
   */
  async createProxyPickupCode(customerId: string, orderId: string): Promise<ProxyPickupCodeEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Chỉ có thể tạo mã nhận hộ đối với đơn hàng đã thanh toán (hiện tại: ${order.status}) (R1-052).`,
      );
    }

    const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });

    // Thu hồi mọi mã nhận hộ chưa dùng trước đó của đơn hàng (R1-052 rule 1)
    await this.proxyCodeRepo.update(
      { orderId: order.id, status: ProxyPickupCodeStatus.UNUSED },
      { status: ProxyPickupCodeStatus.REVOKED },
    );

    const code = this.generateProxyPickupCode();
    const expiresAt = offer
      ? new Date(offer.pickupEnd)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const proxyCode = this.proxyCodeRepo.create({
      orderId: order.id,
      code,
      status: ProxyPickupCodeStatus.UNUSED,
      expiresAt,
    });

    const saved = await this.proxyCodeRepo.save(proxyCode);

    await this.auditLogService.log({
      storeId: order.storeId,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: 'PROXY_PICKUP_CODE_CREATED',
      targetType: 'ORDER',
      targetId: order.id,
      newValue: { code: saved.code, expiresAt: saved.expiresAt },
    });

    return saved;
  }

  /**
   * Lấy mã nhận hộ đang có hiệu lực của đơn hàng (R1-052)
   */
  async getProxyPickupCode(
    customerId: string,
    orderId: string,
  ): Promise<ProxyPickupCodeEntity | null> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    return this.proxyCodeRepo.findOne({
      where: { orderId: order.id, status: ProxyPickupCodeStatus.UNUSED },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Thu hồi mã nhận hộ khi chưa sử dụng (R1-052)
   */
  async revokeProxyPickupCode(
    customerId: string,
    orderId: string,
  ): Promise<{ success: boolean; message: string }> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    const proxyCode = await this.proxyCodeRepo.findOne({
      where: { orderId: order.id, status: ProxyPickupCodeStatus.UNUSED },
    });

    if (!proxyCode) {
      throw new BadRequestException('Không tìm thấy mã nhận hộ hợp lệ để thu hồi.');
    }

    proxyCode.status = ProxyPickupCodeStatus.REVOKED;
    await this.proxyCodeRepo.save(proxyCode);

    await this.auditLogService.log({
      storeId: order.storeId,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: 'PROXY_PICKUP_CODE_REVOKED',
      targetType: 'ORDER',
      targetId: order.id,
      newValue: { code: proxyCode.code, status: ProxyPickupCodeStatus.REVOKED },
    });

    return { success: true, message: 'Đã thu hồi mã nhận hộ thành công.' };
  }

  /**
   * Cập nhật mốc giờ hẹn nhận 15 phút trong khung nhận (R1-049)
   * Sửa được đến 30 phút trước mốc đã chọn.
   */
  async updatePickupSlot(
    customerId: string,
    orderId: string,
    pickupSlotStr: string,
  ): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Không thể thay đổi giờ hẹn cho đơn hàng ở trạng thái [${order.status}].`,
      );
    }

    const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });
    if (!offer) {
      throw new NotFoundException('Không tìm thấy thông tin suất bán của đơn hàng.');
    }

    const slotDate = new Date(pickupSlotStr);
    const pickupStart = new Date(offer.pickupStart);
    const pickupEnd = new Date(offer.pickupEnd);

    if (slotDate < pickupStart || slotDate > pickupEnd) {
      throw new BadRequestException(
        `Giờ hẹn nhận (${slotDate.toLocaleTimeString('vi-VN')}) phải nằm trong khung giờ nhận của quán (${pickupStart.toLocaleTimeString('vi-VN')} - ${pickupEnd.toLocaleTimeString('vi-VN')}) (R1-049).`,
      );
    }

    if (order.pickupSlot) {
      const currentSlot = new Date(order.pickupSlot);
      const cutoff = new Date(currentSlot.getTime() - 30 * 60 * 1000);
      if (new Date() > cutoff) {
        throw new BadRequestException(
          'Chỉ được phép sửa giờ hẹn nhận trước mốc giờ hẹn đã chọn ít nhất 30 phút (R1-049).',
        );
      }
    }

    order.pickupSlot = slotDate;
    const saved = await this.orderRepo.save(order);

    await this.auditLogService.log({
      storeId: order.storeId,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: 'ORDER_PICKUP_SLOT_UPDATED',
      targetType: 'ORDER',
      targetId: order.id,
      newValue: { pickupSlot: order.pickupSlot },
    });

    return saved;
  }

  /**
   * Xem và lấy biên nhận của đơn hàng đã thanh toán (R1-054)
   */
  async getOrderReceipt(customerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException(
        `Biên nhận chỉ khả dụng đối với đơn hàng đã thanh toán thành công (R1-054). Trạng thái hiện tại: [${order.status}].`,
      );
    }

    const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });
    const item = offer ? await this.itemRepo.findOne({ where: { id: offer.itemId } }) : null;
    const store = await this.storeRepo.findOne({ where: { id: order.storeId } });
    const paymentTx = await this.paymentTxRepo.findOne({
      where: { orderId: order.id, status: PaymentStatus.SUCCEEDED },
      order: { createdAt: 'DESC' },
    });

    return {
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      itemName: item?.name || 'Suất cứu món',
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      paidAt: paymentTx?.createdAt || order.updatedAt,
      transactionCode: paymentTx?.gatewayTxnId || null,
      storeName: store?.name || 'Cửa hàng đối tác',
      storeAddress: store?.address || '',
      createdAt: order.createdAt,
    };
  }

  /**
   * Đặt lại nhanh từ lịch sử đơn hàng cũ (R1-051)
   */
  async reorderShortcut(customerId: string, oldOrderId: string) {
    const oldOrder = await this.orderRepo.findOne({
      where: { id: oldOrderId, customerId },
    });
    if (!oldOrder) {
      throw new NotFoundException('Đơn hàng cũ không tồn tại hoặc không thuộc về bạn (R1-051).');
    }

    const oldOffer = await this.offerRepo.findOne({
      where: { id: oldOrder.offerId },
    });
    if (!oldOffer) {
      throw new NotFoundException('Không tìm thấy thông tin suất bán gốc của đơn hàng cũ.');
    }

    const currentOffer = await this.offerRepo.findOne({
      where: {
        itemId: oldOffer.itemId,
        status: OfferStatus.OPEN,
      },
    });

    if (!currentOffer || currentOffer.remainingQuantity <= 0) {
      throw new BadRequestException(
        'Món này hiện chưa có suất bán mở hoặc đã hết suất trong ngày hôm nay (R1-051).',
      );
    }

    return {
      message: 'Đã tìm thấy suất bán khả dụng hôm nay cho món cũ (R1-051).',
      offerId: currentOffer.id,
      storeId: currentOffer.storeId,
      currentPrice: currentOffer.currentPrice,
      originalPrice: currentOffer.originalPrice,
      remainingQuantity: currentOffer.remainingQuantity,
      pickupStart: currentOffer.pickupStart,
      pickupEnd: currentOffer.pickupEnd,
    };
  }

  /**
   * Đính kèm biên lai chuyển khoản khi đối soát tự động chưa nhận được webhook (KX02)
   */
  async attachPaymentProof(
    customerId: string,
    orderId: string,
    proofUrl: string,
  ): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT && order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Chỉ có thể đính kèm biên lai thanh toán cho đơn hàng đang chờ hoặc đã thanh toán. Trạng thái hiện tại: [${order.status}].`,
      );
    }

    order.paymentProofUrl = proofUrl;
    order.paymentProofUploadedAt = new Date();

    const saved = await this.orderRepo.save(order);

    await this.auditLogService.log({
      storeId: order.storeId,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: 'PAYMENT_PROOF_ATTACHED',
      targetType: 'ORDER',
      targetId: order.id,
      newValue: {
        paymentProofUrl: proofUrl,
        paymentProofUploadedAt: order.paymentProofUploadedAt,
      },
    });

    return saved;
  }
}
