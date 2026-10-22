import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/Login';
import { TodayPage } from './pages/Today';
import { ItemsPage } from './pages/Items';
import { OffersPage } from './pages/Offers';
import { OrdersPage } from './pages/Orders';
import { PickupVerifyPage } from './pages/PickupVerify';
import { V2Embed } from './pages/V2Embed';
import { ReportsV2Page } from './modules/merchant-v2/pages/growth/ReportsV2Page';
import { MarketingV2Page } from './modules/merchant-v2/pages/growth/MarketingV2Page';
import { CustomersV2Page } from './modules/merchant-v2/pages/growth/CustomersV2Page';
import { StaffV2Page } from './modules/merchant-v2/pages/growth/StaffV2Page';
import { SettingsV2Page } from './modules/merchant-v2/pages/settings/SettingsV2Page';
import { ForecastV2Page } from './modules/merchant-v2/pages/growth/ForecastV2Page';
import { AiV2Page } from './modules/merchant-v2/pages/growth/AiV2Page';
import { RescueTimelinePage } from './pages/RescueTimeline';
import { RescuePoolPage } from './pages/RescuePool';
import { RescueBridgePage, RescueBridgeRespondPage } from './pages/RescueBridge';
import { RescueLabPage } from './pages/RescueLab';

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Đơn vị tiếp nhận phản hồi qua link riêng, không cần đăng nhập (CM-B03) */}
          <Route path="/bridge/respond/:token" element={<RescueBridgeRespondPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/rescue-timeline" element={<RescueTimelinePage />} />
            <Route path="/rescue-pool" element={<RescuePoolPage />} />
            <Route path="/rescue-bridge" element={<RescueBridgePage />} />
            <Route path="/rescue-lab" element={<RescueLabPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/verify" element={<PickupVerifyPage />} />
            <Route
              path="/reports"
              element={
                <V2Embed>
                  <ReportsV2Page />
                </V2Embed>
              }
            />
            <Route
              path="/forecast"
              element={
                <V2Embed>
                  <ForecastV2Page />
                </V2Embed>
              }
            />
            <Route
              path="/marketing"
              element={
                <V2Embed>
                  <MarketingV2Page />
                </V2Embed>
              }
            />
            <Route
              path="/customers"
              element={
                <V2Embed>
                  <CustomersV2Page />
                </V2Embed>
              }
            />
            <Route
              path="/staff"
              element={
                <V2Embed>
                  <StaffV2Page />
                </V2Embed>
              }
            />
            <Route
              path="/ai"
              element={
                <V2Embed>
                  <AiV2Page />
                </V2Embed>
              }
            />
            <Route
              path="/settings"
              element={
                <V2Embed>
                  <SettingsV2Page />
                </V2Embed>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
