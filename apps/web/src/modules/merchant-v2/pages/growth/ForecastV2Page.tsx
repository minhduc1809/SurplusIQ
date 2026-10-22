import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Chip,
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
import { api } from '../../../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { useStoreData } from '../../lib/useStoreData';

interface Forecast {
  id: string;
  targetDate: string;
  recommended: number;
  low: number;
  high: number;
  chosenQuantity: number | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation?: string;
  warning?: string | null;
  item: { id: string; name: string };
}

const CONF = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' } as const;

/** Dự báo số suất nên chuẩn bị cho ngày mai (gói Pro). Chủ/quản lý có thể điều chỉnh số lượng. */
export function ForecastV2Page() {
  const { data, loading, error, reload } = useStoreData<Forecast[]>('/store/forecast');
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (f: Forecast) => {
    const qty = Number(edit[f.id]);
    if (!Number.isInteger(qty) || qty < 1) {
      setMsg({ ok: false, text: 'Số lượng điều chỉnh phải là số nguyên từ 1 trở lên.' });
      return;
    }
    try {
      await api.post(`/store/forecast/${f.id}/override`, {
        chosenQuantity: qty,
        reason: 'Điều chỉnh trên web',
      });
      setMsg({ ok: true, text: `Đã lưu số lượng ${qty} cho ${f.item.name}.` });
      setEdit((e) => ({ ...e, [f.id]: '' }));
      reload();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  const rows = data ?? [];
  return (
    <Stack spacing={3}>
      <PageHeader
        title="Dự báo & giá Pro"
        subtitle="Số suất nên chuẩn bị cho ngày mai, tính từ lịch sử bán"
      />
      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}
      <DataState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText="Chưa có món nào để dự báo"
        onRetry={reload}
      >
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Món</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell>Gợi ý (khoảng)</TableCell>
                <TableCell>Độ tin cậy</TableCell>
                <TableCell>Đã chọn</TableCell>
                <TableCell>Điều chỉnh</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {f.item.name}
                    </Typography>
                    {f.warning && (
                      <Typography variant="caption" color="warning.main">
                        {f.warning}
                      </Typography>
                    )}
                    {f.explanation && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {f.explanation}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{f.targetDate}</TableCell>
                  <TableCell>
                    {f.recommended} ({f.low}–{f.high})
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={CONF[f.confidence] ?? f.confidence} />
                  </TableCell>
                  <TableCell>{f.chosenQuantity ?? '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        type="number"
                        sx={{ width: 90 }}
                        value={edit[f.id] ?? ''}
                        onChange={(e) => setEdit((s) => ({ ...s, [f.id]: e.target.value }))}
                      />
                      <Button size="small" variant="outlined" onClick={() => void save(f)}>
                        Lưu
                      </Button>
                    </Stack>
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
