import React, { Suspense, lazy } from 'react';

import ReactDOM from 'react-dom/client';

import './index.css';

// Chuyển mọi URL ngoài /admin tới route Admin hợp lệ.
if (
  window.location.pathname === '/' ||
  (window.location.pathname !== '/admin' && !window.location.pathname.startsWith('/admin/'))
) {
  window.history.replaceState(null, '', '/admin/login');
}

const AdminApp = lazy(() => import('./modules/platform-admin/AdminApp'));

function AppLoadingScreen() {
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

      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Đang tải SurplusIQ Admin...
      </p>
    </div>
  );
}

function RootApplication() {
  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <AdminApp />
    </Suspense>
  );
}

// =====================================================
// 5. KHỞI TẠO REACT
// =====================================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Không tìm thấy phần tử #root để khởi tạo ứng dụng.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootApplication />
  </React.StrictMode>,
);
