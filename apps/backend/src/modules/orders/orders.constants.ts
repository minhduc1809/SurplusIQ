export const ORDERS_CONSTANTS = {
  HOLD_DURATION_MINUTES: 10, // 10 phút giữ suất per BR-017, R1-040
  MIN_QUANTITY_PER_ORDER: 1, // Tối thiểu 1 suất per BR-019
  MAX_QUANTITY_PER_ORDER: 5, // Tối đa 5 suất per BR-019, check constraint DB
  NOSHOW_THRESHOLD: 3, // Ngưỡng 3 lần noshow per BR-020
  NOSHOW_WINDOW_DAYS: 30, // Cửa sổ theo dõi 30 ngày per BR-020
  LOCK_DAYS: 7, // Khóa đặt hàng 7 ngày sau 3 lần noshow per BR-020
  PICKUP_GRACE_MINUTES: 15, // Gia hạn trễ 15 phút sau khung nhận per BR-023
  CANCEL_CUTOFF_MINUTES: 60, // Khách hủy trước khung nhận ít nhất 60 phút per R1-043
  ORDERS_FILTER_MAX_RANGE_MONTHS: 12, // Khoảng lọc ngày tối đa 12 tháng per R1-045
};

export enum OrderCancelReason {
  CUSTOMER_CHANGED_MIND = 'Khách đổi ý',
  CANNOT_ARRIVE = 'Không thể đến nhận đúng giờ',
  STORE_OUT_OF_STOCK = 'Quán hết nguyên liệu',
  STORE_EMERGENCY = 'Quán có việc đột xuất',
  STORE_INCIDENT = 'Sự cố thiết bị',
  OTHER = 'Khác',
}
