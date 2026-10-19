import { useCallback, useEffect, useState } from 'react';

import type { ReactNode } from 'react';

import { Alert, Box, Container, Typography } from '@mui/material';

import { AdminThemeProvider } from '../theme/AdminThemeProvider';

import { ADMIN_LAYOUT } from '../theme/create-theme';

import { AdminSidebar } from './AdminSideBar';

import { AdminTopbar } from './AdminTopBar';

import type { AdminAccount } from './AdminTopBar';

import { ADMIN_BASE_PATH, getAdminPageTitle } from '../config/admin-navigation';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

export interface AdminLayoutProps {
  // Nội dung trang khi dùng Layout theo dạng children.
  children?: ReactNode;

  // Hàm trả về nội dung dựa trên đường dẫn hiện tại.
  // Đây là cách nên sử dụng khi chưa tích hợp React Router.
  renderPage?: (pathname: string) => ReactNode;

  // Thông tin tài khoản sau khi xác thực thành công.
  currentUser?: AdminAccount | null;

  // Hàm đăng xuất do tầng Authentication cung cấp.
  onLogout?: () => void;
}

// =====================================================
// 2. CẤU HÌNH
// =====================================================

// Khóa lưu trạng thái Sidebar vào trình duyệt.
// Chỉ lưu tùy chọn giao diện, không lưu thông tin nhạy cảm.
const SIDEBAR_STORAGE_KEY = 'surplusiq-admin-sidebar-collapsed';

// Thời gian chuyển đổi kích thước Sidebar.
const SIDEBAR_TRANSITION = 'margin-left 220ms cubic-bezier(0.4, 0, 0.2, 1)';

// =====================================================
// 3. HÀM TIỆN ÍCH
// =====================================================

/**
 * Lấy đường dẫn hiện tại từ trình duyệt.
 *
 * Kiểm tra window để tránh lỗi khi ứng dụng
 * được sử dụng trong môi trường SSR.
 */
function getCurrentPathname(): string {
  if (typeof window === 'undefined') {
    return ADMIN_BASE_PATH;
  }

  return window.location.pathname;
}

/**
 * Đọc trạng thái Sidebar đã lưu.
 *
 * Nếu trình duyệt không cho truy cập localStorage,
 * Sidebar sẽ trở về trạng thái mở rộng mặc định.
 */
function getStoredSidebarState(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Lưu trạng thái Sidebar.
 *
 * Việc lưu thất bại không được làm gián đoạn
 * thao tác của người dùng.
 */
function saveSidebarState(collapsed: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch {
    // Trình duyệt không hỗ trợ lưu trữ:
    // tiếp tục sử dụng trạng thái trong bộ nhớ.
  }
}

/**
 * Kiểm tra đường dẫn có thuộc khu vực Admin hay không.
 *
 * Không cho điều hướng tới địa chỉ bên ngoài
 * thông qua hàm điều hướng nội bộ.
 */
function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_BASE_PATH || pathname.startsWith(`${ADMIN_BASE_PATH}/`);
}

// =====================================================
// 4. COMPONENT ADMIN LAYOUT
// =====================================================

export function AdminLayout({ children, renderPage, currentUser, onLogout }: AdminLayoutProps) {
  // ---------------------------------------------------
  // Trạng thái đường dẫn hiện tại
  // ---------------------------------------------------

  const [pathname, setPathname] = useState(getCurrentPathname);

  // ---------------------------------------------------
  // Trạng thái Sidebar trên desktop
  // ---------------------------------------------------

  const [sidebarCollapsed, setSidebarCollapsed] = useState(getStoredSidebarState);

  // ---------------------------------------------------
  // Trạng thái Drawer trên mobile và tablet
  // ---------------------------------------------------

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ---------------------------------------------------
  // Tính chiều rộng Sidebar
  // ---------------------------------------------------

  const sidebarWidth = sidebarCollapsed
    ? ADMIN_LAYOUT.collapsedSidebarWidth
    : ADMIN_LAYOUT.sidebarWidth;

  // ---------------------------------------------------
  // Thu gọn hoặc mở rộng Sidebar
  // ---------------------------------------------------

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((previous) => {
      const nextValue = !previous;

      saveSidebarState(nextValue);

      return nextValue;
    });
  }, []);

  // ---------------------------------------------------
  // Mở Sidebar trên mobile
  // ---------------------------------------------------

  const handleOpenMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  // ---------------------------------------------------
  // Đóng Sidebar trên mobile
  // ---------------------------------------------------

  const handleCloseMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  // ---------------------------------------------------
  // Điều hướng nội bộ giữa các trang Admin
  // ---------------------------------------------------

  const handleNavigate = useCallback((href: string) => {
    // Kiểm tra môi trường trình duyệt.
    if (typeof window === 'undefined') {
      return;
    }

    // Chuyển đường dẫn thành đối tượng URL
    // để kiểm tra nguồn gốc và phạm vi Admin.
    const targetUrl = new URL(href, window.location.origin);

    // Chỉ cho phép điều hướng cùng nguồn gốc
    // và nằm trong khu vực /admin.
    if (targetUrl.origin !== window.location.origin || !isAdminPath(targetUrl.pathname)) {
      return;
    }

    const nextUrl = targetUrl.pathname + targetUrl.search + targetUrl.hash;

    const currentUrl = window.location.pathname + window.location.search + window.location.hash;

    // Không thêm bản ghi lịch sử trùng lặp.
    if (nextUrl !== currentUrl) {
      window.history.pushState(null, '', nextUrl);
    }

    // Cập nhật nội dung trang đang hiển thị.
    setPathname(targetUrl.pathname);

    // Đóng Drawer sau khi chọn menu.
    setMobileSidebarOpen(false);

    // Đưa người dùng trở lại đầu trang.
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, []);

  // ---------------------------------------------------
  // Đồng bộ khi người dùng nhấn Back / Forward
  // ---------------------------------------------------

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);

      setMobileSidebarOpen(false);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // ---------------------------------------------------
  // Xác định nội dung chính
  // ---------------------------------------------------

  const pageContent = renderPage ? renderPage(pathname) : children;

  // ===================================================
  // 5. GIAO DIỆN
  // ===================================================

  return (
    <AdminThemeProvider>
      <Box
        data-admin-layout
        sx={{
          minHeight: '100vh',
          width: '100%',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        {/* LIÊN KẾT BỎ QUA MENU CHO BÀN PHÍM */}

        <Box
          component="a"
          href="#admin-main-content"
          sx={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: (theme) => theme.zIndex.modal + 1,
            px: 2,
            py: 1,
            borderRadius: '8px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            textDecoration: 'none',
            transform: 'translateY(-160%)',

            '&:focus': {
              transform: 'translateY(0)',
            },
          }}
        >
          Chuyển đến nội dung chính
        </Box>

        {/* ============================================
            SIDEBAR
            ============================================ */}

        <AdminSidebar
          pathname={pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={handleCloseMobileSidebar}
          onNavigate={handleNavigate}
        />

        {/* ============================================
            KHU VỰC BÊN PHẢI SIDEBAR
            ============================================ */}

        <Box
          sx={{
            minHeight: '100vh',
            minWidth: 0,

            // Mobile không sử dụng Sidebar cố định.
            ml: {
              xs: 0,
              lg: `${sidebarWidth}px`,
            },

            transition: SIDEBAR_TRANSITION,

            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* THANH ĐIỀU HƯỚNG PHÍA TRÊN */}

          <AdminTopbar
            pathname={pathname}
            onOpenMobile={handleOpenMobileSidebar}
            onNavigate={handleNavigate}
            currentUser={currentUser}
            onLogout={onLogout}
          />

          {/* ==========================================
              NỘI DUNG CHÍNH CỦA TỪNG PHÂN HỆ
              ========================================== */}

          <Box
            component="main"
            id="admin-main-content"
            tabIndex={-1}
            sx={{
              flex: 1,
              width: '100%',
              minWidth: 0,
              outline: 'none',
            }}
          >
            <Container
              maxWidth={false}
              sx={{
                maxWidth: ADMIN_LAYOUT.contentMaxWidth,

                mx: 'auto',

                px: {
                  xs: 2,
                  sm: 3,
                  lg: 4,
                  xl: 5,
                },

                py: {
                  xs: 3,
                  md: 4,
                  lg: 5,
                },
              }}
            >
              {/* Khi đã có trang con thì hiển thị.
                  Không tự tạo dữ liệu Dashboard giả. */}

              {pageContent ?? (
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 740,
                    mx: 'auto',
                    mt: {
                      xs: 3,
                      md: 7,
                    },
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      mb: 1.5,
                    }}
                  >
                    {getAdminPageTitle(pathname)}
                  </Typography>

                  <Alert
                    severity="info"
                    variant="outlined"
                    sx={{
                      mt: 3,
                      borderRadius: '12px',
                    }}
                  >
                    Giao diện phân hệ này chưa được kết nối với component trang tương ứng. Nội dung
                    sẽ được triển khai ở các file tiếp theo.
                  </Alert>
                </Box>
              )}
            </Container>
          </Box>

          {/* ==========================================
              FOOTER CHUNG
              ========================================== */}

          <Box
            component="footer"
            sx={{
              px: {
                xs: 2,
                sm: 3,
                lg: 4,
              },

              py: 2,

              borderTop: '1px solid',
              borderColor: 'divider',

              bgcolor: 'background.paper',
            }}
          >
            <StackFooter />
          </Box>
        </Box>
      </Box>
    </AdminThemeProvider>
  );
}

// =====================================================
// 6. FOOTER CHUNG
// =====================================================

function StackFooter() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: 12,
        }}
      >
        © {new Date().getFullYear()} SurplusIQ
      </Typography>

      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: 12,
        }}
      >
        Platform Administration
      </Typography>
    </Box>
  );
}

export default AdminLayout;
