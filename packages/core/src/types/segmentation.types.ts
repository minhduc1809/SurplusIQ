/**
 * SurplusIQ Rule-Based Customer Segmentation Engine Types
 * Tuân thủ BRD 5.19 (R2-084, R2-087), BR-083, 12.19.1
 */

export type CustomerSegmentType = 'NEW' | 'LOYAL' | 'AT_RISK' | 'HIGH_NOSHOW' | 'REGULAR';

export interface CustomerOrderStats {
  customerId: string;
  totalOrders: number;
  lastOrderDate: Date | string;
  firstOrderDate?: Date | string;
  ordersLast30Days?: number;
  noShowCount: number; // Số đơn PICKUP_EXPIRED
  pickedUpCount?: number;
  totalSpent?: number;
}

export interface CustomerSegmentationConfig {
  minCustomersThreshold?: number; // Mặc định 20 khách (12.19.1)
  loyalMinOrders?: number; // Mặc định 3 đơn
  loyalMaxDaysSinceLastOrder?: number; // Mặc định 14 ngày
  atRiskMinOrders?: number; // Mặc định 2 đơn
  atRiskDaysThreshold?: number; // Mặc định 30 ngày
  highNoShowRatioThreshold?: number; // Mặc định 0.20 (20%)
}

export interface SegmentedCustomer {
  customerId: string;
  anonymizedId: string; // Mã ẩn danh hiển thị cho chủ quán (BR-083)
  primarySegment: CustomerSegmentType;
  segments: CustomerSegmentType[];
  metrics: {
    totalOrders: number;
    daysSinceLastOrder: number;
    noShowRatio: number;
    ordersLast30Days: number;
  };
}

export interface CustomerSegmentationInput {
  storeId: string;
  customers: CustomerOrderStats[];
  now?: Date; // Mốc thời gian đánh giá (phục vụ deterministic testing)
  config?: CustomerSegmentationConfig;
}

export interface CustomerSegmentationResult {
  storeId: string;
  evaluatedAt: Date;
  isEligible: boolean; // True nếu tổng khách >= minCustomersThreshold (20 khách)
  totalCustomers: number;
  reason?: string;
  summary: Record<CustomerSegmentType, number>;
  customers: SegmentedCustomer[];
}
