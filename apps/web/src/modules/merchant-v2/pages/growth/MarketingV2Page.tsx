import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Chip,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { useStoreData } from '../../lib/useStoreData';
import { vnd } from '../../lib/format';

interface Promotion {
  id: string;
  name: string;
  type: string;
  value: number;
  maxUses: number | null;
  usedCount: number;
  startAt: string;
  endAt: string;
  minOrderAmount: number | null;
  status: string;
  fundedBy: string;
  analytics?: {
    usedOrdersCount: number;
    grossRevenueGenerated: number;
    totalDiscountGiven: number;
  };
}

const day = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
const valueText = (p: Promotion) => (p.type === 'PERCENT' ? `${p.value}%` : vnd(p.value));

export function MarketingV2Page() {
  const { data, loading, error, reload } = useStoreData<Promotion[]>('/store/marketing/promotions');
  const [actionError, setActionError] = useState<string | null>(null);

  const toggle = async (p: Promotion) => {
    setActionError(null);
    try {
      await api.patch(`/store/marketing/promotions/${p.id}/status`, {
        status: p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
      });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  const rows = data ?? [];
  return (
    <Stack spacing={3}>
      <PageHeader
        title="Ưu đãi & chiến dịch"
        subtitle={`${rows.length} chương trình giảm giá`}
        actions={
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshCw size={14} />}
            onClick={reload}
          >
            Làm mới
          </Button>
        }
      />
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      <DataState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        onRetry={reload}
        emptyText="Chưa có chương trình ưu đãi nào"
      >
        <TableContainer component={Card}>
          <Table className="sq-table">
            <TableHead>
              <TableRow>
                <TableCell>Chương trình</TableCell>
                <TableCell align="right">Mức giảm</TableCell>
                <TableCell>Thời gian</TableCell>
                <TableCell align="center">Đã dùng</TableCell>
                <TableCell align="right">Doanh thu mang lại</TableCell>
                <TableCell align="center">Đang chạy</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {p.name}
                    </Typography>
                    {p.fundedBy === 'PLATFORM' && (
                      <Chip size="small" color="info" label="Nền tảng tài trợ" sx={{ mt: 0.5 }} />
                    )}
                    {p.minOrderAmount ? (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                        Đơn từ {vnd(p.minOrderAmount)}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="right" className="mv2-tabular">
                    {valueText(p)}
                  </TableCell>
                  <TableCell>
                    {day(p.startAt)} – {day(p.endAt)}
                  </TableCell>
                  <TableCell align="center" className="mv2-tabular">
                    {p.usedCount}
                    {p.maxUses ? `/${p.maxUses}` : ''}
                  </TableCell>
                  <TableCell align="right" className="mv2-tabular">
                    {vnd(p.analytics?.grossRevenueGenerated)}
                  </TableCell>
                  <TableCell align="center">
                    <Switch
                      checked={p.status === 'ACTIVE'}
                      onChange={() => toggle(p)}
                      disabled={p.status !== 'ACTIVE' && p.status !== 'PAUSED'}
                      slotProps={{ input: { 'aria-label': `Bật tắt ${p.name}` } }}
                    />
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

export default MarketingV2Page;
