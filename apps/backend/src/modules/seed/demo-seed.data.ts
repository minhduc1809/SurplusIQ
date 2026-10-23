import { createHash } from 'crypto';
import type { DeepPartial, EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { BackupPinEngine, ReconciliationEngine } from '@surplusiq/core';
import * as E from '../../entities';
import { PLAN_QUOTAS_MAP } from '../subscriptions/quota.constants';
import { DEFAULT_PLATFORM_SETTINGS } from '../settings/settings.constants';
import { DEMO_STORES, DEMO_ITEMS, DEMO_OFFERS } from './demo-seed.catalog';

export const DEMO_OWNER_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_CUSTOMER_ID = '22222222-2222-2222-2222-222222222222';
export const DEFAULT_DEMO_ADMIN_EMAIL = 'admin@surplusiq.vn';
export const DEFAULT_DEMO_ADMIN_PASSWORD = 'Admin@SurplusIQ2026';

export function demoId(key: string): string {
  const hash = createHash('sha256').update(`surplusiq-demo-v2:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export interface DemoSeedOptions {
  now: Date;
  adminId: string;
  adminEmail: string;
  adminPasswordHash: string;
  demoPasswordHash: string;
}

export interface DemoSeedStep {
  table: string;
  planned: number;
  run: (manager: EntityManager) => Promise<number>;
}

/** Insert-only batches retain entity typing and never upsert business/user state. */
function seedStep<T extends ObjectLiteral>(
  target: EntityTarget<T>,
  rows: DeepPartial<T>[],
): DemoSeedStep {
  return {
    table: typeof target === 'function' ? target.name : String(target),
    planned: rows.length,
    async run(manager) {
      if (!rows.length) return 0;
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(target)
        .values(rows as QueryDeepPartialEntity<T>[])
        .orIgnore()
        .returning('1')
        .execute();
      return result.raw.length;
    },
  };
}

export function buildDemoSeed(options: DemoSeedOptions) {
  const { now, adminId, adminEmail, adminPasswordHash, demoPasswordHash } = options;
  const steps: DemoSeedStep[] = [];
  const add = <T extends ObjectLiteral>(target: EntityTarget<T>, rows: DeepPartial<T>[]) => {
    const step = seedStep(target, rows);
    steps.push(step);
  };
  const day = 86400000;
  const point = (longitude: number, latitude: number) => () =>
    `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`;
  const proPrice = Number(DEFAULT_PLATFORM_SETTINGS['plan.pro_price_vnd'].value);
  const at = (days: number, hours = 0) => new Date(now.getTime() + days * day + hours * 3600000);
  const date = (days: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(at(days));
  const previousWeek = ReconciliationEngine.getIsoWeekPeriod(at(-7));
  const users: DeepPartial<E.UserEntity>[] = [
    {
      id: adminId,
      email: adminEmail,
      phone: null,
      role: E.UserRole.ADMIN,
      status: E.UserStatus.ACTIVE,
      passwordHash: adminPasswordHash,
    },
    {
      id: DEMO_OWNER_ID,
      email: 'owner@rincon.vn',
      phone: '0909000001',
      role: E.UserRole.STORE_USER,
      status: E.UserStatus.ACTIVE,
      passwordHash: demoPasswordHash,
    },
    {
      id: DEMO_CUSTOMER_ID,
      email: 'customer@surplusiq.vn',
      phone: '0901234567',
      role: E.UserRole.CUSTOMER,
      status: E.UserStatus.ACTIVE,
      passwordHash: demoPasswordHash,
    },
  ];
  const customerIds = [DEMO_CUSTOMER_ID];
  for (let i = 1; i <= 9; i++) {
    const id = demoId(`customer:${i}`);
    customerIds.push(id);
    users.push({
      id,
      email: `customer${i}@surplusiq.test`,
      phone: `09200000${String(i).padStart(2, '0')}`,
      role: E.UserRole.CUSTOMER,
      status: i === 9 ? E.UserStatus.LOCKED : E.UserStatus.ACTIVE,
      passwordHash: demoPasswordHash,
    });
  }
  const ownerIds = [DEMO_OWNER_ID];
  for (let i = 1; i <= 7; i++) {
    const id = demoId(`owner:${i}`);
    ownerIds.push(id);
    users.push({
      id,
      email: `owner${i + 1}@surplusiq.test`,
      phone: `09300000${String(i).padStart(2, '0')}`,
      role: E.UserRole.STORE_USER,
      status: E.UserStatus.ACTIVE,
      passwordHash: demoPasswordHash,
    });
  }
  for (let i = 0; i < 2; i++)
    users.push({
      id: demoId(`staff:${i}`),
      email: `${i === 0 ? 'manager' : 'counter'}@surplusiq.test`,
      phone: `094000000${i}`,
      role: E.UserRole.STORE_USER,
      status: E.UserStatus.ACTIVE,
      passwordHash: demoPasswordHash,
    });
  add(E.UserEntity, users);
  add(
    E.CustomerProfileEntity,
    customerIds.map((userId, i) => ({
      userId,
      fullName: i === 0 ? 'Trần Minh Đức' : `Khách hàng Demo ${i}`,
      searchRadiusKm: 5,
      notificationPreferences: { orders: true, promotions: false },
    })),
  );
  add(
    E.DietaryProfileEntity,
    customerIds.map((userId) => ({ userId, allergens: [], excludedItems: [] })),
  );
  add(
    E.ConsentEntity,
    customerIds.flatMap((userId) =>
      [E.ConsentType.TERMS, E.ConsentType.LOCATION].map((type) => ({
        id: demoId(`consent:${userId}:${type}`),
        userId,
        type,
        version: 'demo-v2',
        granted: true,
      })),
    ),
  );

  const businessStoreIds = [
    DEMO_STORES[0].id,
    ...Array.from({ length: 5 }, (_, i) => demoId(`store:${i + 1}`)),
  ];
  const stores: DeepPartial<E.StoreEntity>[] = DEMO_STORES.map((s) => ({
    id: s.id,
    ownerUserId: DEMO_OWNER_ID,
    name: s.name,
    address: s.address,
    location: point(s.lng, s.lat),
    phone: s.phone,
    logoUrl: s.logoUrl,
    status: E.StoreStatus.ACTIVE,
    ratingAvg: s.rating,
    ratingCount: s.count,
    isDemo: true,
  }));
  for (let i = 1; i <= 7; i++) {
    const source = DEMO_STORES[i % DEMO_STORES.length];
    stores.push({
      id: demoId(`store:${i}`),
      ownerUserId: ownerIds[i],
      name: `${source.name} • Demo ${i}`,
      address: source.address,
      location: point(source.lng, source.lat),
      phone: `0283900000${i}`,
      logoUrl: source.logoUrl,
      status:
        i === 6
          ? E.StoreStatus.PENDING_VERIFY
          : i === 7
            ? E.StoreStatus.SUSPENDED
            : E.StoreStatus.ACTIVE,
      isDemo: true,
      ratingAvg: 0,
      ratingCount: 0,
    });
  }
  add(E.StoreEntity, stores);
  add(
    E.StoreSettingsEntity,
    stores.map((s) => ({
      storeId: s.id,
      defaultPickupStart: '21:30:00',
      defaultPickupEnd: '23:30:00',
      floorRatio: 0.4,
      pricingMode: E.PricingMode.MANUAL,
      taskReminders: { closingChecklist: true },
    })),
  );
  add(
    E.StoreMemberEntity,
    ownerIds.map((userId, i) => ({
      id: demoId(`member:${i}`),
      userId,
      storeId: i === 0 ? businessStoreIds[0] : demoId(`store:${i}`),
      permission: E.StorePermission.OWNER,
      status: E.StoreMemberStatus.ACTIVE,
    })),
  );
  add(
    E.StoreMemberEntity,
    [E.StorePermission.MANAGER, E.StorePermission.COUNTER].map((permission, i) => ({
      id: demoId(`staff-member:${i}`),
      storeId: businessStoreIds[0],
      userId: demoId(`staff:${i}`),
      permission,
      status: E.StoreMemberStatus.ACTIVE,
    })),
  );

  const items: DeepPartial<E.ItemEntity>[] = DEMO_ITEMS.map((item) => ({
    id: item.id,
    storeId: item.storeId,
    name: item.name,
    category: item.category,
    originalPrice: item.originalPrice,
    standardShelfLifeHours: item.shelfLife,
    allergens: item.allergens,
    imageUrl: item.imageUrl,
    description: item.description,
    status: E.ItemStatus.ACTIVE,
  }));
  const businessItemIds = [DEMO_ITEMS[0].id];
  for (let i = 1; i < businessStoreIds.length; i++) {
    const source = DEMO_ITEMS[i];
    businessItemIds.push(demoId(`item:${i}`));
    items.push({
      id: businessItemIds[i],
      storeId: businessStoreIds[i],
      name: source.name,
      category: source.category,
      originalPrice: source.originalPrice,
      standardShelfLifeHours: source.shelfLife,
      allergens: source.allergens,
      imageUrl: source.imageUrl,
      description: `${source.description} (Dữ liệu demo)`,
      status: E.ItemStatus.ACTIVE,
    });
  }
  add(E.ItemEntity, items);
  const offers: DeepPartial<E.OfferEntity>[] = DEMO_OFFERS.map((off) => ({
    ...off,
    kind: E.OfferKind.SURPRISE_BAG,
    floorPrice: Math.ceil(off.originalPrice * 0.4),
    currentPrice: Math.max(off.currentPrice, Math.ceil(off.originalPrice * 0.4)),
    soldQuantity: off.totalQuantity - off.remainingQuantity,
    pickupStart: at(0),
    pickupEnd: at(2),
    expiresAt: at(2),
    status: E.OfferStatus.OPEN,
  }));
  const publicOfferIds = businessStoreIds.map((_, i) => demoId(`public-offer:${i}:${date(0)}`));
  for (let i = 0; i < businessStoreIds.length; i++) {
    const originalPrice = DEMO_ITEMS[i].originalPrice;
    offers.push({
      id: publicOfferIds[i],
      storeId: businessStoreIds[i],
      itemId: businessItemIds[i],
      kind: E.OfferKind.SURPRISE_BAG,
      totalQuantity: 30,
      remainingQuantity: 30,
      soldQuantity: 0,
      originalPrice,
      floorPrice: Math.ceil(originalPrice * 0.4),
      currentPrice: Math.ceil(originalPrice * 0.5),
      pickupStart: at(0),
      pickupEnd: at(2),
      expiresAt: at(2),
      status: E.OfferStatus.OPEN,
    });
  }

  const orders: DeepPartial<E.OrderEntity>[] = [];
  const payments: DeepPartial<E.PaymentTransactionEntity>[] = [];
  const pickups: DeepPartial<E.PickupTokenEntity>[] = [];
  const proxies: DeepPartial<E.ProxyPickupCodeEntity>[] = [];
  const noshows: DeepPartial<E.NoshowRecordEntity>[] = [];
  const reviews: DeepPartial<E.ReviewEntity>[] = [];
  const complaints: DeepPartial<E.ComplaintEntity>[] = [];
  const attachments: DeepPartial<E.ComplaintAttachmentEntity>[] = [];
  const notifications: DeepPartial<E.NotificationEntity>[] = [];
  const statuses = [
    E.OrderStatus.PENDING_PAYMENT,
    E.OrderStatus.PAID,
    E.OrderStatus.PICKED_UP,
    E.OrderStatus.PICKED_UP,
    E.OrderStatus.PICKED_UP,
    E.OrderStatus.PICKED_UP,
    E.OrderStatus.PICKED_UP,
    E.OrderStatus.HOLD_EXPIRED,
    E.OrderStatus.PICKUP_EXPIRED,
    E.OrderStatus.CANCELLED,
    E.OrderStatus.REFUNDED,
    E.OrderStatus.PICKED_UP,
  ];
  for (let i = 0; i < businessStoreIds.length; i++) {
    const storeId = businessStoreIds[i];
    for (let j = 0; j < statuses.length; j++) {
      const key = `${i}:${j}`;
      const status = statuses[j];
      const active = status === E.OrderStatus.PENDING_PAYMENT || status === E.OrderStatus.PAID;
      const completed =
        j === 11
          ? new Date(new Date(previousWeek.startDate).getTime() + 3 * day + 19 * 3600000)
          : at(-((j % 6) + 1));
      const pickupStart =
        active || status === E.OrderStatus.HOLD_EXPIRED
          ? at(0, 1)
          : new Date(completed.getTime() - 3600000);
      const pickupEnd = active || status === E.OrderStatus.HOLD_EXPIRED ? at(0, 6) : completed;
      const id = demoId(`order:${key}`);
      const offerId = demoId(`order-offer:${key}`);
      const customerId = customerIds[j % 8];
      const quantity = (j % 2) + 1;
      const unitPrice = Math.ceil(DEMO_ITEMS[i].originalPrice * 0.5);
      const totalAmount = quantity * unitPrice;
      const paid = [
        E.OrderStatus.PAID,
        E.OrderStatus.PICKED_UP,
        E.OrderStatus.PICKUP_EXPIRED,
        E.OrderStatus.REFUNDED,
      ].includes(status);
      const stockConsumed = [
        E.OrderStatus.PENDING_PAYMENT,
        E.OrderStatus.PAID,
        E.OrderStatus.PICKED_UP,
        E.OrderStatus.PICKUP_EXPIRED,
      ].includes(status);
      const createdAt = active
        ? new Date(now.getTime() - 120000)
        : new Date(completed.getTime() - 7200000);
      offers.push({
        id: offerId,
        storeId,
        itemId: businessItemIds[i],
        kind: E.OfferKind.REGULAR,
        totalQuantity: 4,
        remainingQuantity: stockConsumed ? 4 - quantity : 4,
        soldQuantity: paid && status !== E.OrderStatus.REFUNDED ? quantity : 0,
        originalPrice: DEMO_ITEMS[i].originalPrice,
        floorPrice: Math.ceil(DEMO_ITEMS[i].originalPrice * 0.4),
        currentPrice: unitPrice,
        pickupStart,
        pickupEnd,
        expiresAt: pickupEnd,
        status:
          active || status === E.OrderStatus.HOLD_EXPIRED
            ? E.OfferStatus.OPEN
            : status === E.OrderStatus.CANCELLED
              ? E.OfferStatus.CANCELLED
              : E.OfferStatus.CLOSED,
        createdAt,
      });
      orders.push({
        id,
        code: `DEMO${String(i).padStart(2, '0')}${String(j).padStart(6, '0')}`,
        customerId,
        storeId,
        offerId,
        quantity,
        unitPrice,
        totalAmount,
        discountAmount: 0,
        status,
        holdExpiresAt:
          status === E.OrderStatus.PENDING_PAYMENT
            ? new Date(now.getTime() + 600000)
            : new Date(createdAt.getTime() + 600000),
        pickupSlot: pickupStart,
        paidAt: paid ? new Date(createdAt.getTime() + 60000) : null,
        pickedUpAt:
          status === E.OrderStatus.PICKED_UP ? new Date(pickupEnd.getTime() - 1800000) : null,
        pickedUpBy: status === E.OrderStatus.PICKED_UP ? ownerIds[i] : null,
        cancelledAt: status === E.OrderStatus.CANCELLED ? createdAt : null,
        cancelReason:
          status === E.OrderStatus.CANCELLED ? 'Khách hủy đơn demo trước giờ nhận' : null,
        cancelledBy: status === E.OrderStatus.CANCELLED ? E.CancelledBy.CUSTOMER : null,
        note: 'Dữ liệu demo seed v2',
        createdAt,
        updatedAt: active ? now : completed,
      });
      const gatewayTxnId = `SEED-V2-PAYMENT-${key}`;
      if (paid || status === E.OrderStatus.PENDING_PAYMENT)
        payments.push({
          id: demoId(`payment:${key}`),
          orderId: id,
          storeId,
          kind: E.PaymentKind.ORDER_PAYMENT,
          amount: totalAmount,
          method: E.PaymentMethod.SIMULATED,
          gatewayTxnId,
          status: paid ? E.PaymentStatus.SUCCEEDED : E.PaymentStatus.PENDING_CONFIRM,
          createdAt,
        });
      if (status === E.OrderStatus.REFUNDED)
        payments.push({
          id: demoId(`refund:${key}`),
          orderId: id,
          storeId,
          kind: E.PaymentKind.ORDER_REFUND,
          amount: totalAmount,
          method: E.PaymentMethod.SIMULATED,
          gatewayTxnId: `SEED-V2-REFUND-${key}`,
          parentTxnId: gatewayTxnId,
          status: E.PaymentStatus.SUCCEEDED,
          createdAt: completed,
        });
      if (paid)
        pickups.push({
          id: demoId(`pickup:${key}`),
          orderId: id,
          backupCode: BackupPinEngine.generate(),
          expiresAt: new Date(pickupEnd.getTime() + 900000),
          status:
            status === E.OrderStatus.PAID
              ? E.PickupTokenStatus.UNUSED
              : status === E.OrderStatus.PICKED_UP
                ? E.PickupTokenStatus.USED
                : status === E.OrderStatus.REFUNDED
                  ? E.PickupTokenStatus.REVOKED
                  : E.PickupTokenStatus.EXPIRED,
          usedAt:
            status === E.OrderStatus.PICKED_UP ? new Date(pickupEnd.getTime() - 1800000) : null,
        });
      if (status === E.OrderStatus.PAID)
        proxies.push({
          id: demoId(`proxy:${key}`),
          orderId: id,
          code: createHash('sha256').update(key).digest('hex').slice(0, 8).toUpperCase(),
          status: E.ProxyPickupCodeStatus.UNUSED,
          expiresAt: new Date(pickupEnd.getTime() + 900000),
        });
      if (status === E.OrderStatus.PICKUP_EXPIRED)
        noshows.push({
          id: demoId(`noshow:${key}`),
          customerId,
          orderId: id,
          occurredAt: pickupEnd,
          excluded: false,
        });
      if (status === E.OrderStatus.PICKED_UP)
        reviews.push({
          id: demoId(`review:${key}`),
          orderId: id,
          customerId,
          storeId,
          rating: j % 2 === 0 ? 5 : 4,
          comment: 'Đánh giá demo: đóng gói tốt, nhận món đúng hẹn.',
          status: E.ReviewStatus.VISIBLE,
          storeReply: 'Cảm ơn bạn đã cùng SurplusIQ cứu món!',
          storeReplyAt: completed,
          createdAt: completed,
        });
      if (j === 2 || j === 3 || j === 4 || status === E.OrderStatus.REFUNDED) {
        const complaintStatus =
          j === 2
            ? E.ComplaintStatus.PENDING_STORE
            : j === 3
              ? E.ComplaintStatus.REJECTED
              : j === 4
                ? E.ComplaintStatus.CLOSED
                : E.ComplaintStatus.ACCEPTED;
        const complaintId = demoId(`complaint:${key}`);
        complaints.push({
          id: complaintId,
          orderId: id,
          customerId,
          storeId,
          category: 'QUALITY',
          description: 'Khiếu nại minh họa seed: cần kiểm tra chất lượng và đóng gói.',
          status: complaintStatus,
          responseDueAt: j === 2 ? at(1) : completed,
          refundAmount: status === E.OrderStatus.REFUNDED ? totalAmount : 0,
          rejectReason: j === 3 ? 'Dữ liệu demo: bằng chứng chưa xác nhận lỗi chất lượng.' : null,
          createdAt: completed,
        });
        attachments.push({
          id: demoId(`attachment:${key}`),
          complaintId,
          url: DEMO_ITEMS[i].imageUrl,
          addedRound: 0,
        });
      }
      notifications.push({
        id: demoId(`notification:${key}`),
        userId: customerId,
        storeId: null,
        type: E.NotificationType.ORDER,
        title: 'Đơn hàng demo SurplusIQ',
        body: `Trạng thái minh họa: ${status}`,
        data: { orderId: id, demo: true },
        isRead: j % 2 === 0,
        readAt: j % 2 === 0 ? completed : null,
        createdAt,
      });
    }
  }
  add(E.OfferEntity, offers);
  add(
    E.SurpriseBagItemEntity,
    publicOfferIds.map((offerId, i) => ({ offerId, itemId: businessItemIds[i], quantity: 1 })),
  );
  add(
    E.OfferEventEntity,
    offers.map((offer) => ({
      id: demoId(`offer-event:${offer.id}`),
      offerId: offer.id,
      actorId: DEMO_OWNER_ID,
      type: E.OfferEventType.CREATED,
      payload: { demo: true },
      createdAt: offer.createdAt ?? now,
    })),
  );
  add(E.OrderEntity, orders);
  add(E.PaymentTransactionEntity, payments);
  add(E.PickupTokenEntity, pickups);
  add(E.ProxyPickupCodeEntity, proxies);
  add(E.NoshowRecordEntity, noshows);
  add(E.ReviewEntity, reviews);
  add(E.ComplaintEntity, complaints);
  add(E.ComplaintAttachmentEntity, attachments);
  add(E.NotificationEntity, notifications);

  const dailyActuals: DeepPartial<E.DailyActualEntity>[] = [];
  const forecasts: DeepPartial<E.ForecastEntity>[] = [];
  const statements: DeepPartial<E.WeeklyStatementEntity>[] = [];
  const statementLines: DeepPartial<E.StatementLineEntity>[] = [];
  const subscriptions: DeepPartial<E.SubscriptionEntity>[] = [];
  const invoices: DeepPartial<E.SubscriptionInvoiceEntity>[] = [];
  const promotions: DeepPartial<E.PromotionEntity>[] = [];
  const wallets: DeepPartial<E.PromotionWalletEntity>[] = [];
  const campaigns: DeepPartial<E.CampaignEntity>[] = [];
  const deliveries: DeepPartial<E.CampaignDeliveryEntity>[] = [];
  const audits: DeepPartial<E.AuditLogEntity>[] = [];
  for (let i = 0; i < businessStoreIds.length; i++) {
    const storeId = businessStoreIds[i],
      itemId = businessItemIds[i];
    const plan = [E.SubscriptionPlan.PRO, E.SubscriptionPlan.TRIAL, E.SubscriptionPlan.BASIC][
      i % 3
    ];
    subscriptions.push({
      storeId,
      plan,
      periodStart: at(-10),
      periodEnd: at(20),
      status: E.SubscriptionStatus.ACTIVE,
      trialUsed: plan !== E.SubscriptionPlan.BASIC,
    });
    if (plan === E.SubscriptionPlan.PRO) {
      const transactionId = `SEED-V2-SUBSCRIPTION-${i}`;
      invoices.push({
        id: demoId(`invoice:${i}`),
        storeId,
        periodStart: at(-10),
        periodEnd: at(20),
        amount: proPrice,
        paymentTxnId: transactionId,
        status: E.InvoiceStatus.PAID,
      });
      add(E.PaymentTransactionEntity, [
        {
          id: demoId(`subscription-payment:${i}`),
          storeId,
          kind: E.PaymentKind.SUBSCRIPTION_PAYMENT,
          amount: proPrice,
          method: E.PaymentMethod.SIMULATED,
          gatewayTxnId: transactionId,
          status: E.PaymentStatus.SUCCEEDED,
        },
      ]);
    }
    for (let d = 1; d <= 28; d++)
      dailyActuals.push({
        id: demoId(`actual:${i}:${date(-d)}`),
        storeId,
        itemId,
        date: date(-d),
        produced: 30 + (d % 7),
        soldOffline: 18 + (d % 5),
        soldApp: 6 + (d % 3),
        lockedAt: at(-d),
      });
    forecasts.push({
      id: demoId(`forecast:${i}:${date(1)}`),
      storeId,
      itemId,
      targetDate: date(1),
      recommended: 32,
      low: 28,
      high: 36,
      confidence: E.ForecastConfidence.MEDIUM,
      method: E.ForecastMethod.DOW_AVG,
      components: {
        demo: true,
        sampleDays: 28,
        explanation: 'Dữ liệu minh họa từ 28 ngày lịch sử demo',
      },
    });
    const period = ReconciliationEngine.getIsoWeekPeriod(at(-7));
    const eligible = orders.filter(
      (o) =>
        o.storeId === storeId &&
        [E.OrderStatus.PICKED_UP, E.OrderStatus.PICKUP_EXPIRED].includes(
          o.status as E.OrderStatus,
        ) &&
        new Date(o.createdAt as Date) >= new Date(period.startDate) &&
        new Date(o.createdAt as Date) <= new Date(period.endDate),
    );
    const statementId = demoId(`statement:${storeId}:${period.cycleId}`);
    const result = ReconciliationEngine.calculate({
      storeId,
      period,
      orders: eligible.map((o) => ({
        orderId: o.id as string,
        amount: o.totalAmount as number,
        status: o.status as 'PICKED_UP' | 'PICKUP_EXPIRED',
        completedAt: o.updatedAt as Date,
      })),
      generatedAt: now,
      lockStatus: 'LOCKED',
    });
    const checksum = ReconciliationEngine.computeChecksum({
      statementId,
      storeId,
      cycleId: period.cycleId,
      grossSales: result.grossSales,
      commissionAmount: result.commissionAmount,
      refundsDeduction: 0,
      subscriptionFee: 0,
      totalAdjustments: 0,
      netPayout: result.netPayout,
      generatedAt: now,
    });
    statements.push({
      id: statementId,
      storeId,
      weekStart: new Date(period.startDate).toISOString().slice(0, 10),
      weekEnd: new Date(period.endDate).toISOString().slice(0, 10),
      gross: result.grossSales,
      commission: result.commissionAmount,
      refunds: 0,
      subscriptionFee: 0,
      adjustments: 0,
      netPayable: result.netPayout,
      status: E.StatementStatus.LOCKED,
      checksum,
      flags: {
        demo: true,
        cycleId: period.cycleId,
        generatedAt: now.toISOString(),
        checksumValid: true,
      },
      createdAt: now,
    });
    eligible.forEach((o) =>
      statementLines.push({
        id: demoId(`statement-line:${statementId}:${o.id}`),
        statementId,
        orderId: o.id,
        type: 'ORDER',
        amount: o.totalAmount,
        commission: Math.round((o.totalAmount as number) * 0.1),
      }),
    );
    const promotionId = demoId(`promotion:${i}`);
    promotions.push({
      id: promotionId,
      storeId,
      name: 'Ưu đãi demo cứu món 10%',
      type: E.PromotionType.PERCENT,
      value: 10,
      target: E.PromotionTarget.ALL,
      maxUses: 100,
      usedCount: 0,
      startAt: at(-1),
      endAt: at(30),
      minOrderAmount: 20000,
      status: E.PromotionStatus.ACTIVE,
    });
    wallets.push({ customerId: DEMO_CUSTOMER_ID, promotionId, claimedAt: now });
    const campaignId = demoId(`campaign:${i}`);
    campaigns.push({
      id: campaignId,
      storeId,
      title: 'Chiến dịch demo chống lãng phí',
      content: 'Nội dung minh họa trong seed, không gửi thông báo ra ngoài.',
      target: 'ALL',
      scheduledAt: at(-1),
      status: E.CampaignStatus.SENT,
    });
    deliveries.push({
      id: demoId(`delivery:${i}`),
      campaignId,
      customerId: DEMO_CUSTOMER_ID,
      sentAt: at(-1),
      openedAt: at(-1, 1),
    });
    audits.push({
      id: demoId(`audit:${i}`),
      storeId,
      actorId: ownerIds[i],
      actorRole: E.UserRole.STORE_USER,
      action: 'DEMO_DATA_SEEDED',
      targetType: 'STORE',
      targetId: storeId,
      newValue: { demo: true, version: 2 },
    });
  }
  add(E.SubscriptionEntity, subscriptions);
  add(E.SubscriptionInvoiceEntity, invoices);
  add(
    E.PlanQuotaEntity,
    Object.values(E.SubscriptionPlan).flatMap((plan) =>
      Object.values(PLAN_QUOTAS_MAP).map((q) => ({
        id: demoId(`quota:${plan}:${q.key}`),
        plan,
        quotaKey: q.key,
        quotaValue: q.limits[plan],
        period: q.period,
      })),
    ),
  );
  add(E.DailyActualEntity, dailyActuals);
  add(E.ForecastEntity, forecasts);
  add(E.WeeklyStatementEntity, statements);
  add(E.StatementLineEntity, statementLines);
  add(E.PromotionEntity, promotions);
  add(E.PromotionWalletEntity, wallets);
  add(E.CampaignEntity, campaigns);
  add(E.CampaignDeliveryEntity, deliveries);
  add(E.AuditLogEntity, audits);
  add(E.AuditLogEntity, [
    {
      id: demoId('seed-anchor'),
      storeId: null,
      actorId: adminId,
      actorRole: E.UserRole.ADMIN,
      action: 'DEMO_SEED_INITIALIZED',
      targetType: 'SYSTEM',
      targetId: 'seed-v2',
      newValue: { demo: true, version: 2 },
      createdAt: now,
    },
  ]);
  add(
    E.PlatformSettingEntity,
    Object.entries(DEFAULT_PLATFORM_SETTINGS).map(([key, value]) => ({ key, ...value })),
  );
  add(E.SavedPlaceEntity, [
    {
      id: demoId('saved-place'),
      userId: DEMO_CUSTOMER_ID,
      label: 'Nhà demo',
      location: point(106.7001, 10.7765),
      radiusKm: 5,
    },
  ]);
  add(E.SavedFilterEntity, [
    {
      id: demoId('saved-filter'),
      userId: DEMO_CUSTOMER_ID,
      name: 'Bánh gần đây',
      criteria: { category: 'Baked goods', maxPrice: 60000 },
    },
  ]);
  add(E.DealAlertEntity, [
    {
      id: demoId('deal-alert'),
      userId: DEMO_CUSTOMER_ID,
      criteria: { category: 'Baked goods', maxPrice: 60000 },
      isActive: true,
    },
  ]);
  add(
    E.FavoriteStoreEntity,
    businessStoreIds.map((storeId) => ({
      id: demoId(`favorite:${storeId}`),
      userId: DEMO_CUSTOMER_ID,
      storeId,
    })),
  );
  add(
    E.SavedDealEntity,
    publicOfferIds.map((offerId) => ({
      id: demoId(`saved:${offerId}`),
      userId: DEMO_CUSTOMER_ID,
      offerId,
    })),
  );
  add(
    E.ViewHistoryEntity,
    publicOfferIds.map((offerId) => ({
      id: demoId(`view:${offerId}`),
      userId: DEMO_CUSTOMER_ID,
      offerId,
      viewedAt: now,
    })),
  );
  add(E.StoreClosureEntity, [
    {
      id: demoId(`closure:${date(7)}`),
      storeId: businessStoreIds[0],
      date: date(7),
      type: E.StoreClosureType.CLOSED,
    },
  ]);
  add(E.StoreSettingsHistoryEntity, [
    {
      id: demoId('settings-history'),
      storeId: businessStoreIds[0],
      actorId: DEMO_OWNER_ID,
      key: 'pricing_mode',
      oldValue: 'AUTO',
      newValue: 'MANUAL',
    },
  ]);
  add(
    E.CustomerNoteEntity,
    customerIds.slice(0, 8).map((customerId, i) => ({
      storeId: businessStoreIds[0],
      customerId,
      note: `Ghi chú demo ${i}: ưu tiên đóng gói thân thiện môi trường.`,
    })),
  );
  add(
    E.CustomerSegmentEntity,
    customerIds.slice(0, 8).map((customerId) => ({
      storeId: businessStoreIds[0],
      customerId,
      segment: E.SegmentType.NEW,
      computedAt: now,
    })),
  );
  add(
    E.UsageLogEntity,
    businessStoreIds.map((storeId) => ({
      id: demoId(`usage:${storeId}`),
      storeId,
      userId: null,
      quotaKey: 'daily_offers',
      units: 1,
      refId: publicOfferIds[businessStoreIds.indexOf(storeId)],
    })),
  );
  add(E.SpecialEventEntity, [
    {
      id: demoId(`special-event:${date(7)}`),
      storeId: businessStoreIds[0],
      date: date(7),
      type: 'DEMO_COMMUNITY_DAY',
      impactFactor: 1.2,
    },
  ]);
  add(E.PriceProposalEntity, [
    {
      id: demoId(`price-proposal:${date(0)}`),
      offerId: publicOfferIds[0],
      oldPrice: 45000,
      proposedPrice: 40000,
      components: { demo: true, explanation: 'Đề xuất demo, chưa áp dụng giá' },
      status: E.ProposalStatus.PENDING,
      expiresAt: at(1),
    },
  ]);
  add(E.ViolationReportEntity, [
    {
      id: demoId('violation-report'),
      reporterId: DEMO_CUSTOMER_ID,
      targetType: 'STORE',
      targetId: businessStoreIds[0],
      reason: 'Báo cáo minh họa để kiểm tra quy trình, không phải vi phạm thật.',
      status: E.ViolationStatus.PENDING,
    },
  ]);
  const ticketId = demoId('support-ticket');
  add(E.SupportTicketEntity, [
    {
      id: ticketId,
      userId: DEMO_CUSTOMER_ID,
      subject: 'Yêu cầu hỗ trợ demo: tra cứu khung giờ nhận món',
      status: E.TicketStatus.ANSWERED,
    },
  ]);
  add(E.SupportMessageEntity, [
    {
      id: demoId('support-message:customer'),
      ticketId,
      senderId: DEMO_CUSTOMER_ID,
      message: 'Tin nhắn minh họa: tôi có thể nhận món vào khung giờ nào?',
      isInternal: false,
    },
    {
      id: demoId('support-message:admin'),
      ticketId,
      senderId: adminId,
      message: 'Phản hồi demo: vui lòng xem khung giờ trên chi tiết đơn.',
      isInternal: false,
    },
  ]);
  add(E.AnomalyEntity, [
    {
      id: demoId('anomaly'),
      storeId: businessStoreIds[0],
      metric: 'sold_app',
      date: date(-1),
      expectedValue: 8,
      actualValue: 20,
      madScore: 3.2,
      status: E.AnomalyStatus.OPEN,
      feedback: 'Tình huống minh họa cho màn hình phân tích.',
    },
  ]);
  add(E.ActionCardEntity, [
    {
      id: demoId('action-card'),
      storeId: businessStoreIds[0],
      actionType: 'REVIEW_PRODUCTION',
      payload: { demo: true, itemId: businessItemIds[0] },
      reasonText: 'Thẻ demo dựa trên dữ liệu lịch sử minh họa.',
      expectedOutcome: 'Tham khảo kế hoạch sản xuất ngày mai.',
      status: E.ActionCardStatus.PENDING,
      expiresAt: at(2),
    },
  ]);
  const donationOfferId = demoId('donation-offer');
  add(E.OfferEntity, [
    {
      id: donationOfferId,
      storeId: businessStoreIds[0],
      itemId: businessItemIds[0],
      kind: E.OfferKind.REGULAR,
      totalQuantity: 5,
      remainingQuantity: 0,
      soldQuantity: 0,
      originalPrice: 90000,
      floorPrice: 36000,
      currentPrice: 40000,
      pickupStart: at(-2),
      pickupEnd: at(-1),
      expiresAt: at(-1),
      status: E.OfferStatus.CLOSED,
    },
  ]);
  add(E.DonationRecordEntity, [
    {
      id: demoId('donation'),
      storeId: businessStoreIds[0],
      offerId: donationOfferId,
      quantity: 5,
      recipientInfo: { name: 'Nhóm cộng đồng Demo', demo: true },
      donatedAt: at(-1),
      note: 'Ghi nhận quyên góp minh họa, không liên hệ bên ngoài.',
    },
  ]);
  const conversationId = demoId('ai-conversation'),
    logId = demoId('ai-log');
  add(E.AiConversationEntity, [
    {
      id: conversationId,
      userId: DEMO_OWNER_ID,
      storeId: businessStoreIds[0],
      role: E.AiUserRole.STORE,
      title: 'Hội thoại demo: kế hoạch cứu món',
      status: E.AiConversationStatus.CLOSED,
    },
  ]);
  add(E.AiMessageEntity, [
    {
      id: demoId('ai-message:user'),
      conversationId,
      sender: E.AiMessageSender.USER,
      content: 'Dữ liệu demo: gợi ý kiểm tra tồn cuối ngày.',
    },
    {
      id: demoId('ai-message:assistant'),
      conversationId,
      sender: E.AiMessageSender.ASSISTANT,
      content:
        'Nội dung seed minh họa: xem tồn kho và khung giờ nhận trước khi điều chỉnh suất bán.',
      contextTokens: 0,
    },
  ]);
  const aiLogTemplates = [
    {
      featureCode: 'STORE_AI_CHAT',
      model: 'gemini-2.0-flash',
      latencyMs: 320,
      inputSummary: 'Tư vấn chiến lược xả tồn 15 suất cơm trưa văn phòng sau 13h30',
      outputSummary:
        'Gợi ý hạ giá 45% kết hợp gói túi mù Surprise Box để thu hút nhóm văn phòng lân cận.',
      errorCode: null,
      daysAgo: -1,
    },
    {
      featureCode: 'DESCRIBE_ITEM',
      model: 'gemini-2.0-flash',
      latencyMs: 280,
      inputSummary: 'Mô tả bánh mì ngũ cốc nguyên cám hạt óc chó giảm giá cuối ngày',
      outputSummary:
        'Bánh Mì Ngũ Cốc Óc Chó Giòn Rụm - Giàu chất xơ, nướng thủ công mỗi sáng, thanh ngọt tự nhiên.',
      errorCode: null,
      daysAgo: -1,
    },
    {
      featureCode: 'MARKETING_CAMPAIGN',
      model: 'gemini-1.5-flash',
      latencyMs: 540,
      inputSummary: 'Tạo nội dung thông báo đẩy giờ vàng 20h-21h cho cửa hàng Tous Les Jours',
      outputSummary:
        'Giờ Vàng Giải Cứu Bánh Tươi! Giảm sốc 50% toàn bộ bánh ngọt tại Tous Les Jours. Số lượng có hạn!',
      errorCode: null,
      daysAgo: -2,
    },
    {
      featureCode: 'SUGGEST_COMBOS',
      model: 'gemini-2.0-flash',
      latencyMs: 410,
      inputSummary: 'Gợi ý combo tồn kho: 8 ly trà sữa ô long và 6 phần bánh su kem',
      outputSummary:
        'Combo Siêu Tiết Kiệm: Trà Ô Long Đậm Vị + 2 Bánh Su Kem Béo Ngậy - Giảm 40% chỉ trong tối nay.',
      errorCode: null,
      daysAgo: -2,
    },
    {
      featureCode: 'SENTIMENT_ANALYSIS',
      model: 'gemini-1.5-flash',
      latencyMs: 210,
      inputSummary:
        'Đánh giá của khách: Bánh ngon nhưng lúc đến lấy phải đợi nhân viên tìm đơn hơi lâu',
      outputSummary:
        'Phân loại: TÍCH CỰC CÓ GÓP Ý (Hài lòng chất lượng món ăn 4/5, cần tối ưu quy trình nhận hàng tại quầy).',
      errorCode: null,
      daysAgo: -3,
    },
    {
      featureCode: 'DRAFT_REVIEW_REPLY',
      model: 'gemini-2.0-flash',
      latencyMs: 350,
      inputSummary:
        'Soạn thư trả lời xin lỗi khách hàng về việc nhận hàng trễ 5 phút tại chi nhánh Quận 1',
      outputSummary:
        'Chào bạn, SurplusIQ và Rincon xin chân thành cáo lỗi vì sự chờ đợi ngoài ý muốn. Chúng tôi đã nhắc nhở ca trực để phục vụ chu đáo hơn.',
      errorCode: null,
      daysAgo: -3,
    },
    {
      featureCode: 'CUSTOMER_SEARCH',
      model: 'gemini-2.0-flash',
      latencyMs: 290,
      inputSummary: 'Tìm món chay thanh đạm còn dư sau 19h gần khu vực Nguyễn Huệ',
      outputSummary:
        'Đã tìm thấy 3 suất Cơm Chay Tự Chọn và 2 phần Salad Mầm Rau sạch tại Healthy Box (cách 800m).',
      errorCode: null,
      daysAgo: -4,
    },
    {
      featureCode: 'STORE_AI_CHAT',
      model: 'gemini-2.0-flash',
      latencyMs: 480,
      inputSummary: 'Dự báo lượng tồn kho bánh ngọt cuối tuần căn cứ vào lịch sử thời tiết mưa lớn',
      outputSummary:
        'Dự báo doanh số tại chỗ giảm 25%, khuyến nghị tăng tỷ lệ xuất bán túi mù Surprise Bag trên ứng dụng từ 18h.',
      errorCode: null,
      daysAgo: -4,
    },
    {
      featureCode: 'CUSTOMER_CHAT',
      model: 'gemini-1.5-flash',
      latencyMs: 390,
      inputSummary: 'Hỏi chính sách hoàn tiền khi đơn hàng bị hủy do cửa hàng đóng cửa đột xuất',
      outputSummary:
        'Khoản tiền giữ chỗ sẽ được tự động hoàn lại 100% vào ví / tài khoản của bạn trong vòng 5-15 phút.',
      errorCode: null,
      daysAgo: -5,
    },
    {
      featureCode: 'ALLERGY_CHECK',
      model: 'gemini-2.0-flash',
      latencyMs: 195,
      inputSummary: 'Khách bị dị ứng đậu phộng và gluten có dùng được phần chè dừa non dầm không?',
      outputSummary:
        'Cảnh báo: Món chứa nước cốt dừa và thạch, tuy nhiên cơ sở có chế biến chè thập cẩm đậu phộng chung dây chuyền.',
      errorCode: null,
      daysAgo: -5,
    },
    {
      featureCode: 'DESCRIBE_ITEM',
      model: 'gemini-2.0-flash',
      latencyMs: 310,
      inputSummary: 'Viết mô tả món sushi cá hồi xông khói đóng khay bán trước 21h30',
      outputSummary:
        'Set Sushi Cá Hồi Na-uy Tươi Ngon - Bảo quản mát chuẩn nhiệt độ, tặng kèm mù tạt và gừng hồng thanh mát.',
      errorCode: null,
      daysAgo: -6,
    },
    {
      featureCode: 'STORE_AI_CHAT',
      model: 'gemini-1.5-flash',
      latencyMs: 620,
      inputSummary: 'Phân tích xu hướng mua hàng của khách khu vực Bình Thạnh trong 30 ngày qua',
      outputSummary:
        'Khách hàng ưu tiên khung giờ 19h30 - 20h30, phân khúc giá 35.000đ - 65.000đ đạt tỷ lệ giải cứu 92%.',
      errorCode: null,
      daysAgo: -6,
    },
  ];

  const aiLogs: DeepPartial<E.AiLogEntity>[] = [
    {
      id: logId,
      userId: DEMO_OWNER_ID,
      storeId: businessStoreIds[0],
      featureCode: 'DEMO_SEED_PREVIEW',
      model: 'seed-fixture-no-model-call',
      latencyMs: 0,
      inputSummary: 'Dữ liệu demo, không gọi dịch vụ AI.',
      outputSummary: 'Nội dung minh họa có nhãn demo.',
      errorCode: null,
      createdAt: at(-7),
    },
    ...aiLogTemplates.map((tpl, idx) => ({
      id: demoId(`ai-log:demo:${idx + 1}`),
      userId: idx % 2 === 0 ? DEMO_OWNER_ID : DEMO_CUSTOMER_ID,
      storeId: businessStoreIds[idx % businessStoreIds.length],
      featureCode: tpl.featureCode,
      model: tpl.model,
      latencyMs: tpl.latencyMs,
      inputSummary: tpl.inputSummary,
      outputSummary: tpl.outputSummary,
      errorCode: tpl.errorCode,
      createdAt: at(tpl.daysAgo, (idx % 12) + 8),
    })),
  ];

  add(E.AiLogEntity, aiLogs);
  add(E.AiFeedbackEntity, [
    {
      id: demoId('ai-feedback'),
      logId,
      rating: E.AiRating.HELPFUL,
      notes: 'Phản hồi minh họa trong dữ liệu seed.',
    },
  ]);
  return { steps, users, orders, offers, statements, customerIds, businessStoreIds };
}
