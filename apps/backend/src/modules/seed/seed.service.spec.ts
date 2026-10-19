import { DataSource, EntityManager } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ReconciliationEngine } from '@surplusiq/core';
import { SeedService } from './seed.service';
import { buildDemoSeed, demoId, DEFAULT_DEMO_ADMIN_EMAIL } from './demo-seed.data';
import { AuditLogEntity, OrderStatus, UserEntity, UserRole } from '../../entities';

describe('Demo seed safety and data integrity', () => {
  const environment = { ...process.env };
  const options = {
    now: new Date('2026-10-19T08:00:00Z'),
    adminId: demoId('admin:test'),
    adminEmail: DEFAULT_DEMO_ADMIN_EMAIL,
    adminPasswordHash: 'test-admin-hash',
    demoPasswordHash: 'test-demo-hash',
  };

  beforeEach(() => {
    process.env = { ...environment };
    delete process.env.SEED_DEMO_ON_STARTUP;
    delete process.env.SEED_ADMIN_EMAIL;
    delete process.env.SEED_ADMIN_PASSWORD;
    process.env.NODE_ENV = 'test';
  });
  afterEach(() => {
    process.env = environment;
  });

  it('does not seed on application startup unless explicitly enabled', async () => {
    const transaction = jest.fn();
    await new SeedService({ transaction } as unknown as DataSource).onModuleInit();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('refuses demo credentials/data in production', async () => {
    process.env.NODE_ENV = 'production';
    const transaction = jest.fn();
    await expect(
      new SeedService({ transaction } as unknown as DataSource).seedDemoData(),
    ).rejects.toThrow('production');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('never promotes an existing non-admin account that owns the requested email', async () => {
    const query = jest.fn();
    const findOneBy = jest
      .fn()
      .mockResolvedValue({ id: demoId('existing-customer'), role: UserRole.CUSTOMER });
    const createQueryBuilder = jest.fn();
    const manager = { query, findOneBy, createQueryBuilder } as unknown as EntityManager;
    const transaction = jest.fn(async (work) => work(manager));
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      await expect(
        new SeedService({ transaction } as unknown as DataSource).seedDemoData(),
      ).rejects.toThrow('không tự nâng quyền');
      expect(createQueryBuilder).not.toHaveBeenCalled();
    } finally {
      errorLog.mockRestore();
    }
  });

  it('preserves the existing admin password and the original seed timeline on reruns', async () => {
    const values: unknown[][] = [];
    const writer = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn((rows: unknown[]) => {
        values.push(rows);
        return writer;
      }),
      orIgnore: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [] }),
    };
    const anchor = new Date('2026-10-01T08:00:00Z');
    const existingAdmin = {
      id: options.adminId,
      email: DEFAULT_DEMO_ADMIN_EMAIL,
      role: UserRole.ADMIN,
      passwordHash: 'user-changed-password-hash',
    };
    const manager = {
      query: jest.fn(),
      findOneBy: jest.fn(async (entity) =>
        entity === UserEntity
          ? existingAdmin
          : entity === AuditLogEntity
            ? { createdAt: anchor }
            : null,
      ),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn(() => writer),
    } as unknown as EntityManager;
    const transaction = jest.fn(async (work) => work(manager));
    const result = await new SeedService({ transaction } as unknown as DataSource).seedDemoData();
    const seededAdmin = (values[0] as Array<{ id: string; passwordHash: string }>).find(
      (u) => u.id === options.adminId,
    );
    expect(seededAdmin?.passwordHash).toBe(existingAdmin.passwordHash);
    expect(result.adminCreated).toBe(false);
    const initialized = values
      .flat()
      .find((row) => (row as { id?: string }).id === demoId('seed-anchor')) as { createdAt: Date };
    expect(initialized.createdAt).toEqual(anchor);
    expect(writer.orIgnore).toHaveBeenCalled();
  });

  it('uses stable IDs and valid order amounts with real offer references', () => {
    const data = buildDemoSeed(options);
    const repeated = buildDemoSeed(options);
    expect(data.orders.map((o) => o.id)).toEqual(repeated.orders.map((o) => o.id));
    expect(new Set(data.orders.map((o) => o.code)).size).toBe(data.orders.length);
    expect(new Set(data.orders.map((o) => o.status))).toEqual(new Set(Object.values(OrderStatus)));
    for (const order of data.orders) {
      const offer = data.offers.find((o) => o.id === order.offerId);
      expect(offer?.storeId).toBe(order.storeId);
      expect(order.totalAmount).toBe(
        Number(order.quantity) * Number(order.unitPrice) - Number(order.discountAmount),
      );
      expect(order.quantity).toBeGreaterThanOrEqual(1);
      expect(order.quantity).toBeLessThanOrEqual(5);
    }
    for (const offer of data.offers) {
      expect(offer.floorPrice).toBeLessThanOrEqual(offer.currentPrice);
      expect(offer.currentPrice).toBeLessThanOrEqual(offer.originalPrice);
      expect(offer.remainingQuantity).toBeGreaterThanOrEqual(0);
    }
  });

  it('creates balanced statements with valid core-engine checksums', () => {
    for (const statement of buildDemoSeed(options).statements) {
      expect(statement.gross).toBeGreaterThan(0);
      expect(statement.netPayable).toBe(
        Number(statement.gross) -
          Number(statement.commission) -
          Number(statement.refunds) -
          Number(statement.subscriptionFee) +
          Number(statement.adjustments),
      );
      expect(statement.checksum).toBe(
        ReconciliationEngine.computeChecksum({
          statementId: statement.id as string,
          storeId: statement.storeId as string,
          cycleId: statement.flags?.cycleId as string,
          generatedAt: statement.createdAt as Date,
          grossSales: statement.gross as number,
          commissionAmount: statement.commission as number,
          refundsDeduction: statement.refunds as number,
          subscriptionFee: statement.subscriptionFee as number,
          totalAdjustments: statement.adjustments as number,
          netPayout: statement.netPayable as number,
        }),
      );
    }
  });
});
