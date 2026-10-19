import { useEffect, useRef, useState } from 'react';

import type { FormEvent } from 'react';

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
  ClockCountdown,
  MagnifyingGlass,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  ShieldWarning,
  Storefront,
  UsersThree,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

import { AdminApiError, adminApi } from '../../api/admin-api.client';

// =====================================================
// 1. KIỂU DỮ LIỆU THEO BACKEND
// =====================================================

/**
 * Thông tin cửa hàng do API công khai trả về.
 *
 * GET /customer/stores/:id
 *
 * Đây không phải hồ sơ quản trị đầy đủ
 * và không bao gồm trạng thái KYC.
 */
interface PublicStore {
  id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl: string | null;
  openHours: Record<string, unknown> | null;
  status: 'ACTIVE';
  averageRating: number;
  reviewsCount: number;
}

/**
 * Deal đang mở của cửa hàng.
 */
interface PublicStoreDeal {
  id: string;
  title: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  remainingQuantity: number;
  pickupEnd: string;
}

/**
 * Response của DiscoveryService.getStoreDetail().
 */
interface PublicStoreDetailResponse {
  store: PublicStore;
  activeDeals: PublicStoreDeal[];
}

type MerchantTab = 'list' | 'lookup' | 'kyc';

// =====================================================
// 2. CẤU HÌNH
// =====================================================

/**
 * StoreEntity dùng UUID làm khóa chính.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * API này chỉ cho phép xem chi tiết
 * một cửa hàng đang hoạt động.
 */
const PUBLIC_STORE_ENDPOINT = '/customer/stores';

// =====================================================
// 3. KIỂM TRA RESPONSE
// =====================================================

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Kiểm tra dữ liệu thật trước khi hiển thị.
 *
 * Không tự tạo cửa hàng mặc định khi
 * Backend trả response không hợp lệ.
 */
function parsePublicStoreDetail(payload: unknown): PublicStoreDetailResponse {
  if (!isRecord(payload) || !isRecord(payload.store) || !Array.isArray(payload.activeDeals)) {
    throw new AdminApiError(
      'Dữ liệu cửa hàng không đúng cấu trúc Backend.',
      502,
      'INVALID_STORE_RESPONSE',
    );
  }

  const store = payload.store;

  const validStore =
    typeof store.id === 'string' &&
    typeof store.name === 'string' &&
    typeof store.address === 'string' &&
    typeof store.phone === 'string' &&
    store.status === 'ACTIVE' &&
    typeof store.averageRating === 'number' &&
    Number.isFinite(store.averageRating) &&
    typeof store.reviewsCount === 'number' &&
    Number.isInteger(store.reviewsCount) &&
    (store.logoUrl === null || typeof store.logoUrl === 'string') &&
    (store.openHours === null || isRecord(store.openHours));

  if (!validStore) {
    throw new AdminApiError('Thông tin cửa hàng không hợp lệ.', 502, 'INVALID_STORE_DATA');
  }

  const deals: PublicStoreDeal[] = [];

  for (const item of payload.activeDeals) {
    if (!isRecord(item)) {
      throw new AdminApiError(
        'Dữ liệu deal của cửa hàng không hợp lệ.',
        502,
        'INVALID_STORE_DEALS',
      );
    }

    if (
      typeof item.id !== 'string' ||
      typeof item.title !== 'string' ||
      typeof item.category !== 'string' ||
      typeof item.currentPrice !== 'number' ||
      typeof item.originalPrice !== 'number' ||
      typeof item.discountPercent !== 'number' ||
      typeof item.remainingQuantity !== 'number' ||
      typeof item.pickupEnd !== 'string'
    ) {
      throw new AdminApiError(
        'Cấu trúc deal không đúng hợp đồng Backend.',
        502,
        'INVALID_STORE_DEALS',
      );
    }

    deals.push({
      id: item.id,
      title: item.title,
      category: item.category,
      originalPrice: item.originalPrice,
      currentPrice: item.currentPrice,
      discountPercent: item.discountPercent,
      remainingQuantity: item.remainingQuantity,
      pickupEnd: item.pickupEnd,
    });
  }

  return {
    store: {
      id: store.id as string,
      name: store.name as string,
      address: store.address as string,
      phone: store.phone as string,
      logoUrl: store.logoUrl as string | null,
      openHours: store.openHours as Record<string, unknown> | null,
      status: 'ACTIVE',
      averageRating: store.averageRating as number,
      reviewsCount: store.reviewsCount as number,
    },
    activeDeals: deals,
  };
}

// =====================================================
// 4. HÀM TIỆN ÍCH
// =====================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Phân biệt các loại lỗi Backend.
 *
 * HTTP 404 của endpoint công khai có thể
 * nghĩa là cửa hàng không tồn tại hoặc
 * không ở trạng thái ACTIVE.
 */
function getLookupError(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 404) {
      return (
        'Không tìm thấy cửa hàng qua API công khai. ' +
        'Cửa hàng có thể không tồn tại hoặc ' +
        'không ở trạng thái ACTIVE.'
      );
    }

    return error.message;
  }

  return 'Không thể tải thông tin cửa hàng.';
}

// =====================================================
// 5. THÀNH PHẦN HIỂN THỊ CHỨC NĂNG CHƯA CÓ API
// =====================================================

interface UnavailableSectionProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

/**
 * Không hiển thị danh sách rỗng như thể
 * hệ thống thực sự không có cửa hàng.
 *
 * Trạng thái chưa hỗ trợ API cần được
 * phân biệt với trạng thái không có dữ liệu.
 */
function UnavailableSection({ title, description, children }: UnavailableSectionProps) {
  return (
    <Card>
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
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: 'action.hover',
                color: 'warning.main',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <ShieldWarning size={25} weight="duotone" />
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

              <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
                Chưa có API Super Admin phù hợp
              </Typography>
            </Box>
          </Stack>

          <Alert severity="info" variant="outlined" sx={{ borderRadius: '12px' }}>
            {description}
          </Alert>

          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 6. DRAWER XEM CHI TIẾT CỬA HÀNG
// =====================================================

interface StoreDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  detail: PublicStoreDetailResponse | null;
}

/**
 * Drawer chỉ đọc dữ liệu cửa hàng.
 *
 * Không gửi request chỉnh sửa hoặc duyệt KYC.
 */
function StoreDetailDrawer({ open, onClose, detail }: StoreDetailDrawerProps) {
  const store = detail?.store;

  return (
    <AdminDrawer
      open={open && detail !== null}
      onClose={onClose}
      title={store?.name ?? 'Chi tiết cửa hàng'}
      description="Thông tin từ API cửa hàng công khai"
      overline="MERCHANT DETAILS"
      icon={<Storefront size={25} weight="duotone" />}
      size="lg"
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
      {detail && (
        <Stack spacing={3}>
          {/* ==================================
              TRẠNG THÁI CỬA HÀNG
              ================================== */}

          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              Thông tin công khai
            </Typography>

            <Chip label="ACTIVE" color="success" size="small" variant="outlined" />
          </Stack>

          <Alert severity="info" variant="outlined">
            Trạng thái ACTIVE không phải là kết quả xác minh KYC. Endpoint này không trả về thông
            tin KYC.
          </Alert>

          {/* ==================================
              THÔNG TIN CƠ BẢN
              ================================== */}

          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Mã cửa hàng
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 13,
                  fontWeight: 600,
                  overflowWrap: 'anywhere',
                }}
              >
                {store?.id}
              </Typography>
            </Box>

            <Divider />

            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'flex-start',
              }}
            >
              <MapPin size={20} color="#667085" />

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Địa chỉ
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 13,
                  }}
                >
                  {store?.address}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
              }}
            >
              <Phone size={20} color="#667085" />

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Số điện thoại cửa hàng
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,
                    fontSize: 13,
                  }}
                >
                  {store?.phone}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Typography
              sx={{
                fontSize: 13,
                color: 'text.secondary',
              }}
            >
              Đánh giá công khai:{' '}
              {store && store.reviewsCount > 0
                ? `${store.averageRating.toFixed(1)}/5`
                : 'Chưa có đánh giá'}
              {store && store.reviewsCount > 0 ? ` (${store.reviewsCount} lượt)` : ''}
            </Typography>
          </Stack>

          {/* ==================================
              GIỜ HOẠT ĐỘNG
              ================================== */}

          <Divider />

          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontWeight: 700,
              }}
            >
              Giờ hoạt động
            </Typography>

            {store?.openHours ? (
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: '12px',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                }}
              >
                {JSON.stringify(store.openHours, null, 2)}
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Chưa có thông tin giờ hoạt động.
              </Typography>
            )}
          </Stack>

          {/* ==================================
              CÁC DEAL ĐANG MỞ
              ================================== */}

          <Divider />

          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: 'center',
              }}
            >
              <Package size={20} color="#635BFF" />

              <Typography
                sx={{
                  fontWeight: 700,
                }}
              >
                Deal đang mở
              </Typography>

              <Chip label={detail.activeDeals.length} size="small" />
            </Stack>

            {detail.activeDeals.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Cửa hàng hiện không có deal công khai đang mở.
              </Typography>
            ) : (
              <TableContainer
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '12px',
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Món ăn</TableCell>
                      <TableCell align="right">Giá</TableCell>
                      <TableCell align="right">Còn</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {detail.activeDeals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {deal.title}
                            </Typography>

                            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                              {deal.category}
                            </Typography>

                            <Stack
                              direction="row"
                              sx={{
                                alignItems: 'center',
                              }}
                              spacing={0.5}
                            >
                              <ClockCountdown size={13} color="#98A2B3" />

                              <Typography color="text.secondary" sx={{ fontSize: 10 }}>
                                {formatDateTime(deal.pickupEnd)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </TableCell>

                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(deal.currentPrice)}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">{deal.remainingQuantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Stack>
      )}
    </AdminDrawer>
  );
}

// =====================================================
// 7. COMPONENT MERCHANTS PAGE
// =====================================================

export function MerchantsPage() {
  // ---------------------------------------------------
  // Tab đang được chọn
  // ---------------------------------------------------

  const [tab, setTab] = useState<MerchantTab>('lookup');

  // ---------------------------------------------------
  // Tra cứu cửa hàng bằng UUID
  // ---------------------------------------------------

  const [storeId, setStoreId] = useState('');

  const [lookupLoading, setLookupLoading] = useState(false);

  const [lookupError, setLookupError] = useState<string | null>(null);

  const [storeDetail, setStoreDetail] = useState<PublicStoreDetailResponse | null>(null);

  // ---------------------------------------------------
  // Drawer xem chi tiết
  // ---------------------------------------------------

  const [drawerOpen, setDrawerOpen] = useState(false);

  // ---------------------------------------------------
  // Điều khiển hủy request đang chạy
  // ---------------------------------------------------

  const requestRef = useRef<AbortController | null>(null);

  /**
   * Hủy request khi rời khỏi trang.
   */
  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  // ===================================================
  // 8. TRA CỨU CỬA HÀNG THỰC TẾ
  // ===================================================

  const lookupStore = async (id: string): Promise<void> => {
    const normalizedId = id.trim();

    // Chặn request không có UUID hợp lệ.
    if (!UUID_PATTERN.test(normalizedId)) {
      setLookupError('Vui lòng nhập mã cửa hàng UUID hợp lệ.');
      setStoreDetail(null);
      setDrawerOpen(false);
      return;
    }

    // Hủy request cũ trước khi bắt đầu request mới.
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setLookupLoading(true);
    setLookupError(null);
    setStoreDetail(null);
    setDrawerOpen(false);

    try {
      /**
       * Endpoint được xác minh trong Backend:
       *
       * GET /customer/stores/:id
       *
       * Đây là endpoint public dành cho khách hàng.
       * Không dùng JWT Admin cho request này.
       */
      const response = await adminApi.get<unknown>(
        `${PUBLIC_STORE_ENDPOINT}/${encodeURIComponent(normalizedId)}`,
        {
          auth: false,
          signal: controller.signal,
        },
      );

      const parsed = parsePublicStoreDetail(response);

      if (controller.signal.aborted) {
        return;
      }

      setStoreDetail(parsed);
      setDrawerOpen(true);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setLookupError(getLookupError(error));
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLookupLoading(false);
      }
    }
  };

  // ===================================================
  // 9. XỬ LÝ BIỂU MẪU TRA CỨU
  // ===================================================

  const handleLookupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    void lookupStore(storeId);
  };

  const handleStoreIdChange = (nextValue: string) => {
    requestRef.current?.abort();
    requestRef.current = null;

    setStoreId(nextValue);
    setLookupLoading(false);
    setLookupError(null);
    setStoreDetail(null);
    setDrawerOpen(false);
  };

  // ===================================================
  // 10. GIAO DIỆN CHÍNH
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
            Quản lý cửa hàng
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Quản lý đối tác, hồ sơ cửa hàng và quy trình xác minh KYC.
          </Typography>
        </Box>

        <Button variant="contained" disabled startIcon={<Storefront size={18} />}>
          Thêm cửa hàng
        </Button>
      </Stack>

      {/* ======================================
          KPI TỔNG QUAN
          ====================================== */}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng cửa hàng"
            icon={<Storefront size={26} weight="duotone" />}
            tone="primary"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Đang hoạt động"
            icon={<ShieldCheck size={26} weight="duotone" />}
            tone="success"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Chờ xác minh KYC"
            icon={<ShieldWarning size={26} weight="duotone" />}
            tone="warning"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Đang bị tạm ngưng"
            icon={<UsersThree size={26} weight="duotone" />}
            status="unsupported"
          />
        </Grid>
      </Grid>

      {/* ======================================
          TABS ĐIỀU HƯỚNG
          ====================================== */}

      <Card>
        <Box sx={{ px: 2 }}>
          <Tabs
            value={tab}
            onChange={(_event, value: MerchantTab) => setTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Các chức năng quản lý cửa hàng"
          >
            <Tab value="list" label="Danh sách cửa hàng" />

            <Tab value="lookup" label="Tra cứu cửa hàng" />

            <Tab value="kyc" label="Xác minh KYC" />
          </Tabs>
        </Box>

        <Divider />

        {/* ==================================
            TAB DANH SÁCH CỬA HÀNG
            ================================== */}

        {tab === 'list' && (
          <Box sx={{ p: 3 }}>
            <UnavailableSection
              title="Danh sách cửa hàng toàn sàn"
              description={
                'Backend hiện chưa có endpoint Admin phù hợp ' +
                'để lấy danh sách toàn bộ cửa hàng, ' +
                'phân trang hoặc lọc theo trạng thái.'
              }
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    disabled
                    size="small"
                    placeholder="Tìm theo tên, email, mã cửa hàng..."
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

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    disabled
                    select
                    size="small"
                    label="Trạng thái"
                    defaultValue="all"
                    slotProps={{
                      select: {
                        native: true,
                      },
                    }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_VERIFY">PENDING_VERIFY</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </TextField>
                </Grid>
              </Grid>

              <TableContainer
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '12px',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Cửa hàng</TableCell>
                      <TableCell>Chủ sở hữu</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>KYC</TableCell>
                      <TableCell>Thao tác</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 7 }}>
                        <Stack
                          spacing={1}
                          sx={{
                            alignItems: 'center',
                          }}
                        >
                          <ShieldWarning size={30} color="#F79009" />

                          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                            Chưa hỗ trợ tải danh sách
                          </Typography>

                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            Cần API quản trị cửa hàng toàn sàn từ Backend.
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </UnavailableSection>
          </Box>
        )}

        {/* ==================================
            TAB TRA CỨU CỬA HÀNG
            ================================== */}

        {tab === 'lookup' && (
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  Tra cứu cửa hàng bằng ID
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  Tra cứu thông tin công khai của một cửa hàng đang hoạt động bằng UUID.
                </Typography>
              </Box>

              <Alert severity="info" variant="outlined">
                Dữ liệu được lấy trực tiếp từ GET /customer/stores/:id. API này không cung cấp thông
                tin xác minh KYC hoặc quyền quản trị cửa hàng.
              </Alert>

              <Box component="form" onSubmit={handleLookupSubmit}>
                <Stack
                  direction={{
                    xs: 'column',
                    md: 'row',
                  }}
                  spacing={2}
                >
                  <TextField
                    fullWidth
                    size="small"
                    value={storeId}
                    onChange={(event) => handleStoreIdChange(event.target.value)}
                    label="Mã cửa hàng (UUID)"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    slotProps={{
                      htmlInput: {
                        maxLength: 36,
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={lookupLoading || !storeId.trim()}
                    startIcon={
                      lookupLoading ? <ArrowClockwise size={18} /> : <MagnifyingGlass size={18} />
                    }
                    sx={{
                      minWidth: 140,
                      flexShrink: 0,
                      minHeight: 42,
                    }}
                  >
                    {lookupLoading ? 'Đang tải' : 'Tra cứu'}
                  </Button>
                </Stack>
              </Box>

              {lookupError && (
                <Alert
                  severity="error"
                  variant="outlined"
                  action={
                    UUID_PATTERN.test(storeId.trim()) ? (
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => {
                          void lookupStore(storeId);
                        }}
                      >
                        Thử lại
                      </Button>
                    ) : undefined
                  }
                >
                  {lookupError}
                </Alert>
              )}

              {/* KẾT QUẢ TRA CỨU */}

              {storeDetail && (
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: '14px',
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
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
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {storeDetail.store.name}
                          </Typography>

                          <Typography
                            color="text.secondary"
                            sx={{
                              mt: 0.5,
                              fontSize: 12,
                            }}
                          >
                            {storeDetail.store.address}
                          </Typography>
                        </Box>

                        <Chip color="success" label="ACTIVE" size="small" />
                      </Stack>

                      <Divider />

                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={2}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            Deal công khai đang mở
                          </Typography>

                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {storeDetail.activeDeals.length}
                          </Typography>
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            Số lượt đánh giá
                          </Typography>

                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                            }}
                          >
                            {storeDetail.store.reviewsCount}
                          </Typography>
                        </Box>
                      </Stack>

                      <Button variant="outlined" onClick={() => setDrawerOpen(true)}>
                        Xem chi tiết cửa hàng
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {!storeDetail && !lookupError && !lookupLoading && (
                <Box
                  sx={{
                    py: 5,
                    textAlign: 'center',
                    border: 1,
                    borderColor: 'divider',
                    borderStyle: 'dashed',
                    borderRadius: '14px',
                  }}
                >
                  <Storefront size={36} color="#98A2B3" weight="duotone" />

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 1.5,
                      fontSize: 13,
                    }}
                  >
                    Nhập mã cửa hàng để bắt đầu tra cứu dữ liệu thực tế.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}

        {/* ==================================
            TAB XÁC MINH KYC
            ================================== */}

        {tab === 'kyc' && (
          <Box sx={{ p: 3 }}>
            <UnavailableSection
              title="Quy trình xác minh KYC"
              description={
                'Backend chưa có API Admin được xác minh ' +
                'để liệt kê hồ sơ, đọc chứng từ, ' +
                'duyệt hoặc từ chối KYC.'
              }
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Các thao tác cần Backend hỗ trợ
              </Typography>

              <Stack
                direction={{
                  xs: 'column',
                  sm: 'row',
                }}
                spacing={1.5}
                sx={{
                  flexWrap: 'wrap',
                }}
              >
                <Button disabled variant="contained">
                  Duyệt KYC
                </Button>

                <Button disabled variant="outlined" color="error">
                  Từ chối KYC
                </Button>

                <Button disabled variant="outlined">
                  Yêu cầu bổ sung hồ sơ
                </Button>
              </Stack>

              <Divider />

              <Typography
                color="text.secondary"
                sx={{
                  fontSize: 13,
                  lineHeight: 1.85,
                }}
              >
                Khi Backend bổ sung nghiệp vụ KYC, mỗi quyết định cần gắn với tài khoản Admin thực
                hiện, lý do xử lý và bản ghi audit. Không được suy ra trạng thái KYC từ trạng thái
                ACTIVE của cửa hàng.
              </Typography>
            </UnavailableSection>
          </Box>
        )}
      </Card>

      {/* ======================================
          DRAWER CHI TIẾT
          ====================================== */}

      <StoreDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        detail={storeDetail}
      />
    </Stack>
  );
}

export default MerchantsPage;
