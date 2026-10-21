export type StatusColor = 'success' | 'warning' | 'error' | 'default' | 'info';
export interface StatusMeta {
  label: string;
  color: StatusColor;
}

export const ORDER_STATUS: Record<string, StatusMeta> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', color: 'warning' },
  PAID: { label: 'Đã thanh toán', color: 'info' },
  PICKED_UP: { label: 'Đã nhận', color: 'success' },
  HOLD_EXPIRED: { label: 'Hết hạn giữ chỗ', color: 'default' },
  PICKUP_EXPIRED: { label: 'Không đến nhận', color: 'error' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
  REFUNDED: { label: 'Đã hoàn tiền', color: 'default' },
};

export const OFFER_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Nháp', color: 'default' },
  OPEN: { label: 'Đang mở', color: 'success' },
  SOLD_OUT: { label: 'Đã hết', color: 'warning' },
  CLOSED: { label: 'Đã đóng', color: 'default' },
  CANCELLED: { label: 'Đã hủy', color: 'error' },
};

export const statusOf = (map: Record<string, StatusMeta>, key: string): StatusMeta =>
  map[key] ?? { label: key, color: 'default' };
