/**
 * SurplusIQ Merchant V2 — Navigation Config
 *
 * Menu được gom thành 4 nhóm lớn:
 *   1. Tổng quan (Today dashboard)
 *   2. Bán hàng (Offers, Items, Orders, PickupVerify)
 *   3. Rescue (Timeline, Pool, Bridge, Lab)
 *   4. Phát triển (Reports, Forecast, Marketing, Customers, Staff, AI, Settings)
 *
 * Mỗi nhóm có thể có submenu.
 */

export const MERCHANT_V2_BASE_PATH = '/merchant-v2';

export const MERCHANT_V2_ROUTES = {
  login: '/merchant-v2/login',
  today: '/merchant-v2/today',
  offers: '/merchant-v2/sales/offers',
  items: '/merchant-v2/sales/items',
  orders: '/merchant-v2/sales/orders',
  pickupVerify: '/merchant-v2/sales/pickup-verify',
  rescueTimeline: '/merchant-v2/rescue/timeline',
  rescuePool: '/merchant-v2/rescue/pool',
  rescueBridge: '/merchant-v2/rescue/bridge',
  rescueLab: '/merchant-v2/rescue/lab',
  reports: '/merchant-v2/growth/reports',
  finance: '/merchant-v2/growth/finance',
  forecast: '/merchant-v2/growth/forecast',
  marketing: '/merchant-v2/growth/marketing',
  customers: '/merchant-v2/growth/customers',
  ai: '/merchant-v2/growth/ai',
  settings: '/merchant-v2/settings',
} as const;

export type MerchantNavIcon =
  | 'LayoutDashboard'
  | 'ShoppingBag'
  | 'Package'
  | 'ClipboardList'
  | 'QrCode'
  | 'Clock'
  | 'Users'
  | 'GitBranch'
  | 'FlaskConical'
  | 'BarChart2'
  | 'Sparkles'
  | 'Tag'
  | 'UserCircle'
  | 'UserCog'
  | 'Bot'
  | 'Settings';

export interface MerchantNavSubItem {
  key: string;
  title: string;
  href: string;
  icon: MerchantNavIcon;
  comingSoon?: boolean;
}

export interface MerchantNavGroup {
  key: string;
  title: string;
  icon: MerchantNavIcon;
  /** href khi nhấn chính vào group (optional - nếu không có thì chỉ toggle submenu) */
  href?: string;
  items: MerchantNavSubItem[];
  comingSoon?: boolean;
}

export const MERCHANT_V2_NAVIGATION: MerchantNavGroup[] = [
  {
    key: 'today',
    title: 'Hôm nay',
    icon: 'LayoutDashboard',
    href: MERCHANT_V2_ROUTES.today,
    items: [],
  },
  {
    key: 'sales',
    title: 'Bán hàng',
    icon: 'ShoppingBag',
    items: [
      { key: 'offers', title: 'Suất & tồn kho', href: MERCHANT_V2_ROUTES.offers, icon: 'Package' },
      { key: 'items', title: 'Quản lý món', href: MERCHANT_V2_ROUTES.items, icon: 'ClipboardList' },
      { key: 'orders', title: 'Đơn hàng', href: MERCHANT_V2_ROUTES.orders, icon: 'ClipboardList' },
      {
        key: 'pickup',
        title: 'Xác nhận pickup',
        href: MERCHANT_V2_ROUTES.pickupVerify,
        icon: 'QrCode',
      },
    ],
  },
  {
    key: 'rescue',
    title: 'Rescue Hub',
    icon: 'GitBranch',
    items: [
      {
        key: 'timeline',
        title: 'Timeline',
        href: MERCHANT_V2_ROUTES.rescueTimeline,
        icon: 'Clock',
      },
      { key: 'pool', title: 'Pool', href: MERCHANT_V2_ROUTES.rescuePool, icon: 'Users' },
      { key: 'bridge', title: 'Bridge', href: MERCHANT_V2_ROUTES.rescueBridge, icon: 'GitBranch' },
      { key: 'lab', title: 'Lab (AI)', href: MERCHANT_V2_ROUTES.rescueLab, icon: 'FlaskConical' },
    ],
  },
  {
    key: 'growth',
    title: 'Phát triển',
    icon: 'BarChart2',
    items: [
      {
        key: 'reports',
        title: 'Báo cáo & tác động',
        href: MERCHANT_V2_ROUTES.reports,
        icon: 'BarChart2',
      },
      {
        key: 'finance',
        title: 'Tài chính',
        href: MERCHANT_V2_ROUTES.finance,
        icon: 'BarChart2',
      },
      {
        key: 'forecast',
        title: 'Dự báo & giá Pro',
        href: MERCHANT_V2_ROUTES.forecast,
        icon: 'Sparkles',
      },
      {
        key: 'marketing',
        title: 'Ưu đãi & chiến dịch',
        href: MERCHANT_V2_ROUTES.marketing,
        icon: 'Tag',
      },
      {
        key: 'customers',
        title: 'Khách hàng',
        href: MERCHANT_V2_ROUTES.customers,
        icon: 'UserCircle',
      },
      { key: 'ai', title: 'Trợ lý AI', href: MERCHANT_V2_ROUTES.ai, icon: 'Bot' },
    ],
  },
  {
    key: 'settings',
    title: 'Cài đặt',
    icon: 'Settings',
    href: MERCHANT_V2_ROUTES.settings,
    items: [],
  },
];

export function normalizeV2Path(pathname: string): string {
  return pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
}

export function getActiveV2Group(pathname: string): string | null {
  const p = normalizeV2Path(pathname);
  for (const group of MERCHANT_V2_NAVIGATION) {
    if (group.href && normalizeV2Path(group.href) === p) return group.key;
    if (
      group.items.some(
        (item) =>
          normalizeV2Path(item.href) === p || p.startsWith(normalizeV2Path(item.href) + '/'),
      )
    ) {
      return group.key;
    }
  }
  return null;
}

export function getActiveV2Item(pathname: string): string | null {
  const p = normalizeV2Path(pathname);
  for (const group of MERCHANT_V2_NAVIGATION) {
    for (const item of group.items) {
      if (normalizeV2Path(item.href) === p || p.startsWith(normalizeV2Path(item.href) + '/')) {
        return item.key;
      }
    }
  }
  return null;
}
