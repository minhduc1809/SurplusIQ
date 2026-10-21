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
const MerchantV2App = lazy(() => import('./modules/merchant-v2/MerchantV2App'));

const isAdminPath = () =>
  window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

const isMerchantV2Path = () =>
  window.location.pathname === '/merchant-v2' ||
  window.location.pathname.startsWith('/merchant-v2/');

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

// Ba cổng độc lập trên cùng một origin:
//   /admin/*       → Super Admin
//   /merchant-v2/* → Merchant Dashboard V2 (MUI, dark mode)
//   /             → Merchant Dashboard V1 (Vanilla CSS)
function RootApplication() {
  const admin = isAdminPath();
  const v2 = isMerchantV2Path();
  const label = admin
    ? 'Đang tải SurplusIQ Admin…'
    : v2
      ? 'Đang tải Merchant Dashboard V2…'
      : 'Đang tải SurplusIQ…';
  return (
    <Suspense fallback={<AppLoadingScreen label={label} />}>
      {admin ? <AdminApp /> : v2 ? <MerchantV2App /> : <MerchantApp />}
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
