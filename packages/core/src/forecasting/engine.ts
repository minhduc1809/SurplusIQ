import { DayContext, ForecastResult, HistoricalSalesRecord, WeatherType } from '../types';

export class ForecastingEngine {
  /**
   * Tính toán lượng bánh/thực phẩm nên sản xuất vào ngày mai
   * Mô hình: Weighted Moving Average kết hợp Multipliers (Thứ trong tuần, thời tiết, sự kiện)
   */
  public static calculateForecast(
    productId: string,
    history: HistoricalSalesRecord[],
    targetDay: DayContext
  ): ForecastResult {
    if (!history || history.length === 0) {
      return {
        productId,
        recommendedProduction: 20,
        confidenceScore: 0.5,
        breakdown: {
          baseAverage: 20,
          dayOfWeekFactor: 1.0,
          weatherFactor: 1.0,
          eventFactor: 1.0,
        },
        explanation: 'Chưa có đủ lịch sử bán hàng, áp dụng số lượng khởi đầu mặc định (20 sản phẩm).',
      };
    }

    // 1. Tính base average từ lịch sử gần nhất (30 ngày gần nhất)
    const recentHistory = history.slice(-30);
    const totalSold = recentHistory.reduce((sum, item) => sum + item.quantitySold, 0);
    const baseAverage = Math.round(totalSold / recentHistory.length);

    // 2. Hệ số thứ trong tuần (Day of Week Factor)
    const sameDayRecords = recentHistory.filter((item) => item.dayOfWeek === targetDay.dayOfWeek);
    let dayOfWeekFactor = 1.0;
    if (sameDayRecords.length > 0) {
      const avgSameDay = sameDayRecords.reduce((sum, item) => sum + item.quantitySold, 0) / sameDayRecords.length;
      dayOfWeekFactor = baseAverage > 0 ? avgSameDay / baseAverage : 1.0;
    }

    // 3. Hệ số thời tiết (Weather Factor)
    // Ví dụ: Trời mưa giảm lượng khách ghé tiệm bánh trực tiếp
    const weatherFactorMap: Record<WeatherType, number> = {
      SUNNY: 1.05,
      CLOUDY: 1.0,
      RAINY: 0.85,
      STORMY: 0.65,
    };
    const weatherFactor = weatherFactorMap[targetDay.weather] || 1.0;

    // 4. Hệ số ngày lễ/sự kiện (Event Factor)
    let eventFactor = 1.0;
    if (targetDay.isHoliday) {
      eventFactor = 1.25;
    } else if (targetDay.isSpecialEvent) {
      eventFactor = 1.15;
    }

    // 5. Tính lượng đề xuất
    const rawForecast = baseAverage * dayOfWeekFactor * weatherFactor * eventFactor;
    const recommendedProduction = Math.max(1, Math.round(rawForecast));

    // 6. Tính độ tin cậy dựa trên số lượng mẫu
    const confidenceScore = Math.min(0.95, 0.5 + (recentHistory.length / 30) * 0.45);

    // 7. Tạo câu giải thích dễ hiểu (Rationale)
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const weatherDescriptions: Record<WeatherType, string> = {
      SUNNY: 'trời nắng ráo',
      CLOUDY: 'trời râm mát',
      RAINY: 'dự báo có mưa làm giảm lưu lượng khách vãng lai (-15%)',
      STORMY: 'dự báo bão/mưa lớn (-35%)',
    };

    const explanation = [
      `Mức bán trung bình 30 ngày: ${baseAverage} món.`,
      `${dayNames[targetDay.dayOfWeek]} thường bán ${dayOfWeekFactor >= 1.0 ? '+' : ''}${Math.round((dayOfWeekFactor - 1) * 100)}% so với ngày thường.`,
      `Yếu tố thời tiết: ${weatherDescriptions[targetDay.weather]}.`,
      targetDay.isHoliday ? 'Ngày lễ có sức mua tăng đột biến (+25%).' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      productId,
      recommendedProduction,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      breakdown: {
        baseAverage,
        dayOfWeekFactor: Math.round(dayOfWeekFactor * 100) / 100,
        weatherFactor: Math.round(weatherFactor * 100) / 100,
        eventFactor: Math.round(eventFactor * 100) / 100,
      },
      explanation,
    };
  }
}
