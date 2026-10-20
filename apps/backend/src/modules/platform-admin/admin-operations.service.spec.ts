import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import Redis from 'ioredis';
import { validate } from 'class-validator';
import { AdminOperationsService } from './admin-operations.service';
import { AdminOperationsController } from './admin-operations.controller';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import {
  ViolationReportEntity,
  ViolationStatus,
} from '../../entities/complaints/violation-report.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import {
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionEntity,
} from '../../entities/orders/payment-transaction.entity';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { PricingMode, StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { PlanQuotaEntity } from '../../entities/subscriptions/plan-quota.entity';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';
import { SubscriptionInvoiceEntity } from '../../entities/subscriptions/subscription-invoice.entity';
import { SettingsService } from '../settings/settings.service';
import { SETTINGS_CACHE_PREFIX } from '../settings/settings.constants';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { QuotaKey, QuotaPeriod } from '../subscriptions/quota.constants';
import { QuotaService } from '../subscriptions/quota.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CustomerInteractionsService } from '../customer-interactions/customer-interactions.service';
import {
  CreateAdminQuotaDto,
  ResolveAdminComplaintDto,
  UpdateAdminQuotaDto,
} from './dto/admin-operations.dto';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/auth/user.entity';
import { RewardsService } from '../rewards/rewards.service';

type EntityClass = new () => object;
type Row = Record<string, unknown>;

// In-memory transactional double: failed callbacks roll back; transactions run in
// lock order so repeated requests observe the committed decision, as PostgreSQL does.
function harness() {
  let tables = new Map<EntityClass, object[]>();
  let tail = Promise.resolve();
  let nextId = 1;
  const copy = (value: object) => Object.assign(Object.create(Object.getPrototypeOf(value)), value);
  const rows = (entity: EntityClass) => tables.get(entity) ?? [];
  const matches = (row: object, where: Row) =>
    Object.entries(where).every(([key, value]) => row[key] === value);
  const manager = {
    getRepository: (entity: EntityClass) => ({
      manager: { transaction: (work) => dataSource.transaction(work) },
      findOne: (options: { where: Row }) => manager.findOne(entity, options),
      find: (options: { where: Row }) => manager.find(entity, options),
      create: (value: object) => manager.create(entity, value),
      save: (value: object) => manager.save(value),
    }),
    findOne: jest.fn(async (entity: EntityClass, options: { where: Row }) => {
      const found = rows(entity).find((row) => matches(row, options.where));
      return found ? copy(found) : null;
    }),
    find: jest.fn(async (entity: EntityClass, options: { where: Row }) =>
      rows(entity)
        .filter((row) => matches(row, options.where))
        .map(copy),
    ),
    create: jest.fn((entity: EntityClass, value: object) => Object.assign(new entity(), value)),
    save: jest.fn(async (entity: object) => {
      if (Array.isArray(entity)) return Promise.all(entity.map((entry) => manager.save(entry)));
      const ctor = entity.constructor as EntityClass;
      const values = rows(ctor);
      const row = entity as Row;
      const key = ctor === StoreSettingsEntity || ctor === SubscriptionEntity ? 'storeId' : 'id';
      if (!row[key]) row[key] = `created-${nextId++}`;
      const index = values.findIndex((existing: Row) => existing[key] === row[key]);
      if (index === -1) values.push(copy(entity));
      else values[index] = copy(entity);
      tables.set(ctor, values);
      return entity;
    }),
    remove: jest.fn(async (entity: object) => {
      const ctor = entity.constructor as EntityClass;
      tables.set(
        ctor,
        rows(ctor).filter((existing: Row) => existing.id !== (entity as Row).id),
      );
      // TypeORM clears removed primary keys, which must not erase the audit's old value.
      (entity as Row).id = undefined;
      return entity;
    }),
  };
  const dataSource = {
    manager,
    getRepository: jest.fn((entity: EntityClass) => ({
      findOne: (options: { where: Row }) => manager.findOne(entity, options),
    })),
    transaction: jest.fn((callback: (manager: object) => Promise<unknown>) => {
      const run = tail.then(async () => {
        const snapshot = new Map([...tables].map(([entity, values]) => [entity, values.map(copy)]));
        try {
          return await callback(manager);
        } catch (error) {
          tables = snapshot;
          throw error;
        }
      });
      tail = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    }),
  };
  const settings = {
    invalidateStoreSettingsCache: jest.fn().mockResolvedValue(undefined),
    updateStoreSettings: jest.fn(async (_id, _actor, _dto, _isPro, afterUpdate, _manager) => {
      const updated = Object.assign(new StoreSettingsEntity(), {
        storeId: 'store-1',
        pricingMode: PricingMode.AUTO,
      });
      if (afterUpdate) await afterUpdate(manager, null, updated);
      return updated;
    }),
  };
  const quota = { getEffectivePlan: jest.fn().mockResolvedValue(SubscriptionPlan.BASIC) };
  const subscriptions = {
    upgradeToPro: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.PRO }),
    renewPro: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.PRO }),
    downgradeToBasic: jest.fn().mockResolvedValue({ plan: SubscriptionPlan.BASIC }),
  };
  const service = new AdminOperationsService(
    dataSource as unknown as DataSource,
    settings as unknown as SettingsService,
    quota as unknown as QuotaService,
    subscriptions as unknown as SubscriptionsService,
  );
  const seed = <T extends object>(entity: new () => T, data: Partial<T>[]) =>
    tables.set(
      entity,
      data.map((value) => Object.assign(new entity(), value)),
    );
  seed(ComplaintEntity, [
    {
      id: 'complaint-1',
      orderId: 'order-1',
      storeId: 'store-1',
      customerId: 'customer-1',
      status: ComplaintStatus.PENDING_STORE,
      refundAmount: 0,
    },
  ]);
  seed(OrderEntity, [
    { id: 'order-1', storeId: 'store-1', totalAmount: 100000, status: OrderStatus.PICKED_UP },
  ]);
  seed(StoreEntity, [{ id: 'store-1' }]);
  return { service, seed, rows, manager, dataSource, settings, quota, subscriptions };
}

describe('AdminOperationsService complaint decisions', () => {
  it('refunds the remaining amount once, updates the order and records the ADMIN in one transaction', async () => {
    const h = harness();
    h.seed(PaymentTransactionEntity, [
      {
        id: 'prior',
        orderId: 'order-1',
        kind: PaymentKind.ORDER_REFUND,
        status: PaymentStatus.SUCCEEDED,
        amount: 20000,
      },
    ]);
    const result = await h.service.resolveComplaint('complaint-1', 'admin-1', {
      decision: 'ACCEPT',
    });
    expect(result.complaint.refundAmount).toBe(80000);
    expect(result.refundTransaction).toMatchObject({
      kind: PaymentKind.ORDER_REFUND,
      method: PaymentMethod.SIMULATED,
      status: PaymentStatus.SUCCEEDED,
      amount: 80000,
      gatewayTxnId: 'ADMIN_REFUND_complaint-1',
    });
    expect(h.rows(OrderEntity)[0]).toMatchObject({ status: OrderStatus.REFUNDED });
    expect(h.rows(AuditLogEntity)[0]).toMatchObject({
      actorId: 'admin-1',
      actorRole: 'ADMIN',
      targetId: 'complaint-1',
    });
    expect(h.manager.findOne).toHaveBeenCalledWith(
      ComplaintEntity,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(h.manager.findOne).toHaveBeenCalledWith(
      OrderEntity,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  it('keeps a partial refund order picked up', async () => {
    const h = harness();
    await h.service.resolveComplaint('complaint-1', 'admin-1', {
      decision: 'ACCEPT',
      refundAmount: 30000,
    });
    expect(h.rows(OrderEntity)[0]).toMatchObject({ status: OrderStatus.PICKED_UP });
    expect(h.rows(PaymentTransactionEntity)).toHaveLength(1);
  });

  it('accepts without payment when the selected refund is zero', async () => {
    const h = harness();
    await h.service.resolveComplaint('complaint-1', 'admin-1', {
      decision: 'ACCEPT',
      refundAmount: 0,
    });
    expect(h.rows(PaymentTransactionEntity)).toHaveLength(0);
    expect(h.rows(ComplaintEntity)[0]).toMatchObject({
      status: ComplaintStatus.ACCEPTED,
      refundAmount: 0,
    });
  });

  it('rejects an amount above the remaining refund balance before any writes', async () => {
    const h = harness();
    h.seed(PaymentTransactionEntity, [
      {
        id: 'prior',
        orderId: 'order-1',
        kind: PaymentKind.ORDER_REFUND,
        status: PaymentStatus.SUCCEEDED,
        amount: 20000,
      },
    ]);
    await expect(
      h.service.resolveComplaint('complaint-1', 'admin-1', {
        decision: 'ACCEPT',
        refundAmount: 80001,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.manager.save).not.toHaveBeenCalled();
  });

  it('rolls back the refund and complaint when writing the audit fails', async () => {
    const h = harness();
    const save = h.manager.save.getMockImplementation()!;
    h.manager.save.mockImplementation(async (entity) => {
      if (entity instanceof AuditLogEntity) throw new Error('audit unavailable');
      return save(entity);
    });
    await expect(
      h.service.resolveComplaint('complaint-1', 'admin-1', { decision: 'ACCEPT' }),
    ).rejects.toThrow('audit unavailable');
    expect(h.rows(PaymentTransactionEntity)).toHaveLength(0);
    expect(h.rows(ComplaintEntity)[0]).toMatchObject({ status: ComplaintStatus.PENDING_STORE });
    expect(h.rows(OrderEntity)[0]).toMatchObject({ status: OrderStatus.PICKED_UP });
  });

  it('allows only one decision for simultaneous requests serialized by the transaction locks', async () => {
    const h = harness();
    const results = await Promise.allSettled([
      h.service.resolveComplaint('complaint-1', 'admin-1', { decision: 'ACCEPT' }),
      h.service.resolveComplaint('complaint-1', 'admin-2', { decision: 'ACCEPT' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: expect.any(ConflictException),
    });
    expect(h.rows(PaymentTransactionEntity)).toHaveLength(1);
    expect(h.rows(AuditLogEntity)).toHaveLength(1);
  });

  it('shares decision locks with the existing STORE complaint resolution path', async () => {
    const h = harness();
    const store = new CustomerInteractionsService(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      h.dataSource as unknown as DataSource,
      { reverseForOrder: jest.fn() } as unknown as RewardsService,
      null as never,
    );
    const results = await Promise.allSettled([
      h.service.resolveComplaint('complaint-1', 'admin-1', { decision: 'ACCEPT' }),
      store.resolveComplaint('store-1', 'complaint-1', {}),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: expect.any(ConflictException),
    });
    expect(h.rows(PaymentTransactionEntity)).toHaveLength(1);
  });

  it.each(['', '   '])('requires a nonblank rejection reason (%j)', async (reason) => {
    const h = harness();
    await expect(
      h.service.resolveComplaint('complaint-1', 'admin-1', { decision: 'REJECT', reason }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.manager.save).not.toHaveBeenCalled();
  });

  it('rejects with a reason and leaves financial records unchanged', async () => {
    const h = harness();
    await h.service.resolveComplaint('complaint-1', 'admin-1', {
      decision: 'REJECT',
      reason: '  Không đủ bằng chứng  ',
    });
    expect(h.rows(ComplaintEntity)[0]).toMatchObject({
      status: ComplaintStatus.REJECTED,
      rejectReason: 'Không đủ bằng chứng',
    });
    expect(h.rows(PaymentTransactionEntity)).toHaveLength(0);
    expect(h.rows(OrderEntity)[0]).toMatchObject({ status: OrderStatus.PICKED_UP });
    expect(h.manager.remove).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing complaint and rejects noninteger amounts', async () => {
    const h = harness();
    await expect(
      h.service.resolveComplaint('missing', 'admin-1', { decision: 'ACCEPT' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      h.service.resolveComplaint('complaint-1', 'admin-1', {
        decision: 'ACCEPT',
        refundAmount: 0.1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AdminOperationsService moderation and settings', () => {
  it('hides a review while preserving its original customer content', async () => {
    const h = harness();
    h.seed(ReviewEntity, [
      {
        id: 'review-1',
        storeId: 'store-1',
        rating: 2,
        comment: 'Original customer comment',
        status: ReviewStatus.VISIBLE,
      },
    ]);
    const result = await h.service.updateReview('review-1', 'admin-1', { status: 'HIDDEN' });
    expect(result).toMatchObject({
      comment: 'Original customer comment',
      rating: 2,
      status: ReviewStatus.HIDDEN,
    });
    expect(h.manager.remove).not.toHaveBeenCalled();
    expect(h.rows(AuditLogEntity)[0]).toMatchObject({ action: 'ADMIN_REVIEW_MODERATED' });
  });

  it('records a dismissed violation without deleting the report', async () => {
    const h = harness();
    h.seed(ViolationReportEntity, [
      { id: 'violation-1', reason: 'Original report', status: ViolationStatus.PENDING },
    ]);
    const result = await h.service.updateViolation('violation-1', 'admin-1', {
      status: 'DISMISSED',
    });
    expect(result).toMatchObject({ reason: 'Original report', status: ViolationStatus.DISMISSED });
    expect(h.manager.remove).not.toHaveBeenCalled();
  });

  it.each([SubscriptionPlan.PRO, SubscriptionPlan.TRIAL])(
    'derives AUTO eligibility from the real %s subscription',
    async (plan) => {
      const h = harness();
      h.quota.getEffectivePlan.mockResolvedValue(plan);
      await h.service.updateStoreSettings('store-1', 'admin-1', { pricingMode: PricingMode.AUTO });
      expect(h.settings.updateStoreSettings).toHaveBeenCalledWith(
        'store-1',
        'admin-1',
        { pricingMode: PricingMode.AUTO },
        true,
        expect.any(Function),
        h.manager,
      );
      expect(h.rows(AuditLogEntity)[0]).toMatchObject({
        actorId: 'admin-1',
        action: 'ADMIN_STORE_SETTINGS_UPDATED',
      });
    },
  );

  it('does not give a BASIC subscription PRO eligibility', async () => {
    const h = harness();
    await h.service.updateStoreSettings('store-1', 'admin-1', { pricingMode: PricingMode.MANUAL });
    expect(h.settings.updateStoreSettings).toHaveBeenCalledWith(
      'store-1',
      'admin-1',
      { pricingMode: PricingMode.MANUAL },
      false,
      expect.any(Function),
      h.manager,
    );
  });

  it.each([
    { defaultPickupStart: '25:00' },
    { lateGraceMinutes: 1.5 },
    { maxQtyPerOrder: 2.5 },
    { pricingMode: null },
    { floorRatio: null },
    { defaultPickupStart: null },
  ])('rejects settings the database cannot store (%j)', async (dto) => {
    const h = harness();
    await expect(h.service.updateStoreSettings('store-1', 'admin-1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(h.settings.updateStoreSettings).not.toHaveBeenCalled();
  });

  it.each(['upgrade', 'renew', 'downgrade'])(
    'reuses existing subscription business logic for %s',
    async (action) => {
      const h = harness();
      await h.service.changeSubscription('store-1', 'admin-1', action);
      const method =
        action === 'upgrade'
          ? h.subscriptions.upgradeToPro
          : action === 'renew'
            ? h.subscriptions.renewPro
            : h.subscriptions.downgradeToBasic;
      expect(method).toHaveBeenCalledWith('store-1', h.manager);
      expect(h.manager.findOne).toHaveBeenCalledWith(
        StoreEntity,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(h.rows(AuditLogEntity)[0]).toMatchObject({ actorRole: 'ADMIN', storeId: 'store-1' });
    },
  );

  it('checks store existence and action before delegating subscription changes', async () => {
    const h = harness();
    await expect(
      h.service.changeSubscription('store-1', 'admin-1', 'delete'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      h.service.changeSubscription('missing', 'admin-1', 'upgrade'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(h.subscriptions.upgradeToPro).not.toHaveBeenCalled();
  });
});

describe('Admin subscription transactions with the real business service', () => {
  function subscriptionHarness() {
    const h = harness();
    const repo = <T extends object>(entity: new () => T) =>
      h.manager.getRepository(entity) as unknown as Repository<T>;
    const quotas = new QuotaService(repo(SubscriptionEntity), null, null, null, null);
    const cache = new Map<string, string>();
    const redis = {
      status: 'ready',
      get: jest.fn(async (key: string) => cache.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        cache.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (key: string) => (cache.delete(key) ? 1 : 0)),
    };
    const settingsService = new SettingsService(
      null,
      repo(StoreSettingsEntity),
      null,
      redis as unknown as Redis,
      h.dataSource as unknown as DataSource,
    );
    const subscriptions = new SubscriptionsService(
      repo(SubscriptionEntity),
      repo(SubscriptionInvoiceEntity),
      repo(StoreSettingsEntity),
      repo(StoreMemberEntity),
      quotas,
      settingsService,
    );
    const admin = new AdminOperationsService(
      h.dataSource as unknown as DataSource,
      settingsService,
      quotas,
      subscriptions,
    );
    const end = new Date(Date.now() + 10 * 86400000);
    h.seed(SubscriptionEntity, [
      {
        storeId: 'store-1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(),
        periodEnd: end,
      },
    ]);
    h.seed(StoreSettingsEntity, [
      { storeId: 'store-1', pricingMode: PricingMode.AUTO, floorRatio: 0.4, maxQtyPerOrder: 5 },
    ]);
    return { ...h, admin, subscriptions, end, settingsService, redis, cache };
  }

  it('serializes concurrent ADMIN renewals so two invoices extend the period by 60 days', async () => {
    const h = subscriptionHarness();
    await Promise.all([
      h.admin.changeSubscription('store-1', 'admin-1', 'renew'),
      h.admin.changeSubscription('store-1', 'admin-2', 'renew'),
    ]);
    expect(h.rows(SubscriptionInvoiceEntity)).toHaveLength(2);
    const invoices = h.rows(SubscriptionInvoiceEntity) as SubscriptionInvoiceEntity[];
    expect(new Date(invoices[0].periodStart).getTime()).toBe(h.end.getTime());
    expect(new Date(invoices[0].periodEnd).getTime()).toBe(h.end.getTime() + 30 * 86400000);
    expect(new Date(invoices[1].periodStart).getTime()).toBe(h.end.getTime() + 30 * 86400000);
    expect(new Date(invoices[1].periodEnd).getTime()).toBe(h.end.getTime() + 60 * 86400000);
    expect(invoices[0].paymentTxnId).not.toBe(invoices[1].paymentTxnId);
    expect(
      new Date((h.rows(SubscriptionEntity)[0] as SubscriptionEntity).periodEnd).getTime(),
    ).toBe(h.end.getTime() + 60 * 86400000);
  });

  it('shares the same lock with the existing STORE renewal path', async () => {
    const h = subscriptionHarness();
    await Promise.all([
      h.admin.changeSubscription('store-1', 'admin-1', 'renew'),
      h.subscriptions.renewPro('store-1'),
    ]);
    expect(h.rows(SubscriptionInvoiceEntity)).toHaveLength(2);
    expect(
      new Date((h.rows(SubscriptionEntity)[0] as SubscriptionEntity).periodEnd).getTime(),
    ).toBe(h.end.getTime() + 60 * 86400000);
  });

  it('rejects an upgrade on active PRO and creates only one invoice for duplicate upgrades', async () => {
    const h = subscriptionHarness();
    await expect(h.admin.changeSubscription('store-1', 'admin-1', 'upgrade')).rejects.toThrow(
      'PRO',
    );
    expect(h.rows(SubscriptionInvoiceEntity)).toHaveLength(0);
    h.seed(SubscriptionEntity, [
      {
        storeId: 'store-1',
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(),
        periodEnd: h.end,
      },
    ]);
    const results = await Promise.allSettled([
      h.admin.changeSubscription('store-1', 'admin-1', 'upgrade'),
      h.subscriptions.upgradeToPro('store-1'),
    ]);
    expect(results.filter((value) => value.status === 'fulfilled')).toHaveLength(1);
    expect(h.rows(SubscriptionInvoiceEntity)).toHaveLength(1);
  });

  it.each([SubscriptionInvoiceEntity, AuditLogEntity])(
    'rolls back the new period and invoice if %p cannot be persisted',
    async (failedEntity) => {
      const h = subscriptionHarness();
      const save = h.manager.save.getMockImplementation()!;
      h.manager.save.mockImplementation(async (entity) => {
        if (entity instanceof failedEntity) throw new Error('write failed');
        return save(entity);
      });
      await expect(h.admin.changeSubscription('store-1', 'admin-1', 'renew')).rejects.toThrow(
        'write failed',
      );
      expect(h.rows(SubscriptionInvoiceEntity)).toHaveLength(0);
      expect(
        new Date((h.rows(SubscriptionEntity)[0] as SubscriptionEntity).periodEnd).getTime(),
      ).toBe(h.end.getTime());
    },
  );

  it.each(['ADMIN', 'STORE'])(
    'invalidates cached AUTO only after a successful %s TRIAL downgrade commit',
    async (channel) => {
      const h = subscriptionHarness();
      h.seed(SubscriptionEntity, [
        {
          storeId: 'store-1',
          plan: SubscriptionPlan.TRIAL,
          status: SubscriptionStatus.ACTIVE,
          periodStart: new Date(),
          periodEnd: h.end,
        },
      ]);
      h.cache.set(
        `${SETTINGS_CACHE_PREFIX.STORE}store-1`,
        JSON.stringify({ storeId: 'store-1', pricingMode: PricingMode.AUTO }),
      );
      const events: string[] = [];
      const transact = h.dataSource.transaction.getMockImplementation()!;
      h.dataSource.transaction.mockImplementation(async (work) => {
        const result = await transact(work);
        events.push('commit');
        return result;
      });
      const invalidate = h.redis.del.getMockImplementation()!;
      h.redis.del.mockImplementation(async (key) => {
        events.push('invalidate');
        return invalidate(key);
      });
      if (channel === 'ADMIN') await h.admin.changeSubscription('store-1', 'admin-1', 'downgrade');
      else await h.subscriptions.downgradeToBasic('store-1');
      expect(events).toEqual(['commit', 'invalidate']);
      expect(await h.settingsService.getStoreSettings('store-1')).toMatchObject({
        pricingMode: PricingMode.MANUAL,
      });
    },
  );

  it('keeps the cached and stored AUTO settings when a downgrade rolls back on audit failure', async () => {
    const h = subscriptionHarness();
    h.seed(SubscriptionEntity, [
      {
        storeId: 'store-1',
        plan: SubscriptionPlan.TRIAL,
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(),
        periodEnd: h.end,
      },
    ]);
    h.cache.set(
      `${SETTINGS_CACHE_PREFIX.STORE}store-1`,
      JSON.stringify({ pricingMode: PricingMode.AUTO }),
    );
    const save = h.manager.save.getMockImplementation()!;
    h.manager.save.mockImplementation(async (entity) => {
      if (entity instanceof AuditLogEntity) throw new Error('audit failed');
      return save(entity);
    });
    await expect(h.admin.changeSubscription('store-1', 'admin-1', 'downgrade')).rejects.toThrow(
      'audit failed',
    );
    expect(h.redis.del).not.toHaveBeenCalled();
    expect(await h.settingsService.getStoreSettings('store-1')).toMatchObject({
      pricingMode: PricingMode.AUTO,
    });
    expect(h.rows(StoreSettingsEntity)[0]).toMatchObject({ pricingMode: PricingMode.AUTO });
  });

  it('checks AUTO eligibility under the subscription store lock so a concurrent downgrade cannot leave BASIC with AUTO', async () => {
    const h = subscriptionHarness();
    h.seed(SubscriptionEntity, [
      {
        storeId: 'store-1',
        plan: SubscriptionPlan.TRIAL,
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(),
        periodEnd: h.end,
      },
    ]);
    const results = await Promise.allSettled([
      h.admin.changeSubscription('store-1', 'admin-1', 'downgrade'),
      h.admin.updateStoreSettings('store-1', 'admin-2', { pricingMode: PricingMode.AUTO }),
    ]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1]).toMatchObject({
      status: 'rejected',
      reason: expect.any(BadRequestException),
    });
    expect(h.rows(SubscriptionEntity)[0]).toMatchObject({ plan: SubscriptionPlan.BASIC });
    expect(h.rows(StoreSettingsEntity)[0]).toMatchObject({ pricingMode: PricingMode.MANUAL });
    expect(h.manager.findOne).toHaveBeenCalledWith(
      StoreEntity,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });
});

describe('AdminOperationsService quota overrides', () => {
  const quotaInput = {
    plan: SubscriptionPlan.BASIC,
    quotaKey: QuotaKey.DAILY_OFFERS,
    quotaValue: 40,
    period: QuotaPeriod.DAILY,
  };

  it('creates a valid override and an audit entry', async () => {
    const h = harness();
    const result = await h.service.createQuota('admin-1', quotaInput);
    expect(result).toMatchObject(quotaInput);
    expect(h.rows(AuditLogEntity)[0]).toMatchObject({
      action: 'ADMIN_QUOTA_CREATED',
      actorRole: 'ADMIN',
    });
  });

  it('rejects a mismatched period, invalid value or duplicate plan/key', async () => {
    const h = harness();
    await expect(
      h.service.createQuota('admin-1', { ...quotaInput, period: QuotaPeriod.MONTHLY }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      h.service.createQuota('admin-1', { ...quotaInput, quotaValue: -1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    h.seed(PlanQuotaEntity, [{ id: 'quota-1', ...quotaInput }]);
    await expect(h.service.createQuota('admin-1', quotaInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('updates only the override value and preserves the feature and period', async () => {
    const h = harness();
    h.seed(PlanQuotaEntity, [{ id: 'quota-1', ...quotaInput }]);
    const result = await h.service.updateQuota('quota-1', 'admin-1', { quotaValue: 50 });
    expect(result).toMatchObject({ ...quotaInput, quotaValue: 50 });
  });

  it('deletes only the override, reports its default and preserves the old ID in audit', async () => {
    const h = harness();
    h.seed(PlanQuotaEntity, [{ id: 'quota-1', ...quotaInput }]);
    const result = await h.service.deleteQuota('quota-1', 'admin-1');
    expect(result).toEqual({ success: true, deletedId: 'quota-1', fallbackValue: 20 });
    expect(h.rows(PlanQuotaEntity)).toHaveLength(0);
    expect(h.rows(AuditLogEntity)[0]).toMatchObject({ oldValue: { id: 'quota-1', ...quotaInput } });
    expect(h.rows(OrderEntity)).toHaveLength(1);
    expect(h.rows(ComplaintEntity)).toHaveLength(1);
    expect(h.rows(StoreEntity)).toHaveLength(1);
  });

  it('directs all TRIAL mutations to the PRO configuration actually used by the quota engine', async () => {
    const h = harness();
    h.seed(PlanQuotaEntity, [
      { id: 'trial-quota', ...quotaInput, plan: SubscriptionPlan.TRIAL },
      { id: 'pro-quota', ...quotaInput, plan: SubscriptionPlan.PRO, quotaValue: 120 },
    ]);
    await expect(
      h.service.createQuota('admin-1', { ...quotaInput, plan: SubscriptionPlan.TRIAL }),
    ).rejects.toThrow('TRIAL');
    await expect(
      h.service.updateQuota('trial-quota', 'admin-1', { quotaValue: 10 }),
    ).rejects.toThrow('TRIAL');
    await expect(h.service.deleteQuota('trial-quota', 'admin-1')).rejects.toThrow('TRIAL');
    expect(h.rows(PlanQuotaEntity)).toHaveLength(2);
  });
});

describe('Admin operations boundary', () => {
  it('requires JWT authentication and ADMIN role for every operation', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminOperationsController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata('__guards__', AdminOperationsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('validates incoming money and quota values, including upper database integer bounds', async () => {
    for (const refundAmount of [-1, 0.5, '500', 2147483648]) {
      const dto = Object.assign(new ResolveAdminComplaintDto(), {
        decision: 'ACCEPT',
        refundAmount,
      });
      expect((await validate(dto)).length).toBeGreaterThan(0);
    }
    for (const quotaValue of [-1, 1.5, '1', 2147483648]) {
      expect(
        (await validate(Object.assign(new UpdateAdminQuotaDto(), { quotaValue }))).length,
      ).toBeGreaterThan(0);
    }
    expect(
      await validate(
        Object.assign(new CreateAdminQuotaDto(), {
          plan: 'INVALID',
          quotaKey: 'arbitrary',
          quotaValue: 1,
          period: QuotaPeriod.DAILY,
        }),
      ),
    ).toHaveLength(2);
  });
});
