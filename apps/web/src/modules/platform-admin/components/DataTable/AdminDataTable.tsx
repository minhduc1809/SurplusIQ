import { useMemo, useState } from 'react';

import type { ReactNode } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  ArrowClockwise,
  DotsThreeVertical,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  WarningCircle,
} from '@phosphor-icons/react';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

/**
 * Các kiểu giá trị có thể sử dụng để
 * tìm kiếm và sắp xếp trong bảng.
 */
export type AdminTableValue = string | number | boolean | Date | null | undefined;

/**
 * Trạng thái sắp xếp hiện tại.
 */
export interface AdminTableSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

/**
 * Cấu hình một cột dữ liệu.
 *
 * value:
 *   Giá trị gốc dùng cho tìm kiếm và sắp xếp.
 *
 * render:
 *   Tùy chỉnh cách hiển thị ô dữ liệu.
 *
 * Có thể dùng render để hiển thị Avatar,
 * Status Chip hoặc các component khác.
 */
export interface AdminTableColumn<T> {
  id: string;

  label: string;

  value: (row: T) => AdminTableValue;

  render?: (row: T) => ReactNode;

  sortable?: boolean;

  searchable?: boolean;

  align?: 'left' | 'center' | 'right';

  minWidth?: number;

  width?: number | string;
}

/**
 * Cấu hình thao tác trên một dòng.
 *
 * disabled:
 *   Hàm xác định thao tác có được phép
 *   thực hiện trên dòng hiện tại hay không.
 *
 * Lưu ý: Phân quyền thực sự vẫn phải
 * được kiểm tra tại Backend.
 */
export interface AdminTableAction<T> {
  id: string;

  label: string;

  icon?: ReactNode;

  onClick: (row: T) => void;

  disabled?: (row: T) => boolean;

  destructive?: boolean;
}

/**
 * Trạng thái và callback cho bảng
 * sử dụng phân trang phía Backend.
 *
 * page:
 *   Số trang bắt đầu từ 0 theo Material UI.
 *
 * total:
 *   Tổng bản ghi do Backend cung cấp.
 *
 * rows:
 *   Chỉ chứa dữ liệu của trang hiện tại.
 */
export interface AdminTableServerState {
  page: number;

  pageSize: number;

  total: number;

  onPageChange: (page: number) => void;

  onPageSizeChange: (pageSize: number) => void;

  query?: string;

  onQueryChange?: (query: string) => void;

  sort?: AdminTableSort | null;

  onSortChange?: (sort: AdminTableSort | null) => void;
}

/**
 * Các thuộc tính dùng chung cho mọi chế độ.
 */
interface AdminDataTableBaseProps<T> {
  title: string;

  description?: string;

  rows: readonly T[];

  columns: readonly AdminTableColumn<T>[];

  getRowId: (row: T) => string;

  loading?: boolean;

  error?: string | null;

  onRetry?: () => void;

  selectable?: boolean;

  onSelectionChange?: (selectedRows: T[]) => void;

  actions?: readonly AdminTableAction<T>[];

  onRowClick?: (row: T) => void;

  toolbarActions?: ReactNode;

  emptyTitle?: string;

  emptyDescription?: string;

  pageSizeOptions?: number[];

  initialPageSize?: number;

  hideSearch?: boolean;
}

/**
 * Client Mode:
 *   Component tự tìm kiếm, sắp xếp,
 *   phân trang trên toàn bộ rows đã nhận.
 *
 * Server Mode:
 *   Component gửi thay đổi cho component cha.
 *   Backend chịu trách nhiệm trả dữ liệu đúng.
 */
export type AdminDataTableProps<T> = AdminDataTableBaseProps<T> &
  (
    | {
        mode?: 'client';
        server?: never;
      }
    | {
        mode: 'server';
        server: AdminTableServerState;
      }
  );

// =====================================================
// 2. CÁC HÀM TIỆN ÍCH
// =====================================================

/**
 * Chuẩn hóa văn bản để tìm kiếm
 * không phân biệt dấu tiếng Việt.
 */
function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Chuyển giá trị ô bảng thành chuỗi.
 */
function valueToText(value: AdminTableValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleString('vi-VN');
  }

  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không';
  }

  return String(value);
}

/**
 * Định dạng giá trị mặc định khi cột
 * không cung cấp hàm render riêng.
 */
function displayValue(value: AdminTableValue): ReactNode {
  if (value === null || value === undefined) {
    return '—';
  }

  if (value instanceof Date) {
    return value.toLocaleString('vi-VN');
  }

  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không';
  }

  return value;
}

/**
 * Bộ so sánh hỗ trợ số, ngày, boolean
 * và chuỗi tiếng Việt.
 */
function compareValues(first: AdminTableValue, second: AdminTableValue): number {
  const firstEmpty = first === null || first === undefined || first === '';

  const secondEmpty = second === null || second === undefined || second === '';

  if (firstEmpty && secondEmpty) {
    return 0;
  }

  if (firstEmpty) {
    return 1;
  }

  if (secondEmpty) {
    return -1;
  }

  if (first instanceof Date && second instanceof Date) {
    return first.getTime() - second.getTime();
  }

  if (typeof first === 'number' && typeof second === 'number') {
    return first - second;
  }

  if (typeof first === 'boolean' && typeof second === 'boolean') {
    return Number(first) - Number(second);
  }

  return new Intl.Collator('vi-VN', {
    numeric: true,
    sensitivity: 'base',
  }).compare(valueToText(first), valueToText(second));
}

// =====================================================
// 3. COMPONENT BẢNG DỮ LIỆU
// =====================================================

export function AdminDataTable<T extends object>(props: AdminDataTableProps<T>) {
  const {
    title,
    description,
    rows,
    columns,
    getRowId,
    loading = false,
    error = null,
    onRetry,
    selectable = false,
    onSelectionChange,
    actions = [],
    onRowClick,
    toolbarActions,
    emptyTitle = 'Chưa có dữ liệu',
    emptyDescription = 'Không có bản ghi phù hợp để hiển thị.',
    pageSizeOptions = [10, 20, 25, 50],
    initialPageSize = 10,
    hideSearch = false,
  } = props;

  // ---------------------------------------------------
  // Xác định bảng đang sử dụng chế độ nào
  // ---------------------------------------------------

  const isServer = props.mode === 'server';

  const server = isServer ? props.server : undefined;

  // ---------------------------------------------------
  // Trạng thái dành cho Client Mode
  // ---------------------------------------------------

  const [localQuery, setLocalQuery] = useState('');

  const [localSort, setLocalSort] = useState<AdminTableSort | null>(null);

  const [localPage, setLocalPage] = useState(0);

  const [localPageSize, setLocalPageSize] = useState(initialPageSize);

  // ---------------------------------------------------
  // Trạng thái chọn dòng
  // ---------------------------------------------------

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // ---------------------------------------------------
  // Trạng thái menu thao tác của dòng
  // ---------------------------------------------------

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const [menuRow, setMenuRow] = useState<T | null>(null);

  // ---------------------------------------------------
  // Lấy trạng thái phù hợp với chế độ bảng
  // ---------------------------------------------------

  const query = server ? (server.query ?? '') : localQuery;

  const sort = server ? (server.sort ?? null) : localSort;

  const page = server ? server.page : localPage;

  const pageSize = server ? server.pageSize : localPageSize;

  // Chỉ bật tìm kiếm trên Server Mode
  // khi component cha cung cấp callback.
  const searchEnabled = !hideSearch && (!isServer || Boolean(server?.onQueryChange));

  // ===================================================
  // 4. TÌM KIẾM VÀ SẮP XẾP CLIENT-SIDE
  // ===================================================

  const processedRows = useMemo(() => {
    // Không xử lý lại dữ liệu trong Server Mode
    // vì Backend đã thực hiện phân trang và lọc.
    if (isServer) {
      return [...rows];
    }

    const keyword = normalizeText(query);

    // Chỉ tìm kiếm trong các cột được cho phép.
    const filteredRows = keyword
      ? rows.filter((row) =>
          columns.some((column) => {
            if (column.searchable === false) {
              return false;
            }

            const rawValue = column.value(row);

            return normalizeText(valueToText(rawValue)).includes(keyword);
          }),
        )
      : [...rows];

    if (!sort) {
      return filteredRows;
    }

    const activeColumn = columns.find((column) => column.id === sort.columnId && column.sortable);

    if (!activeColumn) {
      return filteredRows;
    }

    // Không thay đổi thứ tự mảng rows gốc.
    return [...filteredRows].sort((first, second) => {
      const comparison = compareValues(activeColumn.value(first), activeColumn.value(second));

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [rows, columns, isServer, query, sort]);

  // ===================================================
  // 5. XÁC ĐỊNH PHÂN TRANG
  // ===================================================

  const totalRows = server ? Math.max(0, server.total) : processedRows.length;

  const safePageSize = Math.max(1, pageSize);

  const maxPage = Math.max(0, Math.ceil(totalRows / safePageSize) - 1);

  const safePage = server ? Math.max(0, page) : Math.min(Math.max(0, page), maxPage);

  const visibleRows = isServer
    ? processedRows
    : processedRows.slice(safePage * safePageSize, (safePage + 1) * safePageSize);

  // Tổng số cột bao gồm checkbox và action.
  const totalColumns = columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0);

  // ===================================================
  // 6. QUẢN LÝ TÌM KIẾM
  // ===================================================

  const handleQueryChange = (nextQuery: string) => {
    if (server) {
      // Component cha chịu trách nhiệm gọi Backend
      // và đưa trang về 0 khi từ khóa thay đổi.
      server.onQueryChange?.(nextQuery);
    } else {
      setLocalQuery(nextQuery);
      setLocalPage(0);
    }

    clearSelection();
  };

  // ===================================================
  // 7. QUẢN LÝ SẮP XẾP
  // ===================================================

  const handleSortChange = (columnId: string) => {
    const nextSort: AdminTableSort = {
      columnId,

      direction: sort?.columnId === columnId && sort.direction === 'asc' ? 'desc' : 'asc',
    };

    if (server) {
      // Backend chịu trách nhiệm sắp xếp.
      // Component cha phải chuyển cột thành
      // tham số mà endpoint thực tế hỗ trợ.
      server.onSortChange?.(nextSort);
    } else {
      setLocalSort(nextSort);
      setLocalPage(0);
    }

    clearSelection();
  };

  // ===================================================
  // 8. QUẢN LÝ PHÂN TRANG
  // ===================================================

  const handlePageChange = (nextPage: number) => {
    if (server) {
      server.onPageChange(nextPage);
    } else {
      setLocalPage(nextPage);
    }

    clearSelection();
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    if (server) {
      // Component cha cần đặt page = 0
      // đồng thời cập nhật pageSize.
      server.onPageSizeChange(nextPageSize);
    } else {
      setLocalPageSize(nextPageSize);
      setLocalPage(0);
    }

    clearSelection();
  };

  // ===================================================
  // 9. QUẢN LÝ CHỌN DÒNG
  // ===================================================

  /**
   * Chỉ trả về các bản ghi đang có trong
   * dữ liệu mà component được cung cấp.
   *
   * Với Server Mode, lựa chọn chỉ giới hạn
   * trong trang đang được tải.
   */
  const updateSelection = (nextSelectedIds: Set<string>) => {
    setSelectedIds(nextSelectedIds);

    const selectedRows = rows.filter((row) => nextSelectedIds.has(getRowId(row)));

    onSelectionChange?.(selectedRows);
  };

  function clearSelection() {
    setSelectedIds(new Set());
    onSelectionChange?.([]);
  }

  const handleSelectRow = (row: T, checked: boolean) => {
    const rowId = getRowId(row);

    const nextIds = new Set(selectedIds);

    if (checked) {
      nextIds.add(rowId);
    } else {
      nextIds.delete(rowId);
    }

    updateSelection(nextIds);
  };

  const handleSelectAll = (checked: boolean) => {
    const nextIds = new Set(isServer ? [] : selectedIds);

    for (const row of visibleRows) {
      const rowId = getRowId(row);

      if (checked) {
        nextIds.add(rowId);
      } else {
        nextIds.delete(rowId);
      }
    }

    updateSelection(nextIds);
  };

  const selectedVisibleCount = visibleRows.filter((row) => selectedIds.has(getRowId(row))).length;

  const allVisibleSelected = visibleRows.length > 0 && selectedVisibleCount === visibleRows.length;

  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  // ===================================================
  // 10. MENU THAO TÁC THEO DÒNG
  // ===================================================

  const openRowMenu = (element: HTMLElement, row: T) => {
    setMenuAnchor(element);
    setMenuRow(row);
  };

  const closeRowMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  // ===================================================
  // 11. GIAO DIỆN CHÍNH
  // ===================================================

  return (
    <Card
      sx={{
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* ==========================================
          THANH CÔNG CỤ PHÍA TRÊN BẢNG
          ========================================== */}

      <Box
        sx={{
          px: {
            xs: 2,
            md: 3,
          },
          py: 2.5,
        }}
      >
        <Stack spacing={2.5}>
          {/* TIÊU ĐỀ VÀ THAO TÁC CHUNG */}

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={2}
            sx={{
              justifyContent: 'space-between',
              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },
            }}
          >
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                }}
              >
                {title}
              </Typography>

              {description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {description}
                </Typography>
              )}
            </Box>

            {/* Chỉ hiển thị các hành động
                mà component cha cung cấp. */}

            {toolbarActions && <Box>{toolbarActions}</Box>}
          </Stack>

          {/* TÌM KIẾM */}

          {searchEnabled && (
            <TextField
              fullWidth
              size="small"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Tìm kiếm dữ liệu..."
              aria-label={`Tìm kiếm ${title}`}
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
                maxWidth: 420,

                '& .MuiOutlinedInput-root': {
                  minHeight: 42,
                  borderRadius: '12px',
                },
              }}
            />
          )}

          {/* HIỂN THỊ SỐ DÒNG ĐƯỢC CHỌN */}

          {selectable && selectedIds.size > 0 && (
            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: 'center',
              }}
            >
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${
                  rows.filter((row) => selectedIds.has(getRowId(row))).length
                } dòng đã chọn`}
              />

              <Button size="small" onClick={clearSelection}>
                Bỏ chọn
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* ==========================================
          BẢNG DỮ LIỆU
          ========================================== */}

      <TableContainer
        sx={{
          overflowX: 'auto',
        }}
      >
        <Table
          size="medium"
          aria-label={title}
          sx={{
            minWidth: 680,
          }}
        >
          {/* ========================================
              HEADER
              ======================================== */}

          <TableHead>
            <TableRow>
              {/* CHECKBOX CHỌN TOÀN BỘ TRANG */}

              {selectable && (
                <TableCell padding="checkbox" sx={{ pl: 2 }}>
                  <Checkbox
                    size="small"
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    disabled={loading || Boolean(error) || visibleRows.length === 0}
                    onChange={(event) => handleSelectAll(event.target.checked)}
                    slotProps={{
                      input: {
                        'aria-label': 'Chọn tất cả dòng trên trang',
                      },
                    }}
                  />
                </TableCell>
              )}

              {/* TIÊU ĐỀ TỪNG CỘT */}

              {columns.map((column) => {
                const sortingEnabled =
                  column.sortable === true && (!isServer || Boolean(server?.onSortChange));

                const isActiveSort = sort?.columnId === column.id;

                return (
                  <TableCell
                    key={column.id}
                    align={column.align ?? 'left'}
                    sortDirection={isActiveSort ? sort?.direction : false}
                    sx={{
                      minWidth: column.minWidth,
                      width: column.width,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sortingEnabled ? (
                      <TableSortLabel
                        active={isActiveSort}
                        direction={isActiveSort ? sort!.direction : 'asc'}
                        onClick={() => handleSortChange(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                );
              })}

              {/* CỘT THAO TÁC */}

              {actions.length > 0 && (
                <TableCell align="right" sx={{ width: 72 }}>
                  Thao tác
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          {/* ========================================
              BODY
              ======================================== */}

          <TableBody>
            {/* TRẠNG THÁI ĐANG TẢI */}

            {loading &&
              Array.from({
                length: Math.min(safePageSize, 5),
              }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {Array.from({
                    length: totalColumns,
                  }).map((__, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton height={28} width={cellIndex % 2 === 0 ? '80%' : '65%'} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {/* TRẠNG THÁI LỖI */}

            {!loading && error && (
              <TableRow>
                <TableCell colSpan={totalColumns}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      py: 3,
                    }}
                  >
                    <Alert
                      severity="error"
                      icon={<WarningCircle size={22} />}
                      action={
                        onRetry ? (
                          <Button
                            color="inherit"
                            size="small"
                            onClick={onRetry}
                            startIcon={<ArrowClockwise size={16} />}
                          >
                            Thử lại
                          </Button>
                        ) : undefined
                      }
                      sx={{
                        width: '100%',
                        maxWidth: 720,
                        borderRadius: '12px',
                      }}
                    >
                      {error}
                    </Alert>
                  </Box>
                </TableCell>
              </TableRow>
            )}

            {/* TRẠNG THÁI KHÔNG CÓ DỮ LIỆU */}

            {!loading && !error && visibleRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={totalColumns}>
                  <Stack
                    spacing={1.5}
                    sx={{
                      alignItems: 'center',
                      py: 7,
                      px: 2,
                      textAlign: 'center',
                    }}
                  >
                    <MagnifyingGlassMinus size={42} color="#98A2B3" weight="duotone" />

                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: 15,
                      }}
                    >
                      {query ? 'Không tìm thấy kết quả' : emptyTitle}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        maxWidth: 380,
                        fontSize: 13,
                      }}
                    >
                      {query ? 'Hãy thử thay đổi từ khóa tìm kiếm.' : emptyDescription}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}

            {/* HIỂN THỊ CÁC DÒNG DỮ LIỆU */}

            {!loading &&
              !error &&
              visibleRows.map((row) => {
                const rowId = getRowId(row);

                const isSelected = selectedIds.has(rowId);

                return (
                  <TableRow
                    key={rowId}
                    hover
                    selected={isSelected}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                  >
                    {/* CHECKBOX TỪNG DÒNG */}

                    {selectable && (
                      <TableCell
                        padding="checkbox"
                        sx={{ pl: 2 }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={(event) => handleSelectRow(row, event.target.checked)}
                          slotProps={{
                            input: {
                              'aria-label': `Chọn dòng ${rowId}`,
                            },
                          }}
                        />
                      </TableCell>
                    )}

                    {/* DỮ LIỆU TỪNG CỘT */}

                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align ?? 'left'}
                        sx={{
                          minWidth: column.minWidth,
                          maxWidth: 420,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {column.render ? column.render(row) : displayValue(column.value(row))}
                      </TableCell>
                    ))}

                    {/* MENU THAO TÁC */}

                    {actions.length > 0 && (
                      <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                        <Tooltip title="Thao tác">
                          <IconButton
                            size="small"
                            aria-label={`Thao tác dòng ${rowId}`}
                            onClick={(event) => openRowMenu(event.currentTarget, row)}
                          >
                            <DotsThreeVertical size={21} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ==========================================
          PHÂN TRANG
          ========================================== */}

      <TablePagination
        component="div"
        count={totalRows}
        page={safePage}
        rowsPerPage={safePageSize}
        rowsPerPageOptions={pageSizeOptions}
        onPageChange={(_event, nextPage) => {
          handlePageChange(nextPage);
        }}
        onRowsPerPageChange={(event) => {
          handlePageSizeChange(Number(event.target.value));
        }}
        labelRowsPerPage="Số dòng mỗi trang:"
        labelDisplayedRows={({ from, to, count }) => {
          return `${from}–${to} trong ` + `${count.toLocaleString('vi-VN')} bản ghi`;
        }}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',

          '.MuiTablePagination-toolbar': {
            minHeight: 60,
            flexWrap: 'wrap',
            gap: 1,
            px: 2,
          },
        }}
      />

      {/* ==========================================
          MENU THAO TÁC CỦA DÒNG
          ========================================== */}

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor) && menuRow !== null}
        onClose={closeRowMenu}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180,
              borderRadius: '12px',
              mt: 0.5,
            },
          },
        }}
      >
        {actions.map((action) => {
          const disabled = menuRow !== null && Boolean(action.disabled?.(menuRow));

          return (
            <MenuItem
              key={action.id}
              disabled={disabled}
              onClick={() => {
                const selectedRow = menuRow;

                closeRowMenu();

                if (selectedRow !== null) {
                  action.onClick(selectedRow);
                }
              }}
              sx={{
                gap: 1.5,
                fontSize: 13,
                py: 1.2,

                color: action.destructive ? 'error.main' : 'text.primary',
              }}
            >
              {action.icon && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {action.icon}
                </Box>
              )}

              {action.label}
            </MenuItem>
          );
        })}
      </Menu>
    </Card>
  );
}

export default AdminDataTable;
