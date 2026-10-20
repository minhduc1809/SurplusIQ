/** SqStatusBadge - rule 6.3: luôn có icon/label, không chỉ chấm màu. */
const STATUS_MAP: Record<string, { bg: string; fg: string; label: string }> = {
  OPEN: { bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)', label: 'Đang nhận đặt' },
  SOLD_OUT: { bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)', label: 'Đã hết' },
  CLOSED: { bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)', label: 'Đã đóng' },
  CANCELLED: { bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)', label: 'Đã hủy' },
  DRAFT: { bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)', label: 'Nháp' },

  PENDING_PAYMENT: { bg: 'var(--sq-sky-wash)', fg: 'var(--sq-info)', label: 'Chờ xác nhận' },
  PAID: { bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)', label: 'Đã thanh toán' },
  PICKED_UP: { bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)', label: 'Đã nhận hàng' },
  PICKUP_EXPIRED: {
    bg: 'var(--sq-surface-soft)',
    fg: 'var(--sq-ink-muted)',
    label: 'Quá hạn nhận',
  },
  REFUNDED: { bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)', label: 'Đã hoàn tiền' },

  ACTIVE: { bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)', label: 'Hoạt động' },
  ARCHIVED: { bg: 'var(--sq-surface-soft)', fg: 'var(--sq-ink-muted)', label: 'Đã lưu trữ' },

  PENDING_STORE: { bg: 'var(--sq-lilac-wash)', fg: 'var(--sq-coral-deep)', label: 'Đang xem xét' },
  ACCEPTED: { bg: 'var(--sq-mint-wash)', fg: 'var(--sq-mint-deep)', label: 'Đã giải quyết' },
  REJECTED: { bg: 'var(--sq-coral-wash)', fg: 'var(--sq-coral-deep)', label: 'Đã từ chối' },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || {
    bg: 'var(--sq-surface-soft)',
    fg: 'var(--sq-ink-soft)',
    label: status,
  };
  return (
    <span
      className="sq-caption sq-tabular"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 'var(--sq-radius-pill)',
        background: cfg.bg,
        color: cfg.fg,
        fontWeight: 650,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}
