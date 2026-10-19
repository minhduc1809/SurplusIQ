/**
 * SurplusIQ Super Admin Navigation
 *
 * Nguồn duy nhất của sự thật cho:
 * - Đường dẫn Admin
 * - Điều hướng Sidebar
 * - Nhãn Breadcrumb
 * - Icon điều hướng
 * - Chỉ số khả năng Backend
 *
 * Stack: React + TypeScript + Vite
 *
 * LƯU Ý QUAN TRỌNG:
 * Tình trạng khả dụng điều hướng mô tả mức độ sẵn sàng
 * của giao diện / backend hiện tại, KHÔNG phải quyền người dùng.
 *
 * Phân quyền phía Server phải luôn được kiểm tra
 * độc lập bởi Backend NestJS.
 */

// =====================================================
// 1. HẰNG SỐ ĐƯỜNG DẪN
// =====================================================

export const ADMIN_BASE_PATH = '/admin';

export const ADMIN_ROUTES = {
  base: ADMIN_BASE_PATH,

  login: '/admin/login',

  overview: '/admin/overview',

  merchants: '/admin/merchants',

  users: '/admin/users',

  orders: '/admin/orders',

  disputes: '/admin/disputes',

  settlement: '/admin/settlement',

  subscriptions: '/admin/subscriptions',

  settings: '/admin/settings',

  notFound: '/admin/404',
} as const;

// =====================================================
// 2. KIỂU DỮ LIỆU ĐIỀU HƯỚNG
// =====================================================

/**
 * Định danh cho tám phân hệ Super Admin.
 */

export type AdminNavKey =
  | 'overview'
  | 'merchants'
  | 'users'
  | 'orders'
  | 'disputes'
  | 'settlement'
  | 'subscriptions'
  | 'settings';

/**
 * Icon được AdminSidebar ánh xạ tại runtime.
 *
 * Sử dụng định danh chuỗi thay vì import trực tiếp
 * các component React vào file cấu hình này.
 */

export type AdminNavIcon =
  | 'SquaresFour'
  | 'Storefront'
  | 'UsersThree'
  | 'ShoppingCart'
  | 'Gavel'
  | 'ArrowsClockwise'
  | 'CrownSimple'
  | 'GearSix';

/**
 * TÌNH TRẠNG BACKEND HIỆN TẠI
 *
 * partial:
 *   Tồn tại ít nhất một API liên quan, nhưng chưa
 *   đáp ứng đầy đủ yêu cầu của Super Admin.
 *
 * unavailable:
 *   Các API Admin toàn cục cần thiết chưa được
 *   xác nhận trên nhánh main của GitHub.
 *
 * ready:
 *   Dành riêng cho phân hệ đã được xác minh đầy đủ.
 */

export type AdminBackendAvailability = 'ready' | 'partial' | 'unavailable';

export interface AdminNavItem {
  key: AdminNavKey;

  title: string;

  description: string;

  href: string;

  icon: AdminNavIcon;

  backendAvailability: AdminBackendAvailability;

  /**
   * Dùng cho Command Palette / Tìm kiếm nhanh trong tương lai.
   */
  keywords?: string[];
}

export interface AdminNavSection {
  key: string;

  title: string;

  items: AdminNavItem[];
}

// =====================================================
// 3. CẤU HÌNH ĐIỀU HƯỚNG
// =====================================================

export const ADMIN_NAVIGATION: AdminNavSection[] = [
  {
    key: 'general',

    title: 'TỔNG QUAN',

    items: [
      {
        key: 'overview',

        title: 'Dashboard Overview',

        description: 'Thống kê toàn sàn, chỉ số vận hành và ESG Impact',

        href: ADMIN_ROUTES.overview,

        icon: 'SquaresFour',

        backendAvailability: 'ready',

        keywords: ['dashboard', 'overview', 'esg', 'impact', 'thống kê', 'tổng quan'],
      },
    ],
  },

  {
    key: 'operations',

    title: 'QUẢN LÝ VẬN HÀNH',

    items: [
      {
        key: 'merchants',

        title: 'Cửa hàng & KYC',

        description: 'Quản lý đối tác, hồ sơ và xác minh cửa hàng',

        href: ADMIN_ROUTES.merchants,

        icon: 'Storefront',

        backendAvailability: 'ready',

        keywords: ['merchant', 'store', 'kyc', 'shop', 'cửa hàng', 'đối tác'],
      },

      {
        key: 'users',

        title: 'Người dùng & Bảo mật',

        description: 'Quản lý tài khoản, phiên đăng nhập và an ninh',

        href: ADMIN_ROUTES.users,

        icon: 'UsersThree',

        backendAvailability: 'ready',

        keywords: ['user', 'customer', 'security', 'account', 'người dùng', 'bảo mật'],
      },

      {
        key: 'orders',

        title: 'Đơn hàng & Thanh toán',

        description: 'Theo dõi đơn hàng, giao dịch và hoàn tiền',

        href: ADMIN_ROUTES.orders,

        icon: 'ShoppingCart',

        backendAvailability: 'ready',

        keywords: ['order', 'payment', 'refund', 'kill switch', 'đơn hàng', 'thanh toán'],
      },
    ],
  },

  {
    key: 'governance',

    title: 'KIỂM SOÁT & TÀI CHÍNH',

    items: [
      {
        key: 'disputes',

        title: 'Khiếu nại & Vi phạm',

        description: 'Trọng tài khiếu nại và giám sát vi phạm',

        href: ADMIN_ROUTES.disputes,

        icon: 'Gavel',

        backendAvailability: 'ready',

        keywords: ['dispute', 'complaint', 'violation', 'khiếu nại', 'vi phạm'],
      },

      {
        key: 'settlement',

        title: 'Đối soát & Thanh toán',

        description: 'Đối soát tuần, sao kê và thanh toán đối tác',

        href: ADMIN_ROUTES.settlement,

        icon: 'ArrowsClockwise',

        backendAvailability: 'ready',

        keywords: ['settlement', 'reconciliation', 'payout', 'checksum', 'đối soát', 'sao kê'],
      },
    ],
  },

  {
    key: 'platform',

    title: 'QUẢN TRỊ NỀN TẢNG',

    items: [
      {
        key: 'subscriptions',

        title: 'Gói SaaS & Quota',

        description: 'Quản lý gói dịch vụ và hạn mức cửa hàng',

        href: ADMIN_ROUTES.subscriptions,

        icon: 'CrownSimple',

        backendAvailability: 'ready',

        keywords: ['saas', 'subscription', 'quota', 'billing', 'gói dịch vụ', 'hạn mức'],
      },

      {
        key: 'settings',

        title: 'Cấu hình & Audit Logs',

        description: 'Tham số nền tảng, cronjobs và nhật ký bảo mật',

        href: ADMIN_ROUTES.settings,

        icon: 'GearSix',

        backendAvailability: 'ready',

        keywords: ['settings', 'configuration', 'audit', 'cronjob', 'cấu hình', 'nhật ký'],
      },
    ],
  },
];

// =====================================================
// 4. DANH SÁCH PHẲNG CÁC MỤC ĐIỀU HƯỚNG
// =====================================================

/**
 * Được sử dụng bởi:
 * - Breadcrumb
 * - Command Palette
 * - Tìm kiếm điều hướng
 * - Phát hiện route đang hoạt động
 */

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAVIGATION.flatMap((section) => section.items);

// =====================================================
// 5. HÀM TIỆN ÍCH ĐƯỜNG DẪN
// =====================================================

/**
 * Chuẩn hóa đường dẫn mà không thay đổi nghĩa.
 *
 * Ví dụ:
 *
 * /admin/orders/   -> /admin/orders
 * /admin/orders/12 -> /admin/orders/12
 */

export function normalizeAdminPath(pathname: string): string {
  const cleanPath = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');

  return cleanPath || '/';
}

/**
 * Tìm mục điều hướng tương ứng với một đường dẫn.
 *
 * Hỗ trợ các route lồng nhau như:
 *
 * /admin/merchants/123
 * /admin/orders/456
 * /admin/users/789
 *
 * Tránh khớp sai prefix, chẳng hạn:
 *
 * /admin/users-extra
 */

export function getActiveAdminNavItem(pathname: string): AdminNavItem | undefined {
  const currentPath = normalizeAdminPath(pathname);

  return ADMIN_NAV_ITEMS.find((item) => {
    const itemPath = normalizeAdminPath(item.href);

    return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
  });
}

/**
 * Trả về khóa điều hướng đang hoạt động.
 */

export function getActiveAdminNavKey(pathname: string): AdminNavKey | null {
  return getActiveAdminNavItem(pathname)?.key ?? null;
}

/**
 * Tìm mục điều hướng theo khóa.
 */

export function getAdminNavItem(key: AdminNavKey): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.key === key);
}

/**
 * Lấy tiêu đề trang dạng dễ đọc.
 */

export function getAdminPageTitle(pathname: string): string {
  if (normalizeAdminPath(pathname) === ADMIN_ROUTES.login) {
    return 'Đăng nhập';
  }

  return getActiveAdminNavItem(pathname)?.title ?? 'Super Admin';
}

// =====================================================
// 6. NHÃN TÌNH TRẠNG BACKEND
// =====================================================

export const ADMIN_AVAILABILITY_LABELS: Record<AdminBackendAvailability, string> = {
  ready: 'Đã hỗ trợ',

  partial: 'Hỗ trợ một phần',

  unavailable: 'Chưa có API Admin',
};

/**
 * Lưu ý quan trọng:
 *
 * Không được bật các thao tác ghi có quyền cao
 * chỉ dựa vào các nhãn frontend này.
 *
 * Mọi thao tác vẫn phải được kiểm tra theo
 * endpoint thực tế của Backend và phân quyền.
 */
