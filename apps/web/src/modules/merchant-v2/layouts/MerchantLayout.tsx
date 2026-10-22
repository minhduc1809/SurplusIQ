import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { MerchantThemeProvider } from '../theme/MerchantThemeProvider';
import { MerchantSidebar } from './MerchantSidebar';
import { MerchantTopbar } from './MerchantTopbar';
import type { MerchantAccount } from './MerchantTopbar';
import { MERCHANT_LAYOUT } from '../theme/create-merchant-theme';
import { MERCHANT_V2_BASE_PATH } from '../config/merchant-navigation';
import '../styles/merchant-v2-global.css';

const SIDEBAR_KEY = 'surplusiq-merchant-v2-sidebar-collapsed';
const SIDEBAR_TRANSITION = 'margin-left 220ms cubic-bezier(0.4,0,0.2,1)';

function getSavedCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true';
  } catch {
    return false;
  }
}
function saveCollapsed(v: boolean) {
  try {
    localStorage.setItem(SIDEBAR_KEY, String(v));
  } catch {
    /* localStorage không khả dụng */
  }
}
function getCurrentPath() {
  return typeof window !== 'undefined' ? window.location.pathname : MERCHANT_V2_BASE_PATH;
}
function isV2Path(p: string) {
  return p === MERCHANT_V2_BASE_PATH || p.startsWith(`${MERCHANT_V2_BASE_PATH}/`);
}

export interface MerchantLayoutProps {
  renderPage?: (pathname: string) => ReactNode;
  children?: ReactNode;
  currentUser?: MerchantAccount | null;
  onLogout?: () => void;
  notificationCount?: number;
}

export function MerchantLayout({
  renderPage,
  children,
  currentUser,
  onLogout,
  notificationCount = 0,
}: MerchantLayoutProps) {
  const [pathname, setPathname] = useState(getCurrentPath);
  const [collapsed, setCollapsed] = useState(getSavedCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarW = collapsed ? MERCHANT_LAYOUT.collapsedSidebarWidth : MERCHANT_LAYOUT.sidebarWidth;

  const handleToggle = useCallback(() => {
    setCollapsed((p) => {
      const n = !p;
      saveCollapsed(n);
      return n;
    });
  }, []);

  const handleNavigate = useCallback((href: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || !isV2Path(url.pathname)) return;
    const next = url.pathname + url.search + url.hash;
    const cur = window.location.pathname + window.location.search + window.location.hash;
    if (next !== cur) window.history.pushState(null, '', next);
    setPathname(url.pathname);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPathname(window.location.pathname);
      setMobileOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const pageContent = renderPage ? renderPage(pathname) : children;

  return (
    <MerchantThemeProvider>
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        {/* Skip link */}
        <Box
          component="a"
          href="#merchant-main"
          sx={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 9999,
            px: 2,
            py: 1,
            borderRadius: '8px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            textDecoration: 'none',
            transform: 'translateY(-200%)',
            '&:focus': { transform: 'translateY(0)' },
          }}
        >
          Chuyển đến nội dung chính
        </Box>

        {/* Sidebar */}
        <MerchantSidebar
          pathname={pathname}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onNavigate={handleNavigate}
          onCloseMobile={() => setMobileOpen(false)}
          onToggleCollapse={handleToggle}
        />

        {/* Main area */}
        <Box
          sx={{
            minHeight: '100vh',
            minWidth: 0,
            ml: { xs: 0, lg: `${sidebarW}px` },
            transition: SIDEBAR_TRANSITION,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <MerchantTopbar
            pathname={pathname}
            sidebarWidth={sidebarW}
            onOpenMobile={() => setMobileOpen(true)}
            onNavigate={handleNavigate}
            currentUser={currentUser}
            onLogout={onLogout}
            notificationCount={notificationCount}
          />

          <Box
            component="main"
            id="merchant-main"
            tabIndex={-1}
            sx={{ flex: 1, width: '100%', minWidth: 0, outline: 'none' }}
          >
            <Container
              maxWidth={false}
              sx={{
                maxWidth: MERCHANT_LAYOUT.contentMaxWidth,
                mx: 'auto',
                px: { xs: 2, sm: 3, lg: 4 },
                py: { xs: 3, md: 4 },
              }}
            >
              <Box className="mv2-page-enter">
                {pageContent ?? (
                  <Typography color="text.secondary">Trang chưa được kết nối.</Typography>
                )}
              </Box>
            </Container>
          </Box>

          {/* Footer */}
          <Box
            component="footer"
            sx={{
              px: { xs: 2, sm: 3, lg: 4 },
              py: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                © {new Date().getFullYear()} SurplusIQ
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                Merchant Dashboard v2
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </MerchantThemeProvider>
  );
}

export default MerchantLayout;
