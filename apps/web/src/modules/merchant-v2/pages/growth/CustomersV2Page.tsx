import { useState } from 'react';
import { Card, Chip, Stack, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { FilterChips } from '../../components/FilterChips';
import { useStoreData } from '../../lib/useStoreData';
import { dayMonthTime } from '../../lib/format';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  storeReply: string | null;
  createdAt: string;
}
interface Complaint {
  id: string;
  category: string;
  description: string;
  status: string;
  responseDueAt: string;
  createdAt: string;
}

const COMPLAINT_STATUS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  ACCEPTED: 'Đã tiếp nhận',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Đã từ chối',
  EXTENDED: 'Gia hạn',
};

export function CustomersV2Page() {
  const [tab, setTab] = useState('reviews');
  const reviews = useStoreData<Review[]>(tab === 'reviews' ? '/store/reviews' : null);
  const complaints = useStoreData<Complaint[]>(tab === 'complaints' ? '/store/complaints' : null);
  const cur = tab === 'reviews' ? reviews : complaints;
  const list = (tab === 'reviews' ? reviews.data : complaints.data) ?? [];

  return (
    <Stack spacing={3}>
      <PageHeader title="Khách hàng" subtitle="Đánh giá và khiếu nại từ khách đã mua" />
      <FilterChips
        options={[
          { value: 'reviews', label: 'Đánh giá' },
          { value: 'complaints', label: 'Khiếu nại' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <DataState
        loading={cur.loading}
        error={cur.error}
        empty={list.length === 0}
        onRetry={cur.reload}
        emptyText={tab === 'reviews' ? 'Chưa có đánh giá nào' : 'Chưa có khiếu nại nào'}
      >
        <Stack spacing={1.5}>
          {tab === 'reviews' &&
            (reviews.data ?? []).map((r) => (
              <Card key={r.id} sx={{ p: 2 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography sx={{ fontWeight: 700 }}>
                    {'★'.repeat(r.rating)}
                    <span style={{ opacity: 0.3 }}>{'★'.repeat(5 - r.rating)}</span>
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {dayMonthTime(r.createdAt)}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {r.comment || 'Không có nhận xét'}
                </Typography>
                {r.storeReply && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1, pl: 1.5, borderLeft: 2, borderColor: 'divider' }}
                  >
                    Cửa hàng: {r.storeReply}
                  </Typography>
                )}
              </Card>
            ))}
          {tab === 'complaints' &&
            (complaints.data ?? []).map((c) => (
              <Card key={c.id} sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography sx={{ fontWeight: 700 }}>{c.category}</Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={COMPLAINT_STATUS[c.status] ?? c.status}
                    color={c.status === 'RESOLVED' ? 'success' : 'warning'}
                  />
                </Stack>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {c.description}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Hạn phản hồi: {dayMonthTime(c.responseDueAt)}
                </Typography>
              </Card>
            ))}
        </Stack>
      </DataState>
    </Stack>
  );
}

export default CustomersV2Page;
