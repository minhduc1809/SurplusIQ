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
  ClockCountdown,
  Eye,
  FileText,
  Flag,
  Gavel,
  MagnifyingGlass,
  ShieldCheck,
  ShieldWarning,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

import {
  getAdminCollection,
  getAdminMetricsOverview,
  saveAdminRecord,
  type AdminMetricsOverview,
  type AdminCollectionResponse,
} from '../../api/admin-management.api';

// =====================================================
// 1. CÁC KIỂU DỮ LIỆU THEO BACKEND
// =====================================================

/**
 * Ba khu vực chính của phân hệ tranh chấp.
 */
type DisputesTab = 'complaints' | 'violations' | 'workflow';

/**
 * Các trạng thái có thật trong ComplaintStatus.
 *
 * Nguồn:
 * apps/backend/src/entities/complaints/complaint.entity.ts
 */
type ComplaintStatus = 'PENDING_STORE' | 'ACCEPTED' | 'REJECTED' | 'CLOSED';

/**
 * Các trạng thái có thật trong ViolationStatus.
 *
 * Nguồn:
 * apps/backend/src/entities/complaints/violation-report.entity.ts
 */
type ViolationStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED';

/**
 * Các đối tượng có thể bị khách hàng báo cáo.
 *
 * Nguồn:
 * CreateViolationReportDto của Backend.
 */
type ViolationTarget = 'STORE' | 'DEAL' | 'REVIEW';

type StatusColor = 'default' | 'primary' | 'success' | 'warning' | 'error';

interface ComplaintStatusInfo {
  status: ComplaintStatus;
  label: string;
  description: string;
  color: StatusColor;
  explanation: string;
}

interface ViolationStatusInfo {
  status: ViolationStatus;
  label: string;
  description: string;
  color: StatusColor;
}

// =====================================================
// 2. THAM CHIẾU TRẠNG THÁI KHIẾU NẠI
// =====================================================

/**
 * Các giải thích này dựa trên nghiệp vụ
 * đang được triển khai trong Backend.
 *
 * Không coi đây là số liệu từ CSDL.
 */
const COMPLAINT_STATUSES: readonly ComplaintStatusInfo[] = [
  {
    status: 'PENDING_STORE',
    label: 'Chờ cửa hàng xử lý',
    description: 'Khiếu nại đang chờ cửa hàng phản hồi.',
    color: 'warning',
    explanation:
      'Cửa hàng có thể chấp nhận, từ chối ' +
      'hoặc gia hạn xử lý theo các điều kiện ' +
      'được Backend kiểm tra.',
  },
  {
    status: 'ACCEPTED',
    label: 'Đã chấp nhận',
    description: 'Khiếu nại đã được ghi nhận chấp nhận.',
    color: 'success',
    explanation:
      'Backend ghi nhận quyết định chấp nhận ' +
      'và số tiền hoàn tương ứng. Trạng thái này ' +
      'không tự nó chứng minh tiền đã được ' +
      'ngân hàng chuyển trả thành công.',
  },
  {
    status: 'REJECTED',
    label: 'Đã từ chối',
    description: 'Khiếu nại bị cửa hàng từ chối.',
    color: 'error',
    explanation:
      'Backend yêu cầu lý do từ chối. ' +
      'Việc xét lại quyết định bởi Super Admin ' +
      'chưa có API riêng được xác minh.',
  },
  {
    status: 'CLOSED',
    label: 'Đã đóng',
    description: 'Khiếu nại không còn ở trạng thái chờ.',
    color: 'default',
    explanation:
      'Backend hiện chuyển khiếu nại sang ' +
      'CLOSED khi khách hàng chủ động rút ' +
      'khiếu nại đang chờ cửa hàng xử lý.',
  },
];

// =====================================================
// 3. THAM CHIẾU BÁO CÁO VI PHẠM
// =====================================================

const VIOLATION_STATUSES: readonly ViolationStatusInfo[] = [
  {
    status: 'PENDING',
    label: 'Chờ xem xét',
    description: 'Báo cáo được tạo với trạng thái ban đầu.',
    color: 'warning',
  },
  {
    status: 'REVIEWED',
    label: 'Đã xem xét',
    description: 'Trạng thái xem xét được khai báo trong Backend.',
    color: 'success',
  },
  {
    status: 'DISMISSED',
    label: 'Đã bác bỏ',
    description: 'Trạng thái bác bỏ báo cáo được khai báo trong Backend.',
    color: 'default',
  },
];

const VIOLATION_TARGETS: readonly {
  value: ViolationTarget;
  label: string;
}[] = [
  {
    value: 'STORE',
    label: 'Cửa hàng',
  },
  {
    value: 'DEAL',
    label: 'Deal',
  },
  {
    value: 'REVIEW',
    label: 'Đánh giá',
  },
];

// =====================================================
// 4. COMPONENT TIÊU ĐỀ KHU VỰC
// =====================================================

interface SectionHeaderProps {
  title: string;
  description: string;
  icon: ReactNode;
}

function SectionHeader({ title, description, icon }: SectionHeaderProps) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'flex-start',
      }}
      spacing={1.5}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '12px',
          bgcolor: 'action.hover',
          color: 'primary.main',
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
            lineHeight: 1.8,
            mt: 0.5,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

// =====================================================
// 6. DRAWER THAM CHIẾU TRẠNG THÁI
// =====================================================

interface ComplaintStatusDrawerProps {
  selected: ComplaintStatusInfo | null;
  onClose: () => void;
}

/**
 * Drawer này không đại diện cho một khiếu nại
 * thực tế và không chứa dữ liệu người dùng.
 *
 * Nó chỉ giải thích trạng thái từ Backend.
 */
function ComplaintStatusDrawer({ selected, onClose }: ComplaintStatusDrawerProps) {
  return (
    <AdminDrawer
      open={selected !== null}
      onClose={onClose}
      title={selected?.label ?? 'Trạng thái khiếu nại'}
      description="Tham chiếu nghiệp vụ Backend"
      overline="COMPLAINT STATUS"
      icon={<Gavel size={24} weight="duotone" />}
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
      {selected && (
        <Stack spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Giá trị enum trong Backend
            </Typography>

            <Box
              component="code"
              sx={{
                display: 'block',
                p: 2,
                mt: 1,
                bgcolor: 'action.hover',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {selected.status}
            </Box>
          </Box>

          <Divider />

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            {selected.explanation}
          </Typography>

          <Divider />

          <Typography
            sx={{
              fontWeight: 700,
            }}
          >
            Trường dữ liệu của khiếu nại
          </Typography>

          <Stack spacing={1}>
            {[
              'id — Mã khiếu nại',
              'orderId — Mã đơn hàng',
              'customerId — Mã khách hàng',
              'storeId — Mã cửa hàng',
              'category — Loại khiếu nại',
              'description — Nội dung khiếu nại',
              'responseDueAt — Hạn phản hồi',
              'extended — Đã gia hạn hay chưa',
              'refundAmount — Số tiền hoàn ghi nhận',
              'rejectReason — Lý do từ chối',
              'autoAccepted — Có tự động chấp nhận',
              'createdAt — Thời điểm tạo',
            ].map((field) => (
              <Typography
                key={field}
                sx={{
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: 'text.secondary',
                }}
              >
                {field}
              </Typography>
            ))}
          </Stack>

          <Alert severity="info" variant="outlined">
            Đây là mô tả cấu trúc dữ liệu từ ComplaintEntity, không phải hồ sơ khiếu nại lấy từ cơ
            sở dữ liệu.
          </Alert>
        </Stack>
      )}
    </AdminDrawer>
  );
}

// =====================================================
// 7. TAB DANH SÁCH KHIẾU NẠI
// =====================================================

function ComplaintsTab() {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<AdminCollectionResponse | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [decision, setDecision] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchComplaints = () => {
    setLoading(true);
    getAdminCollection('complaints', {
      page,
      limit: 10,
      search: search.trim() || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
      .then((res) => {
        setCollectionData(res);
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách khiếu nại:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, search, statusFilter]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(keyword);
  };

  const handleResolve = async () => {
    if (!selectedComplaint) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await saveAdminRecord('complaints', selectedComplaint, {
        decision,
        refundAmount: decision === 'ACCEPT' ? refundAmount : '',
        reason,
      });
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi giải quyết khiếu nại.');
    } finally {
      setSubmitting(false);
    }
  };

  const complaints = collectionData?.items || [];

  return (
    <Stack spacing={3}>
      <SectionHeader
        title="Danh sách khiếu nại toàn sàn"
        description={'Theo dõi yêu cầu của khách hàng, hạn phản hồi và quyết định xử lý thực tế.'}
        icon={<FileText size={25} weight="duotone" />}
      />

      {/* ======================================
          BỘ LỌC TÌM KIẾM
          ====================================== */}
      <Box component="form" onSubmit={handleSearchSubmit}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <TextField
              fullWidth
              size="small"
              label="Tìm kiếm khiếu nại"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Mã đơn hàng, tên quán, khách hàng, lý do..."
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

          <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Trạng thái khiếu nại"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">Tất cả trạng thái</MenuItem>
              {COMPLAINT_STATUSES.map((item) => (
                <MenuItem key={item.status} value={item.status}>
                  {item.label} ({item.status})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              sx={{ height: 40 }}
              startIcon={<ArrowClockwise size={18} />}
              onClick={fetchComplaints}
            >
              Tải lại
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* ======================================
          BẢNG KHIẾU NẠI TOÀN SÀN
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
              <TableCell>Đơn hàng</TableCell>
              <TableCell>Cửa hàng</TableCell>
              <TableCell>Khách hàng</TableCell>
              <TableCell>Lý do / Nội dung</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thời gian</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    Không có khiếu nại nào phù hợp.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              complaints.map((row: any) => {
                const meta = COMPLAINT_STATUSES.find((s) => s.status === row.status);
                const color = meta?.color || 'default';

                return (
                  <TableRow key={String(row.id)} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
                        {row.order_code || (row.order_id ? String(row.order_id).slice(0, 8) : '—')}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                        {row.store_name || row.store_id || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {row.user_label || row.customer_id || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ maxWidth: 220 }}>
                      <Typography
                        sx={{
                          fontSize: 12,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.description || row.category || 'Khiếu nại suất ăn'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={meta?.label || String(row.status)}
                        color={color}
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
                            })
                          : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={row.status === 'PENDING_STORE' ? 'contained' : 'outlined'}
                        color={row.status === 'PENDING_STORE' ? 'warning' : 'inherit'}
                        startIcon={
                          row.status === 'PENDING_STORE' ? <Gavel size={16} /> : <Eye size={16} />
                        }
                        onClick={() => {
                          setSelectedComplaint(row);
                          setDecision('ACCEPT');
                          setRefundAmount(String(row.refund_amount || 50000));
                          setReason('');
                          setErrorMsg('');
                        }}
                      >
                        {row.status === 'PENDING_STORE' ? 'Trọng tài' : 'Xem'}
                      </Button>
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
            Hiển thị {complaints.length} trên tổng số {collectionData.total} khiếu nại
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

      {/* ======================================
          DRAWER GIẢI QUYẾT KHIẾU NẠI
          ====================================== */}
      <AdminDrawer
        open={selectedComplaint !== null}
        onClose={() => setSelectedComplaint(null)}
        title={
          selectedComplaint?.status === 'PENDING_STORE'
            ? 'Trọng tài khiếu nại'
            : 'Chi tiết khiếu nại'
        }
        description={`Khiếu nại cho đơn ${selectedComplaint?.order_code || ''}`}
        overline="COMPLAINT ARBITRATION"
        icon={<Gavel size={24} weight="duotone" />}
        size="md"
        footer={
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <Button variant="outlined" color="inherit" onClick={() => setSelectedComplaint(null)}>
              Đóng
            </Button>
            {selectedComplaint?.status === 'PENDING_STORE' && (
              <Button
                variant="contained"
                color={decision === 'ACCEPT' ? 'success' : 'error'}
                disabled={submitting}
                onClick={handleResolve}
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận quyết định'}
              </Button>
            )}
          </Stack>
        }
      >
        {selectedComplaint && (
          <Stack spacing={2.5}>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Trạng thái hiện tại
              </Typography>
              <Chip
                size="small"
                label={
                  COMPLAINT_STATUSES.find((s) => s.status === selectedComplaint.status)?.label ||
                  selectedComplaint.status
                }
                color={
                  COMPLAINT_STATUSES.find((s) => s.status === selectedComplaint.status)?.color ||
                  'default'
                }
              />
            </Stack>

            <Divider />

            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Cửa hàng bị khiếu nại
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {selectedComplaint.store_name || selectedComplaint.store_id}
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Khách hàng
              </Typography>
              <Typography sx={{ fontWeight: 600 }}>
                {selectedComplaint.user_label || selectedComplaint.customer_id}
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                Nội dung khiếu nại
              </Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.8 }}>
                {selectedComplaint.description ||
                  'Khách hàng gửi khiếu nại không hài lòng về đơn hàng.'}
              </Typography>
            </Stack>

            {selectedComplaint.status === 'PENDING_STORE' && (
              <>
                <Divider />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Quyết định của Quản trị viên
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant={decision === 'ACCEPT' ? 'contained' : 'outlined'}
                      color="success"
                      onClick={() => setDecision('ACCEPT')}
                    >
                      Chấp nhận khiếu nại
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button
                      fullWidth
                      variant={decision === 'REJECT' ? 'contained' : 'outlined'}
                      color="error"
                      onClick={() => setDecision('REJECT')}
                    >
                      Bác bỏ khiếu nại
                    </Button>
                  </Grid>
                </Grid>

                {decision === 'ACCEPT' ? (
                  <TextField
                    fullWidth
                    size="small"
                    label="Số tiền hoàn (VND)"
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    helperText="Số tiền sẽ được ghi nhận hoàn lại cho khách hàng"
                  />
                ) : (
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    label="Lý do từ chối"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Nêu rõ lý do từ chối yêu cầu khiếu nại..."
                  />
                )}
              </>
            )}
          </Stack>
        )}
      </AdminDrawer>
    </Stack>
  );
}

// =====================================================
// 8. TAB BÁO CÁO VI PHẠM
// =====================================================

function ViolationsTab() {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<AdminCollectionResponse | null>(null);

  const fetchViolations = () => {
    setLoading(true);
    getAdminCollection('violations', {
      page,
      limit: 10,
    })
      .then((res) => {
        setCollectionData(res);
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách báo cáo vi phạm:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchViolations();
  }, [page]);

  const violations = collectionData?.items || [];

  return (
    <Stack spacing={3}>
      <SectionHeader
        title="Báo cáo vi phạm"
        description={
          'Theo dõi và quản lý các báo cáo vi phạm liên quan đến cửa hàng, deal và đánh giá.'
        }
        icon={<Flag size={25} weight="duotone" />}
      />

      {/* ======================================
          CÁC ĐỐI TƯỢNG BỊ BÁO CÁO
          ====================================== */}
      <Grid container spacing={2}>
        {VIOLATION_TARGETS.map((item) => (
          <Grid key={item.value} size={{ xs: 12, md: 4 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderRadius: '14px',
              }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Chip
                    label={item.value}
                    size="small"
                    variant="outlined"
                    sx={{
                      alignSelf: 'flex-start',
                    }}
                  />

                  <Typography
                    color="text.secondary"
                    sx={{
                      fontSize: 12,
                    }}
                  >
                    Loại đối tượng được khách hàng hoặc người dùng báo cáo vi phạm.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ======================================
          DANH SÁCH VI PHẠM THỰC TẾ
          ====================================== */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Danh sách báo cáo vi phạm toàn sàn
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowClockwise size={16} />}
          onClick={fetchViolations}
        >
          Tải lại
        </Button>
      </Stack>

      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow>
              <TableCell>Người báo cáo</TableCell>
              <TableCell>Đối tượng vi phạm</TableCell>
              <TableCell>Lý do</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thời gian</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : violations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    Chưa có báo cáo vi phạm nào.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              violations.map((row: any) => {
                const statusMeta = VIOLATION_STATUSES.find((s) => s.status === row.status);
                const color = statusMeta?.color || 'default';

                return (
                  <TableRow key={String(row.id)} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                        {row.user_label || row.reporter_id || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={row.target_type || 'STORE'}
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell sx={{ maxWidth: 350 }}>
                      <Typography sx={{ fontSize: 13 }}>{row.reason || '—'}</Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={statusMeta?.label || String(row.status)}
                        color={color}
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
            Hiển thị {violations.length} trên tổng số {collectionData.total} báo cáo
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
// 9. THAM CHIẾU QUY TRÌNH XỬ LÝ
// =====================================================

/**
 * Các bước này mô tả nghiệp vụ hiện có.
 *
 * Không tự động thực hiện chuyển trạng thái
 * hoặc tạo khoản hoàn tiền trên Frontend.
 */
function WorkflowTab() {
  const steps = [
    {
      title: 'Khách hàng gửi khiếu nại',
      description:
        'Backend chỉ cho gửi khiếu nại cho đơn ' + 'PICKED_UP trong vòng 24 giờ sau khi nhận.',
    },
    {
      title: 'Cửa hàng phản hồi',
      description: 'Khiếu nại được tạo ở PENDING_STORE, ' + 'với hạn phản hồi ban đầu là 48 giờ.',
    },
    {
      title: 'Gia hạn khi cần thiết',
      description: 'Cửa hàng được gia hạn thêm 24 giờ, ' + 'tối đa một lần nếu khiếu nại còn chờ.',
    },
    {
      title: 'Chấp nhận hoặc từ chối',
      description: 'Cửa hàng có thể chấp nhận với số tiền ' + 'hoàn hợp lệ hoặc từ chối kèm lý do.',
    },
    {
      title: 'Tự động xử lý quá hạn',
      description:
        'Tác vụ Backend tự động chấp nhận ' +
        'khiếu nại PENDING_STORE đã đến hạn ' +
        'responseDueAt. Thao tác này không ' +
        'được gọi thủ công từ giao diện Admin.',
    },
  ];

  return (
    <Stack spacing={3}>
      <SectionHeader
        title="Quy trình xử lý & trọng tài"
        description={'Các bước nghiệp vụ được đối chiếu ' + 'từ service và controller của Backend.'}
        icon={<Gavel size={25} weight="duotone" />}
      />

      <Card variant="outlined">
        <CardContent
          sx={{
            p: 3,
            '&:last-child': { pb: 3 },
          }}
        >
          <Stack spacing={3}>
            {steps.map((step, index) => (
              <Stack
                key={step.title}
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
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {step.title}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    sx={{
                      mt: 0.75,
                      fontSize: 12,
                      lineHeight: 1.9,
                    }}
                  >
                    {step.description}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ======================================
          CÔNG CỤ TRỌNG TÀI CHƯA HỖ TRỢ
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
              spacing={1.5}
              sx={{
                alignItems: 'center',
              }}
            >
              <ShieldWarning size={25} color="#F79009" weight="duotone" />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                }}
              >
                Công cụ trọng tài Super Admin
              </Typography>
            </Stack>

            <Alert severity="warning" variant="outlined">
              Các quyết định trọng tài và hoàn tiền của Super Admin chưa có endpoint được bảo vệ phù
              hợp. Không tái sử dụng quyền OWNER/MANAGER của cửa hàng.
            </Alert>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Button fullWidth disabled variant="contained">
                  Chấp nhận khiếu nại
                </Button>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Button fullWidth disabled color="error" variant="outlined">
                  Từ chối khiếu nại
                </Button>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Button fullWidth disabled variant="outlined">
                  Yêu cầu bằng chứng
                </Button>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Button fullWidth disabled variant="outlined">
                  Xử lý vi phạm
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// =====================================================
// 10. COMPONENT CHÍNH
// =====================================================

export function DisputesPage() {
  const [activeTab, setActiveTab] = useState<DisputesTab>('complaints');
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatusInfo | null>(null);
  const [metrics, setMetrics] = useState<AdminMetricsOverview['disputes'] | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingMetrics(true);
    getAdminMetricsOverview()
      .then((data) => {
        if (active) setMetrics(data.disputes);
      })
      .catch((err) => {
        console.error('Lỗi tải metrics khiếu nại:', err);
      })
      .finally(() => {
        if (active) setLoadingMetrics(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Stack spacing={3} className="admin-page-enter">
      {/* ======================================
          TIÊU ĐỀ TRANG
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
            Khiếu nại & Trọng tài
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Quản lý tranh chấp, báo cáo vi phạm và quy trình xử lý của nền tảng.
          </Typography>
        </Box>
      </Stack>

      {/* ======================================
          CÁC CHỈ SỐ QUẢN TRỊ
          ====================================== */}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng khiếu nại"
            value={metrics ? metrics.totalComplaints.toLocaleString('vi-VN') : '—'}
            icon={<FileText size={26} weight="duotone" />}
            tone="primary"
            loading={loadingMetrics}
            status="ready"
            description="Toàn bộ khiếu nại đơn hàng"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Chờ cửa hàng xử lý"
            value={metrics ? metrics.pendingStoreComplaints.toLocaleString('vi-VN') : '—'}
            icon={<ClockCountdown size={26} weight="duotone" />}
            tone="warning"
            loading={loadingMetrics}
            status="ready"
            description="Đang trong thời hạn phản hồi"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Khiếu nại đã chấp nhận"
            value={metrics ? metrics.acceptedComplaints.toLocaleString('vi-VN') : '—'}
            icon={<ShieldCheck size={26} weight="duotone" />}
            tone="success"
            loading={loadingMetrics}
            status="ready"
            description="Đã đồng ý bồi hoàn"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Báo cáo vi phạm chờ xử lý"
            value={metrics ? metrics.pendingViolations.toLocaleString('vi-VN') : '—'}
            icon={<Flag size={26} weight="duotone" />}
            tone="warning"
            loading={loadingMetrics}
            status="ready"
            description="Báo cáo vi phạm chưa duyệt"
          />
        </Grid>
      </Grid>

      {/* ======================================
          CÁC TRẠNG THÁI KHIẾU NẠI
          ====================================== */}

      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 2,
          }}
        >
          Tham chiếu trạng thái khiếu nại
        </Typography>

        <Grid container spacing={2}>
          {COMPLAINT_STATUSES.map((item) => (
            <Grid key={item.status} size={{ xs: 12, sm: 6, xl: 3 }}>
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
                  <Stack spacing={1.5}>
                    <Chip
                      size="small"
                      color={item.color}
                      label={item.label}
                      variant="outlined"
                      sx={{
                        alignSelf: 'flex-start',
                      }}
                    />

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
                        minHeight: 40,
                        fontSize: 12,
                        lineHeight: 1.7,
                      }}
                    >
                      {item.description}
                    </Typography>

                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        setSelectedStatus(item);
                      }}
                      sx={{
                        alignSelf: 'flex-start',
                      }}
                    >
                      Xem nghiệp vụ
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ======================================
          CÁC TAB QUẢN LÝ
          ====================================== */}

      <Card>
        <Box sx={{ px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: DisputesTab) => {
              setActiveTab(value);
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Phân hệ khiếu nại và trọng tài"
          >
            <Tab value="complaints" label="Danh sách khiếu nại" />

            <Tab value="violations" label="Báo cáo vi phạm" />

            <Tab value="workflow" label="Quy trình & Trọng tài" />
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
          {activeTab === 'complaints' && <ComplaintsTab />}

          {activeTab === 'violations' && <ViolationsTab />}

          {activeTab === 'workflow' && <WorkflowTab />}
        </Box>
      </Card>

      {/* ======================================
          GHI CHÚ BẢO MẬT
          ====================================== */}

      <Alert
        severity="warning"
        variant="outlined"
        icon={<ShieldWarning size={23} weight="duotone" />}
      >
        <Stack spacing={1}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Quyền hạn và ghi vết
          </Typography>

          <Typography
            sx={{
              fontSize: 12,
              lineHeight: 1.85,
            }}
          >
            Trọng tài toàn sàn cần API dành cho ADMIN, kiểm tra quyền truy cập, lưu lý do ra quyết
            định, bằng chứng, lịch sử trạng thái và Audit Logs. Không sử dụng endpoint Store hoặc
            Customer để bỏ qua phân quyền.
          </Typography>
        </Stack>
      </Alert>

      {/* ======================================
          DRAWER THÔNG TIN TRẠNG THÁI
          ====================================== */}

      <ComplaintStatusDrawer
        selected={selectedStatus}
        onClose={() => {
          setSelectedStatus(null);
        }}
      />
    </Stack>
  );
}

export default DisputesPage;
