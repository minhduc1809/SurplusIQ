/**
 * SurplusIQ Merchant V2 — điểm vào, mount tại /merchant-v2/* bởi main.tsx.
 *
 * Thêm trang mới: khai báo route trong config/merchant-navigation.ts, rồi thêm một dòng vào PAGES bên dưới.
 */
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from '../../lib/auth';
import { MerchantLayout } from './layouts/MerchantLayout';
import { MerchantThemeProvider } from './theme/MerchantThemeProvider';
import { TodayV2Page } from './pages/today/TodayV2Page';
import { OffersV2Page } from './pages/sales/OffersV2Page';
import { OrdersV2Page } from './pages/orders/OrdersV2Page';
import { FinanceV2Page } from './pages/growth/FinanceV2Page';
import { ReportsV2Page } from './pages/growth/ReportsV2Page';
import { MarketingV2Page } from './pages/growth/MarketingV2Page';
import { CustomersV2Page } from './pages/growth/CustomersV2Page';
import { ForecastV2Page } from './pages/growth/ForecastV2Page';
import { AiV2Page } from './pages/growth/AiV2Page';
import { SettingsV2Page } from './pages/settings/SettingsV2Page';
import { LoginV2Page, safeRedirect } from './pages/auth/LoginV2Page';
import { ComingSoonV2Page } from './pages/ComingSoonV2Page';
import { MERCHANT_V2_ROUTES as R, normalizeV2Path } from './config/merchant-navigation';

// Các trang chưa viết lại bằng MUI dùng lại bản V1 (logic nguyên vẹn, giao diện cũ).
import { RescueTimelinePage } from '../../pages/RescueTimeline';
import { RescuePoolPage } from '../../pages/RescuePool';
import { RescueBridgePage } from '../../pages/RescueBridge';
import { RescueLabPage } from '../../pages/RescueLab';
import { ItemsPage } from '../../pages/Items';
import { PickupVerifyPage } from '../../pages/PickupVerify';

type Navigate = (href: string) => void;

const PAGES: Record<string, (nav: Navigate) => ReactNode> = {
  [R.today]: (nav) => <TodayV2Page onNavigate={nav} />,
  [R.offers]: () => <OffersV2Page />,
  [R.items]: () => <ItemsPage />,
  [R.orders]: (nav) => <OrdersV2Page onNavigate={nav} />,
  [R.pickupVerify]: () => <PickupVerifyPage />,
  [R.rescueTimeline]: () => <RescueTimelinePage />,
  [R.rescuePool]: () => <RescuePoolPage />,
  [R.rescueBridge]: () => <RescueBridgePage />,
  [R.rescueLab]: () => <RescueLabPage />,
  [R.reports]: () => <ReportsV2Page />,
  [R.finance]: () => <FinanceV2Page />,
  [R.marketing]: () => <MarketingV2Page />,
  [R.customers]: () => <CustomersV2Page />,
  [R.forecast]: () => <ForecastV2Page />,
  [R.ai]: () => <AiV2Page />,
  [R.settings]: () => <SettingsV2Page />,
};

const COMING_SOON: Record<string, string> = {};

function Loading() {
  return (
    <MerchantThemeProvider>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={32} />
      </Box>
    </MerchantThemeProvider>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return <Loading />;
}

function renderPage(pathname: string, nav: Navigate): ReactNode {
  const p = normalizeV2Path(pathname);
  const page = PAGES[p];
  if (page) return page(nav);
  const back = () => nav(R.today);
  if (COMING_SOON[p]) return <ComingSoonV2Page title={COMING_SOON[p]} onBack={back} />;
  return (
    <ComingSoonV2Page
      title="Không tìm thấy trang"
      description={`Đường dẫn ${p} chưa được khai báo.`}
      onBack={back}
    />
  );
}

function MerchantV2Routes() {
  const { user, logout, isAuthenticated } = useAuth();
  const path = normalizeV2Path(window.location.pathname);

  if (path === '/merchant-v2') return <Redirect to={R.today} />;
  if (path === R.login) return isAuthenticated ? <Redirect to={safeRedirect()} /> : <LoginV2Page />;
  if (!isAuthenticated) {
    return (
      <Redirect
        to={`${R.login}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
      />
    );
  }

  const navigate: Navigate = (href) => {
    window.history.pushState(null, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const doLogout = () => {
    logout();
    window.location.replace(R.login);
  };

  return (
    <MerchantLayout
      currentUser={{ email: user?.email ?? undefined, phone: user?.phone ?? undefined }}
      onLogout={doLogout}
      renderPage={(pathname) => renderPage(pathname, navigate)}
    />
  );
}

export function MerchantV2App() {
  return (
    <AuthProvider>
      <MerchantV2Routes />
    </AuthProvider>
  );
}

export default MerchantV2App;
