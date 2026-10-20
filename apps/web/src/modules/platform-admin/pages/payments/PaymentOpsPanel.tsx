import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
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

import { adminApi, AdminApiError } from '../../api/admin-api.client';

const money = (value: number) => `${value.toLocaleString('vi-VN')}đ`;
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');

interface PaymentProof {
  orderId: string;
  orderCode: string;
  amount: number;
  transferMessage: string;
  proofUrl: string;
  uploadedAt: string | null;
  holdExpiresAt: string | null;
}

interface RefundPayout {
  id: string;
  orderCode: string | null;
  amount: number;
  createdAt: string;
  destination: {
    bankBin?: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
  } | null;
}

type Dialogs =
  { kind: 'reject'; proof: PaymentProof } | { kind: 'paid'; payout: RefundPayout } | null;

const errorText = (e: unknown) =>
  e instanceof AdminApiError ? e.message : 'Không thực hiện được, vui lòng thử lại.';

/**
 * Hai việc cần người của nền tảng làm tay: đối chiếu biên lai chuyển khoản của khách (KX02)
 * và chuyển khoản hoàn tiền khiếu nại cho khách. Số liệu lấy trực tiếp từ backend.
 */
export function PaymentOpsPanel({ section }: { section: 'proofs' | 'payouts' }) {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [payouts, setPayouts] = useState<RefundPayout[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      if (section === 'proofs')
        setProofs(await adminApi.get<PaymentProof[]>('/admin/payment-proofs'));
      else setPayouts(await adminApi.get<RefundPayout[]>('/admin/refund-payouts'));
    } catch (e) {
      setError(errorText(e));
    }
  }, [section]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setNotice(done);
      setDialog(null);
      setText('');
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmProof = (p: PaymentProof) =>
    run(
      () => adminApi.post(`/admin/orders/${p.orderId}/payment-proof/confirm`, {}),
      `Đã xác nhận thanh toán đơn ${p.orderCode}.`,
    );

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {section === 'proofs'
            ? 'Biên lai chuyển khoản chờ đối chiếu'
            : 'Hoàn tiền chờ chuyển khoản'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {section === 'proofs'
            ? 'Đối chiếu số tiền và nội dung chuyển khoản với sao kê ngân hàng trước khi xác nhận. Xác nhận chạy đúng luồng thanh toán thật: kiểm tra hạn giữ suất, hoàn tiền nếu đã trễ, và kích hoạt vé nhận hàng.'
            : 'Chuyển khoản đúng số tiền tới tài khoản của khách rồi nhập mã giao dịch ngân hàng. Số tài khoản đầy đủ chỉ hiển thị ở màn này.'}
        </Typography>
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
          {section === 'proofs' ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Đơn</TableCell>
                  <TableCell>Số tiền</TableCell>
                  <TableCell>Nội dung chuyển khoản</TableCell>
                  <TableCell>Gửi lúc</TableCell>
                  <TableCell>Biên lai</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proofs.map((p) => (
                  <TableRow key={p.orderId}>
                    <TableCell>{p.orderCode}</TableCell>
                    <TableCell>{money(p.amount)}</TableCell>
                    <TableCell>{p.transferMessage}</TableCell>
                    <TableCell>{when(p.uploadedAt)}</TableCell>
                    <TableCell>
                      <Link href={p.proofUrl} target="_blank" rel="noopener noreferrer">
                        Xem ảnh
                      </Link>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          onClick={() => setDialog({ kind: 'reject', proof: p })}
                          disabled={busy}
                        >
                          Từ chối
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => void confirmProof(p)}
                          disabled={busy}
                        >
                          Đã nhận tiền
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {proofs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>Không có biên lai nào đang chờ.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Đơn</TableCell>
                  <TableCell>Số tiền hoàn</TableCell>
                  <TableCell>Tài khoản nhận</TableCell>
                  <TableCell>Tạo lúc</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.orderCode ?? '—'}</TableCell>
                    <TableCell>{money(p.amount)}</TableCell>
                    <TableCell>
                      {p.destination ? (
                        <Box>
                          <Typography variant="body2">{p.destination.bankName}</Typography>
                          <Typography variant="body2">{p.destination.accountNumber}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {p.destination.accountHolder}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="warning.main">
                          Khách chưa khai báo tài khoản nhận hoàn
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{when(p.createdAt)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy || !p.destination}
                        onClick={() => setDialog({ kind: 'paid', payout: p })}
                      >
                        Đã chuyển khoản
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {payouts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>Không có lệnh hoàn tiền nào đang chờ.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </CardContent>

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {dialog?.kind === 'reject'
            ? `Từ chối biên lai đơn ${dialog.proof.orderCode}`
            : 'Ghi nhận đã chuyển khoản hoàn tiền'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={
              dialog?.kind === 'reject'
                ? 'Lý do (khách sẽ phải gửi lại biên lai)'
                : 'Mã giao dịch ngân hàng'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            slotProps={{ htmlInput: { maxLength: dialog?.kind === 'reject' ? 255 : 100 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={busy || text.trim().length < (dialog?.kind === 'reject' ? 3 : 4)}
            onClick={() => {
              if (dialog?.kind === 'reject') {
                const { proof } = dialog;
                void run(
                  () =>
                    adminApi.post(`/admin/orders/${proof.orderId}/payment-proof/reject`, {
                      reason: text.trim(),
                    }),
                  `Đã từ chối biên lai đơn ${proof.orderCode}.`,
                );
              } else if (dialog?.kind === 'paid') {
                const { payout } = dialog;
                void run(
                  () =>
                    adminApi.post(`/admin/refund-payouts/${payout.id}/paid`, {
                      reference: text.trim(),
                    }),
                  'Đã ghi nhận chuyển khoản hoàn tiền.',
                );
              }
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
