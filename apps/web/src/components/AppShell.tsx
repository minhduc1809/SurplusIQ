import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Timer,
  UsersRound,
  HeartHandshake,
  FlaskConical,
  ClipboardList,
  UtensilsCrossed,
  BarChart3,
  Banknote,
  Sparkles,
  Tag,
  Users,
  Bot,
  Settings,
  Bell,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import '../styles/app-shell.css';

type NavItem = { to: string; label: string; icon: typeof Package };
/** Menu gộp theo nhóm: mục lẻ hiện thẳng, nhóm có tiêu đề bấm để thu gọn / mở rộng. */
const NAV: ({ item: NavItem } | { title: string; icon: typeof Package; items: NavItem[] })[] = [
  { item: { to: '/today', label: 'Hôm nay', icon: LayoutDashboard } },
  {
    title: 'Bán hàng',
    icon: ClipboardList,
    items: [
      { to: '/offers', label: 'Suất bán & tồn kho', icon: Package },
      { to: '/orders', label: 'Đơn hàng', icon: ClipboardList },
      { to: '/items', label: 'Món', icon: UtensilsCrossed },
    ],
  },
  {
    title: 'Cứu món',
    icon: HeartHandshake,
    items: [
      { to: '/rescue-timeline', label: 'Dòng thời gian cứu món', icon: Timer },
      { to: '/rescue-pool', label: 'Mua chung theo đợt', icon: UsersRound },
      { to: '/rescue-bridge', label: 'Cầu nối từ thiện', icon: HeartHandshake },
      { to: '/rescue-lab', label: 'Phòng mô phỏng', icon: FlaskConical },
    ],
  },
  {
    title: 'Phân tích & tăng trưởng',
    icon: BarChart3,
    items: [
      { to: '/reports', label: 'Báo cáo & tác động', icon: BarChart3 },
      { to: '/finance', label: 'Tài chính', icon: Banknote },
      { to: '/forecast', label: 'Dự báo & giá bán', icon: Sparkles },
      { to: '/marketing', label: 'Ưu đãi & chiến dịch', icon: Tag },
      { to: '/customers', label: 'Khách hàng', icon: Users },
    ],
  },
  { item: { to: '/ai', label: 'Trợ lý AI', icon: Bot } },
  { item: { to: '/settings', label: 'Cài đặt cửa hàng', icon: Settings } },
];

const navStyle =
  (child: boolean) =>
  ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: child ? '8px 14px 8px 28px' : '10px 14px',
    minHeight: child ? 38 : 42,
    borderRadius: '0 22px 22px 0',
    marginRight: 8,
    boxShadow: isActive ? 'inset 3.5px 0 0 var(--sq-coral)' : 'none',
    textDecoration: 'none',
    color: isActive ? 'var(--sq-coral)' : '#334155',
    background: isActive ? 'var(--sq-coral-wash)' : 'transparent',
    fontWeight: isActive ? 600 : 500,
    fontSize: 14,
    transition: 'background var(--sq-duration-standard)',
  });

function NavGroup({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: NavItem['icon'];
  items: NavItem[];
}) {
  const { pathname } = useLocation();
  const hasActive = items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'));
  const [open, setOpen] = useState(hasActive);
  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [hasActive]);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '10px 14px',
          minHeight: 42,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          color: hasActive ? 'var(--sq-coral)' : '#334155',
          textAlign: 'left',
        }}
      >
        <Icon size={20} strokeWidth={1.8} />
        <span style={{ flex: 1 }}>{title}</span>
        <ChevronDown
          size={16}
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
        />
      </button>
      {open &&
        items.map(({ to, label, icon: ChildIcon }) => (
          <NavLink key={to} to={to} style={navStyle(true)}>
            <ChildIcon size={17} strokeWidth={1.8} />
            {label}
          </NavLink>
        ))}
    </div>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Ngăn kéo (màn hẹp) tự đóng khi đổi trang hoặc bấm Esc.
  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="sq-shell">
      <div
        className="sq-scrim"
        data-open={menuOpen}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside id="sq-sidebar" className="sq-sidebar" data-open={menuOpen}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 8px',
            marginBottom: 'var(--sq-space-6)',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--sq-radius-sm)',
              background: 'var(--sq-gradient-coral)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <img
              src="/logo-merchant.png"
              alt="Cứu Món"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                // Chưa có file logo-merchant.png trong public/ - ẩn ảnh lỗi, giữ nền gradient placeholder.
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <span className="sq-h3">Cứu Món</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map((n) =>
            'item' in n ? (
              <NavLink key={n.item.to} to={n.item.to} style={navStyle(false)}>
                <n.item.icon size={20} strokeWidth={1.8} />
                {n.item.label}
              </NavLink>
            ) : (
              <NavGroup key={n.title} {...n} />
            ),
          )}
        </nav>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 'var(--sq-radius-md)',
            color: 'var(--sq-ink-soft)',
            background: 'transparent',
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <LogOut size={20} strokeWidth={1.8} />
          Đăng xuất
        </button>
      </aside>

      <div className="sq-content">
        <header className="sq-topbar">
          <button
            type="button"
            className="sq-menu-btn"
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            aria-controls="sq-sidebar"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
          <div className="sq-topbar-spacer" />
          <Bell size={20} color="var(--sq-ink-soft)" strokeWidth={1.8} />
          <div className="sq-user">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--sq-lilac-wash)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: 'var(--sq-coral-deep)',
                fontSize: 13,
              }}
            >
              {(user?.email || user?.phone || '?')[0]?.toUpperCase()}
            </div>
            <span className="sq-body-medium sq-user-email">{user?.email || user?.phone}</span>
          </div>
        </header>

        <main className="sq-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
