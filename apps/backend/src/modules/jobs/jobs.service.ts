import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual, LessThanOrEqual, Between } from 'typeorm';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OfferEventEntity, OfferEventType } from '../../entities/catalog/offer-event.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import {
  PaymentTransactionEntity,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../entities/orders/payment-transaction.entity';
import {
  WeeklyStatementEntity,
  StatementStatus,
} from '../../entities/reconciliation/weekly-statement.entity';
import { StatementLineEntity } from '../../entities/reconciliation/statement-line.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { StoreSettingsEntity, PricingMode } from '../../entities/stores/store-settings.entity';
import {
  StoreMemberEntity,
  StoreMemberStatus,
  StorePermission,
} from '../../entities/stores/store-member.entity';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import {
  ForecastEntity,
  ForecastConfidence,
  ForecastMethod,
} from '../../entities/reconciliation/forecast.entity';
import {
  PriceProposalEntity,
  ProposalStatus,
} from '../../entities/reconciliation/price-proposal.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import { UserEntity, UserStatus } from '../../entities/auth/user.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { SavedPlaceEntity } from '../../entities/auth/saved-place.entity';
import { FcmTokenEntity } from '../../entities/auth/fcm-token.entity';
import { AiLogEntity } from '../../entities/ai/ai-log.entity';
import { ViewHistoryEntity } from '../../entities/auth/view-history.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { SettingsService } from '../settings/settings.service';
import { JOBS_CONSTANTS } from './jobs.constants';
import {
  ReconciliationEngine,
  ForecastingEngine,
  DynamicPricingEngine,
  DailySalesRecord,
} from '@surplusiq/core';

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
  complaintsAutoAccepted?: {
    count: number;
    complaintIds: string[];
  };
  weeklyStatementsClosed?: {
    count: number;
    storeIds: string[];
  };
  subscriptionsProcessed?: {
    count: number;
    storeIds: string[];
  };
  paymentsRechecked?: {
    count: number;
    failedTxnIds: string[];
  };
  forecastsGenerated?: {
    count: number;
    forecastIds: string[];
  };
  pricingProposalsProcessed?: {
    count: number;
    proposalIds: string[];
    autoAppliedCount: number;
  };
  remindersSent?: {
    count: number;
    orderIds: string[];
  };
  retentionCleaned?: {
    aiLogsDeleted: number;
    viewHistoryDeleted: number;
  };
  accountsAnonymized?: {
    count: number;
    userIds: string[];
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
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly paymentRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(WeeklyStatementEntity)
    private readonly statementRepo: Repository<WeeklyStatementEntity>,
    @InjectRepository(StatementLineEntity)
    private readonly statementLineRepo: Repository<StatementLineEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(StoreSettingsEntity)
    private readonly storeSettingsRepo: Repository<StoreSettingsEntity>,
    @InjectRepository(StoreMemberEntity)
    private readonly storeMemberRepo: Repository<StoreMemberEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepo: Repository<SubscriptionEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(ForecastEntity)
    private readonly forecastRepo: Repository<ForecastEntity>,
    @InjectRepository(PriceProposalEntity)
    private readonly proposalRepo: Repository<PriceProposalEntity>,
    @InjectRepository(DailyActualEntity)
    private readonly dailyActualRepo: Repository<DailyActualEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(DietaryProfileEntity)
    private readonly dietaryProfileRepo: Repository<DietaryProfileEntity>,
    @InjectRepository(SavedPlaceEntity)
    private readonly savedPlaceRepo: Repository<SavedPlaceEntity>,
    @InjectRepository(FcmTokenEntity)
    private readonly fcmTokenRepo: Repository<FcmTokenEntity>,
    @InjectRepository(AiLogEntity)
    private readonly aiLogRepo: Repository<AiLogEntity>,
    @InjectRepository(ViewHistoryEntity)
    private readonly viewHistoryRepo: Repository<ViewHistoryEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Tác vụ 1 (1 phút): Nhả suất đơn PENDING_PAYMENT hết hạn giữ 10 phút và trả tồn kho (R1-042, BR-017)
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
   * Tác vụ 2 (1 phút): Đơn PAID quá khung nhận + 15 phút trễ -> PICKUP_EXPIRED + Noshow (R1-059, BR-020, BR-024)
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

          const noshow = manager.create(NoshowRecordEntity, {
            customerId: lockedOrder.customerId,
            orderId: lockedOrder.id,
            occurredAt: now,
            excluded: false,
          });
          await manager.save(noshow);

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
            lockedCustomersCount++;

            this.logger.warn(
              `[NOSHOW_LOCK] Khách hàng [${lockedOrder.customerId}] bị khóa đặt hàng 7 ngày do ${recentNoshowCount} lần noshow trong 30 ngày (BR-020).`,
            );
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
        `[PICKUP_EXPIRED] Đã đánh dấu ${expiredOrderIds.length} đơn quá hạn nhận hàng (${lockedCustomersCount} khách bị khóa).`,
      );
    }

    return {
      count: expiredOrderIds.length,
      lockedCustomersCount,
      orderIds: expiredOrderIds,
    };
  }

  /**
   * Tác vụ 3 (1 phút): Suất bán quá pickup_end -> CLOSED, ghi nhận hao hụt thực tế (R2-034, BR-058)
   */
  async autoCloseExpiredOffers(now: Date = new Date()) {
    const openOffers = await this.offerRepo.find({
      where: [{ status: OfferStatus.OPEN }, { status: OfferStatus.SOLD_OUT }],
    });

    const candidates = openOffers.filter((o) => new Date(o.pickupEnd) <= now);
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
   * Tác vụ 4 (5 phút): Khiếu nại quá hạn phản hồi 48h tự động chấp nhận và hoàn tiền 100% (BR-071, R2-060)
   */
  async autoAcceptExpiredComplaints(now: Date = new Date()) {
    const pendingComplaints = await this.complaintRepo.find({
      where: {
        status: ComplaintStatus.PENDING_STORE,
      },
    });

    const candidates = pendingComplaints.filter((c) => new Date(c.responseDueAt) <= now);
    const acceptedIds: string[] = [];

    for (const complaint of candidates) {
      await this.dataSource.transaction(async (manager) => {
        const lockedComplaint = await manager
          .createQueryBuilder(ComplaintEntity, 'complaint')
          .setLock('pessimistic_write')
          .where('complaint.id = :id AND complaint.status = :status', {
            id: complaint.id,
            status: ComplaintStatus.PENDING_STORE,
          })
          .getOne();

        if (!lockedComplaint) return;

        const order = await manager.findOne(OrderEntity, {
          where: { id: lockedComplaint.orderId },
        });
        const refundAmount = order ? order.totalAmount : lockedComplaint.refundAmount;

        lockedComplaint.status = ComplaintStatus.ACCEPTED;
        lockedComplaint.autoAccepted = true;
        lockedComplaint.refundAmount = refundAmount;
        await manager.save(lockedComplaint);

        if (order) {
          order.status = OrderStatus.REFUNDED;
          await manager.save(order);

          const refundTxn = manager.create(PaymentTransactionEntity, {
            orderId: order.id,
            storeId: order.storeId,
            kind: PaymentKind.ORDER_REFUND,
            amount: refundAmount,
            method: PaymentMethod.VIETQR,
            gatewayTxnId: `refund_auto_${lockedComplaint.id}_${Date.now()}`,
            status: PaymentStatus.SUCCEEDED,
          });
          await manager.save(refundTxn);
        }

        await this.auditLogService.log({
          storeId: lockedComplaint.storeId,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          action: 'COMPLAINT_AUTO_ACCEPTED',
          targetType: 'COMPLAINT',
          targetId: lockedComplaint.id,
          newValue: {
            status: ComplaintStatus.ACCEPTED,
            autoAccepted: true,
            refundAmount,
          },
        });

        acceptedIds.push(lockedComplaint.id);
      });
    }

    if (acceptedIds.length > 0) {
      this.logger.log(
        `[COMPLAINTS_AUTO_ACCEPT] Đã tự động chấp thuận ${acceptedIds.length} khiếu nại quá hạn 48h.`,
      );
    }

    return {
      count: acceptedIds.length,
      complaintIds: acceptedIds,
    };
  }

  /**
   * Tác vụ 5 (Thứ Hai 00:05): Chốt sao kê đối soát tuần và khóa bất biến (R2-066, BR-075)
   */
  async closeWeeklyStatements(now: Date = new Date()) {
    // Lấy kỳ tuần trước (ISO week)
    const lastWeekTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const period = ReconciliationEngine.getIsoWeekPeriod(lastWeekTime);
    const startStr =
      period.startDate instanceof Date
        ? period.startDate.toISOString().split('T')[0]
        : String(period.startDate);
    const endStr =
      period.endDate instanceof Date
        ? period.endDate.toISOString().split('T')[0]
        : String(period.endDate);

    const stores = await this.storeRepo.find();
    const closedStoreIds: string[] = [];

    for (const store of stores) {
      const existing = await this.statementRepo.findOne({
        where: { storeId: store.id, weekStart: startStr },
      });
      if (existing) continue;

      const weekOrders = await this.orderRepo.find({
        where: {
          storeId: store.id,
          createdAt: Between(new Date(startStr), new Date(endStr)),
        },
      });

      const complaints = await this.complaintRepo.find({
        where: {
          storeId: store.id,
          status: ComplaintStatus.ACCEPTED,
          createdAt: Between(new Date(startStr), new Date(endStr)),
        },
      });

      const refundDeductions = complaints.reduce((sum, c) => sum + (c.refundAmount || 0), 0);

      const coreOrders = weekOrders.map((o) => ({
        orderId: o.id,
        amount: o.totalAmount,
        status: o.status as any,
        completedAt: o.updatedAt || new Date(),
        storeFault: false,
      }));

      const statementData = ReconciliationEngine.calculate({
        storeId: store.id,
        period,
        orders: coreOrders,
        refundsDeduction: refundDeductions,
        subscriptionFee: 0,
        adjustments: [],
      });

      const statement = this.statementRepo.create({
        storeId: store.id,
        weekStart: startStr,
        weekEnd: endStr,
        gross: statementData.grossSales,
        commission: statementData.commissionAmount,
        refunds: statementData.refundsDeduction,
        subscriptionFee: statementData.subscriptionFee,
        adjustments: 0,
        netPayable: statementData.netPayout,
        status: StatementStatus.LOCKED,
        checksum: statementData.checksum,
        flags: { autoGenerated: true, checksumValid: true },
      });

      const saved = await this.statementRepo.save(statement);

      for (const o of weekOrders) {
        const line = this.statementLineRepo.create({
          statementId: saved.id,
          orderId: o.id,
          type: 'ORDER',
          amount: o.totalAmount,
          commission: Math.round(o.totalAmount * 0.1),
        });
        await this.statementLineRepo.save(line);
      }

      closedStoreIds.push(store.id);
    }

    if (closedStoreIds.length > 0) {
      this.logger.log(
        `[STATEMENTS_CLOSE_WEEK] Đã chốt và khóa sao kê tuần [${period.startDate} - ${period.endDate}] cho ${closedStoreIds.length} cửa hàng.`,
      );
    }

    return {
      count: closedStoreIds.length,
      storeIds: closedStoreIds,
    };
  }

  /**
   * Tác vụ 6 (00:00 hằng ngày): Vòng đời gói dịch vụ (VC-03, VC-06, VC-11)
   */
  async processSubscriptionLifecycles(now: Date = new Date()) {
    const expiredSubs = await this.subscriptionRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const candidates = expiredSubs.filter(
      (s) => s.periodEnd && new Date(s.periodEnd) <= now && s.plan !== SubscriptionPlan.BASIC,
    );

    const processedStoreIds: string[] = [];

    for (const candidate of candidates) {
      const processed = await this.dataSource.transaction(async (manager) => {
        // Use the same lock as interactive ADMIN/STORE subscription mutations,
        // then re-read: the candidate may have been renewed since the scan.
        const store = await manager.findOne(StoreEntity, {
          where: { id: candidate.storeId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!store) return;
        const sub = await manager.findOne(SubscriptionEntity, {
          where: { storeId: candidate.storeId },
        });
        if (
          !sub ||
          sub.status !== SubscriptionStatus.ACTIVE ||
          sub.plan === SubscriptionPlan.BASIC ||
          !sub.periodEnd ||
          new Date(sub.periodEnd) > now
        )
          return;
        sub.plan = SubscriptionPlan.BASIC;
        sub.status = SubscriptionStatus.ACTIVE;
        sub.downgradeAtPeriodEnd = false;
        await manager.save(sub);

        // 1. Tắt AUTO dynamic pricing (chuyển về MANUAL)
        const settings = await manager.findOne(StoreSettingsEntity, {
          where: { storeId: sub.storeId },
        });
        if (settings) {
          settings.pricingMode = PricingMode.MANUAL;
          await manager.save(settings);
        }

        // 2. Hủy các đề xuất giá đang chờ duyệt
        await manager.update(
          PriceProposalEntity,
          { decidedBy: sub.storeId, status: ProposalStatus.PENDING },
          { status: ProposalStatus.EXPIRED },
        );

        // 3. Khóa nhân viên vượt hạn mức (chỉ giữ lại 1 nhân viên kích hoạt đầu tiên)
        const staffList = await manager.find(StoreMemberEntity, {
          where: {
            storeId: sub.storeId,
            status: StoreMemberStatus.ACTIVE,
          },
          order: { createdAt: 'ASC' },
        });

        // Giữ OWNER và nhân viên đầu tiên
        let activeStaffKept = 0;
        for (const member of staffList) {
          if (member.permission === StorePermission.OWNER) continue;
          if (activeStaffKept < 1) {
            activeStaffKept++;
          } else {
            member.status = StoreMemberStatus.LOCKED;
            await manager.save(member);
          }
        }

        await this.auditLogService.log({
          storeId: sub.storeId,
          actorId: 'SYSTEM',
          actorRole: 'SYSTEM',
          action: 'SUBSCRIPTION_DOWNGRADED_AUTO',
          targetType: 'SUBSCRIPTION',
          targetId: sub.storeId,
          newValue: {
            plan: SubscriptionPlan.BASIC,
            pricingMode: PricingMode.MANUAL,
          },
        });

        return true;
      });
      if (processed) {
        await this.settingsService.invalidateStoreSettingsCache(candidate.storeId);
        processedStoreIds.push(candidate.storeId);
      }
    }

    if (processedStoreIds.length > 0) {
      this.logger.log(
        `[SUBSCRIPTION_LIFECYCLE] Đã tự động hạ gói về Basic cho ${processedStoreIds.length} cửa hàng hết hạn.`,
      );
    }

    return {
      count: processedStoreIds.length,
      storeIds: processedStoreIds,
    };
  }

  /**
   * Tác vụ 7 (15 phút): Kiểm tra lại giao dịch treo & xử lý hoàn tiền trễ (VC-07, R1-047)
   */
  async recheckPendingPayments(now: Date = new Date()) {
    const pendingTxns = await this.paymentRepo.find({
      where: {
        status: PaymentStatus.PENDING_CONFIRM,
      },
    });

    const failedTxnIds: string[] = [];
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const txn of pendingTxns) {
      if (new Date(txn.createdAt) <= oneDayAgo) {
        txn.status = PaymentStatus.FAILED;
        await this.paymentRepo.save(txn);
        failedTxnIds.push(txn.id);

        if (txn.orderId) {
          const order = await this.orderRepo.findOne({ where: { id: txn.orderId } });
          if (order && order.status === OrderStatus.HOLD_EXPIRED) {
            // Tiền đến muộn -> Tạo lệnh hoàn 100% tự động (R1-047)
            const refundTxn = this.paymentRepo.create({
              orderId: order.id,
              storeId: order.storeId,
              kind: PaymentKind.ORDER_REFUND,
              amount: txn.amount,
              method: PaymentMethod.VIETQR,
              gatewayTxnId: `refund_late_${order.id}_${Date.now()}`,
              status: PaymentStatus.SUCCEEDED,
            });
            await this.paymentRepo.save(refundTxn);
          }
        }
      }
    }

    return {
      count: failedTxnIds.length,
      failedTxnIds,
    };
  }

  /**
   * Tác vụ 8 (22:00 hằng ngày): Chạy dự báo tự động cho các cửa hàng Pro (R2-036..R2-043, BR-060)
   */
  async generateDailyForecasts(now: Date = new Date()) {
    const targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const targetDayOfWeek = new Date(now.getTime() + 24 * 60 * 60 * 1000).getDay();

    const proSubs = await this.subscriptionRepo.find({
      where: [
        { plan: SubscriptionPlan.PRO, status: SubscriptionStatus.ACTIVE },
        { plan: SubscriptionPlan.TRIAL, status: SubscriptionStatus.ACTIVE },
      ],
    });

    const generatedIds: string[] = [];

    for (const sub of proSubs) {
      const items = await this.itemRepo.find({ where: { storeId: sub.storeId } });

      for (const item of items) {
        const actuals = await this.dailyActualRepo.find({
          where: { storeId: sub.storeId, itemId: item.id },
          order: { date: 'ASC' },
        });

        const history: DailySalesRecord[] = actuals.map((a) => ({
          date: a.date,
          dayOfWeek: new Date(a.date).getDay(),
          produced: a.produced,
          soldApp: a.soldApp,
          soldOffline: a.soldOffline,
          stockoutEarly: a.stockoutAt ? true : false,
        }));

        const result = ForecastingEngine.generateForecast({
          itemId: item.id,
          targetDate,
          targetDayOfWeek,
          history,
        });

        const forecast = this.forecastRepo.create({
          storeId: sub.storeId,
          itemId: item.id,
          targetDate,
          recommended: result.recommended,
          low: result.low,
          high: result.high,
          confidence: result.confidence as ForecastConfidence,
          method:
            result.method === 'DOW_AVERAGE'
              ? ForecastMethod.DOW_AVG
              : ForecastMethod.YESTERDAY_FALLBACK,
          components: {
            reason: result.explanation,
          },
        });

        const saved = await this.forecastRepo.save(forecast);
        generatedIds.push(saved.id);
      }
    }

    if (generatedIds.length > 0) {
      this.logger.log(
        `[FORECAST_DAILY] Đã tạo ${generatedIds.length} bản ghi dự báo ngày mai (${targetDate}).`,
      );
    }

    return {
      count: generatedIds.length,
      forecastIds: generatedIds,
    };
  }

  /**
   * Tác vụ 9 (15 phút): Sinh đề xuất giá động và tự động áp dụng nếu store bật AUTO (R2-044..048, BR-064/065)
   */
  async generateHourlyPriceProposals(now: Date = new Date()) {
    const openOffers = await this.offerRepo.find({
      where: {
        status: OfferStatus.OPEN,
      },
    });

    const candidates = openOffers.filter((o) => new Date(o.pickupEnd) > now);
    const proposalIds: string[] = [];
    let autoAppliedCount = 0;

    for (const offer of candidates) {
      const settings = await this.storeSettingsRepo.findOne({ where: { storeId: offer.storeId } });
      const floorRatio = settings?.floorRatio || 0.4;
      const isAuto = settings?.pricingMode === PricingMode.AUTO;

      const dynamicResult = DynamicPricingEngine.proposeDynamicPrice({
        offerId: offer.id,
        originalPrice: offer.originalPrice,
        currentPrice: offer.currentPrice,
        floorPrice: offer.floorPrice || Math.round(offer.originalPrice * floorRatio),
        floorRatio,
        initialQuantity: offer.totalQuantity,
        remainingQuantity: offer.remainingQuantity,
        pickupStart: new Date(offer.pickupStart),
        pickupEnd: new Date(offer.pickupEnd),
        now,
        priceChangeCount: offer.priceChangeCount,
      });

      if (dynamicResult.canPropose && dynamicResult.proposedPrice < offer.currentPrice) {
        const oldPrice = offer.currentPrice;
        if (isAuto && offer.priceChangeCount < 3) {
          // Áp dụng tự động ngay
          offer.currentPrice = dynamicResult.proposedPrice;
          offer.priceChangeCount += 1;
          await this.offerRepo.save(offer);
          autoAppliedCount++;

          const proposal = this.proposalRepo.create({
            offerId: offer.id,
            oldPrice,
            proposedPrice: dynamicResult.proposedPrice,
            components: { autoApplied: true, reason: dynamicResult.explanation },
            status: ProposalStatus.AUTO_APPLIED,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
            decidedAt: now,
          });
          const saved = await this.proposalRepo.save(proposal);
          proposalIds.push(saved.id);
        } else {
          // Tạo đề xuất chờ duyệt
          const proposal = this.proposalRepo.create({
            offerId: offer.id,
            oldPrice,
            proposedPrice: dynamicResult.proposedPrice,
            components: { autoApplied: false, reason: dynamicResult.explanation },
            status: ProposalStatus.PENDING,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          });
          const saved = await this.proposalRepo.save(proposal);
          proposalIds.push(saved.id);
        }
      }
    }

    return {
      count: proposalIds.length,
      proposalIds,
      autoAppliedCount,
    };
  }

  /**
   * Tác vụ 10 (1 phút): Gửi nhắc nhở lấy hàng trước 30 phút (R1-075)
   */
  async sendPickupReminders(now: Date = new Date()) {
    const paidOrders = await this.orderRepo.find({
      where: {
        status: OrderStatus.PAID,
      },
    });

    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const remindedIds: string[] = [];

    for (const order of paidOrders) {
      if (order.arrivingNotifiedAt) continue;

      const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });
      const pickupTime = offer
        ? new Date(offer.pickupStart)
        : order.pickupSlot
          ? new Date(order.pickupSlot)
          : null;

      if (pickupTime && pickupTime <= thirtyMinutesFromNow && pickupTime > now) {
        order.arrivingNotifiedAt = now;
        await this.orderRepo.save(order);
        remindedIds.push(order.id);
      }
    }

    return {
      count: remindedIds.length,
      orderIds: remindedIds,
    };
  }

  /**
   * Tác vụ 11 (Hằng đêm): Dọn dẹp dữ liệu lưu trữ quá hạn (retention cleanup - §7.4)
   */
  async cleanupExpiredRetentionData(now: Date = new Date()) {
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const deleteAiLogsResult = await this.aiLogRepo
      .createQueryBuilder()
      .delete()
      .where('created_at < :date', { date: ninetyDaysAgo })
      .execute();

    const deleteViewsResult = await this.viewHistoryRepo
      .createQueryBuilder()
      .delete()
      .where('viewed_at < :date', { date: thirtyDaysAgo })
      .execute();

    return {
      aiLogsDeleted: deleteAiLogsResult.affected || 0,
      viewHistoryDeleted: deleteViewsResult.affected || 0,
    };
  }

  /**
   * Tác vụ 12 (Hằng đêm): Ẩn danh tài khoản yêu cầu xóa quá 7 ngày (BR-007, R1-019)
   */
  async anonymizePendingDeleteAccounts(now: Date = new Date()) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const pendingUsers = await this.userRepo.find({
      where: {
        status: UserStatus.PENDING_DELETE,
      },
    });

    const candidates = pendingUsers.filter(
      (u) => u.deleteRequestedAt && new Date(u.deleteRequestedAt) <= sevenDaysAgo,
    );

    const anonymizedIds: string[] = [];

    for (const user of candidates) {
      await this.dataSource.transaction(async (manager) => {
        user.status = UserStatus.ANONYMIZED;
        user.email = `anonymized_${user.id}@surplusiq.vn`;
        user.phone = null;
        user.passwordHash = 'ANONYMIZED';
        await manager.save(user);

        await manager.delete(DietaryProfileEntity, { userId: user.id });
        await manager.delete(SavedPlaceEntity, { userId: user.id });
        await manager.delete(FcmTokenEntity, { userId: user.id });

        anonymizedIds.push(user.id);
      });
    }

    if (anonymizedIds.length > 0) {
      this.logger.log(
        `[ACCOUNT_ANONYMIZE] Đã ẩn danh ${anonymizedIds.length} tài khoản quá 7 ngày.`,
      );
    }

    return {
      count: anonymizedIds.length,
      userIds: anonymizedIds,
    };
  }

  /**
   * Điều phối chạy tất cả các tác vụ nền định kỳ
   */
  async processAllBackgroundJobs(now: Date = new Date()): Promise<JobsExecutionSummary> {
    const holds = await this.releaseExpiredHolds(now);
    const pickups = await this.expireUnclaimedPickups(now);
    const offers = await this.autoCloseExpiredOffers(now);
    const complaints = await this.autoAcceptExpiredComplaints(now);
    const statements = await this.closeWeeklyStatements(now);
    const subscriptions = await this.processSubscriptionLifecycles(now);
    const payments = await this.recheckPendingPayments(now);
    const forecasts = await this.generateDailyForecasts(now);
    const pricing = await this.generateHourlyPriceProposals(now);
    const reminders = await this.sendPickupReminders(now);
    const retention = await this.cleanupExpiredRetentionData(now);
    const accounts = await this.anonymizePendingDeleteAccounts(now);

    return {
      timestamp: now,
      holdsReleased: holds,
      pickupsExpired: pickups,
      offersClosed: offers,
      complaintsAutoAccepted: complaints,
      weeklyStatementsClosed: statements,
      subscriptionsProcessed: subscriptions,
      paymentsRechecked: payments,
      forecastsGenerated: forecasts,
      pricingProposalsProcessed: pricing,
      remindersSent: reminders,
      retentionCleaned: retention,
      accountsAnonymized: accounts,
    };
  }
}
