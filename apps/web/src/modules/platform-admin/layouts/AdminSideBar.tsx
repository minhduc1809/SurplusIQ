import type { MouseEvent } from 'react';

import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  ArrowsClockwise,
  CaretDoubleLeft,
  CaretDoubleRight,
  CrownSimple,
  Gavel,
  GearSix,
  List as HamburgerIcon,
  ShieldCheck,
  ShoppingCart,
  SquaresFour,
  Storefront,
  UsersThree,
  X,
} from '@phosphor-icons/react';

import {
  ADMIN_AVAILABILITY_LABELS,
  ADMIN_NAVIGATION,
  ADMIN_ROUTES,
  getActiveAdminNavKey,
} from '../config/admin-navigation';

import type { AdminNavIcon, AdminNavItem } from '../config/admin-navigation';

import { ADMIN_LAYOUT } from '../theme/create-theme';

export interface AdminSidebarProps {
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onNavigate?: (href: string) => void;
}

interface SidebarContentProps {
  pathname: string;
  collapsed: boolean;
  isMobile?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  onNavigate?: (href: string) => void;
}

const SIDEBAR_BACKGROUND = '#FFFFFF';
const SIDEBAR_TEXT = '#334155';
const SIDEBAR_MUTED = '#64748B';
const SIDEBAR_BORDER = '#E5E7EB';
const ACTIVE_BACKGROUND = '#EEF2FF';
const ACTIVE_TEXT = '#1F3BB3';
const HOVER_BACKGROUND = '#F8FAFC';

const NAV_ICONS = {
  SquaresFour,
  Storefront,
  UsersThree,
  ShoppingCart,
  Gavel,
  ArrowsClockwise,
  CrownSimple,
  GearSix,
} satisfies Record<AdminNavIcon, typeof SquaresFour>;

function SidebarLogo({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={collapsed ? 'center' : 'flex-start'}
      spacing={1.25}
      sx={{
        px: collapsed ? 1 : 2.5,
        minHeight: ADMIN_LAYOUT.headerHeight,
        borderBottom: `1px solid ${SIDEBAR_BORDER}`,
      }}
    >
      {onToggleCollapse && (
        <IconButton
          size="small"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleCollapse();
          }}
          aria-label={collapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
          sx={{
            color: '#475569',
            borderRadius: '8px',
            p: 0.75,
            '&:hover': {
              bgcolor: HOVER_BACKGROUND,
              color: ACTIVE_TEXT,
            },
          }}
        >
          <HamburgerIcon size={20} weight="bold" />
        </IconButton>
      )}

      {!collapsed && (
        <Stack direction="row" alignItems="center" spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 21,
              fontWeight: 800,
              color: '#1E293B',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            Surplus
          </Typography>
          <Typography
            sx={{
              fontSize: 21,
              fontWeight: 800,
              color: ACTIVE_TEXT,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            Admin
          </Typography>
        </Stack>
      )}
    </Stack>
  );
}

function BackendStatus({ item, collapsed }: { item: AdminNavItem; collapsed: boolean }) {
  if (collapsed) {
    return null;
  }

  if (item.key === 'subscriptions') {
    return (
      <Chip
        label="PRO"
        size="small"
        sx={{
          height: 20,
          fontSize: 10,
          fontWeight: 800,
          bgcolor: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A',
          borderRadius: '999px',
          '& .MuiChip-label': { px: 0.9 },
        }}
      />
    );
  }

  if (item.backendAvailability === 'ready') {
    return null;
  }

  const isPartial = item.backendAvailability === 'partial';
  const color = isPartial ? '#F59E0B' : '#94A3B8';

  return (
    <Tooltip title={ADMIN_AVAILABILITY_LABELS[item.backendAvailability]} placement="right" arrow>
      <Box
        component="span"
        aria-label={ADMIN_AVAILABILITY_LABELS[item.backendAvailability]}
        sx={{
          width: 7,
          height: 7,
          minWidth: 7,
          borderRadius: '50%',
          bgcolor: color,
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

interface SidebarNavItemProps {
  item: AdminNavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: (href: string) => void;
  onCloseMobile?: () => void;
}

function SidebarNavItem({
  item,
  active,
  collapsed,
  onNavigate,
  onCloseMobile,
}: SidebarNavItemProps) {
  const Icon = NAV_ICONS[item.icon];

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (onNavigate) {
      event.preventDefault();
      onNavigate(item.href);
    }

    onCloseMobile?.();
  };

  return (
    <Tooltip
      title={collapsed ? item.title : ''}
      placement="right"
      arrow
      disableHoverListener={!collapsed}
    >
      <ListItemButton
        component="a"
        href={item.href}
        onClick={handleClick}
        selected={active}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? item.title : undefined}
        sx={{
          minHeight: 42,
          mb: 0.5,
          px: collapsed ? 1 : 1.75,
          borderRadius: collapsed ? '10px' : '0 22px 22px 0',
          mr: collapsed ? 0 : 1,
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: active ? ACTIVE_TEXT : SIDEBAR_TEXT,
          position: 'relative',
          transition: 'all 0.16s ease',

          '&::before':
            active && !collapsed
              ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: 6,
                  bottom: 6,
                  width: 3.5,
                  borderRadius: '0 4px 4px 0',
                  bgcolor: ACTIVE_TEXT,
                }
              : undefined,

          '&:hover': {
            bgcolor: active ? ACTIVE_BACKGROUND : HOVER_BACKGROUND,
            color: active ? ACTIVE_TEXT : '#0F172A',
          },

          '&.Mui-selected': {
            bgcolor: ACTIVE_BACKGROUND,
            color: ACTIVE_TEXT,

            '&:hover': {
              bgcolor: '#E0E7FF',
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 34,
            color: active ? ACTIVE_TEXT : item.key === 'subscriptions' ? '#D97706' : SIDEBAR_MUTED,
            justifyContent: 'center',
          }}
        >
          <Icon size={19} weight={active ? 'fill' : 'regular'} />
        </ListItemIcon>

        {!collapsed && (
          <>
            <ListItemText
              primary={item.title}
              slotProps={{
                primary: {
                  noWrap: true,
                  sx: {
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    lineHeight: 1.35,
                  },
                },
              }}
            />

            <BackendStatus item={item} collapsed={collapsed} />
          </>
        )}
      </ListItemButton>
    </Tooltip>
  );
}

function SidebarNavigation({
  pathname,
  collapsed,
  onNavigate,
  onCloseMobile,
}: Pick<SidebarContentProps, 'pathname' | 'collapsed' | 'onNavigate' | 'onCloseMobile'>) {
  const activeKey = getActiveAdminNavKey(pathname);

  return (
    <Box
      component="nav"
      aria-label="Điều hướng Super Admin"
      sx={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        pt: 2,
        pb: 1,
        px: collapsed ? 1 : 1.25,
        '&::-webkit-scrollbar': {
          width: 4,
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#CBD5E1',
          borderRadius: 4,
        },
      }}
    >
      {ADMIN_NAVIGATION.map((section, sectionIndex) => (
        <Box key={section.key} sx={{ mb: 2.25 }}>
          {!collapsed ? (
            <Typography
              sx={{
                px: 1.75,
                mb: 0.75,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.09em',
                color: '#94A3B8',
                textTransform: 'uppercase',
              }}
            >
              {section.title}
            </Typography>
          ) : (
            sectionIndex > 0 && (
              <Divider
                sx={{
                  my: 1.5,
                  borderColor: SIDEBAR_BORDER,
                }}
              />
            )
          )}

          <List disablePadding>
            {section.items.map((item) => (
              <SidebarNavItem
                key={item.key}
                item={item}
                active={activeKey === item.key}
                collapsed={collapsed}
                onNavigate={onNavigate}
                onCloseMobile={onCloseMobile}
              />
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );
}

function SidebarFooter({
  collapsed,
  isMobile = false,
  onToggleCollapse,
}: Pick<SidebarContentProps, 'collapsed' | 'isMobile' | 'onToggleCollapse'>) {
  return (
    <Box sx={{ mt: 'auto', flexShrink: 0 }}>
      <Divider sx={{ borderColor: SIDEBAR_BORDER, mx: 2 }} />

      {!collapsed && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{
            px: 2.25,
            py: 1.75,
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '8px',
              bgcolor: '#EEF2FF',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={17} weight="duotone" color={ACTIVE_TEXT} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: '#1E293B',
              }}
            >
              Super Admin Console
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: 11,
                color: SIDEBAR_MUTED,
              }}
            >
              Gemini AI · Pro Billing
            </Typography>
          </Box>
        </Stack>
      )}

      {!isMobile && onToggleCollapse && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-end',
            px: 2,
            pb: 1.75,
          }}
        >
          <Tooltip title={collapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'} placement="right">
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
              sx={{
                color: SIDEBAR_MUTED,
                border: `1px solid ${SIDEBAR_BORDER}`,
                borderRadius: '8px',
                '&:hover': {
                  bgcolor: HOVER_BACKGROUND,
                  color: ACTIVE_TEXT,
                },
              }}
            >
              {collapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

function SidebarContent({
  pathname,
  collapsed,
  isMobile = false,
  onToggleCollapse,
  onCloseMobile,
  onNavigate,
}: SidebarContentProps) {
  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    if (onNavigate) {
      event.preventDefault();
      onNavigate(ADMIN_ROUTES.overview);
    }

    onCloseMobile?.();
  };

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SIDEBAR_BACKGROUND,
        color: SIDEBAR_TEXT,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Box
          component="a"
          href={ADMIN_ROUTES.overview}
          onClick={handleHomeClick}
          aria-label="SurplusIQ Admin - Tổng quan"
          sx={{
            display: 'block',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          <SidebarLogo
            collapsed={collapsed}
            onToggleCollapse={!isMobile ? onToggleCollapse : undefined}
          />
        </Box>

        {isMobile && (
          <IconButton
            onClick={onCloseMobile}
            aria-label="Đóng menu"
            sx={{
              position: 'absolute',
              right: 12,
              top: 18,
              color: SIDEBAR_MUTED,
              '&:hover': {
                bgcolor: HOVER_BACKGROUND,
                color: '#0F172A',
              },
            }}
          >
            <X size={20} />
          </IconButton>
        )}
      </Box>

      <SidebarNavigation
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
        onCloseMobile={onCloseMobile}
      />

      <SidebarFooter
        collapsed={collapsed}
        isMobile={isMobile}
        onToggleCollapse={onToggleCollapse}
      />
    </Box>
  );
}

export function AdminSidebar({
  pathname,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onNavigate,
}: AdminSidebarProps) {
  const desktopWidth = collapsed ? ADMIN_LAYOUT.collapsedSidebarWidth : ADMIN_LAYOUT.sidebarWidth;

  return (
    <>
      <Box
        component="aside"
        aria-label="Super Admin Sidebar"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: desktopWidth,
          zIndex: (theme) => theme.zIndex.drawer,
          display: {
            xs: 'none',
            lg: 'flex',
          },
          flexDirection: 'column',
          borderRight: `1px solid ${SIDEBAR_BORDER}`,
          bgcolor: SIDEBAR_BACKGROUND,
          transition: 'width 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <SidebarContent
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          onNavigate={onNavigate}
        />
      </Box>

      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={onCloseMobile}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: {
            xs: 'block',
            lg: 'none',
          },
          '& .MuiDrawer-paper': {
            width: ADMIN_LAYOUT.mobileSidebarWidth,
            maxWidth: 'calc(100vw - 28px)',
            border: 'none',
            bgcolor: SIDEBAR_BACKGROUND,
          },
        }}
      >
        <SidebarContent
          pathname={pathname}
          collapsed={false}
          isMobile
          onCloseMobile={onCloseMobile}
          onNavigate={onNavigate}
        />
      </Drawer>
    </>
  );
}

export default AdminSidebar;
