import { describe, expect, it } from 'vitest';
import { AnomalyDetectionEngine } from './engine';
import { AnomalyDetectionInput, DailyMetricRecord } from '../types/anomaly.types';

describe('AnomalyDetectionEngine', () => {
  it('hàm calculateMedian tính đúng trung vị cho dãy số lẻ và chẵn', () => {
    expect(AnomalyDetectionEngine.calculateMedian([10, 20, 30])).toBe(20);
    expect(AnomalyDetectionEngine.calculateMedian([10, 20, 30, 40])).toBe(25);
    expect(AnomalyDetectionEngine.calculateMedian([50])).toBe(50);
    expect(AnomalyDetectionEngine.calculateMedian([])).toBe(0);
  });

  it('hàm calculateMAD tính đúng độ lệch tuyệt đối trung vị', () => {
    // Dãy: 1, 2, 3, 4, 5, 6, 7 => Median = 4
    // Độ lệch: |1-4|=3, |2-4|=2, |3-4|=1, |4-4|=0, |5-4|=1, |6-4|=2, |7-4|=3
    // Sắp xếp: 0, 1, 1, 2, 2, 3, 3 => Median độ lệch = 2
    expect(AnomalyDetectionEngine.calculateMAD([1, 2, 3, 4, 5, 6, 7])).toBe(2);
    expect(AnomalyDetectionEngine.calculateMAD([50, 50, 50])).toBe(0);
  });

  // Helper tạo 28 ngày dữ liệu lịch sử chuẩn
  const createMockHistory = (daysCount = 28): DailyMetricRecord[] => {
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date('2026-09-14T00:00:00.000Z');
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getUTCDay();
      return {
        date: d.toISOString().split('T')[0],
        dayOfWeek,
        revenue: 1000000 + (i % 7) * 50000, // Doanh thu ổn định theo thứ
        wasteQuantity: 5,
        ordersCount: 30,
        noShowRate: 0.05,
      };
    });
  };

  it('từ chối phân tích nếu chưa đủ 28 ngày dữ liệu đường cơ sở (BR-096)', () => {
    const history = createMockHistory(27); // 27 ngày < 28 ngày
    const input: AnomalyDetectionInput = {
      storeId: 'store-01',
      targetDate: '2026-10-10',
      history,
      targetMetrics: {
        date: '2026-10-10',
        dayOfWeek: 6,
        revenue: 50000,
      },
    };

    const result = AnomalyDetectionEngine.detect(input);

    expect(result.isEligible).toBe(false);
    expect(result.totalHistoryDays).toBe(27);
    expect(result.reason).toContain('Chưa đủ 28 ngày');
    expect(result.anomalies).toHaveLength(0);
  });

  it('loại trừ ngày nghỉ (isHoliday) và sự kiện đặc biệt (isSpecialEvent) khỏi baseline (BR-096)', () => {
    const history = createMockHistory(28);
    // Gán 1 ngày thứ Hai trong lịch sử là Holiday với doanh thu sụt giảm cực mạnh
    history[0].isHoliday = true;
    history[0].revenue = 0;

    const input: AnomalyDetectionInput = {
      storeId: 'store-01',
      targetDate: '2026-10-12', // Thứ Hai
      history,
      targetMetrics: {
        date: '2026-10-12',
        dayOfWeek: 1, // Thứ Hai
        revenue: 1000000, // Doanh thu bình thường
      },
    };

    const result = AnomalyDetectionEngine.detect(input);
    expect(result.isEligible).toBe(true);
    // Không bị cảnh báo sai lệch do ngày nghỉ đã bị loại khỏi baseline
    expect(result.anomalies).toHaveLength(0);
  });

  it('phát hiện doanh thu sụt giảm bất thường (DROP) khi vượt ngưỡng 2.5 x MAD', () => {
    const history = createMockHistory(28);
    const targetMondayDate = '2026-10-12'; // Thứ Hai

    const input: AnomalyDetectionInput = {
      storeId: 'store-01',
      targetDate: targetMondayDate,
      history,
      targetMetrics: {
        date: targetMondayDate,
        dayOfWeek: 1, // Thứ Hai
        revenue: 100000, // 100k sụt giảm mạnh so với mức ~1.000.000đ
        wasteQuantity: 5,
        ordersCount: 30,
        noShowRate: 0.05,
      },
    };

    const result = AnomalyDetectionEngine.detect(input);

    expect(result.isEligible).toBe(true);
    const revenueAnomaly = result.anomalies.find((a) => a.metric === 'REVENUE');
    expect(revenueAnomaly).toBeDefined();
    expect(revenueAnomaly?.direction).toBe('DROP');
    expect(revenueAnomaly?.severity).toBe('CRITICAL');
    expect(revenueAnomaly?.explanation).toContain('sụt giảm bất thường');
  });

  it('phát hiện lượng hao hụt tăng vọt bất thường (SURGE)', () => {
    const history = createMockHistory(28);
    const targetDate = '2026-10-12';

    const input: AnomalyDetectionInput = {
      storeId: 'store-01',
      targetDate,
      history,
      targetMetrics: {
        date: targetDate,
        dayOfWeek: 1,
        revenue: 1000000,
        wasteQuantity: 50, // 50 phần hao hụt so với mức trung vị 5 phần
        ordersCount: 30,
        noShowRate: 0.05,
      },
    };

    const result = AnomalyDetectionEngine.detect(input);

    const wasteAnomaly = result.anomalies.find((a) => a.metric === 'WASTE_QUANTITY');
    expect(wasteAnomaly).toBeDefined();
    expect(wasteAnomaly?.direction).toBe('SURGE');
    expect(wasteAnomaly?.actualValue).toBe(50);
  });

  it('giới hạn tối đa 1 cảnh báo cho mỗi chỉ số trong ngày (BR-096)', () => {
    const history = createMockHistory(28);
    const input: AnomalyDetectionInput = {
      storeId: 'store-01',
      targetDate: '2026-10-12',
      history,
      targetMetrics: {
        date: '2026-10-12',
        dayOfWeek: 1,
        revenue: 50000, // Lệch
        wasteQuantity: 99, // Lệch
      },
    };

    const result = AnomalyDetectionEngine.detect(input);

    const metricCounts = result.anomalies.reduce(
      (acc, a) => {
        acc[a.metric] = (acc[a.metric] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const count of Object.values(metricCounts)) {
      expect(count).toBe(1); // Không bao giờ vượt quá 1 cảnh báo / metric / ngày
    }
  });

  it('hỗ trợ cấu hình mức độ nhạy sensitivity (LOW = 3.0 MAD, HIGH = 2.0 MAD)', () => {
    const history = createMockHistory(28);

    // Với độ nhạy LOW (3.0 MAD), ngưỡng phát hiện sẽ khắt khe hơn
    const resultLow = AnomalyDetectionEngine.detect({
      storeId: 'store-01',
      targetDate: '2026-10-12',
      history,
      targetMetrics: {
        date: '2026-10-12',
        dayOfWeek: 1,
        revenue: 750000,
      },
      config: { sensitivity: 'LOW' },
    });

    // Với độ nhạy HIGH (2.0 MAD), cảnh báo sẽ dễ kích hoạt hơn
    const resultHigh = AnomalyDetectionEngine.detect({
      storeId: 'store-01',
      targetDate: '2026-10-12',
      history,
      targetMetrics: {
        date: '2026-10-12',
        dayOfWeek: 1,
        revenue: 750000,
      },
      config: { sensitivity: 'HIGH' },
    });

    expect(resultLow.anomalies.length).toBeLessThanOrEqual(resultHigh.anomalies.length);
  });

  it('báo lỗi nếu thiếu storeId hoặc không tìm thấy bản ghi targetDate', () => {
    expect(() =>
      AnomalyDetectionEngine.detect({
        storeId: '',
        targetDate: '2026-10-12',
        history: [],
      }),
    ).toThrow('storeId không được để trống');

    expect(() =>
      AnomalyDetectionEngine.detect({
        storeId: 'store-01',
        targetDate: '2026-10-12',
        history: [],
      }),
    ).toThrow('Không tìm thấy dữ liệu chỉ số');
  });

  it('xử lý đường cơ sở có MAD = 0 (tất cả các ngày cùng giá trị) và tự động tìm targetDate trong history', () => {
    // 28 ngày lịch sử đều có wasteQuantity = 5 (MAD = 0)
    const history = createMockHistory(28);
    history.forEach((h) => {
      h.wasteQuantity = 5;
    });

    // Thêm ngày 29 vào history với ngày targetDate '2026-10-13' (Thứ Ba) và wasteQuantity = 20 (> 20% expected)
    history.push({
      date: '2026-10-13',
      dayOfWeek: 2,
      revenue: 1000000,
      wasteQuantity: 20, // Bất thường khi baseline chỉ là 5
      ordersCount: 30,
      noShowRate: 0.05,
    });

    const res = AnomalyDetectionEngine.detect({
      storeId: 'store-01',
      targetDate: '2026-10-13', // Không truyền targetMetrics, để engine tự tìm trong history
      history,
    });

    expect(res.isEligible).toBe(true);
    const wasteAnomaly = res.anomalies.find((a) => a.metric === 'WASTE_QUANTITY');
    expect(wasteAnomaly).toBeDefined();
    expect(wasteAnomaly?.direction).toBe('SURGE');
  });
});
