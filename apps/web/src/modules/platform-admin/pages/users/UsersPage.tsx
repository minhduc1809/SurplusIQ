import { useEffect, useState } from 'react';

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
  Pagination,
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
  Devices,
  IdentificationCard,
  Key,
  LockKey,
  MagnifyingGlass,
  ShieldCheck,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

import { useAdminAuth } from '../../auth/AdminAuthProvider';

import type { AdminSession } from '../../api/admin-auth.api';

import {
  getAdminCollection,
  getAdminMetricsOverview,
  type AdminMetricsOverview,
  type AdminCollectionResponse,
} from '../../api/admin-management.api';

// =====================================================
// 1. CẤU HÌNH PHÂN HỆ
// =====================================================

/**
 * Các tab trong phân hệ quản lý người dùng.
 */
type UsersTab = 'users' | 'account' | 'security';

/**
 * Những role thực tế được khai báo
 * trong UserRole của Backend SurplusIQ.
 */
const USER_ROLES = ['CUSTOMER', 'STORE_USER', 'ADMIN'] as const;

/**
 * Những trạng thái tài khoản thực tế
 * được khai báo trong UserStatus.
 */
const USER_STATUSES = [
  'PENDING_VERIFY',
  'ACTIVE',
  'PENDING_DELETE',
  'ANONYMIZED',
  'LOCKED',
] as const;

// =====================================================
// 2. HÀM TIỆN ÍCH
// =====================================================

/**
 * Hiển thị giá trị dạng văn bản.
 *
 * Không tự tạo dữ liệu mặc định như
 * số điện thoại hoặc tên người dùng giả.
 */
function displayValue(value: string | null | undefined): string {
  return value?.trim() || 'Chưa có thông tin';
}

/**
 * Ẩn bớt deviceId để hạn chế hiển thị
 * định danh phiên không cần thiết.
 *
 * DeviceId không phải access token
 * hoặc refresh token.
 */
function maskDeviceId(deviceId: string): string {
  if (deviceId.length <= 12) {
    return '••••••••';
  }

  return `${deviceId.slice(0, 8)}…` + deviceId.slice(-4);
}

// =====================================================
// 3. COMPONENT SECTION HEADER
// =====================================================

interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

function SectionHeader({ icon, title, description }: SectionHeaderProps) {
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
          borderRadius: '12px',
          bgcolor: 'action.hover',
          color: 'primary.main',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        {description && (
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
        )}
      </Box>
    </Stack>
  );
}

// =====================================================
// 4. HIỂN THỊ TRƯỜNG THÔNG TIN
// =====================================================

interface DetailFieldProps {
  label: string;
  value: string;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>

      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 600,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

// =====================================================
// 5. DRAWER CHI TIẾT TÀI KHOẢN HIỆN TẠI
// =====================================================

interface CurrentAccountDrawerProps {
  open: boolean;
  onClose: () => void;
  session: AdminSession | null;
}

/**
 * Drawer chỉ hiển thị thông tin được lấy
 * từ phiên đăng nhập hiện tại.
 *
 * Không gửi request lấy dữ liệu người dùng
 * khác và không cho sửa role tại Frontend.
 */
function CurrentAccountDrawer({ open, onClose, session }: CurrentAccountDrawerProps) {
  const user = session?.user;

  return (
    <AdminDrawer
      open={open && session !== null}
      onClose={onClose}
      title="Chi tiết tài khoản"
      description="Thông tin tài khoản Admin hiện tại"
      overline="CURRENT ACCOUNT"
      icon={<UserCircle size={25} weight="duotone" />}
      size="md"
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
      <Stack spacing={2.5}>
        <Alert severity="info" variant="outlined">
          Thông tin được lấy từ phiên đăng nhập hiện tại, không phải từ API quản lý toàn bộ người
          dùng.
        </Alert>

        <DetailField label="User ID" value={displayValue(user?.id)} />

        <Divider />

        <DetailField label="Email" value={displayValue(user?.email)} />

        <Divider />

        <DetailField label="Số điện thoại" value={displayValue(user?.phone)} />

        <Divider />

        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Vai trò
          </Typography>

          <Chip
            label={user?.role ?? 'Không xác định'}
            color="success"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          />
        </Stack>

        <Divider />

        <DetailField
          label="Định danh thiết bị"
          value={session ? maskDeviceId(session.deviceId) : 'Không xác định'}
        />

        <Alert severity="warning" variant="outlined">
          Backend chưa trả về trạng thái tài khoản, lần đăng nhập cuối hoặc cấu hình 2FA trong
          response đăng nhập.
        </Alert>
      </Stack>
    </AdminDrawer>
  );
}

// =====================================================
// 6. TAB DANH SÁCH NGƯỜI DÙNG
// =====================================================

/**
 * Backend chưa có API danh sách người dùng
 * toàn sàn dành cho Super Admin.
 *
 * Vì vậy, hiển thị trạng thái chưa hỗ trợ,
 * không tạo dữ liệu giả hoặc bảng rỗng
 * khiến người xem hiểu nhầm không có user.
 */
function UsersListTab() {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<AdminCollectionResponse | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getAdminCollection('users', {
      page,
      limit: 10,
      search: search.trim() || undefined,
      status: roleFilter !== 'all' ? roleFilter : statusFilter !== 'all' ? statusFilter : undefined,
    })
      .then((res) => {
        if (active) {
          setCollectionData(res);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách người dùng:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, search, roleFilter, statusFilter]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(keyword);
  };

  const users = collectionData?.items || [];

  return (
    <Stack spacing={3}>
      <SectionHeader
        icon={<UsersThree size={25} weight="duotone" />}
        title="Danh sách người dùng"
        description={'Quản lý tài khoản khách hàng, nhân viên cửa hàng và quản trị viên hệ thống.'}
      />

      {/* ======================================
          BỘ LỌC TÌM KIẾM
          ====================================== */}
      <Box component="form" onSubmit={handleSearchSubmit}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Tìm kiếm người dùng"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Email, số điện thoại, ID..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MagnifyingGlass size={18} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <Button size="small" type="submit" variant="text">
                      Tìm
                    </Button>
                  ),
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Vai trò"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">Tất cả vai trò</MenuItem>
              {USER_ROLES.map((role) => (
                <MenuItem key={role} value={role}>
                  {role}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">Tất cả trạng thái</MenuItem>
              {USER_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {/* ======================================
          BẢNG DANH SÁCH
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
              <TableCell>Người dùng</TableCell>
              <TableCell>Số điện thoại</TableCell>
              <TableCell>Vai trò</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Ngày tạo</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    Không tìm thấy người dùng phù hợp.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((row: any) => {
                const roleColor =
                  row.role === 'ADMIN'
                    ? 'error'
                    : row.role === 'STORE_USER'
                      ? 'warning'
                      : 'primary';
                const statusColor =
                  row.status === 'ACTIVE'
                    ? 'success'
                    : row.status === 'LOCKED'
                      ? 'error'
                      : 'default';

                return (
                  <TableRow key={String(row.id)} hover>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                          {row.email || 'Chưa liên kết email'}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          ID: {String(row.id).slice(0, 8)}…
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 13 }}>{row.phone || '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={String(row.role)}
                        color={roleColor}
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={String(row.status)}
                        color={statusColor}
                        variant="filled"
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {row.created_at
                          ? new Date(String(row.created_at)).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ======================================
          PHÂN TRANG
          ====================================== */}
      {collectionData && collectionData.totalPages > 1 && (
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Hiển thị {users.length} trên tổng số {collectionData.total} tài khoản
          </Typography>
          <Pagination
            count={collectionData.totalPages}
            page={page}
            onChange={(_, val) => setPage(val)}
            color="primary"
            size="small"
          />
        </Stack>
      )}
    </Stack>
  );
}

// =====================================================
// 7. TAB TÀI KHOẢN HIỆN TẠI
// =====================================================

interface CurrentAccountTabProps {
  session: AdminSession | null;
  onOpenDetails: () => void;
}

/**
 * Sử dụng dữ liệu thực tế có trong Auth Context.
 *
 * Không tự gán UserStatus.ACTIVE vì Backend
 * không trả trường status khi đăng nhập.
 */
function CurrentAccountTab({ session, onOpenDetails }: CurrentAccountTabProps) {
  const user = session?.user;

  return (
    <Stack spacing={3}>
      <SectionHeader
        icon={<IdentificationCard size={25} weight="duotone" />}
        title="Tài khoản đang đăng nhập"
        description={'Thông tin phiên Super Admin ' + 'được lưu bởi Authentication Provider.'}
      />

      {!user ? (
        <Alert severity="warning">Không có thông tin tài khoản Admin trong phiên hiện tại.</Alert>
      ) : (
        <Card variant="outlined">
          <CardContent
            sx={{
              p: 3,
              '&:last-child': { pb: 3 },
            }}
          >
            <Stack spacing={3}>
              <Stack
                direction={{
                  xs: 'column',
                  sm: 'row',
                }}
                spacing={2}
                sx={{
                  alignItems: {
                    xs: 'flex-start',
                    sm: 'center',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '16px',
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <UserCircle size={32} weight="duotone" />
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 17,
                      fontWeight: 700,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {displayValue(user.email)}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      fontSize: 12,
                    }}
                  >
                    Tài khoản quản trị hiện tại
                  </Typography>
                </Box>

                <Chip
                  icon={<ShieldCheck size={16} />}
                  label="ADMIN"
                  color="success"
                  variant="outlined"
                  size="small"
                />
              </Stack>

              <Divider />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailField label="User ID" value={user.id} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailField label="Email" value={displayValue(user.email)} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailField label="Số điện thoại" value={displayValue(user.phone)} />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <DetailField label="Vai trò" value={user.role} />
                </Grid>
              </Grid>

              <Divider />

              <Stack
                direction="row"
                sx={{
                  justifyContent: 'flex-end',
                }}
              >
                <Button variant="outlined" onClick={onOpenDetails}>
                  Xem chi tiết tài khoản
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

// =====================================================
// 8. TAB AN NINH VÀ PHIÊN ĐĂNG NHẬP
// =====================================================

interface SecurityTabProps {
  session: AdminSession | null;
  onRecheckSession: () => void;
  checking: boolean;
}

/**
 * Chỉ hiển thị định danh phiên Frontend.
 *
 * Không gọi GET /me/sessions vì Backend
 * hiện tin vào header x-user-id và trả
 * trực tiếp RefreshTokenEntity có tokenHash.
 */
function SecurityTab({ session, onRecheckSession, checking }: SecurityTabProps) {
  return (
    <Stack spacing={3}>
      <SectionHeader
        icon={<LockKey size={25} weight="duotone" />}
        title="An ninh & phiên đăng nhập"
        description={'Theo dõi phiên cục bộ và ' + 'các chức năng bảo mật cần hoàn thiện.'}
      />

      {/* ======================================
          PHIÊN ĐĂNG NHẬP HIỆN TẠI
          ====================================== */}

      <Card variant="outlined">
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
              <Devices size={24} color="#635BFF" weight="duotone" />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                }}
              >
                Phiên trên thiết bị này
              </Typography>
            </Stack>

            <Alert severity="info" variant="outlined">
              Đây là thông tin phiên đã lưu trên trình duyệt, không phải danh sách các phiên toàn hệ
              thống.
            </Alert>

            <DetailField
              label="Device ID"
              value={session ? maskDeviceId(session.deviceId) : 'Không có phiên'}
            />

            <DetailField label="Tài khoản" value={displayValue(session?.user.email)} />

            <Divider />

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              sx={{
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="outlined"
                disabled={checking || !session}
                startIcon={<ArrowClockwise size={18} />}
                onClick={onRecheckSession}
              >
                Kiểm tra lại phiên
              </Button>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.8,
              }}
            >
              Thao tác này sử dụng cơ chế khôi phục phiên đã triển khai trong Authentication
              Provider, thông qua POST /auth/refresh.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* ======================================
          QUẢN LÝ CÁC PHIÊN KHÁC
          ====================================== */}

      <Card variant="outlined">
        <CardContent
          sx={{
            p: 3,
            '&:last-child': { pb: 3 },
          }}
        >
          <Stack spacing={2}>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
              }}
              spacing={1.5}
            >
              <Key size={24} color="#F79009" weight="duotone" />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                }}
              >
                Quản lý phiên & 2FA
              </Typography>
            </Stack>

            <Alert severity="warning" variant="outlined">
              Các endpoint quản lý phiên và cấu hình 2FA hiện chưa đáp ứng yêu cầu bảo mật để tích
              hợp vào giao diện Super Admin.
            </Alert>

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1.5}
            >
              <Button disabled variant="outlined">
                Xem các phiên đăng nhập
              </Button>

              <Button disabled variant="outlined" color="error">
                Thu hồi phiên khác
              </Button>

              <Button disabled variant="outlined">
                Cấu hình 2FA
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// =====================================================
// 9. COMPONENT CHÍNH
// =====================================================

export function UsersPage() {
  // ---------------------------------------------------
  // Lấy thông tin phiên đã xác thực
  // ---------------------------------------------------

  const { user, session, isLoading, retryRestore } = useAdminAuth();

  // ---------------------------------------------------
  // Trạng thái tab
  // ---------------------------------------------------

  const [activeTab, setActiveTab] = useState<UsersTab>('users');

  // ---------------------------------------------------
  // Trạng thái Drawer
  // ---------------------------------------------------

  const [detailOpen, setDetailOpen] = useState(false);

  // ---------------------------------------------------
  // Metrics từ Backend API
  // ---------------------------------------------------

  const [metrics, setMetrics] = useState<AdminMetricsOverview['users'] | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingMetrics(true);
    getAdminMetricsOverview()
      .then((data) => {
        if (active) setMetrics(data.users);
      })
      .catch((err) => {
        console.error('Lỗi tải metrics người dùng:', err);
      })
      .finally(() => {
        if (active) setLoadingMetrics(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // ===================================================
  // 10. KIỂM TRA LẠI PHIÊN
  // ===================================================

  /**
   * Chỉ sử dụng cơ chế refresh token
   * đã có trong AdminAuthProvider.
   *
   * Không gọi endpoint quản lý phiên
   * thiếu kiểm tra quyền sở hữu tài khoản.
   */
  const handleRecheckSession = () => {
    void retryRestore();
  };

  // ===================================================
  // 11. GIAO DIỆN
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
            Người dùng & An ninh
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Quản lý tài khoản, phân quyền và bảo mật hệ thống SurplusIQ.
          </Typography>
        </Box>

        <Button variant="contained" disabled startIcon={<UsersThree size={18} />}>
          Tạo tài khoản
        </Button>
      </Stack>

      {/* ======================================
          KPI CARDS
          ====================================== */}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng người dùng"
            value={metrics ? metrics.total.toLocaleString('vi-VN') : '—'}
            icon={<UsersThree size={26} weight="duotone" />}
            tone="primary"
            loading={loadingMetrics}
            status="ready"
            description="Toàn bộ tài khoản trên sàn"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tài khoản đang hoạt động"
            value={metrics ? metrics.active.toLocaleString('vi-VN') : '—'}
            icon={<UserCircle size={26} weight="duotone" />}
            tone="success"
            loading={loadingMetrics}
            status="ready"
            description="Tài khoản trạng thái ACTIVE"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tài khoản bị khóa"
            value={metrics ? metrics.locked.toLocaleString('vi-VN') : '—'}
            icon={<LockKey size={26} weight="duotone" />}
            tone="warning"
            loading={loadingMetrics}
            status="ready"
            description="Tạm khóa hoặc vi phạm quy tắc"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Phiên đăng nhập hệ thống"
            value={metrics ? metrics.sessions.toLocaleString('vi-VN') : '—'}
            icon={<Devices size={26} weight="duotone" />}
            loading={loadingMetrics}
            status="ready"
            description="Thiết bị & phiên hoạt động gần đây"
          />
        </Grid>
      </Grid>

      {/* ======================================
          TÀI KHOẢN ĐANG ĐĂNG NHẬP
          ====================================== */}

      {user && (
        <Alert
          severity="success"
          variant="outlined"
          icon={<ShieldCheck size={22} weight="duotone" />}
          sx={{ borderRadius: '12px' }}
        >
          Đang sử dụng phiên Frontend của tài khoản <strong>{displayValue(user.email)}</strong> với
          vai trò <strong>{user.role}</strong>. Đây không phải thống kê người dùng toàn sàn.
        </Alert>
      )}

      {/* ======================================
          NỘI DUNG CÁC TAB
          ====================================== */}

      <Card>
        <Tabs
          value={activeTab}
          onChange={(_, value: UsersTab) => {
            setActiveTab(value);
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Tab value="users" label="Danh sách người dùng" />

          <Tab value="account" label="Tài khoản hiện tại" />

          <Tab value="security" label="An ninh & Phiên" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 'users' && <UsersListTab />}

          {activeTab === 'account' && (
            <CurrentAccountTab session={session} onOpenDetails={() => setDetailOpen(true)} />
          )}

          {activeTab === 'security' && (
            <SecurityTab
              session={session}
              checking={isLoading}
              onRecheckSession={handleRecheckSession}
            />
          )}
        </Box>
      </Card>

      {/* ======================================
          THÔNG TIN TÍCH HỢP
          ====================================== */}

      <Alert severity="info" variant="outlined" sx={{ borderRadius: '12px' }}>
        Phân hệ Users chỉ sử dụng thông tin phiên Admin đã đăng nhập. Các API quản trị người dùng
        toàn sàn cần được Backend bổ sung với xác thực JWT, Role Guards và Audit Logs.
      </Alert>

      {/* ======================================
          DRAWER CHI TIẾT TÀI KHOẢN
          ====================================== */}

      <CurrentAccountDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        session={session}
      />
    </Stack>
  );
}

export default UsersPage;
