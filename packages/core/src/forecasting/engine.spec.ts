import { describe, it, expect } from 'vitest';
import { ForecastingEngine } from './engine';
import { DailySalesRecord } from '../types/forecast.types';

describe('ForecastingEngine (BRD 5.12 R2-036..043, BR-060..063, Ch.13 #10)', () => {
  // Helper sinh dữ liệu mẫu N ngày
  function generateHistory(daysCount: number, baseSales: number = 30): DailySalesRecord[] {
    const list: DailySalesRecord[] = [];
    for (let i = 0; i < daysCount; i++) {
      const dayOfWeek = i % 7; // 0..6
      const dateStr = `2026-09-${String(i + 1).padStart(2, '0')}`;
      // Doanh số dao động nhẹ
      const variance = i % 3 === 0 ? 2 : -2;
      const sold = baseSales + variance;
      list.push({
        date: dateStr,
        dayOfWeek,
        produced: sold + 2,
        soldApp: Math.round(sold * 0.4),
        soldOffline: Math.round(sold * 0.6),
        stockoutEarly: false,
      });
    }
    return list;
  }

  describe('1. Trường hợp thiếu dữ liệu (< 14 ngày) & Cold-start (BR-060, R2-042)', () => {
    it('khi có 0 ngày dữ liệu: yêu cầu chủ quán nhập tay ban đầu (MANUAL_REQUIRED)', () => {
      const result = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1, // Thứ 2
        history: [],
      });

      expect(result.method).toBe('MANUAL_REQUIRED');
      expect(result.confidence).toBe('LOW');
      expect(result.recommended).toBe(0);
      expect(result.explanation).toContain('Vui lòng chủ tiệm tự nhập số lượng kế hoạch ban đầu');
    });

    it('khi có dưới 14 ngày (ví dụ 10 ngày): fallback dùng số hôm qua kèm cờ LOW (BR-060)', () => {
      const history10Days = generateHistory(10, 40);
      // Ngày cuối cùng (ngày 10, index 9)
      const yesterday = history10Days[9];
      const yesterdayTotal = yesterday.soldApp + yesterday.soldOffline;

      const result = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history10Days,
      });

      expect(result.method).toBe('YESTERDAY_FALLBACK');
      expect(result.confidence).toBe('LOW');
      expect(result.recommended).toBe(yesterdayTotal);
      expect(result.components.historyDaysCount).toBe(10);
      expect(result.explanation).toContain('Chưa đủ 14 ngày dữ liệu');
      expect(result.explanation).toContain('THẤP');
    });
  });

  describe('2. Trường hợp đủ dữ liệu (>= 14 ngày): Mô hình Trung bình thứ (DOW_AVERAGE)', () => {
    it('chạy mô hình DOW và chỉ lấy trung bình các ngày có cùng thứ trong tuần', () => {
      // Tạo 28 ngày lịch sử (đúng 4 tuần, mỗi thứ xuất hiện 4 lần)
      const history28Days: DailySalesRecord[] = [];
      for (let i = 0; i < 28; i++) {
        const dow = i % 7;
        // Giả sử ngày Thứ Hai (dow = 1) bán đúng 50 cái, các ngày khác bán 30 cái
        const sales = dow === 1 ? 50 : 30;
        history28Days.push({
          date: `2026-09-${String(i + 1).padStart(2, '0')}`,
          dayOfWeek: dow,
          produced: sales,
          soldApp: Math.round(sales * 0.5),
          soldOffline: Math.round(sales * 0.5),
          stockoutEarly: false,
        });
      }

      // Dự báo cho Thứ Hai (targetDayOfWeek = 1)
      const resultMonday = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history28Days,
      });

      expect(resultMonday.method).toBe('DOW_AVERAGE');
      expect(resultMonday.recommended).toBe(50);
      expect(resultMonday.components.dowSampleCount).toBe(4);
      expect(resultMonday.components.baseDowAverage).toBe(50);

      // Dự báo cho Thứ Ba (targetDayOfWeek = 2)
      const resultTuesday = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-13',
        targetDayOfWeek: 2,
        history: history28Days,
      });

      expect(resultTuesday.recommended).toBe(30);
    });

    it('bù thêm 10% cầu khi ngày trong quá khứ bị hết hàng sớm (stockoutEarly = true)', () => {
      // 14 ngày, Thứ Hai (dow = 1) xuất hiện 2 lần
      const history14Days: DailySalesRecord[] = [];
      for (let i = 0; i < 14; i++) {
        const dow = i % 7;
        const isStockout = dow === 1 && i === 1; // Lần thứ 2 bị hết hàng sớm
        history14Days.push({
          date: `2026-09-${String(i + 1).padStart(2, '0')}`,
          dayOfWeek: dow,
          produced: 40,
          soldApp: 20,
          soldOffline: 20, // Tổng bán 40
          stockoutEarly: isStockout, // Lần này bù 10% thành 44
        });
      }

      const result = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history14Days,
      });

      // Trung bình giữa 40 và 44 = 42
      expect(result.recommended).toBe(42);
    });
  });

  describe('3. Áp dụng hệ số Sự kiện đặc biệt (R2-040, BR-063)', () => {
    it('nhân hệ số sự kiện tương ứng: LOW (+10%), MEDIUM (+25%), HIGH (+40%), CLOSURE (0)', () => {
      const history21Days = generateHistory(21, 40);

      // 1. Không có sự kiện -> 40
      const resNormal = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history21Days,
      });
      const baseRec = resNormal.recommended;

      // 2. Sự kiện LOW (+10%)
      const resLow = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history21Days,
        specialEvent: { type: 'LOCAL_EVENT', impactLevel: 'LOW' },
      });
      expect(resLow.recommended).toBe(Math.round(baseRec * 1.1));

      // 3. Sự kiện MEDIUM (+25%)
      const resMed = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history21Days,
        specialEvent: { type: 'PROMOTION', impactLevel: 'MEDIUM' },
      });
      expect(resMed.recommended).toBe(Math.round(baseRec * 1.25));

      // 4. Sự kiện HIGH (+40%)
      const resHigh = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history21Days,
        specialEvent: { type: 'HOLIDAY', impactLevel: 'HIGH' },
      });
      expect(resHigh.recommended).toBe(Math.round(baseRec * 1.4));

      // 5. Đóng cửa (CLOSURE -> 0, nhưng chặn dưới Math.max(1, 0) theo hàm logic)
      const resClosure = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: history21Days,
        specialEvent: { type: 'CLOSURE', impactLevel: 'HIGH' },
      });
      expect(resClosure.components.eventFactor).toBe(0);
    });
  });

  describe('4. Bỏ yếu tố thời tiết theo Chương 13 #10', () => {
    it('kiểm tra kết quả không đổi bất kể thời tiết nắng, mưa hay bão trong adapter cũ', () => {
      const history = generateHistory(20, 30);
      const daySunny = {
        dayOfWeek: 1,
        weather: 'SUNNY' as const,
        isHoliday: false,
        isSpecialEvent: false,
      };
      const dayStormy = {
        dayOfWeek: 1,
        weather: 'STORMY' as const,
        isHoliday: false,
        isSpecialEvent: false,
      };

      const resSunny = ForecastingEngine.calculateForecast(
        'item-01',
        history.map((h) => ({
          date: h.date,
          dayOfWeek: h.dayOfWeek,
          weather: 'SUNNY',
          isHoliday: false,
          quantityProduced: h.produced,
          quantitySold: h.soldApp + h.soldOffline,
          quantityWasted: 0,
        })),
        daySunny,
      );

      const resStormy = ForecastingEngine.calculateForecast(
        'item-01',
        history.map((h) => ({
          date: h.date,
          dayOfWeek: h.dayOfWeek,
          weather: 'STORMY',
          isHoliday: false,
          quantityProduced: h.produced,
          quantitySold: h.soldApp + h.soldOffline,
          quantityWasted: 0,
        })),
        dayStormy,
      );

      // Giá trị sản lượng khuyến nghị phải hoàn toàn bằng nhau vì thời tiết đã bị loại bỏ
      expect(resSunny.recommendedProduction).toBe(resStormy.recommendedProduction);
      expect(resSunny.breakdown.weatherFactor).toBe(1.0);
      expect(resStormy.breakdown.weatherFactor).toBe(1.0);
    });
  });

  describe('5. Tính toán khoảng tin cậy [Low, High]', () => {
    it('khoảng Low luôn nhỏ hơn hoặc bằng Recommended và High lớn hơn hoặc bằng Recommended', () => {
      const history = generateHistory(21, 35);
      const result = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 3,
        history,
      });

      expect(result.low).toBeLessThanOrEqual(result.recommended);
      expect(result.high).toBeGreaterThanOrEqual(result.recommended);
      expect(result.low).toBeGreaterThanOrEqual(1);
    });

    it('xử lý sự kiện CLOSURE và ngày lễ/sự kiện trong calculateForecast', () => {
      const history = generateHistory(14, 30);
      const resClosure = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history,
        specialEvent: { type: 'CLOSURE', impactLevel: 'HIGH' },
      });
      expect(resClosure.recommended).toBe(0);

      // Test calculateForecast với isSpecialEvent = true
      const resSpecial = ForecastingEngine.calculateForecast(
        'item-01',
        history.map((h) => ({
          date: h.date,
          dayOfWeek: h.dayOfWeek,
          weather: 'SUNNY',
          isHoliday: false,
          quantityProduced: h.produced,
          quantitySold: h.soldApp + h.soldOffline,
          quantityWasted: 0,
        })),
        {
          dayOfWeek: 1,
          weather: 'SUNNY',
          isHoliday: false,
          isSpecialEvent: true,
        },
      );
      expect(resSpecial.recommendedProduction).toBeGreaterThan(0);

      // Test calculateForecast với isHoliday = true
      const resHoliday = ForecastingEngine.calculateForecast(
        'item-01',
        history.map((h) => ({
          date: h.date,
          dayOfWeek: h.dayOfWeek,
          weather: 'SUNNY',
          isHoliday: false,
          quantityProduced: h.produced,
          quantitySold: h.soldApp + h.soldOffline,
          quantityWasted: 0,
        })),
        {
          dayOfWeek: 1,
          weather: 'SUNNY',
          isHoliday: true,
          isSpecialEvent: false,
        },
      );
      expect(resHoliday.recommendedProduction).toBeGreaterThan(0);

      // Test lịch sử có biến động lớn hoặc mẫu ít dẫn đến confidence LOW
      const fluctuatingHistory = generateHistory(14, 50).map((h, i) => ({
        ...h,
        soldApp: i % 2 === 0 ? 5 : 45,
        produced: 50,
      }));
      const resLowConf = ForecastingEngine.generateForecast({
        itemId: 'item-01',
        targetDate: '2026-10-12',
        targetDayOfWeek: 1,
        history: fluctuatingHistory,
      });
      expect(['LOW', 'MEDIUM']).toContain(resLowConf.confidence);
    });
  });
});
