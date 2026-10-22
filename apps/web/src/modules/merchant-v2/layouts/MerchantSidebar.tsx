import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Collapse,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  ClipboardList,
  QrCode,
  Clock,
  Users,
  GitBranch,
  FlaskConical,
  BarChart2,
  Sparkles,
  Tag,
  UserCircle,
  UserCog,
  Bot,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  MERCHANT_V2_NAVIGATION,
  getActiveV2Group,
  getActiveV2Item,
} from '../config/merchant-navigation';
import type { MerchantNavIcon, MerchantNavGroup } from '../config/merchant-navigation';
import { MERCHANT_LAYOUT } from '../theme/create-merchant-theme';

// ── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<MerchantNavIcon, ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  ShoppingBag: <ShoppingBag size={18} />,
  Package: <Package size={18} />,
  ClipboardList: <ClipboardList size={18} />,
  QrCode: <QrCode size={18} />,
  Clock: <Clock size={18} />,
  Users: <Users size={18} />,
  GitBranch: <GitBranch size={18} />,
  FlaskConical: <FlaskConical size={18} />,
  BarChart2: <BarChart2 size={18} />,
  Sparkles: <Sparkles size={18} />,
  Tag: <Tag size={18} />,
  UserCircle: <UserCircle size={18} />,
  UserCog: <UserCog size={18} />,
  Bot: <Bot size={18} />,
  Settings: <Settings size={18} />,
};

// ── Props ─────────────────────────────────────────────────────────────────────
export interface MerchantSidebarProps {
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (href: string) => void;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────
export function MerchantSidebar(props: MerchantSidebarProps) {
  const { pathname, collapsed, mobileOpen, onNavigate, onCloseMobile } = props;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const activeGroup = getActiveV2Group(pathname);
  const activeItem = getActiveV2Item(pathname);

  // Keep expanded groups in state — default open the active one
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (activeGroup) s.add(activeGroup);
    return s;
  });

  // Sync when navigation changes (e.g. back/forward)
  useEffect(() => {
    if (activeGroup) setOpenGroups((prev) => new Set([...prev, activeGroup]));
  }, [activeGroup]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleNav = (href: string) => {
    onNavigate(href);
    if (isMobile) onCloseMobile();
  };

  const sidebarContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* ── Logo ───────────────────────────────────────────────── */}
      <Box
        sx={{
          height: MERCHANT_LAYOUT.headerHeight,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #1F3BB3 0%, #3B5BDB 100%)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          C
        </Box>
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
              Cứu Món
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              Cửa hàng
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1.5 }}>
        <List dense disablePadding sx={{ px: 1.5 }}>
          {MERCHANT_V2_NAVIGATION.map((group) => (
            <NavGroup
              key={group.key}
              group={group}
              collapsed={collapsed}
              isGroupActive={activeGroup === group.key}
              activeItemKey={activeItem}
              isOpen={openGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              onNavigate={handleNav}
            />
          ))}
        </List>
      </Box>

      {/* ── Bottom: store status ─────────────────────────────────── */}
      {!collapsed && (
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(16,185,129,0.2)',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            Cửa hàng đang hoạt động
          </Typography>
        </Box>
      )}
    </Box>
  );

  // Mobile — Drawer overlay
  if (isMobile) {
    return (
      <Drawer
        open={mobileOpen}
        onClose={onCloseMobile}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: MERCHANT_LAYOUT.mobileSidebarWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  // Desktop — permanent
  return (
    <Box
      component="aside"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: collapsed ? MERCHANT_LAYOUT.collapsedSidebarWidth : MERCHANT_LAYOUT.sidebarWidth,
        transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
        zIndex: (t) => t.zIndex.drawer,
      }}
    >
      {sidebarContent}
    </Box>
  );
}

// ── NavGroup ──────────────────────────────────────────────────────────────────
interface NavGroupProps {
  group: MerchantNavGroup;
  collapsed: boolean;
  isGroupActive: boolean;
  activeItemKey: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
}

function NavGroup({
  group,
  collapsed,
  isGroupActive,
  activeItemKey,
  isOpen,
  onToggle,
  onNavigate,
}: NavGroupProps) {
  const hasSubmenu = group.items.length > 0;
  const hasDirectRoute = !!group.href;

  const handleClick = () => {
    if (hasDirectRoute && !hasSubmenu) {
      if (!group.comingSoon) onNavigate(group.href!);
    } else {
      onToggle();
      if (hasDirectRoute && !isOpen) onNavigate(group.href!);
    }
  };

  const btn = (
    <ListItemButton
      onClick={handleClick}
      selected={isGroupActive && !hasSubmenu}
      sx={{
        borderRadius: '8px',
        mb: 0.25,
        minHeight: 40,
        px: collapsed ? 1.5 : 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
        '&.Mui-selected': {
          bgcolor: 'primary.main',
          color: '#fff',
          '&:hover': { bgcolor: 'primary.dark' },
          '& .MuiListItemIcon-root': { color: '#fff' },
        },
        '&:hover': { bgcolor: 'action.hover' },
        transition: 'background 150ms ease',
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: 0,
          mr: collapsed ? 0 : 1.5,
          color: isGroupActive && !hasSubmenu ? '#fff' : 'text.secondary',
          justifyContent: 'center',
        }}
      >
        {ICON_MAP[group.icon]}
      </ListItemIcon>

      {!collapsed && (
        <>
          <ListItemText
            primary={group.title}
            slotProps={{
              primary: {
                noWrap: true,
                sx: { fontSize: '0.875rem', fontWeight: isGroupActive ? 600 : 500 },
              },
            }}
          />
          {group.comingSoon && (
            <Chip
              label="Soon"
              size="small"
              sx={{ height: 18, fontSize: '0.65rem', mr: 0.5, bgcolor: 'action.selected' }}
            />
          )}
          {hasSubmenu && (
            <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center', ml: 0.5 }}>
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </Box>
          )}
        </>
      )}
    </ListItemButton>
  );

  return (
    <>
      {collapsed ? (
        <Tooltip title={group.title} placement="right" arrow>
          {btn}
        </Tooltip>
      ) : (
        btn
      )}

      {/* Submenu */}
      {hasSubmenu && !collapsed && (
        <Collapse in={isOpen} timeout={180} unmountOnExit>
          <List dense disablePadding sx={{ pl: 1 }}>
            {group.items.map((item) => {
              const isActive = activeItemKey === item.key;
              return (
                <ListItemButton
                  key={item.key}
                  onClick={() => {
                    if (!item.comingSoon) onNavigate(item.href);
                  }}
                  selected={isActive}
                  sx={{
                    borderRadius: '8px',
                    mb: 0.25,
                    minHeight: 36,
                    pl: 2,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(31,59,179,0.1)',
                      color: 'primary.main',
                      '& .MuiListItemIcon-root': { color: 'primary.main' },
                    },
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 1.5,
                      color: isActive ? 'primary.main' : 'text.disabled',
                      justifyContent: 'center',
                    }}
                  >
                    {ICON_MAP[item.icon]}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    slotProps={{
                      primary: {
                        noWrap: true,
                        sx: {
                          fontSize: '0.8125rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'primary.main' : 'text.secondary',
                        },
                      },
                    }}
                  />
                  {item.comingSoon && (
                    <Chip
                      label="Soon"
                      size="small"
                      sx={{ height: 16, fontSize: '0.6rem', bgcolor: 'action.selected' }}
                    />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>
      )}
    </>
  );
}
