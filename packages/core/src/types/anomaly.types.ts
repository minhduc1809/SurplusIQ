/**
 * SurplusIQ Robust Statistical Anomaly Detection Engine Types
 * Tuân thủ BRD 5.26 (R2-099, R2-112), BR-096
 */

export type AnomalyMetricType =
  | 'REVENUE'
  | 'WASTE_QUANTITY'
  | 'ORDERS_COUNT'
  | 'NOSHOW_RATE';

export type AnomalySensitivity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DailyMetricRecord {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy
  isHoliday?: boolean; // Nếu true, loại khỏi đường cơ sở theo BR-096
  isSpecialEvent?: boolean; // Nếu true, loại khỏi đường cơ sở theo BR-096
  revenue?: number;
  wasteQuantity?: number;
  ordersCount?: number;
  noShowRate?: number;
  customMetrics?: Record<string, number>;
}

export interface AnomalyThresholdConfig {
  minHistoryDays?: number; // Mặc định 28 ngày (BR-096)
  sensitivity?: AnomalySensitivity; // LOW (3.0), MEDIUM (2.5), HIGH (2.0)
  madMultiplier?: number; // Ngưỡng nhân MAD (mặc định 2.5 theo BR-096)
}

export type AnomalyDirection = 'SURGE' | 'DROP';

export interface DetectedAnomaly {
  id: string;
  metric: AnomalyMetricType | string;
  date: string;
  actualValue: number;
  expectedValue: number; // Median (Trung vị) của ngày thứ đó
  madValue: number; // Độ lệch tuyệt đối trung vị (MAD)
  deviation: number; // |actualValue - expectedValue|
  madScore: number; // deviation / MAD (làm tròn 2 chữ số)
  direction: AnomalyDirection; // SURGE (tăng vọt) hoặc DROP (sụt giảm)
  threshold: number; // madMultiplier * MAD
  severity: 'WARNING' | 'CRITICAL';
  explanation: string; // Template giải thích tiếng Việt rõ ràng theo R2-112
}

export interface AnomalyDetectionInput {
  storeId: string;
  targetDate: string | Date; // Ngày cần kiểm định bất thường
  history: DailyMetricRecord[]; // Dữ liệu lịch sử (cần >= 28 ngày)
  targetMetrics?: DailyMetricRecord; // Chỉ số của targetDate (nếu chưa nằm trong history)
  config?: AnomalyThresholdConfig;
}

export interface AnomalyDetectionResult {
  storeId: string;
  targetDate: string;
  isEligible: boolean; // True nếu totalHistoryDays >= 28
  totalHistoryDays: number;
  eligibleBaselineDays: number; // Số ngày cơ sở sau khi loại ngày nghỉ/sự kiện
  reason?: string;
  anomalies: DetectedAnomaly[]; // Tối đa 1 cảnh báo mỗi chỉ số trong ngày (BR-096)
}
