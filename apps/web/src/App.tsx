import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/Login';
import { TodayPage } from './pages/Today';
import { ItemsPage } from './pages/Items';
import { OffersPage } from './pages/Offers';
import { OrdersPage } from './pages/Orders';
import { PickupVerifyPage } from './pages/PickupVerify';
import { ComingSoonPage } from './pages/ComingSoon';
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
            <Route path="/reports" element={<ComingSoonPage title="Báo cáo & tác động" />} />
            <Route path="/forecast" element={<ComingSoonPage title="Dự báo & giá Pro" />} />
            <Route path="/marketing" element={<ComingSoonPage title="Ưu đãi & chiến dịch" />} />
            <Route path="/customers" element={<ComingSoonPage title="Khách hàng" />} />
            <Route path="/staff" element={<ComingSoonPage title="Nhân viên" />} />
            <Route path="/ai" element={<ComingSoonPage title="Trợ lý AI" />} />
            <Route path="/settings" element={<ComingSoonPage title="Cài đặt cửa hàng" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
