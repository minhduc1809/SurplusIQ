import { AdminSnapshotProvider } from './snapshot/AdminSnapshotProvider';
import { SnapshotPage } from './snapshot/SnapshotPage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { OverviewPage } from './pages/overview/OverviewPage';

import { UsersPage } from './pages/users/UsersPage';

import type { ReactNode } from 'react';

import './styles/admin-global.css';
import { MerchantsPage } from './pages/merchants/MerchantsPage';
import { SettlementPage } from './pages/settlement/SettlementPage';
import { SubscriptionsPage } from './pages/subscriptions/SubscriptionsPage';

import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

import { ArrowLeft, ArrowRight, WarningCircle } from '@phosphor-icons/react';

import { AdminAuthProvider, useAdminAuth } from './auth/AdminAuthProvider';

import { AdminProtectedRoute } from './pages/auth/AdminProtectedRoute';

import { AdminLoginPage } from './pages/auth/AdminLoginPage';

import { OrdersPage } from './pages/orders/OrdersPage';
import { ContractReviewPanel } from './pages/merchants/ContractReviewPanel';
import { PaymentOpsPanel } from './pages/payments/PaymentOpsPanel';

import { DisputesPage } from './pages/disputes/DisputesPage';

import { SettingsPage } from './pages/settings/SettingsPage';

import { AdminLayout } from './layouts/AdminLayout';

import { AdminThemeProvider } from './theme/AdminThemeProvider';

import { adminAuthApi } from './api/admin-auth.api';

import {
  ADMIN_BASE_PATH,
  ADMIN_NAV_ITEMS,
  ADMIN_ROUTES,
  normalizeAdminPath,
} from './config/admin-navigation';

// =====================================================
// 1. XỬ LÝ ĐƯỜNG DẪN SAU ĐĂNG NHẬP
// =====================================================

/**
 * Lấy đường dẫn quay lại sau khi đăng nhập.
 *
 * Chỉ cho phép URL cùng nguồn gốc và thuộc
 * khu vực /admin, ngoại trừ trang đăng nhập.
 *
 * Việc kiểm tra này nhằm tránh Open Redirect:
 * không cho người dùng bị chuyển hướng đến
 * website bên ngoài thông qua tham số redirect.
 */
export function resolveAdminLoginRedirect(search: string): string {
  const fallback = ADMIN_ROUTES.overview;

  if (typeof window === 'undefined') {
    return fallback;
  }

  const params = new URLSearchParams(search);

  const rawRedirect = params.get('redirect')?.trim();

  if (!rawRedirect) {
    return fallback;
  }

  // Chỉ chấp nhận đường dẫn tuyệt đối nội bộ.
  if (
    !rawRedirect.startsWith(`${ADMIN_BASE_PATH}/`) ||
    rawRedirect.startsWith('//') ||
    Array.from(rawRedirect).some(
      (character) =>
        character === '\\' || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  ) {
    return fallback;
  }

  try {
    const target = new URL(rawRedirect, window.location.origin);

    // Chặn mọi URL bên ngoài ứng dụng.
    if (target.origin !== window.location.origin) {
      return fallback;
    }

    const pathname = normalizeAdminPath(target.pathname);

    // Không quay về chính trang đăng nhập.
    if (pathname === ADMIN_ROUTES.login || pathname.startsWith(`${ADMIN_ROUTES.login}/`)) {
      return fallback;
    }

    // Chỉ chấp nhận đường dẫn thuộc Admin.
    if (!pathname.startsWith(`${ADMIN_BASE_PATH}/`)) {
      return fallback;
    }

    // Giữ nguyên query và hash của trang.
    return target.pathname + target.search + target.hash;
  } catch {
    return fallback;
  }
}

// =====================================================
// 2. MÀN HÌNH CHUYỂN TIẾP
// =====================================================

interface AdminTransitionScreenProps {
  title: string;
  description?: string;
}

/**
 * Hiển thị thông báo ngắn khi ứng dụng
 * thực hiện một thao tác điều hướng.
 *
 * Không chứa bất kỳ dữ liệu quản trị nào.
 */
function AdminTransitionScreen({ title, description }: AdminTransitionScreenProps) {
  return (
    <AdminThemeProvider>
      <Box
        component="main"
        sx={{
          minHeight: '100dvh',
          px: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Stack
          spacing={2}

          sx={{
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: 400,
          }}
        >
          <CircularProgress size={34} thickness={4} />

          <Typography
            component="h1"
            variant="h6"
            sx={{
              fontWeight: 700,
            }}
          >
            {title}
          </Typography>

          {description && (
            <Typography
              color="text.secondary"
              sx={{
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              {description}
            </Typography>
          )}
        </Stack>
      </Box>
    </AdminThemeProvider>
  );
}

// =====================================================
// 3. CHUYỂN /admin SANG /admin/overview
// =====================================================

/**
 * Đường dẫn /admin là điểm vào mặc định.
 *
 * Đưa người dùng đến /admin/overview.
 * Protected Route sẽ quyết định có cần
 * đăng nhập trước hay không.
 */
function AdminBaseRedirect() {
  useEffect(() => {
    window.location.replace(ADMIN_ROUTES.overview);
  }, []);

  return (
    <AdminTransitionScreen
      title="Đang mở SurplusIQ Admin"
      description="Đang chuyển đến trang tổng quan."
    />
  );
}

// =====================================================
// 4. TRANG TẠM CHO PHÂN HỆ CHƯA TRIỂN KHAI
// =====================================================

interface AdminNotFoundPageProps {
  pathname: string;
}

/**
 * Trang 404 dành riêng cho Super Admin.
 *
 * Không tự động coi mọi đường dẫn con
 * của một phân hệ là route hợp lệ.
 */
function AdminNotFoundPage({ pathname }: AdminNotFoundPageProps) {
  return (
    <Box
      sx={{
        minHeight: '55vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack
        spacing={2.5}
        sx={{
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 470,
          width: '100%',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '20px',
            bgcolor: 'action.hover',
            color: 'warning.main',
          }}
        >
          <WarningCircle size={36} weight="duotone" />
        </Box>

        <Typography
          component="h1"
          sx={{
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: '-0.05em',
          }}
        >
          404
        </Typography>

        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
          }}
        >
          Không tìm thấy trang
        </Typography>

        <Typography
          color="text.secondary"
          sx={{
            fontSize: 13,
            lineHeight: 1.8,
            overflowWrap: 'anywhere',
          }}
        >
          Đường dẫn {pathname} chưa được khai báo trong ứng dụng Super Admin.
        </Typography>

        <Button
          component="a"
          href={ADMIN_ROUTES.overview}
          variant="contained"
          startIcon={<ArrowLeft size={18} />}
          sx={{
            mt: 1,
          }}
        >
          Trở về Dashboard
        </Button>
      </Stack>
    </Box>
  );
}

// =====================================================
// 6. ĐIỀU HƯỚNG CÁC PHÂN HỆ ADMIN
// =====================================================

/**
 * Đây là bộ định tuyến trang nội bộ tạm thời.
 *
 * AdminLayout truyền pathname hiện tại
 * sau khi người dùng nhấn Sidebar, Topbar
 * hoặc nút Back/Forward của trình duyệt.
 *
 * Chỉ chấp nhận chính xác các đường dẫn
 * có trong ADMIN_NAV_ITEMS.
 *
 * Mỗi phân hệ render trang nghiệp vụ tương ứng.
 */
function renderAdminPage(pathname: string): ReactNode {
  const currentPath = normalizeAdminPath(pathname);

  const activePage = ADMIN_NAV_ITEMS.find((item) => normalizeAdminPath(item.href) === currentPath);

  if (!activePage) {
    return <AdminNotFoundPage pathname={pathname} />;
  }

  // Hiển thị Dashboard Overview thực tế
  // khi người dùng truy cập /admin/overview.
  if (currentPath === ADMIN_ROUTES.overview) {
    return <SnapshotPage key="overview" module="overview" liveContent={<OverviewPage />} />;
  }

  // Hiển thị phân hệ quản lý người dùng.
  if (currentPath === ADMIN_ROUTES.users) {
    return <SnapshotPage key="users" module="users" liveContent={<UsersPage />} />;
  }

  // Hiển thị phân hệ quản lý đơn hàng.
  if (currentPath === ADMIN_ROUTES.orders) {
    return (
      <SnapshotPage
        key="orders"
        module="orders"
        liveContent={
          <>
            <OrdersPage />
            <PaymentOpsPanel section="proofs" />
          </>
        }
      />
    );
  }

  // Hiển thị phân hệ khiếu nại và trọng tài.
  if (currentPath === ADMIN_ROUTES.disputes) {
    return <SnapshotPage key="disputes" module="disputes" liveContent={<DisputesPage />} />;
  }

  // Hiển thị phân hệ cấu hình hệ thống.
  if (currentPath === ADMIN_ROUTES.settings) {
    return <SnapshotPage key="settings" module="settings" liveContent={<SettingsPage />} />;
  }

  if (currentPath === ADMIN_ROUTES.merchants)
    return (
      <SnapshotPage
        key="merchants"
        module="merchants"
        liveContent={
          <>
            <MerchantsPage />
            <ContractReviewPanel />
          </>
        }
      />
    );
  if (currentPath === ADMIN_ROUTES.settlement)
    return (
      <SnapshotPage
        key="settlement"
        module="settlement"
        liveContent={
          <>
            <SettlementPage />
            <PaymentOpsPanel section="payouts" />
          </>
        }
      />
    );
  if (currentPath === ADMIN_ROUTES.subscriptions)
    return (
      <SnapshotPage
        key="subscriptions"
        module="subscriptions"
        liveContent={<SubscriptionsPage />}
      />
    );
  return <AdminNotFoundPage pathname={pathname} />;
}

// =====================================================
// 7. TRANG ĐĂNG NHẬP
// =====================================================

/**
 * Trang Login không sử dụng AdminLayout
 * vì chưa được phép hiển thị Sidebar và
 * nội dung quản trị trước khi xác thực.
 */
function AdminLoginRoute() {
  /**
   * Khi đăng nhập thành công:
   * - Đọc redirect từ query string.
   * - Kiểm tra an toàn đường dẫn.
   * - Chuyển đến trang Admin tương ứng.
   *
   * replace() tránh quay lại trang Login
   * khi người dùng nhấn nút Back.
   */
  const handleAuthenticated = () => {
    const target = resolveAdminLoginRedirect(window.location.search);

    window.location.replace(target);
  };

  return (
    <AdminThemeProvider>
      <AdminLoginPage onAuthenticated={handleAuthenticated} />
    </AdminThemeProvider>
  );
}

// =====================================================
// 8. KHU VỰC ADMIN ĐƯỢC BẢO VỆ
// =====================================================

/**
 * Component này nhận thông tin tài khoản
 * từ Authentication Provider và truyền
 * xuống AdminLayout/Topbar.
 */
function AdminProtectedArea() {
  const { user, logout } = useAdminAuth();

  // ---------------------------------------------------
  // Trạng thái khi người dùng đang đăng xuất
  // ---------------------------------------------------

  const [loggingOut, setLoggingOut] = useState(false);

  const logoutStartedRef = useRef(false);

  // ===================================================
  // 9. XỬ LÝ ĐĂNG XUẤT
  // ===================================================

  /**
   * Lưu ý quan trọng:
   *
   * AdminAuthProvider chuyển trạng thái sang
   * unauthenticated ngay khi bắt đầu logout.
   *
   * Nếu vẫn render ProtectedRoute, component
   * có thể chuyển sang Login trước khi request
   * /auth/logout hoàn tất.
   *
   * Vì thế, trong thời gian đăng xuất chúng ta
   * hiển thị màn hình chuyển tiếp thay vì
   * tiếp tục render ProtectedRoute.
   */
  const handleLogout = useCallback(() => {
    if (logoutStartedRef.current) {
      return;
    }

    logoutStartedRef.current = true;
    setLoggingOut(true);

    void (async () => {
      try {
        const result = await logout();

        // Backend hiện chỉ xác nhận đã xử lý
        // request, chưa bảo đảm thu hồi phiên
        // an toàn ở mức production.
        if (result.warning) {
          console.warn('[SurplusIQ Admin]', result.warning);
        }
      } catch {
        // Ưu tiên xóa phiên phía Frontend
        // nếu quá trình đăng xuất gặp lỗi.
        adminAuthApi.clearSession();
      } finally {
        window.location.replace(ADMIN_ROUTES.login);
      }
    })();
  }, [logout]);

  // ===================================================
  // 10. GIAO DIỆN KHI ĐANG ĐĂNG XUẤT
  // ===================================================

  if (loggingOut) {
    return (
      <AdminTransitionScreen
        title="Đang đăng xuất"
        description="Đang kết thúc phiên quản trị trên thiết bị này."
      />
    );
  }

  // ===================================================
  // 11. BẢO VỆ VÀ HIỂN THỊ ADMIN LAYOUT
  // ===================================================

  return (
    <AdminProtectedRoute>
      <AdminSnapshotProvider>
        <AdminLayout
          currentUser={
            user
              ? {
                  email: user.email ?? undefined,
                  role: user.role,
                }
              : null
          }
          onLogout={handleLogout}
          renderPage={renderAdminPage}
        />
      </AdminSnapshotProvider>
    </AdminProtectedRoute>
  );
}

// =====================================================
// 12. COMPONENT ADMIN APP CHÍNH
// =====================================================

/**
 * Điểm vào của toàn bộ Super Admin.
 *
 * Route:
 *
 * /admin
 *   → /admin/overview
 *
 * /admin/login
 *   → Trang đăng nhập
 *
 * /admin/overview
 * /admin/merchants
 * /admin/users
 * /admin/orders
 * /admin/disputes
 * /admin/settlement
 * /admin/subscriptions
 * /admin/settings
 *   → ProtectedRoute + AdminLayout
 *
 * Các đường dẫn khác trong /admin
 *   → Trang 404 sau khi xác thực.
 */
export function AdminApp() {
  const pathname =
    typeof window !== 'undefined'
      ? normalizeAdminPath(window.location.pathname)
      : ADMIN_ROUTES.overview;

  // ---------------------------------------------------
  // Truy cập trực tiếp /admin
  // ---------------------------------------------------

  if (pathname === ADMIN_BASE_PATH) {
    return <AdminBaseRedirect />;
  }

  // ---------------------------------------------------
  // Chỉ sử dụng AdminApp cho khu vực /admin
  // ---------------------------------------------------

  if (!pathname.startsWith(`${ADMIN_BASE_PATH}/`)) {
    return (
      <AdminThemeProvider>
        <Box
          component="main"
          sx={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            px: 3,
          }}
        >
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
              }}
            >
              Đường dẫn không thuộc Super Admin
            </Typography>

            <Button
              component="a"
              href={ADMIN_ROUTES.overview}
              variant="outlined"
              endIcon={<ArrowRight size={18} />}
            >
              Mở Dashboard Super Admin
            </Button>
          </Stack>
        </Box>
      </AdminThemeProvider>
    );
  }

  // ---------------------------------------------------
  // Toàn bộ khu vực Admin dùng chung Auth Context
  // ---------------------------------------------------

  return (
    <AdminAuthProvider>
      {pathname === ADMIN_ROUTES.login ? <AdminLoginRoute /> : <AdminProtectedArea />}
    </AdminAuthProvider>
  );
}

export default AdminApp;
