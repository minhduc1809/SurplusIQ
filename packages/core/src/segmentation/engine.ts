import type {
  CustomerSegmentationInput,
  CustomerSegmentationResult,
  CustomerSegmentType,
  SegmentedCustomer,
} from '../types/segmentation.types';

export class CustomerSegmentationEngine {
  /** Ngưỡng kích hoạt phân nhóm tối thiểu 20 khách hàng (12.19.1) */
  public static readonly DEFAULT_MIN_CUSTOMERS_THRESHOLD = 20;
  /** Ngưỡng số đơn tối thiểu của khách thân thiết (LOYAL) */
  public static readonly DEFAULT_LOYAL_MIN_ORDERS = 3;
  /** Khoảng cách mua hàng tối đa của khách thân thiết (14 ngày) */
  public static readonly DEFAULT_LOYAL_MAX_DAYS = 14;
  /** Số đơn tối thiểu để xét nguy cơ rời bỏ (2 đơn) */
  public static readonly DEFAULT_AT_RISK_MIN_ORDERS = 2;
  /** Số ngày không mua lại để xếp vào nguy cơ rời bỏ (30 ngày) */
  public static readonly DEFAULT_AT_RISK_DAYS = 30;
  /** Tỷ lệ đơn không đến nhận (no-show) tối thiểu để xếp vào nhóm HIGH_NOSHOW (20%) */
  public static readonly DEFAULT_HIGH_NOSHOW_RATIO = 0.2;

  /**
   * Tạo mã rút gọn ẩn danh cho khách hàng tuân thủ BR-083, R2-084, R2-087
   * Ví dụ: 'user_12345678' -> 'KH-***78'
   */
  public static anonymizeCustomerId(customerId: string): string {
    if (!customerId || customerId.trim() === '') {
      return 'KH-***00';
    }
    const cleanId = customerId.trim();
    if (cleanId.length <= 4) {
      return `KH-***${cleanId.slice(-2).toUpperCase()}`;
    }
    const prefix = cleanId.slice(0, 2).toUpperCase();
    const suffix = cleanId.slice(-2).toUpperCase();
    return `KH-${prefix}***${suffix}`;
  }

  /**
   * Phân nhóm khách hàng theo quy tắc thống kê xác định
   * Tuân thủ R2-084, R2-087, BR-083, 12.19.1
   */
  public static segment(input: CustomerSegmentationInput): CustomerSegmentationResult {
    if (!input.storeId || input.storeId.trim() === '') {
      throw new Error('storeId không được để trống khi phân nhóm khách hàng');
    }

    const now = input.now ? new Date(input.now) : new Date();
    const config = input.config || {};
    const minThreshold = config.minCustomersThreshold ?? this.DEFAULT_MIN_CUSTOMERS_THRESHOLD;
    const loyalMinOrders = config.loyalMinOrders ?? this.DEFAULT_LOYAL_MIN_ORDERS;
    const loyalMaxDays = config.loyalMaxDaysSinceLastOrder ?? this.DEFAULT_LOYAL_MAX_DAYS;
    const atRiskMinOrders = config.atRiskMinOrders ?? this.DEFAULT_AT_RISK_MIN_ORDERS;
    const atRiskDays = config.atRiskDaysThreshold ?? this.DEFAULT_AT_RISK_DAYS;
    const highNoShowRatio = config.highNoShowRatioThreshold ?? this.DEFAULT_HIGH_NOSHOW_RATIO;

    const customersList = input.customers || [];
    const totalCustomers = customersList.length;

    const summary: Record<CustomerSegmentType, number> = {
      NEW: 0,
      LOYAL: 0,
      AT_RISK: 0,
      HIGH_NOSHOW: 0,
      REGULAR: 0,
    };

    // Điều kiện tiên quyết: Chỉ chạy khi cửa hàng có >= minThreshold (mặc định 20) khách
    if (totalCustomers < minThreshold) {
      return {
        storeId: input.storeId,
        evaluatedAt: now,
        isEligible: false,
        totalCustomers,
        reason: `Chưa đủ dữ liệu (dưới ${minThreshold} khách hàng theo quy tắc 12.19.1)`,
        summary,
        customers: [],
      };
    }

    const segmentedCustomers: SegmentedCustomer[] = [];

    for (const cust of customersList) {
      const lastOrderTime = new Date(cust.lastOrderDate).getTime();
      const diffMs = Math.max(0, now.getTime() - lastOrderTime);
      const daysSinceLastOrder = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      const totalOrders = Math.max(0, cust.totalOrders || 0);
      const noShowCount = Math.max(0, cust.noShowCount || 0);
      const noShowRatio = totalOrders > 0 ? noShowCount / totalOrders : 0;

      // Ước lượng số đơn 30 ngày qua nếu không truyền rõ
      const ordersLast30Days =
        typeof cust.ordersLast30Days === 'number'
          ? cust.ordersLast30Days
          : daysSinceLastOrder <= 30
            ? Math.min(totalOrders, 1)
            : 0;

      const segments: CustomerSegmentType[] = [];

      // 1. Hay Không Đến Nhận (HIGH_NOSHOW): Tỷ lệ đơn PICKUP_EXPIRED >= 20%
      const isHighNoShow = noShowRatio >= highNoShowRatio && noShowCount > 0;
      if (isHighNoShow) {
        segments.push('HIGH_NOSHOW');
      }

      // 2. Nguy cơ rời bỏ (AT_RISK): Đã từng có >= 2 đơn nhưng không mua lại trong > 30 ngày
      const isAtRisk = totalOrders >= atRiskMinOrders && daysSinceLastOrder > atRiskDays;
      if (isAtRisk) {
        segments.push('AT_RISK');
      }

      // 3. Khách thân thiết (LOYAL): Có >= 3 đơn và lần mua gần nhất <= 14 ngày
      const isLoyal = totalOrders >= loyalMinOrders && daysSinceLastOrder <= loyalMaxDays;
      if (isLoyal) {
        segments.push('LOYAL');
      }

      // 4. Khách mới (NEW): Đúng 1 đơn trong 30 ngày qua
      const isNew = totalOrders === 1 && daysSinceLastOrder <= 30;
      if (isNew) {
        segments.push('NEW');
      }

      // Nếu không thuộc 4 nhóm trên thì thuộc nhóm khách phổ thông (REGULAR)
      if (segments.length === 0) {
        segments.push('REGULAR');
      }

      // Xác định Primary Segment để phân loại và tổng hợp
      let primarySegment: CustomerSegmentType = 'REGULAR';
      if (isHighNoShow) {
        primarySegment = 'HIGH_NOSHOW';
      } else if (isAtRisk) {
        primarySegment = 'AT_RISK';
      } else if (isLoyal) {
        primarySegment = 'LOYAL';
      } else if (isNew) {
        primarySegment = 'NEW';
      }

      summary[primarySegment]++;

      segmentedCustomers.push({
        customerId: cust.customerId,
        anonymizedId: this.anonymizeCustomerId(cust.customerId),
        primarySegment,
        segments,
        metrics: {
          totalOrders,
          daysSinceLastOrder,
          noShowRatio: Math.round(noShowRatio * 1000) / 1000,
          ordersLast30Days,
        },
      });
    }

    return {
      storeId: input.storeId,
      evaluatedAt: now,
      isEligible: true,
      totalCustomers,
      summary,
      customers: segmentedCustomers,
    };
  }
}
