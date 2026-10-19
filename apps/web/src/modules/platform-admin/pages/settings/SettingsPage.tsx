import { useEffect, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowClockwise,
  ClockCounterClockwise,
  Eye,
  FileText,
  Gear,
  LockKey,
  MagnifyingGlass,
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { adminApi } from '../../api/admin-api.client';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

type SettingsTab = 'platform' | 'jobs' | 'audit';

type SettingFormat = 'number' | 'percent' | 'currency';

interface SettingDefinition {
  key: string;
  label: string;
  group: string;
  description: string;
  format: SettingFormat;
  unit?: string;
}

interface BackgroundJobDefinition {
  key: string;
  title: string;
  endpoint: string;
  description: string;
}

interface PlatformSettingsState {
  values: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  loadedAt: Date | null;
}

// =====================================================
// 2. CÁC THAM SỐ ĐƯỢC PHÉP HIỂN THỊ
// =====================================================

/**
 * Danh sách tham số vận hành được chọn từ:
 *
 * apps/backend/src/modules/settings/settings.constants.ts
 *
 * Chỉ định nghĩa metadata cho giao diện.
 * Không tự điền giá trị mặc định thay Backend.
 *
 * Một số cấu hình nhạy cảm như auth.*, otp.*
 * không được đưa lên trang quản trị này.
 */
const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: 'order.hold_minutes',
    label: 'Thời gian giữ suất',
    group: 'Đơn hàng',
    description: 'Thời gian giữ suất tối đa trong lúc chờ thanh toán.',
    format: 'number',
    unit: 'phút',
  },
  {
    key: 'order.max_qty_per_order',
    label: 'Số suất tối đa mỗi đơn',
    group: 'Đơn hàng',
    description: 'Giới hạn số suất trong một đơn hàng.',
    format: 'number',
    unit: 'suất',
  },
  {
    key: 'order.cancel_min_minutes_before_pickup',
    label: 'Thời hạn hủy đơn',
    group: 'Đơn hàng',
    description: 'Khoảng thời gian tối thiểu trước giờ nhận để hủy đơn.',
    format: 'number',
    unit: 'phút',
  },
  {
    key: 'pickup.late_grace_minutes',
    label: 'Gia hạn nhận hàng trễ',
    group: 'Nhận món',
    description: 'Khoảng thời gian trễ được phép khi nhận hàng.',
    format: 'number',
    unit: 'phút',
  },
  {
    key: 'pickup.reminder_minutes_before',
    label: 'Nhắc nhở trước giờ nhận',
    group: 'Nhận món',
    description: 'Thời gian gửi nhắc nhở trước giờ nhận món.',
    format: 'number',
    unit: 'phút',
  },
  {
    key: 'noshow.threshold',
    label: 'Ngưỡng vi phạm no-show',
    group: 'No-show',
    description: 'Số lần không đến nhận trước khi áp dụng xử lý.',
    format: 'number',
    unit: 'lần',
  },
  {
    key: 'noshow.window_days',
    label: 'Cửa sổ thống kê no-show',
    group: 'No-show',
    description: 'Số ngày trong cửa sổ theo dõi hành vi no-show.',
    format: 'number',
    unit: 'ngày',
  },
  {
    key: 'noshow.lock_days',
    label: 'Thời gian khóa do no-show',
    group: 'No-show',
    description: 'Số ngày khóa quyền đặt hàng khi vi phạm.',
    format: 'number',
    unit: 'ngày',
  },
  {
    key: 'price.floor_ratio_default',
    label: 'Tỷ lệ giá sàn mặc định',
    group: 'Giá & phí',
    description: 'Tỷ lệ giá sàn so với giá gốc.',
    format: 'percent',
  },
  {
    key: 'price.rounding_step',
    label: 'Bước làm tròn giá',
    group: 'Giá & phí',
    description: 'Đơn vị làm tròn giá bán theo cấu hình.',
    format: 'currency',
  },
  {
    key: 'commission.rate',
    label: 'Tỷ lệ hoa hồng',
    group: 'Giá & phí',
    description: 'Tỷ lệ hoa hồng nền tảng trong cấu hình.',
    format: 'percent',
  },
  {
    key: 'complaint.window_hours',
    label: 'Thời hạn gửi khiếu nại',
    group: 'Khiếu nại',
    description: 'Khoảng thời gian cho phép tạo khiếu nại.',
    format: 'number',
    unit: 'giờ',
  },
  {
    key: 'complaint.response_hours',
    label: 'Thời hạn phản hồi khiếu nại',
    group: 'Khiếu nại',
    description: 'Thời gian phản hồi ban đầu của cửa hàng.',
    format: 'number',
    unit: 'giờ',
  },
  {
    key: 'complaint.extension_hours',
    label: 'Gia hạn khiếu nại',
    group: 'Khiếu nại',
    description: 'Thời gian gia hạn xử lý khiếu nại.',
    format: 'number',
    unit: 'giờ',
  },
  {
    key: 'payment.recheck_minutes',
    label: 'Chu kỳ kiểm tra thanh toán',
    group: 'Thanh toán',
    description: 'Khoảng thời gian cấu hình kiểm tra giao dịch treo.',
    format: 'number',
    unit: 'phút',
  },
  {
    key: 'retention.audit_months',
    label: 'Lưu trữ Audit Logs',
    group: 'Lưu trữ',
    description: 'Thời hạn lưu trữ nhật ký kiểm toán trong cấu hình.',
    format: 'number',
    unit: 'tháng',
  },
  {
    key: 'retention.notifications_days',
    label: 'Lưu trữ thông báo',
    group: 'Lưu trữ',
    description: 'Thời hạn lưu trữ thông báo.',
    format: 'number',
    unit: 'ngày',
  },
  {
    key: 'plan.pro_price_vnd',
    label: 'Giá gói Pro',
    group: 'Gói SaaS',
    description: 'Phí thuê bao Pro được lưu trong cấu hình nền tảng.',
    format: 'currency',
  },
  {
    key: 'plan.pro_period_days',
    label: 'Chu kỳ Pro',
    group: 'Gói SaaS',
    description: 'Độ dài kỳ thuê bao Pro trong cấu hình.',
    format: 'number',
    unit: 'ngày',
  },
];

// =====================================================
// 3. DANH MỤC BACKGROUND JOBS
// =====================================================

/**
 * Các đường dẫn được lấy từ JobsController.
 *
 * Đây là endpoint thực tế trong Backend,
 * không phải API quản trị được phép kích hoạt.
 *
 * Không có thao tác POST nào được gọi
 * từ component này.
 */
const BACKGROUND_JOBS: readonly BackgroundJobDefinition[] = [
  {
    key: 'release-holds',
    title: 'Giải phóng suất giữ quá hạn',
    endpoint: '/jobs/release-holds',
    description: 'Giải phóng các suất đã hết thời gian giữ.',
  },
  {
    key: 'pickup-expire',
    title: 'Xử lý quá hạn nhận món',
    endpoint: '/jobs/pickup-expire',
    description: 'Xử lý đơn hàng quá thời gian nhận món.',
  },
  {
    key: 'auto-close-offers',
    title: 'Đóng đợt bán hết giờ',
    endpoint: '/jobs/auto-close-offers',
    description: 'Đóng các offer hết khung thời gian nhận món.',
  },
  {
    key: 'complaints-auto-accept',
    title: 'Tự chấp nhận khiếu nại quá hạn',
    endpoint: '/jobs/complaints-auto-accept',
    description: 'Xử lý khiếu nại vượt hạn phản hồi.',
  },
  {
    key: 'statements-close-week',
    title: 'Chốt sao kê tuần',
    endpoint: '/jobs/statements-close-week',
    description: 'Tạo và khóa sao kê đối soát tuần.',
  },
  {
    key: 'subscription-lifecycle',
    title: 'Vòng đời gói dịch vụ',
    endpoint: '/jobs/subscription-lifecycle',
    description: 'Xử lý subscription hết hạn và hạ gói.',
  },
  {
    key: 'payments-recheck',
    title: 'Kiểm tra thanh toán treo',
    endpoint: '/jobs/payments-recheck',
    description: 'Kiểm tra giao dịch chưa được xác nhận.',
  },
  {
    key: 'forecast-daily',
    title: 'Tạo dự báo hằng ngày',
    endpoint: '/jobs/forecast-daily',
    description: 'Tạo dự báo cho các cửa hàng đủ điều kiện.',
  },
  {
    key: 'price-proposals',
    title: 'Đề xuất giá động',
    endpoint: '/jobs/price-proposals',
    description: 'Tạo đề xuất giá và áp dụng theo cấu hình AUTO.',
  },
  {
    key: 'notify-pickup-reminder',
    title: 'Nhắc nhở nhận hàng',
    endpoint: '/jobs/notify-pickup-reminder',
    description: 'Gửi thông báo nhắc khách hàng nhận món.',
  },
  {
    key: 'retention-cleanup',
    title: 'Dọn dẹp dữ liệu quá hạn',
    endpoint: '/jobs/retention-cleanup',
    description: 'Xử lý dữ liệu vượt thời hạn lưu trữ.',
  },
  {
    key: 'account-anonymize',
    title: 'Ẩn danh tài khoản',
    endpoint: '/jobs/account-anonymize',
    description: 'Ẩn danh tài khoản đủ điều kiện theo quy trình xóa.',
  },
  {
    key: 'run-all',
    title: 'Chạy toàn bộ tác vụ',
    endpoint: '/jobs/run-all',
    description: 'Kích hoạt toàn bộ nhóm tác vụ nền.',
  },
];

// =====================================================
// 4. CÁC HÀM TIỆN ÍCH
// =====================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Kiểm tra cấu trúc thực tế của response.
 *
 * GET /platform-settings trả về Record<key, value>,
 * không phải mảng hay response phân trang.
 */
function parsePlatformSettings(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) {
    throw new Error('Backend trả cấu hình nền tảng không đúng định dạng.');
  }

  return payload;
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/**
 * Chỉ định dạng giá trị thực tế từ Backend.
 * Không tự điền giá trị mặc định nếu thiếu key.
 */
function formatSettingValue(value: unknown, definition: SettingDefinition): string {
  if (value === undefined) {
    return 'Không được trả về';
  }

  if (value === null) {
    return 'Chưa thiết lập';
  }

  if (typeof value === 'boolean') {
    return value ? 'Bật' : 'Tắt';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (definition.format === 'currency') {
      return moneyFormatter.format(value);
    }

    if (definition.format === 'percent') {
      return `${numberFormatter.format(value * 100)}%`;
    }

    const formatted = numberFormatter.format(value);

    return definition.unit ? `${formatted} ${definition.unit}` : formatted;
  }

  if (typeof value === 'string') {
    return value;
  }

  return 'Kiểu dữ liệu chưa được hỗ trợ';
}

// =====================================================
// 5. HEADER DÙNG CHUNG
// =====================================================

interface SectionHeadingProps {
  title: string;
  description: string;
  icon: ReactNode;
}

function SectionHeading({ title, description, icon }: SectionHeadingProps) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'flex-start',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: '12px',
          bgcolor: 'action.hover',
          color: 'primary.main',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            fontSize: 12,
            mt: 0.5,
            lineHeight: 1.8,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

// =====================================================
// 6. DRAWER CHI TIẾT THAM SỐ
// =====================================================

interface SettingDetailDrawerProps {
  definition: SettingDefinition | null;
  value: unknown;
  onClose: () => void;
}

/**
 * Drawer chỉ cho phép xem cấu hình.
 *
 * Không cung cấp form sửa vì Backend
 * chưa có endpoint cập nhật Platform Settings
 * được bảo vệ bằng quyền ADMIN.
 */
function SettingDetailDrawer({ definition, value, onClose }: SettingDetailDrawerProps) {
  return (
    <AdminDrawer
      open={definition !== null}
      onClose={onClose}
      title={definition?.label ?? 'Chi tiết cấu hình'}
      description="Cấu hình thực tế từ Backend"
      overline="PLATFORM SETTINGS"
      icon={<Gear size={24} weight="duotone" />}
      size="md"
      footer={
        <Stack
          direction="row"
          sx={{
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="outlined" onClick={onClose}>
            Đóng
          </Button>
        </Stack>
      }
    >
      {definition && (
        <Stack spacing={2.5}>
          <Alert severity="info" variant="outlined">
            Dữ liệu đang được hiển thị ở chế độ chỉ đọc. Thay đổi cấu hình cần API ADMIN riêng và
            lịch sử Audit Logs.
          </Alert>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Configuration Key
            </Typography>

            <Box
              component="code"
              sx={{
                display: 'block',
                mt: 1,
                p: 1.5,
                borderRadius: '10px',
                bgcolor: 'action.hover',
                fontSize: 12,
                overflowWrap: 'anywhere',
              }}
            >
              {definition.key}
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Giá trị Backend
            </Typography>

            <Typography
              sx={{
                mt: 1,
                fontSize: 18,
                fontWeight: 750,
                overflowWrap: 'anywhere',
              }}
            >
              {formatSettingValue(value, definition)}
            </Typography>
          </Box>

          <Divider />

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 13,
              lineHeight: 1.85,
            }}
          >
            {definition.description}
          </Typography>

          <Chip
            label={definition.group}
            size="small"
            variant="outlined"
            sx={{ alignSelf: 'flex-start' }}
          />
        </Stack>
      )}
    </AdminDrawer>
  );
}

// =====================================================
// 7. TAB CẤU HÌNH NỀN TẢNG
// =====================================================

interface PlatformSettingsTabProps {
  data: PlatformSettingsState;
  onReload: () => void;
}

/**
 * Dữ liệu được đọc từ GET /platform-settings.
 *
 * Chỉ những key có trong SETTING_DEFINITIONS
 * mới được hiển thị. Không render tùy tiện
 * mọi dữ liệu Backend trả về.
 */
function PlatformSettingsTab({ data, onReload }: PlatformSettingsTabProps) {
  const [keyword, setKeyword] = useState('');

  const [group, setGroup] = useState('ALL');

  const [selected, setSelected] = useState<SettingDefinition | null>(null);

  const groups = useMemo(() => [...new Set(SETTING_DEFINITIONS.map((item) => item.group))], []);

  const filtered = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return SETTING_DEFINITIONS.filter((item) => {
      const groupMatches = group === 'ALL' || item.group === group;

      const searchMatches =
        !search ||
        item.key.toLowerCase().includes(search) ||
        item.label.toLowerCase().includes(search);

      return groupMatches && searchMatches;
    });
  }, [keyword, group]);

  const availableCount = data.values
    ? SETTING_DEFINITIONS.filter((item) =>
        Object.prototype.hasOwnProperty.call(data.values, item.key),
      ).length
    : null;

  return (
    <Stack spacing={3}>
      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        sx={{
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            sm: 'center',
          },
          gap: 2,
        }}
      >
        <SectionHeading
          title="Tham số nền tảng"
          description={'Đọc cấu hình vận hành thực tế từ Backend.'}
          icon={<Gear size={25} weight="duotone" />}
        />

        <Button
          variant="outlined"
          startIcon={<ArrowClockwise size={18} />}
          onClick={onReload}
          disabled={data.loading}
        >
          Làm mới
        </Button>
      </Stack>

      <Alert severity="warning" variant="outlined">
        GET /platform-settings hiện chưa có guard xác thực tại Backend. Frontend chỉ hiển thị một
        tập tham số được chọn trước. Cần bảo vệ endpoint này trước khi triển khai Production.
      </Alert>

      {data.error && (
        <Alert
          severity="error"
          variant="outlined"
          action={
            <Button color="inherit" size="small" onClick={onReload}>
              Thử lại
            </Button>
          }
        >
          {data.error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <TextField
            fullWidth
            size="small"
            label="Tìm tham số"
            placeholder="Tên hoặc configuration key"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlass size={18} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            fullWidth
            select
            size="small"
            label="Nhóm cấu hình"
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
            }}
          >
            <MenuItem value="ALL">Tất cả nhóm</MenuItem>

            {groups.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {data.loading && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
          }}
          role="status"
        >
          <CircularProgress size={20} />

          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
            Đang tải cấu hình từ Backend...
          </Typography>
        </Stack>
      )}

      {data.values && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            label={`${availableCount} tham số được trả về`}
          />

          <Chip size="small" label="Chỉ đọc" />

          {data.loadedAt && (
            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
              Tải lúc {data.loadedAt.toLocaleString('vi-VN')}
            </Typography>
          )}
        </Stack>
      )}

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 750 }}>
          <TableHead>
            <TableRow>
              <TableCell>Tham số</TableCell>
              <TableCell>Nhóm</TableCell>
              <TableCell>Giá trị</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">Chi tiết</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.values &&
              filtered.map((item) => {
                const hasValue = Object.prototype.hasOwnProperty.call(data.values, item.key);

                return (
                  <TableRow key={item.key} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {item.label}
                        </Typography>

                        <Typography
                          component="code"
                          color="text.secondary"
                          sx={{
                            fontSize: 11,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.key}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip size="small" variant="outlined" label={item.group} />
                    </TableCell>

                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: 13,
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatSettingValue(data.values?.[item.key], item)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        color={hasValue ? 'success' : 'warning'}
                        variant="outlined"
                        label={hasValue ? 'Đã nhận' : 'Thiếu key'}
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<Eye size={16} />}
                        onClick={() => {
                          setSelected(item);
                        }}
                      >
                        Xem
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

            {!data.values && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    {data.loading
                      ? 'Đang tải dữ liệu cấu hình...'
                      : 'Chưa có dữ liệu cấu hình được xác minh.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {data.values && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    Không có tham số phù hợp với bộ lọc.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        color="text.secondary"
        sx={{
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        Giá trị hiển thị là cấu hình được đọc từ Backend, không chứng minh mọi service đã áp dụng
        cấu hình động đó. Một số nghiệp vụ hiện vẫn sử dụng hằng số hoặc giá trị truyền trực tiếp
        trong code.
      </Typography>

      <SettingDetailDrawer
        definition={selected}
        value={selected ? data.values?.[selected.key] : undefined}
        onClose={() => {
          setSelected(null);
        }}
      />
    </Stack>
  );
}

// =====================================================
// 8. TAB CRONJOBS
// =====================================================

/**
 * Không hiển thị trạng thái job đang chạy
 * vì Backend chưa có API giám sát cho ADMIN.
 *
 * Đây là danh mục endpoint được định nghĩa
 * trong JobsController, không phải báo cáo
 * job đã thực thi thành công.
 */
function CronjobsTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Cronjobs & Background Tasks"
        description={'Danh mục tác vụ vận hành theo JobsController.'}
        icon={<ClockCounterClockwise size={25} weight="duotone" />}
      />

      <Alert severity="warning" variant="outlined">
        Các POST /jobs/* có khả năng thay đổi dữ liệu thật nhưng JobsController chưa áp dụng guard
        xác thực và phân quyền. Toàn bộ chức năng chạy thủ công sẽ bị vô hiệu hóa trên giao diện.
      </Alert>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          flexWrap: 'wrap',
        }}
      >
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`${BACKGROUND_JOBS.length} endpoint`}
        />

        <Chip size="small" color="warning" variant="outlined" label="Không cho chạy thủ công" />
      </Stack>

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 830 }}>
          <TableHead>
            <TableRow>
              <TableCell>Tác vụ</TableCell>
              <TableCell>Endpoint</TableCell>
              <TableCell>Quyền vận hành</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {BACKGROUND_JOBS.map((job) => (
              <TableRow key={job.key} hover>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {job.title}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: 11,
                        lineHeight: 1.8,
                      }}
                    >
                      {job.description}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Typography
                    component="code"
                    sx={{
                      fontSize: 11,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    POST {job.endpoint}
                  </Typography>
                </TableCell>

                <TableCell>
                  <Chip size="small" color="warning" variant="outlined" label="Chưa bảo vệ" />
                </TableCell>

                <TableCell align="right">
                  <Button disabled size="small" variant="outlined">
                    Chạy
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
              }}
            >
              Cơ chế chạy tự động
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.9,
              }}
            >
              Backend sử dụng BullMQ và Redis để chạy các tác vụ đã được đăng ký. Khi kết nối Redis
              thất bại, mã nguồn có cơ chế fallback sử dụng interval trong tiến trình Node.js.
            </Typography>

            <Alert severity="info" variant="outlined">
              Danh mục endpoint không cho biết job đang bật, đang chạy, đã thành công hay lần chạy
              gần nhất. Những thông tin đó cần API giám sát worker và queue riêng.
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// =====================================================
// 9. TAB AUDIT LOGS
// =====================================================

/**
 * Backend có GET /store/audit-logs dành
 * riêng cho STORE_USER với quyền OWNER.
 *
 * Không dùng endpoint này để lấy dữ liệu
 * toàn sàn bằng tài khoản ADMIN.
 */
function AuditLogsTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Audit Logs toàn sàn"
        description={'Giám sát các thay đổi quan trọng ' + 'và thao tác quản trị.'}
        icon={<FileText size={25} weight="duotone" />}
      />

      <Alert severity="info" variant="outlined">
        Chưa có endpoint ADMIN để truy vấn Audit Logs toàn sàn. Backend hiện chỉ cho OWNER của cửa
        hàng đọc nhật ký trong phạm vi cửa hàng tương ứng.
      </Alert>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <TextField
            disabled
            fullWidth
            size="small"
            label="Tìm kiếm"
            placeholder="Actor ID hoặc Target ID"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField
            disabled
            fullWidth
            size="small"
            label="Hành động"
            placeholder="PRICE_CHANGED, ..."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField
            disabled
            fullWidth
            size="small"
            label="Từ ngày"
            type="date"
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        </Grid>
      </Grid>

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 830 }}>
          <TableHead>
            <TableRow>
              <TableCell>Thời gian</TableCell>
              <TableCell>Người thực hiện</TableCell>
              <TableCell>Hành động</TableCell>
              <TableCell>Đối tượng</TableCell>
              <TableCell>Địa chỉ IP</TableCell>
              <TableCell>Chi tiết</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                <Stack
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                  }}
                >
                  <LockKey size={34} color="#F79009" weight="duotone" />

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Chưa có API Audit Logs Admin
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.8,
                      maxWidth: 460,
                    }}
                  >
                    Không thể truy xuất nhật ký toàn sàn bằng API hiện có. Đây không phải bảng dữ
                    liệu rỗng.
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              Cấu trúc Audit Log của Backend
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.9,
              }}
            >
              AuditLogEntity có các trường như actorId, actorRole, storeId, action, targetType,
              targetId, oldValue, newValue, ip, userAgent và createdAt.
            </Typography>

            <Divider />

            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
              }}
              spacing={1}
            >
              <ShieldCheck size={20} color="#15B79F" />

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                AuditLogService có phương thức ghi nhật ký theo hướng append-only.
              </Typography>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.8,
              }}
            >
              Để bảo đảm tính bất biến ở mức Production, Backend và cơ sở dữ liệu cũng cần ngăn thao
              tác sửa, xóa trái phép trên bảng audit_logs.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// =====================================================
// 10. COMPONENT SETTINGS PAGE CHÍNH
// =====================================================

export function SettingsPage() {
  // ---------------------------------------------------
  // Tab đang được chọn
  // ---------------------------------------------------

  const [activeTab, setActiveTab] = useState<SettingsTab>('platform');

  // ---------------------------------------------------
  // Trạng thái đọc cấu hình từ Backend
  // ---------------------------------------------------

  const [settingsState, setSettingsState] = useState<PlatformSettingsState>({
    values: null,
    loading: true,
    error: null,
    loadedAt: null,
  });

  // ---------------------------------------------------
  // Tăng khóa để tải lại cấu hình
  // ---------------------------------------------------

  const [reloadVersion, setReloadVersion] = useState(0);

  // ===================================================
  // 11. TẢI CẤU HÌNH THỰC TẾ
  // ===================================================

  useEffect(() => {
    const controller = new AbortController();

    const loadSettings = async () => {
      setSettingsState({
        values: null,
        loading: true,
        error: null,
        loadedAt: null,
      });

      try {
        /**
         * Endpoint có thật:
         *
         * GET /platform-settings
         *
         * Backend hiện chưa yêu cầu JWT cho
         * endpoint này. Do đó auth:false
         * phản ánh đúng hợp đồng hiện tại.
         *
         * Trước Production, cần bổ sung
         * JwtAuthGuard và kiểm tra role ADMIN.
         */
        const response = await adminApi.get<unknown>('/platform-settings', {
          auth: false,
          signal: controller.signal,
        });

        const values = parsePlatformSettings(response);

        if (controller.signal.aborted) {
          return;
        }

        setSettingsState({
          values,
          loading: false,
          error: null,
          loadedAt: new Date(),
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSettingsState({
          values: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Không thể tải cấu hình nền tảng.',
          loadedAt: null,
        });
      }
    };

    void loadSettings();

    return () => {
      controller.abort();
    };
  }, [reloadVersion]);

  // ===================================================
  // 12. GIAO DIỆN CHÍNH
  // ===================================================

  return (
    <Stack spacing={3} className="admin-page-enter">
      {/* ======================================
          HEADER
          ====================================== */}

      <Stack
        direction={{
          xs: 'column',
          md: 'row',
        }}
        sx={{
          justifyContent: 'space-between',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 750,
              letterSpacing: '-0.04em',
            }}
          >
            Cấu hình hệ thống
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Quản lý tham số nền tảng, theo dõi tác vụ nền và Audit Logs.
          </Typography>
        </Box>

        <Chip
          color="warning"
          variant="outlined"
          icon={<ShieldWarning size={17} />}
          label="Quản trị chỉ đọc"
        />
      </Stack>

      {/* ======================================
          TRẠNG THÁI TÍCH HỢP
          ====================================== */}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Gear size={24} color="#635BFF" />

                <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                  Cấu hình nền tảng
                </Typography>

                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {settingsState.loading
                    ? 'Đang tải'
                    : settingsState.error
                      ? 'Lỗi kết nối'
                      : 'Chỉ đọc'}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <ClockCounterClockwise size={24} color="#F79009" />

                <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                  Background Jobs
                </Typography>

                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Chưa bảo vệ API
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <FileText size={24} color="#98A2B3" />

                <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                  Audit Logs toàn sàn
                </Typography>

                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  Chờ API Admin
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ======================================
          TABS
          ====================================== */}

      <Card>
        <Box sx={{ px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: SettingsTab) => {
              setActiveTab(value);
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Các chức năng cấu hình hệ thống"
          >
            <Tab value="platform" label="Tham số nền tảng" />

            <Tab value="jobs" label="Cronjobs" />

            <Tab value="audit" label="Audit Logs" />
          </Tabs>
        </Box>

        <Divider />

        <Box
          sx={{
            p: {
              xs: 2,
              sm: 3,
            },
          }}
        >
          {activeTab === 'platform' && (
            <PlatformSettingsTab
              data={settingsState}
              onReload={() => {
                setReloadVersion((previous) => previous + 1);
              }}
            />
          )}

          {activeTab === 'jobs' && <CronjobsTab />}

          {activeTab === 'audit' && <AuditLogsTab />}
        </Box>
      </Card>

      {/* ======================================
          CẢNH BÁO BẢO MẬT
          ====================================== */}

      <Alert
        severity="warning"
        variant="outlined"
        icon={<WarningCircle size={22} weight="duotone" />}
      >
        <Typography
          sx={{
            fontSize: 12,
            lineHeight: 1.9,
          }}
        >
          Frontend không thể thay thế Backend Authentication hoặc Authorization. Các endpoint thay
          đổi cấu hình và kích hoạt tác vụ nền phải được bảo vệ, kiểm tra quyền ADMIN và ghi Audit
          Logs trước khi cho phép sử dụng trong môi trường Production.
        </Typography>
      </Alert>
    </Stack>
  );
}

export default SettingsPage;
