import { useCallback, useEffect, useRef, useState } from 'react';

import type { FormEvent } from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Snackbar,
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
  Tooltip,
  Typography,
} from '@mui/material';

import {
  ArrowClockwise,
  Bell,
  CheckCircle,
  ClockCountdown,
  DownloadSimple,
  Eye,
  FilePdf,
  MagnifyingGlass,
  MapPin,
  Package,
  PaperPlaneTilt,
  Phone,
  ShieldCheck,
  ShieldWarning,
  Storefront,
  UsersThree,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

import { AdminApiError, adminApi } from '../../api/admin-api.client';

// =====================================================
// 1. KIỂU DỮ LIỆU
// =====================================================

interface MerchantOverview {
  totalStores: number;
  activeStores: number;
  pendingKycStores: number;
  suspendedStores: number;
  pendingReviewContracts: number;
  needMoreInfoContracts: number;
  approvedContracts: number;
  rejectedContracts: number;
}

interface AdminStoreItem {
  id: string;
  name: string;
  address: string;
  phone: string;
  logo_url: string | null;
  status: 'ACTIVE' | 'PENDING_VERIFY' | 'SUSPENDED';
  rating_avg: string;
  rating_count: number;
  created_at: string;
  user_label?: string;
  owner_user_id?: string;
}

interface AdminStoresResponse {
  key: string;
  exportedAt: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: AdminStoreItem[];
}

interface StoreLegalProfile {
  legalName: string;
  businessType: 'INDIVIDUAL' | 'HOUSEHOLD' | 'COMPANY';
  taxCode: string | null;
  businessLicenseNo: string | null;
  representativeName: string;
  representativePhone: string;
  legalAddress: string;
}

interface StoreContractItem {
  id: string;
  storeId: string;
  storeName: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEED_MORE_INFO';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  legalProfile: StoreLegalProfile | null;
}

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

interface PublicStoreDetailResponse {
  store: PublicStore;
  activeDeals: PublicStoreDeal[];
}

type MerchantTab = 'list' | 'lookup' | 'kyc';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_STORE_ENDPOINT = '/customer/stores';

// =====================================================
// 2. HÀM TIỆN ÍCH
// =====================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function getBusinessTypeLabel(type?: string): string {
  switch (type) {
    case 'COMPANY':
      return 'Doanh nghiệp';
    case 'HOUSEHOLD':
      return 'Hộ kinh doanh';
    case 'INDIVIDUAL':
      return 'Cá nhân';
    default:
      return type || 'Chưa khai báo';
  }
}

// =====================================================
// 3. DRAWER XEM CHI TIẾT CỬA HÀNG
// =====================================================

interface StoreDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  detail: PublicStoreDetailResponse | null;
}

function StoreDetailDrawer({ open, onClose, detail }: StoreDetailDrawerProps) {
  const store = detail?.store;

  return (
    <AdminDrawer
      open={open && detail !== null}
      onClose={onClose}
      title={store?.name ?? 'Chi tiết cửa hàng'}
      description="Thông tin chi tiết từ hệ thống"
      overline="MERCHANT DETAILS"
      icon={<Storefront size={25} weight="duotone" />}
      size="lg"
      footer={
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Đóng
          </Button>
        </Stack>
      }
    >
      {detail && (
        <Stack spacing={3}>
          <Stack
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>Thông tin cửa hàng</Typography>
            <Chip label={store?.status ?? 'ACTIVE'} color="success" size="small" variant="filled" />
          </Stack>

          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Mã định danh cửa hàng (UUID)
              </Typography>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  overflowWrap: 'anywhere',
                }}
              >
                {store?.id}
              </Typography>
            </Box>

            <Divider />

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <MapPin size={20} color="#667085" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Địa chỉ
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13 }}>{store?.address}</Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Phone size={20} color="#667085" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Số điện thoại liên hệ
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: 13 }}>{store?.phone}</Typography>
              </Box>
            </Stack>

            <Divider />

            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Đánh giá trung bình:{' '}
              {store && store.reviewsCount > 0
                ? `${store.averageRating.toFixed(1)} ⭐ (${store.reviewsCount} lượt đánh giá)`
                : 'Chưa có đánh giá'}
            </Typography>
          </Stack>

          <Divider />

          {/* Deal đang mở */}
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Package size={20} color="#635BFF" />
              <Typography sx={{ fontWeight: 700 }}>Deal đang mở bán</Typography>
              <Chip label={detail.activeDeals.length} size="small" />
            </Stack>

            {detail.activeDeals.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Cửa hàng hiện không có deal cứu thực phẩm đang mở bán.
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
                      <TableCell>Món ăn / Gói cứu trợ</TableCell>
                      <TableCell align="right">Giá bán</TableCell>
                      <TableCell align="right">Còn lại</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.activeDeals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                              {deal.title}
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                              {deal.category}
                            </Typography>
                            <Stack direction="row" sx={{ alignItems: 'center' }} spacing={0.5}>
                              <ClockCountdown size={13} color="#98A2B3" />
                              <Typography color="text.secondary" sx={{ fontSize: 10 }}>
                                {formatDateTime(deal.pickupEnd)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
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
// 4. COMPONENT CHÍNH MERCHANTS PAGE
// =====================================================

export function MerchantsPage() {
  const [tab, setTab] = useState<MerchantTab>('list');

  // --- KPI Overview ---
  const [overview, setOverview] = useState<MerchantOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // --- Tab Danh sách cửa hàng ---
  const [stores, setStores] = useState<AdminStoreItem[]>([]);
  const [storesTotal, setStoresTotal] = useState(0);
  const [storesTotalPages, setStoresTotalPages] = useState(1);
  const [storesPage, setStoresPage] = useState(1);
  const [storesSearch, setStoresSearch] = useState('');
  const [storesStatusFilter, setStoresStatusFilter] = useState('ALL');
  const [loadingStores, setLoadingStores] = useState(false);

  // --- Tab Tra cứu ---
  const [storeIdInput, setStoreIdInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [storeDetail, setStoreDetail] = useState<PublicStoreDetailResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // --- Tab Xác minh KYC ---
  const [contracts, setContracts] = useState<StoreContractItem[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [kycStatusFilter, setKycStatusFilter] = useState<string>('ALL');

  // Dialog Thẩm định hợp đồng
  const [reviewDialogTarget, setReviewDialogTarget] = useState<StoreContractItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED' | 'NEED_MORE_INFO'>(
    'APPROVED',
  );
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dialog Nhắc nhở KYC
  const [remindDialogTarget, setRemindDialogTarget] = useState<{
    storeId: string;
    storeName: string;
  } | null>(null);
  const [remindMessage, setRemindMessage] = useState('');
  const [submittingRemind, setSubmittingRemind] = useState(false);
  const [batchReminding, setBatchReminding] = useState(false);

  // Toast thông báo
  const [toast, setToast] = useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);

  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  // ---------------------------------------------------
  // TẢI DỮ LIỆU KPI TỔNG QUAN
  // ---------------------------------------------------
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await adminApi.get<MerchantOverview>('/admin/store-contracts/overview');
      setOverview(data);
    } catch {
      // Bỏ qua lỗi ngầm
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // ---------------------------------------------------
  // TẢI DANH SÁCH CỬA HÀNG
  // ---------------------------------------------------
  const fetchStores = useCallback(async (page = 1, search = '', status = 'ALL') => {
    setLoadingStores(true);
    try {
      const queryParams: Record<string, string | number> = {
        page,
        limit: 15,
      };
      if (search.trim()) queryParams.search = search.trim();
      if (status && status !== 'ALL') queryParams.status = status;

      const res = await adminApi.get<AdminStoresResponse>('/admin/collections/stores', {
        params: queryParams,
      });

      setStores(res.items || []);
      setStoresTotal(res.total || 0);
      setStoresTotalPages(res.totalPages || 1);
      setStoresPage(res.page || 1);
    } catch {
      setStores([]);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  // ---------------------------------------------------
  // TẢI DANH SÁCH HỢP ĐỒNG KYC
  // ---------------------------------------------------
  const fetchContracts = useCallback(async (statusFilter = 'ALL') => {
    setLoadingContracts(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const data = await adminApi.get<StoreContractItem[]>('/admin/store-contracts', { params });
      setContracts(data || []);
    } catch {
      setContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  }, []);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (tab === 'list') {
      void fetchStores(storesPage, storesSearch, storesStatusFilter);
    } else if (tab === 'kyc') {
      void fetchContracts(kycStatusFilter);
    }
  }, [tab, storesPage, storesStatusFilter, kycStatusFilter, fetchStores, fetchContracts]);

  // ---------------------------------------------------
  // TRA CỨU CỬA HÀNG BẰNG ID
  // ---------------------------------------------------
  const lookupStore = async (id: string): Promise<void> => {
    const normalizedId = id.trim();
    if (!UUID_PATTERN.test(normalizedId)) {
      setLookupError('Vui lòng nhập mã cửa hàng UUID hợp lệ.');
      setStoreDetail(null);
      setDrawerOpen(false);
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    setStoreDetail(null);

    try {
      const response = await adminApi.get<PublicStoreDetailResponse>(
        `${PUBLIC_STORE_ENDPOINT}/${encodeURIComponent(normalizedId)}`,
        { auth: false },
      );
      setStoreDetail(response);
      setDrawerOpen(true);
    } catch (err: unknown) {
      if (err instanceof AdminApiError && err.status === 404) {
        setLookupError('Không tìm thấy cửa hàng này hoặc cửa hàng chưa ở trạng thái ACTIVE.');
      } else {
        setLookupError('Không thể tải thông tin cửa hàng.');
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookupSubmit = (e: FormEvent) => {
    e.preventDefault();
    void lookupStore(storeIdInput);
  };

  // ---------------------------------------------------
  // XỬ LÝ XEM TỆP HỢP ĐỒNG SCAN
  // ---------------------------------------------------
  const handleViewContractFile = async (contractId: string, fileName: string) => {
    try {
      // Đọc accessToken từ sessionStorage
      const rawTokens = sessionStorage.getItem('surplusiq.platform-admin.tokens.v1');
      let token = '';
      if (rawTokens) {
        try {
          const parsed = JSON.parse(rawTokens) as { accessToken?: string };
          token = parsed.accessToken || '';
        } catch {
          // ignore
        }
      }

      const baseUrl =
        import.meta.env.VITE_API_BASE_URL?.trim() ||
        import.meta.env.VITE_API_URL?.trim() ||
        'http://localhost:4000';

      const response = await fetch(`${baseUrl}/admin/store-contracts/${contractId}/file`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Máy chủ phản hồi mã ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      setToast({ message: `Đang mở tệp "${fileName}" trong tab mới.`, severity: 'info' });
    } catch (error) {
      setToast({
        message: `Không thể mở tệp hợp đồng: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
    }
  };

  // ---------------------------------------------------
  // XỬ LÝ THẨM ĐỊNH HỢP ĐỒNG (Duyệt / Từ chối / Bổ sung)
  // ---------------------------------------------------
  const handleSubmitReview = async () => {
    if (!reviewDialogTarget) return;

    if (reviewDecision !== 'APPROVED' && !reviewNote.trim()) {
      setToast({
        message: 'Vui lòng nhập lý do từ chối hoặc yêu cầu bổ sung.',
        severity: 'error',
      });
      return;
    }

    setSubmittingReview(true);
    try {
      await adminApi.patch(`/admin/store-contracts/${reviewDialogTarget.id}/review`, {
        decision: reviewDecision,
        note: reviewNote.trim() || undefined,
      });

      const actionText =
        reviewDecision === 'APPROVED'
          ? 'Đã duyệt hợp đồng và kích hoạt cửa hàng thành công'
          : reviewDecision === 'NEED_MORE_INFO'
            ? 'Đã gửi yêu cầu bổ sung hồ sơ tới chủ cửa hàng'
            : 'Đã từ chối hồ sơ hợp đồng';

      setToast({
        message: `${actionText}! Đã tự động gửi thông báo đến chủ cửa hàng.`,
        severity: 'success',
      });

      setReviewDialogTarget(null);
      setReviewNote('');
      void fetchContracts(kycStatusFilter);
      void fetchOverview();
      void fetchStores(storesPage, storesSearch, storesStatusFilter);
    } catch (err: unknown) {
      setToast({
        message: `Xử lý thẩm định thất bại: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // ---------------------------------------------------
  // XỬ LÝ GỬI THÔNG BÁO NHẮC NHỞ KYC
  // ---------------------------------------------------
  const handleSubmitRemind = async () => {
    if (!remindDialogTarget) return;

    setSubmittingRemind(true);
    try {
      await adminApi.post(`/admin/store-contracts/${remindDialogTarget.storeId}/remind`, {
        message: remindMessage.trim() || undefined,
      });

      setToast({
        message: `Đã gửi thông báo nhắc nhở hoàn tất hợp đồng tới "${remindDialogTarget.storeName}" thành công!`,
        severity: 'success',
      });

      setRemindDialogTarget(null);
      setRemindMessage('');
    } catch (err: unknown) {
      setToast({
        message: `Không thể gửi thông báo nhắc nhở: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    } finally {
      setSubmittingRemind(false);
    }
  };

  // Quét và nhắc nhở hàng loạt các quán chưa duyệt
  const handleBatchRemind = async () => {
    setBatchReminding(true);
    try {
      const res = await adminApi.post<{ remindedCount: number; totalPending: number }>(
        '/admin/store-contracts/remind-pending',
      );

      setToast({
        message: `Đã quét và gửi thông báo nhắc nhở tới ${res.remindedCount} cửa hàng chưa hoàn tất KYC!`,
        severity: 'success',
      });
    } catch (err: unknown) {
      setToast({
        message: `Quét nhắc nhở thất bại: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    } finally {
      setBatchReminding(false);
    }
  };

  return (
    <Stack spacing={3} className="admin-page-enter">
      {/* ======================================
          HEADER
          ====================================== */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h4"
            sx={{ fontWeight: 750, letterSpacing: '-0.04em' }}
          >
            Quản lý cửa hàng & Thẩm định KYC
          </Typography>

          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13, lineHeight: 1.8 }}>
            Giám sát mạng lưới đối tác, hồ sơ pháp lý và quy trình duyệt hợp đồng kinh doanh.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={
              batchReminding ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PaperPlaneTilt size={18} />
              )
            }
            disabled={batchReminding}
            onClick={() => void handleBatchRemind()}
          >
            Quét & Nhắc nhở KYC
          </Button>

          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowClockwise size={18} />}
            onClick={() => {
              void fetchOverview();
              if (tab === 'list') void fetchStores(storesPage, storesSearch, storesStatusFilter);
              if (tab === 'kyc') void fetchContracts(kycStatusFilter);
            }}
          >
            Làm mới
          </Button>
        </Stack>
      </Stack>

      {/* ======================================
          KPI TỔNG QUAN (Real Backend Data)
          ====================================== */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng cửa hàng"
            icon={<Storefront size={26} weight="duotone" />}
            tone="primary"
            value={overview?.totalStores ?? null}
            loading={loadingOverview}
            description="Toàn bộ cửa hàng trên nền tảng"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Đang hoạt động"
            icon={<ShieldCheck size={26} weight="duotone" />}
            tone="success"
            value={overview?.activeStores ?? null}
            loading={loadingOverview}
            description="Cửa hàng đủ điều kiện mở bán deal"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Chờ xác minh KYC"
            icon={<ShieldWarning size={26} weight="duotone" />}
            tone="warning"
            value={overview?.pendingKycStores ?? null}
            loading={loadingOverview}
            description={`${overview?.pendingReviewContracts ?? 0} hợp đồng đang chờ duyệt`}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Đang bị tạm ngưng"
            icon={<UsersThree size={26} weight="duotone" />}
            tone="error"
            value={overview?.suspendedStores ?? null}
            loading={loadingOverview}
            description="Cửa hàng bị tạm khóa hoạt động"
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
            <Tab
              value="list"
              label={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <span>Danh sách cửa hàng</span>
                  {overview && (
                    <Chip label={overview.totalStores} size="small" sx={{ height: 20 }} />
                  )}
                </Stack>
              }
            />

            <Tab
              value="kyc"
              label={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <span>Thẩm định hợp đồng KYC</span>
                  {overview && overview.pendingReviewContracts > 0 && (
                    <Chip
                      label={overview.pendingReviewContracts}
                      color="warning"
                      size="small"
                      sx={{ height: 20, fontWeight: 700 }}
                    />
                  )}
                </Stack>
              }
            />

            <Tab value="lookup" label="Tra cứu cửa hàng" />
          </Tabs>
        </Box>

        <Divider />

        {/* ==================================
            TAB 1: DANH SÁCH CỬA HÀNG TOÀN SÀN
            ================================== */}
        {tab === 'list' && (
          <Box sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              {/* Thanh lọc & tìm kiếm */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Tìm theo tên cửa hàng, địa chỉ, email chủ sở hữu..."
                    value={storesSearch}
                    onChange={(e) => setStoresSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        void fetchStores(1, storesSearch, storesStatusFilter);
                      }
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <MagnifyingGlass size={18} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Button
                              size="small"
                              onClick={() => void fetchStores(1, storesSearch, storesStatusFilter)}
                            >
                              Tìm
                            </Button>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    select
                    size="small"
                    label="Trạng thái cửa hàng"
                    value={storesStatusFilter}
                    onChange={(e) => {
                      setStoresStatusFilter(e.target.value);
                      void fetchStores(1, storesSearch, e.target.value);
                    }}
                  >
                    <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                    <MenuItem value="ACTIVE">Đang hoạt động (ACTIVE)</MenuItem>
                    <MenuItem value="PENDING_VERIFY">Chờ xác minh (PENDING_VERIFY)</MenuItem>
                    <MenuItem value="SUSPENDED">Đang tạm ngưng (SUSPENDED)</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {/* Bảng dữ liệu cửa hàng */}
              <TableContainer
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '12px',
                  minHeight: 280,
                }}
              >
                <Table size="medium">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Cửa hàng</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Chủ sở hữu</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Đánh giá</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Thao tác
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {loadingStores ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                            <CircularProgress size={28} />
                            <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                              Đang tải dữ liệu cửa hàng...
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : stores.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <Stack spacing={1} sx={{ alignItems: 'center' }}>
                            <Storefront size={32} color="#98A2B3" weight="duotone" />
                            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                              Không tìm thấy cửa hàng nào
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stores.map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              <Avatar
                                src={s.logo_url || undefined}
                                alt={s.name}
                                variant="rounded"
                                sx={{ width: 42, height: 42, borderRadius: '10px' }}
                              >
                                <Storefront size={22} />
                              </Avatar>

                              <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                                  {s.name}
                                </Typography>
                                <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                                  {s.address}
                                </Typography>
                                <Typography
                                  color="text.secondary"
                                  sx={{ fontSize: 10, fontFamily: 'monospace' }}
                                >
                                  ID: {s.id}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                              {s.user_label || 'Chưa liên kết'}
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                              SĐT: {s.phone || 'Chưa cập nhật'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                              {Number(s.rating_avg) > 0 ? `${s.rating_avg} ⭐` : '—'}
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                              {s.rating_count} đánh giá
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {s.status === 'ACTIVE' && (
                              <Chip
                                label="ĐANG HOẠT ĐỘNG"
                                color="success"
                                size="small"
                                variant="filled"
                                sx={{ fontSize: 11, fontWeight: 700 }}
                              />
                            )}
                            {s.status === 'PENDING_VERIFY' && (
                              <Chip
                                label="CHỜ DUYỆT KYC"
                                color="warning"
                                size="small"
                                variant="filled"
                                sx={{ fontSize: 11, fontWeight: 700 }}
                              />
                            )}
                            {s.status === 'SUSPENDED' && (
                              <Chip
                                label="TẠM NGƯNG"
                                color="error"
                                size="small"
                                variant="filled"
                                sx={{ fontSize: 11, fontWeight: 700 }}
                              />
                            )}
                          </TableCell>

                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
                            >
                              {s.status === 'PENDING_VERIFY' && (
                                <Tooltip title="Gửi thông báo nhắc nhở nộp/bổ sung hồ sơ KYC">
                                  <IconButton
                                    size="small"
                                    color="warning"
                                    onClick={() =>
                                      setRemindDialogTarget({ storeId: s.id, storeName: s.name })
                                    }
                                  >
                                    <Bell size={18} />
                                  </IconButton>
                                </Tooltip>
                              )}

                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Eye size={16} />}
                                onClick={() => void lookupStore(s.id)}
                              >
                                Chi tiết
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Phân trang */}
              <Stack
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                  Hiển thị {stores.length} / {storesTotal} cửa hàng
                </Typography>

                <Pagination
                  count={storesTotalPages}
                  page={storesPage}
                  onChange={(_e, p) => void fetchStores(p, storesSearch, storesStatusFilter)}
                  color="primary"
                  size="small"
                />
              </Stack>
            </Stack>
          </Box>
        )}

        {/* ==================================
            TAB 2: THẨM ĐỊNH HỢP ĐỒNG KYC
            ================================== */}
        {tab === 'kyc' && (
          <Box sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              {/* Header Tab KYC */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Hồ sơ kinh doanh & Hợp đồng đối tác
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                    Thẩm định thông tin pháp lý, kiểm tra bản scan hợp đồng và duyệt kích hoạt cửa
                    hàng.
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <TextField
                    select
                    size="small"
                    label="Lọc hợp đồng"
                    value={kycStatusFilter}
                    onChange={(e) => {
                      setKycStatusFilter(e.target.value);
                      void fetchContracts(e.target.value);
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="ALL">Tất cả hồ sơ</MenuItem>
                    <MenuItem value="PENDING_REVIEW">Chờ thẩm định (PENDING_REVIEW)</MenuItem>
                    <MenuItem value="NEED_MORE_INFO">Yêu cầu bổ sung (NEED_MORE_INFO)</MenuItem>
                    <MenuItem value="APPROVED">Đã phê duyệt (APPROVED)</MenuItem>
                    <MenuItem value="REJECTED">Đã từ chối (REJECTED)</MenuItem>
                  </TextField>

                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={
                      batchReminding ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Bell size={18} />
                      )
                    }
                    disabled={batchReminding}
                    onClick={() => void handleBatchRemind()}
                  >
                    Nhắc nhở các quán chờ
                  </Button>
                </Stack>
              </Stack>

              {/* Bảng hồ sơ hợp đồng KYC */}
              <TableContainer
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: '12px',
                  minHeight: 280,
                }}
              >
                <Table size="medium">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Cửa hàng</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Hồ sơ pháp lý</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Bản scan hợp đồng</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Ngày nộp / Trạng thái</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Hành động
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {loadingContracts ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
                            <CircularProgress size={28} />
                            <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                              Đang tải danh sách hợp đồng...
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : contracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <Stack spacing={1} sx={{ alignItems: 'center' }}>
                            <CheckCircle size={32} color="#12B76A" weight="duotone" />
                            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                              Không có hợp đồng nào trong danh sách
                            </Typography>
                            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                              Hiện tại không có hồ sơ hợp đồng nào cần xử lý với bộ lọc này.
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : (
                      contracts.map((c) => (
                        <TableRow key={c.id} hover>
                          <TableCell>
                            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                              {c.storeName || 'Cửa hàng không xác định'}
                            </Typography>
                            <Typography
                              color="text.secondary"
                              sx={{ fontSize: 11, fontFamily: 'monospace' }}
                            >
                              Store ID: {c.storeId}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {c.legalProfile ? (
                              <Stack spacing={0.3}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                  {c.legalProfile.legalName}
                                </Typography>
                                <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                                  Loại hình: {getBusinessTypeLabel(c.legalProfile.businessType)}
                                </Typography>
                                <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                                  MST: {c.legalProfile.taxCode || 'Chưa có'} | GPKD:{' '}
                                  {c.legalProfile.businessLicenseNo || 'Chưa có'}
                                </Typography>
                                <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                                  Đại diện: {c.legalProfile.representativeName} (
                                  {c.legalProfile.representativePhone})
                                </Typography>
                              </Stack>
                            ) : (
                              <Typography
                                color="text.secondary"
                                sx={{ fontSize: 12, fontStyle: 'italic' }}
                              >
                                Chưa cập nhật thông tin pháp lý
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <FilePdf size={20} color="#D92D20" weight="fill" />
                                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                                  {c.fileName}
                                </Typography>
                              </Stack>

                              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                                Dung lượng: {formatBytes(c.sizeBytes)}
                              </Typography>

                              <Button
                                size="small"
                                variant="text"
                                color="primary"
                                startIcon={<DownloadSimple size={15} />}
                                sx={{
                                  p: 0,
                                  justifyContent: 'flex-start',
                                  minWidth: 0,
                                  fontSize: 11,
                                }}
                                onClick={() => void handleViewContractFile(c.id, c.fileName)}
                              >
                                Xem / Tải hợp đồng
                              </Button>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.8} sx={{ alignItems: 'flex-start' }}>
                              {c.status === 'PENDING_REVIEW' && (
                                <Chip
                                  label="CHỜ THẨM ĐỊNH"
                                  color="warning"
                                  size="small"
                                  variant="filled"
                                  sx={{ fontSize: 11, fontWeight: 700 }}
                                />
                              )}
                              {c.status === 'NEED_MORE_INFO' && (
                                <Chip
                                  label="YÊU CẦU BỔ SUNG"
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: 11, fontWeight: 700 }}
                                />
                              )}
                              {c.status === 'APPROVED' && (
                                <Chip
                                  label="ĐÃ PHÊ DUYỆT"
                                  color="success"
                                  size="small"
                                  variant="filled"
                                  sx={{ fontSize: 11, fontWeight: 700 }}
                                />
                              )}
                              {c.status === 'REJECTED' && (
                                <Chip
                                  label="ĐÃ TỪ CHỐI"
                                  color="error"
                                  size="small"
                                  variant="filled"
                                  sx={{ fontSize: 11, fontWeight: 700 }}
                                />
                              )}

                              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                                Nộp: {formatDateTime(c.createdAt)}
                              </Typography>

                              {c.reviewNote && (
                                <Box
                                  sx={{
                                    p: 1,
                                    bgcolor: 'action.hover',
                                    borderRadius: '8px',
                                    fontSize: 11,
                                    maxWidth: 240,
                                  }}
                                >
                                  <Typography
                                    sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary' }}
                                  >
                                    Ghi chú thẩm định:
                                  </Typography>
                                  {c.reviewNote}
                                </Box>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell align="right">
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.5 }}
                            >
                              {c.status === 'PENDING_REVIEW' ? (
                                <>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircle size={16} />}
                                    onClick={() => {
                                      setReviewDialogTarget(c);
                                      setReviewDecision('APPROVED');
                                      setReviewNote('');
                                    }}
                                  >
                                    Duyệt
                                  </Button>

                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<WarningCircle size={16} />}
                                    onClick={() => {
                                      setReviewDialogTarget(c);
                                      setReviewDecision('NEED_MORE_INFO');
                                      setReviewNote('');
                                    }}
                                  >
                                    Bổ sung
                                  </Button>

                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<XCircle size={16} />}
                                    onClick={() => {
                                      setReviewDialogTarget(c);
                                      setReviewDecision('REJECTED');
                                      setReviewNote('');
                                    }}
                                  >
                                    Từ chối
                                  </Button>
                                </>
                              ) : (
                                <Tooltip title="Gửi thông báo nhắc nhở hợp đồng">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    startIcon={<Bell size={16} />}
                                    onClick={() =>
                                      setRemindDialogTarget({
                                        storeId: c.storeId,
                                        storeName: c.storeName || 'Cửa hàng',
                                      })
                                    }
                                  >
                                    Nhắc nhở
                                  </Button>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Box>
        )}

        {/* ==================================
            TAB 3: TRA CỨU CỬA HÀNG BẰNG ID
            ================================== */}
        {tab === 'lookup' && (
          <Box sx={{ p: 3 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Tra cứu cửa hàng bằng UUID
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 13, lineHeight: 1.8 }}>
                  Tra cứu chi tiết thông tin công khai và các đợt mở bán thực phẩm của cửa hàng.
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleLookupSubmit}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    fullWidth
                    size="small"
                    value={storeIdInput}
                    onChange={(e) => setStoreIdInput(e.target.value)}
                    label="Mã cửa hàng (UUID)"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    slotProps={{ htmlInput: { maxLength: 36 } }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={lookupLoading || !storeIdInput.trim()}
                    startIcon={
                      lookupLoading ? <ArrowClockwise size={18} /> : <MagnifyingGlass size={18} />
                    }
                    sx={{ minWidth: 140, flexShrink: 0, minHeight: 42 }}
                  >
                    {lookupLoading ? 'Đang tải' : 'Tra cứu'}
                  </Button>
                </Stack>
              </Box>

              {lookupError && (
                <Alert severity="error" variant="outlined">
                  {lookupError}
                </Alert>
              )}

              {storeDetail && (
                <Card variant="outlined" sx={{ borderRadius: '14px' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {storeDetail.store.name}
                          </Typography>
                          <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 12 }}>
                            {storeDetail.store.address}
                          </Typography>
                        </Box>

                        <Chip color="success" label="ACTIVE" size="small" />
                      </Stack>

                      <Divider />

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            Deal cứu thực phẩm đang mở
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {storeDetail.activeDeals.length}
                          </Typography>
                        </Box>

                        <Box sx={{ flex: 1 }}>
                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            Số lượt đánh giá
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {storeDetail.store.reviewsCount}
                          </Typography>
                        </Box>
                      </Stack>

                      <Button variant="outlined" onClick={() => setDrawerOpen(true)}>
                        Xem đầy đủ chi tiết cửa hàng
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
                  <Typography color="text.secondary" sx={{ mt: 1.5, fontSize: 13 }}>
                    Nhập mã cửa hàng (UUID) để tra cứu dữ liệu thời gian thực.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </Card>

      {/* ======================================
          DIALOG THẨM ĐỊNH HỢP ĐỒNG KYC
          ====================================== */}
      <Dialog
        open={reviewDialogTarget !== null}
        onClose={() => !submittingReview && setReviewDialogTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {reviewDecision === 'APPROVED' && 'Phê duyệt hồ sơ hợp đồng'}
          {reviewDecision === 'NEED_MORE_INFO' && 'Yêu cầu bổ sung hồ sơ hợp đồng'}
          {reviewDecision === 'REJECTED' && 'Từ chối hồ sơ hợp đồng'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert
              severity={
                reviewDecision === 'APPROVED'
                  ? 'success'
                  : reviewDecision === 'NEED_MORE_INFO'
                    ? 'warning'
                    : 'error'
              }
              variant="outlined"
            >
              Cửa hàng: <strong>{reviewDialogTarget?.storeName}</strong>
              <br />
              Tệp: <strong>{reviewDialogTarget?.fileName}</strong>
            </Alert>

            {reviewDecision === 'APPROVED' ? (
              <Typography sx={{ fontSize: 13, lineHeight: 1.7 }}>
                Khi bạn bấm <strong>Phê duyệt</strong>, hệ thống sẽ:
                <br />• Đánh dấu hợp đồng đối tác ở trạng thái <strong>ĐÃ DUYỆT (APPROVED)</strong>.
                <br />• Tự động kích hoạt trạng thái cửa hàng thành <strong>ACTIVE</strong> nếu đang
                chờ duyệt.
                <br />• Gửi thông báo chúc mừng kích hoạt tài khoản thành công đến chủ quán.
              </Typography>
            ) : (
              <TextField
                fullWidth
                multiline
                rows={4}
                required
                label={
                  reviewDecision === 'NEED_MORE_INFO'
                    ? 'Lý do yêu cầu bổ sung (Gửi đến chủ quán)'
                    : 'Lý do từ chối hồ sơ hợp đồng'
                }
                placeholder={
                  reviewDecision === 'NEED_MORE_INFO'
                    ? 'Ví dụ: Bản scan trang 2 bị mờ hoặc thiếu dấu giáp lai, vui lòng tải lại bản scan rõ nét trong vòng 48h...'
                    : 'Ví dụ: Giấy phép kinh doanh không trùng khớp với người đại diện...'
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            disabled={submittingReview}
            onClick={() => setReviewDialogTarget(null)}
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            color={
              reviewDecision === 'APPROVED'
                ? 'success'
                : reviewDecision === 'NEED_MORE_INFO'
                  ? 'warning'
                  : 'error'
            }
            disabled={submittingReview}
            onClick={() => void handleSubmitReview()}
          >
            {submittingReview ? (
              <CircularProgress size={20} color="inherit" />
            ) : reviewDecision === 'APPROVED' ? (
              'Xác nhận Phê duyệt'
            ) : reviewDecision === 'NEED_MORE_INFO' ? (
              'Gửi yêu cầu bổ sung'
            ) : (
              'Xác nhận Từ chối'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================
          DIALOG NHẮC NHỞ KYC CỬA HÀNG
          ====================================== */}
      <Dialog
        open={remindDialogTarget !== null}
        onClose={() => !submittingRemind && setRemindDialogTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Gửi thông báo nhắc nhở nộp hồ sơ KYC</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography sx={{ fontSize: 13 }}>
              Gửi thông báo trực tiếp đến tài khoản chủ sở hữu cửa hàng{' '}
              <strong>"{remindDialogTarget?.storeName}"</strong>.
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Nội dung thông báo (Để trống để dùng tin nhắn mặc định)"
              placeholder="Cửa hàng của bạn chưa hoàn tất xác minh KYC và hợp đồng hợp tác. Vui lòng tải lên bản scan hợp đồng đã ký trên hệ thống để được kích hoạt mở bán..."
              value={remindMessage}
              onChange={(e) => setRemindMessage(e.target.value)}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            disabled={submittingRemind}
            onClick={() => setRemindDialogTarget(null)}
          >
            Hủy
          </Button>

          <Button
            variant="contained"
            color="primary"
            disabled={submittingRemind}
            startIcon={
              submittingRemind ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <PaperPlaneTilt size={16} />
              )
            }
            onClick={() => void handleSubmitRemind()}
          >
            Gửi nhắc nhở
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================
          DRAWER CHI TIẾT
          ====================================== */}
      <StoreDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        detail={storeDetail}
      />

      {/* ======================================
          TOAST THÔNG BÁO
          ====================================== */}
      <Snackbar
        open={toast !== null}
        autoHideDuration={4500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert
            onClose={() => setToast(null)}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%', boxShadow: 3 }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}

export default MerchantsPage;
