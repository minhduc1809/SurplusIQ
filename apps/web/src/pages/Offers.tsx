import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { SkeletonList, ErrorState, EmptyState } from '../components/StateViews';
import { StatusBadge } from '../components/StatusBadge';

interface OfferRow {
  id: string;
  totalQuantity: number;
  remainingQuantity: number;
  soldQuantity: number;
  originalPrice: number;
  currentPrice: number;
  pickupStart: string;
  pickupEnd: string;
  status: string;
}

interface OffersResponse {
  data: OfferRow[];
  total: number;
}

const currency = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** S25 Danh sách suất - nối thật GET /store/offers (R2-xx quản lý suất/tồn kho trong ngày). */
export function OffersPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [status, setStatus] = useState<string>('');

  const { state, reload } = useApiData<OffersResponse>(
    () => api.get(`/store/offers?date=${today}${status ? `&status=${status}` : ''}`),
    (d) => d.data.length === 0,
    'Tạo suất đầu tiên cho hôm nay để bắt đầu bán.',
    [status],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-5)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h1 className="sq-h1" style={{ margin: 0 }}>
          Suất & tồn kho
        </h1>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 44,
            padding: '0 18px',
            borderRadius: 'var(--sq-radius-md)',
            border: 'none',
            background: 'var(--sq-coral)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: 'var(--sq-elevation-coral)',
          }}
        >
          <Plus size={18} /> Tạo suất
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { value: '', label: 'Tất cả' },
          { value: 'OPEN', label: 'Đang mở' },
          { value: 'SOLD_OUT', label: 'Đã hết' },
          { value: 'CLOSED', label: 'Đã đóng' },
        ].map((f) => (
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

      {state.status === 'loading' && <SkeletonList rows={5} height={64} />}
      {state.status === 'error' && (
        <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />
      )}
      {state.status === 'empty' && (
        <EmptyState title="Chưa có suất nào hôm nay" message={state.message} />
      )}

      {state.status === 'success' && (
        <div
          style={{
            background: 'var(--sq-surface)',
            border: '1px solid var(--sq-line)',
            borderRadius: 'var(--sq-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sq-surface-soft)' }}>
                <Th>Khung nhận</Th>
                <Th align="right">Giá</Th>
                <Th align="right">Còn lại / Tổng</Th>
                <Th>Trạng thái</Th>
              </tr>
            </thead>
            <tbody>
              {state.data.data.map((o) => (
                <tr key={o.id} style={{ borderTop: '1px solid var(--sq-line)' }}>
                  <td style={cellStyle} className="sq-tabular">
                    {time(o.pickupStart)} – {time(o.pickupEnd)}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }} className="sq-tabular">
                    <span style={{ color: 'var(--sq-coral-deep)', fontWeight: 700 }}>
                      {currency(o.currentPrice)}
                    </span>
                    {o.originalPrice !== o.currentPrice && (
                      <span
                        style={{
                          textDecoration: 'line-through',
                          color: 'var(--sq-ink-muted)',
                          marginLeft: 8,
                          fontSize: 12,
                        }}
                      >
                        {currency(o.originalPrice)}
                      </span>
                    )}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }} className="sq-tabular">
                    {o.remainingQuantity}/{o.totalQuantity}
                  </td>
                  <td style={cellStyle}>
                    <StatusBadge status={o.status} />
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
