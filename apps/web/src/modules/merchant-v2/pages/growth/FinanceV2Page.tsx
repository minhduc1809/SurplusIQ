import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Banknote, Clock, Landmark, Percent, Receipt, Undo2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { FilterChips } from '../../components/FilterChips';
import { StatCard } from '../../components/StatCard';
import { useStoreData } from '../../lib/useStoreData';
import { daysAgo, localDate, vnd } from '../../lib/format';

interface Finance {
  summary: {
    grossSales: number;
    commissionRate: number;
    commissionAmount: number;
    refundsDeduction: number;
    netPayout: number;
    pendingPaidAmount: number;
    soldOrders: number;
    averageOrderValue: number;
  };
  daily: { date: string; grossSales: number; orders: number }[];
  explanation: string;
}

interface Statement {
  id: string;
  weekStart: string;
  weekEnd: string;
  gross: number;
  commission: number;
  refunds: number;
  netPayable: number;
  status: string;
}

const RANGES = [
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: '90', label: '90 ngày' },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/** Tải tệp có kèm token (đường dẫn tải về cần đăng nhập nên không mở thẳng bằng liên kết). */
async function download(path: string, filename: string) {
  const token = localStorage.getItem('sq_store_token');
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Không tải được tệp. Vui lòng thử lại.');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Thống kê tài chính của cửa hàng: doanh thu, hoa hồng, hoàn tiền, thực nhận ước tính và sao kê tuần. */
export function FinanceV2Page() {
  const [range, setRange] = useState('7');
  const [err, setErr] = useState<string | null>(null);
  const finance = useStoreData<Finance>(
    `/store/reports/finance?startDate=${daysAgo(Number(range) - 1)}&endDate=${localDate()}`,
  );
  const statements = useStoreData<Statement[]>('/store/statements');
  const s = finance.data?.summary;
  const daily = finance.data?.daily ?? [];
  const maxDay = Math.max(1, ...daily.map((d) => d.grossSales));

  const save = (path: string, name: string) =>
    download(path, name).catch((e: Error) => setErr(e.message));

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Tài chính"
        subtitle="Doanh thu, hoa hồng nền tảng, hoàn tiền và số tiền thực nhận"
      />
      <FilterChips options={RANGES} value={range} onChange={setRange} />
      {err && (
        <Alert severity="error" onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      <DataState
        loading={finance.loading}
        error={finance.error}
        empty={!s}
        onRetry={finance.reload}
      >
        {s && finance.data && (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
                gap: 2.5,
              }}
            >
              <StatCard
                label="Doanh thu gộp"
                value={vnd(s.grossSales)}
                sub={`${s.soldOrders} đơn đã tính`}
                icon={<Banknote size={22} />}
                color="primary"
              />
              <StatCard
                label="Hoa hồng nền tảng"
                value={vnd(s.commissionAmount)}
                sub={`${Math.round(s.commissionRate * 100)}% doanh thu gộp`}
                icon={<Percent size={22} />}
                color="warning"
              />
              <StatCard
                label="Hoàn tiền khiếu nại"
                value={vnd(s.refundsDeduction)}
                icon={<Undo2 size={22} />}
                color="error"
              />
              <StatCard
                label="Thực nhận ước tính"
                value={vnd(s.netPayout)}
                sub="Doanh thu gộp trừ hoa hồng và hoàn tiền"
                icon={<Landmark size={22} />}
                color="success"
              />
              <StatCard
                label="Đã thu, chờ nhận hàng"
                value={vnd(s.pendingPaidAmount)}
                sub="Tính vào doanh thu khi khách nhận hàng"
                icon={<Clock size={22} />}
                color="info"
              />
              <StatCard
                label="Giá trị trung bình mỗi đơn"
                value={vnd(s.averageOrderValue)}
                icon={<Receipt size={22} />}
                color="primary"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {finance.data.explanation}
            </Typography>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Doanh thu theo ngày
              </Typography>
              {daily.length === 0 ? (
                <Typography color="text.secondary">Chưa có đơn trong khoảng này.</Typography>
              ) : (
                <Stack spacing={1}>
                  {daily.map((d) => (
                    <Box
                      key={d.date}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 120px',
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2">
                        {d.date.slice(5).split('-').reverse().join('/')}
                      </Typography>
                      <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, height: 14 }}>
                        <Box
                          sx={{
                            width: `${(d.grossSales / maxDay) * 100}%`,
                            height: '100%',
                            borderRadius: 1,
                            bgcolor: 'primary.main',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {vnd(d.grossSales)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Card>
          </>
        )}
      </DataState>

      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Sao kê tuần</Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => void save('/store/export/accounting', `ke-toan-${localDate()}.csv`)}
        >
          Xuất CSV kế toán
        </Button>
      </Stack>
      <DataState
        loading={statements.loading}
        error={statements.error}
        empty={(statements.data ?? []).length === 0}
        emptyText="Chưa có sao kê tuần nào được chốt"
        onRetry={statements.reload}
      >
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tuần</TableCell>
                <TableCell align="right">Doanh thu gộp</TableCell>
                <TableCell align="right">Hoa hồng</TableCell>
                <TableCell align="right">Hoàn tiền</TableCell>
                <TableCell align="right">Thực nhận</TableCell>
                <TableCell>Tải về</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(statements.data ?? []).map((st) => (
                <TableRow key={st.id} hover>
                  <TableCell>
                    {st.weekStart} – {st.weekEnd}
                  </TableCell>
                  <TableCell align="right">{vnd(st.gross)}</TableCell>
                  <TableCell align="right">{vnd(st.commission)}</TableCell>
                  <TableCell align="right">{vnd(st.refunds)}</TableCell>
                  <TableCell align="right">{vnd(st.netPayable)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() =>
                        void save(`/store/statements/${st.id}/csv`, `sao-ke-${st.weekStart}.csv`)
                      }
                    >
                      CSV
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        void save(`/store/statements/${st.id}/pdf`, `sao-ke-${st.weekStart}.pdf`)
                      }
                    >
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}
