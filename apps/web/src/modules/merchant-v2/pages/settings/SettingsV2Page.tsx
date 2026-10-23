import { useState } from 'react';
import { Alert, Box, Button, Card, Divider, Stack, Tab, Tabs, Typography } from '@mui/material';
import { StoreLegalKYCPanel } from './StoreLegalKYCPanel';
import { api } from '../../../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { DataState } from '../../components/DataState';
import { useStoreData } from '../../lib/useStoreData';

interface Profile {
  store: {
    name: string;
    address: string;
    phone: string | null;
    ratingAvg: string;
    ratingCount: number;
    status: string;
  };
  settings: {
    defaultPickupStart: string;
    defaultPickupEnd: string;
    floorRatio: string;
    lateGraceMinutes: number;
    maxQtyPerOrder: number;
  };
  isPausedToday: boolean;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 1.25, gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

const hhmm = (t: string) => t.slice(0, 5);

export function SettingsV2Page({ defaultTab = 0 }: { defaultTab?: number }) {
  const isLegalUrl =
    typeof window !== 'undefined' &&
    (window.location.pathname.includes('/legal') || window.location.search.includes('tab=legal'));
  const [tab, setTab] = useState(isLegalUrl ? 1 : defaultTab);
  const { data, loading, error, reload } = useStoreData<Profile>('/store/profile');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const togglePause = async () => {
    if (!data) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.post(data.isPausedToday ? '/store/resume-today' : '/store/pause-today', {});
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Stack spacing={3}>
      <PageHeader title="Cài đặt cửa hàng" />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Vận hành cửa hàng" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab
            label="Hồ sơ pháp lý & Hợp đồng KYC"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>
      </Box>

      {tab === 1 ? (
        <StoreLegalKYCPanel />
      ) : (
        <DataState loading={loading} error={error} empty={!data} onRetry={reload}>
          {data && (
            <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Thông tin cửa hàng
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Row label="Tên" value={data.store.name} />
                <Row label="Địa chỉ" value={data.store.address} />
                <Row label="Điện thoại" value={data.store.phone ?? '—'} />
                <Row
                  label="Đánh giá"
                  value={`${data.store.ratingAvg} ★ (${data.store.ratingCount})`}
                />
              </Card>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Quy tắc bán hàng
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Row
                  label="Khung nhận mặc định"
                  value={`${hhmm(data.settings.defaultPickupStart)} – ${hhmm(data.settings.defaultPickupEnd)}`}
                />
                <Row
                  label="Giá sàn"
                  value={`${Math.round(Number(data.settings.floorRatio) * 100)}% giá gốc`}
                />
                <Row label="Ân hạn trễ giờ" value={`${data.settings.lateGraceMinutes} phút`} />
                <Row label="Tối đa mỗi đơn" value={`${data.settings.maxQtyPerOrder} suất`} />
              </Card>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Tạm nghỉ hôm nay
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
                  {data.isPausedToday
                    ? 'Cửa hàng đang tạm nghỉ, khách không thể đặt suất mới.'
                    : 'Tạm ngừng nhận đơn mới trong ngày khi có việc đột xuất.'}
                </Typography>
                {actionError && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {actionError}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  color={data.isPausedToday ? 'primary' : 'warning'}
                  onClick={togglePause}
                  disabled={busy}
                >
                  {data.isPausedToday ? 'Mở bán lại' : 'Tạm nghỉ hôm nay'}
                </Button>
              </Card>
            </Stack>
          )}
        </DataState>
      )}
    </Stack>
  );
}

export default SettingsV2Page;
