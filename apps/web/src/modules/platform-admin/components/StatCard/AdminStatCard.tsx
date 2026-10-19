import type { ReactNode } from 'react';

import { Avatar, Box, Card, CardContent, Chip, Skeleton, Stack, Typography } from '@mui/material';

import { alpha } from '@mui/material/styles';

import { ArrowDownRight, ArrowUpRight, ChartBar, Minus } from '@phosphor-icons/react';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

/**
 * Màu sắc biểu thị loại chỉ số.
 *
 * Các màu này sẽ lấy trực tiếp từ Material UI Theme
 * nên tương thích với cả chế độ sáng và tối.
 */
export type AdminStatCardTone = 'primary' | 'success' | 'warning' | 'error' | 'info';

/**
 * Trạng thái dữ liệu của thẻ thống kê.
 *
 * ready:
 *   Backend đã cung cấp dữ liệu hợp lệ.
 *
 * empty:
 *   API hoạt động nhưng không có dữ liệu phù hợp.
 *
 * unsupported:
 *   Backend chưa có API hỗ trợ chỉ số này.
 *
 * error:
 *   Đã gọi API nhưng không lấy được dữ liệu.
 */
export type AdminStatCardStatus = 'ready' | 'empty' | 'unsupported' | 'error';

/**
 * Thông tin biến động của chỉ số.
 *
 * changePercent:
 *   Phần trăm thay đổi so với kỳ đối chiếu.
 *
 * positiveWhen:
 *   Xác định tăng hay giảm mới là tín hiệu tích cực.
 *
 * Ví dụ:
 * - Doanh thu tăng là tốt.
 * - Số khiếu nại giảm là tốt.
 */
export interface AdminStatTrend {
  changePercent: number;

  label?: string;

  positiveWhen?: 'increase' | 'decrease';
}

export interface AdminStatCardProps {
  // Tên chỉ số sẽ xuất hiện phía trên giá trị.
  title: string;

  // Dữ liệu thực tế lấy từ API hoặc tính từ dữ liệu API.
  value?: string | number | null;

  // Biểu tượng Phosphor Icons hoặc ReactNode bất kỳ.
  icon?: ReactNode;

  // Màu chủ đạo của biểu tượng.
  tone?: AdminStatCardTone;

  // Mô tả bổ sung bên dưới giá trị.
  description?: string;

  // Dữ liệu tăng trưởng nếu Backend có thông tin.
  trend?: AdminStatTrend;

  // Hiển thị trạng thái đang tải dữ liệu.
  loading?: boolean;

  // Trạng thái hỗ trợ hoặc kết quả API.
  status?: AdminStatCardStatus;
}

// =====================================================
// 2. ĐỊNH DẠNG SỐ LIỆU
// =====================================================

/**
 * Hiển thị số theo định dạng Việt Nam.
 *
 * Ví dụ:
 * 1250000 => "1.250.000"
 * 1234.5  => "1.234,5"
 *
 * Nếu muốn hiển thị tiền tệ, component cha
 * có thể truyền chuỗi "1.250.000 ₫".
 */
function formatStatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return '—';
    }

    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 2,
    }).format(value);
  }

  return value.trim() || '—';
}

/**
 * Kiểm tra có dữ liệu hợp lệ để hiển thị hay không.
 *
 * Lưu ý: Giá trị 0 là dữ liệu hợp lệ,
 * không được xem là trạng thái rỗng.
 */
function hasValidValue(value: string | number | null | undefined): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return false;
}

// =====================================================
// 3. HIỂN THỊ XU HƯỚNG TĂNG / GIẢM
// =====================================================

interface StatTrendIndicatorProps {
  trend: AdminStatTrend;
}

/**
 * Hiển thị xu hướng và tự xác định màu sắc.
 *
 * Không mặc định mọi chỉ số tăng đều là tốt.
 * Ví dụ số lượng khiếu nại tăng sẽ có màu đỏ.
 */
function StatTrendIndicator({ trend }: StatTrendIndicatorProps) {
  const { changePercent, label = 'So với kỳ trước', positiveWhen = 'increase' } = trend;

  // Không hiển thị biến động không hợp lệ.
  if (!Number.isFinite(changePercent)) {
    return null;
  }

  const isIncrease = changePercent > 0;
  const isDecrease = changePercent < 0;
  const isNeutral = changePercent === 0;

  const isPositive =
    (isIncrease && positiveWhen === 'increase') || (isDecrease && positiveWhen === 'decrease');

  const trendColor = isNeutral ? 'text.secondary' : isPositive ? 'success.main' : 'error.main';

  const TrendIcon = isNeutral ? Minus : isIncrease ? ArrowUpRight : ArrowDownRight;

  const absolutePercent = Math.abs(changePercent);

  const percentText = absolutePercent.toLocaleString('vi-VN', {
    maximumFractionDigits: 1,
  });

  const prefix = isIncrease ? '+' : isDecrease ? '−' : '';

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Stack
        direction="row"

        spacing={0.4}
        sx={{
          alignItems: 'center',
          color: trendColor,
        }}
      >
        <TrendIcon size={18} weight="bold" />

        <Typography
          component="span"
          sx={{
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {prefix}
          {percentText}%
        </Typography>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

// =====================================================
// 4. TRẠNG THÁI LOADING
// =====================================================

/**
 * Hiển thị Skeleton đúng bố cục KPI Card.
 *
 * Skeleton giúp tránh việc giao diện nhảy layout
 * trong lúc đang lấy dữ liệu từ Backend.
 */
function AdminStatCardSkeleton({ title }: { title: string }) {
  return (
    <Card
      role="group"
      aria-label={title}
      aria-busy="true"
      sx={{
        height: '100%',
        minHeight: 184,
      }}
    >
      <CardContent
        sx={{
          p: 3,
          '&:last-child': {
            pb: 3,
          },
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction="row"
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}

            spacing={2}
          >
            <Stack spacing={1.5} sx={{ flex: 1 }}>
              <Typography variant="overline" color="text.secondary">
                {title}
              </Typography>

              <Skeleton variant="text" width="75%" height={44} />
            </Stack>

            <Skeleton
              variant="rounded"
              width={56}
              height={56}
              sx={{
                flexShrink: 0,
                borderRadius: '16px',
              }}
            />
          </Stack>

          <Skeleton variant="text" width="58%" height={22} />
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 5. TRẠNG THÁI DỮ LIỆU
// =====================================================

/**
 * Nội dung giải thích trạng thái của API.
 */
const STATUS_MESSAGES: Record<Exclude<AdminStatCardStatus, 'ready'>, string> = {
  empty: 'Chưa có dữ liệu trong phạm vi hiện tại.',

  unsupported: 'Backend chưa cung cấp API cho chỉ số này.',

  error: 'Không thể tải dữ liệu từ máy chủ.',
};

const STATUS_LABELS: Record<Exclude<AdminStatCardStatus, 'ready'>, string> = {
  empty: 'Không có dữ liệu',

  unsupported: 'Chưa hỗ trợ',

  error: 'Lỗi tải dữ liệu',
};

// =====================================================
// 6. COMPONENT KPI CARD CHÍNH
// =====================================================

export function AdminStatCard({
  title,
  value,
  icon,
  tone = 'primary',
  description,
  trend,
  loading = false,
  status = 'ready',
}: AdminStatCardProps) {
  // Nếu đang tải, ưu tiên hiển thị Skeleton.
  if (loading) {
    return <AdminStatCardSkeleton title={title} />;
  }

  // Giá trị không hợp lệ sẽ trở thành trạng thái empty.
  const resolvedStatus: AdminStatCardStatus =
    status === 'ready' && !hasValidValue(value) ? 'empty' : status;

  const isReady = resolvedStatus === 'ready';

  const displayValue = isReady ? formatStatValue(value) : '—';

  const statusMessage = isReady ? null : STATUS_MESSAGES[resolvedStatus];

  const statusLabel = isReady ? null : STATUS_LABELS[resolvedStatus];

  return (
    <Card
      role="group"
      aria-label={title}
      sx={{
        height: '100%',
        minHeight: 184,
        transition: 'box-shadow 180ms ease, transform 180ms ease',

        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 26px rgba(16, 24, 40, 0.09)',
        },
      }}
    >
      <CardContent
        sx={{
          p: 3,
          height: '100%',

          '&:last-child': {
            pb: 3,
          },
        }}
      >
        <Stack
          spacing={2.5}
          sx={{
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          {/* ========================================
              PHẦN TIÊU ĐỀ VÀ GIÁ TRỊ
              ======================================== */}

          <Stack
            direction="row"
            sx={{
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}

            spacing={2}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <Typography
                component="h3"
                variant="overline"
                color="text.secondary"
                sx={{
                  display: 'block',
                  lineHeight: 1.5,
                  mb: 1.25,
                }}
              >
                {title}
              </Typography>

              <Typography
                component="p"
                variant="h4"
                sx={{
                  fontSize: {
                    xs: 25,
                    md: 30,
                  },
                  fontWeight: 700,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.3,
                  overflowWrap: 'anywhere',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {displayValue}
              </Typography>
            </Box>

            {/* BIỂU TƯỢNG KPI */}

            <Avatar
              variant="rounded"
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                flexShrink: 0,

                bgcolor: (theme) => alpha(theme.palette[tone].main, 0.12),

                color: `${tone}.main`,
              }}
            >
              {icon ?? <ChartBar size={27} weight="duotone" />}
            </Avatar>
          </Stack>

          {/* ========================================
              PHẦN XU HƯỚNG VÀ TRẠNG THÁI
              ======================================== */}

          <Box>
            {isReady ? (
              <Stack spacing={1}>
                {/* Chỉ hiển thị tăng trưởng khi
                    có dữ liệu biến động thực tế. */}

                {trend && <StatTrendIndicator trend={trend} />}

                {description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {description}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Stack
                sx={{
                  alignItems: 'flex-start',
                }}
                spacing={1}
              >
                <Chip
                  label={statusLabel}
                  size="small"
                  color={resolvedStatus === 'error' ? 'error' : 'default'}
                  variant="outlined"
                />

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.6,
                  }}
                >
                  {statusMessage}
                </Typography>
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default AdminStatCard;
