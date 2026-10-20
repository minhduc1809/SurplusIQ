import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/tokens.css';
import { shimmerKeyframes } from './components/StateViews';

const styleTag = document.createElement('style');
styleTag.textContent = shimmerKeyframes;
document.head.appendChild(styleTag);

const AdminApp = lazy(() => import('./modules/platform-admin/AdminApp'));
const MerchantApp = lazy(() => import('./App'));

const isAdminPath = () =>
  window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

function AppLoadingScreen({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'Inter, sans-serif',
        backgroundColor: '#F8F9FC',
        color: '#111927',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #8179FF, #635BFF)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 24,
          fontWeight: 800,
          color: '#FFFFFF',
        }}
      >
        S
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{label}</p>
    </div>
  );
}

// Hai cổng độc lập trên cùng một origin: /admin/* là Super Admin, còn lại là cổng cửa hàng.
function RootApplication() {
  const admin = isAdminPath();
  return (
    <Suspense
      fallback={
        <AppLoadingScreen label={admin ? 'Đang tải SurplusIQ Admin…' : 'Đang tải SurplusIQ…'} />
      }
    >
      {admin ? <AdminApp /> : <MerchantApp />}
    </Suspense>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử #root để khởi tạo ứng dụng.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootApplication />
  </React.StrictMode>,
);
