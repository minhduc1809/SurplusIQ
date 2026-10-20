import { OfferKind, OfferStatus } from '../../entities/catalog/offer.entity';
import {
  RescueActionType,
  RescueDataQualityStatus,
  RescueLotStatus,
  RescueRecommendedAction,
  RescueRiskFactor,
  RescueRiskLevel,
} from '../../entities/rescue-timeline/rescue-risk-snapshot.entity';

/**
 * Quy tắc tính nguy cơ CM-B01 (cấu hình tập trung - chỉnh ở đây, không rải số trong code).
 * Điểm = thời gian còn + tỷ lệ tồn + dự kiến dư theo tốc độ bán; mỗi yếu tố ghi vào risk_factors (BR-B01-03).
 */
export const RESCUE_TIMELINE_CONFIG = {
  /** Snapshot cũ hơn mức này khi phục vụ GET bị đánh dấu STALE/cần tính lại (job chạy mỗi 5 phút). */
  SNAPSHOT_MAX_AGE_MINUTES: 15,
  /** Đang bán mà tồn không có thay đổi/đơn mới trong khoảng này -> tồn có thể đã cũ (bán tại quầy chưa ghi). */
  STOCK_STALE_MINUTES: 90,
  /** Cần niêm yết tối thiểu chừng này mới có tốc độ bán tham chiếu đáng tin. */
  MIN_VELOCITY_WINDOW_MINUTES: 30,
  TIME_LEFT_POINTS: [
    { maxMinutes: 30, points: 3 },
    { maxMinutes: 60, points: 2 },
    { maxMinutes: 120, points: 1 },
  ],
  REMAINING_RATIO_POINTS: [
    { minRatio: 0.75, points: 2 },
    { minRatio: 0.4, points: 1 },
  ],
  PROJECTED_UNSOLD_POINTS: [
    { minRatio: 0.5, points: 3 },
    { minRatio: 0.2, points: 2 },
    { minRatio: 0.0001, points: 1 },
  ],
  /** Tổng điểm tối đa 8. */
  LEVEL_THRESHOLDS: [
    { level: RescueRiskLevel.CRITICAL, minScore: 6 },
    { level: RescueRiskLevel.HIGH, minScore: 4 },
    { level: RescueRiskLevel.MEDIUM, minScore: 2 },
  ],
  /** Gợi ý túi bất ngờ khi còn ít thời gian hơn mức này ở nguy cơ HIGH. */
  SURPRISE_BAG_MAX_MINUTES_LEFT: 60,
  /** Gợi ý Rescue Bridge (quyên góp) khi CRITICAL và còn ít thời gian hơn mức này. */
  RESCUE_BRIDGE_MAX_MINUTES_LEFT: 30,
  MAX_PRICE_CHANGES: 3,
};

export const RISK_LEVEL_RANK: Record<RescueRiskLevel, number> = {
  [RescueRiskLevel.CRITICAL]: 4,
  [RescueRiskLevel.HIGH]: 3,
  [RescueRiskLevel.MEDIUM]: 2,
  [RescueRiskLevel.LOW]: 1,
};

export interface RiskInput {
  now: Date;
  offer: {
    status: OfferStatus;
    kind: OfferKind;
    totalQuantity: number;
    remainingQuantity: number;
    currentPrice: number;
    floorPrice: number;
    priceChangeCount: number;
    pickupEnd: Date;
    createdAt: Date;
    updatedAt: Date;
  };
  /** Hạn dùng khai báo trên món (TrustPass). Không có thì để null - KHÔNG suy ra từ shelf-life (BR-B01-02). */
  item: { expiryAt: Date | null; preparedAt: Date | null } | null;
  orders: { sold: number; held: number; lastOrderAt: Date | null };
  handedOver: boolean;
}

export interface RiskResult {
  lotStatus: RescueLotStatus;
  quantityAvailable: number;
  expiryAt: Date | null;
  riskLevel: RescueRiskLevel | null;
  riskFactors: RescueRiskFactor[];
  dataQualityStatus: RescueDataQualityStatus;
  recommendedActions: RescueRecommendedAction[];
  /** Hạn chót bán/bàn giao thực tế = min(cuối khung nhận, hạn dùng hợp lệ) (BR-B01-06). */
  deadline: Date;
}

const MINUTE = 60 * 1000;

function pointsFor<T extends { points: number }>(rules: T[], match: (r: T) => boolean): number {
  return rules.find(match)?.points ?? 0;
}

export function calculateRisk(input: RiskInput): RiskResult {
  const { now, offer, item, orders } = input;
  const cfg = RESCUE_TIMELINE_CONFIG;
  const factors: RescueRiskFactor[] = [];
  const qty = offer.remainingQuantity;
  let quality = RescueDataQualityStatus.OK;

  // --- Hạn dùng: chỉ dùng khi có và hợp lệ ---
  let expiryAt: Date | null = item?.expiryAt ? new Date(item.expiryAt) : null;
  if (!expiryAt) {
    factors.push({
      code: 'EXPIRY_UNKNOWN',
      label: 'Chưa khai báo hạn dùng - chỉ tính theo cuối khung nhận, không tự suy ra hạn dùng',
      points: 0,
    });
  } else if (item?.preparedAt && expiryAt <= new Date(item.preparedAt)) {
    factors.push({
      code: 'EXPIRY_INVALID',
      label: 'Hạn dùng khai báo sớm hơn thời điểm chế biến - dữ liệu không hợp lệ, cần kiểm tra',
      value: { expiryAt, preparedAt: item.preparedAt },
      points: 0,
    });
    expiryAt = null;
    quality = RescueDataQualityStatus.INSUFFICIENT;
  }

  const pickupEnd = new Date(offer.pickupEnd);
  const deadline = expiryAt && expiryAt < pickupEnd ? expiryAt : pickupEnd;
  if (deadline !== pickupEnd) {
    factors.push({
      code: 'EXPIRY_BEFORE_PICKUP_END',
      label: 'Hạn dùng đến trước cuối khung nhận - lấy hạn dùng làm hạn chót',
      value: { expiryAt },
      points: 0,
    });
  }

  // --- Trạng thái lô (bước 7) ---
  let lotStatus = RescueLotStatus.ACTIVE;
  if (offer.status === OfferStatus.CLOSED || offer.status === OfferStatus.CANCELLED) {
    lotStatus = input.handedOver ? RescueLotStatus.HANDED_OVER : RescueLotStatus.CLOSED;
  } else if (offer.status === OfferStatus.SOLD_OUT || qty <= 0) {
    lotStatus = RescueLotStatus.SOLD_OUT;
  } else if (now >= deadline) {
    lotStatus = RescueLotStatus.EXPIRED;
  }

  if (lotStatus !== RescueLotStatus.ACTIVE) {
    return {
      lotStatus,
      quantityAvailable: qty,
      expiryAt,
      riskLevel: null,
      riskFactors: [
        { code: `LOT_${lotStatus}`, label: 'Lô đã kết thúc, không còn hành động', points: 0 },
      ],
      dataQualityStatus: RescueDataQualityStatus.OK,
      recommendedActions: [],
      deadline,
    };
  }

  // --- Yếu tố 1: thời gian còn ---
  const minutesLeft = Math.max(0, Math.round((deadline.getTime() - now.getTime()) / MINUTE));
  const timePoints = pointsFor(cfg.TIME_LEFT_POINTS, (r) => minutesLeft <= r.maxMinutes);
  factors.push({
    code: 'TIME_LEFT',
    label: `Còn ${minutesLeft} phút đến hạn chót`,
    value: { minutesLeft },
    points: timePoints,
  });

  // --- Yếu tố 2: số lượng còn ---
  const ratio = offer.totalQuantity > 0 ? qty / offer.totalQuantity : 1;
  const qtyPoints = pointsFor(cfg.REMAINING_RATIO_POINTS, (r) => ratio >= r.minRatio);
  factors.push({
    code: 'QUANTITY_REMAINING',
    label: `Còn ${qty}/${offer.totalQuantity} suất (${Math.round(ratio * 100)}%)`,
    value: { remaining: qty, total: offer.totalQuantity, ratio },
    points: qtyPoints,
  });

  // Đơn đang giữ suất đã được trừ vào remaining_quantity khi đặt - chỉ hiển thị, không trừ lần hai.
  if (orders.held > 0) {
    factors.push({
      code: 'HELD_ORDERS',
      label: `${orders.held} suất đang được giữ chờ thanh toán (đã trừ khỏi tồn)`,
      value: { held: orders.held },
      points: 0,
    });
  }

  // --- Yếu tố 3: tốc độ bán tham chiếu ---
  const listedMinutes = (now.getTime() - new Date(offer.createdAt).getTime()) / MINUTE;
  let velocityPoints = 0;
  if (listedMinutes < cfg.MIN_VELOCITY_WINDOW_MINUTES) {
    factors.push({
      code: 'VELOCITY_UNAVAILABLE',
      label: `Mới niêm yết ${Math.max(0, Math.round(listedMinutes))} phút - chưa đủ dữ liệu tốc độ bán`,
      value: { listedMinutes: Math.round(listedMinutes) },
      points: 0,
    });
    quality = RescueDataQualityStatus.INSUFFICIENT;
  } else {
    const committed = orders.sold + orders.held;
    const perHour = committed / (listedMinutes / 60);
    const projectedSales = perHour * (minutesLeft / 60);
    const projectedUnsold = Math.max(0, Math.round(qty - projectedSales));
    const unsoldRatio = qty > 0 ? projectedUnsold / qty : 0;
    velocityPoints = pointsFor(cfg.PROJECTED_UNSOLD_POINTS, (r) => unsoldRatio >= r.minRatio);
    factors.push({
      code: 'SALES_VELOCITY',
      label: `Tốc độ bán ~${perHour.toFixed(1)} suất/giờ, dự kiến dư ${projectedUnsold} suất`,
      value: { perHour: Number(perHour.toFixed(2)), projectedUnsold, unsoldRatio },
      points: velocityPoints,
    });
  }

  // --- Độ mới của tồn ---
  const lastSignal = Math.max(
    new Date(offer.updatedAt).getTime(),
    orders.lastOrderAt ? new Date(orders.lastOrderAt).getTime() : 0,
  );
  const signalAgeMinutes = Math.round((now.getTime() - lastSignal) / MINUTE);
  if (signalAgeMinutes > cfg.STOCK_STALE_MINUTES) {
    factors.push({
      code: 'STOCK_NOT_CONFIRMED',
      label: `Tồn chưa được cập nhật ${signalAgeMinutes} phút - có thể lệch bán tại quầy`,
      value: { minutesSinceLastUpdate: signalAgeMinutes },
      points: 0,
    });
    if (quality === RescueDataQualityStatus.OK) quality = RescueDataQualityStatus.STALE;
  }

  const score = timePoints + qtyPoints + velocityPoints;
  const riskLevel =
    quality === RescueDataQualityStatus.INSUFFICIENT
      ? null
      : (cfg.LEVEL_THRESHOLDS.find((t) => score >= t.minScore)?.level ?? RescueRiskLevel.LOW);

  // --- Đề xuất (BR-B01-04: chỉ gợi ý, không tự sửa giá/tồn) ---
  const actions: RescueRecommendedAction[] = [];
  if (quality !== RescueDataQualityStatus.OK) {
    actions.push({
      type: RescueActionType.UPDATE_STOCK,
      reason: 'Xác nhận lại tồn thực tế để tính chính xác',
    });
  }
  const urgent = riskLevel === RescueRiskLevel.HIGH || riskLevel === RescueRiskLevel.CRITICAL;
  if (
    urgent &&
    offer.priceChangeCount < cfg.MAX_PRICE_CHANGES &&
    offer.currentPrice > offer.floorPrice
  ) {
    actions.push({
      type: RescueActionType.ADJUST_PRICE,
      reason: 'Đề xuất giảm giá động (cần duyệt)',
    });
  }
  if (
    offer.kind === OfferKind.REGULAR &&
    (riskLevel === RescueRiskLevel.CRITICAL ||
      (riskLevel === RescueRiskLevel.HIGH && minutesLeft <= cfg.SURPRISE_BAG_MAX_MINUTES_LEFT))
  ) {
    actions.push({
      type: RescueActionType.CREATE_SURPRISE_BAG,
      reason: 'Gom phần dư vào túi bất ngờ',
    });
  }
  if (riskLevel === RescueRiskLevel.CRITICAL && minutesLeft <= cfg.RESCUE_BRIDGE_MAX_MINUTES_LEFT) {
    actions.push({
      type: RescueActionType.OPEN_RESCUE_BRIDGE,
      reason: 'Sắp hết hạn - cân nhắc bàn giao/quyên góp',
    });
  }

  return {
    lotStatus,
    quantityAvailable: qty,
    expiryAt,
    riskLevel,
    riskFactors: factors,
    dataQualityStatus: quality,
    recommendedActions: actions,
    deadline,
  };
}
