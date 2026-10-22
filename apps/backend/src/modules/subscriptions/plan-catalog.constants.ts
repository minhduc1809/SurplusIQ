import { SubscriptionPlan } from '../../entities/subscriptions/subscription.entity';

/** Giá Pro 300.000đ/30 ngày là tham số giả định theo BRD (chương 8, GOI-PRO); đổi tại đây, không ghi cứng nơi khác. */
export const PRO_PRICE_VND = 300_000;
export const PRO_PERIOD_DAYS = 30;

/** Số ngày lịch sử báo cáo hao hụt/kinh doanh được xem (BRD 3.3: 7 ngày Cơ bản, 365 ngày Pro). */
export const REPORT_HISTORY_DAYS: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.BASIC]: 7,
  [SubscriptionPlan.PRO]: 365,
  [SubscriptionPlan.TRIAL]: 365,
};

/** Tính năng chỉ có ở Pro hoặc dùng thử (BRD 3.3, cột Gói tối thiểu). */
export const PRO_FEATURES = [
  { key: 'forecast', name: 'Dự báo số lượng nên làm cho ngày mai và xu hướng 7 ngày' },
  { key: 'daily_actuals', name: 'Số thực tế cuối ngày và sự kiện đặc biệt' },
  { key: 'dynamic_pricing', name: 'Định giá động: đề xuất giá giảm theo giờ' },
  { key: 'deep_reports', name: 'Báo cáo chuyên sâu: theo giờ, hiệu quả giá' },
  { key: 'customer_segments', name: 'Phân nhóm khách hàng' },
  { key: 'simulation', name: 'Phòng mô phỏng chính sách' },
  { key: 'ai_insights', name: 'AI: bất thường, nguyên nhân, đề xuất hành động, tóm tắt tuần' },
] as const;
