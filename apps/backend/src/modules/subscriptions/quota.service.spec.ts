import { HttpException, HttpStatus } from '@nestjs/common';
import { QuotaService } from './quota.service';
import { SubscriptionsService } from './subscriptions.service';
import { SettingsService } from '../settings/settings.service';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionEntity,
} from '../../entities/subscriptions/subscription.entity';
import { SubscriptionInvoiceEntity } from '../../entities/subscriptions/subscription-invoice.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { QuotaKey, QuotaPeriod } from './quota.constants';
import { StoreMemberStatus } from '../../entities/stores/store-member.entity';
import { PromotionStatus } from '../../entities/marketing/promotion.entity';

describe('QuotaService & SubscriptionsService Unit Tests (VC-01..VC-11, R2-016)', () => {
  let quotaService: QuotaService;
  let subscriptionsService: SubscriptionsService;

  let mockSubRepo: any;
  let mockPlanQuotaRepo: any;
  let mockUsageLogRepo: any;
  let mockStoreMemberRepo: any;
  let mockPromotionRepo: any;

  beforeEach(() => {
    mockSubRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    mockPlanQuotaRepo = {
      findOne: jest.fn(),
    };

    mockUsageLogRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'log-1' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
    };

    mockStoreMemberRepo = {
      count: jest.fn(),
    };

    mockPromotionRepo = {
      count: jest.fn(),
    };

    quotaService = new QuotaService(
      mockSubRepo,
      mockPlanQuotaRepo,
      mockUsageLogRepo,
      mockStoreMemberRepo,
      mockPromotionRepo,
    );

    const mockInvoiceRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };

    const mockStoreSettingsRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
    const repositories = new Map<any, any>([
      [SubscriptionEntity, mockSubRepo],
      [SubscriptionInvoiceEntity, mockInvoiceRepo],
      [StoreSettingsEntity, mockStoreSettingsRepo],
      [StoreMemberEntity, mockStoreMemberRepo],
    ]);
    const transactionManager = {
      findOne: jest.fn().mockResolvedValue({ id: 'store-1' }),
      getRepository: (entity) => repositories.get(entity),
    };
    mockSubRepo.manager = { transaction: jest.fn((work) => work(transactionManager)) };

    subscriptionsService = new SubscriptionsService(
      mockSubRepo,
      mockInvoiceRepo as any,
      mockStoreSettingsRepo as any,
      mockStoreMemberRepo,
      quotaService,
      {
        invalidateStoreSettingsCache: jest.fn().mockResolvedValue(undefined),
      } as unknown as SettingsService,
    );
  });

  // =========================================================================
  // 1. PLAN RESOLUTION & LIFECYCLE (VC-01..VC-06)
  // =========================================================================
  describe('Subscription Plan Resolution (VC-01..VC-06)', () => {
    it('should return BASIC if store has no subscription record', async () => {
      mockSubRepo.findOne.mockResolvedValue(null);
      const plan = await quotaService.getEffectivePlan('store-1');
      expect(plan).toBe(SubscriptionPlan.BASIC);
    });

    it('should return PRO for active PRO plan within period (VC-02)', async () => {
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 'store-1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });

      const plan = await quotaService.getEffectivePlan('store-1');
      expect(plan).toBe(SubscriptionPlan.PRO);
    });

    it('should return TRIAL for active 30-day Pro Trial (VC-01)', async () => {
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 'store-1',
        plan: SubscriptionPlan.TRIAL,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      });

      const plan = await quotaService.getEffectivePlan('store-1');
      expect(plan).toBe(SubscriptionPlan.TRIAL);
    });

    it('should auto-revert to BASIC when trial or pro has expired (VC-06)', async () => {
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 'store-1',
        plan: SubscriptionPlan.TRIAL,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() - 5000), // Expired 5 seconds ago
      });

      const plan = await quotaService.getEffectivePlan('store-1');
      expect(plan).toBe(SubscriptionPlan.BASIC);
    });
  });

  // =========================================================================
  // 2. QUOTA LIMITS (BASIC VS PRO)
  // =========================================================================
  describe('Quota Limit Calculation', () => {
    it('should return 20 daily offers for BASIC and 100 for PRO', async () => {
      // Basic store
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 's-basic',
        plan: SubscriptionPlan.BASIC,
      });
      const basicLimit = await quotaService.getQuotaLimit('s-basic', QuotaKey.DAILY_OFFERS);
      expect(basicLimit).toBe(20);

      // Pro store
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 's-pro',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 100000),
      });
      const proLimit = await quotaService.getQuotaLimit('s-pro', QuotaKey.DAILY_OFFERS);
      expect(proLimit).toBe(100);
    });

    it('should return 10 AI queries for BASIC and 300 for PRO', async () => {
      mockSubRepo.findOne.mockResolvedValue(null); // Basic
      const basicLimit = await quotaService.getQuotaLimit('s-basic', QuotaKey.AI_CHAT_QUERY);
      expect(basicLimit).toBe(10);

      mockSubRepo.findOne.mockResolvedValue({
        storeId: 's-pro',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 100000),
      });
      const proLimit = await quotaService.getQuotaLimit('s-pro', QuotaKey.AI_CHAT_QUERY);
      expect(proLimit).toBe(300);
    });
  });

  // =========================================================================
  // 3. EXISTENCE QUOTAS (STAFF, PROMOTIONS)
  // =========================================================================
  describe('Existence Quotas (Staff & Promotions Active Count)', () => {
    it('should count active staff members for ACTIVE_STAFF quota', async () => {
      mockSubRepo.findOne.mockResolvedValue(null); // Basic limit is 1 staff
      mockStoreMemberRepo.count.mockResolvedValue(1);

      const usage = await quotaService.getCurrentUsage({
        storeId: 'store-1',
        quotaKey: QuotaKey.ACTIVE_STAFF,
      });

      expect(usage.used).toBe(1);
      expect(usage.resetsAt).toBeNull();
    });

    it('should throw QUOTA_EXCEEDED when adding staff beyond limit (1 in Basic)', async () => {
      mockSubRepo.findOne.mockResolvedValue(null); // Basic -> limit = 1
      mockStoreMemberRepo.count.mockResolvedValue(1); // Already 1 active staff

      await expect(
        quotaService.consume({
          storeId: 'store-1',
          quotaKey: QuotaKey.ACTIVE_STAFF,
          units: 1, // Attempt to add 2nd staff
        }),
      ).rejects.toThrow(HttpException);

      try {
        await quotaService.consume({
          storeId: 'store-1',
          quotaKey: QuotaKey.ACTIVE_STAFF,
          units: 1,
        });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.getResponse().code).toBe('QUOTA_EXCEEDED');
        expect(err.getResponse().details.remaining).toBe(0);
      }
    });
  });

  // =========================================================================
  // 4. PERIODIC QUOTAS & CONSUMPTION (DAILY OFFERS, AI CALLS)
  // =========================================================================
  describe('Periodic Quota Consumption & Usage Logs (8.3.1, 8.4)', () => {
    const mockQueryBuilder = (total: number) => {
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total }),
      };
      mockUsageLogRepo.createQueryBuilder.mockReturnValue(qb);
      return qb;
    };

    it('should allow consuming within quota and create usage_log', async () => {
      mockSubRepo.findOne.mockResolvedValue(null); // Basic -> 20 daily offers
      mockQueryBuilder(5); // 5 offers already used

      const result = await quotaService.consume({
        storeId: 'store-1',
        quotaKey: QuotaKey.DAILY_OFFERS,
        units: 1,
        refId: 'offer-101',
      });

      expect(result.used).toBe(6);
      expect(result.remaining).toBe(14);
      expect(result.limit).toBe(20);
      expect(mockUsageLogRepo.save).toHaveBeenCalled();
    });

    it('should throw QUOTA_EXCEEDED when reaching 20/20 daily offers on Basic', async () => {
      mockSubRepo.findOne.mockResolvedValue(null); // Basic -> 20 limit
      mockQueryBuilder(20); // 20 already created

      await expect(
        quotaService.consume({
          storeId: 'store-1',
          quotaKey: QuotaKey.DAILY_OFFERS,
          units: 1,
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should check quota without consuming', async () => {
      mockSubRepo.findOne.mockResolvedValue(null);
      mockQueryBuilder(15);

      const check = await quotaService.checkQuota({
        storeId: 'store-1',
        quotaKey: QuotaKey.DAILY_OFFERS,
      });

      expect(check.limit).toBe(20);
      expect(check.used).toBe(15);
      expect(check.remaining).toBe(5);
      expect(check.isExceeded).toBe(false);
      expect(mockUsageLogRepo.save).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. STORE QUOTA SUMMARY (R2-016)
  // =========================================================================
  describe('Store Quota Summary (R2-016)', () => {
    it('should generate summary for all store quota keys', async () => {
      mockSubRepo.findOne.mockResolvedValue(null);
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: 2 }),
      };
      mockUsageLogRepo.createQueryBuilder.mockReturnValue(qb);
      mockStoreMemberRepo.count.mockResolvedValue(1);
      mockPromotionRepo.count.mockResolvedValue(0);

      const summary = await quotaService.getStoreQuotaSummary('store-1');

      expect(summary[QuotaKey.DAILY_OFFERS]).toBeDefined();
      expect(summary[QuotaKey.ACTIVE_STAFF]).toBeDefined();
      expect(summary[QuotaKey.AI_CHAT_QUERY]).toBeDefined();
      expect(summary[QuotaKey.EXPORT_REPORTS]).toBeDefined();
      expect(summary[QuotaKey.ACTIVE_STAFF].limit).toBe(1);
    });
  });

  // =========================================================================
  // 6. SUBSCRIPTION SERVICE LIFECYCLE (VC-01..VC-11)
  // =========================================================================
  describe('SubscriptionsService Lifecycle Operations', () => {
    it('should get current subscription and compute days remaining', async () => {
      const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 'store-1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: future,
      });

      const res = await subscriptionsService.getCurrentSubscription('store-1');

      expect(res.plan).toBe(SubscriptionPlan.PRO);
      expect(res.effectivePlan).toBe(SubscriptionPlan.PRO);
      expect(res.daysRemaining).toBe(10);
    });

    it('should upgrade to Pro for 30 days (VC-02)', async () => {
      mockSubRepo.findOne.mockResolvedValue(null);

      const res = await subscriptionsService.upgradeToPro('store-1');

      expect(mockSubRepo.save).toHaveBeenCalled();
      expect(res.plan).toBe(SubscriptionPlan.PRO);
    });

    it('should cancel Pro during Trial by immediately reverting to Basic (VC-08)', async () => {
      const trialSub = {
        storeId: 'store-1',
        plan: SubscriptionPlan.TRIAL,
        status: SubscriptionStatus.ACTIVE,
      };
      mockSubRepo.findOne.mockResolvedValue(trialSub);

      const res = await subscriptionsService.cancelPro('store-1');

      expect(trialSub.plan).toBe(SubscriptionPlan.BASIC);
      expect(res.plan).toBe(SubscriptionPlan.BASIC);
    });

    it('should cancel paid Pro by setting cancelAtPeriodEnd flag (VC-08)', async () => {
      const paidSub = {
        storeId: 'store-1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false,
        periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      };
      mockSubRepo.findOne.mockResolvedValue(paidSub);

      const res = await subscriptionsService.cancelPro('store-1');

      expect(paidSub.cancelAtPeriodEnd).toBe(true);
      expect(res.cancelAtPeriodEnd).toBe(true);
    });
  });
});
