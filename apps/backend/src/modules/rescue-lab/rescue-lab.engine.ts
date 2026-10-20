import { createHash } from 'crypto';
import {
  RescueLabDataWarning,
  RescueLabObjective,
} from '../../entities/rescue-lab/rescue-lab-scenario.entity';
import {
  RescueLabAssumptions,
  RescueLabItemScope,
  RescueLabMetrics,
} from '../../entities/rescue-lab/rescue-lab-scenario-version.entity';

/**
 * CM-B04 Rescue Lab - lõi tính toán xác định (deterministic). KHÔNG gọi LLM/AI để tạo số liệu
 * (luồng chính bước 5): cùng input snapshot + cùng giả định + cùng ENGINE_VERSION => cùng kết quả.
 * Đổi công thức ở đây => tăng RESCUE_LAB_ENGINE_VERSION để các bản chạy cũ không bị so sánh lẫn (BR-B04-02).
 */
export const RESCUE_LAB_ENGINE_VERSION = 'rl-1';

export const RESCUE_LAB_CONFIG = {
  /** R2-099: mô phỏng trên 14-90 ngày dữ liệu. Dưới 14 ngày vẫn chạy nhưng ở chế độ hạn chế. */
  RECOMMENDED_MIN_DAYS: 14,
  MAX_DAYS: 90,
  MAX_OBSERVATION_DAYS: 90,
  /** Dưới ngưỡng số suất bán này, mẫu quá nhỏ để ước lượng cầu ổn định. */
  MIN_SOLD_UNITS_FOR_CONFIDENCE: 30,
  /** Tỷ lệ bán >= ngưỡng này: hay hết hàng => cầu thật bị che (censored), không biết cầu vượt bao nhiêu. */
  CENSORED_SELL_THROUGH: 0.98,
  /** Giá mô phỏng lệch quá ±30% so với giá thực thu lịch sử => ngoại suy ngoài vùng dữ liệu đã quan sát. */
  MAX_PRICE_EXTRAPOLATION: 0.3,
  /** Ngày có daily_actuals / số ngày kỳ dưới ngưỡng này => thiếu số liệu bán tại quầy/sản xuất. */
  MIN_DAILY_ACTUALS_COVERAGE: 0.5,
  /** Giảm giá thực tế lệch giả định quá mức này (điểm %) => kịch bản không được áp dụng đúng như mô phỏng. */
  APPLIED_DISCOUNT_TOLERANCE: 0.05,
  DEFAULT_PRICE_ELASTICITY: 1.5,
  DEFAULT_VOLUME_CHANGE_PCT: 0,
  /** Ranh giới ngày theo giờ Việt Nam (cửa hàng hoạt động tại VN). */
  TZ_OFFSET: '+07:00',
};

/**
 * BR-B04-08: định nghĩa/công thức/nguồn thống nhất - dùng CHUNG cho số liệu nền, mô phỏng và thực tế.
 * Phạm vi suất (offer) tính vào kỳ: offers.store_id = cửa hàng hiện tại, pickup_start trong [từ ngày, đến ngày]
 * (giờ VN), status ∉ {DRAFT, CANCELLED}, và item_id thuộc phạm vi món (túi bất ngờ không có item_id chỉ
 * được tính khi phạm vi là "tất cả món"). Đơn được tính là "đã bán" khi status ∈ {PAID, PICKED_UP}.
 */
export const RESCUE_LAB_METRIC_DEFINITIONS = {
  offeredUnits: {
    label: 'Suất đưa lên cứu',
    unit: 'suất',
    formula: 'Σ offers.total_quantity của các suất trong phạm vi/kỳ',
    source: 'offers',
  },
  soldUnits: {
    label: 'Suất bán được',
    unit: 'suất',
    formula: 'Σ orders.quantity của đơn PAID/PICKED_UP thuộc các suất trong phạm vi/kỳ',
    source: 'orders',
  },
  surplusUnits: {
    label: 'Tồn dư không cứu được',
    unit: 'suất',
    formula: 'offeredUnits − soldUnits',
    source: 'offers, orders',
  },
  sellThroughRate: {
    label: 'Tỷ lệ bán',
    unit: 'tỷ lệ',
    formula: 'soldUnits / offeredUnits (0 nếu offeredUnits = 0)',
    source: 'offers, orders',
  },
  recoveryRevenue: {
    label: 'Doanh thu thu hồi',
    unit: 'VND',
    formula: 'Σ orders.total_amount (sau khuyến mãi) của đơn PAID/PICKED_UP',
    source: 'orders',
  },
  avgRealizedPrice: {
    label: 'Giá thực thu bình quân',
    unit: 'VND/suất',
    formula: 'recoveryRevenue / soldUnits (0 nếu soldUnits = 0)',
    source: 'orders',
  },
  avgOriginalPrice: {
    label: 'Giá gốc bình quân',
    unit: 'VND/suất',
    formula: 'Σ(offers.original_price × total_quantity) / offeredUnits',
    source: 'offers',
  },
  realizedDiscountRatio: {
    label: 'Mức giảm giá thực tế',
    unit: 'tỷ lệ',
    formula: '1 − avgRealizedPrice / avgOriginalPrice (0 nếu không có giá)',
    source: 'offers, orders',
  },
} as const;

/** Mô hình mô phỏng (công bố cùng kết quả để người dùng thấy giả định - tiêu chí nghiệm thu cuối). */
export const RESCUE_LAB_SIMULATION_MODEL = {
  newPrice: 'p1 = avgOriginalPrice × (1 − discountRatio)',
  demandFactor: 'f = (p1 / p0) ^ (−priceElasticity), với p0 = avgRealizedPrice của kỳ nền',
  offeredUnits: 'round(offeredUnits_nền × (1 + volumeChangePct/100))',
  soldUnits: 'min(offeredUnits_mô phỏng, round(soldUnits_nền × f))',
  recoveryRevenue: 'round(soldUnits_mô phỏng × p1)',
  comparison:
    'So sánh mô phỏng với thực tế: chỉ số khối lượng (suất, doanh thu) quy về TRUNG BÌNH/NGÀY vì kỳ nền và cửa sổ quan sát có thể khác độ dài; chỉ số tỷ lệ/giá so trực tiếp.',
};

export type MetricKey = keyof typeof RESCUE_LAB_METRIC_DEFINITIONS;
const VOLUME_METRICS: MetricKey[] = [
  'offeredUnits',
  'soldUnits',
  'surplusUnits',
  'recoveryRevenue',
];
const RATIO_METRICS: MetricKey[] = ['sellThroughRate', 'avgRealizedPrice', 'realizedDiscountRatio'];

/** Chỉ số chính để xếp hạng theo mục tiêu (cùng tiêu chí - BR-B04-02). */
export const OBJECTIVE_PRIMARY_METRIC: Record<
  RescueLabObjective,
  { metric: MetricKey; direction: 'MIN' | 'MAX' } | null
> = {
  [RescueLabObjective.REDUCE_SURPLUS]: { metric: 'surplusUnits', direction: 'MIN' },
  [RescueLabObjective.INCREASE_RECOVERY_REVENUE]: { metric: 'recoveryRevenue', direction: 'MAX' },
  [RescueLabObjective.INCREASE_SELLTHROUGH]: { metric: 'sellThroughRate', direction: 'MAX' },
  // So sánh chiến lược: hiển thị đủ chỉ số, không chọn "người thắng" theo một tiêu chí duy nhất.
  [RescueLabObjective.COMPARE_STRATEGIES]: null,
};

export interface OfferRow {
  offerId: string;
  itemId: string | null;
  originalPrice: number;
  totalQuantity: number;
  pickupStart: string;
  soldUnits: number;
  revenue: number;
}

export interface InputSnapshot {
  capturedAt: string;
  sources: string[];
  dateRange: { start: string; end: string };
  itemScope: RescueLabItemScope;
  resolvedItemIds: string[] | null;
  dailyActualDays: number;
  offers: OfferRow[];
}

const round2 = (n: number) => Math.round(n * 10000) / 10000;

export function daysInRange(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}

/** [start 00:00, end+1 00:00) theo giờ VN. */
export function rangeBounds(start: string, end: string): { from: Date; to: Date } {
  const from = new Date(`${start}T00:00:00${RESCUE_LAB_CONFIG.TZ_OFFSET}`);
  const to = new Date(
    new Date(`${end}T00:00:00${RESCUE_LAB_CONFIG.TZ_OFFSET}`).getTime() + 86_400_000,
  );
  return { from, to };
}

export function computeMetrics(
  offers: OfferRow[],
  periodDays: number,
): Omit<RescueLabMetrics, 'kind'> {
  const offeredUnits = offers.reduce((s, o) => s + o.totalQuantity, 0);
  const soldUnits = offers.reduce((s, o) => s + o.soldUnits, 0);
  const recoveryRevenue = offers.reduce((s, o) => s + o.revenue, 0);
  const listValue = offers.reduce((s, o) => s + o.originalPrice * o.totalQuantity, 0);
  const avgRealizedPrice = soldUnits > 0 ? Math.round(recoveryRevenue / soldUnits) : 0;
  const avgOriginalPrice = offeredUnits > 0 ? Math.round(listValue / offeredUnits) : 0;
  return {
    periodDays,
    offeredUnits,
    soldUnits,
    surplusUnits: Math.max(0, offeredUnits - soldUnits),
    sellThroughRate: offeredUnits > 0 ? round2(soldUnits / offeredUnits) : 0,
    recoveryRevenue,
    avgRealizedPrice,
    avgOriginalPrice,
    realizedDiscountRatio:
      avgOriginalPrice > 0 && soldUnits > 0 ? round2(1 - avgRealizedPrice / avgOriginalPrice) : 0,
  };
}

/** Hash dữ liệu nguồn (không gồm capturedAt) để truy lại và kiểm tra cùng cơ sở dữ liệu (BR-B04-01/02). */
export function hashSnapshot(s: InputSnapshot): string {
  const core = {
    dateRange: s.dateRange,
    resolvedItemIds: s.resolvedItemIds,
    dailyActualDays: s.dailyActualDays,
    offers: [...s.offers].sort((a, b) => a.offerId.localeCompare(b.offerId)),
  };
  return createHash('sha256').update(JSON.stringify(core)).digest('hex');
}

/**
 * Luồng chính bước 3 + ngoại lệ "dữ liệu thiếu": BLOCKING => không chạy (giữ Nháp);
 * RESTRICTED => vẫn chạy nhưng gắn cảnh báo và đánh dấu chế độ hạn chế.
 */
export function assessDataQuality(
  baseline: Omit<RescueLabMetrics, 'kind'>,
  dailyActualDays: number,
  assumptions: RescueLabAssumptions,
): RescueLabDataWarning[] {
  const w: RescueLabDataWarning[] = [];
  const c = RESCUE_LAB_CONFIG;
  if (baseline.offeredUnits === 0) {
    w.push({
      code: 'NO_OFFERS_IN_SCOPE',
      severity: 'BLOCKING',
      message: 'Không có suất nào trong phạm vi món/khoảng thời gian đã chọn - không thể mô phỏng.',
    });
    return w;
  }
  if (baseline.soldUnits === 0) {
    w.push({
      code: 'NO_SALES_BASELINE',
      severity: 'BLOCKING',
      message: 'Chưa có suất nào bán được trong kỳ nền - không ước lượng được cầu theo giá.',
    });
    return w;
  }
  if (baseline.periodDays < c.RECOMMENDED_MIN_DAYS) {
    w.push({
      code: 'SHORT_PERIOD',
      severity: 'RESTRICTED',
      message: `Kỳ dữ liệu chỉ ${baseline.periodDays} ngày (khuyến nghị tối thiểu ${c.RECOMMENDED_MIN_DAYS} ngày).`,
    });
  }
  if (baseline.soldUnits < c.MIN_SOLD_UNITS_FOR_CONFIDENCE) {
    w.push({
      code: 'LOW_SAMPLE',
      severity: 'RESTRICTED',
      message: `Chỉ có ${baseline.soldUnits} suất bán trong kỳ nền (< ${c.MIN_SOLD_UNITS_FOR_CONFIDENCE}) - sai số lớn.`,
    });
  }
  if (baseline.sellThroughRate >= c.CENSORED_SELL_THROUGH) {
    w.push({
      code: 'DEMAND_CENSORED',
      severity: 'RESTRICTED',
      message:
        'Kỳ nền gần như bán hết - cầu thật có thể cao hơn số đã bán; lượng bán mô phỏng bị chặn bởi số suất.',
    });
  }
  const p1 = baseline.avgOriginalPrice * (1 - assumptions.discountRatio);
  if (Math.abs(p1 / baseline.avgRealizedPrice - 1) > c.MAX_PRICE_EXTRAPOLATION) {
    w.push({
      code: 'PRICE_EXTRAPOLATION',
      severity: 'RESTRICTED',
      message: `Giá mô phỏng (${Math.round(p1)}đ) lệch hơn ${c.MAX_PRICE_EXTRAPOLATION * 100}% so với giá thực thu lịch sử (${baseline.avgRealizedPrice}đ) - ngoại suy ngoài dữ liệu đã quan sát.`,
    });
  }
  if (dailyActualDays / baseline.periodDays < c.MIN_DAILY_ACTUALS_COVERAGE) {
    w.push({
      code: 'MISSING_DAILY_ACTUALS',
      severity: 'RESTRICTED',
      message: `Chỉ ${dailyActualDays}/${baseline.periodDays} ngày có số liệu sản xuất/bán tại quầy - tồn dư chỉ tính phần đã đưa lên cứu.`,
    });
  }
  return w;
}

/** Mô phỏng xác định theo RESCUE_LAB_SIMULATION_MODEL. Gọi sau assessDataQuality không có BLOCKING. */
export function simulate(
  baseline: Omit<RescueLabMetrics, 'kind'>,
  a: RescueLabAssumptions,
): Omit<RescueLabMetrics, 'kind'> {
  if (baseline.soldUnits <= 0 || baseline.avgRealizedPrice <= 0) {
    throw new Error('Kỳ nền không có giá thực thu để mô phỏng.');
  }
  const p1 = baseline.avgOriginalPrice * (1 - a.discountRatio);
  const f = Math.pow(p1 / baseline.avgRealizedPrice, -a.priceElasticity);
  const offeredUnits = Math.max(
    0,
    Math.round(baseline.offeredUnits * (1 + a.volumeChangePct / 100)),
  );
  const soldUnits = Math.min(offeredUnits, Math.round(baseline.soldUnits * f));
  const recoveryRevenue = Math.round(soldUnits * p1);
  const out = {
    periodDays: baseline.periodDays,
    offeredUnits,
    soldUnits,
    surplusUnits: offeredUnits - soldUnits,
    sellThroughRate: offeredUnits > 0 ? round2(soldUnits / offeredUnits) : 0,
    recoveryRevenue,
    avgRealizedPrice: soldUnits > 0 ? Math.round(p1) : 0,
    avgOriginalPrice: baseline.avgOriginalPrice,
    realizedDiscountRatio: soldUnits > 0 ? a.discountRatio : 0,
  };
  if (!Object.values(out).every(Number.isFinite)) {
    throw new Error('Kết quả mô phỏng không hợp lệ (NaN/Infinity).');
  }
  return out;
}

const normalize = (m: Omit<RescueLabMetrics, 'kind'>, key: MetricKey) =>
  VOLUME_METRICS.includes(key) ? round2(m[key] / Math.max(1, m.periodDays)) : m[key];

/** Bước 10: chênh lệch mô phỏng vs thực tế, cùng định nghĩa chỉ số; khối lượng quy về /ngày. */
export function compareSimulatedVsActual(
  simulated: Omit<RescueLabMetrics, 'kind'>,
  actual: Omit<RescueLabMetrics, 'kind'>,
) {
  const rows = [...VOLUME_METRICS, ...RATIO_METRICS].map((metric) => {
    const s = normalize(simulated, metric);
    const act = normalize(actual, metric);
    const delta = round2(act - s);
    return {
      metric,
      label: RESCUE_LAB_METRIC_DEFINITIONS[metric].label,
      basis: VOLUME_METRICS.includes(metric) ? 'PER_DAY' : 'DIRECT',
      simulated: s,
      actual: act,
      delta,
      deltaPct: s !== 0 ? round2(delta / s) : null,
    };
  });
  return {
    simulatedPeriodDays: simulated.periodDays,
    observationDays: actual.periodDays,
    rows,
  };
}

export interface CompatibilityInput {
  id: string;
  status: string;
  objective: RescueLabObjective;
  dateRangeStart: string;
  dateRangeEnd: string;
  itemScope: RescueLabItemScope;
  engineVersion: string | null;
  inputSnapshotHash: string | null;
}

export const scopeKey = (s: RescueLabItemScope) =>
  JSON.stringify({
    itemIds: [...(s.itemIds ?? [])].sort(),
    categories: [...(s.categories ?? [])].sort(),
  });

/** BR-B04-02: chỉ so sánh trực tiếp khi cùng mục tiêu, cùng cơ sở dữ liệu và cùng lõi tính. */
export function checkCompatibility(vs: CompatibilityInput[]): string[] {
  const reasons: string[] = [];
  const distinct = <T>(f: (v: CompatibilityInput) => T) => new Set(vs.map(f)).size > 1;
  const notDone = vs.filter((v) => v.status !== 'COMPLETED');
  if (notDone.length) {
    reasons.push(
      `Có ${notDone.length} phiên bản chưa chạy hoàn tất - không có số liệu mô phỏng để so sánh.`,
    );
  }
  if (distinct((v) => v.objective))
    reasons.push('Các kịch bản có mục tiêu khác nhau - không cùng tiêu chí đánh giá.');
  if (distinct((v) => `${v.dateRangeStart}..${v.dateRangeEnd}`)) {
    reasons.push('Các phiên bản dùng khoảng thời gian dữ liệu khác nhau.');
  }
  if (distinct((v) => scopeKey(v.itemScope)))
    reasons.push('Các phiên bản có phạm vi món khác nhau.');
  if (distinct((v) => v.engineVersion))
    reasons.push('Các phiên bản được tính bằng phiên bản lõi tính toán khác nhau.');
  if (!notDone.length && !reasons.length && distinct((v) => v.inputSnapshotHash)) {
    reasons.push(
      'Dữ liệu nguồn đã thay đổi giữa các lần chạy (dấu vân tay dữ liệu khác nhau) - hãy tạo phiên bản mới để chạy lại trên cùng dữ liệu.',
    );
  }
  return reasons;
}
