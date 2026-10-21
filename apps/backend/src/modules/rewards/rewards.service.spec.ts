import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RewardsService } from './rewards.service';
import { PromotionEntity } from '../../entities/marketing/promotion.entity';
import { PromotionWalletEntity } from '../../entities/marketing/promotion-wallet.entity';
import { RewardEntryType } from '../../entities/rewards/reward-ledger-entry.entity';
import { MAX_REDEEM_PER_DAY, REWARD_CATALOG } from './rewards.constants';

function build(opts: { balanceRows?: object[]; redeemedToday?: number }) {
  const saved: { entity: unknown; value: Record<string, unknown> }[] = [];
  const ledgerSaved: Record<string, unknown>[] = [];
  const ledgerRepo = {
    create: jest.fn((v) => v),
    save: jest.fn((v) => {
      ledgerSaved.push(v);
      return Promise.resolve({ id: 'led-1', ...v });
    }),
    count: jest.fn().mockResolvedValue(opts.redeemedToday ?? 0),
  };
  const manager = {
    query: jest.fn().mockResolvedValue([opts.balanceRows ?? [{ points_balance: 400 }], 1]),
    create: jest.fn((entity, v) => ({ __entity: entity, ...v })),
    save: jest.fn((v) => {
      saved.push({ entity: v.__entity, value: v });
      return Promise.resolve({ id: 'promo-1', ...v });
    }),
    getRepository: jest.fn(() => ledgerRepo),
  };
  const dataSource = {
    transaction: jest.fn((cb: (m: unknown) => unknown) => cb(manager)),
    query: jest.fn(),
  };
  const audit = { log: jest.fn() };
  const accountRepo = {
    findOne: jest.fn().mockResolvedValue({ pointsBalance: 300, updatedAt: new Date() }),
  };
  const service = new RewardsService(
    accountRepo as never,
    ledgerRepo as never,
    audit as never,
    dataSource as unknown as DataSource,
  );
  return { service, manager, saved, ledgerSaved, audit, ledgerRepo };
}

describe('RewardsService đổi điểm (KC13)', () => {
  it('trừ điểm theo giá trong danh mục, cấp voucher nền tảng vào ví và ghi bút toán cùng giao dịch', async () => {
    const h = build({});
    const res = await h.service.redeem('cus-1', { redemptionId: 'VOUCHER_20K' });

    expect(h.manager.query.mock.calls[0][1]).toEqual(['cus-1', 200]);
    const promo = h.saved.find((s) => s.entity === PromotionEntity)!.value;
    expect(promo).toMatchObject({
      storeId: null,
      fundedBy: 'PLATFORM',
      value: 20000,
      maxUses: 1,
      minOrderAmount: 60000,
    });
    expect(h.saved.find((s) => s.entity === PromotionWalletEntity)!.value).toMatchObject({
      customerId: 'cus-1',
      usedAt: null,
    });
    expect(h.ledgerSaved[0]).toMatchObject({
      entryType: RewardEntryType.REDEEM,
      pointsDelta: -200,
      redemptionId: 'VOUCHER_20K',
    });
    expect(res.voucher).toMatchObject({ valueVnd: 20000 });
    expect(res.pointsBalance).toBe(400);
  });

  it('từ chối ưu đãi không có trong danh mục, không trừ điểm', async () => {
    const h = build({});
    await expect(h.service.redeem('cus-1', { redemptionId: 'FREE_EVERYTHING' })).rejects.toThrow(
      BadRequestException,
    );
    expect(h.manager.query).not.toHaveBeenCalled();
  });

  it('từ chối khi số dư không đủ, không tạo voucher', async () => {
    const h = build({ balanceRows: [] });
    await expect(h.service.redeem('cus-1', { redemptionId: 'VOUCHER_50K' })).rejects.toThrow(
      'Số dư điểm không đủ',
    );
    expect(h.saved).toHaveLength(0);
  });

  it('chặn khi đã đổi đủ lượt trong ngày', async () => {
    const h = build({ redeemedToday: MAX_REDEEM_PER_DAY });
    await expect(h.service.redeem('cus-1', { redemptionId: 'VOUCHER_10K' })).rejects.toThrow(
      'tối đa',
    );
    expect(h.manager.query).not.toHaveBeenCalled();
  });

  it('danh mục báo đúng ưu đãi nào đổi được và còn thiếu bao nhiêu điểm', async () => {
    const h = build({});
    const cat = await h.service.getCatalog('cus-1');
    expect(cat.pointsBalance).toBe(300);
    expect(cat.items.map((i) => [i.id, i.canRedeem, i.shortfall])).toEqual([
      ['VOUCHER_10K', true, 0],
      ['VOUCHER_20K', true, 0],
      ['VOUCHER_50K', false, 200],
    ]);
  });

  it('quy tắc lấy con số từ cấu hình đang chạy', () => {
    const rules = build({}).service.getRules();
    const text = JSON.stringify(rules);
    expect(text).toContain('180 ngày');
    expect(text).toContain(`${MAX_REDEEM_PER_DAY} lượt`);
    expect(REWARD_CATALOG.length).toBeGreaterThan(0);
  });
});

describe('RewardsService hết hạn điểm (KC14)', () => {
  it('trừ điểm kiếm đã quá hạn chưa dùng và ghi bút toán EXPIRE, không chạy khi tiến trình khác đang giữ khóa', async () => {
    const h = build({});
    h.manager.query
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ customer_id: 'cus-1', expired: '120' }])
      .mockResolvedValueOnce([[{ points_balance: 30 }], 1]);
    expect(await h.service.expireDuePoints(new Date())).toBe(1);
    expect(h.ledgerSaved[0]).toMatchObject({
      entryType: RewardEntryType.EXPIRE,
      pointsDelta: -120,
    });

    const h2 = build({});
    h2.manager.query.mockResolvedValueOnce([{ locked: false }]);
    expect(await h2.service.expireDuePoints(new Date())).toBe(0);
    expect(h2.ledgerSaved).toHaveLength(0);
  });
});
