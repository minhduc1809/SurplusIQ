import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';

import {
  ArrowClockwise,
  Basket,
  ChartBar,
  ClockCountdown,
  CurrencyDollar,
  Leaf,
  Package,
} from '@phosphor-icons/react';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

import { AdminFilterBar } from '../../components/FilterBar/AdminFilterBar';

import type {
  AdminFilterDefinition,
  AdminFilterValues,
} from '../../components/FilterBar/AdminFilterBar';

import { AdminDataTable } from '../../components/DataTable/AdminDataTable';

import type { AdminTableColumn } from '../../components/DataTable/AdminDataTable';

import { AdminApiError, adminApi } from '../../api/admin-api.client';

// =====================================================
// 1. KIỂU DỮ LIỆU THEO BACKEND HIỆN TẠI
// =====================================================

/**
 * Các trường được sử dụng từ response của:
 *
 * GET /customer/deals
 *
 * Backend trả về nhiều trường hơn, nhưng
 * Dashboard chỉ khai báo những trường cần dùng.
 *
 * Đây là dữ liệu deal công khai dành cho khách hàng,
 * không phải dữ liệu quản trị toàn bộ deal.
 */
interface PublicDeal {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  category: string;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  remainingQuantity: number;
  pickupEnd: string;
}

/**
 * Cấu trúc phân trang được trả bởi DiscoveryService.
 *
 * Backend sử dụng page bắt đầu từ 1,
 * trong khi Material UI sử dụng page bắt đầu từ 0.
 */
interface PublicDealsResponse {
  data: PublicDeal[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Trạng thái dữ liệu hiện tại của trang Overview.
 */
interface OverviewDataState {
  response: PublicDealsResponse | null;
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
}

/**
 * Thông tin biểu đồ danh mục trên trang đang xem.
 */
interface CategorySummary {
  name: string;
  count: number;
  percentage: number;
}

// =====================================================
// 2. CẤU HÌNH BỘ LỌC
// =====================================================

/**
 * Chỉ sử dụng những tham số được Backend
 * QueryDealsDto khai báo.
 *
 * Không tự gửi status, fromDate, toDate
 * hoặc bất kỳ trường chưa được hỗ trợ.
 */
const OVERVIEW_FILTERS: AdminFilterDefinition[] = [
  {
    type: 'search',
    key: 'search',
    label: 'Tìm kiếm',
    placeholder: 'Tên món ăn hoặc cửa hàng...',
  },
  {
    type: 'search',
    key: 'category',
    label: 'Danh mục',
    placeholder: 'Nhập danh mục món ăn...',
  },
  {
    type: 'select',
    key: 'sortBy',
    label: 'Sắp xếp',
    placeholder: 'Mặc định',
    options: [
      {
        value: 'closing_soon',
        label: 'Sắp hết giờ nhận món',
      },
      {
        value: 'price_asc',
        label: 'Giá tăng dần',
      },
      {
        value: 'discount_desc',
        label: 'Giảm giá cao nhất',
      },
    ],
  },
];

/**
 * Giá trị mặc định của các bộ lọc.
 */
const EMPTY_FILTERS: AdminFilterValues = {
  search: '',
  category: '',
  sortBy: '',
};

// =====================================================
// 3. HÀM TIỆN ÍCH
// =====================================================

/**
 * Kiểm tra dữ liệu nhận được có phải object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Kiểm tra một bản ghi có đầy đủ trường
 * mà Dashboard cần sử dụng hay không.
 */
function isPublicDeal(value: unknown): value is PublicDeal {
  if (!isRecord(value)) {
    return false;
  }

  const numericKeys = ['originalPrice', 'currentPrice', 'discountPercent', 'remainingQuantity'];

  const hasValidNumbers = numericKeys.every(
    (key) => typeof value[key] === 'number' && Number.isFinite(value[key]),
  );

  return (
    typeof value.id === 'string' &&
    typeof value.storeId === 'string' &&
    typeof value.storeName === 'string' &&
    typeof value.title === 'string' &&
    typeof value.category === 'string' &&
    typeof value.pickupEnd === 'string' &&
    hasValidNumbers
  );
}

/**
 * Kiểm tra cấu trúc response thật từ Backend.
 *
 * Không tự chuyển một response không hợp lệ
 * thành danh sách rỗng, vì điều đó có thể
 * khiến Admin hiểu sai rằng không có dữ liệu.
 */
function parseDealsResponse(payload: unknown): PublicDealsResponse {
  if (!isRecord(payload)) {
    throw new AdminApiError(
      'Backend trả về dữ liệu deal không hợp lệ.',
      502,
      'INVALID_DEALS_RESPONSE',
    );
  }

  const { data, meta } = payload;

  if (
    !Array.isArray(data) ||
    !data.every(isPublicDeal) ||
    !isRecord(meta) ||
    typeof meta.total !== 'number' ||
    !Number.isInteger(meta.total) ||
    meta.total < 0 ||
    typeof meta.page !== 'number' ||
    !Number.isInteger(meta.page) ||
    typeof meta.limit !== 'number' ||
    !Number.isInteger(meta.limit) ||
    typeof meta.totalPages !== 'number' ||
    !Number.isInteger(meta.totalPages)
  ) {
    throw new AdminApiError(
      'Cấu trúc danh sách deal không đúng hợp đồng Backend.',
      502,
      'INVALID_DEALS_RESPONSE',
    );
  }

  return {
    data,
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages: meta.totalPages,
    },
  };
}

/**
 * Định dạng tiền Việt Nam.
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Định dạng thời gian nhận món.
 *
 * Hiển thị theo giờ Việt Nam, không phụ thuộc
 * múi giờ mặc định của trình duyệt.
 */
function formatPickupTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Không xác định';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Tính tổng số suất còn lại của những deal
 * có trong trang dữ liệu đã tải.
 *
 * Không sử dụng giá trị này làm tổng tồn kho
 * hoặc tổng suất còn lại toàn nền tảng.
 */
function calculatePageRemaining(deals: readonly PublicDeal[]): number {
  return deals.reduce((sum, deal) => sum + deal.remainingQuantity, 0);
}

/**
 * Tính cơ cấu danh mục dựa trên
 * các deal của trang hiện tại.
 *
 * Không suy rộng kết quả này thành
 * thống kê của toàn bộ hệ thống.
 */
function calculateCategorySummary(deals: readonly PublicDeal[]): CategorySummary[] {
  if (deals.length === 0) {
    return [];
  }

  const counts = new Map<string, number>();

  for (const deal of deals) {
    const category = deal.category.trim() || 'Khác';

    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / deals.length) * 100,
    }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 6);
}

// =====================================================
// 4. CẤU HÌNH CỘT DỮ LIỆU
// =====================================================

/**
 * Bảng chỉ hiển thị dữ liệu thực tế từ API.
 *
 * Không bật sortable trong DataTable vì
 * Backend yêu cầu sortBy theo enum riêng.
 *
 * Sắp xếp được xử lý qua AdminFilterBar.
 */
const DEAL_COLUMNS: AdminTableColumn<PublicDeal>[] = [
  {
    id: 'title',
    label: 'Món ăn / Deal',
    minWidth: 190,
    value: (row) => row.title,
    render: (row) => (
      <Stack spacing={0.5}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {row.title}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 11 }}>
          {row.category}
        </Typography>
      </Stack>
    ),
  },
  {
    id: 'storeName',
    label: 'Cửa hàng',
    minWidth: 160,
    value: (row) => row.storeName,
    render: (row) => (
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {row.storeName}
      </Typography>
    ),
  },
  {
    id: 'currentPrice',
    label: 'Giá bán',
    align: 'right',
    minWidth: 125,
    value: (row) => row.currentPrice,
    render: (row) => (
      <Stack
        spacing={0.5}
        sx={{
          alignItems: 'flex-end',
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatCurrency(row.currentPrice)}
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            fontSize: 11,
            textDecoration: 'line-through',
          }}
        >
          {formatCurrency(row.originalPrice)}
        </Typography>
      </Stack>
    ),
  },
  {
    id: 'discountPercent',
    label: 'Giảm giá',
    align: 'center',
    minWidth: 105,
    value: (row) => row.discountPercent,
    render: (row) => (
      <Chip size="small" color="success" variant="outlined" label={`${row.discountPercent}%`} />
    ),
  },
  {
    id: 'remainingQuantity',
    label: 'Suất còn lại',
    align: 'right',
    minWidth: 110,
    value: (row) => row.remainingQuantity,
    render: (row) => (
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {row.remainingQuantity}
      </Typography>
    ),
  },
  {
    id: 'pickupEnd',
    label: 'Kết thúc nhận món',
    minWidth: 165,
    value: (row) => row.pickupEnd,
    render: (row) => (
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
        }}
        spacing={1}
      >
        <ClockCountdown size={18} color="#98A2B3" />

        <Typography sx={{ fontSize: 12 }}>{formatPickupTime(row.pickupEnd)}</Typography>
      </Stack>
    ),
  },
];

// =====================================================
// 5. BIỂU ĐỒ DANH MỤC CỦA TRANG HIỆN TẠI
// =====================================================

interface CategoryChartProps {
  deals: readonly PublicDeal[];
  loading: boolean;
  error: string | null;
}

/**
 * Biểu đồ chỉ sử dụng dữ liệu deal
 * đang có trong trang hiện tại.
 *
 * Không tạo dữ liệu biểu đồ mẫu.
 */
function CategoryChart({ deals, loading, error }: CategoryChartProps) {
  const categories = useMemo(() => calculateCategorySummary(deals), [deals]);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent
        sx={{
          p: 3,
          '&:last-child': { pb: 3 },
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
              }}
              spacing={1}
            >
              <ChartBar size={21} weight="duotone" color="#635BFF" />

              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Phân bố danh mục
              </Typography>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{
                mt: 0.75,
                fontSize: 12,
                lineHeight: 1.7,
              }}
            >
              Chỉ tính trên các deal trong trang hiện tại, không phải toàn bộ nền tảng.
            </Typography>
          </Box>

          {loading ? (
            <Stack spacing={2} aria-busy="true" aria-label="Đang tải biểu đồ">
              {[0, 1, 2].map((item) => (
                <LinearProgress key={item} />
              ))}
            </Stack>
          ) : error ? (
            <Alert severity="warning" variant="outlined">
              Chưa thể tải dữ liệu biểu đồ.
            </Alert>
          ) : categories.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{
                py: 5,
                textAlign: 'center',
                fontSize: 13,
              }}
            >
              Không có deal để phân tích.
            </Typography>
          ) : (
            <Stack spacing={2.5}>
              {categories.map((category) => (
                <Stack key={category.name} spacing={1}>
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}

                    spacing={2}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        minWidth: 0,
                      }}
                    >
                      {category.name}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: 12,
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0,
                      }}
                    >
                      {category.count} deal
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={category.percentage}
                    aria-label={`Danh mục ${category.name}`}
                    sx={{
                      height: 8,
                      borderRadius: '999px',
                    }}
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 6. THÔNG TIN GIỚI HẠN API ADMIN
// =====================================================

/**
 * Giải thích nguồn dữ liệu để người quản trị
 * không nhầm dữ liệu công khai với số liệu toàn sàn.
 */
function OverviewDataScope() {
  return (
    <Card sx={{ height: '100%' }}>
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
            spacing={1}
          >
            <Package size={21} weight="duotone" color="#635BFF" />

            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Phạm vi dữ liệu
            </Typography>
          </Stack>

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 13,
              lineHeight: 1.85,
            }}
          >
            API hiện tại chỉ trả các deal đang mở, còn suất bán, chưa hết thời gian nhận món và
            thuộc cửa hàng đang hoạt động.
          </Typography>

          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Nguồn dữ liệu hiện sử dụng
            </Typography>

            <Box
              component="code"
              sx={{
                display: 'block',
                bgcolor: 'action.hover',
                p: 1.5,
                borderRadius: '10px',
                fontSize: 12,
                overflowWrap: 'anywhere',
              }}
            >
              GET /customer/deals
            </Box>
          </Stack>

          <Alert
            severity="info"
            variant="outlined"
            sx={{
              borderRadius: '12px',
              '& .MuiAlert-message': {
                fontSize: 12,
                lineHeight: 1.75,
              },
            }}
          >
            Đây chưa phải API thống kê toàn sàn. Doanh thu, đơn hàng, ESG và lịch sử hoạt động cần
            endpoint Admin riêng.
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 7. COMPONENT OVERVIEW CHÍNH
// =====================================================

export function OverviewPage() {
  // ---------------------------------------------------
  // Bộ lọc đang chỉnh sửa và đã được áp dụng
  // ---------------------------------------------------

  const [draftFilters, setDraftFilters] = useState<AdminFilterValues>({
    ...EMPTY_FILTERS,
  });

  const [appliedFilters, setAppliedFilters] = useState<AdminFilterValues>({
    ...EMPTY_FILTERS,
  });

  const [filterError, setFilterError] = useState<string | null>(null);

  // ---------------------------------------------------
  // Phân trang theo API Backend
  // ---------------------------------------------------

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // ---------------------------------------------------
  // Cho phép tải lại mà không đổi bộ lọc
  // ---------------------------------------------------

  const [reloadKey, setReloadKey] = useState(0);

  // ---------------------------------------------------
  // Trạng thái dữ liệu
  // ---------------------------------------------------

  const [dataState, setDataState] = useState<OverviewDataState>({
    response: null,
    loading: true,
    error: null,
    updatedAt: null,
  });

  // ===================================================
  // 8. GỌI API THỰC TẾ
  // ===================================================

  useEffect(() => {
    /**
     * Mỗi lần đổi page, pageSize, bộ lọc
     * hoặc nhấn tải lại sẽ tạo request mới.
     *
     * Request cũ được hủy khi effect cleanup,
     * tránh dữ liệu cũ ghi đè dữ liệu mới.
     */
    const controller = new AbortController();

    const loadDeals = async () => {
      setDataState({
        response: null,
        loading: true,
        error: null,
        updatedAt: null,
      });

      try {
        const rawResponse = await adminApi.get<unknown>('/customer/deals', {
          auth: false,
          signal: controller.signal,
          params: {
            page: page + 1,
            limit: pageSize,

            search: appliedFilters.search?.trim() || undefined,

            category: appliedFilters.category?.trim() || undefined,

            sortBy: appliedFilters.sortBy || undefined,
          },
        });

        const parsed = parseDealsResponse(rawResponse);

        if (controller.signal.aborted) {
          return;
        }

        setDataState({
          response: parsed,
          loading: false,
          error: null,
          updatedAt: new Date(),
        });
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          caughtError instanceof Error ? caughtError.message : 'Không thể tải danh sách deal.';

        setDataState({
          response: null,
          loading: false,
          error: message,
          updatedAt: null,
        });
      }
    };

    void loadDeals();

    return () => {
      controller.abort();
    };
  }, [page, pageSize, appliedFilters, reloadKey]);

  // ===================================================
  // 9. TÍNH TOÁN CÁC CHỈ SỐ CÓ CĂN CỨ
  // ===================================================

  const response = dataState.response;

  const deals = response?.data ?? [];

  /**
   * Tổng deal chỉ phản ánh các điều kiện
   * mà GET /customer/deals đang áp dụng.
   */
  const publicDealsTotal = response?.meta.total ?? null;

  /**
   * Tổng số suất còn lại chỉ tính trên
   * các deal đang nằm trong trang hiện tại.
   */
  const pageRemaining = response === null ? null : calculatePageRemaining(deals);

  const apiStatus = dataState.error ? 'error' : response ? 'ready' : 'empty';

  // ===================================================
  // 10. XỬ LÝ BỘ LỌC
  // ===================================================

  /**
   * Kiểm tra giới hạn theo QueryDealsDto
   * trước khi gửi dữ liệu tới Backend.
   */
  const handleApplyFilters = (nextFilters: AdminFilterValues) => {
    const search = (nextFilters.search ?? '').trim();

    const category = (nextFilters.category ?? '').trim();

    if (search.length > 50) {
      setFilterError('Từ khóa tìm kiếm không được vượt quá 50 ký tự.');
      return;
    }

    if (category.length > 100) {
      setFilterError('Tên danh mục không được vượt quá 100 ký tự.');
      return;
    }

    setFilterError(null);
    setPage(0);

    setAppliedFilters({
      search,
      category,
      sortBy: nextFilters.sortBy ?? '',
    });
  };

  /**
   * Đặt lại bộ lọc và trở về trang đầu tiên.
   */
  const handleResetFilters = () => {
    setFilterError(null);
    setPage(0);

    setAppliedFilters({
      ...EMPTY_FILTERS,
    });
  };

  /**
   * Yêu cầu tải lại dữ liệu với bộ lọc hiện tại.
   */
  const handleReload = () => {
    setReloadKey((previous) => previous + 1);
  };

  // ===================================================
  // 11. GIAO DIỆN
  // ===================================================

  return (
    <Stack spacing={3.5} className="admin-page-enter">
      {/* ======================================
          HEADER TỔNG QUAN
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
              letterSpacing: '-0.045em',
            }}
          >
            Tổng quan
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Theo dõi dữ liệu hiện có và mức độ tích hợp các chỉ số nền tảng.
          </Typography>

          {dataState.updatedAt && (
            <Typography
              color="text.secondary"
              sx={{
                mt: 0.5,
                fontSize: 11,
              }}
            >
              Cập nhật lúc: {dataState.updatedAt.toLocaleString('vi-VN')}
            </Typography>
          )}
        </Box>

        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ArrowClockwise size={18} />}
          onClick={handleReload}
          disabled={dataState.loading}
        >
          Làm mới dữ liệu
        </Button>
      </Stack>

      {/* ======================================
          KPI CARDS
          ====================================== */}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Deal công khai khớp bộ lọc"
            value={publicDealsTotal}
            icon={<Basket size={28} weight="duotone" />}
            tone="primary"
            loading={dataState.loading}
            status={apiStatus}
            description="Theo điều kiện của API /customer/deals"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Suất còn lại trên trang"
            value={pageRemaining}
            icon={<Package size={28} weight="duotone" />}
            tone="success"
            loading={dataState.loading}
            status={apiStatus}
            description="Tổng từ các deal đang hiển thị"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Doanh thu toàn sàn"
            icon={<CurrencyDollar size={28} weight="duotone" />}
            tone="warning"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Thực phẩm đã cứu"
            icon={<Leaf size={28} weight="duotone" />}
            tone="success"
            status="unsupported"
          />
        </Grid>
      </Grid>

      {/* ======================================
          BỘ LỌC DEAL
          ====================================== */}

      <AdminFilterBar
        title="Bộ lọc dữ liệu công khai"
        description={'Lọc các deal có thể khám phá từ API hiện có.'}
        filters={OVERVIEW_FILTERS}
        values={draftFilters}
        onChange={(nextValues) => {
          setDraftFilters(nextValues);
          setFilterError(null);
        }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {filterError && (
        <Alert severity="warning" variant="outlined" sx={{ borderRadius: '12px' }}>
          {filterError}
        </Alert>
      )}

      {/* ======================================
          BIỂU ĐỒ VÀ PHẠM VI DỮ LIỆU
          ====================================== */}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <CategoryChart deals={deals} loading={dataState.loading} error={dataState.error} />
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <OverviewDataScope />
        </Grid>
      </Grid>

      {/* ======================================
          BẢNG DEAL CÔNG KHAI
          ====================================== */}

      <AdminDataTable
        title="Deal đang hiển thị cho khách hàng"
        description={'Danh sách từ GET /customer/deals, không bao gồm mọi deal trong hệ thống.'}
        rows={deals}
        columns={DEAL_COLUMNS}
        getRowId={(row) => row.id}
        loading={dataState.loading}
        error={dataState.error}
        onRetry={handleReload}
        hideSearch
        emptyTitle="Không có deal phù hợp"
        emptyDescription={'Không tìm thấy deal công khai theo bộ lọc hiện tại.'}
        pageSizeOptions={[10, 20, 50]}
        mode="server"
        server={{
          page,
          pageSize,
          total: response?.meta.total ?? 0,

          onPageChange: (nextPage) => {
            setPage(nextPage);
          },

          onPageSizeChange: (nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(0);
          },
        }}
      />

      {/* ======================================
          GHI CHÚ CUỐI TRANG
          ====================================== */}

      <Typography
        color="text.secondary"
        sx={{
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        Dashboard đang hiển thị một phần dữ liệu mà Backend thực tế hỗ trợ. Các KPI quản trị toàn
        sàn sẽ được tích hợp khi có endpoint Admin phù hợp và được bảo vệ bằng Authentication cùng
        Role Guards.
      </Typography>
    </Stack>
  );
}

export default OverviewPage;
