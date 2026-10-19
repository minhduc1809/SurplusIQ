import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  MagnifyingGlass,
  Funnel,
  CaretDown,
  CaretUp,
  X,
  ArrowsClockwise,
} from '@phosphor-icons/react';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

/**
 * Mỗi bộ lọc sử dụng một đối tượng chứa
 * tên trường và giá trị tương ứng.
 *
 * Tất cả giá trị được lưu dạng chuỗi
 * để dễ chuyển thành tham số query của API.
 */
export type AdminFilterValues = Record<string, string>;

/**
 * Cấu hình ô tìm kiếm.
 */
export interface AdminSearchFilter {
  type: 'search';
  key: string;
  label: string;
  placeholder?: string;
}

/**
 * Một lựa chọn trong Select.
 */
export interface AdminSelectOption {
  value: string;
  label: string;
}

/**
 * Cấu hình bộ lọc dạng Select.
 */
export interface AdminSelectFilter {
  type: 'select';
  key: string;
  label: string;
  options: readonly AdminSelectOption[];
  placeholder?: string;
}

/**
 * Cấu hình bộ lọc khoảng ngày.
 *
 * startKey và endKey phải khác nhau
 * để lưu riêng ngày bắt đầu và ngày kết thúc.
 */
export interface AdminDateRangeFilter {
  type: 'date-range';
  label: string;
  startKey: string;
  endKey: string;
}

/**
 * Các loại bộ lọc được hỗ trợ.
 */
export type AdminFilterDefinition = AdminSearchFilter | AdminSelectFilter | AdminDateRangeFilter;

/**
 * Thuộc tính của thanh bộ lọc.
 *
 * Component chỉ quản lý trạng thái đóng/mở
 * của bộ lọc nâng cao.
 *
 * Giá trị lọc thực tế được quản lý bởi
 * component cha thông qua values/onChange.
 */
export interface AdminFilterBarProps {
  title?: string;
  description?: string;

  filters: readonly AdminFilterDefinition[];

  values: AdminFilterValues;

  onChange: (values: AdminFilterValues) => void;

  // Nếu truyền onApply, nút Áp dụng sẽ xuất hiện.
  // Component cha sẽ quyết định cách gọi API.
  onApply?: (values: AdminFilterValues) => void;

  // Callback bổ sung khi đặt lại bộ lọc.
  onReset?: () => void;

  loading?: boolean;

  actions?: ReactNode;

  defaultExpanded?: boolean;
}

/**
 * Thông tin dùng để hiển thị
 * các Chip của bộ lọc đang có giá trị.
 */
interface ActiveFilterChip {
  id: string;
  label: string;
  keys: string[];
}

// =====================================================
// 2. HÀM TIỆN ÍCH
// =====================================================

/**
 * Lấy danh sách key mà một bộ lọc sử dụng.
 */
function getFilterKeys(filter: AdminFilterDefinition): string[] {
  if (filter.type === 'date-range') {
    return [filter.startKey, filter.endKey];
  }

  return [filter.key];
}

/**
 * Định dạng ngày từ YYYY-MM-DD sang DD/MM/YYYY.
 *
 * Chỉ dùng để hiển thị Chip.
 * Giá trị gốc được giữ nguyên để gửi cho Backend.
 */
function formatDate(value: string): string {
  const parts = value.split('-');

  if (parts.length !== 3) {
    return value;
  }

  return [parts[2], parts[1], parts[0]].join('/');
}

/**
 * Tạo các Chip tương ứng với điều kiện đang lọc.
 */
function createActiveChips(
  filters: readonly AdminFilterDefinition[],
  values: AdminFilterValues,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const filter of filters) {
    if (filter.type === 'date-range') {
      const start = values[filter.startKey] ?? '';
      const end = values[filter.endKey] ?? '';

      if (start) {
        chips.push({
          id: filter.startKey,
          label: `${filter.label}: Từ ${formatDate(start)}`,
          keys: [filter.startKey],
        });
      }

      if (end) {
        chips.push({
          id: filter.endKey,
          label: `${filter.label}: Đến ${formatDate(end)}`,
          keys: [filter.endKey],
        });
      }

      continue;
    }

    const value = (values[filter.key] ?? '').trim();

    if (!value) {
      continue;
    }

    if (filter.type === 'select') {
      const selectedOption = filter.options.find((option) => option.value === value);

      chips.push({
        id: filter.key,
        label: `${filter.label}: ` + (selectedOption?.label ?? value),
        keys: [filter.key],
      });
    } else {
      chips.push({
        id: filter.key,
        label: `${filter.label}: ${value}`,
        keys: [filter.key],
      });
    }
  }

  return chips;
}

// =====================================================
// 3. COMPONENT ADMIN FILTER BAR
// =====================================================

export function AdminFilterBar({
  title = 'Bộ lọc',
  description,
  filters,
  values,
  onChange,
  onApply,
  onReset,
  loading = false,
  actions,
  defaultExpanded = false,
}: AdminFilterBarProps) {
  // ---------------------------------------------------
  // Trạng thái đóng/mở bộ lọc nâng cao
  // ---------------------------------------------------

  const [expanded, setExpanded] = useState(defaultExpanded);

  // ---------------------------------------------------
  // Phân loại bộ lọc
  // ---------------------------------------------------

  const searchFilters = filters.filter(
    (filter): filter is AdminSearchFilter => filter.type === 'search',
  );

  const advancedFilters = filters.filter((filter) => filter.type !== 'search');

  const hasAdvancedFilters = advancedFilters.length > 0;

  // ---------------------------------------------------
  // Danh sách các điều kiện đang được chọn
  // ---------------------------------------------------

  const activeChips = useMemo(() => createActiveChips(filters, values), [filters, values]);

  const activeCount = activeChips.length;

  // ---------------------------------------------------
  // Kiểm tra khoảng ngày hợp lệ
  // ---------------------------------------------------

  const invalidDateRange = advancedFilters.some((filter) => {
    if (filter.type !== 'date-range') {
      return false;
    }

    const start = values[filter.startKey];
    const end = values[filter.endKey];

    // Định dạng YYYY-MM-DD cho phép so sánh
    // thứ tự ngày bằng so sánh chuỗi.
    return Boolean(start && end && start > end);
  });

  // ===================================================
  // 4. XỬ LÝ THAY ĐỔI GIÁ TRỊ
  // ===================================================

  /**
   * Cập nhật một trường và giữ nguyên
   * các giá trị còn lại.
   */
  const updateField = (key: string, value: string) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  /**
   * Xóa một hoặc nhiều trường
   * nhưng không làm mất các điều kiện khác.
   */
  const clearFields = (keys: string[]) => {
    const nextValues = {
      ...values,
    };

    for (const key of keys) {
      nextValues[key] = '';
    }

    onChange(nextValues);
  };

  /**
   * Đặt lại toàn bộ các trường được
   * khai báo trong cấu hình filters.
   *
   * Những key ngoài cấu hình được giữ nguyên.
   */
  const resetFilters = () => {
    const nextValues = {
      ...values,
    };

    for (const filter of filters) {
      for (const key of getFilterKeys(filter)) {
        nextValues[key] = '';
      }
    }

    onChange(nextValues);

    // Component cha có thể dùng callback này
    // để đặt lại trang phân trang hoặc query API.
    onReset?.();
  };

  /**
   * Chỉ áp dụng bộ lọc khi khoảng ngày hợp lệ.
   */
  const applyFilters = () => {
    if (invalidDateRange || loading) {
      return;
    }

    onApply?.({
      ...values,
    });
  };

  // ===================================================
  // 5. RENDER BỘ LỌC NÂNG CAO
  // ===================================================

  const renderAdvancedFilter = (filter: AdminSelectFilter | AdminDateRangeFilter) => {
    // -----------------------------------------------
    // SELECT
    // -----------------------------------------------

    if (filter.type === 'select') {
      return (
        <TextField
          key={filter.key}
          fullWidth
          select
          size="small"
          label={filter.label}
          value={values[filter.key] ?? ''}
          onChange={(event) => updateField(filter.key, event.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              minHeight: 46,
              borderRadius: '12px',
            },
          }}
        >
          <MenuItem value="">{filter.placeholder ?? 'Tất cả'}</MenuItem>

          {filter.options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    // -----------------------------------------------
    // KHOẢNG NGÀY
    // -----------------------------------------------

    const startValue = values[filter.startKey] ?? '';

    const endValue = values[filter.endKey] ?? '';

    const rangeInvalid = Boolean(startValue && endValue && startValue > endValue);

    return (
      <Box
        key={`${filter.startKey}-${filter.endKey}`}
        sx={{
          gridColumn: {
            xs: 'auto',
            md: 'span 2',
          },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <TextField
            fullWidth
            type="date"
            size="small"
            label={`${filter.label} - Từ ngày`}
            value={startValue}
            onChange={(event) => updateField(filter.startKey, event.target.value)}
            error={rangeInvalid}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                minHeight: 46,
                borderRadius: '12px',
              },
            }}
          />

          <TextField
            fullWidth
            type="date"
            size="small"
            label={`${filter.label} - Đến ngày`}
            value={endValue}
            onChange={(event) => updateField(filter.endKey, event.target.value)}
            error={rangeInvalid}
            helperText={rangeInvalid ? 'Ngày kết thúc không được trước ngày bắt đầu' : undefined}
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                minHeight: 46,
                borderRadius: '12px',
              },
            }}
          />
        </Box>
      </Box>
    );
  };

  // ===================================================
  // 6. GIAO DIỆN CHÍNH
  // ===================================================

  return (
    <Card
      sx={{
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: {
            xs: 2,
            sm: 3,
          },
        }}
      >
        <Stack spacing={2.5}>
          {/* ======================================
              TIÊU ĐỀ VÀ CÔNG CỤ MỞ RỘNG
              ====================================== */}

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            sx={{
              alignItems: {
                xs: 'stretch',
                sm: 'center',
              },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  bgcolor: 'action.hover',
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <Funnel size={20} weight="duotone" />
              </Box>

              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                  }}
                >
                  {title}
                </Typography>

                {description && (
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                )}
              </Box>
            </Stack>

            {actions && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {actions}
              </Box>
            )}
          </Stack>

          {/* ======================================
              TÌM KIẾM CHÍNH
              ====================================== */}

          {searchFilters.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              {searchFilters.map((filter) => (
                <TextField
                  key={filter.key}
                  fullWidth
                  size="small"
                  label={filter.label}
                  placeholder={filter.placeholder ?? 'Nhập từ khóa tìm kiếm...'}
                  value={values[filter.key] ?? ''}
                  onChange={(event) => updateField(filter.key, event.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MagnifyingGlass size={19} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      minHeight: 46,
                      borderRadius: '12px',
                    },
                  }}
                />
              ))}
            </Box>
          )}

          {/* ======================================
              NÚT BẬT / TẮT LỌC NÂNG CAO
              ====================================== */}

          {hasAdvancedFilters && (
            <Box>
              <Button
                type="button"
                variant="text"
                color="primary"
                onClick={() => setExpanded((previous) => !previous)}
                startIcon={<Funnel size={17} />}
                endIcon={expanded ? <CaretUp size={15} /> : <CaretDown size={15} />}
                aria-expanded={expanded}
                sx={{
                  px: 1,
                }}
              >
                Bộ lọc nâng cao
                {activeCount > 0 && ` (${activeCount})`}
              </Button>
            </Box>
          )}

          {/* ======================================
              KHU VỰC LỌC NÂNG CAO
              ====================================== */}

          {hasAdvancedFilters && (
            <Collapse in={expanded} timeout={200} unmountOnExit>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 2,
                  pt: 1,
                  pb: 1,
                }}
              >
                {advancedFilters.map((filter) => renderAdvancedFilter(filter))}
              </Box>
            </Collapse>
          )}

          {/* ======================================
              CẢNH BÁO KHOẢNG NGÀY KHÔNG HỢP LỆ
              ====================================== */}

          {invalidDateRange && (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                borderRadius: '12px',
              }}
            >
              Khoảng thời gian không hợp lệ. Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.
            </Alert>
          )}

          {/* ======================================
              CÁC ĐIỀU KIỆN ĐANG CÓ GIÁ TRỊ
              ====================================== */}

          {activeChips.length > 0 && (
            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  mr: 0.5,
                  fontWeight: 600,
                }}
              >
                Đang chọn:
              </Typography>

              {activeChips.map((chip) => (
                <Chip
                  key={chip.id}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={chip.label}
                  onDelete={() => clearFields(chip.keys)}
                  deleteIcon={<X size={13} />}
                  sx={{
                    maxWidth: '100%',
                    borderRadius: '8px',

                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              ))}
            </Stack>
          )}

          {/* ======================================
              THANH THAO TÁC CUỐI
              ====================================== */}

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            sx={{
              alignItems: {
                xs: 'stretch',
                sm: 'center',
              },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Button
              type="button"
              variant="text"
              color="inherit"
              startIcon={<ArrowsClockwise size={17} />}
              onClick={resetFilters}
              disabled={loading || activeCount === 0}
              sx={{
                color: 'text.secondary',
              }}
            >
              Đặt lại bộ lọc
            </Button>

            {onApply && (
              <Button
                type="button"
                variant="contained"
                onClick={applyFilters}
                disabled={loading || invalidDateRange}
                sx={{
                  minWidth: 145,
                }}
              >
                Áp dụng bộ lọc
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Card>
  );
}

export default AdminFilterBar;
