/**
 * SurplusIQ Weekly Reconciliation Engine Types
 * Tuân thủ BRD 5.16 (R2-063, R2-066, R2-067), BR-075, VC-10, Chương 13 #2
 */

export type ReconciliationOrderStatus = 'PICKED_UP' | 'PICKUP_EXPIRED' | 'REFUNDED' | 'CANCELLED';

export interface ReconciliationOrder {
  orderId: string;
  orderCode?: string;
  amount: number; // Giá sau ưu đãi khách trả
  status: ReconciliationOrderStatus;
  completedAt: Date | string;
  noShowByBuyer?: boolean; // Mặc định true cho PICKUP_EXPIRED
  storeFault?: boolean; // Nếu true, đơn PICKUP_EXPIRED do lỗi quán sẽ không tính vào Gross
}

export type ReconciliationAdjustmentType = 'CREDIT' | 'DEBIT';

export interface ReconciliationAdjustment {
  id: string;
  amount: number; // Giá trị dương
  type: ReconciliationAdjustmentType; // CREDIT: cộng tiền cho quán, DEBIT: trừ bớt tiền quán
  reason: string;
  referenceId?: string;
}

export interface ReconciliationPeriod {
  cycleId: string; // Định dạng 'YYYY-Www', ví dụ: '2026-W42'
  startDate: Date | string; // Thứ Hai 00:00:00
  endDate: Date | string; // Chủ Nhật 23:59:59
}

export interface ReconciliationInput {
  storeId: string;
  period: ReconciliationPeriod;
  orders: ReconciliationOrder[];
  refundsDeduction?: number; // Tiền hoàn khiếu nại khấu trừ trong kỳ (mặc định 0)
  subscriptionFee?: number; // Phí thuê bao trừ qua sao kê nếu có (mặc định 0)
  adjustments?: ReconciliationAdjustment[]; // Các bút toán điều chỉnh kỳ trước
  commissionRate?: number; // Tỷ lệ hoa hồng (mặc định 0.10 = 10% theo BRD Chương 13 #2)
  generatedAt?: Date; // Mốc thời gian chốt sao kê
  lockStatus?: 'DRAFT' | 'LOCKED'; // Trạng thái sao kê
}

export interface ReconciliationOrderSummary {
  pickedUpCount: number;
  pickedUpAmount: number;
  noShowCount: number;
  noShowAmount: number;
  refundedCount: number;
  refundedAmount: number;
  cancelledCount: number;
  cancelledAmount: number;
  totalProcessedOrders: number;
}

export interface ReconciliationStatement {
  statementId: string;
  storeId: string;
  cycleId: string;
  periodStart: Date;
  periodEnd: Date;
  grossSales: number;
  commissionRate: number;
  commissionAmount: number;
  refundsDeduction: number;
  subscriptionFee: number;
  totalAdjustments: number; // Tổng giá trị ròng (Credit - Debit)
  netPayout: number; // Gross - Commission - Refunds - Subscription + TotalAdjustments
  orderSummary: ReconciliationOrderSummary;
  status: 'DRAFT' | 'LOCKED';
  generatedAt: Date;
  checksum: string; // Hash SHA-256 xác thực tính bất biến (BR-075)
  explanation: string;
}
