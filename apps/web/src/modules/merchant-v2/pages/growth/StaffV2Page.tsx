import {
  Card,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { useStoreData } from '../../lib/useStoreData';
import { dayMonthTime } from '../../lib/format';

interface Member {
  id: string;
  permission: string;
  status: string;
  lastActiveAt: string | null;
  user: { fullName: string; email: string; phone: string | null };
}
interface Staff {
  members: Member[];
  pendingInvites: { id: string; email?: string; permission?: string }[];
}

const ROLE: Record<string, string> = {
  OWNER: 'Chủ cửa hàng',
  MANAGER: 'Quản lý',
  COUNTER: 'Thu ngân',
};

export function StaffV2Page() {
  const { data, loading, error, reload } = useStoreData<Staff>('/store/staff');
  const members = data?.members ?? [];
  return (
    <Stack spacing={3}>
      <PageHeader
        title="Nhân viên"
        subtitle={`${members.length} thành viên · ${data?.pendingInvites.length ?? 0} lời mời đang chờ`}
      />
      <DataState loading={loading} error={error} empty={members.length === 0} onRetry={reload}>
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Họ tên</TableCell>
                <TableCell>Vai trò</TableCell>
                <TableCell>Hoạt động gần nhất</TableCell>
                <TableCell>Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {m.user.fullName}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {m.user.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{ROLE[m.permission] ?? m.permission}</TableCell>
                  <TableCell>{m.lastActiveAt ? dayMonthTime(m.lastActiveAt) : '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      color={m.status === 'ACTIVE' ? 'success' : 'default'}
                      label={m.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
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

export default StaffV2Page;
