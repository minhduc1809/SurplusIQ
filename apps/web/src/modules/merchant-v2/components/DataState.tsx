import type { ReactNode } from 'react';
import { Alert, Box, Button, Card, CircularProgress, Typography } from '@mui/material';
import { Inbox } from 'lucide-react';

interface Props {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  emptyText?: string;
  onRetry: () => void;
  children: ReactNode;
}

/** Một chỗ xử lý đủ 3 trạng thái tải/lỗi/trống để mọi trang dùng chung. */
export function DataState({
  loading,
  error,
  empty,
  emptyText = 'Chưa có dữ liệu',
  onRetry,
  children,
}: Props) {
  if (loading)
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" onClick={onRetry}>
            Thử lại
          </Button>
        }
      >
        {error}
      </Alert>
    );
  if (empty) {
    return (
      <Card>
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Inbox size={40} style={{ opacity: 0.25 }} />
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            {emptyText}
          </Typography>
        </Box>
      </Card>
    );
  }
  return <>{children}</>;
}
