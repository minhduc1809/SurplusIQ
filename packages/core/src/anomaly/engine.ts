import type {
  AnomalyDetectionInput,
  AnomalyDetectionResult,
  AnomalyDirection,
  AnomalyMetricType,
  DailyMetricRecord,
  DetectedAnomaly,
} from '../types/anomaly.types';

export class AnomalyDetectionEngine {
  /** Số ngày lịch sử tối thiểu bắt buộc để kích hoạt phát hiện bất thường (BR-096) */
  public static readonly DEFAULT_MIN_HISTORY_DAYS = 28;
  /** Hệ số nhân MAD chuẩn (2.5) theo BR-096 */
  public static readonly DEFAULT_MAD_MULTIPLIER = 2.5;

  private static readonly SENSITIVITY_MAP = {
    LOW: 3.0,
    MEDIUM: 2.5,
    HIGH: 2.0,
  } as const;

  private static readonly DAY_OF_WEEK_NAMES = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];

  private static readonly METRIC_LABELS: Record<
    AnomalyMetricType,
    { label: string; unit: string }
  > = {
    REVENUE: { label: 'Doanh thu', unit: 'đ' },
    WASTE_QUANTITY: { label: 'Lượng hao hụt', unit: 'phần' },
    ORDERS_COUNT: { label: 'Số lượng đơn', unit: 'đơn' },
    NOSHOW_RATE: { label: 'Tỷ lệ không đến nhận', unit: '%' },
  };

  /**
   * Tính trung vị (Median) của dãy số
   */
  public static calculateMedian(numbers: number[]): number {
    if (!numbers || numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Tính độ lệch tuyệt đối trung vị (Median Absolute Deviation - MAD)
   */
  public static calculateMAD(numbers: number[], medianVal?: number): number {
    if (!numbers || numbers.length <= 1) return 0;
    const median =
      typeof medianVal === 'number' ? medianVal : this.calculateMedian(numbers);
    const deviations = numbers.map((x) => Math.abs(x - median));
    return this.calculateMedian(deviations);
  }

  private static getMetricValue(
    record: DailyMetricRecord,
    metric: AnomalyMetricType
  ): number | undefined {
    switch (metric) {
      case 'REVENUE':
        return record.revenue;
      case 'WASTE_QUANTITY':
        return record.wasteQuantity;
      case 'ORDERS_COUNT':
        return record.ordersCount;
      case 'NOSHOW_RATE':
        return record.noShowRate;
      default:
        return record.customMetrics?.[metric];
    }
  }

  /**
   * Phát hiện bất thường bằng thống kê xác định Median & MAD theo thứ trong tuần
   * Tuân thủ R2-099, R2-112, BR-096
   */
  public static detect(input: AnomalyDetectionInput): AnomalyDetectionResult {
    if (!input.storeId || input.storeId.trim() === '') {
      throw new Error('storeId không được để trống khi kiểm tra bất thường');
    }

    const targetDateStr =
      typeof input.targetDate === 'string'
        ? input.targetDate
        : input.targetDate.toISOString().split('T')[0];

    const targetRecord =
      input.targetMetrics ||
      input.history.find((h) => h.date === targetDateStr);

    if (!targetRecord) {
      throw new Error(
        `Không tìm thấy dữ liệu chỉ số cho ngày mục tiêu ${targetDateStr}`
      );
    }

    const config = input.config || {};
    const minHistoryDays =
      config.minHistoryDays ?? this.DEFAULT_MIN_HISTORY_DAYS;

    let madMultiplier = this.DEFAULT_MAD_MULTIPLIER;
    if (config.sensitivity && this.SENSITIVITY_MAP[config.sensitivity]) {
      madMultiplier = this.SENSITIVITY_MAP[config.sensitivity];
    } else if (typeof config.madMultiplier === 'number') {
      madMultiplier = config.madMultiplier;
    }

    const totalHistoryDays = (input.history || []).length;

    // Ràng buộc BR-096: Phải có ít nhất 28 ngày dữ liệu lịch sử
    if (totalHistoryDays < minHistoryDays) {
      return {
        storeId: input.storeId,
        targetDate: targetDateStr,
        isEligible: false,
        totalHistoryDays,
        eligibleBaselineDays: 0,
        reason: `Chưa đủ ${minHistoryDays} ngày dữ liệu đường cơ sở theo quy định BR-096`,
        anomalies: [],
      };
    }

    // Lọc đường cơ sở:
    // 1. Loại trừ chính ngày targetDate nếu nằm trong history
    // 2. Loại bỏ các ngày nghỉ (isHoliday) và ngày có sự kiện đặc biệt (isSpecialEvent) theo BR-096
    // 3. Khớp cùng thứ trong tuần (dayOfWeek)
    const baselineRecords = input.history.filter((record) => {
      if (record.date === targetDateStr) return false;
      if (record.isHoliday || record.isSpecialEvent) return false;
      return record.dayOfWeek === targetRecord.dayOfWeek;
    });

    const anomalies: DetectedAnomaly[] = [];
    const metricsToCheck: AnomalyMetricType[] = [
      'REVENUE',
      'WASTE_QUANTITY',
      'ORDERS_COUNT',
      'NOSHOW_RATE',
    ];

    const dayName =
      this.DAY_OF_WEEK_NAMES[targetRecord.dayOfWeek] ||
      `Thứ ${targetRecord.dayOfWeek}`;

    for (const metric of metricsToCheck) {
      const actualVal = this.getMetricValue(targetRecord, metric);
      if (typeof actualVal !== 'number') continue;

      const baselineValues = baselineRecords
        .map((r) => this.getMetricValue(r, metric))
        .filter((v): v is number => typeof v === 'number');

      // Cần tối thiểu 3 mẫu cùng thứ trong tuần để tính toán độ lệch tin cậy
      if (baselineValues.length < 3) continue;

      const expectedMedian = this.calculateMedian(baselineValues);
      const mad = this.calculateMAD(baselineValues, expectedMedian);
      const deviation = Math.abs(actualVal - expectedMedian);

      let isAnomaly = false;
      let madScore = 0;
      const threshold = madMultiplier * mad;

      if (mad > 0) {
        madScore = Math.round((deviation / mad) * 100) / 100;
        if (deviation > threshold) {
          isAnomaly = true;
        }
      } else {
        // Trường hợp tất cả các ngày baseline đều cùng một giá trị (MAD = 0)
        if (
          deviation > 0 &&
          deviation >= Math.max(1, Math.abs(expectedMedian) * 0.2)
        ) {
          isAnomaly = true;
          madScore = 9.99; // Giá trị tượng trưng khi MAD = 0
        }
      }

      if (isAnomaly) {
        const direction: AnomalyDirection =
          actualVal >= expectedMedian ? 'SURGE' : 'DROP';
        const severity =
          madScore >= madMultiplier * 1.5 ? 'CRITICAL' : 'WARNING';
        const metricInfo = this.METRIC_LABELS[metric];

        const directionText =
          direction === 'SURGE' ? 'tăng bất thường' : 'sụt giảm bất thường';
        const formattedActual = actualVal.toLocaleString('vi-VN');
        const formattedExpected = expectedMedian.toLocaleString('vi-VN');

        const explanation =
          `Cảnh báo biến động: ${metricInfo.label} ngày ${dayName} (${targetDateStr}) ${directionText} ` +
          `đạt ${formattedActual} ${metricInfo.unit}, so với mức kỳ vọng ${formattedExpected} ${metricInfo.unit} ` +
          `(độ lệch ${madScore} MAD vượt ngưỡng ${madMultiplier} MAD).`;

        anomalies.push({
          id: `ANOMALY-${input.storeId}-${targetDateStr}-${metric}`,
          metric,
          date: targetDateStr,
          actualValue: actualVal,
          expectedValue: expectedMedian,
          madValue: mad,
          deviation,
          madScore,
          direction,
          threshold,
          severity,
          explanation,
        });
      }
    }

    return {
      storeId: input.storeId,
      targetDate: targetDateStr,
      isEligible: true,
      totalHistoryDays,
      eligibleBaselineDays: baselineRecords.length,
      anomalies,
    };
  }
}
