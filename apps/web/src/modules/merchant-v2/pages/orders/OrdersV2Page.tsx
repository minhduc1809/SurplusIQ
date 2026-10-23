import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { QrCode, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { FilterChips } from '../../components/FilterChips';
import { useStoreData } from '../../lib/useStoreData';
import { dayMonthTime, vnd } from '../../lib/format';
import { ORDER_STATUS, statusOf } from '../../lib/status';
import { MERCHANT_V2_ROUTES } from '../../config/merchant-navigation';

interface OrderRow {
  id: string;
  code: string;
  quantity: number;
  totalAmount: number;
  status: string;
  pickupSlot: string | null;
  createdAt: string;
  arrivingNotifiedAt: string | null;
}
interface Page {
  data: OrderRow[];
  total: number;
}

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PAID', label: 'Chờ nhận' },
  { value: 'PICKED_UP', label: 'Đã nhận' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'PICKUP_EXPIRED', label: 'Không đến nhận' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
];

export function OrdersV2Page({ onNavigate }: { onNavigate?: (href: string) => void }) {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useStoreData<Page>(
    `/store/orders?limit=100${filter ? `&status=${filter}` : ''}`,
  );
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.data ?? []).filter((r) => !q || r.code.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Đơn hàng"
        subtitle={`${data?.total ?? 0} đơn`}
        actions={
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshCw size={14} />}
              onClick={reload}
            >
              Làm mới
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<QrCode size={14} />}
              onClick={() => onNavigate?.(MERCHANT_V2_ROUTES.pickupVerify)}
            >
              Xác nhận nhận hàng
            </Button>
          </>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'center' } }}>
        <TextField
          size="small"
          placeholder="Tìm mã đơn…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 240 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </Stack>
      <DataState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        onRetry={reload}
        emptyText="Không có đơn hàng phù hợp"
      >
        <TableContainer component={Card}>
          <Table className="sq-table">
            <TableHead>
              <TableRow>
                <TableCell>Mã đơn</TableCell>
                <TableCell align="center">SL</TableCell>
                <TableCell align="right">Tổng tiền</TableCell>
                <TableCell>Khung nhận</TableCell>
                <TableCell>Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const s = statusOf(ORDER_STATUS, r.status);
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="primary.main"
                        className="mv2-tabular"
                        sx={{ fontWeight: 600 }}
                      >
                        #{r.code}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {dayMonthTime(r.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{r.quantity}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" className="mv2-tabular" sx={{ fontWeight: 700 }}>
                        {vnd(r.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.pickupSlot ?? '—'}
                      {r.arrivingNotifiedAt && r.status === 'PAID' && (
                        <Chip size="small" color="info" label="Đang tới" sx={{ ml: 1 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.label}
                        color={s.color}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>
    </Stack>
  );
}

export default OrdersV2Page;
