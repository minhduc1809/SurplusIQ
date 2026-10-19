import { useState } from 'react';

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
  ClockCountdown,
  FileText,
  Flag,
  Gavel,
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

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
// 5. TRẠNG THÁI CHƯA CÓ API ADMIN
// =====================================================

interface UnsupportedDataProps {
  title: string;
  description: string;
  colSpan: number;
}

/**
 * Không giả lập một bảng không có bản ghi.
 *
 * Khác biệt quan trọng:
 * - Không có dữ liệu: API trả danh sách rỗng.
 * - Chưa hỗ trợ: Không có API quản trị để gọi.
 */
function UnsupportedData({ title, description, colSpan }: UnsupportedDataProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} align="center" sx={{ py: 7 }}>
        <Stack
          sx={{
            alignItems: 'center',
          }}
          spacing={1.5}
        >
          <ShieldWarning size={36} color="#F79009" weight="duotone" />

          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {title}
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              maxWidth: 460,
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            {description}
          </Typography>
        </Stack>
      </TableCell>
    </TableRow>
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
  return (
    <Stack spacing={3}>
      <SectionHeader
        title="Danh sách khiếu nại toàn sàn"
        description={'Theo dõi yêu cầu của khách hàng, ' + 'hạn phản hồi và quyết định xử lý.'}
        icon={<FileText size={25} weight="duotone" />}
      />

      <Alert severity="info" variant="outlined">
        Backend đang hỗ trợ đọc khiếu nại theo tài khoản CUSTOMER hoặc theo cửa hàng STORE_USER.
        Chưa có API cho ADMIN đọc toàn bộ khiếu nại của nền tảng.
      </Alert>

      {/* ======================================
          BỘ LỌC CHỜ API ADMIN
          ====================================== */}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <TextField
            fullWidth
            disabled
            size="small"
            label="Tìm kiếm"
            placeholder="Mã khiếu nại hoặc mã đơn hàng"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <TextField fullWidth select disabled size="small" label="Trạng thái" defaultValue="all">
            <MenuItem value="all">Tất cả trạng thái</MenuItem>

            {COMPLAINT_STATUSES.map((item) => (
              <MenuItem key={item.status} value={item.status}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <TextField
            fullWidth
            disabled
            size="small"
            type="date"
            label="Ngày tạo"
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />
        </Grid>
      </Grid>

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
              <TableCell>Mã khiếu nại</TableCell>
              <TableCell>Đơn hàng</TableCell>
              <TableCell>Cửa hàng</TableCell>
              <TableCell>Danh mục</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Hạn phản hồi</TableCell>
              <TableCell align="right">Thao tác</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <UnsupportedData
              colSpan={7}
              title="Chưa hỗ trợ danh sách khiếu nại Admin"
              description={
                'Chưa có endpoint cho phép đọc ' +
                'khiếu nại toàn sàn. Đây không phải ' +
                'kết quả truy vấn không có bản ghi.'
              }
            />
          </TableBody>
        </Table>
      </TableContainer>

      <Stack
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        spacing={1.5}
        sx={{
          justifyContent: 'flex-end',
        }}
      >
        <Button disabled variant="outlined">
          Xem hồ sơ & bằng chứng
        </Button>

        <Button disabled variant="contained">
          Ra quyết định
        </Button>
      </Stack>
    </Stack>
  );
}

// =====================================================
// 8. TAB BÁO CÁO VI PHẠM
// =====================================================

function ViolationsTab() {
  return (
    <Stack spacing={3}>
      <SectionHeader
        title="Báo cáo vi phạm"
        description={'Theo dõi báo cáo liên quan đến ' + 'cửa hàng, deal và đánh giá.'}
        icon={<Flag size={25} weight="duotone" />}
      />

      <Alert severity="warning" variant="outlined">
        API POST /customer/reports chỉ dành cho CUSTOMER gửi báo cáo vi phạm. Hiện chưa có API ADMIN
        phù hợp để xem toàn bộ báo cáo hoặc cập nhật trạng thái xử lý.
      </Alert>

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
                    Loại đối tượng được khai báo trong CreateViolationReportDto.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ======================================
          DANH MỤC TRẠNG THÁI VI PHẠM
          ====================================== */}

      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
        }}
      >
        Các trạng thái báo cáo
      </Typography>

      <Grid container spacing={2}>
        {VIOLATION_STATUSES.map((item) => (
          <Grid key={item.status} size={{ xs: 12, md: 4 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
              }}
            >
              <CardContent>
                <Stack spacing={1.5}>
                  <Chip
                    label={item.label}
                    color={item.color}
                    variant="outlined"
                    size="small"
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

      {/* ======================================
          DANH SÁCH VI PHẠM
          ====================================== */}

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
              <TableCell>Mã báo cáo</TableCell>
              <TableCell>Đối tượng</TableCell>
              <TableCell>Lý do</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Ngày tạo</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <UnsupportedData
              colSpan={5}
              title="Chưa có API quản trị báo cáo vi phạm"
              description={
                'Frontend không thể lấy các báo cáo ' +
                'vi phạm toàn sàn bằng endpoint ' +
                'dành cho khách hàng.'
              }
            />
          </TableBody>
        </Table>
      </TableContainer>
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
  // ---------------------------------------------------
  // Tab đang được chọn
  // ---------------------------------------------------

  const [activeTab, setActiveTab] = useState<DisputesTab>('complaints');

  // ---------------------------------------------------
  // Trạng thái tham chiếu đang xem
  // ---------------------------------------------------

  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatusInfo | null>(null);

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

        <Chip
          size="small"
          color="warning"
          variant="outlined"
          icon={<WarningCircle size={17} />}
          label="Chờ API Admin"
        />
      </Stack>

      {/* ======================================
          KPI CHƯA CÓ API TỔNG HỢP
          ====================================== */}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng khiếu nại"
            icon={<FileText size={26} weight="duotone" />}
            tone="primary"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Chờ cửa hàng xử lý"
            icon={<ClockCountdown size={26} weight="duotone" />}
            tone="warning"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Khiếu nại đã chấp nhận"
            icon={<ShieldCheck size={26} weight="duotone" />}
            tone="success"
            status="unsupported"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Báo cáo vi phạm chờ xử lý"
            icon={<Flag size={26} weight="duotone" />}
            tone="warning"
            status="unsupported"
          />
        </Grid>
      </Grid>

      {/* ======================================
          THÔNG BÁO PHẠM VI DỮ LIỆU
          ====================================== */}

      <Alert
        severity="info"
        variant="outlined"
        sx={{
          borderRadius: '12px',
        }}
      >
        Dashboard hiện chỉ hiển thị thông tin nghiệp vụ được xác minh từ mã nguồn Backend. Không có
        số lượng khiếu nại, khoản hoàn tiền hoặc báo cáo vi phạm nào được giả lập.
      </Alert>

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
