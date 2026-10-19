import React, { Suspense, lazy } from 'react';

import ReactDOM from 'react-dom/client';

import './index.css';

// Chuyển URL gốc tới route Admin hợp lệ.
if (window.location.pathname === '/') {
  window.history.replaceState(null, '', '/admin/login');
}

// =====================================================
// 1. TẢI ỨNG DỤNG THEO TỪNG KHU VỰC
// =====================================================

/**
 * Tách ứng dụng hiện tại và Super Admin
 * thành hai phần được tải độc lập.
 *
 * Người dùng truy cập Admin không cần tải
 * toàn bộ mã nguồn giao diện Customer/Store.
 */
const MainApp = lazy(() => import('./App'));

const AdminApp = lazy(() => import('./modules/platform-admin/AdminApp'));

// =====================================================
// 2. XÁC ĐỊNH KHU VỰC ĐIỀU HƯỚNG
// =====================================================

/**
 * Kiểm tra URL hiện tại có thuộc khu vực
 * quản trị nền tảng hay không.
 *
 * Ví dụ hợp lệ:
 * /admin
 * /admin/login
 * /admin/overview
 * /admin/merchants
 *
 * Không coi /administrator là /admin.
 */
function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

// =====================================================
// 3. GIAO DIỆN TRONG LÚC TẢI ỨNG DỤNG
// =====================================================

/**
 * Màn hình tải tối giản.
 *
 * Không hiển thị thông tin quản trị khi
 * ứng dụng chưa được khởi tạo hoàn chỉnh.
 */
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
        Đang tải SurplusIQ...
      </p>
    </div>
  );
}

// =====================================================
// 4. CHỌN ỨNG DỤNG CẦN HIỂN THỊ
// =====================================================

/**
 * Chỉ có một ứng dụng được render tại một
 * thời điểm dựa trên đường dẫn hiện tại.
 */
function RootApplication() {
  const pathname = window.location.pathname;

  const isAdmin = isAdminRoute(pathname);

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      {isAdmin ? (
        <AdminApp />
      ) : (
        <div data-surplusiq-main-root="" style={{ minHeight: '100vh' }}>
          <MainApp />
        </div>
      )}
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
