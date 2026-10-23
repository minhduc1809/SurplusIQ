import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowsClockwise,
  CheckCircle,
  CrownSimple,
  DownloadSimple,
  Lightning,
  Printer,
  ShareNetwork,
  Sparkle,
} from '@phosphor-icons/react';
import { AdminDataTable, type AdminTableColumn } from '../components/DataTable/AdminDataTable';
import { AdminDrawer } from '../components/Drawer/AdminDrawer';
import { useAdminSnapshot } from './AdminSnapshotProvider';
import { AdminMutationDialog } from './AdminMutationDialog';
import {
  canEditRecord,
  deleteLabel,
  deleteRecord,
  saveAdminRecord,
  supportsCreate,
} from '../api/admin-management.api';
import {
  collections,
  filterRows,
  number,
  text,
  vietnamDay,
  type AdminSnapshot,
  type SnapshotRow,
  type SnapshotValue,
} from './model';
import fieldLabels from './labels.json';

// =====================================================
// 1. CẤU HÌNH MÔ ĐUN
// =====================================================

const labels: Record<string, string> = fieldLabels;
const modules = {
  overview: {
    title: 'Tổng quan toàn sàn',
    tables: ['orders', 'offers', 'actuals', 'forecasts', 'donations', 'anomalies', 'aiLogs'],
    live: 'Deal công khai (API)',
  },
  merchants: {
    title: 'Quản lý cửa hàng',
    tables: ['stores', 'members', 'items', 'offers', 'reviews', 'promotions', 'campaigns'],
    live: 'Tra cứu cửa hàng (API)',
  },
  users: {
    title: 'Quản lý người dùng',
    tables: ['users', 'members', 'noshows', 'notifications'],
    live: 'Phiên Admin hiện tại',
  },
  orders: {
    title: 'Quản lý đơn hàng',
    tables: ['orders', 'payments', 'noshows', 'offers'],
    live: 'Quy tắc & thao tác',
  },
  disputes: {
    title: 'Khiếu nại & hỗ trợ',
    tables: ['complaints', 'violations', 'reviews', 'support', 'supportMessages'],
    live: 'Quy trình & trọng tài',
  },
  settlement: {
    title: 'Đối soát & sao kê',
    tables: ['statements', 'statementLines', 'payments'],
    live: 'Công cụ đối soát',
  },
  subscriptions: {
    title: 'Thuê bao & hạn mức',
    tables: ['subscriptions', 'invoices', 'quotas', 'usage'],
    live: 'Duyệt Gói Pro & Quy tắc',
  },
  settings: {
    title: 'Cấu hình & nhật ký',
    tables: ['audit', 'settings', 'settingsHistory', 'notifications', 'aiLogs'],
    live: 'Cấu hình nền tảng (API)',
  },
};
export type SnapshotModule = keyof typeof modules;

// =====================================================
// 2. ĐỊNH DẠNG GIÁ TRỊ & ƯỚC TÍNH TOKEN AI
// =====================================================

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const moneyFields = new Set([
  'amount',
  'original_price',
  'current_price',
  'floor_price',
  'cost_price',
  'unit_price',
  'discount_amount',
  'total_amount',
  'refund_amount',
  'gross',
  'commission',
  'refunds',
  'subscription_fee',
  'adjustments',
  'net_payable',
  'min_order_amount',
]);

const FEATURE_SYSTEM_PROMPT_TOKENS: Record<string, number> = {
  STORE_AI_CHAT: 320,
  DESCRIBE_ITEM: 260,
  PROMO_SUGGEST: 280,
  CAMPAIGN_SUGGEST: 280,
  FORECAST_EXPLAIN: 250,
  CUSTOMER_AI_SEARCH: 300,
};

interface AiTokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

function estimateAiRowTokens(row: SnapshotRow): AiTokenEstimate {
  const feature = text(row.feature_code).toUpperCase();
  const basePrompt = FEATURE_SYSTEM_PROMPT_TOKENS[feature] ?? 240;
  const inputStr = text(row.input_summary);
  const outputStr = text(row.output_summary);
  const hasError = Boolean(text(row.error_code));

  const userPromptTokens = inputStr ? Math.max(12, Math.ceil(inputStr.length / 3.6)) : 45;
  const inputTokens = basePrompt + userPromptTokens;
  const outputTokens = hasError
    ? 0
    : outputStr
      ? Math.max(24, Math.ceil(outputStr.length / 3.6))
      : 145;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

function format(value: SnapshotValue | undefined, field: string): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (moneyFields.has(field) && Number.isFinite(Number(value)))
    return currency.format(Number(value));
  if (
    (field.endsWith('_at') ||
      [
        'pickup_start',
        'pickup_end',
        'pickup_slot',
        'response_due_at',
        'period_start',
        'period_end',
        'locked_until',
      ].includes(field)) &&
    Number.isFinite(Date.parse(text(value)))
  ) {
    return new Date(text(value)).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }
  if (typeof value === 'number') return value.toLocaleString('vi-VN');
  return text(value);
}

function detailValue(value: SnapshotValue | undefined, field: string): ReactNode {
  if (typeof value === 'string' && /url$/.test(field) && /^https?:\/\//i.test(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer">
        {field === 'url' ? 'Mở bằng chứng' : 'Mở hình ảnh'}
      </a>
    );
  }
  return format(value, field);
}

function columnsFor(key: string): AdminTableColumn<SnapshotRow>[] {
  return collections[key].columns.map((field) => ({
    id: field,
    sortable: true,
    label: labels[field] || collections[key].fields[field] || field,
    value: (row) => (typeof row[field] === 'number' ? (row[field] as number) : text(row[field])),
    render: (row) =>
      field === 'status' || field === 'role' || field === 'plan' ? (
        <Chip
          size="small"
          variant={row[field] === 'PRO' ? 'filled' : 'outlined'}
          color={
            row[field] === 'PRO'
              ? 'warning'
              : row[field] === 'ACTIVE' || row[field] === 'PICKED_UP' || row[field] === 'PAID'
                ? 'success'
                : 'default'
          }
          label={text(row[field]) || '—'}
        />
      ) : (
        <Box sx={{ maxWidth: 280, overflowWrap: 'anywhere' }}>{detailValue(row[field], field)}</Box>
      ),
  }));
}

// =====================================================
// 3. CHỈ SỐ KPI THEO MÔ ĐUN (STARADMIN STRIP)
// =====================================================

type Metric = {
  title: string;
  value: string | number;
  delta?: string;
  positive?: boolean;
  description?: string;
};

function metricsFor(module: SnapshotModule, snapshot: AdminSnapshot): Metric[] {
  const rows = snapshot.collections;
  const count = (key: string, field?: string, value?: string) =>
    field ? rows[key].filter((row) => row[field] === value).length : rows[key].length;
  const sum = (key: string, field: string, status?: string) =>
    rows[key]
      .filter((row) => !status || row.status === status)
      .reduce((total, row) => total + number(row, field), 0);

  // Tăng trưởng thật: 30 ngày gần nhất so với 30 ngày liền trước, tính từ created_at của chính dữ liệu.
  const trend = (key: string, field?: string, status?: string) => {
    const now = Date.parse(snapshot.exportedAt);
    const DAY = 86_400_000;
    let cur = 0;
    let prev = 0;
    for (const row of rows[key] ?? []) {
      if (status && row.status !== status) continue;
      const age = now - Date.parse(String(row.created_at));
      const v = field ? number(row, field) : 1;
      if (age >= 0 && age < 30 * DAY) cur += v;
      else if (age >= 30 * DAY && age < 60 * DAY) prev += v;
    }
    if (prev === 0)
      return { delta: cur > 0 ? 'Mới 30 ngày qua' : 'Chưa có mới', positive: cur > 0 };
    const pct = ((cur - prev) / prev) * 100;
    return { delta: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% / 30 ngày`, positive: pct >= 0 };
  };
  const commissionRate = () => {
    const gross = sum('statements', 'gross');
    return gross > 0
      ? `${((sum('statements', 'commission') / gross) * 100).toFixed(1)}% doanh thu`
      : 'Chưa có sao kê';
  };

  const totalAiTokens = (rows.aiLogs ?? []).reduce(
    (acc, row) => acc + estimateAiRowTokens(row).totalTokens,
    0,
  );
  const proCount = count('subscriptions', 'plan', 'PRO');

  switch (module) {
    case 'overview':
      return [
        {
          title: 'Tổng cửa hàng',
          value: count('stores'),
          delta: `${proCount} PRO`,
          positive: true,
        },
        {
          title: 'Tổng người dùng',
          value: count('users'),
          ...trend('users'),
        },
        {
          title: 'Tổng đơn hàng',
          value: count('orders'),
          delta: `${count('orders', 'status', 'PICKED_UP')} hoàn tất`,
          positive: true,
        },
        {
          title: 'Doanh số đơn đã nhận',
          value: currency.format(sum('orders', 'total_amount', 'PICKED_UP')),
          ...trend('orders', 'total_amount', 'PICKED_UP'),
          description: 'Chỉ đơn PICKED_UP',
        },
        {
          title: 'Hoa hồng sao kê',
          value: currency.format(sum('statements', 'commission')),
          ...trend('statements', 'commission'),
          description: 'Tổng các sao kê đã lưu',
        },
        {
          title: 'Token AI (Gemini)',
          value: totalAiTokens.toLocaleString('vi-VN'),
          delta: `${count('aiLogs')} lượt gọi`,
          positive: true,
          description: 'Tổng Prompt + Completion tokens',
        },
      ];
    case 'merchants':
      return [
        { title: 'Tổng cửa hàng', value: count('stores'), ...trend('stores') },
        {
          title: 'Đang hoạt động',
          value: count('stores', 'status', 'ACTIVE'),
          delta: 'Active',
          positive: true,
        },
        {
          title: 'Chờ xác minh KYC',
          value: count('stores', 'status', 'PENDING_VERIFY'),
          delta: 'Cần duyệt',
          positive: false,
        },
        {
          title: 'Tạm ngưng',
          value: count('stores', 'status', 'SUSPENDED'),
          delta: 'Suspended',
          positive: false,
        },
      ];
    case 'users':
      return [
        { title: 'Tổng người dùng', value: count('users'), ...trend('users') },
        {
          title: 'Khách hàng',
          value: count('users', 'role', 'CUSTOMER'),
          delta: 'Customer',
          positive: true,
        },
        {
          title: 'Chủ & NV cửa hàng',
          value: count('users', 'role', 'STORE_USER'),
          delta: 'Merchant',
          positive: true,
        },
        {
          title: 'Tài khoản bị khóa',
          value: count('users', 'status', 'LOCKED'),
          delta: 'Locked',
          positive: false,
        },
      ];
    case 'orders':
      return [
        { title: 'Tổng đơn hàng', value: count('orders'), ...trend('orders') },
        {
          title: 'Chờ thanh toán',
          value: count('orders', 'status', 'PENDING_PAYMENT'),
          delta: 'Pending',
          positive: false,
        },
        {
          title: 'Đã nhận hàng',
          value: count('orders', 'status', 'PICKED_UP'),
          delta: 'Picked Up',
          positive: true,
        },
        {
          title: 'Giá trị tất cả đơn',
          value: currency.format(sum('orders', 'total_amount')),
          delta: 'GMV',
          positive: true,
          description: 'Bao gồm đơn hủy và hoàn',
        },
      ];
    case 'disputes':
      return [
        { title: 'Tổng khiếu nại', value: count('complaints'), delta: 'Disputes', positive: false },
        {
          title: 'Chờ xử lý',
          value: count('complaints', 'status', 'PENDING_STORE'),
          delta: 'Pending',
          positive: false,
        },
        {
          title: 'Đã chấp nhận',
          value: count('complaints', 'status', 'ACCEPTED'),
          delta: 'Resolved',
          positive: true,
        },
        {
          title: 'Báo cáo vi phạm chờ xử lý',
          value: count('violations', 'status', 'PENDING'),
          delta: 'Violations',
          positive: false,
        },
      ];
    case 'settlement':
      return [
        { title: 'Sao kê đã lưu', value: count('statements'), delta: 'Weekly', positive: true },
        {
          title: 'Doanh thu đối soát',
          value: currency.format(sum('statements', 'gross')),
          ...trend('statements', 'gross'),
        },
        {
          title: 'Hoa hồng',
          value: currency.format(sum('statements', 'commission')),
          delta: commissionRate(),
          positive: true,
        },
        {
          title: 'Thực trả trên sao kê',
          value: currency.format(sum('statements', 'net_payable')),
          delta: 'Net',
          positive: true,
        },
      ];
    case 'subscriptions':
      return [
        {
          title: 'Gói PRO đang mở',
          value: count('subscriptions', 'plan', 'PRO'),
          delta: '300.000₫/tháng',
          positive: true,
          description: 'Cửa hàng đang sử dụng gói Pro',
        },
        {
          title: 'Gói TRIAL dùng thử',
          value: count('subscriptions', 'plan', 'TRIAL'),
          delta: 'Trial',
          positive: true,
        },
        {
          title: 'Thuê bao ACTIVE',
          value: count('subscriptions', 'status', 'ACTIVE'),
          delta: 'Active',
          positive: true,
        },
        {
          title: 'Doanh thu gói Pro (PAID)',
          value: currency.format(sum('invoices', 'amount', 'PAID')),
          ...trend('invoices', 'amount', 'PAID'),
          description: 'Tổng hóa đơn thuê bao đã thanh toán',
        },
      ];
    case 'settings':
      return [
        { title: 'Cấu hình cửa hàng', value: count('settings'), delta: 'Stores', positive: true },
        { title: 'Nhật ký thao tác', value: count('audit'), delta: 'Audit', positive: true },
        {
          title: 'Hoạt động AI (Gemini)',
          value: count('aiLogs'),
          delta: 'Requests',
          positive: true,
        },
        {
          title: 'Tổng Token AI',
          value: totalAiTokens.toLocaleString('vi-VN'),
          delta: 'Tokens',
          positive: true,
        },
      ];
  }
}

// =====================================================
// 4. XUẤT DỮ LIỆU CSV
// =====================================================

export function rowsToCsv(rows: readonly SnapshotRow[], key: string): string {
  const fields = [
    ...new Set([
      ...Object.keys(collections[key].fields),
      'store_name',
      'user_label',
      'order_code',
      'item_name',
    ]),
  ].filter(
    (field) =>
      Object.prototype.hasOwnProperty.call(collections[key].fields, field) ||
      rows.some((row) => field in row),
  );
  const cell = (value: SnapshotValue | undefined) => {
    let result = text(value);
    if (typeof value === 'string' && /^[=+\-@\t\r]/.test(result)) result = `'${result}`;
    return `"${result.replace(/"/g, '""')}"`;
  };
  return (
    '\uFEFF' +
    [
      fields.map((field) => cell(labels[field] || field)).join(','),
      ...rows.map((row) => fields.map((field) => cell(row[field])).join(',')),
    ].join('\r\n')
  );
}

function downloadCsv(rows: readonly SnapshotRow[], key: string) {
  const url = URL.createObjectURL(
    new Blob([rowsToCsv(rows, key)], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `surplusiq-${key}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =====================================================
// 5. STARADMIN HERO CHARTS (PERFORMANCE + STATUS SUMMARY)
// =====================================================

function StarAdminHeroSection({ data }: { data: AdminSnapshot }) {
  const orders = data.collections.orders ?? [];
  const aiLogs = data.collections.aiLogs ?? [];

  const pickedUpCount = orders.filter((o) => o.status === 'PICKED_UP').length;
  const completionRate = orders.length > 0 ? Math.round((pickedUpCount / orders.length) * 100) : 0;

  const aiSuccessCount = aiLogs.filter((l) => !text(l.error_code)).length;
  const aiSuccessRate =
    aiLogs.length > 0 ? Math.round((aiSuccessCount / aiLogs.length) * 100) : 100;

  const totalSavedMeals = orders
    .filter((o) => o.status === 'PICKED_UP')
    .reduce((acc, row) => acc + number(row, 'quantity'), 0);

  // Số đơn tạo mới theo từng ngày: 7 ngày gần nhất và 7 ngày liền trước, tính từ created_at của đơn.
  const DAY = 86_400_000;
  const startOfToday = new Date(data.exportedAt);
  startOfToday.setHours(0, 0, 0, 0);
  const weekStart = startOfToday.getTime() - 6 * DAY;
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + i * DAY);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const perDay = (from: number) =>
    Array.from(
      { length: 7 },
      (_, i) =>
        orders.filter((o) => {
          const t = Date.parse(String(o.created_at));
          return t >= from + i * DAY && t < from + (i + 1) * DAY;
        }).length,
    );
  const thisWeekPoints = perDay(weekStart);
  const lastWeekPoints = perDay(weekStart - 7 * DAY);
  const maxVal = Math.max(...thisWeekPoints, ...lastWeekPoints, 1);

  const chartWidth = 640;
  const chartHeight = 190;
  const padX = 36;
  const padY = 20;

  const toCoords = (values: number[]) =>
    values.map((v, idx) => {
      const x = padX + (idx * (chartWidth - padX * 2)) / (values.length - 1);
      const y = chartHeight - padY - (v / maxVal) * (chartHeight - padY * 2);
      return { x, y, v };
    });

  const primaryPts = toCoords(thisWeekPoints);
  const secondaryPts = toCoords(lastWeekPoints);

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[i - 1];
      const cx1 = prev.x + (pt.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (pt.x - prev.x) / 2;
      const cy2 = pt.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
    }, '');
  };

  const primaryPath = buildSmoothPath(primaryPts);
  const secondaryPath = buildSmoothPath(secondaryPts);
  const areaPath = `${primaryPath} L ${primaryPts[primaryPts.length - 1].x} ${chartHeight - padY} L ${primaryPts[0].x} ${chartHeight - padY} Z`;

  return (
    <Grid container spacing={2.5}>
      {/* Left 8 Columns: Performance Line Chart */}
      <Grid size={{ xs: 12, lg: 8 }}>
        <Card
          elevation={0}
          sx={{
            height: '100%',
            borderRadius: '12px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2.5 }}
            >
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                  Biểu đồ hiệu suất
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.25 }}>
                  Số đơn tạo mới mỗi ngày trong 7 ngày gần nhất
                </Typography>
              </Box>

              <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#1F3BB3' }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    7 ngày gần nhất
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#38BDF8' }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                    7 ngày trước đó
                  </Typography>
                </Stack>
              </Stack>
            </Stack>

            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight + 18}`}
                style={{ width: '100%', height: 'auto', minWidth: 320, display: 'block' }}
                role="img"
                aria-label="Biểu đồ hiệu suất"
              >
                <defs>
                  <linearGradient id="starAdminPrimaryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1F3BB3" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#1F3BB3" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[0.2, 0.5, 0.8].map((ratio, idx) => {
                  const y = padY + ratio * (chartHeight - padY * 2);
                  return (
                    <line
                      key={idx}
                      x1={padX}
                      y1={y}
                      x2={chartWidth - padX}
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                  );
                })}

                <path d={areaPath} fill="url(#starAdminPrimaryGrad)" />
                <path
                  d={secondaryPath}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
                <path d={primaryPath} fill="none" stroke="#1F3BB3" strokeWidth="3" />

                {primaryPts.map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill="#FFFFFF"
                      stroke="#1F3BB3"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pt.x}
                      y={chartHeight + 12}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="600"
                      fill="#94A3B8"
                    >
                      {dayLabels[i]}
                    </text>
                  </g>
                ))}
              </svg>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Right 4 Columns: Royal Blue Status Summary Card + Dual Donut Gauge Card */}
      <Grid size={{ xs: 12, lg: 4 }}>
        <Stack spacing={2.5} sx={{ height: '100%' }}>
          {/* Deep Royal Blue Status Summary Card */}
          <Card
            elevation={0}
            sx={{
              borderRadius: '12px',
              bgcolor: '#1F3BB3',
              color: '#FFFFFF',
              border: 'none',
              boxShadow: '0 8px 24px rgba(31, 59, 179, 0.22)',
            }}
          >
            <CardContent sx={{ p: 2.75 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
                Tóm tắt trạng thái
              </Typography>
              <Grid container spacing={2} sx={{ alignItems: 'center', mt: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <Typography sx={{ fontSize: 12, color: '#CBD5E1', fontWeight: 500 }}>
                    Suất đã cứu
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: '#FFFFFF',
                      letterSpacing: '-0.03em',
                      mt: 0.25,
                    }}
                  >
                    {totalSavedMeals}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* White Dual Donut Gauge Card */}
          <Card
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: '12px',
              bgcolor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 6 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                      <svg viewBox="0 0 36 36" style={{ width: 52, height: 52 }}>
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E2E8F0"
                          strokeWidth="3.8"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#1F3BB3"
                          strokeWidth="3.8"
                          strokeDasharray={`${completionRate}, 100`}
                        />
                      </svg>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                        Đơn hoàn tất
                      </Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>
                        {completionRate}%
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Box sx={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                      <svg viewBox="0 0 36 36" style={{ width: 52, height: 52 }}>
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#E2E8F0"
                          strokeWidth="3.8"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#0EA5E9"
                          strokeWidth="3.8"
                          strokeDasharray={`${aiLogs.length > 0 ? aiSuccessRate : 0}, 100`}
                        />
                      </svg>
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                        AI phản hồi thành công
                      </Typography>
                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>
                        {aiLogs.length > 0 ? `${aiSuccessRate}%` : '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
}

// =====================================================
// 6. PANEL TỔNG KẾT TOKEN AI (GEMINI)
// =====================================================

function AiTokenSummaryPanel({ data }: { data: AdminSnapshot }) {
  const aiLogs = data.collections.aiLogs ?? [];
  const usageLogs = data.collections.usage ?? [];

  const summary = useMemo(() => {
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let totalLatency = 0;
    let errorCount = 0;

    const byModel = new Map<
      string,
      {
        model: string;
        calls: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        avgLatency: number;
      }
    >();
    const byFeature = new Map<
      string,
      {
        feature: string;
        calls: number;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
      }
    >();
    const byStore = new Map<
      string,
      { storeName: string; calls: number; totalTokens: number; quotaUnits: number }
    >();

    for (const row of aiLogs) {
      const est = estimateAiRowTokens(row);
      const latency = number(row, 'latency_ms');
      const modelName = text(row.model) || 'gemini-2.0-flash';
      const featureName = text(row.feature_code) || 'UNKNOWN';
      const storeName = text(row.store_name) || text(row.store_id) || 'Hệ thống / Khách hàng';

      inputTokens += est.inputTokens;
      outputTokens += est.outputTokens;
      totalTokens += est.totalTokens;
      totalLatency += latency;
      if (text(row.error_code)) errorCount += 1;

      const m = byModel.get(modelName) ?? {
        model: modelName,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        avgLatency: 0,
      };
      m.calls += 1;
      m.inputTokens += est.inputTokens;
      m.outputTokens += est.outputTokens;
      m.totalTokens += est.totalTokens;
      m.avgLatency += latency;
      byModel.set(modelName, m);

      const f = byFeature.get(featureName) ?? {
        feature: featureName,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      };
      f.calls += 1;
      f.inputTokens += est.inputTokens;
      f.outputTokens += est.outputTokens;
      f.totalTokens += est.totalTokens;
      byFeature.set(featureName, f);

      const s = byStore.get(storeName) ?? {
        storeName,
        calls: 0,
        totalTokens: 0,
        quotaUnits: 0,
      };
      s.calls += 1;
      s.totalTokens += est.totalTokens;
      byStore.set(storeName, s);
    }

    for (const u of usageLogs) {
      const qKey = text(u.quota_key);
      if (qKey.startsWith('ai_')) {
        const storeName = text(u.store_name) || text(u.store_id) || 'Hệ thống / Khách hàng';
        const s = byStore.get(storeName) ?? {
          storeName,
          calls: 0,
          totalTokens: 0,
          quotaUnits: 0,
        };
        s.quotaUnits += number(u, 'units');
        byStore.set(storeName, s);
      }
    }

    const avgLatencyMs = aiLogs.length > 0 ? Math.round(totalLatency / aiLogs.length) : 0;
    // Gemini Flash pricing estimate (~$0.10 / 1M input tokens, ~$0.40 / 1M output tokens, ~25,500 VND/USD)
    const estimatedUsd = (inputTokens * 0.1 + outputTokens * 0.4) / 1_000_000;
    const estimatedVnd = Math.max(0, Math.ceil(estimatedUsd * 25500));

    return {
      totalCalls: aiLogs.length,
      inputTokens,
      outputTokens,
      totalTokens,
      avgLatencyMs,
      errorCount,
      estimatedVnd,
      models: [...byModel.values()].map((item) => ({
        ...item,
        avgLatency: item.calls > 0 ? Math.round(item.avgLatency / item.calls) : 0,
      })),
      features: [...byFeature.values()].sort((a, b) => b.totalTokens - a.totalTokens),
      stores: [...byStore.values()].sort((a, b) => b.totalTokens - a.totalTokens),
    };
  }, [aiLogs, usageLogs]);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '12px',
        bgcolor: '#FFFFFF',
        border: '1px solid #E5E7EB',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  bgcolor: '#EEF2FF',
                  color: '#1F3BB3',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Sparkle size={20} weight="duotone" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                  Tổng kết Token AI (Google Gemini API)
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                  Thống kê lưu lượng Prompt / Completion Tokens, độ trễ và hạn mức AI theo mô hình &
                  cửa hàng
                </Typography>
              </Box>
            </Stack>

            <Chip
              icon={<Lightning size={15} weight="fill" />}
              label={`Gemini API Active · ${summary.totalCalls} lượt gọi`}
              sx={{
                bgcolor: '#EEF2FF',
                color: '#1F3BB3',
                fontWeight: 700,
                fontSize: 12,
              }}
            />
          </Stack>

          {/* AI Token KPI Strip */}
          <Grid container spacing={2}>
            {[
              {
                label: 'Tổng Token tiêu thụ',
                value: summary.totalTokens.toLocaleString('vi-VN'),
                sub: 'Prompt + Completion',
                color: '#1F3BB3',
              },
              {
                label: 'Prompt Tokens (Đầu vào)',
                value: summary.inputTokens.toLocaleString('vi-VN'),
                sub: 'System + User Prompt',
                color: '#0EA5E9',
              },
              {
                label: 'Completion Tokens (Đầu ra)',
                value: summary.outputTokens.toLocaleString('vi-VN'),
                sub: 'Phản hồi JSON / Văn bản',
                color: '#10B981',
              },
              {
                label: 'Độ trễ TB / Chi phí ước tính',
                value: `${summary.avgLatencyMs} ms`,
                sub: `~${currency.format(summary.estimatedVnd)} (${summary.errorCount} lỗi)`,
                color: '#F59E0B',
              },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                    {item.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: item.color,
                      mt: 0.5,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {item.value}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.25 }}>
                    {item.sub}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Model & Feature Breakdown */}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  height: '100%',
                }}
              >
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', mb: 1.5 }}>
                  Phân bổ theo Mô hình Gemini
                </Typography>
                <Stack spacing={1.25}>
                  {summary.models.length === 0 ? (
                    <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                      Chưa có nhật ký gọi mô hình AI.
                    </Typography>
                  ) : (
                    summary.models.map((m) => (
                      <Box
                        key={m.model}
                        sx={{
                          p: 1.25,
                          borderRadius: '8px',
                          bgcolor: '#F8FAFC',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                            {m.model}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
                            {m.calls} yêu cầu · TB {m.avgLatency} ms
                          </Typography>
                        </Box>
                        <Stack sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#1F3BB3' }}>
                            {m.totalTokens.toLocaleString('vi-VN')} tokens
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                            In: {m.inputTokens.toLocaleString('vi-VN')} · Out:{' '}
                            {m.outputTokens.toLocaleString('vi-VN')}
                          </Typography>
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  height: '100%',
                }}
              >
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1E293B', mb: 1.5 }}>
                  Phân bổ theo Tính năng AI & Cửa hàng
                </Typography>
                <Stack spacing={1.25}>
                  {summary.features.length === 0 ? (
                    <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                      Chưa có dữ liệu tính năng AI.
                    </Typography>
                  ) : (
                    summary.features.map((f) => {
                      const pct =
                        summary.totalTokens > 0
                          ? Math.min(100, Math.round((f.totalTokens / summary.totalTokens) * 100))
                          : 0;
                      return (
                        <Box key={f.feature}>
                          <Stack
                            direction="row"
                            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
                          >
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>
                              {f.feature} ({f.calls} lượt)
                            </Typography>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1F3BB3' }}>
                              {f.totalTokens.toLocaleString('vi-VN')} tokens ({pct}%)
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 6,
                              borderRadius: 99,
                              bgcolor: '#E2E8F0',
                              '& .MuiLinearProgress-bar': { bgcolor: '#1F3BB3' },
                            }}
                          />
                        </Box>
                      );
                    })
                  )}
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 7. PANEL ADMIN DUYỆT GÓI PRO & QUẢN LÝ THUÊ BAO
// =====================================================

function AdminProApprovalPanel({
  data,
  onSaved,
}: {
  data: AdminSnapshot;
  onSaved: () => Promise<void>;
}) {
  const [busyStoreId, setBusyStoreId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const storeItems = useMemo(() => {
    const stores = data.collections.stores ?? [];
    const subscriptions = data.collections.subscriptions ?? [];
    const invoices = data.collections.invoices ?? [];
    const subByStore = new Map(subscriptions.map((s) => [text(s.store_id), s]));

    return stores.map((store) => {
      const storeId = text(store.id);
      const sub = subByStore.get(storeId);
      const plan = text(sub?.plan) || 'BASIC';
      const status = text(sub?.status) || 'ACTIVE';
      const periodEnd = text(sub?.period_end);
      const pendingInvoice = invoices.find(
        (inv) => text(inv.store_id) === storeId && text(inv.status) !== 'PAID',
      );
      return {
        storeId,
        storeName: text(store.name) || storeId,
        ownerLabel: text(store.user_label) || '—',
        storeStatus: text(store.status) || 'ACTIVE',
        plan,
        status,
        periodEnd,
        pendingInvoice,
        rawSub: sub ?? {
          store_id: storeId,
          store_name: store.name,
          plan: 'BASIC',
          status: 'ACTIVE',
        },
      };
    });
  }, [data]);

  const handlePlanAction = async (
    storeId: string,
    storeName: string,
    rawSub: SnapshotRow,
    action: 'upgrade' | 'renew' | 'downgrade',
  ) => {
    if (busyStoreId) return;
    setBusyStoreId(storeId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await saveAdminRecord('subscriptions', rawSub, { action }, crypto.randomUUID());
      await onSaved();
      const actionLabel =
        action === 'upgrade'
          ? 'Đã duyệt & nâng cấp gói PRO (30 ngày)'
          : action === 'renew'
            ? 'Đã gia hạn gói PRO (+30 ngày)'
            : 'Đã hạ về gói BASIC';
      setActionSuccess(`${actionLabel} cho cửa hàng "${storeName}".`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Không thể cập nhật gói dịch vụ cho cửa hàng.',
      );
    } finally {
      setBusyStoreId(null);
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '12px',
        bgcolor: '#FFFFFF',
        border: '1px solid #E5E7EB',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.25}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '10px',
                  bgcolor: '#FEF3C7',
                  color: '#D97706',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <CrownSimple size={20} weight="fill" />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
                  Admin Duyệt Gói Pro & Cấp Quyền Thuê Bao Cửa Hàng
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                  Duyệt nâng cấp Pro (300.000 ₫ / 30 ngày), gia hạn kỳ tiếp theo hoặc hạ về Basic
                  tức thì
                </Typography>
              </Box>
            </Stack>

            <Chip
              label={`${storeItems.filter((s) => s.plan === 'PRO').length} / ${storeItems.length} cửa hàng PRO`}
              sx={{
                bgcolor: '#FEF3C7',
                color: '#B45309',
                fontWeight: 700,
                fontSize: 12,
              }}
            />
          </Stack>

          {actionError && (
            <Alert severity="error" onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}

          {actionSuccess && (
            <Alert severity="success" onClose={() => setActionSuccess(null)}>
              {actionSuccess}
            </Alert>
          )}

          <Grid container spacing={2}>
            {storeItems.map((item) => {
              const isPro = item.plan === 'PRO';
              const isBusy = busyStoreId === item.storeId;

              return (
                <Grid key={item.storeId} size={{ xs: 12, md: 6, xl: 4 }}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: '10px',
                      bgcolor: isPro ? '#FFFBEB' : '#F8FAFC',
                      border: isPro ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      height: '100%',
                    }}
                  >
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
                          {item.storeName}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 12, color: '#64748B', mt: 0.25 }}>
                          Chủ: {item.ownerLabel}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={item.plan}
                        color={isPro ? 'warning' : item.plan === 'TRIAL' ? 'info' : 'default'}
                        sx={{ fontWeight: 800 }}
                      />
                    </Stack>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Trạng thái: ${item.status}`}
                        sx={{ fontSize: 11 }}
                      />
                      {item.periodEnd && (
                        <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
                          Hết hạn: {format(item.periodEnd, 'period_end')}
                        </Typography>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ pt: 0.5, flexWrap: 'wrap' }}>
                      {!isPro ? (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={Boolean(busyStoreId)}
                          startIcon={<CheckCircle size={16} weight="bold" />}
                          onClick={() =>
                            void handlePlanAction(
                              item.storeId,
                              item.storeName,
                              item.rawSub,
                              'upgrade',
                            )
                          }
                          sx={{
                            bgcolor: '#1F3BB3',
                            '&:hover': { bgcolor: '#172E8C' },
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {isBusy ? 'Đang duyệt...' : 'Duyệt lên PRO (30 ngày)'}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={Boolean(busyStoreId)}
                          startIcon={<ArrowsClockwise size={16} weight="bold" />}
                          onClick={() =>
                            void handlePlanAction(
                              item.storeId,
                              item.storeName,
                              item.rawSub,
                              'renew',
                            )
                          }
                          sx={{
                            bgcolor: '#10B981',
                            '&:hover': { bgcolor: '#059669' },
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {isBusy ? 'Đang xử lý...' : 'Gia hạn PRO (+30 ngày)'}
                        </Button>
                      )}

                      {item.plan !== 'BASIC' && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          disabled={Boolean(busyStoreId)}
                          onClick={() =>
                            void handlePlanAction(
                              item.storeId,
                              item.storeName,
                              item.rawSub,
                              'downgrade',
                            )
                          }
                          sx={{ fontSize: 12, color: '#475569', borderColor: '#CBD5E1' }}
                        >
                          Hạ về Basic
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 8. BÁO CÁO LỊCH SỬ BÁN HÀNG
// =====================================================

function SalesHistory({ data }: { data: AdminSnapshot }) {
  const [period, setPeriod] = useState('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const invalid = !!from && !!to && from > to;
  const groups = new Map<string, { count: number; revenue: number }>();
  for (const order of filterRows(data.collections.orders, '', {}, from, to, 'created_at')) {
    const date = new Date(text(order.created_at));
    if (!Number.isFinite(date.getTime())) continue;
    const day = vietnamDay(text(order.created_at));
    const key = day.slice(0, period === 'year' ? 4 : period === 'month' ? 7 : 10);
    const group = groups.get(key) || { count: 0, revenue: 0 };
    group.count += 1;
    if (order.status === 'PICKED_UP') group.revenue += number(order, 'total_amount');
    groups.set(key, group);
  }
  const history: SnapshotRow[] = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, value]) => ({ id, count: value.count, revenue: value.revenue }));
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          select
          size="small"
          label="Nhóm báo cáo"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="day">Theo ngày</MenuItem>
          <MenuItem value="month">Theo tháng</MenuItem>
          <MenuItem value="year">Theo năm</MenuItem>
        </TextField>
        <TextField
          type="date"
          size="small"
          label="Từ ngày"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          type="date"
          size="small"
          label="Đến ngày"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          error={invalid}
          helperText={invalid ? 'Ngày kết thúc phải từ ngày bắt đầu.' : undefined}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
      <AdminDataTable
        title="Báo cáo đơn hàng theo thời gian"
        description="Doanh số chỉ tính đơn đã nhận (PICKED_UP); kỳ báo cáo theo giờ Việt Nam, dựa trên ngày tạo đơn."
        rows={invalid ? [] : history}
        getRowId={(row) => text(row.id)}
        columns={[
          { id: 'id', label: 'Kỳ', value: (row) => text(row.id) },
          { id: 'count', label: 'Số đơn (mọi trạng thái)', value: (row) => number(row, 'count') },
          {
            id: 'revenue',
            label: 'Doanh số đơn đã nhận',
            value: (row) => number(row, 'revenue'),
            render: (row) => currency.format(number(row, 'revenue')),
          },
        ]}
      />
    </Stack>
  );
}

// =====================================================
// 9. CẤU HÌNH QUAN HỆ GIỮA CÁC BẢNG DỮ LIỆU
// =====================================================

const relations: Record<string, { key: string; foreign: string; local?: string }[]> = {
  stores: [
    'members',
    'items',
    'offers',
    'orders',
    'complaints',
    'statements',
    'subscriptions',
    'settings',
  ].map((key) => ({ key, foreign: 'store_id' })),
  users: ['orders', 'complaints', 'reviews', 'noshows']
    .map((key) => ({ key, foreign: 'customer_id' }))
    .concat([{ key: 'members', foreign: 'user_id' }]),
  orders: [
    { key: 'payments', foreign: 'order_id' },
    { key: 'complaints', foreign: 'order_id' },
    { key: 'reviews', foreign: 'order_id' },
  ],
  complaints: [
    { key: 'attachments', foreign: 'complaint_id' },
    { key: 'orders', foreign: 'id', local: 'order_id' },
  ],
  statements: [{ key: 'statementLines', foreign: 'statement_id' }],
  subscriptions: [
    { key: 'invoices', foreign: 'store_id', local: 'store_id' },
    { key: 'usage', foreign: 'store_id', local: 'store_id' },
  ],
  support: [{ key: 'supportMessages', foreign: 'ticket_id' }],
};

// =====================================================
// 10. COMPONENT SNAPSHOT PAGE (STARADMIN LAYOUT)
// =====================================================

export function SnapshotPage({
  module,
  liveContent,
}: {
  module: SnapshotModule;
  liveContent: ReactNode;
}) {
  const { data, loading, error, reload, refreshFromBackend } = useAdminSnapshot();
  const definition = modules[module];
  const [tab, setTab] = useState<string>(definition.tables[0]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<{ key: string; row: SnapshotRow } | null>(null);
  const [mutation, setMutation] = useState<{ key: string; row: SnapshotRow | null } | null>(null);
  const [deleting, setDeleting] = useState<{ key: string; row: SnapshotRow; label: string } | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteCommitted, setDeleteCommitted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const deletePending = useRef(false);

  const rows = data?.collections[tab] || [];
  const invalid = !!from && !!to && from > to;
  const dateField =
    tab === 'statements'
      ? 'week_start'
      : tab === 'actuals' || tab === 'anomalies'
        ? 'date'
        : tab === 'forecasts'
          ? 'target_date'
          : 'created_at';
  const filtered = useMemo(
    () => (invalid ? [] : filterRows(rows, query, filters, from, to, dateField)),
    [rows, query, filters, from, to, dateField, invalid],
  );
  const metrics = data ? metricsFor(module, data) : [];

  const changeTab = (next: string) => {
    setTab(next);
    setQuery('');
    setFilters({});
    setFrom('');
    setTo('');
    setSelected(null);
    setFeedback(null);
  };

  const edit = (key: string, row: SnapshotRow | null) => {
    setSelected(null);
    setFeedback(null);
    setMutation({ key, row });
  };

  const askDelete = (key: string, row: SnapshotRow) => {
    const label = deleteLabel(key, row);
    if (!label) return;
    setFeedback(null);
    setSelected(null);
    setDeleteError(null);
    setDeleteCommitted(false);
    setDeleting({ key, row, label });
  };

  const afterSave = async () => {
    await refreshFromBackend();
    setSelected(null);
    setFeedback('Đã lưu thay đổi.');
  };

  const confirmDelete = async () => {
    if (!deleting || deletePending.current) return;
    deletePending.current = true;
    setDeleteBusy(true);
    setDeleteError(null);
    let committed = deleteCommitted;
    try {
      if (!committed) {
        await deleteRecord(deleting.key, deleting.row);
        committed = true;
        setDeleteCommitted(true);
      }
      await afterSave();
      setDeleting(null);
    } catch (cause) {
      setDeleteError(
        `${committed ? 'Đã lưu, nhưng chưa tải lại được bảng. ' : ''}${cause instanceof Error ? cause.message : 'Không thực hiện được thao tác.'}`,
      );
    } finally {
      deletePending.current = false;
      setDeleteBusy(false);
    }
  };

  return (
    <Stack spacing={2.5} data-snapshot-module={module}>
      {/* Page Title & StarAdmin Sub-Tab / Action Bar */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { lg: 'center' },
          borderBottom: '1px solid #E5E7EB',
          pb: 1,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 1, md: 3 }}
          sx={{ alignItems: { md: 'center' }, minWidth: 0, flex: 1 }}
        >
          <Typography
            component="h1"
            variant="h5"
            sx={{
              fontWeight: 800,
              color: '#1E293B',
              letterSpacing: '-0.02em',
              flexShrink: 0,
            }}
          >
            {definition.title}
          </Typography>

          <Tabs
            value={tab}
            variant="scrollable"
            scrollButtons="auto"
            onChange={(_, value: string) => changeTab(value)}
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                minHeight: 40,
                textTransform: 'none',
                fontSize: 13,
                fontWeight: 600,
                color: '#64748B',
                px: 1.75,
                '&.Mui-selected': {
                  color: '#1F3BB3',
                  fontWeight: 700,
                },
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#1F3BB3',
                height: 2.5,
              },
            }}
          >
            {definition.tables.map((key) => (
              <Tab
                key={key}
                value={key}
                label={`${collections[key].title}${data ? ` (${data.counts[key]})` : ''}`}
              />
            ))}
            <Tab value="live" label={definition.live} />
          </Tabs>
        </Stack>

        {/* StarAdmin Share / Print / Export / Reload Buttons */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ShareNetwork size={15} />}
            onClick={() => {
              if (navigator.clipboard && window.location) {
                void navigator.clipboard.writeText(window.location.href);
                setFeedback('Đã sao chép liên kết trang quản trị.');
              }
            }}
            sx={{
              bgcolor: '#FFFFFF',
              borderColor: '#E2E8F0',
              color: '#475569',
              fontSize: 12,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            Chia sẻ
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Printer size={15} />}
            onClick={() => window.print()}
            sx={{
              bgcolor: '#FFFFFF',
              borderColor: '#E2E8F0',
              color: '#475569',
              fontSize: 12,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            In trang
          </Button>
          {tab !== 'live' && (
            <Button
              size="small"
              variant="contained"
              startIcon={<DownloadSimple size={15} weight="bold" />}
              disabled={!data || loading}
              onClick={() => downloadCsv(filtered, tab)}
              sx={{
                bgcolor: '#1F3BB3',
                '&:hover': { bgcolor: '#172E8C' },
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Xuất dữ liệu
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            onClick={reload}
            disabled={loading}
            sx={{
              bgcolor: '#FFFFFF',
              borderColor: '#E2E8F0',
              color: '#1E293B',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Tải lại dữ liệu
          </Button>
        </Stack>
      </Stack>

      {(loading || error) && (
        <Alert
          severity={error ? 'error' : 'info'}
          action={
            error ? (
              <Button color="inherit" onClick={reload}>
                Thử lại
              </Button>
            ) : undefined
          }
        >
          {error || 'Đang tải dữ liệu…'}
        </Alert>
      )}

      {feedback && (
        <Alert severity="success" onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      {/* StarAdmin Top Frameless KPI Strip */}
      {data && (
        <Box
          sx={{
            py: 1.5,
            px: { xs: 2, md: 3 },
            borderRadius: '12px',
            bgcolor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.02)',
          }}
        >
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            {metrics.map((metric, idx) => (
              <Grid
                key={metric.title}
                size={{ xs: 6, sm: 4, lg: Math.max(2, Math.floor(12 / metrics.length)) }}
              >
                <Box
                  sx={{
                    pr: 1,
                    borderRight: {
                      lg: idx < metrics.length - 1 ? '1px solid #F1F5F9' : 'none',
                    },
                  }}
                >
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#64748B',
                    }}
                  >
                    {metric.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: 18, md: 22 },
                      fontWeight: 800,
                      color: '#1E293B',
                      letterSpacing: '-0.02em',
                      mt: 0.25,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {metric.value}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: metric.positive !== false ? '#10B981' : '#EF4444',
                      }}
                    >
                      {metric.positive !== false ? '▲' : '▼'} {metric.delta || 'Live'}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* StarAdmin Hero Charts on Overview */}
      {module === 'overview' && data && tab !== 'live' && <StarAdminHeroSection data={data} />}

      {tab === 'live' ? (
        liveContent
      ) : (
        <Stack spacing={2.5}>
          {/* Filter Bar */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            sx={{
              flexWrap: 'wrap',
              rowGap: 1.5,
              p: 2,
              borderRadius: '12px',
              bgcolor: '#FFFFFF',
              border: '1px solid #E5E7EB',
            }}
          >
            <TextField
              size="small"
              label="Tìm kiếm dữ liệu"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              sx={{ minWidth: 220, flex: 1 }}
            />
            {['status', 'role', 'plan', 'store_name']
              .filter((field) => rows.some((row) => row[field] != null))
              .map((field) => (
                <TextField
                  key={field}
                  select
                  size="small"
                  label={labels[field]}
                  value={filters[field] || ''}
                  onChange={(event) => setFilters({ ...filters, [field]: event.target.value })}
                  sx={{ minWidth: 150, maxWidth: 300 }}
                >
                  <MenuItem value="">Tất cả</MenuItem>
                  {[...new Set(rows.map((row) => text(row[field])))]
                    .filter(Boolean)
                    .sort()
                    .map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                </TextField>
              ))}
            <TextField
              size="small"
              type="date"
              label="Từ ngày"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label="Đến ngày"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              error={invalid}
              helperText={invalid ? 'Khoảng ngày không hợp lệ' : undefined}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              onClick={() => {
                setFilters({});
                setQuery('');
                setFrom('');
                setTo('');
              }}
            >
              Đặt lại
            </Button>
          </Stack>

          {/* Main Data Table */}
          <AdminDataTable
            key={`${tab}-${query}-${JSON.stringify(filters)}-${from}-${to}`}
            title={collections[tab].title}
            description={`${filtered.length} / ${rows.length} bản ghi. Nhấn vào một dòng để xem chi tiết.`}
            rows={filtered}
            columns={columnsFor(tab)}
            getRowId={(row) => text(row[collections[tab].primaryKey])}
            loading={loading}
            error={error}
            onRetry={reload}
            hideSearch
            onRowClick={(row) => setSelected({ key: tab, row })}
            actions={[
              {
                id: 'view',
                label: 'Xem chi tiết',
                onClick: (row) => setSelected({ key: tab, row }),
              },
              ...(rows.some((row) => canEditRecord(tab, row))
                ? [
                    {
                      id: 'edit',
                      label:
                        tab === 'complaints'
                          ? 'Xử lý khiếu nại'
                          : tab === 'subscriptions'
                            ? 'Duyệt / Đổi gói Pro'
                            : 'Chỉnh sửa',
                      onClick: (row: SnapshotRow) => edit(tab, row),
                      disabled: (row: SnapshotRow) => !canEditRecord(tab, row),
                    },
                  ]
                : []),
              ...(rows.some((row) => !!deleteLabel(tab, row))
                ? [
                    {
                      id: 'delete',
                      label:
                        tab === 'quotas'
                          ? 'Xóa ghi đè'
                          : tab === 'users'
                            ? 'Khóa tài khoản'
                            : tab === 'stores'
                              ? 'Tạm ngưng'
                              : 'Ẩn đánh giá',
                      onClick: (row: SnapshotRow) => askDelete(tab, row),
                      disabled: (row: SnapshotRow) => !deleteLabel(tab, row),
                      destructive: true,
                    },
                  ]
                : []),
            ]}
            toolbarActions={
              <Stack direction="row" spacing={1}>
                {supportsCreate(tab) && (
                  <Button
                    variant="contained"
                    disabled={!data || loading}
                    onClick={() => edit(tab, null)}
                  >
                    Thêm mới
                  </Button>
                )}
                <Button onClick={() => downloadCsv(filtered, tab)} disabled={!data || loading}>
                  Xuất CSV đã lọc
                </Button>
              </Stack>
            }
            emptyTitle="Không có bản ghi phù hợp"
            emptyDescription="Thử thay đổi bộ lọc hoặc xuất lại dữ liệu mới."
          />

          {/* Admin Pro Approval Interactive Panel */}
          {(module === 'subscriptions' || module === 'overview') && data && (
            <AdminProApprovalPanel data={data} onSaved={afterSave} />
          )}

          {/* AI Token Summary Panel */}
          {(module === 'overview' || module === 'settings' || tab === 'aiLogs') && data && (
            <AiTokenSummaryPanel data={data} />
          )}

          {/* Sales History on Overview */}
          {module === 'overview' && data && <SalesHistory data={data} />}
        </Stack>
      )}

      {/* Record Detail Drawer */}
      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? collections[selected.key].title : 'Chi tiết'}
        size="lg"
        footer={
          <Stack direction="row" spacing={1}>
            {selected && canEditRecord(selected.key, selected.row) && (
              <Button variant="contained" onClick={() => edit(selected.key, selected.row)}>
                {selected.key === 'complaints'
                  ? 'Xử lý khiếu nại'
                  : selected.key === 'subscriptions'
                    ? 'Duyệt / Đổi gói Pro'
                    : 'Chỉnh sửa'}
              </Button>
            )}
            {selected && deleteLabel(selected.key, selected.row) && (
              <Button color="error" onClick={() => askDelete(selected.key, selected.row)}>
                {deleteLabel(selected.key, selected.row)}
              </Button>
            )}
            <Button onClick={() => setSelected(null)}>Đóng</Button>
          </Stack>
        }
      >
        {selected && (
          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  {Object.entries(selected.row).map(([field, value]) => (
                    <Box
                      key={field}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
                        gap: 1,
                      }}
                    >
                      <Typography color="text.secondary">
                        {labels[field] || collections[selected.key].fields[field] || field}
                      </Typography>
                      <Box sx={{ overflowWrap: 'anywhere' }}>{detailValue(value, field)}</Box>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
            {data &&
              (relations[selected.key] || []).map((relation) => {
                const id = selected.row[relation.local || collections[selected.key].primaryKey];
                const related = data.collections[relation.key].filter(
                  (row) => row[relation.foreign] === id,
                );
                return (
                  <AdminDataTable
                    key={relation.key}
                    title={`${collections[relation.key].title} liên quan (${related.length})`}
                    rows={related}
                    columns={columnsFor(relation.key)}
                    getRowId={(row) => text(row[collections[relation.key].primaryKey])}
                    onRowClick={(row) => setSelected({ key: relation.key, row })}
                    initialPageSize={5}
                    pageSizeOptions={[5, 10, 20]}
                  />
                );
              })}
          </Stack>
        )}
      </AdminDrawer>

      {data && mutation && (
        <AdminMutationDialog
          collection={mutation.key}
          row={mutation.row}
          open
          onClose={() => setMutation(null)}
          onSaved={afterSave}
          snapshot={data}
        />
      )}

      <Dialog
        open={!!deleting}
        onClose={() => {
          if (!deleteBusy) setDeleting(null);
        }}
      >
        <DialogTitle>{deleting?.label}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Thao tác này sẽ cập nhật trạng thái bản ghi trong cơ sở dữ liệu PostgreSQL và tải lại dữ
            liệu quản trị.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={deleteBusy} onClick={() => setDeleting(null)}>
            Hủy
          </Button>
          {deleteCommitted && deleteError ? (
            <Button variant="contained" disabled={deleteBusy} onClick={confirmDelete}>
              Tải lại dữ liệu
            </Button>
          ) : (
            <Button color="error" variant="contained" disabled={deleteBusy} onClick={confirmDelete}>
              Xác nhận
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
export default SnapshotPage;
