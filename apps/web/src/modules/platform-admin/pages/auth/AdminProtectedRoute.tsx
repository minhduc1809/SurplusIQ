import { useEffect, useRef } from 'react';

import type { ReactNode } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';

import { ArrowClockwise, LockKey, ShieldCheck, WifiSlash } from '@phosphor-icons/react';

import { useAdminAuth } from '../../auth/AdminAuthProvider';

import { adminTokenStorage } from '../../api/admin-api.client';

import { AdminThemeProvider } from '../../theme/AdminThemeProvider';

import { ADMIN_BASE_PATH, ADMIN_ROUTES } from '../../config/admin-navigation';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

export interface AdminProtectedRouteProps {
  // Nội dung chỉ được hiển thị sau khi xác thực.
  children: ReactNode;

  // Giao diện tùy chỉnh trong lúc kiểm tra phiên.
  loadingFallback?: ReactNode;
}

/**
 * Các trạng thái giao diện khi chưa thể
 * hiển thị nội dung quản trị.
 */
type GuardScreenType = 'checking' | 'redirecting' | 'error';

interface AdminGuardScreenProps {
  type: GuardScreenType;
  error?: string | null;
  onRetry?: () => void;
}

// =====================================================
// 2. XỬ LÝ ĐƯỜNG DẪN ĐĂNG NHẬP
// =====================================================

/**
 * Lấy đường dẫn người dùng đang muốn truy cập.
 *
 * Chỉ ghi nhận đường dẫn thuộc khu vực /admin.
 * Không ghi nhận /admin/login để tránh vòng lặp
 * chuyển hướng sau khi đăng nhập.
 *
 * Giữ lại query string và hash để người dùng
 * có thể quay về đúng vị trí ban đầu.
 */
function getRequestedAdminPath(): string {
  if (typeof window === 'undefined') {
    return ADMIN_ROUTES.overview;
  }

  const { pathname, search, hash } = window.location;

  const isAdminPath = pathname === ADMIN_BASE_PATH || pathname.startsWith(`${ADMIN_BASE_PATH}/`);

  const isLoginPath =
    pathname === ADMIN_ROUTES.login || pathname.startsWith(`${ADMIN_ROUTES.login}/`);

  if (!isAdminPath || isLoginPath) {
    return ADMIN_ROUTES.overview;
  }

  return `${pathname}${search}${hash}`;
}

/**
 * Tạo URL đăng nhập và lưu đường dẫn
 * cần quay lại trong tham số redirect.
 *
 * Ví dụ:
 * /admin/login?redirect=%2Fadmin%2Forders
 *
 * Giá trị redirect phải được kiểm tra lại
 * ở trang xử lý sau đăng nhập để tránh
 * lỗ hổng Open Redirect.
 */
function getAdminLoginUrl(): string {
  const params = new URLSearchParams({
    redirect: getRequestedAdminPath(),
  });

  return `${ADMIN_ROUTES.login}?` + params.toString();
}

// =====================================================
// 3. GIAO DIỆN TRẠNG THÁI XÁC THỰC
// =====================================================

/**
 * Màn hình dùng chung cho:
 * - Đang kiểm tra phiên.
 * - Đang chuyển đến trang đăng nhập.
 * - Không thể kiểm tra phiên do lỗi kết nối.
 *
 * Sử dụng ThemeProvider riêng vì AdminLayout
 * chưa được render trong các trạng thái này.
 */
function AdminGuardScreen({ type, error, onRetry }: AdminGuardScreenProps) {
  const isChecking = type === 'checking';
  const isRedirecting = type === 'redirecting';
  const isError = type === 'error';

  let title = 'Đang xác minh phiên Admin';

  let description = 'Hệ thống đang kiểm tra phiên đăng nhập với Backend SurplusIQ.';

  if (isRedirecting) {
    title = 'Cần đăng nhập để tiếp tục';

    description = 'Bạn đang được chuyển đến trang đăng nhập Super Admin.';
  }

  if (isError) {
    title = 'Không thể xác minh phiên';

    description = 'Không thể hoàn tất việc kiểm tra phiên với Backend. Bạn có thể thử kết nối lại.';
  }

  return (
    <AdminThemeProvider>
      <Box
        component="main"
        sx={{
          minHeight: '100dvh',
          width: '100%',

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',

          bgcolor: 'background.default',

          px: 2,
          py: 4,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 460,
            borderRadius: '20px',
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 3,
                sm: 4,
              },

              '&:last-child': {
                pb: {
                  xs: 3,
                  sm: 4,
                },
              },
            }}
          >
            <Stack
              spacing={3}
              sx={{
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              {/* BIỂU TƯỢNG TRẠNG THÁI */}

              <Box
                sx={{
                  width: 70,
                  height: 70,
                  borderRadius: '20px',

                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',

                  bgcolor: 'action.hover',
                  color: isError ? 'warning.main' : 'primary.main',
                }}
              >
                {isError ? (
                  <WifiSlash size={34} weight="duotone" />
                ) : isChecking ? (
                  <ShieldCheck size={34} weight="duotone" />
                ) : (
                  <LockKey size={34} weight="duotone" />
                )}
              </Box>

              {/* TIÊU ĐỀ VÀ MÔ TẢ */}

              <Box>
                <Typography
                  component="h1"
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {title}
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    mt: 1.5,
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  {description}
                </Typography>
              </Box>

              {/* HIỂN THỊ LOADING */}

              {!isError && (
                <Stack
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <CircularProgress size={28} thickness={4} />

                  <Typography variant="caption" color="text.secondary">
                    {isChecking ? 'Đang kiểm tra quyền truy cập...' : 'Đang chuyển hướng...'}
                  </Typography>
                </Stack>
              )}

              {/* THÔNG BÁO LỖI */}

              {isError && (
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <Alert
                    severity="warning"
                    variant="outlined"
                    sx={{
                      textAlign: 'left',
                      borderRadius: '12px',

                      '& .MuiAlert-message': {
                        fontSize: 12,
                        lineHeight: 1.7,
                      },
                    }}
                  >
                    {error || 'Không thể kết nối đến Backend SurplusIQ.'}
                  </Alert>

                  {/* Không tự xóa phiên khi lỗi mạng.
                      Người dùng được phép thử lại. */}

                  <Button
                    type="button"
                    fullWidth
                    variant="contained"
                    startIcon={<ArrowClockwise size={18} />}
                    onClick={onRetry}
                    disabled={!onRetry}
                    sx={{
                      minHeight: 44,
                      borderRadius: '12px',
                    }}
                  >
                    Thử kết nối lại
                  </Button>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </AdminThemeProvider>
  );
}

// =====================================================
// 4. COMPONENT PROTECTED ROUTE
// =====================================================

/**
 * Component bảo vệ các trang Super Admin.
 *
 * Quy trình:
 *
 * 1. Chờ AdminAuthProvider kiểm tra phiên.
 * 2. Nếu được xác thực với role ADMIN:
 *    cho phép hiển thị children.
 * 3. Nếu còn phiên nhưng gặp lỗi kết nối:
 *    hiển thị lỗi và cho phép thử lại.
 * 4. Nếu không còn phiên hợp lệ:
 *    chuyển tới /admin/login.
 *
 * Component không tự giải mã hoặc cấp JWT.
 * Toàn bộ Authentication được quản lý bởi
 * AdminAuthProvider và API Client.
 */
export function AdminProtectedRoute({ children, loadingFallback }: AdminProtectedRouteProps) {
  const { status, session, user, isAuthenticated, error, retryRestore } = useAdminAuth();

  // ---------------------------------------------------
  // Tránh gọi chuyển hướng nhiều lần
  // ---------------------------------------------------

  const redirectStartedRef = useRef(false);

  // ---------------------------------------------------
  // Kiểm tra trạng thái xác thực
  // ---------------------------------------------------

  const isChecking = status === 'checking';

  /**
   * Kiểm tra role lần cuối trước khi hiển thị UI.
   *
   * Đây chỉ là lớp kiểm soát trên Frontend.
   * API đặc quyền vẫn phải dùng Role Guards
   * để xác thực quyền trên Backend.
   */
  const isAuthorized = isAuthenticated && session !== null && user?.role === 'ADMIN';

  /**
   * Khi kiểm tra phiên thất bại vì mất mạng,
   * AdminAuthProvider giữ lại token đã lưu.
   *
   * Nếu vẫn còn token và có lỗi, cho phép thử lại
   * thay vì lập tức chuyển về trang đăng nhập.
   */
  const hasStoredTokens = adminTokenStorage.get() !== null;

  const canRetry = !isChecking && !isAuthorized && Boolean(error) && hasStoredTokens;

  /**
   * Chỉ điều hướng khi:
   * - Không còn đang kiểm tra.
   * - Chưa được xác thực.
   * - Không phải lỗi có thể thử lại.
   */
  const shouldRedirect = !isChecking && !isAuthorized && !canRetry;

  // ===================================================
  // 5. ĐIỀU HƯỚNG VỀ TRANG ĐĂNG NHẬP
  // ===================================================

  useEffect(() => {
    if (!shouldRedirect) {
      redirectStartedRef.current = false;
      return;
    }

    if (redirectStartedRef.current) {
      return;
    }

    redirectStartedRef.current = true;

    /**
     * replace() không tạo thêm bản ghi lịch sử.
     *
     * Tránh tình trạng:
     * - Người dùng nhấn Back.
     * - Trở lại trang Admin chưa đăng nhập.
     * - Bị chuyển tới Login lần nữa.
     */
    window.location.replace(getAdminLoginUrl());
  }, [shouldRedirect]);

  // ===================================================
  // 6. GIAO DIỆN ĐANG KIỂM TRA
  // ===================================================

  if (isChecking) {
    if (loadingFallback !== undefined) {
      return <>{loadingFallback}</>;
    }

    return <AdminGuardScreen type="checking" />;
  }

  // ===================================================
  // 7. HIỂN THỊ NỘI DUNG ADMIN HỢP LỆ
  // ===================================================

  if (isAuthorized) {
    return <>{children}</>;
  }

  // ===================================================
  // 8. LỖI KẾT NỐI CÓ THỂ THỬ LẠI
  // ===================================================

  if (canRetry) {
    return (
      <AdminGuardScreen
        type="error"
        error={error}
        onRetry={() => {
          void retryRestore();
        }}
      />
    );
  }

  // ===================================================
  // 9. CHƯA ĐĂNG NHẬP HOẶC PHIÊN HẾT HẠN
  // ===================================================

  /**
   * Chưa hiển thị children trong khi trình duyệt
   * thực hiện chuyển hướng tới trang Login.
   */
  return <AdminGuardScreen type="redirecting" />;
}

export default AdminProtectedRoute;
