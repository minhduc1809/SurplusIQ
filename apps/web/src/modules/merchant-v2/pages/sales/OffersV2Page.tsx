import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Plus, RefreshCw, SlidersHorizontal, XCircle, Ban } from 'lucide-react';
import { api } from '../../../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { FilterChips } from '../../components/FilterChips';
import { useStoreData } from '../../lib/useStoreData';
import { hm, localDate, localInputToIso, vnd } from '../../lib/format';
import { OFFER_STATUS, statusOf } from '../../lib/status';

interface OfferRow {
  id: string;
  itemId: string | null;
  totalQuantity: number;
  remainingQuantity: number;
  soldQuantity: number;
  originalPrice: number;
  currentPrice: number;
  pickupStart: string;
  pickupEnd: string;
  status: string;
}
interface ItemRow {
  id: string;
  name: string;
  originalPrice: number;
}
interface Page<T> {
  data: T[];
  total: number;
}

type ReasonKind = 'adjust' | 'close' | 'cancel';
type Action = { kind: ReasonKind; offer: OfferRow } | { kind: 'create' } | null;

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'SOLD_OUT', label: 'Đã hết' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];
const REASONS: Record<ReasonKind, string[]> = {
  adjust: ['Làm thêm', 'Hỏng', 'Bán tại quầy', 'Khác'],
  close: ['Hết nguyên liệu', 'Đóng cửa', 'Khác'],
  cancel: ['Sự cố quán', 'Sự cố chất lượng', 'Bất khả kháng', 'Khác'],
};
const TITLES: Record<ReasonKind, string> = {
  adjust: 'Điều chỉnh tồn kho',
  close: 'Đóng suất sớm',
  cancel: 'Hủy suất và hoàn tiền',
};

export function OffersV2Page() {
  const [filter, setFilter] = useState('');
  const [action, setAction] = useState<Action>(null);
  const date = localDate();
  const offers = useStoreData<Page<OfferRow>>(
    `/store/offers?date=${date}${filter ? `&status=${filter}` : ''}`,
  );
  const items = useStoreData<Page<ItemRow>>('/store/items?limit=100');
  const itemName = useMemo(
    () => new Map((items.data?.data ?? []).map((i) => [i.id, i.name])),
    [items.data],
  );
  const rows = offers.data?.data ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Suất & tồn kho"
        subtitle={`${offers.data?.total ?? 0} suất hôm nay`}
        actions={
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshCw size={14} />}
              onClick={offers.reload}
            >
              Làm mới
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Plus size={14} />}
              onClick={() => setAction({ kind: 'create' })}
            >
              Tạo suất
            </Button>
          </>
        }
      />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <DataState
        loading={offers.loading}
        error={offers.error}
        empty={rows.length === 0}
        onRetry={offers.reload}
        emptyText="Chưa có suất nào hôm nay. Tạo suất để bắt đầu bán."
      >
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Món</TableCell>
                <TableCell>Khung nhận</TableCell>
                <TableCell align="right">Giá</TableCell>
                <TableCell align="center">Còn / Tổng</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell
                  align="right"
                  sx={{
                    position: 'sticky',
                    right: 0,
                    bgcolor: 'background.paper',
                    zIndex: 1,
                    boxShadow: { xs: '-6px 0 8px -6px rgba(0,0,0,0.15)', sm: 'none' },
                  }}
                >
                  Thao tác
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((o) => {
                const s = statusOf(OFFER_STATUS, o.status);
                const live = o.status === 'OPEN' || o.status === 'SOLD_OUT';
                return (
                  <TableRow key={o.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(o.itemId && itemName.get(o.itemId)) || 'Túi bất ngờ'}
                      </Typography>
                    </TableCell>
                    <TableCell className="mv2-tabular">
                      {hm(o.pickupStart)} – {hm(o.pickupEnd)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color="primary.main"
                        className="mv2-tabular"
                        sx={{ fontWeight: 700 }}
                      >
                        {vnd(o.currentPrice)}
                      </Typography>
                      {o.originalPrice !== o.currentPrice && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          sx={{ textDecoration: 'line-through' }}
                        >
                          {vnd(o.originalPrice)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center" className="mv2-tabular">
                      {o.remainingQuantity}/{o.totalQuantity}
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
                    <TableCell
                      align="right"
                      sx={{
                        position: 'sticky',
                        right: 0,
                        bgcolor: 'background.paper',
                        zIndex: 1,
                        boxShadow: { xs: '-6px 0 8px -6px rgba(0,0,0,0.15)', sm: 'none' },
                      }}
                    >
                      {live && (
                        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                          <Tooltip title="Điều chỉnh tồn kho">
                            <IconButton
                              size="small"
                              onClick={() => setAction({ kind: 'adjust', offer: o })}
                            >
                              <SlidersHorizontal size={15} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Đóng suất sớm">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setAction({ kind: 'close', offer: o })}
                            >
                              <XCircle size={15} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hủy và hoàn tiền">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setAction({ kind: 'cancel', offer: o })}
                            >
                              <Ban size={15} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DataState>

      {action?.kind === 'create' && (
        <CreateOfferDialog
          items={items.data?.data ?? []}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            offers.reload();
          }}
        />
      )}
      {action && action.kind !== 'create' && (
        <ReasonDialog
          kind={action.kind}
          offer={action.offer}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            offers.reload();
          }}
        />
      )}
    </Stack>
  );
}

function ReasonDialog({
  kind,
  offer,
  onClose,
  onDone,
}: {
  kind: ReasonKind;
  offer: OfferRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState(REASONS[kind][0]);
  const [note, setNote] = useState('');
  const [delta, setDelta] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body =
        kind === 'adjust'
          ? { deltaQuantity: Number(delta), reason, note: note || undefined }
          : { reason, note: note || undefined };
      await api.post(
        `/store/offers/${offer.id}/${kind === 'adjust' ? 'adjust-stock' : kind}`,
        body,
      );
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{TITLES[kind]}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {kind === 'cancel' && (
            <Alert severity="warning">
              Các đơn đã đặt sẽ được hoàn tiền 100%. Không thể hoàn tác.
            </Alert>
          )}
          {kind === 'adjust' && (
            <TextField
              label="Số lượng thay đổi (âm để giảm)"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              helperText={`Hiện còn ${offer.remainingQuantity} suất`}
            />
          )}
          <TextField
            select
            label="Lý do"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS[kind].map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Ghi chú (không bắt buộc)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 255 } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Đóng
        </Button>
        <Button
          variant="contained"
          color={kind === 'cancel' ? 'error' : 'primary'}
          onClick={submit}
          disabled={busy || (kind === 'adjust' && !Number(delta))}
        >
          Xác nhận
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CreateOfferDialog({
  items,
  onClose,
  onDone,
}: {
  items: ItemRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const today = localDate();
  const [itemId, setItemId] = useState(items[0]?.id ?? '');
  const item = items.find((i) => i.id === itemId);
  const [qty, setQty] = useState('5');
  const [price, setPrice] = useState('');
  const [start, setStart] = useState(`${today}T19:00`);
  const [end, setEnd] = useState(`${today}T21:00`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(
        '/store/offers',
        {
          itemId,
          totalQuantity: Number(qty),
          originalPrice: item.originalPrice,
          currentPrice: Number(price),
          pickupStart: localInputToIso(start),
          pickupEnd: localInputToIso(end),
        },
        true,
      );
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Tạo suất bán</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {items.length === 0 && (
            <Alert severity="info">Cần có món trong danh mục trước khi tạo suất.</Alert>
          )}
          <TextField select label="Món" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((i) => (
              <MenuItem key={i.id} value={i.id}>
                {i.name} · {vnd(i.originalPrice)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Số suất"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <TextField
            label="Giá bán (bội số 500đ)"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            helperText={item ? `Giá gốc ${vnd(item.originalPrice)}` : undefined}
          />
          <TextField
            label="Bắt đầu nhận"
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Kết thúc nhận"
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Đóng
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={busy || !item || !Number(price) || !Number(qty)}
        >
          Tạo suất
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default OffersV2Page;
