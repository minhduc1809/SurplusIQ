import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { SkeletonList, ErrorState, EmptyState } from '../components/StateViews';
import { StatusBadge } from '../components/StatusBadge';

interface OrderRow {
  id: string;
  code: string;
  quantity: number;
  totalAmount: number;
  status: string;
  pickupSlot: string | null;
  createdAt: string;
}

interface OrdersResponse {
  data: OrderRow[];
  total: number;
}

const currency = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const datetime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'PICKED_UP', label: 'Đã nhận' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

/** S39 Danh sách đơn - nối thật GET /store/orders (R2-051). */
export function OrdersPage() {
  const [status, setStatus] = useState('');

  const { state, reload } = useApiData<OrdersResponse>(
    () => api.get(`/store/orders${status ? `?status=${status}` : ''}`),
    (d) => d.data.length === 0,
    'Chưa có đơn hàng nào. Đơn sẽ xuất hiện khi khách đặt suất của bạn.',
    [status],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-5)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <h1 className="sq-h1" style={{ margin: 0 }}>
          Đơn hàng
        </h1>
        <Link
          to="/orders/verify"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 44,
            padding: '0 18px',
            borderRadius: 'var(--sq-radius-md)',
            background: 'var(--sq-coral)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            textDecoration: 'none',
            boxShadow: 'var(--sq-elevation-coral)',
          }}
        >
          <ScanLine size={18} /> Quét QR nhận hàng
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--sq-radius-pill)',
              border: '1px solid var(--sq-line)',
              background: status === f.value ? 'var(--sq-coral-wash)' : 'var(--sq-surface)',
              color: status === f.value ? 'var(--sq-coral-deep)' : 'var(--sq-ink-soft)',
              fontSize: 13,
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {state.status === 'loading' && <SkeletonList rows={6} height={60} />}
      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}
      {state.status === 'empty' && <EmptyState title="Chưa có đơn nào" message={state.message} />}

      {state.status === 'success' && (
        <div
          style={{
            background: 'var(--sq-surface)',
            border: '1px solid var(--sq-line)',
            borderRadius: 'var(--sq-radius-lg)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sq-surface-soft)' }}>
                <Th>Mã đơn</Th>
                <Th align="right">Số lượng</Th>
                <Th align="right">Tổng tiền</Th>
                <Th>Khung nhận</Th>
                <Th>Trạng thái</Th>
                <Th>Thời gian đặt</Th>
              </tr>
            </thead>
            <tbody>
              {state.data.data.map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid var(--sq-line)' }}>
                  <td style={{ ...cellStyle, fontWeight: 650 }}>{o.code}</td>
                  <td style={{ ...cellStyle, textAlign: 'right' }} className="sq-tabular">
                    {o.quantity}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }} className="sq-tabular">
                    {currency(o.totalAmount)}
                  </td>
                  <td style={cellStyle} className="sq-tabular">
                    {o.pickupSlot ? datetime(o.pickupSlot) : '—'}
                  </td>
                  <td style={cellStyle}>
                    <StatusBadge status={o.status} />
                  </td>
                  <td style={cellStyle} className="sq-caption">
                    {datetime(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className="sq-overline"
      style={{
        textAlign: align,
        color: 'var(--sq-ink-muted)',
        padding: '12px 16px',
        fontWeight: 700,
      }}
    >
      {children}
    </th>
  );
}

const cellStyle = {
  padding: '14px 16px',
  fontSize: 14,
  color: 'var(--sq-ink)',
} as const;
