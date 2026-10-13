import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, MoreThanOrEqual } from 'typeorm';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OfferEventEntity, OfferEventType } from '../../entities/catalog/offer-event.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { JOBS_CONSTANTS } from './jobs.constants';

export interface JobsExecutionSummary {
  timestamp: Date;
  holdsReleased: {
    count: number;
    orderIds: string[];
  };
  pickupsExpired: {
    count: number;
    lockedCustomersCount: number;
    orderIds: string[];
  };
  offersClosed: {
    count: number;
    offerIds: string[];
  };
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(OfferEventEntity)
    private readonly offerEventRepo: Repository<OfferEventEntity>,
    @InjectRepository(NoshowRecordEntity)
    private readonly noshowRecordRepo: Repository<NoshowRecordEntity>,
    @InjectRepository(OrderLockEntity)
    private readonly orderLockRepo: Repository<OrderLockEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tác vụ định kỳ 1 phút: Nhả suất đơn PENDING_PAYMENT hết hạn giữ 10 phút và trả tồn kho (R1-042, BR-017)
   */
  async releaseExpiredHolds(now: Date = new Date()) {
    const expiredOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
      },
    });

    const candidates = expiredOrders.filter((o) => new Date(o.holdExpiresAt) <= now);
    const releasedOrderIds: string[] = [];

    for (const order of candidates) {
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
        lockedOrder.cancelledAt = now;
        await manager.save(lockedOrder);

        const offer = await manager
          .createQueryBuilder(OfferEntity, 'offer')
          .setLock('pessimistic_write')
          .where('offer.id = :id', { id: lockedOrder.offerId })
          .getOne();

        if (offer) {
          offer.remainingQuantity += lockedOrder.quantity;
          if (offer.status === OfferStatus.SOLD_OUT && new Date(offer.pickupEnd) > now) {
            offer.status = OfferStatus.OPEN;
          }
          await manager.save(offer);
        }

        await this.auditLogService.log({
          storeId: lockedOrder.storeId,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          action: 'ORDER_HOLD_RELEASED',
          targetType: 'ORDER',
          targetId: lockedOrder.id,
          newValue: {
            status: OrderStatus.HOLD_EXPIRED,
            returnedQuantity: lockedOrder.quantity,
          },
        });

        releasedOrderIds.push(lockedOrder.id);
      });
    }

    if (releasedOrderIds.length > 0) {
      this.logger.log(`[RELEASE_HOLDS] Đã nhả ${releasedOrderIds.length} đơn giữ quá 10 phút.`);
    }

    return {
      count: releasedOrderIds.length,
      orderIds: releasedOrderIds,
    };
  }

  /**
   * Tác vụ định kỳ 1 phút: Đơn PAID quá khung nhận + 15 phút trễ -> PICKUP_EXPIRED + Noshow (R1-059, BR-020, BR-024)
   */
  async expireUnclaimedPickups(now: Date = new Date()) {
    const paidOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.PAID,
      },
    });

    const expiredOrderIds: string[] = [];
    let lockedCustomersCount = 0;

    for (const order of paidOrders) {
      const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });

      let pickupDeadline: Date;
      if (offer && offer.pickupEnd) {
        pickupDeadline = new Date(offer.pickupEnd);
      } else if (order.pickupSlot) {
        pickupDeadline = new Date(order.pickupSlot);
      } else {
        pickupDeadline = new Date(
          new Date(order.paidAt || order.createdAt).getTime() + 2 * 60 * 60 * 1000,
        );
      }

      // Thời điểm hết hạn nhận hàng = deadline + 15 phút trễ (BR-020, BR-024)
      const graceExpiration = new Date(
        pickupDeadline.getTime() + JOBS_CONSTANTS.PICKUP_GRACE_MINUTES * 60 * 1000,
      );

      if (now > graceExpiration) {
        await this.dataSource.transaction(async (manager) => {
          const lockedOrder = await manager
            .createQueryBuilder(OrderEntity, 'order')
            .setLock('pessimistic_write')
            .where('order.id = :id AND order.status = :status', {
              id: order.id,
              status: OrderStatus.PAID,
            })
            .getOne();

          if (!lockedOrder) return;

          lockedOrder.status = OrderStatus.PICKUP_EXPIRED;
          await manager.save(lockedOrder);

          // 1. Ghi nhận 1 bản ghi noshow
          const noshow = manager.create(NoshowRecordEntity, {
            customerId: lockedOrder.customerId,
            orderId: lockedOrder.id,
            occurredAt: now,
            excluded: false,
          });
          await manager.save(noshow);

          // 2. Đếm số lần noshow cuốn chiếu trong 30 ngày (BR-020)
          const thirtyDaysAgo = new Date(
            now.getTime() - JOBS_CONSTANTS.NOSHOW_WINDOW_DAYS * 24 * 60 * 60 * 1000,
          );

          const recentNoshowCount = await manager.count(NoshowRecordEntity, {
            where: {
              customerId: lockedOrder.customerId,
              excluded: false,
              occurredAt: MoreThanOrEqual(thirtyDaysAgo),
            },
          });

          // 3. Nếu đủ 3 lần noshow -> Khóa đặt hàng 7 ngày (BR-020)
          if (recentNoshowCount >= JOBS_CONSTANTS.NOSHOW_THRESHOLD) {
            const lockUntil = new Date(
              now.getTime() + JOBS_CONSTANTS.NOSHOW_LOCK_DAYS * 24 * 60 * 60 * 1000,
            );

            let orderLock = await manager.findOne(OrderLockEntity, {
              where: { customerId: lockedOrder.customerId },
            });

            if (!orderLock) {
              orderLock = manager.create(OrderLockEntity, {
                customerId: lockedOrder.customerId,
                lockedUntil: lockUntil,
              });
            } else {
              orderLock.lockedUntil = lockUntil;
            }

            await manager.save(orderLock);
            lockedCustomersCount += 1;

            await this.auditLogService.log({
              storeId: lockedOrder.storeId,
              actorId: 'SYSTEM',
              actorRole: 'SYSTEM',
              action: 'CUSTOMER_ORDER_LOCKED_NOSHOW',
              targetType: 'CUSTOMER',
              targetId: lockedOrder.customerId,
              newValue: {
                lockedUntil: lockUntil,
                recentNoshowCount,
              },
            });
          }

          await this.auditLogService.log({
            storeId: lockedOrder.storeId,
            actorId: 'SYSTEM',
            actorRole: 'SYSTEM',
            action: 'ORDER_PICKUP_EXPIRED',
            targetType: 'ORDER',
            targetId: lockedOrder.id,
            newValue: {
              status: OrderStatus.PICKUP_EXPIRED,
              noshowRecorded: true,
            },
          });

          expiredOrderIds.push(lockedOrder.id);
        });
      }
    }

    if (expiredOrderIds.length > 0) {
      this.logger.log(
        `[PICKUP_EXPIRED] Đã chuyển ${expiredOrderIds.length} đơn sang PICKUP_EXPIRED. Số khách bị phạt khóa: ${lockedCustomersCount}.`,
      );
    }

    return {
      count: expiredOrderIds.length,
      lockedCustomersCount,
      orderIds: expiredOrderIds,
    };
  }

  /**
   * Tác vụ định kỳ 1 phút: Tự động đóng suất bán hết khung nhận và chốt hao hụt (R2-034, BR-058)
   */
  async autoCloseExpiredOffers(now: Date = new Date()) {
    const expiredOffers = await this.offerRepo.find({
      where: {
        status: In([OfferStatus.OPEN, OfferStatus.SOLD_OUT]),
      },
    });

    const candidates = expiredOffers.filter((offer) => new Date(offer.pickupEnd) <= now);
    const closedOfferIds: string[] = [];

    for (const offer of candidates) {
      await this.dataSource.transaction(async (manager) => {
        const lockedOffer = await manager
          .createQueryBuilder(OfferEntity, 'offer')
          .setLock('pessimistic_write')
          .where('offer.id = :id AND offer.status IN (:...statuses)', {
            id: offer.id,
            statuses: [OfferStatus.OPEN, OfferStatus.SOLD_OUT],
          })
          .getOne();

        if (!lockedOffer) return;

        lockedOffer.status = OfferStatus.CLOSED;
        await manager.save(lockedOffer);

        // Ghi sự kiện chốt hao hụt (wasteQuantity = tồn còn lại) (R2-034, BR-058)
        const event = manager.create(OfferEventEntity, {
          offerId: lockedOffer.id,
          actorId: null,
          type: OfferEventType.AUTO_CLOSED,
          reason: 'Hết khung giờ nhận hàng (R2-034)',
          payload: {
            closedAt: now.toISOString(),
            wasteQuantity: lockedOffer.remainingQuantity,
          },
        });
        await manager.save(event);

        await this.auditLogService.log({
          storeId: lockedOffer.storeId,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          action: 'OFFER_AUTO_CLOSED',
          targetType: 'OFFER',
          targetId: lockedOffer.id,
          newValue: {
            status: OfferStatus.CLOSED,
            wasteQuantity: lockedOffer.remainingQuantity,
          },
        });

        closedOfferIds.push(lockedOffer.id);
      });
    }

    if (closedOfferIds.length > 0) {
      this.logger.log(`[AUTO_CLOSE_OFFERS] Đã tự động đóng ${closedOfferIds.length} suất hết giờ.`);
    }

    return {
      count: closedOfferIds.length,
      offerIds: closedOfferIds,
    };
  }

  /**
   * Điều phối chạy tất cả các tác vụ nền
   */
  async processAllBackgroundJobs(now: Date = new Date()): Promise<JobsExecutionSummary> {
    const holds = await this.releaseExpiredHolds(now);
    const pickups = await this.expireUnclaimedPickups(now);
    const offers = await this.autoCloseExpiredOffers(now);

    return {
      timestamp: now,
      holdsReleased: holds,
      pickupsExpired: pickups,
      offersClosed: offers,
    };
  }
}
