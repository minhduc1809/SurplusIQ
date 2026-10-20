import { RescueLabObjective } from '../../entities/rescue-lab/rescue-lab-scenario.entity';
import {
  assessDataQuality,
  checkCompatibility,
  compareSimulatedVsActual,
  computeMetrics,
  daysInRange,
  hashSnapshot,
  InputSnapshot,
  OfferRow,
  simulate,
} from './rescue-lab.engine';

const offer = (over: Partial<OfferRow> = {}): OfferRow => ({
  offerId: 'o1',
  itemId: 'i1',
  originalPrice: 40000,
  totalQuantity: 10,
  pickupStart: '2026-09-01T11:00:00.000Z',
  soldUnits: 6,
  revenue: 6 * 24000,
  ...over,
});
const assumptions = { discountRatio: 0.5, priceElasticity: 1.5, volumeChangePct: 0 };

describe('Rescue Lab engine (CM-B04)', () => {
  it('computes metrics with the documented formulas', () => {
    const m = computeMetrics(
      [offer(), offer({ offerId: 'o2', soldUnits: 4, revenue: 4 * 24000 })],
      30,
    );
    expect(m).toMatchObject({
      offeredUnits: 20,
      soldUnits: 10,
      surplusUnits: 10,
      sellThroughRate: 0.5,
      recoveryRevenue: 240000,
      avgRealizedPrice: 24000,
      avgOriginalPrice: 40000,
      realizedDiscountRatio: 0.4,
    });
  });

  it('is deterministic and moves demand opposite to price', () => {
    const base = computeMetrics(
      Array.from({ length: 30 }, (_, i) => offer({ offerId: `o${i}` })),
      30,
    );
    const deeper = simulate(base, assumptions); // p1 20000 < p0 24000 -> more sold
    expect(simulate(base, assumptions)).toEqual(deeper);
    expect(deeper.soldUnits).toBeGreaterThan(base.soldUnits);
    expect(deeper.soldUnits).toBeLessThanOrEqual(deeper.offeredUnits);
    expect(deeper.recoveryRevenue).toBe(deeper.soldUnits * 20000);
    const shallower = simulate(base, { ...assumptions, discountRatio: 0.2 });
    expect(shallower.soldUnits).toBeLessThan(base.soldUnits);
  });

  it('blocks on missing data and flags restricted mode', () => {
    expect(assessDataQuality(computeMetrics([], 30), 0, assumptions)[0]).toMatchObject({
      code: 'NO_OFFERS_IN_SCOPE',
      severity: 'BLOCKING',
    });
    const noSales = computeMetrics([offer({ soldUnits: 0, revenue: 0 })], 30);
    expect(assessDataQuality(noSales, 30, assumptions)[0].code).toBe('NO_SALES_BASELINE');
    const small = computeMetrics([offer()], 7);
    const codes = assessDataQuality(small, 0, assumptions).map((w) => w.code);
    expect(codes).toEqual(
      expect.arrayContaining(['SHORT_PERIOD', 'LOW_SAMPLE', 'MISSING_DAILY_ACTUALS']),
    );
    expect(assessDataQuality(small, 0, assumptions).every((w) => w.severity === 'RESTRICTED')).toBe(
      true,
    );
  });

  it('compares volume metrics per day and ratios directly', () => {
    const sim = computeMetrics(
      [offer({ totalQuantity: 300, soldUnits: 150, revenue: 150 * 20000 })],
      30,
    );
    const act = computeMetrics(
      [offer({ totalQuantity: 70, soldUnits: 28, revenue: 28 * 20000 })],
      7,
    );
    const rows = Object.fromEntries(
      compareSimulatedVsActual(sim, act).rows.map((r) => [r.metric, r]),
    );
    expect(rows.soldUnits).toMatchObject({
      basis: 'PER_DAY',
      simulated: 5,
      actual: 4,
      delta: -1,
      deltaPct: -0.2,
    });
    expect(rows.sellThroughRate).toMatchObject({ basis: 'DIRECT', simulated: 0.5, actual: 0.4 });
  });

  it('rejects comparing incompatible versions with reasons', () => {
    const v = {
      id: 'a',
      status: 'COMPLETED',
      objective: RescueLabObjective.REDUCE_SURPLUS,
      dateRangeStart: '2026-09-01',
      dateRangeEnd: '2026-09-30',
      itemScope: { categories: ['Bánh mì'] },
      engineVersion: 'rl-1',
      inputSnapshotHash: 'h1',
    };
    expect(checkCompatibility([v, { ...v, id: 'b' }])).toEqual([]);
    expect(
      checkCompatibility([
        v,
        { ...v, id: 'b', objective: RescueLabObjective.INCREASE_SELLTHROUGH },
      ]),
    ).toHaveLength(1);
    expect(
      checkCompatibility([v, { ...v, id: 'b', dateRangeEnd: '2026-09-29', itemScope: {} }]),
    ).toHaveLength(2);
    expect(checkCompatibility([v, { ...v, id: 'b', inputSnapshotHash: 'h2' }])[0]).toMatch(
      /Dữ liệu nguồn đã thay đổi/,
    );
    expect(checkCompatibility([v, { ...v, id: 'b', status: 'DRAFT' }])[0]).toMatch(
      /chưa chạy hoàn tất/,
    );
  });

  it('hashes snapshot data independent of capture time and row order', () => {
    const s: InputSnapshot = {
      capturedAt: '2026-10-01T00:00:00Z',
      sources: ['offers'],
      dateRange: { start: '2026-09-01', end: '2026-09-30' },
      itemScope: {},
      resolvedItemIds: null,
      dailyActualDays: 3,
      offers: [offer(), offer({ offerId: 'o2' })],
    };
    const reordered = { ...s, capturedAt: '2026-10-05T00:00:00Z', offers: [...s.offers].reverse() };
    expect(hashSnapshot(reordered)).toBe(hashSnapshot(s));
    expect(hashSnapshot({ ...s, dailyActualDays: 4 })).not.toBe(hashSnapshot(s));
    expect(daysInRange('2026-09-01', '2026-09-30')).toBe(30);
  });
});
