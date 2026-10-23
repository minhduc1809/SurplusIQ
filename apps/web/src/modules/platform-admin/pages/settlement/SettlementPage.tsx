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
  Calculator,
  CurrencyDollar,
  LockKey,
  MagnifyingGlass,
  Receipt,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';

import { AdminDrawer } from '../../components/Drawer/AdminDrawer';

import { AdminStatCard } from '../../components/StatCard/AdminStatCard';

import {
  getAdminCollection,
  getAdminMetricsOverview,
  type AdminMetricsOverview,
  type AdminCollectionResponse,
} from '../../api/admin-management.api';

// =====================================================
// 1. CÁC KIỂU DỮ LIỆU
// =====================================================

/**
 * Các tab của phân hệ đối soát.
 */
type SettlementTab = 'statements' | 'formula' | 'integrity';

/**
 * Trạng thái thực tế của WeeklyStatementEntity.
 */
type StatementStatus = 'DRAFT' | 'LOCKED';

interface StatementStatusInfo {
  status: StatementStatus;
  label: string;
  description: string;
  color: 'warning' | 'success';
}

/**
 * Các thành phần của công thức thực nhận.
 *
 * Tên trường tương ứng với WeeklyStatementEntity.
 */
type AmountField = 'gross' | 'commission' | 'refunds' | 'subscriptionFee' | 'adjustments';

type AmountInputs = Record<AmountField, string>;

interface AmountFieldDefinition {
  key: AmountField;
  label: string;
  description: string;
  allowNegative: boolean;
}

// =====================================================
// 2. TRẠNG THÁI SAO KÊ THEO BACKEND
// =====================================================

const STATEMENT_STATUSES: readonly StatementStatusInfo[] = [
  {
    status: 'DRAFT',
    label: 'Bản nháp',
    description: 'Sao kê được ghi nhận ở trạng thái nháp.',
    color: 'warning',
  },
  {
    status: 'LOCKED',
    label: 'Đã khóa',
    description: 'Sao kê được ghi nhận ở trạng thái đã khóa.',
    color: 'success',
  },
];

// =====================================================
// 3. CẤU HÌNH TRƯỜNG TÍNH TOÁN
// =====================================================

/**
 * Công thức trong ReconciliationEngine:
 *
 * Net Payout =
 * Gross - Commission - Refunds
 * - Subscription Fee + Adjustments
 *
 * Điều chỉnh có thể là số dương hoặc âm.
 *
 * Đây chỉ là công cụ tính toán cục bộ,
 * không phải quy trình tạo hoặc sửa sao kê.
 */
const AMOUNT_FIELDS: readonly AmountFieldDefinition[] = [
  {
    key: 'gross',
    label: 'Doanh thu gộp (Gross)',
    description: 'Doanh thu đủ điều kiện đối soát.',
    allowNegative: false,
  },
  {
    key: 'commission',
    label: 'Hoa hồng (Commission)',
    description: 'Khoản phí hoa hồng đã được tính.',
    allowNegative: false,
  },
  {
    key: 'refunds',
    label: 'Khấu trừ hoàn tiền (Refunds)',
    description: 'Khoản hoàn tiền được khấu trừ.',
    allowNegative: false,
  },
  {
    key: 'subscriptionFee',
    label: 'Phí thuê bao (Subscription Fee)',
    description: 'Phí gói dịch vụ nếu được khấu trừ.',
    allowNegative: false,
  },
  {
    key: 'adjustments',
    label: 'Điều chỉnh (Adjustments)',
    description: 'Số dương là cộng tiền, số âm là trừ tiền.',
    allowNegative: true,
  },
];

const EMPTY_AMOUNTS: AmountInputs = {
  gross: '',
  commission: '',
  refunds: '',
  subscriptionFee: '',
  adjustments: '',
};

// =====================================================
// 4. HÀM TIỆN ÍCH
// =====================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Chỉ chấp nhận số nguyên an toàn.
 *
 * Backend lưu các khoản tiền bằng kiểu int,
 * không dùng số thực cho các thành phần sao kê.
 */
function parseInteger(input: string, allowNegative: boolean): number | null {
  const normalized = input.trim();

  if (!/^-?\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  if (!allowNegative && parsed < 0) {
    return null;
  }

  return parsed;
}

/**
 * Chỉ cho phép tính khi người dùng nhập
 * đầy đủ năm thành phần hợp lệ.
 *
 * Không tự mặc định các trường còn trống bằng 0.
 */
function parseAmountInputs(inputs: AmountInputs): Record<AmountField, number> | null {
  const parsed: Partial<Record<AmountField, number>> = {};

  for (const field of AMOUNT_FIELDS) {
    const amount = parseInteger(inputs[field.key], field.allowNegative);

    if (amount === null) {
      return null;
    }

    parsed[field.key] = amount;
  }

  return parsed as Record<AmountField, number>;
}

/**
 * Áp dụng đúng phép tính thực nhận
 * trong ReconciliationEngine.
 *
 * Hàm không tính Gross từ đơn hàng,
 * không tính Commission từ tỷ lệ,
 * và không truy vấn Backend.
 */
function calculateNetPayout(amounts: Record<AmountField, number>): number {
  return (
    amounts.gross -
    amounts.commission -
    amounts.refunds -
    amounts.subscriptionFee +
    amounts.adjustments
  );
}

/**
 * Kiểm tra hình thức của chuỗi SHA-256 hex.
 *
 * Kết quả này KHÔNG xác minh tính toàn vẹn
 * của sao kê hoặc chữ ký từ Backend.
 */
function hasSha256HexFormat(input: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(input.trim());
}

// =====================================================
// 5. COMPONENT TIÊU ĐỀ KHU VỰC
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
          borderRadius: '12px',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
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
// 6. DRAWER THÔNG TIN TRẠNG THÁI
// =====================================================

interface StatementStatusDrawerProps {
  selected: StatementStatusInfo | null;
  onClose: () => void;
}

/**
 * Drawer hiển thị thông tin enum sao kê.
 *
 * Không sử dụng dữ liệu giả và không
 * thực hiện thay đổi trạng thái sao kê.
 */
function StatementStatusDrawer({ selected, onClose }: StatementStatusDrawerProps) {
  return (
    <AdminDrawer
      open={selected !== null}
      onClose={onClose}
      title={selected?.label ?? 'Trạng thái sao kê'}
      description="Tham chiếu từ WeeklyStatementEntity"
      overline="STATEMENT STATUS"
      size="sm"
      icon={<Receipt size={24} weight="duotone" />}
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
        <Stack spacing={2.5}>
          <Typography variant="caption" color="text.secondary">
            Trạng thái trong Backend
          </Typography>

          <Box
            component="code"
            sx={{
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {selected.status}
          </Box>

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 13,
              lineHeight: 1.9,
            }}
          >
            {selected.description}
          </Typography>

          <Alert severity="info" variant="outlined">
            Trạng thái LOCKED được khai báo trong Backend. Chỉ riêng trạng thái này không chứng minh
            checksum đã được kiểm tra lại thành công.
          </Alert>
        </Stack>
      )}
    </AdminDrawer>
  );
}

// =====================================================
// 7. TAB DANH SÁCH SAO KÊ
// =====================================================

interface StatementsTabProps {
  onSelectStatus: (value: StatementStatusInfo) => void;
}

function StatementsTab({ onSelectStatus }: StatementsTabProps) {
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [collectionData, setCollectionData] = useState<AdminCollectionResponse | null>(null);

  const fetchStatements = () => {
    setLoading(true);
    getAdminCollection('statements', {
      page,
      limit: 10,
      search: search.trim() || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
      .then((res) => {
        setCollectionData(res);
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách sao kê:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStatements();
  }, [page, search, statusFilter]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(keyword);
  };

  const statements = collectionData?.items || [];

  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Sao kê đối soát tuần"
        description={'Danh sách các kỳ đối soát tài chính thực tế của toàn bộ cửa hàng.'}
        icon={<Receipt size={25} weight="duotone" />}
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
              label="Tìm kiếm sao kê"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tên cửa hàng, mã sao kê..."
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

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              select
              size="small"
              label="Trạng thái sao kê"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="all">Tất cả trạng thái</MenuItem>
              {STATEMENT_STATUSES.map((item) => (
                <MenuItem key={item.status} value={item.status}>
                  {item.label} ({item.status})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              sx={{ height: 40 }}
              startIcon={<ArrowClockwise size={18} />}
              onClick={fetchStatements}
            >
              Tải lại
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* ======================================
          BẢNG SAO KÊ TOÀN SÀN
          ====================================== */}
      <TableContainer
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: '14px',
        }}
      >
        <Table sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>Cửa hàng</TableCell>
              <TableCell>Kỳ đối soát</TableCell>
              <TableCell align="right">Gross</TableCell>
              <TableCell align="right">Commission</TableCell>
              <TableCell align="right">Thực trả (Net)</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Checksum SHA-256</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : statements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    Không có sao kê nào phù hợp.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              statements.map((row: any) => {
                const statusMeta = STATEMENT_STATUSES.find((s) => s.status === row.status);
                const color =
                  statusMeta?.color || (row.status === 'LOCKED' ? 'success' : 'warning');

                return (
                  <TableRow key={String(row.id)} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {row.store_name || row.store_id || '—'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {row.week_start
                          ? `${new Date(String(row.week_start)).toLocaleDateString('vi-VN')} - ${new Date(String(row.week_end)).toLocaleDateString('vi-VN')}`
                          : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {Number(row.gross || 0).toLocaleString('vi-VN')} ₫
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {Number(row.commission || 0).toLocaleString('vi-VN')} ₫
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 750, fontSize: 13, color: 'success.main' }}>
                        {Number(row.net_payable || 0).toLocaleString('vi-VN')} ₫
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={statusMeta?.label || String(row.status)}
                        color={color}
                        variant="filled"
                        onClick={() => statusMeta && onSelectStatus(statusMeta)}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          color: row.checksum ? 'text.secondary' : 'warning.main',
                        }}
                      >
                        {row.checksum ? `${String(row.checksum).slice(0, 16)}…` : 'Chưa có'}
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
            Hiển thị {statements.length} trên tổng số {collectionData.total} sao kê
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

      <Divider />

      {/* ======================================
          TRẠNG THÁI ĐƯỢC BACKEND HỖ TRỢ
          ====================================== */}

      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
        }}
      >
        Trạng thái sao kê
      </Typography>

      <Grid container spacing={2}>
        {STATEMENT_STATUSES.map((item) => (
          <Grid key={item.status} size={{ xs: 12, sm: 6 }}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Chip
                    label={item.label}
                    size="small"
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

                  <Button
                    size="small"
                    variant="text"
                    onClick={() => onSelectStatus(item)}
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
// 8. CÔNG CỤ KIỂM TRA CÔNG THỨC
// =====================================================

/**
 * Công cụ này chỉ thực hiện tính toán cục bộ.
 *
 * Mọi khoản tiền phải do người dùng nhập.
 * Không tạo số liệu mẫu, không gọi API và
 * không thay đổi bản sao kê trong Backend.
 */
function SettlementFormulaCalculator() {
  const [inputs, setInputs] = useState<AmountInputs>({
    ...EMPTY_AMOUNTS,
  });

  const [showResult, setShowResult] = useState(false);

  const amounts = useMemo(() => parseAmountInputs(inputs), [inputs]);

  const netPayout = amounts ? calculateNetPayout(amounts) : null;

  const canCalculate = netPayout !== null && Number.isSafeInteger(netPayout);

  const handleChange = (field: AmountField, value: string) => {
    setInputs((previous) => ({
      ...previous,
      [field]: value,
    }));

    setShowResult(false);
  };

  const handleReset = () => {
    setInputs({
      ...EMPTY_AMOUNTS,
    });

    setShowResult(false);
  };

  return (
    <Card variant="outlined">
      <CardContent
        sx={{
          p: 3,
          '&:last-child': { pb: 3 },
        }}
      >
        <Stack spacing={3}>
          <SectionHeading
            title="Kiểm tra công thức thực nhận"
            description={
              'Nhập các thành phần tiền để tính ' + 'Net Payout trực tiếp trên trình duyệt.'
            }
            icon={<Calculator size={25} weight="duotone" />}
          />

          <Alert severity="info" variant="outlined">
            Đây là phép tính thủ công, không phải đối soát một sao kê thật. Hệ thống không lưu các
            giá trị bạn nhập.
          </Alert>

          <Grid container spacing={2}>
            {AMOUNT_FIELDS.map((field) => {
              const raw = inputs[field.key];

              const invalid = raw.trim() !== '' && parseInteger(raw, field.allowNegative) === null;

              return (
                <Grid key={field.key} size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label={field.label}
                    value={raw}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    error={invalid}
                    helperText={invalid ? 'Vui lòng nhập số nguyên hợp lệ.' : field.description}
                    placeholder="Nhập số tiền VND"
                    slotProps={{
                      htmlInput: {
                        inputMode: 'numeric',
                      },
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>

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
            <Button variant="outlined" color="inherit" onClick={handleReset}>
              Xóa dữ liệu
            </Button>

            <Button
              variant="contained"
              disabled={!canCalculate}
              onClick={() => {
                setShowResult(true);
              }}
              startIcon={<Calculator size={18} />}
            >
              Tính Net Payout
            </Button>
          </Stack>

          {showResult && netPayout !== null && (
            <Box
              sx={{
                p: 3,
                borderRadius: '14px',
                bgcolor: 'action.hover',
              }}
            >
              <Stack spacing={1.5}>
                <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                  Kết quả tính toán cục bộ
                </Typography>

                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 750,
                    fontVariantNumeric: 'tabular-nums',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {formatCurrency(netPayout)}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    fontSize: 12,
                    lineHeight: 1.8,
                  }}
                >
                  Gross - Commission - Refunds - Subscription Fee + Adjustments
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 9. TAB QUY TẮC ĐỐI SOÁT
// =====================================================

function FormulaTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Quy tắc đối soát"
        description={'Tham chiếu từ ReconciliationEngine ' + 'và quy trình chốt sao kê Backend.'}
        icon={<Calculator size={25} weight="duotone" />}
      />

      {/* ======================================
          QUY TẮC THỰC TẾ CỦA ENGINE
          ====================================== */}

      <Card variant="outlined">
        <CardContent
          sx={{
            p: 3,
            '&:last-child': { pb: 3 },
          }}
        >
          <Stack spacing={2.5}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
              }}
            >
              Quy tắc ghi nhận doanh thu
            </Typography>

            {[
              {
                title: 'Đơn PICKED_UP',
                description: 'Được cộng vào doanh thu gộp đủ điều kiện.',
              },
              {
                title: 'Đơn PICKUP_EXPIRED',
                description: 'Được tính doanh thu nếu không do lỗi cửa hàng.',
              },
              {
                title: 'Đơn REFUNDED',
                description: 'Không được cộng vào doanh thu gộp.',
              },
              {
                title: 'Đơn CANCELLED',
                description: 'Không được cộng vào doanh thu gộp.',
              },
              {
                title: 'Hoa hồng',
                description: 'Engine mặc định 10%, có thể nhận ' + 'commissionRate từ đầu vào.',
              },
              {
                title: 'Điều chỉnh',
                description: 'CREDIT cộng tiền; DEBIT trừ tiền.',
              },
            ].map((rule, index) => (
              <Box key={rule.title}>
                {index > 0 && <Divider sx={{ mb: 2 }} />}

                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {rule.title}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    fontSize: 12,
                    lineHeight: 1.8,
                  }}
                >
                  {rule.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* ======================================
          CÔNG THỨC
          ====================================== */}

      <Box
        sx={{
          bgcolor: 'action.hover',
          borderRadius: '14px',
          p: 3,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Công thức Net Payout
        </Typography>

        <Typography
          component="code"
          sx={{
            display: 'block',
            mt: 1.5,
            fontSize: 13,
            lineHeight: 2,
            overflowWrap: 'anywhere',
          }}
        >
          Gross - Commission - Refunds - Subscription Fee + Adjustments
        </Typography>
      </Box>

      {/* ======================================
          CÔNG CỤ TÍNH CỤC BỘ
          ====================================== */}

      <SettlementFormulaCalculator />

      <Alert severity="warning" variant="outlined">
        Job chốt sao kê hiện truyền subscriptionFee bằng 0, adjustments bằng mảng rỗng và sử dụng tỷ
        lệ hoa hồng mặc định của Engine. Đây là cách triển khai hiện tại, không phải khẳng định mọi
        kỳ đối soát tương lai đều có cấu hình giống nhau.
      </Alert>
    </Stack>
  );
}

// =====================================================
// 10. KIỂM TRA ĐỊNH DẠNG CHECKSUM
// =====================================================

/**
 * Chỉ kiểm tra một chuỗi nhập vào có đúng
 * dạng 64 ký tự hexadecimal hay không.
 *
 * Không gọi đây là xác minh checksum.
 */
function ChecksumFormatInspector() {
  const [checksum, setChecksum] = useState('');

  const hasInput = checksum.trim().length > 0;

  const formatValid = hasInput && hasSha256HexFormat(checksum);

  return (
    <Card variant="outlined">
      <CardContent
        sx={{
          p: 3,
          '&:last-child': { pb: 3 },
        }}
      >
        <Stack spacing={2.5}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            Kiểm tra định dạng SHA-256
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 12,
              lineHeight: 1.9,
            }}
          >
            Bạn có thể nhập chuỗi checksum để kiểm tra định dạng 64 ký tự hex. Công cụ không gửi dữ
            liệu tới Backend và không chứng minh sao kê nguyên vẹn.
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Chuỗi checksum"
            placeholder="Nhập SHA-256 hex"
            value={checksum}
            onChange={(event) => {
              setChecksum(event.target.value);
            }}
            helperText="64 ký tự thuộc tập 0–9 và a–f"
            slotProps={{
              htmlInput: {
                maxLength: 128,
              },
            }}
            sx={{
              '& textarea': {
                fontFamily: 'monospace',
                fontSize: 12,
                overflowWrap: 'anywhere',
              },
            }}
          />

          {hasInput && (
            <Alert severity={formatValid ? 'info' : 'warning'} variant="outlined">
              {formatValid
                ? 'Chuỗi có định dạng SHA-256 hex hợp lệ. Chưa xác minh được tính toàn vẹn.'
                : 'Chuỗi không có định dạng SHA-256 hex hợp lệ.'}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// =====================================================
// 11. TAB CHECKSUM VÀ TOÀN VẸN
// =====================================================

function IntegrityTab() {
  return (
    <Stack spacing={3}>
      <SectionHeading
        title="Checksum & Tính toàn vẹn"
        description={
          'Cơ chế SHA-256 từ ReconciliationEngine ' + 'và những điều kiện để xác minh sao kê.'
        }
        icon={<ShieldCheck size={25} weight="duotone" />}
      />

      <Alert
        severity="warning"
        variant="outlined"
        icon={<WarningCircle size={22} weight="duotone" />}
      >
        Hiện chưa thể xác minh độc lập checksum của sao kê đã lưu chỉ từ các trường của
        WeeklyStatementEntity. Không được coi checksum có 64 ký tự là bằng chứng xác thực tính toàn
        vẹn.
      </Alert>

      {/* ======================================
          CẤU TRÚC HASH THỰC TẾ
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
              <LockKey size={25} color="#635BFF" weight="duotone" />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                }}
              >
                Các trường tham gia checksum
              </Typography>
            </Stack>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.85,
              }}
            >
              Engine nối các trường theo đúng thứ tự, phân cách bằng dấu gạch đứng, sau đó tính
              SHA-256.
            </Typography>

            <Box
              component="code"
              sx={{
                display: 'block',
                p: 2,
                borderRadius: '12px',
                bgcolor: 'action.hover',
                fontSize: 12,
                lineHeight: 2,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {[
                'statementId',
                'storeId',
                'cycleId',
                'grossSales',
                'commissionAmount',
                'refundsDeduction',
                'subscriptionFee',
                'totalAdjustments',
                'netPayout',
                'generatedAt (ISO 8601)',
              ].join(' | ')}
            </Box>

            <Divider />

            <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
              Những dữ liệu cần lưu đầy đủ
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.9,
              }}
            >
              Engine tạo statementId theo mẫu STMT-storeId-cycleId và sử dụng generatedAt khi tính
              hash. Trong khi đó, entity sao kê đã lưu có ID dạng UUID và không lưu nguyên trường
              generatedAt của payload.
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 12,
                lineHeight: 1.9,
              }}
            >
              Vì vậy, trước khi bổ sung nút Xác minh toàn vẹn, Backend cần cung cấp payload gốc hoặc
              API xác minh lại hash một cách tin cậy.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <ChecksumFormatInspector />

      {/* ======================================
          QUYỀN KIỂM TRA VÀ XUẤT SAO KÊ
          ====================================== */}

      <Card variant="outlined">
        <CardContent
          sx={{
            p: 3,
            '&:last-child': { pb: 3 },
          }}
        >
          <Stack spacing={2}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
              }}
            >
              Xác minh sao kê toàn sàn
            </Typography>

            <Alert severity="info" variant="outlined">
              Backend có phương thức ReconciliationEngine.verifyChecksum(), nhưng chưa có API quản
              trị phù hợp để gọi phương thức này cho các sao kê đã lưu.
            </Alert>

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1.5}
            >
              <Button disabled variant="contained">
                Xác minh checksum
              </Button>

              <Button disabled variant="outlined">
                Tải sao kê đối chiếu
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

// =====================================================
// 12. COMPONENT SETTLEMENT PAGE
// =====================================================

export function SettlementPage() {
  const [activeTab, setActiveTab] = useState<SettlementTab>('statements');
  const [selectedStatementStatus, setSelectedStatementStatus] =
    useState<StatementStatusInfo | null>(null);
  const [metrics, setMetrics] = useState<AdminMetricsOverview['settlement'] | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingMetrics(true);
    getAdminMetricsOverview()
      .then((data) => {
        if (active) setMetrics(data.settlement);
      })
      .catch((err) => {
        console.error('Lỗi tải metrics đối soát:', err);
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
            Đối soát tài chính
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              mt: 1,
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            Theo dõi kỳ đối soát tuần, sao kê và tính toàn vẹn dữ liệu tài chính của SurplusIQ.
          </Typography>
        </Box>
      </Stack>

      {/* ======================================
          KPI TÀI CHÍNH TOÀN SÀN
          ====================================== */}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng doanh thu đối soát"
            value={metrics ? `${Number(metrics.totalGross).toLocaleString('vi-VN')} ₫` : '—'}
            icon={<CurrencyDollar size={26} weight="duotone" />}
            tone="primary"
            loading={loadingMetrics}
            status="ready"
            description="Tổng doanh số các kỳ sao kê"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Tổng tiền thực trả"
            value={metrics ? `${Number(metrics.totalNetPayable).toLocaleString('vi-VN')} ₫` : '—'}
            icon={<Receipt size={26} weight="duotone" />}
            tone="success"
            loading={loadingMetrics}
            status="ready"
            description="Sau khi trừ phí và hoàn tiền"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Sao kê đã khóa"
            value={metrics ? metrics.lockedStatements.toLocaleString('vi-VN') : '—'}
            icon={<LockKey size={26} weight="duotone" />}
            tone="primary"
            loading={loadingMetrics}
            status="ready"
            description="Kỳ đã chốt đối soát"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <AdminStatCard
            title="Checksum đã xác minh"
            value={metrics ? metrics.verifiedChecksums.toLocaleString('vi-VN') : '—'}
            icon={<ShieldCheck size={26} weight="duotone" />}
            tone="warning"
            loading={loadingMetrics}
            status="ready"
            description="Đã kiểm tra tính toàn vẹn"
          />
        </Grid>
      </Grid>

      {/* ======================================
          CÁC TAB ĐỐI SOÁT
          ====================================== */}

      <Card>
        <Box sx={{ px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, value: SettlementTab) => {
              setActiveTab(value);
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Các phân hệ đối soát"
          >
            <Tab value="statements" label="Sao kê tuần" />

            <Tab value="formula" label="Quy tắc đối soát" />

            <Tab value="integrity" label="Checksum & Toàn vẹn" />
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
          {activeTab === 'statements' && (
            <StatementsTab onSelectStatus={setSelectedStatementStatus} />
          )}

          {activeTab === 'formula' && <FormulaTab />}

          {activeTab === 'integrity' && <IntegrityTab />}
        </Box>
      </Card>

      {/* ======================================
          CẢNH BÁO NGHIỆP VỤ
          ====================================== */}

      <Alert
        severity="warning"
        variant="outlined"
        sx={{
          borderRadius: '12px',
        }}
      >
        <Stack spacing={1}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Điều kiện tích hợp Production
          </Typography>

          <Typography
            sx={{
              fontSize: 12,
              lineHeight: 1.85,
            }}
          >
            Mọi thao tác chốt kỳ, xác minh checksum, điều chỉnh tài chính và xuất báo cáo toàn sàn
            phải có API dành cho ADMIN, xác thực phân quyền, quy trình phê duyệt và Audit Logs.
          </Typography>
        </Stack>
      </Alert>

      {/* ======================================
          DRAWER TRẠNG THÁI
          ====================================== */}

      <StatementStatusDrawer
        selected={selectedStatementStatus}
        onClose={() => {
          setSelectedStatementStatus(null);
        }}
      />
    </Stack>
  );
}

export default SettlementPage;
