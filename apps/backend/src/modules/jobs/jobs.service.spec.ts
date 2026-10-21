import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobsService } from './jobs.service';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OfferEventEntity, OfferEventType } from '../../entities/catalog/offer-event.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import {
  PaymentTransactionEntity,
  PaymentStatus,
} from '../../entities/orders/payment-transaction.entity';
import { WeeklyStatementEntity } from '../../entities/reconciliation/weekly-statement.entity';
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
import { ForecastEntity } from '../../entities/reconciliation/forecast.entity';
import { PriceProposalEntity } from '../../entities/reconciliation/price-proposal.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import { UserEntity, UserStatus } from '../../entities/auth/user.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { SavedPlaceEntity } from '../../entities/auth/saved-place.entity';
import { FcmTokenEntity } from '../../entities/auth/fcm-token.entity';
import { AiLogEntity } from '../../entities/ai/ai-log.entity';
import { ViewHistoryEntity } from '../../entities/auth/view-history.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { SettingsService } from '../settings/settings.service';
import { RewardsService } from '../rewards/rewards.service';
import { RescueTimelineService } from '../rescue-timeline/rescue-timeline.service';
import { RescuePoolService } from '../rescue-pool/rescue-pool.service';
import { RescueBridgeService } from '../rescue-bridge/rescue-bridge.service';
import { MarketingService } from '../marketing/marketing.service';

describe('JobsService (All 12 Background Jobs)', () => {
  let service: JobsService;
  let orderRepo: jest.Mocked<Repository<OrderEntity>>;
  let offerRepo: jest.Mocked<Repository<OfferEntity>>;
  let offerEventRepo: jest.Mocked<Repository<OfferEventEntity>>;
  let noshowRecordRepo: jest.Mocked<Repository<NoshowRecordEntity>>;
  let orderLockRepo: jest.Mocked<Repository<OrderLockEntity>>;
  let complaintRepo: jest.Mocked<Repository<ComplaintEntity>>;
  let paymentRepo: jest.Mocked<Repository<PaymentTransactionEntity>>;
  let statementRepo: jest.Mocked<Repository<WeeklyStatementEntity>>;
  let statementLineRepo: jest.Mocked<Repository<StatementLineEntity>>;
  let storeRepo: jest.Mocked<Repository<StoreEntity>>;
  let storeSettingsRepo: jest.Mocked<Repository<StoreSettingsEntity>>;
  let storeMemberRepo: jest.Mocked<Repository<StoreMemberEntity>>;
  let subscriptionRepo: jest.Mocked<Repository<SubscriptionEntity>>;
  let itemRepo: jest.Mocked<Repository<ItemEntity>>;
  let forecastRepo: jest.Mocked<Repository<ForecastEntity>>;
  let proposalRepo: jest.Mocked<Repository<PriceProposalEntity>>;
  let dailyActualRepo: jest.Mocked<Repository<DailyActualEntity>>;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let dietaryProfileRepo: jest.Mocked<Repository<DietaryProfileEntity>>;
  let savedPlaceRepo: jest.Mocked<Repository<SavedPlaceEntity>>;
  let fcmTokenRepo: jest.Mocked<Repository<FcmTokenEntity>>;
  let aiLogRepo: jest.Mocked<Repository<AiLogEntity>>;
  let viewHistoryRepo: jest.Mocked<Repository<ViewHistoryEntity>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let dataSource: jest.Mocked<DataSource>;
  let settingsService: { invalidateStoreSettingsCache: jest.Mock };

  const mockCustomerId = 'cust-111-uuid';
  const mockStoreId = 'store-222-uuid';
  const mockOrderId = 'order-333-uuid';
  const mockOfferId = 'offer-444-uuid';

  beforeEach(async () => {
    orderRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } as any;
    offerRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } as any;
    offerEventRepo = {
      create: jest.fn((dto) => ({ id: 'event-uuid', ...dto }) as any),
      save: jest.fn(),
    } as any;
    noshowRecordRepo = {
      create: jest.fn((dto) => ({ id: 'noshow-uuid', ...dto }) as any),
      save: jest.fn(),
      count: jest.fn(),
    } as any;
    orderLockRepo = {
      create: jest.fn((dto) => ({ ...dto }) as any),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;
    complaintRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } as any;
    paymentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => ({ ...dto }) as any),
    } as any;
    statementRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((dto) => ({ ...dto }) as any),
    } as any;
    statementLineRepo = { save: jest.fn(), create: jest.fn((dto) => ({ ...dto }) as any) } as any;
    storeRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } as any;
    storeSettingsRepo = { findOne: jest.fn(), save: jest.fn() } as any;
    storeMemberRepo = { find: jest.fn(), save: jest.fn() } as any;
    subscriptionRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() } as any;
    itemRepo = { find: jest.fn() } as any;
    forecastRepo = {
      create: jest.fn((dto) => ({ id: 'fc-1', ...dto }) as any),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    } as any;
    proposalRepo = {
      create: jest.fn((dto) => ({ id: 'prop-1', ...dto }) as any),
      save: jest.fn(),
    } as any;
    dailyActualRepo = { find: jest.fn() } as any;
    userRepo = { find: jest.fn(), save: jest.fn() } as any;
    dietaryProfileRepo = { delete: jest.fn() } as any;
    savedPlaceRepo = { delete: jest.fn() } as any;
    fcmTokenRepo = { delete: jest.fn() } as any;
    aiLogRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      }),
    } as any;
    viewHistoryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 10 }),
      }),
    } as any;

    auditLogService = {
      log: jest.fn().mockResolvedValue({} as any),
      getStoreAuditLogs: jest.fn(),
    } as any;

    dataSource = {
      transaction: jest.fn(),
    } as any;
    settingsService = { invalidateStoreSettingsCache: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(OfferEventEntity), useValue: offerEventRepo },
        { provide: getRepositoryToken(NoshowRecordEntity), useValue: noshowRecordRepo },
        { provide: getRepositoryToken(OrderLockEntity), useValue: orderLockRepo },
        { provide: getRepositoryToken(ComplaintEntity), useValue: complaintRepo },
        { provide: getRepositoryToken(PaymentTransactionEntity), useValue: paymentRepo },
        { provide: getRepositoryToken(WeeklyStatementEntity), useValue: statementRepo },
        { provide: getRepositoryToken(StatementLineEntity), useValue: statementLineRepo },
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
        { provide: getRepositoryToken(StoreSettingsEntity), useValue: storeSettingsRepo },
        { provide: getRepositoryToken(StoreMemberEntity), useValue: storeMemberRepo },
        { provide: getRepositoryToken(SubscriptionEntity), useValue: subscriptionRepo },
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(ForecastEntity), useValue: forecastRepo },
        { provide: getRepositoryToken(PriceProposalEntity), useValue: proposalRepo },
        { provide: getRepositoryToken(DailyActualEntity), useValue: dailyActualRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(DietaryProfileEntity), useValue: dietaryProfileRepo },
        { provide: getRepositoryToken(SavedPlaceEntity), useValue: savedPlaceRepo },
        { provide: getRepositoryToken(FcmTokenEntity), useValue: fcmTokenRepo },
        { provide: getRepositoryToken(AiLogEntity), useValue: aiLogRepo },
        { provide: getRepositoryToken(ViewHistoryEntity), useValue: viewHistoryRepo },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: RewardsService, useValue: { reverseForOrder: jest.fn() } },
        { provide: RescueTimelineService, useValue: { recalculateAll: jest.fn() } },
        { provide: RescuePoolService, useValue: { processDeadlines: jest.fn() } },
        { provide: RescueBridgeService, useValue: { processDeadlines: jest.fn() } },
        { provide: MarketingService, useValue: { dispatchDueCampaigns: jest.fn() } },
        { provide: DataSource, useValue: dataSource },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  describe('releaseExpiredHolds', () => {
    it('nhả suất khi quá 10 phút, đổi HOLD_EXPIRED và cộng hoàn tồn kho', async () => {
      const now = new Date('2026-10-13T12:00:00Z');
      const expiredHoldOrder = {
        id: mockOrderId,
        status: OrderStatus.PENDING_PAYMENT,
        offerId: mockOfferId,
        quantity: 3,
        holdExpiresAt: new Date('2026-10-13T11:55:00Z'),
        storeId: mockStoreId,
      } as OrderEntity;

      orderRepo.find.mockResolvedValueOnce([expiredHoldOrder]);

      const mockOffer = {
        id: mockOfferId,
        remainingQuantity: 0,
        status: OfferStatus.SOLD_OUT,
        pickupEnd: '2026-10-13T18:00:00Z',
      } as unknown as OfferEntity;

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest
              .fn()
              .mockResolvedValueOnce(expiredHoldOrder)
              .mockResolvedValueOnce(mockOffer),
          }),
          save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
          decrement: jest.fn(),
          update: jest.fn(),
        };
        return cb(mockManager);
      });

      const result = await service.releaseExpiredHolds(now);

      expect(result.count).toBe(1);
      expect(result.orderIds).toContain(mockOrderId);
      expect(expiredHoldOrder.status).toBe(OrderStatus.HOLD_EXPIRED);
      expect(expiredHoldOrder.cancelledBy).toBe(CancelledBy.SYSTEM);
      expect(mockOffer.remainingQuantity).toBe(3);
      expect(mockOffer.status).toBe(OfferStatus.OPEN);
    });
  });

  describe('autoAcceptExpiredComplaints', () => {
    it('tự động chấp nhận khiếu nại quá hạn 48h và hoàn tiền 100%', async () => {
      const now = new Date('2026-10-14T10:00:00Z');
      const complaint = {
        id: 'comp-1',
        orderId: mockOrderId,
        storeId: mockStoreId,
        status: ComplaintStatus.PENDING_STORE,
        responseDueAt: new Date('2026-10-14T09:00:00Z'),
        refundAmount: 0,
        autoAccepted: false,
      } as ComplaintEntity;

      complaintRepo.find.mockResolvedValueOnce([complaint]);

      const mockOrder = {
        id: mockOrderId,
        storeId: mockStoreId,
        totalAmount: 150000,
        status: OrderStatus.PAID,
      } as OrderEntity;

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValueOnce(complaint),
          }),
          findOne: jest.fn().mockResolvedValue(mockOrder),
          save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
          create: jest.fn().mockImplementation((_, dto) => dto),
        };
        return cb(mockManager);
      });

      const res = await service.autoAcceptExpiredComplaints(now);
      expect(res.count).toBe(1);
      expect(complaint.status).toBe(ComplaintStatus.ACCEPTED);
      expect(complaint.autoAccepted).toBe(true);
      expect(complaint.refundAmount).toBe(150000);
      expect(mockOrder.status).toBe(OrderStatus.REFUNDED);
    });
  });

  describe('closeWeeklyStatements', () => {
    it('chốt và khóa sao kê tuần cho cửa hàng', async () => {
      storeRepo.find.mockResolvedValueOnce([{ id: mockStoreId } as StoreEntity]);
      statementRepo.findOne.mockResolvedValueOnce(null);
      orderRepo.find.mockResolvedValueOnce([
        { id: 'o-1', totalAmount: 200000, status: OrderStatus.PICKED_UP } as any,
      ]);
      complaintRepo.find.mockResolvedValueOnce([]);
      statementRepo.create.mockReturnValue({ id: 'stmt-1' } as any);
      statementRepo.save.mockResolvedValueOnce({ id: 'stmt-1' } as any);

      const res = await service.closeWeeklyStatements(new Date('2026-10-14T00:05:00Z'));
      expect(res.count).toBe(1);
      expect(res.storeIds).toContain(mockStoreId);
    });
  });

  describe('processSubscriptionLifecycles', () => {
    it('hạ gói về Basic khi hết hạn Pro', async () => {
      const now = new Date('2026-10-14T00:00:00Z');
      const sub = {
        storeId: mockStoreId,
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date('2026-10-13T23:59:59Z'),
      } as SubscriptionEntity;

      subscriptionRepo.find.mockResolvedValueOnce([sub]);
      let committed = false;
      settingsService.invalidateStoreSettingsCache.mockImplementation(async () => {
        expect(committed).toBe(true);
      });
      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const mockManager = {
          save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
          findOne: jest.fn().mockImplementation(async (entity) => {
            if (entity === StoreEntity) return { id: mockStoreId };
            if (entity === SubscriptionEntity) return sub;
            return { pricingMode: PricingMode.AUTO };
          }),
          update: jest.fn().mockResolvedValue({}),
          find: jest.fn().mockResolvedValue([
            { id: 'm-1', permission: StorePermission.OWNER, status: StoreMemberStatus.ACTIVE },
            { id: 'm-2', permission: StorePermission.MANAGER, status: StoreMemberStatus.ACTIVE },
            { id: 'm-3', permission: StorePermission.COUNTER, status: StoreMemberStatus.ACTIVE },
          ]),
        };
        const result = await cb(mockManager);
        committed = true;
        return result;
      });

      const res = await service.processSubscriptionLifecycles(now);
      expect(res.count).toBe(1);
      expect(sub.plan).toBe(SubscriptionPlan.BASIC);
      expect(settingsService.invalidateStoreSettingsCache).toHaveBeenCalledWith(mockStoreId);
    });

    it('preserves a renewal committed after the expired candidate scan and before acquiring the store lock', async () => {
      const now = new Date('2026-10-14T00:00:00Z');
      const scanned = {
        storeId: mockStoreId,
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date('2026-10-13T23:59:59Z'),
      } as SubscriptionEntity;
      const renewed = { ...scanned, periodEnd: new Date('2026-11-13T00:00:00Z') };
      subscriptionRepo.find.mockResolvedValueOnce([scanned]);
      const manager = {
        findOne: jest
          .fn()
          .mockImplementation(async (entity) =>
            entity === StoreEntity ? { id: mockStoreId } : renewed,
          ),
        save: jest.fn(),
        update: jest.fn(),
        find: jest.fn(),
      };
      dataSource.transaction.mockImplementationOnce(async (work: any) => work(manager));
      const result = await service.processSubscriptionLifecycles(now);
      expect(manager.findOne).toHaveBeenNthCalledWith(1, StoreEntity, {
        where: { id: mockStoreId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.findOne).toHaveBeenNthCalledWith(2, SubscriptionEntity, {
        where: { storeId: mockStoreId },
      });
      expect(result).toEqual({ count: 0, storeIds: [] });
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
      expect(auditLogService.log).not.toHaveBeenCalled();
      expect(renewed.plan).toBe(SubscriptionPlan.PRO);
      expect(settingsService.invalidateStoreSettingsCache).not.toHaveBeenCalled();
    });
  });

  describe('recheckPendingPayments', () => {
    it('đánh dấu FAILED cho giao dịch treo quá 24h', async () => {
      const now = new Date('2026-10-14T10:00:00Z');
      const oldTxn = {
        id: 'txn-old',
        status: PaymentStatus.PENDING_CONFIRM,
        createdAt: new Date('2026-10-12T10:00:00Z'),
      } as PaymentTransactionEntity;

      paymentRepo.find.mockResolvedValueOnce([oldTxn]);
      paymentRepo.save.mockResolvedValueOnce(oldTxn);

      const res = await service.recheckPendingPayments(now);
      expect(res.count).toBe(1);
      expect(oldTxn.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('generateDailyForecasts', () => {
    it('tạo dự báo cho cửa hàng PRO', async () => {
      subscriptionRepo.find.mockResolvedValueOnce([
        {
          storeId: mockStoreId,
          plan: SubscriptionPlan.PRO,
          status: SubscriptionStatus.ACTIVE,
        } as SubscriptionEntity,
      ]);
      itemRepo.find.mockResolvedValueOnce([{ id: 'item-1', storeId: mockStoreId } as ItemEntity]);
      dailyActualRepo.find.mockResolvedValueOnce([
        { date: '2026-10-13', soldOffline: 10, soldApp: 5, stockoutAt: null } as DailyActualEntity,
      ]);
      forecastRepo.save.mockResolvedValueOnce({ id: 'fc-1' } as any);

      const res = await service.generateDailyForecasts(new Date('2026-10-14T21:00:00Z'));
      expect(res.count).toBe(1);
      expect(res.forecastIds).toContain('fc-1');
    });

    it('BUG-008: chạy lại khi đã có dự báo của ngày mai thì bỏ qua, không tạo trùng', async () => {
      subscriptionRepo.find.mockResolvedValueOnce([
        { storeId: mockStoreId, plan: SubscriptionPlan.PRO } as SubscriptionEntity,
      ]);
      itemRepo.find.mockResolvedValueOnce([{ id: 'item-1', storeId: mockStoreId } as ItemEntity]);
      forecastRepo.findOne.mockResolvedValueOnce({ id: 'fc-existing' } as any);

      const res = await service.generateDailyForecasts(new Date('2026-10-14T21:00:00Z'));
      expect(res.count).toBe(0);
      expect(forecastRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('generateHourlyPriceProposals', () => {
    it('tạo đề xuất giá và tự động đổi giá khi store bật AUTO', async () => {
      const now = new Date('2026-10-14T15:00:00Z');
      const offer = {
        id: mockOfferId,
        storeId: mockStoreId,
        currentPrice: 50000,
        originalPrice: 100000,
        floorPrice: 40000,
        remainingQuantity: 10,
        totalQuantity: 20,
        pickupStart: '2026-10-14T14:00:00Z',
        pickupEnd: '2026-10-14T16:00:00Z',
        priceChangeCount: 0,
        status: OfferStatus.OPEN,
      } as unknown as OfferEntity;

      offerRepo.find.mockResolvedValueOnce([offer]);
      storeSettingsRepo.findOne.mockResolvedValueOnce({
        floorRatio: 0.4,
        pricingMode: PricingMode.AUTO,
      } as any);
      proposalRepo.save.mockResolvedValueOnce({ id: 'prop-1' } as any);

      const res = await service.generateHourlyPriceProposals(now);
      expect(res.count).toBeGreaterThanOrEqual(1);
      expect(res.autoAppliedCount).toBe(1);
    });
  });

  describe('sendPickupReminders', () => {
    it('đánh dấu nhắc nhở khi sắp tới giờ lấy hàng (30 phút)', async () => {
      const now = new Date('2026-10-14T15:00:00Z');
      const order = {
        id: mockOrderId,
        status: OrderStatus.PAID,
        offerId: mockOfferId,
        pickupSlot: new Date('2026-10-14T15:20:00Z'),
        arrivingNotifiedAt: null,
      } as OrderEntity;

      orderRepo.find.mockResolvedValueOnce([order]);
      offerRepo.findOne.mockResolvedValueOnce(null);

      const res = await service.sendPickupReminders(now);
      expect(res.count).toBe(1);
      expect(order.arrivingNotifiedAt).toBe(now);
    });
  });

  describe('cleanupExpiredRetentionData', () => {
    it('xóa ai_logs > 90 ngày và view_history > 30 ngày', async () => {
      const res = await service.cleanupExpiredRetentionData(new Date());
      expect(res.aiLogsDeleted).toBe(5);
      expect(res.viewHistoryDeleted).toBe(10);
    });
  });

  describe('anonymizePendingDeleteAccounts', () => {
    it('ẩn danh tài khoản yêu cầu xóa quá 7 ngày', async () => {
      const now = new Date('2026-10-14T12:00:00Z');
      const user = {
        id: 'user-del-1',
        status: UserStatus.PENDING_DELETE,
        deleteRequestedAt: new Date('2026-10-06T12:00:00Z'), // 8 days ago
        email: 'user@example.com',
        phone: '0987654321',
      } as UserEntity;

      userRepo.find.mockResolvedValueOnce([user]);

      dataSource.transaction.mockImplementationOnce(async (cb: any) => {
        const mockManager = {
          save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
          delete: jest.fn().mockResolvedValue({}),
        };
        return cb(mockManager);
      });

      const res = await service.anonymizePendingDeleteAccounts(now);
      expect(res.count).toBe(1);
      expect(user.status).toBe(UserStatus.ANONYMIZED);
      expect(user.email).toContain('anonymized_');
      expect(user.phone).toBeNull();
    });
  });
});
