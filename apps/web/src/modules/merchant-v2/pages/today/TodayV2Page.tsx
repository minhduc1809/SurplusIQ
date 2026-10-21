import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Typography,
} from '@mui/material';
import {
  Package,
  Wallet,
  Leaf,
  AlertTriangle,
  Clock,
  ShoppingCart,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color: 'primary' | 'success' | 'warning' | 'info';
  icon: React.ReactNode;
  trend?: number;
}
function StatCard({ label, value, sub, color, icon, trend }: StatCardProps) {
  const bg: Record<string, string> = {
    primary: 'rgba(31,59,179,0.08)',
    success: 'rgba(16,185,129,0.08)',
    warning: 'rgba(245,158,11,0.08)',
    info: 'rgba(14,165,233,0.08)',
  };
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 1.5,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              bgcolor: bg[color],
              display: 'grid',
              placeItems: 'center',
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
          {trend !== undefined && (
            <Chip
              size="small"
              label={`${trend >= 0 ? '+' : ''}${trend}%`}
              sx={{
                bgcolor: trend >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: trend >= 0 ? 'success.main' : 'error.main',
                fontWeight: 700,
                fontSize: '0.72rem',
                height: 22,
              }}
            />
          )}
        </Box>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 0.5, fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ── Mini alert chip ───────────────────────────────────────────────────────────
function AlertChip({
  icon,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  onClick?: () => void;
}) {
  return (
    <Button
      variant="outlined"
      color="warning"
      size="small"
      startIcon={icon}
      endIcon={<ArrowRight size={14} />}
      onClick={onClick}
      sx={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.8125rem' }}
    >
      {text}
    </Button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function TodayV2Page({ onNavigate }: { onNavigate?: (href: string) => void }) {
  const [data, setData] = useState<DailyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get<DailyOverview>('/store/daily-overview')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Box sx={{ height: 32, width: 140, bgcolor: 'action.hover', borderRadius: 1, mb: 1 }} />
            <Box sx={{ height: 18, width: 220, bgcolor: 'action.hover', borderRadius: 1 }} />
          </Box>
        </Box>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} sx={{ height: 130 }}>
              <CardContent sx={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                <CircularProgress size={24} />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" startIcon={<RefreshCw size={14} />} onClick={load}>
            Thử lại
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const ordersDone = data.orders.completed + data.orders.paid;
  const orderRate = data.orders.total > 0 ? Math.round((ordersDone / data.orders.total) * 100) : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
            Tổng quan hôm nay
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(data.date).toLocaleDateString('vi-VN', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip
            label={data.isPausedToday ? 'Tạm ngưng nhận đơn' : 'Cửa hàng đang mở'}
            color={data.isPausedToday ? 'warning' : 'success'}
            sx={{ fontWeight: 700 }}
          />
          <Button
            size="small"
            startIcon={<RefreshCw size={14} />}
            onClick={load}
            variant="outlined"
          >
            Làm mới
          </Button>
        </Box>
      </Box>

      {/* ── Action alerts ────────────────────────────────────── */}
      {(data.pendingComplaints > 0 || data.orders.noShow > 0) && (
        <Alert
          severity="warning"
          sx={{ borderRadius: '12px', alignItems: 'center' }}
          action={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {data.pendingComplaints > 0 && (
                <AlertChip
                  icon={<AlertTriangle size={14} />}
                  text={`${data.pendingComplaints} khiếu nại chờ giải quyết`}
                  onClick={() => onNavigate?.('/merchant-v2/sales/orders')}
                />
              )}
              {data.orders.noShow > 0 && (
                <AlertChip
                  icon={<Clock size={14} />}
                  text={`${data.orders.noShow} đơn quá hạn nhận`}
                  onClick={() => onNavigate?.('/merchant-v2/sales/orders')}
                />
              )}
            </Box>
          }
        >
          Cần lưu ý xử lý đơn & khiếu nại trong ca trực
        </Alert>
      )}

      {/* ── KPI cards ────────────────────────────────────────── */}
      <Box>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ mb: 1.5, display: 'block', fontWeight: 700 }}
        >
          Chỉ số vận hành
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          <StatCard
            label="Suất đã bán"
            value={String(ordersDone)}
            sub={`/ ${data.orders.total} đơn tổng`}
            color="primary"
            icon={<Package size={22} />}
          />
          <StatCard
            label="Doanh thu tạm tính"
            value={fmt(data.grossRevenue)}
            color="success"
            icon={<Wallet size={22} />}
          />
          <StatCard
            label="Món được cứu"
            value={String(data.rescuedItemsCount)}
            sub={`${data.foodSavedKg} kg thực phẩm`}
            color="warning"
            icon={<Leaf size={22} />}
          />
          <StatCard
            label="Suất đang mở bán"
            value={String(data.activeOffers)}
            color="info"
            icon={<ShoppingCart size={22} />}
          />
        </Box>
      </Box>

      {/* ── Order fulfillment progress & ESG ────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2.5 }}>
        {/* Progress card */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Tiến độ hoàn thành đơn
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {ordersDone}/{data.orders.total} đơn đã sẵn sàng hoặc nhận hàng
                </Typography>
              </Box>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 800 }}>
                {orderRate}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={orderRate}
              sx={{ height: 10, borderRadius: 99, bgcolor: 'action.hover' }}
            />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                mt: 3,
                pt: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                gap: 1,
              }}
            >
              {[
                { label: 'Đã hoàn thành', count: data.orders.completed, color: 'success.main' },
                { label: 'Đã thanh toán', count: data.orders.paid, color: 'primary.main' },
                { label: 'Đã huỷ', count: data.orders.cancelled, color: 'error.main' },
                { label: 'Không đến', count: data.orders.noShow, color: 'warning.main' },
              ].map(({ label, count, color }) => (
                <Box key={label} sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ color, fontWeight: 700 }}>
                    {count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* ESG impact card */}
        <Card
          sx={{
            background:
              'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(14,165,233,0.08) 100%)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}
        >
          <CardContent
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  bgcolor: 'rgba(16,185,129,0.15)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#10B981',
                }}
              >
                <Leaf size={20} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'success.main' }}>
                  Tác động môi trường
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ghi nhận trong ngày
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 'auto' }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 800 }}>
                  {data.foodSavedKg}{' '}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    kg
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Thực phẩm được cứu
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography variant="h4" color="info.main" sx={{ fontWeight: 800 }}>
                  {(data.foodSavedKg * 2.5).toFixed(1)}{' '}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                    kg
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  CO₂e giảm thải
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, color: 'text.secondary' }}
            >
              <CheckCircle2 size={16} color="#10B981" />
              <Typography variant="caption">
                Mỗi suất cứu giảm trung bình ~1.2kg rác thải
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default TodayV2Page;
