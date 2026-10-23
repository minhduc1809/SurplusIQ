import {
  DailySalesRecord,
  ForecastInput,
  ForecastOutput,
  ForecastConfidence,
  SpecialEventContext,
} from '../types/forecast.types';
import { DayContext, ForecastResult, HistoricalSalesRecord } from '../types';

const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

export class ForecastingEngine {
  /**
   * Tính toán lượng bánh/thực phẩm sản xuất ngày mai (Chuẩn BRD 5.12 R2-036..R2-043)
   *
   * Quy tắc nghiệp vụ bắt buộc:
   * 1. Dưới 14 ngày dữ liệu (< 14 ngày): Fallback dùng số hôm qua, cờ LOW (BR-060).
   * 2. Từ 14 ngày trở lên (>= 14 ngày): Trung bình cùng thứ trong tuần (Day of Week).
   * 3. Tuyệt đối bỏ yếu tố thời tiết (Chương 13 #10).
   * 4. Áp dụng hệ số sự kiện đặc biệt (R2-040, BR-063) và bù cầu khi hết hàng sớm (+10%).
   */
  public static generateForecast(input: ForecastInput): ForecastOutput {
    const { itemId, targetDate, targetDayOfWeek, history = [], specialEvent } = input;
    const historyDaysCount = history.length;

    // 1. Trường hợp 0 ngày dữ liệu: Yêu cầu chủ quán nhập tay ban đầu (R2-042)
    if (historyDaysCount === 0) {
      return {
        itemId,
        targetDate,
        recommended: 0,
        low: 0,
        high: 0,
        confidence: 'LOW',
        method: 'MANUAL_REQUIRED',
        explanation:
          'Chưa có dữ liệu lịch sử bán hàng. Vui lòng chủ tiệm tự nhập số lượng kế hoạch ban đầu (BRD R2-042).',
        components: {
          historyDaysCount: 0,
        },
        recommendedProduction: 20, // Giá trị mặc định tương thích
        confidenceScore: 0.3,
      };
    }

    // 2. Trường hợp dưới 14 ngày dữ liệu (< 14 ngày): Dùng số hôm qua, cờ LOW (BR-060)
    if (historyDaysCount < 14) {
      const yesterday = history[historyDaysCount - 1];
      const yesterdaySales =
        yesterday.soldApp + yesterday.soldOffline > 0
          ? yesterday.soldApp + yesterday.soldOffline
          : yesterday.produced;

      const recommended = Math.max(1, Math.round(yesterdaySales));
      const low = Math.max(1, Math.round(recommended * 0.8));
      const high = Math.max(low, Math.round(recommended * 1.2));

      return {
        itemId,
        targetDate,
        recommended,
        low,
        high,
        confidence: 'LOW',
        method: 'YESTERDAY_FALLBACK',
        explanation: `Chưa đủ 14 ngày dữ liệu (hiện có ${historyDaysCount} ngày). Đề xuất tạm tính theo số lượng bán hôm qua (${yesterdaySales} sản phẩm). Độ tin cậy: THẤP (BR-060).`,
        components: {
          historyDaysCount,
        },
        recommendedProduction: recommended,
        confidenceScore: 0.45,
      };
    }

    // 3. Trường hợp từ 14 ngày trở lên (>= 14 ngày): Mô hình Trung bình thứ (DOW)
    const sameDowRecords = history.filter((r) => r.dayOfWeek === targetDayOfWeek);

    // Nếu kỳ lạ không có ngày nào cùng thứ (ví dụ lịch sử bị khuyết ngày)
    if (sameDowRecords.length === 0) {
      const yesterday = history[historyDaysCount - 1];
      const fallbackSales = yesterday.soldApp + yesterday.soldOffline || yesterday.produced;
      const recommended = Math.max(1, Math.round(fallbackSales));
      return {
        itemId,
        targetDate,
        recommended,
        low: Math.max(1, Math.round(recommended * 0.8)),
        high: Math.round(recommended * 1.2),
        confidence: 'LOW',
        method: 'YESTERDAY_FALLBACK',
        explanation: `Không tìm thấy ngày ${DAY_NAMES[targetDayOfWeek]} nào trong lịch sử. Tạm dùng số liệu gần nhất.`,
        components: {
          historyDaysCount,
          dowSampleCount: 0,
        },
        recommendedProduction: recommended,
        confidenceScore: 0.4,
      };
    }

    // Tính lượng bán hiệu dụng (bù +10% nếu có ngày hết hàng sớm stockoutEarly)
    const effectiveSalesList = sameDowRecords.map((r) => {
      const sold = r.soldApp + r.soldOffline;
      return r.stockoutEarly ? sold * 1.1 : sold;
    });

    const sumSales = effectiveSalesList.reduce((acc, val) => acc + val, 0);
    const baseDowAverage = sumSales / effectiveSalesList.length;

    // Tính độ lệch chuẩn mẫu (Standard Deviation)
    const variance =
      effectiveSalesList.length > 1
        ? effectiveSalesList.reduce((acc, val) => acc + Math.pow(val - baseDowAverage, 2), 0) /
          (effectiveSalesList.length - 1)
        : Math.pow(baseDowAverage * 0.15, 2);
    const stdDev = Math.sqrt(variance);

    // Hệ số sự kiện đặc biệt (Special Event Factor - R2-040, BR-063)
    const eventFactor = this.calculateEventFactor(specialEvent);

    // Số lượng khuyến nghị (nếu đóng cửa thì 0, ngược lại làm tròn nguyên dương)
    const recommended =
      eventFactor === 0 ? 0 : Math.max(1, Math.round(baseDowAverage * eventFactor));

    // Khoảng tin cậy [Low, High] dựa trên 1.28 * stdDev (khoảng ~80%)
    const margin = 1.28 * stdDev * eventFactor;
    const low =
      eventFactor === 0 ? 0 : Math.max(1, Math.round(baseDowAverage * eventFactor - margin));
    const high =
      eventFactor === 0
        ? 0
        : Math.max(recommended, Math.round(baseDowAverage * eventFactor + margin));

    // Đánh giá độ tin cậy và sai số MAPE 7 ngày gần nhất
    const mape7Days = this.calculateBacktestMape(history);
    const confidence = this.evaluateConfidence(sameDowRecords.length, mape7Days);

    // Template giải thích tiếng Việt chuẩn theo BRD 5.12.6 R2-037
    const dayName = DAY_NAMES[targetDayOfWeek] || `Thứ ${targetDayOfWeek}`;
    let eventExplanation = '';
    if (specialEvent) {
      const percent = Math.round((eventFactor - 1) * 100);
      const sign = percent >= 0 ? `+${percent}%` : `${percent}%`;
      eventExplanation = `, sự kiện ${specialEvent.type} (${sign})`;
    }

    const confidenceLabel =
      confidence === 'HIGH' ? 'CAO' : confidence === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP';

    const explanation = `Dự báo ${dayName} dựa trên trung bình ${sameDowRecords.length} ngày cùng thứ (${Math.round(baseDowAverage)} sản phẩm)${eventExplanation}. Khoảng khuyến nghị: ${low}–${high} sản phẩm. Độ tin cậy: ${confidenceLabel}.`;

    const confidenceScore = confidence === 'HIGH' ? 0.85 : confidence === 'MEDIUM' ? 0.65 : 0.45;

    return {
      itemId,
      targetDate,
      recommended,
      low,
      high,
      confidence,
      method: 'DOW_AVERAGE',
      explanation,
      components: {
        historyDaysCount,
        baseDowAverage: Math.round(baseDowAverage * 10) / 10,
        eventFactor,
        mape7Days: Number(mape7Days.toFixed(3)),
        dowSampleCount: sameDowRecords.length,
      },
      recommendedProduction: recommended,
      confidenceScore,
    };
  }

  /**
   * Adapter tương thích ngược với API cũ và Simulation (apps/simulation)
   */
  public static calculateForecast(
    productId: string,
    history: HistoricalSalesRecord[],
    targetDay: DayContext,
  ): ForecastResult {
    // Chuyển đổi HistoricalSalesRecord cũ sang DailySalesRecord
    const convertedHistory: DailySalesRecord[] = (history || []).map((h, index) => ({
      date: h.date || `2026-10-${String(index + 1).padStart(2, '0')}`,
      dayOfWeek: h.dayOfWeek,
      produced: h.quantityProduced,
      soldApp: h.quantitySold,
      soldOffline: 0,
      stockoutEarly: false,
    }));

    // Chuyển đổi DayContext sang SpecialEventContext (bỏ thời tiết theo Chương 13 #10)
    let specialEvent: SpecialEventContext | undefined;
    if (targetDay.isHoliday) {
      specialEvent = { type: 'HOLIDAY', impactLevel: 'MEDIUM' };
    } else if (targetDay.isSpecialEvent) {
      specialEvent = { type: 'LOCAL_EVENT', impactLevel: 'LOW' };
    }

    const output = this.generateForecast({
      itemId: productId,
      targetDate: '2026-10-13',
      targetDayOfWeek: targetDay.dayOfWeek,
      history: convertedHistory,
      specialEvent,
    });

    return {
      productId,
      recommendedProduction: output.recommendedProduction,
      confidenceScore: output.confidenceScore,
      breakdown: {
        baseAverage: output.components.baseDowAverage ?? output.recommendedProduction,
        dayOfWeekFactor: 1.0,
        weatherFactor: 1.0, // Đã loại bỏ thời tiết theo Chương 13 #10
        eventFactor: output.components.eventFactor ?? 1.0,
      },
      explanation: output.explanation,
    };
  }

  /**
   * Tính hệ số sự kiện đặc biệt (R2-040, BR-063)
   */
  private static calculateEventFactor(event?: SpecialEventContext): number {
    if (!event) {
      return 1.0;
    }

    if (event.type === 'CLOSURE') {
      return 0.0;
    }

    switch (event.impactLevel) {
      case 'HIGH':
        return 1.4; // +40%
      case 'MEDIUM':
        return 1.25; // +25%
      case 'LOW':
      default:
        return 1.1; // +10%
    }
  }

  /**
   * MAPE thật bằng backtest: với mỗi ngày trong 7 ngày gần nhất, dự báo bằng trung bình cùng thứ của các
   * ngày TRƯỚC đó rồi so với lượng bán thực tế. (Không dùng chênh lệch sản xuất - bán: đó là hao hụt, không phải sai số dự báo.)
   * Ngày không có mẫu cùng thứ trước đó hoặc không bán được gì bị bỏ qua; không có ngày nào tính được thì mặc định 0,2.
   */
  private static calculateBacktestMape(history: DailySalesRecord[]): number {
    const demand = (r: DailySalesRecord) => {
      const sold = r.soldApp + r.soldOffline;
      return r.stockoutEarly ? sold * 1.1 : sold;
    };
    const errors: number[] = [];
    for (let i = Math.max(0, history.length - 7); i < history.length; i++) {
      const actual = demand(history[i]);
      if (actual <= 0) continue;
      const prior = history.slice(0, i).filter((r) => r.dayOfWeek === history[i].dayOfWeek);
      if (prior.length === 0) continue;
      const predicted = prior.reduce((sum, r) => sum + demand(r), 0) / prior.length;
      errors.push(Math.abs(actual - predicted) / actual);
    }
    return errors.length === 0 ? 0.2 : errors.reduce((a, b) => a + b, 0) / errors.length;
  }

  /**
   * Đánh giá độ tin cậy dựa trên số mẫu cùng thứ và độ ổn định MAPE
   */
  private static evaluateConfidence(dowSampleCount: number, mape: number): ForecastConfidence {
    if (dowSampleCount >= 4 && mape <= 0.2) {
      return 'HIGH';
    }
    if (dowSampleCount >= 2 && mape <= 0.35) {
      return 'MEDIUM';
    }
    return 'LOW';
  }
}
