import { ConflictException } from '@nestjs/common';
import { RescuePoolService, POOL_TRANSITIONS, assertPoolTransition } from './rescue-pool.service';
import {
  RescuePoolEntity,
  RescuePoolStatus as S,
} from '../../entities/rescue-pool/rescue-pool.entity';
import {
  RescuePoolRegistrationEntity,
  RescuePoolRegistrationStatus as R,
} from '../../entities/rescue-pool/rescue-pool-registration.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';

/** Query builder giả, chuỗi được; kết quả cấu hình theo entity. */
function qb(result: { one?: unknown; rawOne?: unknown; rawMany?: unknown[]; many?: unknown[] }) {
  const q: Record<string, jest.Mock> = {};
  for (const m of [
    'setLock',
    'where',
    'andWhere',
    'orWhere',
    'innerJoin',
    'select',
    'addSelect',
    'groupBy',
    'orderBy',
    'setParameters',
    'limit',
    'take',
  ]) {
    q[m] = jest.fn(() => q);
  }
  q.getOne = jest.fn(async () => result.one ?? null);
  q.getRawOne = jest.fn(async () => result.rawOne ?? { qty: 0 });
  q.getRawMany = jest.fn(async () => result.rawMany ?? []);
  q.getMany = jest.fn(async () => result.many ?? []);
  return q;
}

const future = (min: number) => new Date(Date.now() + min * 60_000);

function makePool(over: Partial<RescuePoolEntity> = {}): RescuePoolEntity {
  return Object.assign(new RescuePoolEntity(), {
    id: 'pool-1',
    storeId: 'store-1',
    poolTitle: 'Bánh mì tối',
    targetCategory: 'Bánh mì',
    targetItemId: null,
    serviceArea: 'Quận 1',
    registrationOpenAt: future(-60),
    registrationCloseAt: future(60),
    confirmDeadlineAt: future(120),
    minimumDemand: 2,
    maximumSupply: 10,
    targetBudgetMin: null,
    targetBudgetMax: null,
    pickupWindowStart: future(180),
    pickupWindowEnd: future(240),
    endCondition: 'x',
    linkedOfferId: null,
    offeredQuantity: null,
    proposedPrice: null,
    offerPickupStart: null,
    offerPickupEnd: null,
    offerVersion: 0,
    offerExpiryAt: null,
    poolStatus: S.OPEN,
    registrationCount: 0,
    confirmedOrderCount: 0,
    cancellationReason: null,
    createdBy: 'u',
    updatedBy: null,
    ...over,
  });
}

function setup(opts: {
  pool: RescuePoolEntity;
  reg?: Partial<RescuePoolRegistrationEntity> | null;
  offer?: Partial<OfferEntity> | null;
  liveConfirmedQty?: number;
  existingReg?: unknown;
}) {
  const touchedInTx: unknown[] = [];
  let inTx = false;
  const track = (e: unknown) => {
    if (inTx) touchedInTx.push(e);
  };
  const reg = opts.reg
    ? Object.assign(new RescuePoolRegistrationEntity(), {
        id: 'reg-1',
        poolId: opts.pool.id,
        customerId: 'cust-1',
        requestedQuantity: 2,
        registrationStatus: R.ACTIVE,
        linkedOrderId: null,
        ...opts.reg,
      })
    : null;

  const manager = {
    createQueryBuilder: jest.fn((entity: unknown) => {
      track(entity);
      if (entity === RescuePoolEntity) return qb({ one: opts.pool });
      if (entity === OfferEntity) return qb({ one: opts.offer ?? null });
      const q = qb({ one: reg, rawOne: { qty: opts.liveConfirmedQty ?? 0 } });
      q.innerJoin = jest.fn((joined: unknown) => {
        track(joined);
        return q;
      });
      return q;
    }),
    findOne: jest.fn(async (entity: unknown) => {
      track(entity);
      if (entity === OrderEntity) return { id: 'order-existing', code: 'SQ1' };
      if (entity === RescuePoolRegistrationEntity) return opts.existingReg ?? null;
      return null;
    }),
    find: jest.fn(async (entity: unknown) => {
      track(entity);
      return [];
    }),
    create: jest.fn((entity: unknown, data: object) => {
      track(entity);
      return { ...data };
    }),
    save: jest.fn(async (e: unknown) => {
      track((e as object)?.constructor);
      return e;
    }),
    update: jest.fn(async (entity: unknown) => {
      track(entity);
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (cb: (m: typeof manager) => Promise<unknown>) => {
      inTx = true;
      try {
        return await cb(manager);
      } finally {
        inTx = false;
      }
    }),
  };
  const ordersService = {
    holdOrder: jest.fn(async () => ({ id: 'order-new', code: 'SQNEW' })),
    cancelOrderByStore: jest.fn(),
  };
  const notificationsService = { createNotification: jest.fn() };
  const poolRepo = { findOne: jest.fn(async () => opts.pool) };
  const regRepo = { find: jest.fn(async () => []), createQueryBuilder: jest.fn(() => qb({})) };
  const storeRepo = { findOne: jest.fn(async () => ({ name: 'Quán A' })) };

  const service = new RescuePoolService(
    poolRepo as never,
    regRepo as never,
    {} as never,
    storeRepo as never,
    ordersService as never,
    notificationsService as never,
    dataSource as never,
  );
  return { service, touchedInTx, ordersService, reg, manager };
}

describe('RescuePool state machine', () => {
  it('allows the BRD happy path and rejects skipping stages', () => {
    const path = [
      S.DRAFT,
      S.OPEN,
      S.AGGREGATING,
      S.PENDING_STORE,
      S.OFFER_PUBLISHED,
      S.ORDERING_OPEN,
      S.COMPLETED,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(() => assertPoolTransition(path[i], path[i + 1])).not.toThrow();
    }
    expect(() => assertPoolTransition(S.DRAFT, S.ORDERING_OPEN)).toThrow(ConflictException);
    expect(() => assertPoolTransition(S.OPEN, S.OFFER_PUBLISHED)).toThrow(ConflictException);
  });

  it('terminal states have no exits', () => {
    for (const t of [S.COMPLETED, S.INSUFFICIENT, S.CANCELLED, S.EXPIRED]) {
      expect(POOL_TRANSITIONS[t]).toHaveLength(0);
    }
  });
});

describe('RescuePool registration invariant (BR-B02-01/10, BR-C02-01/05)', () => {
  const FORBIDDEN = [OfferEntity, OrderEntity, PaymentTransactionEntity];

  it('register never touches offers/orders/payments and never calls the order flow', async () => {
    const { service, touchedInTx, ordersService } = setup({ pool: makePool() });
    await service.register('cust-1', 'pool-1', { requestedQuantity: 2 });
    expect(ordersService.holdOrder).not.toHaveBeenCalled();
    for (const f of FORBIDDEN) expect(touchedInTx).not.toContain(f);
  });

  it('withdraw with a linked order refuses and does not cancel the order', async () => {
    const { service, ordersService } = setup({
      pool: makePool({ poolStatus: S.ORDERING_OPEN }),
      reg: { registrationStatus: R.ORDERED, linkedOrderId: 'order-1' },
    });
    await expect(service.withdraw('cust-1', 'pool-1', 'đổi ý')).rejects.toThrow(ConflictException);
    expect(ordersService.cancelOrderByStore).not.toHaveBeenCalled();
    expect(ordersService.holdOrder).not.toHaveBeenCalled();
  });

  it('blocks registration when pool is not OPEN', async () => {
    const { service } = setup({ pool: makePool({ poolStatus: S.PENDING_STORE }) });
    await expect(service.register('cust-1', 'pool-1', { requestedQuantity: 1 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('blocks duplicate active registration with 409', async () => {
    const { service } = setup({ pool: makePool(), existingReg: { id: 'reg-old' } });
    await expect(service.register('cust-1', 'pool-1', { requestedQuantity: 1 })).rejects.toThrow(
      /đã đăng ký/,
    );
  });
});

describe('RescuePool confirmOffer', () => {
  const offerPool = (over: Partial<RescuePoolEntity> = {}) => {
    const ps = future(180);
    const pe = future(240);
    return makePool({
      poolStatus: S.OFFER_PUBLISHED,
      linkedOfferId: 'offer-1',
      offeredQuantity: 5,
      proposedPrice: 30000,
      offerPickupStart: ps,
      offerPickupEnd: pe,
      offerVersion: 2,
      offerExpiryAt: future(30),
      ...over,
    });
  };
  const offerFor = (p: RescuePoolEntity) => ({
    id: 'offer-1',
    status: OfferStatus.OPEN,
    currentPrice: p.proposedPrice!,
    pickupStart: p.offerPickupStart!,
    pickupEnd: p.offerPickupEnd!,
  });

  it('creates the order through OrdersService.holdOrder inside the same transaction', async () => {
    const pool = offerPool();
    const { service, ordersService, reg, manager } = setup({
      pool,
      reg: {},
      offer: offerFor(pool),
    });
    const res = await service.confirmOffer('cust-1', 'pool-1', { offerVersion: 2 });
    expect(ordersService.holdOrder).toHaveBeenCalledWith(
      'cust-1',
      { offerId: 'offer-1', quantity: 2 },
      'cust-1',
      manager,
    );
    expect(res.idempotent).toBe(false);
    expect(reg!.linkedOrderId).toBe('order-new');
    expect(reg!.registrationStatus).toBe(R.ORDERED);
    expect(pool.poolStatus).toBe(S.ORDERING_OPEN);
  });

  it('is idempotent: an already-linked registration returns the existing order', async () => {
    const pool = offerPool();
    const { service, ordersService } = setup({
      pool,
      reg: { linkedOrderId: 'order-existing', registrationStatus: R.ORDERED },
      offer: offerFor(pool),
    });
    const res = await service.confirmOffer('cust-1', 'pool-1', { offerVersion: 2 });
    expect(res.idempotent).toBe(true);
    expect(res.order).toEqual(expect.objectContaining({ id: 'order-existing' }));
    expect(ordersService.holdOrder).not.toHaveBeenCalled();
  });

  it.each([
    ['stale offer version', offerPool(), { offerVersion: 1 }, 0],
    ['expired offer', offerPool({ offerExpiryAt: future(-1) }), { offerVersion: 2 }, 0],
    ['supply exceeded', offerPool(), { offerVersion: 2 }, 4],
  ])('rejects %s without creating an order', async (_label, pool, dto, live) => {
    const { service, ordersService } = setup({
      pool,
      reg: {},
      offer: offerFor(pool),
      liveConfirmedQty: live,
    });
    await expect(service.confirmOffer('cust-1', 'pool-1', dto)).rejects.toThrow(ConflictException);
    expect(ordersService.holdOrder).not.toHaveBeenCalled();
  });

  it('rejects when the source offer price changed after publication', async () => {
    const pool = offerPool();
    const { service, ordersService } = setup({
      pool,
      reg: {},
      offer: { ...offerFor(pool), currentPrice: 35000 },
    });
    await expect(service.confirmOffer('cust-1', 'pool-1', { offerVersion: 2 })).rejects.toThrow(
      /đã thay đổi/,
    );
    expect(ordersService.holdOrder).not.toHaveBeenCalled();
  });

  it('completes the pool when the last supply is confirmed', async () => {
    const pool = offerPool({ poolStatus: S.ORDERING_OPEN });
    const { service } = setup({ pool, reg: {}, offer: offerFor(pool), liveConfirmedQty: 3 });
    await service.confirmOffer('cust-1', 'pool-1', { offerVersion: 2 });
    expect(pool.poolStatus).toBe(S.COMPLETED);
  });
});
