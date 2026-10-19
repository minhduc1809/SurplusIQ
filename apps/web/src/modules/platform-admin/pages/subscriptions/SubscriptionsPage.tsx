import { useMemo, useState } from 'react';

import type { ReactNode } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  LinearProgress,
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
  ChartBar,
  ClockCountdown,
  CurrencyDollar,
  Info,
  MagnifyingGlass,
  Package,
  Receipt,
  ShieldWarning,
  Storefront,
  UsersThree,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

// =====================================================
// 1. CÁC KIỂU DỮ LIỆU THEO BACKEND
// =====================================================

/**
 * Các loại gói được khai báo trong
 * SubscriptionPlan của Backend.
 */
type SubscriptionPlan = 'BASIC' | 'TRIAL' | 'PRO';

/**
 * Các trạng thái được khai báo trong
 * SubscriptionStatus của Backend.
 */
type SubscriptionStatus = 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED';

/**
 * Các chu kỳ quota thực tế trong
 * QuotaPeriod của Backend.
 */
type QuotaPeriod = 'DAILY' | 'MONTHLY' | 'PER_REQUEST' | 'EXISTENCE';

/**
 * Quota dành cho cửa hàng hoặc khách hàng.
 *
 * Nhóm khách hàng không nằm trong response
 * getStoreQuotaSummary() của Backend.
 */
type QuotaAudience = 'store' | 'customer';

type SubscriptionsTab = 'subscriptions' | 'quotas' | 'invoices' | 'lifecycle';

type PeriodFilter = QuotaPeriod | 'ALL';

type AudienceFilter = QuotaAudience | 'all';

interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  subtitle: string;
  priceLabel: string;
  periodLabel: string;
}

interface QuotaDefinition {
  key: string;
  name: string;
  period: QuotaPeriod;
  audience: QuotaAudience;
  limits: Record<SubscriptionPlan, number>;
}

interface StatusDefinition {
  status: SubscriptionStatus;
  label: string;
  description: string;
  color: 'success' | 'warning' | 'error' | 'default';
}

// =====================================================
// 2. THÔNG TIN CÁC GÓI
// =====================================================

/**
 * BASIC là gói mặc định.
 *
 * PRO có mức 300.000 VND cho kỳ 30 ngày
 * theo SubscriptionsService hiện tại.
 *
 * TRIAL có hạn mức giống PRO, nhưng controller
 * hiện chưa có endpoint kích hoạt dùng thử
 * dành riêng cho Super Admin.
 */
const PLANS: readonly PlanDefinition[] = [
  {
    id: 'BASIC',
    name: 'Basic',
    subtitle: 'Gói cơ bản',
    priceLabel: 'Miễn phí',
    periodLabel: 'Gói mặc định',
  },
  {
    id: 'TRIAL',
    name: 'Trial',
    subtitle: 'Gói dùng thử',
    priceLabel: 'Dùng thử',
    periodLabel: 'Hạn mức tương đương Pro',
  },
  {
    id: 'PRO',
    name: 'Pro',
    subtitle: 'Gói nâng cao',
    priceLabel: '300.000 ₫',
    periodLabel: 'Kỳ 30 ngày',
  },
];

// =====================================================
// 3. CÁC TRẠNG THÁI SUBSCRIPTION
// =====================================================

const SUBSCRIPTION_STATUSES: readonly StatusDefinition[] = [
  {
    status: 'ACTIVE',
    label: 'Đang hoạt động',
    description: 'Subscription được ghi nhận ở trạng thái ACTIVE.',
    color: 'success',
  },
  {
    status: 'PENDING_PAYMENT',
    label: 'Chờ thanh toán',
    description: 'Trạng thái chờ thanh toán được khai báo trong entity.',
    color: 'warning',
  },
  {
    status: 'EXPIRED',
    label: 'Hết hạn',
    description: 'Subscription được ghi nhận ở trạng thái EXPIRED.',
    color: 'error',
  },
  {
    status: 'CANCELLED',
    label: 'Đã hủy',
    description: 'Trạng thái CANCELLED được khai báo trong entity.',
    color: 'default',
  },
];

// =====================================================
// 4. BẢNG QUOTA MẶC ĐỊNH TỪ BACKEND
// =====================================================

/**
 * Dữ liệu dưới đây được đối chiếu từ:
 *
 * apps/backend/src/modules/subscriptions/quota.constants.ts
 *
 * Không phải hạn mức đang được sử dụng thực tế.
 *
 * QuotaService có thể ưu tiên cấu hình ghi đè
 * trong bảng plan_quotas của cơ sở dữ liệu.
 *
 * Khi Backend có API ADMIN phù hợp, cần đọc
 * hạn mức hiệu lực từ Backend thay vì dùng
 * các hằng số này để ra quyết định nghiệp vụ.
 */
const QUOTAS: readonly QuotaDefinition[] = [
  {
    key: 'daily_offers',
    name: 'Số suất mở bán trong ngày',
    period: 'DAILY',
    audience: 'store',
    limits: {
      BASIC: 20,
      TRIAL: 100,
      PRO: 100,
    },
  },
  {
    key: 'csv_import_lines',
    name: 'Số dòng nhập CSV mỗi lần',
    period: 'PER_REQUEST',
    audience: 'store',
    limits: {
      BASIC: 100,
      TRIAL: 500,
      PRO: 500,
    },
  },
  {
    key: 'ai_image_scan',
    name: 'Lượt AI phân tích ảnh món ăn',
    period: 'MONTHLY',
    audience: 'store',
    limits: {
      BASIC: 20,
      TRIAL: 300,
      PRO: 300,
    },
  },
  {
    key: 'ai_chat_query',
    name: 'Câu hỏi trợ lý AI kinh doanh',
    period: 'MONTHLY',
    audience: 'store',
    limits: {
      BASIC: 10,
      TRIAL: 300,
      PRO: 300,
    },
  },
  {
    key: 'ai_content_gen',
    name: 'Lượt AI soạn nội dung',
    period: 'MONTHLY',
    audience: 'store',
    limits: {
      BASIC: 10,
      TRIAL: 200,
      PRO: 200,
    },
  },
  {
    key: 'active_staff',
    name: 'Nhân viên đang hoạt động',
    period: 'EXISTENCE',
    audience: 'store',
    limits: {
      BASIC: 1,
      TRIAL: 5,
      PRO: 5,
    },
  },
  {
    key: 'active_promotions',
    name: 'Chương trình ưu đãi đồng thời',
    period: 'EXISTENCE',
    audience: 'store',
    limits: {
      BASIC: 2,
      TRIAL: 10,
      PRO: 10,
    },
  },
  {
    key: 'campaigns_per_month',
    name: 'Chiến dịch tiếp thị',
    period: 'MONTHLY',
    audience: 'store',
    limits: {
      BASIC: 4,
      TRIAL: 30,
      PRO: 30,
    },
  },
  {
    key: 'export_reports',
    name: 'Lượt xuất báo cáo',
    period: 'MONTHLY',
    audience: 'store',
    limits: {
      BASIC: 3,
      TRIAL: 30,
      PRO: 30,
    },
  },
  {
    key: 'export_orders',
    name: 'Lượt xuất đơn hàng',
    period: 'MONTHLY',
    audience: 'store',
    limits: {
      BASIC: 5,
      TRIAL: 60,
      PRO: 60,
    },
  },
  {
    key: 'ai_customer_queries',
    name: 'Câu hỏi trợ lý Cứu Món',
    period: 'DAILY',
    audience: 'customer',
    limits: {
      BASIC: 30,
      TRIAL: 30,
      PRO: 30,
    },
  },
  {
    key: 'ai_complaint_gen',
    name: 'Lượt AI hỗ trợ soạn khiếu nại',
    period: 'DAILY',
    audience: 'customer',
    limits: {
      BASIC: 10,
      TRIAL: 10,
      PRO: 10,
    },
  },
];

// =====================================================
// 5. HÀM ĐỊNH DẠNG
// =====================================================

const numberFormatter = new Intl.NumberFormat('vi-VN');

function formatLimit(value: number): string {
  return numberFormatter.format(value);
}

function getPeriodLabel(period: QuotaPeriod): string {
  switch (period) {
    case 'DAILY':
      return 'Mỗi ngày';

    case 'MONTHLY':
      return 'Mỗi tháng';

    case 'PER_REQUEST':
      return 'Mỗi yêu cầu';

    case 'EXISTENCE':
      return 'Tồn tại đồng thời';
  }
}

function getAudienceLabel(audience: QuotaAudience): string {
  return audience === 'store' ? 'Cửa hàng' : 'Khách hàng';
}

// =====================================================
// 6. COMPONENT TIÊU ĐỀ
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
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'primary.main',
          borderRadius: '12px',
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
// 7. CARD SO SÁNH GÓI
// =====================================================

interface PlanCardProps {
  plan: PlanDefinition;
  selected: boolean;
  onSelect: () => void;
}

/**
 * Thẻ lựa chọn chỉ thay đổi gói đang xem.
 *
 * Không gửi yêu cầu nâng cấp subscription.
 */
function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  const isPro = plan.id === 'PRO';

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderRadius: '16px',
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
      }}
    >
      <CardContent
        sx={{
          p: 3,
          '&:last-child': { pb: 3 },
          height: '100%',
        }}
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 45,
                height: 45,
                borderRadius: '12px',
                bgcolor: 'action.hover',
                color: 'primary.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {isPro ? (
                <ChartBar size={24} weight="duotone" />
              ) : (
                <Storefront size={24} weight="duotone" />
              )}
            </Box>

            {selected && <Chip size="small" color="primary" label="Đang xem" />}
          </Stack>

          <Box>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 750,
              }}
            >
              {plan.name}
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 0.5,
                fontSize: 12,
              }}
            >
              {plan.subtitle}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 25,
              fontWeight: 750,
              letterSpacing: '-0.035em',
            }}
          >
            {plan.priceLabel}
          </Typography>

          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
            {plan.periodLabel}
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Button fullWidth variant={selected ? 'contained' : 'outlined'} onClick={onSelect}>
            {selected ? 'Đang so sánh' : 'Xem hạn mức'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 8. DRAWER CHI TIẾT QUOTA
// =====================================================

interface QuotaDetailDrawerProps {
  quota: QuotaDefinition | null;
  onClose: () => void;
}

/**
 * Drawer chỉ hiển thị cấu hình quota mặc định.
 *
 * Không hiển thị used/remaining giả
 * và không cho phép sửa giá trị Backend.
 */
function QuotaDetailDrawer({ quota, onClose }: QuotaDetailDrawerProps) {
  return (
    <AdminDrawer
      open={quota !== null}
      onClose={onClose}
      title={quota?.name ?? 'Chi tiết quota'}
      description="Cấu hình mặc định trong mã nguồn Backend"
      overline="QUOTA DEFINITION"
      icon={<Package size={24} weight="duotone" />}
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
      {quota && (
        <Stack spacing={2.5}>
          <Alert severity="info" variant="outlined">
            Đây là hạn mức mặc định từ PLAN_QUOTAS_MAP. Giá trị thực tế có thể được ghi đè trong
            bảng plan_quotas của Backend.
          </Alert>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Quota Key
            </Typography>

            <Box
              component="code"
              sx={{
                display: 'block',
                mt: 1,
                p: 1.5,
                borderRadius: '10px',
                bgcolor: 'action.hover',
                overflowWrap: 'anywhere',
                fontSize: 12,
              }}
            >
              {quota.key}
            </Box>
          </Box>

          <Divider />

          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexWrap: 'wrap',
            }}
          >
            <Chip size="small" label={getPeriodLabel(quota.period)} />

            <Chip size="small" variant="outlined" label={getAudienceLabel(quota.audience)} />
          </Stack>

          <Typography
            sx={{
              fontWeight: 700,
            }}
          >
            Hạn mức theo gói
          </Typography>

          {PLANS.map((plan) => (
            <Stack
              key={plan.id}
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontSize: 13 }}>{plan.name}</Typography>

              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatLimit(quota.limits[plan.id])}
              </Typography>
            </Stack>
          ))}

          <Divider />

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 12,
              lineHeight: 1.85,
            }}
          >
            Số lượt đã sử dụng, hạn mức còn lại và thời điểm đặt lại chỉ có thể được xác minh bằng
            QuotaService theo đúng tài khoản hoặc cửa hàng.
          </Typography>
        </Stack>
      )}
    </AdminDrawer>
  );
}

// =====================================================
// 9. TAB DANH SÁCH SUBSCRIPTION
// =====================================================

/**
 * Backend chưa có API ADMIN để liệt kê
 * subscription của toàn bộ cửa hàng.
 */
function SubscriptionsListTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Đăng ký gói dịch vụ toàn sàn"
        description={'Tra cứu cửa hàng, gói hiện tại ' + 'và thời gian hiệu lực.'}
        icon={<UsersThree size={25} weight="duotone" />}
      />

      <Alert severity="info" variant="outlined">
        Các endpoint subscription hiện tại chỉ dành cho STORE_USER có quyền cửa hàng. Chưa có API
        quản trị toàn sàn dành cho tài khoản ADMIN.
      </Alert>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            disabled
            fullWidth
            size="small"
            label="Tìm kiếm"
            placeholder="Tên hoặc mã cửa hàng"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField disabled select fullWidth size="small" label="Gói dịch vụ" defaultValue="ALL">
            <MenuItem value="ALL">Tất cả gói</MenuItem>

            {PLANS.map((plan) => (
              <MenuItem key={plan.id} value={plan.id}>
                {plan.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField disabled select fullWidth size="small" label="Trạng thái" defaultValue="ALL">
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>

            {SUBSCRIPTION_STATUSES.map((item) => (
              <MenuItem key={item.status} value={item.status}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 780 }}>
          <TableHead>
            <TableRow>
              <TableCell>Cửa hàng</TableCell>
              <TableCell>Gói</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Bắt đầu</TableCell>
              <TableCell>Hết hạn</TableCell>
              <TableCell>Thao tác</TableCell>
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
                  <ShieldWarning size={34} weight="duotone" color="#F79009" />

                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                    Chưa có API danh sách subscription toàn sàn
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      maxWidth: 450,
                      lineHeight: 1.8,
                    }}
                  >
                    Đây là trạng thái chưa hỗ trợ, không phải kết quả truy vấn không có cửa hàng
                    đăng ký.
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        sx={{
          justifyContent: 'flex-end',
        }}
        spacing={1.5}
      >
        <Button disabled variant="outlined">
          Xem subscription
        </Button>

        <Button disabled variant="contained">
          Điều chỉnh gói
        </Button>
      </Stack>
    </Stack>
  );
}

// =====================================================
// 10. TAB SO SÁNH QUOTA
// =====================================================

interface QuotasTabProps {
  selectedPlan: SubscriptionPlan;
  onSelectQuota: (quota: QuotaDefinition) => void;
}

function QuotasTab({ selectedPlan, onSelectQuota }: QuotasTabProps) {
  const [keyword, setKeyword] = useState('');

  const [period, setPeriod] = useState<PeriodFilter>('ALL');

  const [audience, setAudience] = useState<AudienceFilter>('store');

  // ---------------------------------------------------
  // Chỉ lọc cấu hình có sẵn trong mã nguồn
  // ---------------------------------------------------

  const filteredQuotas = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return QUOTAS.filter((quota) => {
      const matchesKeyword =
        !normalized ||
        quota.key.toLowerCase().includes(normalized) ||
        quota.name.toLowerCase().includes(normalized);

      const matchesPeriod = period === 'ALL' || quota.period === period;

      const matchesAudience = audience === 'all' || quota.audience === audience;

      return matchesKeyword && matchesPeriod && matchesAudience;
    });
  }, [keyword, period, audience]);

  return (
    <Stack spacing={3}>
      <SectionHeading
        title="So sánh hạn mức các gói"
        description={
          'Cấu hình mặc định từ PLAN_QUOTAS_MAP. ' + 'Có thể lọc và xem chi tiết từng quota.'
        }
        icon={<Package size={25} weight="duotone" />}
      />

      <Alert severity="warning" variant="outlined">
        Đây là quota mặc định trong mã nguồn. QuotaService ưu tiên giá trị ghi đè từ bảng
        plan_quotas nếu có. Chưa có API ADMIN để đọc các ghi đè đó.
      </Alert>

      {/* ======================================
          BỘ LỌC CỤC BỘ
          ====================================== */}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            fullWidth
            size="small"
            label="Tìm quota"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
            }}
            placeholder="Tên hoặc quota key"
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

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Chu kỳ"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as PeriodFilter);
            }}
          >
            <MenuItem value="ALL">Tất cả chu kỳ</MenuItem>

            {(['DAILY', 'MONTHLY', 'PER_REQUEST', 'EXISTENCE'] as const).map((item) => (
              <MenuItem key={item} value={item}>
                {getPeriodLabel(item)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            size="small"
            label="Đối tượng"
            value={audience}
            onChange={(event) => {
              setAudience(event.target.value as AudienceFilter);
            }}
          >
            <MenuItem value="all">Tất cả</MenuItem>

            <MenuItem value="store">Quota cửa hàng</MenuItem>

            <MenuItem value="customer">Quota khách hàng</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Stack
        direction="row"
        sx={{
          gap: 1,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`Đang so sánh: ${selectedPlan}`}
        />

        <Chip size="small" label={`${filteredQuotas.length} định nghĩa`} />
      </Stack>

      {/* ======================================
          BẢNG QUOTA THEO GÓI
          ====================================== */}

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 850 }}>
          <TableHead>
            <TableRow>
              <TableCell>Hạn mức</TableCell>

              <TableCell>Chu kỳ</TableCell>

              {PLANS.map((plan) => (
                <TableCell
                  key={plan.id}
                  align="right"
                  sx={{
                    bgcolor: selectedPlan === plan.id ? 'action.selected' : undefined,
                  }}
                >
                  {plan.id}
                </TableCell>
              ))}

              <TableCell align="right">Chi tiết</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredQuotas.map((quota) => (
              <TableRow key={quota.key} hover>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {quota.name}
                    </Typography>

                    <Typography
                      component="code"
                      color="text.secondary"
                      sx={{
                        fontSize: 11,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {quota.key}
                    </Typography>
                  </Stack>
                </TableCell>

                <TableCell>
                  <Chip size="small" variant="outlined" label={getPeriodLabel(quota.period)} />
                </TableCell>

                {PLANS.map((plan) => (
                  <TableCell
                    key={plan.id}
                    align="right"
                    sx={{
                      bgcolor: selectedPlan === plan.id ? 'action.selected' : undefined,
                      fontWeight: selectedPlan === plan.id ? 800 : 500,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatLimit(quota.limits[plan.id])}
                  </TableCell>
                ))}

                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={() => {
                      onSelectQuota(quota);
                    }}
                  >
                    Xem
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {filteredQuotas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    Không có định nghĩa quota phù hợp với bộ lọc.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Alert severity="info" variant="outlined">
        Chỉ mười quota dành cho cửa hàng nằm trong getStoreQuotaSummary(). Hai quota dành cho khách
        hàng được hiển thị riêng khi chọn bộ lọc tương ứng; chúng không phải mức sử dụng của một cửa
        hàng.
      </Alert>

      {/* ======================================
          VÍ DỤ PHẠM VI QUOTA
          ====================================== */}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              Cơ chế đếm quota
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.9,
              }}
            >
              Với chu kỳ DAILY hoặc MONTHLY, Backend tổng hợp units trong usage_logs theo chu kỳ
              tương ứng. Với EXISTENCE, Backend đếm các bản ghi đang hoạt động. Với PER_REQUEST,
              giới hạn được kiểm tra theo từng yêu cầu.
            </Typography>

            <LinearProgress
              variant="determinate"
              value={0}
              aria-label="Không có dữ liệu sử dụng quota thực tế"
            />

            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
              Chưa có dữ liệu used/remaining. Thanh phía trên chỉ thể hiện trạng thái chưa tích hợp,
              không phải tỷ lệ sử dụng thực tế.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// =====================================================
// 11. TAB HÓA ĐƠN
// =====================================================

function InvoicesTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Hóa đơn thuê bao"
        description={'Theo dõi phí đăng ký Pro và lịch sử hóa đơn.'}
        icon={<Receipt size={25} weight="duotone" />}
      />

      <Alert severity="info" variant="outlined">
        Backend có GET /store/subscription/invoices và endpoint xuất PDF, nhưng chỉ dành cho OWNER
        của cửa hàng. Chưa có endpoint ADMIN để xem hóa đơn toàn sàn.
      </Alert>

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 730 }}>
          <TableHead>
            <TableRow>
              <TableCell>Mã hóa đơn</TableCell>
              <TableCell>Cửa hàng</TableCell>
              <TableCell>Kỳ dịch vụ</TableCell>
              <TableCell align="right">Số tiền</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell align="right">PDF</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                <Stack
                  sx={{
                    alignItems: 'center',
                  }}
                  spacing={1.5}
                >
                  <ShieldWarning size={34} color="#F79009" weight="duotone" />

                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                    Chưa hỗ trợ API hóa đơn Admin
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      maxWidth: 410,
                      lineHeight: 1.8,
                    }}
                  >
                    Chưa thể đọc hoặc xuất hóa đơn của toàn bộ cửa hàng bằng tài khoản Super Admin.
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Button disabled variant="outlined" sx={{ alignSelf: 'flex-end' }}>
        Xuất báo cáo hóa đơn
      </Button>
    </Stack>
  );
}

// =====================================================
// 12. TAB VÒNG ĐỜI SUBSCRIPTION
// =====================================================

/**
 * Các mô tả dưới đây dựa trên
 * SubscriptionsService và JobsService hiện tại.
 */
function LifecycleTab() {
  const events = [
    {
      title: 'Khởi tạo Basic',
      description:
        'Khi cửa hàng chưa có subscription, ' +
        'getCurrentSubscription có thể tạo ' +
        'bản ghi BASIC với trạng thái ACTIVE.',
    },
    {
      title: 'Nâng cấp Pro',
      description: 'upgradeToPro đặt gói PRO, trạng thái ' + 'ACTIVE và kỳ mới kéo dài 30 ngày.',
    },
    {
      title: 'Gia hạn Pro',
      description: 'renewPro nối tiếp kỳ còn hiệu lực ' + 'hoặc tạo kỳ 30 ngày mới nếu đã hết hạn.',
    },
    {
      title: 'Hạ cấp',
      description: 'PRO được đánh dấu downgradeAtPeriodEnd. ' + 'TRIAL được chuyển về BASIC ngay.',
    },
    {
      title: 'Xử lý hết hạn tự động',
      description:
        'Job subscription-lifecycle chuyển ' +
        'subscription ACTIVE hết hạn từ ' +
        'PRO/TRIAL về BASIC, tắt chế độ giá ' +
        'tự động và xử lý nhân viên vượt hạn mức.',
    },
  ];

  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Vòng đời gói dịch vụ"
        description={'Tham chiếu quy trình hiện tại của ' + 'SubscriptionsService và JobsService.'}
        icon={<ClockCountdown size={25} weight="duotone" />}
      />

      <Card variant="outlined">
        <CardContent
          sx={{
            p: 3,
            '&:last-child': { pb: 3 },
          }}
        >
          <Stack spacing={3}>
            {events.map((event, index) => (
              <Stack
                key={event.title}
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'flex-start',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    flexShrink: 0,
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {index + 1}
                </Box>

                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{event.title}</Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 0.75,
                      fontSize: 12,
                      lineHeight: 1.85,
                    }}
                  >
                    {event.description}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ======================================
          THAM CHIẾU TRẠNG THÁI
          ====================================== */}

      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
        }}
      >
        Trạng thái trong SubscriptionEntity
      </Typography>

      <Grid container spacing={2}>
        {SUBSCRIPTION_STATUSES.map((item) => (
          <Grid key={item.status} size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Chip
                    size="small"
                    label={item.label}
                    color={item.color}
                    variant="outlined"
                    sx={{
                      alignSelf: 'flex-start',
                    }}
                  />

                  <Typography
                    component="code"
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {item.status}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.8,
                    }}
                  >
                    {item.description}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="warning" variant="outlined">
        Backend hiện tạo hóa đơn với trạng thái PAID ngay trong upgradeToPro và renewPro. Trước khi
        sử dụng cho thanh toán thật, cần kiểm tra lại việc xác nhận giao dịch qua cổng thanh toán và
        đối soát hóa đơn.
      </Alert>

      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={1.5}
      >
        <Button disabled variant="contained" fullWidth>
          Gia hạn cho cửa hàng
        </Button>

        <Button disabled variant="outlined" fullWidth>
          Thay đổi quota
        </Button>
      </Stack>
    </Stack>
  );
}

// =====================================================
// 13. COMPONENT SUBSCRIPTIONS PAGE
// =====================================================

export function SubscriptionsPage() {
  // ---------------------------------------------------
  // Tab đang được chọn
  // ---------------------------------------------------

  const [activeTab, setActiveTab] = useState<SubscriptionsTab>('subscriptions');

  // ---------------------------------------------------
  // Gói được chọn để so sánh quota
  // ---------------------------------------------------

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('BASIC');

  // ---------------------------------------------------
  // Drawer thông tin quota
  // ---------------------------------------------------

  const [selectedQuota, setSelectedQuota] = useState<QuotaDefinition | null>(null);

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
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          justifyContent: 'space-between',
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
            Gói dịch vụ & Quota
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Quản lý gói SaaS, hạn mức sử dụng, hóa đơn và vòng đời subscription.
          </Typography>
        </Box>

        <Chip
          label="Chờ API Admin"
          icon={<ShieldWarning size={17} />}
          variant="outlined"
          color="warning"
        />
      </Stack>

      {/* ======================================
          KPI TOÀN SÀN
          ====================================== */}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng cửa hàng dùng Pro"
            icon={<Storefront size={26} weight="duotone" />}
            tone="primary"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Cửa hàng đang dùng thử"
            icon={<ClockCountdown size={26} weight="duotone" />}
            tone="warning"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Subscription đang hoạt động"
            icon={<UsersThree size={26} weight="duotone" />}
            tone="success"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Doanh thu thuê bao"
            icon={<CurrencyDollar size={26} weight="duotone" />}
            status="unsupported"
          />
        </Grid>
      </Grid>

      {/* ======================================
          LƯU Ý PHẠM VI
          ====================================== */}

      <Alert severity="info" variant="outlined">
        Các KPI toàn sàn chưa có API Admin phù hợp. Các bảng quota bên dưới lấy từ cấu hình mặc định
        của Backend, không phải dữ liệu sử dụng thời gian thực hoặc cấu hình ghi đè trong cơ sở dữ
        liệu.
      </Alert>

      {/* ======================================
          SO SÁNH CÁC GÓI
          ====================================== */}

      <Stack spacing={2}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
          }}
        >
          <Info size={20} color="#635BFF" />

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            Các gói dịch vụ
          </Typography>
        </Stack>

        <Grid container spacing={2.5}>
          {PLANS.map((plan) => (
            <Grid key={plan.id} size={{ xs: 12, md: 4 }}>
              <PlanCard
                plan={plan}
                selected={selectedPlan === plan.id}
                onSelect={() => {
                  setSelectedPlan(plan.id);
                  setActiveTab('quotas');
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Stack>

      {/* ======================================
          CÁC TAB QUẢN LÝ
          ====================================== */}

      <Card>
        <Box sx={{ px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: SubscriptionsTab) => {
              setActiveTab(value);
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Quản trị gói SaaS và Quota"
          >
            <Tab value="subscriptions" label="Danh sách đăng ký" />

            <Tab value="quotas" label="So sánh Quota" />

            <Tab value="invoices" label="Hóa đơn" />

            <Tab value="lifecycle" label="Vòng đời gói" />
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
          {activeTab === 'subscriptions' && <SubscriptionsListTab />}

          {activeTab === 'quotas' && (
            <QuotasTab selectedPlan={selectedPlan} onSelectQuota={setSelectedQuota} />
          )}

          {activeTab === 'invoices' && <InvoicesTab />}

          {activeTab === 'lifecycle' && <LifecycleTab />}
        </Box>
      </Card>

      {/* ======================================
          GHI CHÚ BẢO MẬT
          ====================================== */}

      <Alert
        severity="warning"
        variant="outlined"
        icon={<ShieldWarning size={22} weight="duotone" />}
      >
        Mọi thao tác thay đổi gói, quota, thời hạn hoặc hóa đơn trên toàn sàn cần endpoint dành cho
        ADMIN, xác thực JWT, phân quyền và Audit Logs. Không sử dụng token của cửa hàng khác hoặc
        API STORE_USER để thực hiện thao tác thay cho Super Admin.
      </Alert>

      {/* ======================================
          DRAWER CHI TIẾT QUOTA
          ====================================== */}

      <QuotaDetailDrawer
        quota={selectedQuota}
        onClose={() => {
          setSelectedQuota(null);
        }}
      />
    </Stack>
  );
}

export default SubscriptionsPage;
