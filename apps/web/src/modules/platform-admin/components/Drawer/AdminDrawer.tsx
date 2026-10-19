import { useEffect, useId, useState } from 'react';

import type { ReactNode } from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import { ArrowClockwise, FloppyDisk, Warning, X } from '@phosphor-icons/react';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

/**
 * Ba kích thước Drawer dùng trong hệ thống.
 *
 * sm: Chi tiết ngắn, xem thông tin đơn giản.
 * md: Chi tiết đối tượng hoặc biểu mẫu thông thường.
 * lg: Biểu mẫu dài và thông tin nhiều cột.
 */
export type AdminDrawerSize = 'sm' | 'md' | 'lg';

/**
 * Thuộc tính của component Drawer.
 *
 * Trạng thái open được quản lý bởi trang cha.
 * Component không tự lưu dữ liệu vào Backend.
 */
export interface AdminDrawerProps {
  // Trạng thái hiển thị Drawer.
  open: boolean;

  // Hàm đóng Drawer từ component cha.
  onClose: () => void;

  // Tiêu đề chính.
  title: string;

  // Mô tả ngắn bên dưới tiêu đề.
  description?: string;

  // Nhãn nhỏ phía trên tiêu đề.
  overline?: string;

  // Biểu tượng hiển thị tại Header.
  icon?: ReactNode;

  // Kích thước Drawer.
  size?: AdminDrawerSize;

  // Nội dung chính.
  children: ReactNode;

  // Nội dung tùy chỉnh ở Header.
  headerActions?: ReactNode;

  // Footer tùy chỉnh.
  // Nếu có footer, các nút lưu mặc định sẽ bị thay thế.
  footer?: ReactNode;

  // Hàm lưu do trang cha cung cấp.
  onSubmit?: () => void;

  // Nhãn nút lưu.
  submitLabel?: string;

  // Đang lấy dữ liệu chi tiết từ API.
  loading?: boolean;

  // Đang gửi dữ liệu lên Backend.
  saving?: boolean;

  // Vô hiệu hóa nút lưu theo điều kiện nghiệp vụ.
  submitDisabled?: boolean;

  // Thông báo lỗi do API trả về.
  error?: string | null;

  // Hàm tải lại dữ liệu khi phát sinh lỗi.
  onRetry?: () => void;

  // Cho biết biểu mẫu đã có thay đổi chưa lưu.
  dirty?: boolean;

  // Nội dung cảnh báo khi đóng biểu mẫu chưa lưu.
  discardMessage?: string;

  // Padding khu vực nội dung chính.
  contentPadding?: number;
}

// =====================================================
// 2. CẤU HÌNH KÍCH THƯỚC
// =====================================================

const DRAWER_WIDTHS: Record<AdminDrawerSize, number> = {
  sm: 440,
  md: 560,
  lg: 720,
};

// =====================================================
// 3. COMPONENT LOADING
// =====================================================

/**
 * Hiển thị cấu trúc Skeleton khi trang cha
 * đang tải dữ liệu chi tiết từ Backend.
 *
 * Không sử dụng đối tượng hoặc dữ liệu giả.
 */
function AdminDrawerSkeleton() {
  return (
    <Stack spacing={3} aria-label="Đang tải nội dung" aria-busy="true">
      <Stack spacing={1}>
        <Skeleton variant="text" width="30%" height={18} />

        <Skeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: '10px' }} />
      </Stack>

      <Stack spacing={1}>
        <Skeleton variant="text" width="38%" height={18} />

        <Skeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: '10px' }} />
      </Stack>

      <Stack spacing={1}>
        <Skeleton variant="text" width="25%" height={18} />

        <Skeleton variant="rounded" width="75%" height={44} sx={{ borderRadius: '10px' }} />
      </Stack>

      <Skeleton variant="rounded" width="100%" height={120} sx={{ borderRadius: '12px' }} />
    </Stack>
  );
}

// =====================================================
// 4. COMPONENT DRAWER CHÍNH
// =====================================================

export function AdminDrawer({
  open,
  onClose,
  title,
  description,
  overline,
  icon,
  size = 'md',
  children,
  headerActions,
  footer,
  onSubmit,
  submitLabel = 'Lưu thay đổi',
  loading = false,
  saving = false,
  submitDisabled = false,
  error = null,
  onRetry,
  dirty = false,
  discardMessage = 'Những thay đổi chưa lưu sẽ bị mất. Bạn có chắc chắn muốn đóng?',
  contentPadding = 3,
}: AdminDrawerProps) {
  // ---------------------------------------------------
  // Tạo ID để hỗ trợ trình đọc màn hình.
  // ---------------------------------------------------

  const titleId = useId();
  const descriptionId = useId();
  const confirmTitleId = useId();

  // ---------------------------------------------------
  // Trạng thái hiển thị hộp thoại xác nhận đóng.
  // ---------------------------------------------------

  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  // ---------------------------------------------------
  // Đóng hộp thoại xác nhận khi Drawer đã đóng.
  // ---------------------------------------------------

  useEffect(() => {
    if (!open) {
      setConfirmCloseOpen(false);
    }
  }, [open]);

  // ===================================================
  // 5. XỬ LÝ YÊU CẦU ĐÓNG DRAWER
  // ===================================================

  /**
   * Mọi thao tác đóng từ bên trong Drawer
   * đều phải đi qua hàm này.
   *
   * Các trường hợp:
   * - Đang lưu: không cho phép đóng.
   * - Có thay đổi chưa lưu: yêu cầu xác nhận.
   * - Không có thay đổi: đóng ngay.
   */
  const requestClose = () => {
    if (saving) {
      return;
    }

    if (dirty) {
      setConfirmCloseOpen(true);
      return;
    }

    onClose();
  };

  /**
   * Người dùng xác nhận bỏ các thay đổi.
   *
   * Drawer không tự xóa dữ liệu biểu mẫu.
   * Trang cha sẽ thực hiện reset khi đóng.
   */
  const confirmDiscard = () => {
    setConfirmCloseOpen(false);
    onClose();
  };

  /**
   * Người dùng chọn tiếp tục chỉnh sửa.
   */
  const cancelDiscard = () => {
    setConfirmCloseOpen(false);
  };

  // ===================================================
  // 6. XÁC ĐỊNH FOOTER
  // ===================================================

  const hasFooter = footer !== undefined || onSubmit !== undefined;

  // ===================================================
  // 7. GIAO DIỆN DRAWER
  // ===================================================

  return (
    <>
      <Drawer
        anchor="right"
        variant="temporary"
        open={open}
        onClose={requestClose}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-labelledby': titleId,
            'aria-describedby': description ? descriptionId : undefined,

            sx: {
              width: {
                xs: '100%',
                sm: DRAWER_WIDTHS[size],
              },

              maxWidth: '100vw',
              height: '100%',
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              boxShadow: '-12px 0 48px rgba(16,24,40,0.15)',

              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* ======================================
            HEADER CỐ ĐỊNH
            ====================================== */}

        <Box
          component="header"
          sx={{
            px: {
              xs: 2.5,
              sm: 3,
            },

            py: 2.5,
            flexShrink: 0,
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'flex-start',
            }}
            spacing={2}
          >
            {/* BIỂU TƯỢNG */}

            {icon && (
              <Avatar
                variant="rounded"
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: '13px',
                  bgcolor: 'action.selected',
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                {icon}
              </Avatar>
            )}

            {/* TIÊU ĐỀ VÀ MÔ TẢ */}

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
              }}
            >
              {overline && (
                <Typography
                  variant="overline"
                  color="primary.main"
                  sx={{
                    display: 'block',
                    mb: 0.5,
                    lineHeight: 1.5,
                  }}
                >
                  {overline}
                </Typography>
              )}

              <Typography
                id={titleId}
                component="h2"
                variant="h6"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.4,
                  overflowWrap: 'anywhere',
                }}
              >
                {title}
              </Typography>

              {description && (
                <Typography
                  id={descriptionId}
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 0.75,
                    lineHeight: 1.65,
                  }}
                >
                  {description}
                </Typography>
              )}
            </Box>

            {/* CÔNG CỤ HEADER */}

            <Stack
              direction="row"
              sx={{
                alignItems: 'center',
              }}
              spacing={0.5}
            >
              {headerActions}

              <IconButton
                type="button"
                onClick={requestClose}
                disabled={saving}
                aria-label="Đóng bảng chi tiết"
                sx={{
                  width: 36,
                  height: 36,
                  color: 'text.secondary',
                  borderRadius: '10px',

                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                  },
                }}
              >
                <X size={20} />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        <Divider />

        {/* ======================================
            BODY CUỘN ĐỘC LẬP
            ====================================== */}

        <Box
          component="section"
          aria-label={`Nội dung ${title}`}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',

            px: {
              xs: 2.5,
              sm: contentPadding,
            },

            py: 3,

            '&::-webkit-scrollbar': {
              width: 7,
            },

            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'action.disabledBackground',
              borderRadius: '10px',
            },
          }}
        >
          {loading ? (
            <AdminDrawerSkeleton />
          ) : (
            <Stack spacing={2.5}>
              {/* THÔNG BÁO LỖI TỪ API */}

              {error && (
                <Alert
                  severity="error"
                  variant="outlined"
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
                    borderRadius: '12px',
                  }}
                >
                  {error}
                </Alert>
              )}

              {/* NỘI DUNG DO TRANG CHA TRUYỀN VÀO */}

              {children}
            </Stack>
          )}
        </Box>

        {/* ======================================
            FOOTER CỐ ĐỊNH
            ====================================== */}

        {hasFooter && (
          <>
            <Divider />

            <Box
              component="footer"
              sx={{
                px: {
                  xs: 2.5,
                  sm: 3,
                },

                py: 2,

                flexShrink: 0,
                bgcolor: 'background.paper',
              }}
            >
              {/* Ưu tiên Footer tùy chỉnh
                  do trang cha cung cấp. */}

              {footer !== undefined ? (
                footer
              ) : (
                <Stack
                  direction={{
                    xs: 'column-reverse',
                    sm: 'row',
                  }}
                  sx={{
                    justifyContent: 'flex-end',
                  }}
                  spacing={1.5}
                >
                  {/* NÚT HỦY */}

                  <Button
                    type="button"
                    variant="outlined"
                    color="inherit"
                    onClick={requestClose}
                    disabled={saving}
                    sx={{
                      minWidth: 100,
                      borderColor: 'divider',
                    }}
                  >
                    Hủy
                  </Button>

                  {/* NÚT LƯU */}

                  <Button
                    type="button"
                    variant="contained"
                    onClick={onSubmit}
                    loading={saving}
                    disabled={loading || submitDisabled || saving}
                    startIcon={!saving ? <FloppyDisk size={18} /> : undefined}
                    sx={{
                      minWidth: 150,
                    }}
                  >
                    {submitLabel}
                  </Button>
                </Stack>
              )}
            </Box>
          </>
        )}
      </Drawer>

      {/* ==========================================
          XÁC NHẬN ĐÓNG KHI CHƯA LƯU
          ========================================== */}

      <Dialog
        open={confirmCloseOpen}
        onClose={cancelDiscard}
        aria-labelledby={confirmTitleId}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '18px',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle
          id={confirmTitleId}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          <Warning size={26} color="#F79009" weight="duotone" />
          Bỏ thay đổi chưa lưu?
        </DialogTitle>

        <DialogContent>
          <DialogContentText
            sx={{
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {discardMessage}
          </DialogContentText>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            gap: 1,
          }}
        >
          <Button type="button" color="inherit" variant="outlined" onClick={cancelDiscard}>
            Tiếp tục chỉnh sửa
          </Button>

          <Button type="button" color="error" variant="contained" onClick={confirmDiscard}>
            Bỏ thay đổi
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AdminDrawer;
