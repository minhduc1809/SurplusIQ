import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Package, Wallet, Leaf, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/useApiData';
import { MetricCard } from '../components/MetricCard';
import { SkeletonBlock, ErrorState } from '../components/StateViews';

interface DailyOverview {
  date: string;
  isPausedToday: boolean;
  orders: { total: number; paid: number; completed: number; cancelled: number; noShow: number };
  grossRevenue: number;
  rescuedItemsCount: number;
  foodSavedKg: number;
  pendingComplaints: number;
  activeOffers: number;
}

const currency = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

/** S06 Bảng điều khiển hôm nay - nối thật GET /store/daily-overview (R2-050). */
export function TodayPage() {
  const { state, reload } = useApiData<DailyOverview>(() => api.get('/store/daily-overview'));

  if (state.status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-5)' }}>
        <SkeletonBlock height={28} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--sq-space-4)',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} height={96} />
          ))}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} canRetry={state.canRetry} onRetry={reload} />;
  }

  if (state.status === 'empty') return null;

  const d = state.data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sq-space-6)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 className="sq-h1" style={{ margin: 0 }}>
            Hôm nay
          </h1>
          <p className="sq-body" style={{ color: 'var(--sq-ink-soft)', margin: '4px 0 0' }}>
            {new Date(d.date).toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
            })}
          </p>
        </div>
        <span
          className="sq-body-medium"
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--sq-radius-pill)',
            background: d.isPausedToday ? 'var(--sq-coral-wash)' : 'var(--sq-mint-wash)',
            color: d.isPausedToday ? 'var(--sq-coral-deep)' : 'var(--sq-mint-deep)',
          }}
        >
          {d.isPausedToday ? 'Đang tạm ngưng' : 'Đang hoạt động'}
        </span>
      </div>

      {(d.pendingComplaints > 0 || d.orders.noShow > 0) && (
        <section>
          <h2 className="sq-h3" style={{ margin: '0 0 var(--sq-space-3)' }}>
            Cần xử lý ngay
          </h2>
          <div style={{ display: 'flex', gap: 'var(--sq-space-3)', flexWrap: 'wrap' }}>
            {d.pendingComplaints > 0 && (
              <ActionChip
                icon={<AlertTriangle size={16} />}
                label={`${d.pendingComplaints} khiếu nại đang chờ`}
                to="/orders"
              />
            )}
            {d.orders.noShow > 0 && (
              <ActionChip
                icon={<Package size={16} />}
                label={`${d.orders.noShow} đơn quá hạn nhận hôm nay`}
                to="/orders"
              />
            )}
          </div>
        </section>
      )}

      <section>
        <h2 className="sq-h3" style={{ margin: '0 0 var(--sq-space-3)' }}>
          Tổng quan hôm nay
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--sq-space-4)',
          }}
        >
          <MetricCard
            label="Suất đã bán"
            value={String(d.orders.completed + d.orders.paid)}
            accent="coral"
            icon={<Package size={16} color="var(--sq-coral-deep)" />}
          />
          <MetricCard
            label="Doanh thu"
            value={currency(d.grossRevenue)}
            accent="mint"
            icon={<Wallet size={16} color="var(--sq-mint-deep)" />}
          />
          <MetricCard
            label="Món được cứu"
            value={String(d.rescuedItemsCount)}
            accent="butter"
            icon={<Package size={16} color="var(--sq-warning)" />}
          />
          <MetricCard
            label="Hao hụt giảm được"
            value={`${d.foodSavedKg} kg`}
            accent="lilac"
            icon={<Leaf size={16} color="var(--sq-coral-deep)" />}
          />
        </div>
      </section>

      <section>
        <h2 className="sq-h3" style={{ margin: '0 0 var(--sq-space-3)' }}>
          Suất đang mở bán
        </h2>
        <div
          style={{
            background: 'var(--sq-surface)',
            border: '1px solid var(--sq-line)',
            borderRadius: 'var(--sq-radius-lg)',
            padding: 'var(--sq-space-5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="sq-body">Số suất đang nhận đặt</span>
          <span className="sq-h2 sq-tabular">{d.activeOffers}</span>
        </div>
      </section>
    </div>
  );
}

function ActionChip({ icon, label, to }: { icon: ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 'var(--sq-radius-pill)',
        background: 'var(--sq-butter-wash)',
        color: 'var(--sq-warning)',
        fontSize: 13,
        fontWeight: 650,
        textDecoration: 'none',
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
