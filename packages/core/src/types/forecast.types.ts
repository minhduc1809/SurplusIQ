/**
 * SurplusIQ Forecasting Engine Types
 * Tuân thủ BRD 5.12 (R2-036..R2-043), BR-060..BR-063, Chương 13 #10
 */

export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0..6 (0: Chủ Nhật, 1..6: Thứ 2..Thứ 7)
  produced: number;
  soldApp: number;
  soldOffline: number;
  stockoutEarly?: boolean; // Hết hàng sớm trước giờ đóng cửa (bù cầu +10%)
}

export type SpecialEventType = 'HOLIDAY' | 'PROMOTION' | 'LOCAL_EVENT' | 'CLOSURE';
export type SpecialEventImpact = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SpecialEventContext {
  type: SpecialEventType;
  impactLevel: SpecialEventImpact;
  name?: string;
}

export interface ForecastInput {
  itemId: string;
  targetDate: string; // YYYY-MM-DD
  targetDayOfWeek: number; // 0..6
  history: DailySalesRecord[]; // Sắp xếp tăng dần theo ngày
  specialEvent?: SpecialEventContext;
}

export type ForecastConfidence = 'LOW' | 'MEDIUM' | 'HIGH';
export type ForecastMethod = 'DOW_AVERAGE' | 'YESTERDAY_FALLBACK' | 'MANUAL_REQUIRED';

export interface ForecastOutput {
  itemId: string;
  targetDate: string;
  recommended: number;
  low: number;
  high: number;
  confidence: ForecastConfidence;
  method: ForecastMethod;
  explanation: string; // Template tiếng Việt theo BRD 5.12.6 R2-037
  components: {
    historyDaysCount: number;
    baseDowAverage?: number;
    eventFactor?: number;
    mape7Days?: number;
    dowSampleCount?: number;
  };
  // Tương thích ngược với Simulation / API cũ
  recommendedProduction: number;
  confidenceScore: number;
}
