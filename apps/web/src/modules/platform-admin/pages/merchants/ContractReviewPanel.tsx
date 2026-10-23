import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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

import { adminApi, AdminApiError, adminTokenStorage } from '../../api/admin-api.client';

type ContractStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEED_MORE_INFO';
type Decision = Exclude<ContractStatus, 'PENDING_REVIEW'>;

interface Contract {
  id: string;
  storeId: string;
  storeName: string | null;
  legalProfile?: {
    legalName: string;
    businessType: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
    taxCode: string | null;
    businessLicenseNo: string | null;
    representativeName: string;
    representativePhone: string;
    legalAddress: string;
  } | null;
  status: ContractStatus;
  fileName: string;
  sizeBytes: number;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  'http://localhost:4000';

const STATUS: Record<
  ContractStatus,
  { label: string; color: 'warning' | 'success' | 'error' | 'info' }
> = {
  PENDING_REVIEW: { label: 'Chờ duyệt', color: 'warning' },
  APPROVED: { label: 'Đã duyệt', color: 'success' },
  REJECTED: { label: 'Từ chối', color: 'error' },
  NEED_MORE_INFO: { label: 'Cần bổ sung', color: 'info' },
};

const DECISION_LABEL: Record<Decision, string> = {
  APPROVED: 'Duyệt',
  REJECTED: 'Từ chối',
  NEED_MORE_INFO: 'Yêu cầu bổ sung',
};

const BUSINESS_TYPE = {
  INDIVIDUAL: 'Cá nhân',
  HOUSEHOLD: 'Hộ kinh doanh',
  COMPANY: 'Doanh nghiệp',
};

const errorText = (e: unknown) =>
  e instanceof AdminApiError ? e.message : 'Không thực hiện được, vui lòng thử lại.';
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');

/** Duyệt hợp đồng cửa hàng: xem tệp, duyệt, từ chối hoặc yêu cầu bổ sung (lý do bắt buộc khi không duyệt). */
export function ContractReviewPanel() {
  const [rows, setRows] = useState<Contract[]>([]);
  const [filter, setFilter] = useState<ContractStatus | ''>('PENDING_REVIEW');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<Contract | null>(null);
  const [decision, setDecision] = useState<Decision>('APPROVED');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(
        await adminApi.get<Contract[]>('/admin/store-contracts', {
          params: { status: filter || undefined },
        }),
      );
    } catch (e) {
      setError(errorText(e));
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const openFile = async (c: Contract) => {
    setError(null);
    try {
      const token = adminTokenStorage.get()?.accessToken;
      const res = await fetch(`${API_BASE_URL}/admin/store-contracts/${c.id}/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError('Không mở được tệp hợp đồng.');
    }
  };

  const submit = async () => {
    if (!target) return;
    if (decision !== 'APPROVED' && !note.trim()) {
      setError('Từ chối hoặc yêu cầu bổ sung phải nhập lý do.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.patch(`/admin/store-contracts/${target.id}/review`, {
        decision,
        note: note.trim() || undefined,
      });
      setNotice(`${DECISION_LABEL[decision]} hợp đồng "${target.fileName}" thành công.`);
      setTarget(null);
      setNote('');
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between' }}
        >
          <div>
            <Typography variant="h6">Duyệt hợp đồng cửa hàng</Typography>
            <Typography variant="body2" color="text.secondary">
              Xem tệp hợp đồng cửa hàng đã tải lên rồi duyệt, từ chối hoặc yêu cầu bổ sung.
            </Typography>
          </div>
          <TextField
            select
            size="small"
            label="Trạng thái"
            value={filter}
            onChange={(e) => setFilter(e.target.value as ContractStatus | '')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {(Object.keys(STATUS) as ContractStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS[s].label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cửa hàng</TableCell>
                <TableCell>Tệp</TableCell>
                <TableCell>Tải lên</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell>Ghi chú duyệt</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>Không có hợp đồng nào.</TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{c.storeName ?? c.storeId}</Typography>
                    {c.legalProfile ? (
                      <Typography variant="caption" color="text.secondary">
                        {c.legalProfile.legalName} · {BUSINESS_TYPE[c.legalProfile.businessType]}
                        {c.legalProfile.taxCode ? ` · MST ${c.legalProfile.taxCode}` : ''}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="error">
                        Chưa khai hồ sơ kinh doanh
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.fileName} ({Math.ceil(c.sizeBytes / 1024)} KB)
                  </TableCell>
                  <TableCell>{when(c.createdAt)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS[c.status].label}
                      color={STATUS[c.status].color}
                    />
                  </TableCell>
                  <TableCell>{c.reviewNote ?? '—'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => void openFile(c)}>
                      Xem tệp
                    </Button>
                    {c.status === 'PENDING_REVIEW' && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => {
                          setTarget(c);
                          setDecision('APPROVED');
                          setNote('');
                          setError(null);
                        }}
                      >
                        Duyệt
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>

      <Dialog open={!!target} onClose={() => setTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Duyệt hợp đồng</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {target && (
              <Alert severity={target.legalProfile ? 'info' : 'warning'} icon={false}>
                <b>{target.storeName ?? target.storeId}</b>
                {target.legalProfile ? (
                  <>
                    <br />
                    {target.legalProfile.legalName} (
                    {BUSINESS_TYPE[target.legalProfile.businessType]})
                    <br />
                    MST: {target.legalProfile.taxCode ?? '—'} · GPKD:{' '}
                    {target.legalProfile.businessLicenseNo ?? '—'}
                    <br />
                    Đại diện: {target.legalProfile.representativeName} ·{' '}
                    {target.legalProfile.representativePhone}
                    <br />
                    Địa chỉ: {target.legalProfile.legalAddress}
                  </>
                ) : (
                  <> chưa khai hồ sơ kinh doanh, nên cân nhắc yêu cầu bổ sung.</>
                )}
              </Alert>
            )}
            <TextField
              select
              label="Quyết định"
              value={decision}
              onChange={(e) => setDecision(e.target.value as Decision)}
            >
              {(Object.keys(DECISION_LABEL) as Decision[]).map((d) => (
                <MenuItem key={d} value={d}>
                  {DECISION_LABEL[d]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={decision === 'APPROVED' ? 'Ghi chú (không bắt buộc)' : 'Lý do (bắt buộc)'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={3}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)}>Hủy</Button>
          <Button variant="contained" disabled={busy} onClick={() => void submit()}>
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
