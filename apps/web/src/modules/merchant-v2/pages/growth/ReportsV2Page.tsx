import { useState } from 'react';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { Banknote, CheckCircle2, Leaf, ShoppingBag, Star, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { FilterChips } from '../../components/FilterChips';
import { StatCard } from '../../components/StatCard';
import { useStoreData } from '../../lib/useStoreData';
import { daysAgo, localDate, vnd } from '../../lib/format';

interface Report {
  summary: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    noShowOrders: number;
    grossRevenue: number;
    foodSavedKg: number;
    co2SavedKg: number;
    ratingAvg: number;
    ratingCount: number;
    complaintsCount: number;
  };
  recovery: { recoveredRevenue: number; recoveredItemsCount: number; recoveryRatePercent: number };
  waste: {
    wastedOrdersCount: number;
    wastedWeightKg: number;
    wastedEstimatedCost: number;
    wasteReductionPercent: number;
  };
}

const RANGES = [
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: '90', label: '90 ngày' },
];

export function ReportsV2Page() {
  const [range, setRange] = useState('7');
  const { data, loading, error, reload } = useStoreData<Report>(
    `/store/reports/overview?startDate=${daysAgo(Number(range) - 1)}&endDate=${localDate()}`,
  );
  const s = data?.summary;

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Báo cáo & tác động"
        subtitle="Doanh thu cứu được và lượng thực phẩm tránh lãng phí"
      />
      <FilterChips options={RANGES} value={range} onChange={setRange} />
      {range !== '7' && error && (
        <Alert severity="info">
          Gói Cơ bản chỉ xem được 7 ngày gần nhất. Nâng cấp gói Chuyên nghiệp để xem đến 365 ngày.
        </Alert>
      )}
      <DataState loading={loading} error={error} empty={!s} onRetry={reload}>
        {s && data && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
              gap: 2.5,
            }}
          >
            <StatCard
              label="Doanh thu"
              value={vnd(s.grossRevenue)}
              sub={`${s.totalOrders} đơn`}
              icon={<Banknote size={22} />}
              color="primary"
            />
            <StatCard
              label="Đơn đã nhận"
              value={String(s.completedOrders)}
              sub={`Tỷ lệ cứu ${data.recovery.recoveryRatePercent}%`}
              icon={<CheckCircle2 size={22} />}
              color="success"
            />
            <StatCard
              label="Món đã cứu"
              value={String(data.recovery.recoveredItemsCount)}
              sub={`${s.foodSavedKg} kg thực phẩm · ${s.co2SavedKg} kg CO₂`}
              icon={<Leaf size={22} />}
              color="success"
            />
            <StatCard
              label="Không đến nhận / hủy"
              value={`${s.noShowOrders} / ${s.cancelledOrders}`}
              icon={<ShoppingBag size={22} />}
              color="warning"
            />
            <StatCard
              label="Hao hụt ước tính"
              value={vnd(data.waste.wastedEstimatedCost)}
              sub={`${data.waste.wastedWeightKg} kg · giảm ${data.waste.wasteReductionPercent}%`}
              icon={<Trash2 size={22} />}
              color="error"
            />
            <StatCard
              label="Đánh giá"
              value={s.ratingCount ? `${s.ratingAvg} ★` : '—'}
              sub={`${s.ratingCount} đánh giá · ${s.complaintsCount} khiếu nại`}
              icon={<Star size={22} />}
              color="info"
            />
          </Box>
        )}
      </DataState>
      <Typography variant="caption" color="text.disabled">
        Số liệu tính từ đơn thật trong kỳ đã chọn.
      </Typography>
    </Stack>
  );
}

export default ReportsV2Page;
