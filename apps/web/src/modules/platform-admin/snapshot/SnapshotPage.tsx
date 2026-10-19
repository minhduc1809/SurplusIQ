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
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { AdminDataTable, type AdminTableColumn } from '../components/DataTable/AdminDataTable';
import { AdminDrawer } from '../components/Drawer/AdminDrawer';
import { AdminStatCard } from '../components/StatCard/AdminStatCard';
import { useAdminSnapshot } from './AdminSnapshotProvider';
import { AdminMutationDialog } from './AdminMutationDialog';
import {
  canEditRecord,
  deleteLabel,
  deleteRecord,
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
    live: 'Quy tắc gói dịch vụ',
  },
  settings: {
    title: 'Cấu hình & nhật ký',
    tables: ['audit', 'settings', 'settingsHistory', 'notifications', 'aiLogs'],
    live: 'Cấu hình nền tảng (API)',
  },
};
export type SnapshotModule = keyof typeof modules;

// =====================================================
// 2. ĐỊNH DẠNG GIÁ TRỊ
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
        <Chip size="small" variant="outlined" label={text(row[field]) || '—'} />
      ) : (
        <Box sx={{ maxWidth: 280, overflowWrap: 'anywhere' }}>{detailValue(row[field], field)}</Box>
      ),
  }));
}

// =====================================================
// 3. CHỈ SỐ KPI THEO MÔ ĐUN
// =====================================================

type Metric = { title: string; value: string | number; description?: string };
function metricsFor(module: SnapshotModule, snapshot: AdminSnapshot): Metric[] {
  const rows = snapshot.collections;
  const count = (key: string, field?: string, value?: string) =>
    field ? rows[key].filter((row) => row[field] === value).length : rows[key].length;
  const sum = (key: string, field: string, status?: string) =>
    rows[key]
      .filter((row) => !status || row.status === status)
      .reduce((total, row) => total + number(row, field), 0);
  switch (module) {
    case 'overview':
      return [
        { title: 'Tổng cửa hàng', value: count('stores') },
        { title: 'Tổng người dùng', value: count('users') },
        { title: 'Tổng đơn hàng', value: count('orders') },
        {
          title: 'Doanh số đơn đã nhận',
          value: currency.format(sum('orders', 'total_amount', 'PICKED_UP')),
          description: 'Chỉ đơn PICKED_UP',
        },
        { title: 'Suất đã nhận', value: sum('orders', 'quantity', 'PICKED_UP') },
        {
          title: 'Hoa hồng trên sao kê',
          value: currency.format(sum('statements', 'commission')),
          description: 'Tổng các sao kê đã lưu',
        },
        { title: 'Đợt bán đã lưu', value: count('offers') },
        { title: 'Suất quyên góp', value: sum('donations', 'quantity') },
      ];
    case 'merchants':
      return [
        { title: 'Tổng cửa hàng', value: count('stores') },
        { title: 'Đang hoạt động', value: count('stores', 'status', 'ACTIVE') },
        { title: 'Chờ xác minh', value: count('stores', 'status', 'PENDING_VERIFY') },
        { title: 'Tạm ngưng', value: count('stores', 'status', 'SUSPENDED') },
      ];
    case 'users':
      return [
        { title: 'Tổng người dùng', value: count('users') },
        { title: 'Khách hàng', value: count('users', 'role', 'CUSTOMER') },
        { title: 'Người dùng cửa hàng', value: count('users', 'role', 'STORE_USER') },
        { title: 'Tài khoản bị khóa', value: count('users', 'status', 'LOCKED') },
      ];
    case 'orders':
      return [
        { title: 'Tổng đơn hàng', value: count('orders') },
        { title: 'Chờ thanh toán', value: count('orders', 'status', 'PENDING_PAYMENT') },
        { title: 'Đã nhận hàng', value: count('orders', 'status', 'PICKED_UP') },
        {
          title: 'Giá trị tất cả đơn',
          value: currency.format(sum('orders', 'total_amount')),
          description: 'Bao gồm đơn hủy và hoàn; không phải doanh thu',
        },
      ];
    case 'disputes':
      return [
        { title: 'Tổng khiếu nại', value: count('complaints') },
        { title: 'Chờ xử lý', value: count('complaints', 'status', 'PENDING_STORE') },
        { title: 'Đã chấp nhận', value: count('complaints', 'status', 'ACCEPTED') },
        { title: 'Báo cáo vi phạm chờ xử lý', value: count('violations', 'status', 'PENDING') },
      ];
    case 'settlement':
      return [
        { title: 'Sao kê đã lưu', value: count('statements') },
        { title: 'Doanh thu đối soát', value: currency.format(sum('statements', 'gross')) },
        { title: 'Hoa hồng', value: currency.format(sum('statements', 'commission')) },
        { title: 'Thực trả trên sao kê', value: currency.format(sum('statements', 'net_payable')) },
      ];
    case 'subscriptions':
      return [
        {
          title: 'Gói PRO đã lưu',
          value: count('subscriptions', 'plan', 'PRO'),
          description: 'Plan lưu trong DB, chưa suy ra effectivePlan',
        },
        { title: 'Gói TRIAL đã lưu', value: count('subscriptions', 'plan', 'TRIAL') },
        { title: 'Thuê bao ACTIVE', value: count('subscriptions', 'status', 'ACTIVE') },
        {
          title: 'Hóa đơn PAID',
          value: currency.format(sum('invoices', 'amount', 'PAID')),
          description: 'Số tiền hóa đơn đã lưu, không phải MRR',
        },
      ];
    case 'settings':
      return [
        { title: 'Cấu hình cửa hàng', value: count('settings') },
        { title: 'Nhật ký thao tác', value: count('audit') },
        { title: 'Thông báo', value: count('notifications') },
        { title: 'Hoạt động AI', value: count('aiLogs') },
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
// 5. BÁO CÁO LỊCH SỬ BÁN HÀNG
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
// 6. CẤU HÌNH QUAN HỆ GIỠA CÁC BẢNG DỮ LIỆU
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
// 7. COMPONENT SNAPSHOT PAGE
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
    <Stack spacing={3} data-snapshot-module={module}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}
      >
        <Box>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 750 }}>
            {definition.title}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={reload} disabled={loading}>
          Tải lại dữ liệu
        </Button>
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
      {data && (
        <Grid container spacing={2}>
          {metrics.map((metric) => (
            <Grid key={metric.title} size={{ xs: 12, sm: 6, xl: 3 }}>
              <AdminStatCard
                {...metric}
                description={metric.description || 'Toàn bộ dữ liệu'}
                status="ready"
              />
            </Grid>
          ))}
        </Grid>
      )}
      <Card variant="outlined">
        <Tabs
          value={tab}
          variant="scrollable"
          scrollButtons="auto"
          onChange={(_, value: string) => changeTab(value)}
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
      </Card>
      {tab === 'live' ? (
        liveContent
      ) : (
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ flexWrap: 'wrap', rowGap: 2 }}
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
                      label: tab === 'complaints' ? 'Xử lý khiếu nại' : 'Chỉnh sửa',
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
          {module === 'overview' && data && <SalesHistory data={data} />}
        </Stack>
      )}
      <AdminDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? collections[selected.key].title : 'Chi tiết'}
        size="lg"
        footer={
          <Stack direction="row" spacing={1}>
            {selected && canEditRecord(selected.key, selected.row) && (
              <Button variant="contained" onClick={() => edit(selected.key, selected.row)}>
                {selected.key === 'complaints' ? 'Xử lý khiếu nại' : 'Chỉnh sửa'}
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
            {deleting?.key === 'quotas'
              ? 'Xóa cấu hình ghi đè này để hệ thống dùng lại hạn mức mặc định.'
              : deleting?.key === 'users'
                ? 'Tài khoản sẽ bị khóa và các phiên đăng nhập sẽ bị thu hồi. Lịch sử hoạt động được giữ lại.'
                : deleting?.key === 'stores'
                  ? 'Cửa hàng sẽ tạm ngưng nhận đơn mới. Các đơn và lịch sử đã có được giữ lại.'
                  : 'Đánh giá sẽ được ẩn khỏi hiển thị công khai. Nội dung được giữ để đối chiếu.'}
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={deleteBusy} onClick={() => setDeleting(null)}>
            Đóng
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteBusy}
            onClick={() => {
              void confirmDelete();
            }}
          >
            {deleteCommitted ? 'Tải lại dữ liệu' : deleteBusy ? 'Đang xử lý…' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
