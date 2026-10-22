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
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import '../styles/app-shell.css';

/** Sidebar merchant web theo rule 7.2 - nhóm menu cố định, top bar có trạng thái cửa hàng. */
const NAV_ITEMS = [
  { to: '/today', label: 'Hôm nay', icon: LayoutDashboard },
  { to: '/offers', label: 'Suất & tồn kho', icon: Package },
  { to: '/rescue-timeline', label: 'Rescue Timeline', icon: Timer },
  { to: '/rescue-pool', label: 'Rescue Pool', icon: UsersRound },
  { to: '/rescue-bridge', label: 'Rescue Bridge', icon: HeartHandshake },
  { to: '/rescue-lab', label: 'Rescue Lab', icon: FlaskConical },
  { to: '/orders', label: 'Đơn hàng', icon: ClipboardList },
  { to: '/items', label: 'Món', icon: UtensilsCrossed },
  { to: '/reports', label: 'Báo cáo & tác động', icon: BarChart3 },
  { to: '/finance', label: 'Tài chính', icon: Banknote },
  { to: '/forecast', label: 'Dự báo & giá Pro', icon: Sparkles },
  { to: '/marketing', label: 'Ưu đãi & chiến dịch', icon: Tag },
  { to: '/customers', label: 'Khách hàng', icon: Users },
  { to: '/ai', label: 'Trợ lý AI', icon: Bot },
  { to: '/settings', label: 'Cài đặt cửa hàng', icon: Settings },
];

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
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--sq-radius-md)',
                textDecoration: 'none',
                color: isActive ? 'var(--sq-coral-deep)' : 'var(--sq-ink-soft)',
                background: isActive ? 'var(--sq-coral-wash)' : 'transparent',
                fontWeight: isActive ? 650 : 450,
                fontSize: 14,
                transition: `background var(--sq-duration-standard)`,
              })}
            >
              <Icon size={20} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
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
