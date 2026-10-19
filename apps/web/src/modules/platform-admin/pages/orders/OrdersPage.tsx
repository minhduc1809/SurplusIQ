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
  ClockCountdown,
  CurrencyDollar,
  Eye,
  HandPalm,
  Info,
  MagnifyingGlass,
  Package,
  ShieldWarning,
  ShoppingCart,
  Warning,
} from '@phosphor-icons/react';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

/**
 * Các tab của phân hệ quản lý đơn hàng.
 */
type OrdersTab = 'orders' | 'statuses' | 'controls';

/**
 * Các trạng thái được định nghĩa trực tiếp
 * trong OrderStatus của Backend SurplusIQ.
 */
type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PICKED_UP'
  | 'HOLD_EXPIRED'
  | 'PICKUP_EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

/**
 * Màu hiển thị theo ngữ nghĩa của giao diện.
 *
 * Màu không đại diện cho quy tắc chuyển trạng thái
 * hay kết quả thanh toán được xác minh.
 */
type StatusColor = 'default' | 'primary' | 'success' | 'warning' | 'error';

interface OrderStatusDefinition {
  status: OrderStatus;
  label: string;
  description: string;
  color: StatusColor;
}

interface FeatureAvailability {
  title: string;
  description: string;
  available: boolean;
  backendEndpoint?: string;
}

// =====================================================
// 2. CẤU HÌNH TRẠNG THÁI ĐƠN HÀNG
// =====================================================

/**
 * Danh sách bảy trạng thái được lấy từ enum
 * OrderStatus của Backend.
 *
 * Phần mô tả chỉ giải thích ý nghĩa của tên
 * trạng thái, không định nghĩa một sơ đồ
 * chuyển trạng thái mới.
 */
const ORDER_STATUSES: readonly OrderStatusDefinition[] = [
  {
    status: 'PENDING_PAYMENT',
    label: 'Chờ thanh toán',
    description: 'Đơn hàng đang ở trạng thái chờ thanh toán.',
    color: 'warning',
  },
  {
    status: 'PAID',
    label: 'Đã thanh toán',
    description: 'Đơn hàng đã được ghi nhận ở trạng thái thanh toán.',
    color: 'primary',
  },
  {
    status: 'PICKED_UP',
    label: 'Đã nhận hàng',
    description: 'Đơn hàng được ghi nhận đã hoàn tất nhận hàng.',
    color: 'success',
  },
  {
    status: 'HOLD_EXPIRED',
    label: 'Hết hạn giữ suất',
    description: 'Thời hạn giữ suất của đơn hàng đã kết thúc.',
    color: 'default',
  },
  {
    status: 'PICKUP_EXPIRED',
    label: 'Quá hạn nhận hàng',
    description: 'Đơn hàng đã được ghi nhận quá hạn nhận hàng.',
    color: 'warning',
  },
  {
    status: 'CANCELLED',
    label: 'Đã hủy',
    description: 'Đơn hàng được ghi nhận ở trạng thái hủy.',
    color: 'error',
  },
  {
    status: 'REFUNDED',
    label: 'Đã hoàn tiền',
    description: 'Đơn hàng được ghi nhận ở trạng thái hoàn tiền.',
    color: 'success',
  },
];

// =====================================================
// 3. DANH SÁCH KHẢ NĂNG TÍCH HỢP
// =====================================================

/**
 * Các API hiện tại dành cho Customer và Store.
 *
 * Không đánh dấu chúng là API Admin vì Backend
 * có kiểm tra role và channel tương ứng.
 */
const BACKEND_CAPABILITIES: readonly FeatureAvailability[] = [
  {
    title: 'Lịch sử đơn của khách hàng',
    description: 'Được bảo vệ bằng vai trò CUSTOMER.',
    available: true,
    backendEndpoint: 'GET /customer/orders',
  },
  {
    title: 'Danh sách đơn của cửa hàng',
    description: 'Được bảo vệ bằng vai trò STORE_USER và quyền cửa hàng.',
    available: true,
    backendEndpoint: 'GET /store/orders',
  },
  {
    title: 'Chi tiết đơn của cửa hàng',
    description: 'Chỉ dành cho người dùng cửa hàng có quyền phù hợp.',
    available: true,
    backendEndpoint: 'GET /store/orders/:id',
  },
  {
    title: 'Hủy đơn từ phía cửa hàng',
    description: 'Dành cho OWNER hoặc MANAGER của cửa hàng.',
    available: true,
    backendEndpoint: 'POST /store/orders/:id/cancel',
  },
  {
    title: 'Danh sách đơn toàn sàn',
    description: 'Chưa có endpoint quản trị được xác minh.',
    available: false,
  },
  {
    title: 'Can thiệp đơn từ Super Admin',
    description: 'Chưa có endpoint và phân quyền Admin phù hợp.',
    available: false,
  },
  {
    title: 'Kill-switch toàn sàn',
    description: 'Chưa có API điều khiển khẩn cấp được bảo vệ.',
    available: false,
  },
];

// =====================================================
// 4. COMPONENT TIÊU ĐỀ PHÂN HỆ
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
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            mt: 0.5,
            fontSize: 12,
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
// 5. TAB DANH SÁCH ĐƠN HÀNG
// =====================================================

/**
 * Backend chưa có API quản lý đơn hàng toàn sàn
 * cho tài khoản ADMIN.
 *
 * Không gọi API cửa hàng hoặc khách hàng
 * để bỏ qua cơ chế phân quyền Backend.
 *
 * Các bộ lọc được chuẩn bị theo QueryOrdersDto,
 * nhưng chưa được phép gửi request.
 */
function OrdersListTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Danh sách đơn hàng toàn sàn"
        description={'Theo dõi và tra cứu các đơn hàng của nền tảng.'}
        icon={<ShoppingCart size={25} weight="duotone" />}
      />

      <Alert severity="info" variant="outlined" sx={{ borderRadius: '12px' }}>
        Chưa có API dành cho Super Admin để lấy danh sách đơn hàng toàn sàn. Các bộ lọc và thao tác
        xử lý hiện được vô hiệu hóa để không truy cập sai quyền.
      </Alert>

      {/* ======================================
          BỘ LỌC ĐƠN HÀNG
          ====================================== */}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <TextField
            fullWidth
            disabled
            size="small"
            label="Tìm kiếm"
            placeholder="Mã đơn hoặc tên cửa hàng"
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

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField
            fullWidth
            select
            disabled
            size="small"
            label="Trạng thái đơn hàng"
            defaultValue="all"
          >
            <MenuItem value="all">Tất cả trạng thái</MenuItem>

            {ORDER_STATUSES.map((item) => (
              <MenuItem key={item.status} value={item.status}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField
            fullWidth
            disabled
            size="small"
            label="Ngày tạo đơn"
            type="date"
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        </Grid>
      </Grid>

      {/* ======================================
          BẢNG ĐƠN HÀNG
          ====================================== */}

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã đơn hàng</TableCell>
              <TableCell>Cửa hàng</TableCell>
              <TableCell>Khách hàng</TableCell>
              <TableCell align="right">Tổng tiền</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                <Stack
                  sx={{
                    alignItems: 'center',
                  }}
                  spacing={1.5}
                >
                  <ShieldWarning size={36} weight="duotone" color="#F79009" />

                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    Chưa hỗ trợ truy vấn đơn hàng toàn sàn
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                      lineHeight: 1.8,
                      maxWidth: 440,
                    }}
                  >
                    Đây không phải danh sách rỗng. Frontend chưa có endpoint ADMIN phù hợp để tải dữ
                    liệu thực tế.
                  </Typography>
                </Stack>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* ======================================
          CHỨC NĂNG QUẢN TRỊ CHƯA KÍCH HOẠT
          ====================================== */}

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
        <Button disabled variant="outlined" startIcon={<Eye size={18} />}>
          Xem chi tiết đơn
        </Button>

        <Button disabled variant="outlined" startIcon={<ArrowClockwise size={18} />}>
          Tải lại danh sách
        </Button>
      </Stack>
    </Stack>
  );
}

// =====================================================
// 6. DRAWER GIẢI THÍCH TRẠNG THÁI ĐƠN HÀNG
// =====================================================

interface OrderStatusDrawerProps {
  status: OrderStatusDefinition | null;
  onClose: () => void;
}

/**
 * Drawer này trình bày metadata của enum Backend.
 *
 * Không phải Drawer chi tiết một đơn hàng cụ thể.
 */
function OrderStatusDrawer({ status, onClose }: OrderStatusDrawerProps) {
  return (
    <AdminDrawer
      open={status !== null}
      onClose={onClose}
      title={status?.label ?? 'Trạng thái đơn'}
      description="Tham chiếu trạng thái từ Backend"
      overline="ORDER STATUS"
      size="sm"
      icon={<Info size={24} weight="duotone" />}
      footer={
        <Stack
          direction="row"
          sx={{
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Đóng
          </Button>
        </Stack>
      }
    >
      {status && (
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography color="text.secondary" variant="caption">
              Giá trị lưu trong Backend
            </Typography>

            <Box
              component="code"
              sx={{
                p: 2,
                borderRadius: '10px',
                bgcolor: 'action.hover',
                fontSize: 12,
                fontWeight: 700,
                overflowWrap: 'anywhere',
              }}
            >
              {status.status}
            </Box>
          </Stack>

          <Divider />

          <Stack spacing={1}>
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              Ý nghĩa
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 13,
                lineHeight: 1.9,
              }}
            >
              {status.description}
            </Typography>
          </Stack>

          <Alert severity="info" variant="outlined">
            Danh sách trạng thái được lấy từ OrderStatus của Backend. Quyền chuyển trạng thái và các
            điều kiện nghiệp vụ phải được xác minh trong OrdersService trước khi triển khai thao tác
            quản trị.
          </Alert>
        </Stack>
      )}
    </AdminDrawer>
  );
}

// =====================================================
// 7. TAB THAM CHIẾU TRẠNG THÁI
// =====================================================

interface OrderStatusesTabProps {
  onSelect: (status: OrderStatusDefinition) => void;
}

/**
 * Hiển thị trạng thái dựa trên enum thực tế.
 *
 * Không hiển thị số lượng đơn hàng của từng
 * trạng thái vì Backend chưa có API thống kê.
 */
function OrderStatusesTab({ onSelect }: OrderStatusesTabProps) {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Trạng thái đơn hàng"
        description={'Danh mục các trạng thái được khai báo trong Backend.'}
        icon={<ClockCounterClockwise size={25} weight="duotone" />}
      />

      <Grid container spacing={2}>
        {ORDER_STATUSES.map((item) => (
          <Grid key={item.status} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: '14px',
              }}
            >
              <CardContent
                sx={{
                  p: 2.5,
                  '&:last-child': {
                    pb: 2.5,
                  },
                }}
              >
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}

                    spacing={1}
                  >
                    <Chip size="small" color={item.color} label={item.label} variant="outlined" />
                  </Stack>

                  <Typography
                    component="code"
                    sx={{
                      fontSize: 11,
                      color: 'text.secondary',
                      overflowWrap: 'anywhere',
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

                  <Button
                    variant="text"
                    size="small"
                    onClick={() => onSelect(item)}
                    sx={{
                      alignSelf: 'flex-start',
                    }}
                  >
                    Xem giải thích
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

// =====================================================
// 8. THÀNH PHẦN HIỂN THỊ KHẢ NĂNG BACKEND
// =====================================================

/**
 * Phân biệt API đã tồn tại với API mà
 * tài khoản ADMIN thực sự được phép gọi.
 *
 * Một endpoint dành cho Customer hoặc Store
 * không trở thành endpoint Admin chỉ vì tồn tại.
 */
function BackendCapabilityList() {
  return (
    <Card variant="outlined">
      <CardContent
        sx={{
          p: 3,
          '&:last-child': {
            pb: 3,
          },
        }}
      >
        <Stack spacing={2.5}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            Khả năng Backend hiện tại
          </Typography>

          {BACKEND_CAPABILITIES.map((item, index) => (
            <Box key={item.title}>
              {index > 0 && <Divider sx={{ mb: 2 }} />}

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
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{item.title}</Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                      lineHeight: 1.8,
                    }}
                  >
                    {item.description}
                  </Typography>

                  {item.backendEndpoint && (
                    <Typography
                      component="code"
                      sx={{
                        display: 'block',
                        mt: 1,
                        color: 'text.secondary',
                        fontSize: 11,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {item.backendEndpoint}
                    </Typography>
                  )}
                </Box>

                <Chip
                  size="small"
                  variant="outlined"
                  color={item.available ? 'success' : 'warning'}
                  label={item.available ? 'API đã tồn tại' : 'Chưa có API Admin'}
                  sx={{
                    flexShrink: 0,
                  }}
                />
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 9. TAB KIỂM SOÁT VẬN HÀNH
// =====================================================

/**
 * Trang điều hành được thiết kế sẵn cho
 * chức năng kiểm soát khẩn cấp.
 *
 * Không gọi POST /jobs/* vì đây không phải
 * endpoint Kill-switch dành cho ADMIN.
 */
function OrderControlsTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Trung tâm kiểm soát vận hành"
        description={'Tình trạng tích hợp và các thao tác điều hành khẩn cấp.'}
        icon={<HandPalm size={25} weight="duotone" />}
      />

      <Alert
        severity="warning"
        variant="outlined"
        icon={<Warning size={23} weight="duotone" />}
        sx={{ borderRadius: '12px' }}
      >
        Backend chưa có API Kill-switch được bảo vệ dành riêng cho Super Admin. Không được sử dụng
        các endpoint Jobs để thay thế một cách tùy tiện.
      </Alert>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: '14px',
            }}
          >
            <CardContent
              sx={{
                p: 3,
                '&:last-child': { pb: 3 },
              }}
            >
              <Stack spacing={2.5}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                  }}
                >
                  <HandPalm size={27} color="#F04438" weight="duotone" />

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Kill-switch
                  </Typography>
                </Stack>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: 13,
                    lineHeight: 1.85,
                  }}
                >
                  Chức năng dừng khẩn cấp hoạt động đặt đơn trên toàn nền tảng cần API chuyên biệt,
                  phân quyền rõ ràng, xác nhận hai bước và Audit Logs.
                </Typography>

                <Chip
                  size="small"
                  variant="outlined"
                  color="warning"
                  label="Chưa được tích hợp"
                  sx={{ alignSelf: 'flex-start' }}
                />

                <Button
                  disabled
                  variant="contained"
                  color="error"
                  fullWidth
                  startIcon={<HandPalm size={19} />}
                >
                  Dừng đặt đơn toàn sàn
                </Button>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: 11,
                    lineHeight: 1.8,
                  }}
                >
                  Nút không thực hiện request khi Backend chưa có hợp đồng quản trị khẩn cấp phù
                  hợp.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: '14px',
            }}
          >
            <CardContent
              sx={{
                p: 3,
                '&:last-child': { pb: 3 },
              }}
            >
              <Stack spacing={2.5}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'center',
                  }}
                  spacing={1.5}
                >
                  <ClockCountdown size={27} color="#635BFF" weight="duotone" />

                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                    }}
                  >
                    Theo dõi thời gian thực
                  </Typography>
                </Stack>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: 13,
                    lineHeight: 1.85,
                  }}
                >
                  Chức năng giám sát thay đổi trạng thái đơn hàng toàn sàn cần API Admin, cơ chế
                  polling hoặc kênh sự kiện bảo mật.
                </Typography>

                <Chip
                  label="Chưa có luồng dữ liệu Admin"
                  color="warning"
                  size="small"
                  variant="outlined"
                  sx={{ alignSelf: 'flex-start' }}
                />

                <Button
                  fullWidth
                  disabled
                  variant="outlined"
                  startIcon={<ArrowClockwise size={18} />}
                >
                  Đồng bộ đơn hàng
                </Button>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: 11,
                    lineHeight: 1.8,
                  }}
                >
                  Không mô phỏng đơn hàng hoặc trạng thái kết nối thời gian thực.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <BackendCapabilityList />
    </Stack>
  );
}

// =====================================================
// 10. COMPONENT ORDERS PAGE CHÍNH
// =====================================================

export function OrdersPage() {
  // ---------------------------------------------------
  // Tab đang được chọn
  // ---------------------------------------------------

  const [activeTab, setActiveTab] = useState<OrdersTab>('orders');

  // ---------------------------------------------------
  // Trạng thái đang xem trong Drawer
  // ---------------------------------------------------

  const [selectedStatus, setSelectedStatus] = useState<OrderStatusDefinition | null>(null);

  // ---------------------------------------------------
  // Số lượng trạng thái chỉ phục vụ hiển thị
  // danh mục enum, không phải thống kê đơn.
  // ---------------------------------------------------

  const statusDefinitions = useMemo(() => ORDER_STATUSES, []);

  // ===================================================
  // 11. GIAO DIỆN CHÍNH
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
            Quản lý đơn hàng
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Giám sát vận hành đơn hàng và các chức năng kiểm soát toàn sàn.
          </Typography>
        </Box>

        <Chip
          icon={<ShieldWarning size={17} />}
          label="Đang chờ API Admin"
          color="warning"
          variant="outlined"
        />
      </Stack>

      {/* ======================================
          CÁC CHỈ SỐ QUẢN TRỊ
          ====================================== */}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng đơn hàng"
            icon={<ShoppingCart size={26} weight="duotone" />}
            tone="primary"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Đơn chờ thanh toán"
            icon={<ClockCountdown size={26} weight="duotone" />}
            tone="warning"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Đơn đã nhận"
            icon={<Package size={26} weight="duotone" />}
            tone="success"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Giá trị đơn hàng"
            icon={<CurrencyDollar size={26} weight="duotone" />}
            status="unsupported"
          />
        </Grid>
      </Grid>

      {/* ======================================
          GHI CHÚ PHẠM VI DỮ LIỆU
          ====================================== */}

      <Alert
        severity="info"
        variant="outlined"
        icon={<Info size={22} weight="duotone" />}
        sx={{ borderRadius: '12px' }}
      >
        Backend hiện hỗ trợ đơn hàng theo phạm vi Customer và Store. Dashboard Super Admin chưa có
        API đọc đơn hàng toàn sàn, vì vậy tất cả KPI vẫn ở trạng thái chưa hỗ trợ.
      </Alert>

      {/* ======================================
          TABS ĐIỀU HƯỚNG
          ====================================== */}

      <Card>
        <Box sx={{ px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: OrdersTab) => {
              setActiveTab(value);
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Chức năng quản lý đơn hàng"
          >
            <Tab value="orders" label="Danh sách đơn hàng" />

            <Tab value="statuses" label="Trạng thái đơn" />

            <Tab value="controls" label="Kiểm soát vận hành" />
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
          {activeTab === 'orders' && <OrdersListTab />}

          {activeTab === 'statuses' && (
            <OrderStatusesTab
              onSelect={(status) => {
                setSelectedStatus(status);
              }}
            />
          )}

          {activeTab === 'controls' && <OrderControlsTab />}
        </Box>
      </Card>

      {/* ======================================
          GHI CHÚ BẢO MẬT
          ====================================== */}

      <Alert severity="warning" variant="outlined" sx={{ borderRadius: '12px' }}>
        <Stack spacing={1}>
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
            Yêu cầu trước khi triển khai API Admin
          </Typography>

          <Typography
            sx={{
              fontSize: 12,
              lineHeight: 1.85,
            }}
          >
            Các thao tác quản trị đơn hàng cần xác thực JWT, kiểm tra vai trò ADMIN, xác minh quyền
            thực hiện, ghi Audit Logs và xử lý đồng thời an toàn. Không được tái sử dụng API
            Customer hoặc Store để vượt qua phân quyền.
          </Typography>
        </Stack>
      </Alert>

      {/* ======================================
          DRAWER THAM CHIẾU TRẠNG THÁI
          ====================================== */}

      <OrderStatusDrawer
        status={statusDefinitions.find((item) => item.status === selectedStatus?.status) ?? null}
        onClose={() => {
          setSelectedStatus(null);
        }}
      />
    </Stack>
  );
}

export default OrdersPage;
