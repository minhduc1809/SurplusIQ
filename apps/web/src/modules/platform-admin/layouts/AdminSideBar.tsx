import type { MouseEvent } from 'react';

import {
  Box,
  Typography,
  Stack,
  Drawer,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material';

import {
  SquaresFour,
  Storefront,
  UsersThree,
  ShoppingCart,
  Gavel,
  ArrowsClockwise,
  CrownSimple,
  GearSix,
  CaretDoubleLeft,
  CaretDoubleRight,
  X,
  ShieldCheck,
  Buildings,
} from '@phosphor-icons/react';

import {
  ADMIN_NAVIGATION,
  ADMIN_ROUTES,
  ADMIN_AVAILABILITY_LABELS,
  getActiveAdminNavKey,
} from '../config/admin-navigation';

import type { AdminNavIcon, AdminNavItem } from '../config/admin-navigation';

import { ADMIN_COLORS, ADMIN_LAYOUT } from '../theme/create-theme';

// =====================================================
// 1. TYPES
// =====================================================

export interface AdminSidebarProps {
  /**
   * Current browser pathname.
   *
   * Example:
   * /admin/overview
   * /admin/merchants/123
   */
  pathname: string;

  /**
   * Desktop collapsed state.
   */
  collapsed: boolean;

  /**
   * Toggle sidebar width on desktop.
   */
  onToggleCollapse: () => void;

  /**
   * Mobile drawer visibility.
   */
  mobileOpen: boolean;

  /**
   * Close the mobile drawer.
   */
  onCloseMobile: () => void;

  /**
   * Optional SPA navigation callback.
   *
   * If omitted, native anchor navigation is used.
   * The parent layout is responsible for updating
   * the pathname when using SPA navigation.
   */
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

// =====================================================
// 2. CONSTANTS
// =====================================================

const SIDEBAR_BACKGROUND = ADMIN_COLORS.sidebar.background;

const SIDEBAR_TEXT = '#D0D5DD';

const SIDEBAR_MUTED = '#98A2B3';

const SIDEBAR_BORDER = 'rgba(255, 255, 255, 0.09)';

const ACTIVE_BACKGROUND = ADMIN_COLORS.primary;

const HOVER_BACKGROUND = 'rgba(255, 255, 255, 0.06)';

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

// =====================================================
// 3. SIDEBAR LOGO
// =====================================================

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={collapsed ? 'center' : 'flex-start'}
      spacing={1.5}
      sx={{
        px: collapsed ? 1 : 2.5,
        py: 3,
        minHeight: 92,
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          minWidth: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #8179FF, #635BFF)',
          boxShadow: '0 4px 18px rgba(99,91,255,0.3)',
        }}
      >
        <SquaresFour size={24} weight="fill" color="#FFFFFF" />
      </Box>

      {!collapsed && (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 21,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.04em',
              lineHeight: 1.25,
            }}
          >
            SurplusIQ
          </Typography>

          <Typography
            sx={{
              color: SIDEBAR_MUTED,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.15em',
              mt: 0.5,
            }}
          >
            PLATFORM ADMIN
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

// =====================================================
// 4. WORKSPACE INFORMATION
// =====================================================

function WorkspaceInfo() {
  return (
    <Box
      sx={{
        mx: 2,
        mb: 3,
        px: 1.75,
        py: 1.5,
        borderRadius: '12px',
        border: `1px solid ${SIDEBAR_BORDER}`,
        bgcolor: 'rgba(255,255,255,0.025)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            bgcolor: 'rgba(99,91,255,0.16)',
          }}
        >
          <Buildings size={20} weight="duotone" color="#A5B4FC" />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            noWrap
            sx={{
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            SurplusIQ Platform
          </Typography>

          <Typography
            noWrap
            sx={{
              color: SIDEBAR_MUTED,
              fontSize: 11,
              mt: 0.35,
            }}
          >
            Super Admin Workspace
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

// =====================================================
// 5. BACKEND STATUS INDICATOR
// =====================================================

function BackendStatus({ item, collapsed }: { item: AdminNavItem; collapsed: boolean }) {
  if (collapsed || item.backendAvailability === 'ready') {
    return null;
  }

  const isPartial = item.backendAvailability === 'partial';

  const color = isPartial ? '#F79009' : '#667085';

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

// =====================================================
// 6. NAVIGATION ITEM
// =====================================================

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
    // Preserve browser conventions for modifier clicks,
    // middle-click and opening links in new tabs.
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
          minHeight: 44,
          mb: 0.5,
          px: collapsed ? 1 : 1.5,
          borderRadius: '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          color: active ? '#FFFFFF' : SIDEBAR_TEXT,

          transition: 'background-color 0.18s ease',

          '&:hover': {
            bgcolor: active ? ACTIVE_BACKGROUND : HOVER_BACKGROUND,
          },

          '&.Mui-selected': {
            bgcolor: ACTIVE_BACKGROUND,
            color: '#FFFFFF',

            '&:hover': {
              bgcolor: '#5149E8',
            },
          },

          '&:focus-visible': {
            outline: '2px solid #A5B4FC',
            outlineOffset: 2,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 36,
            color: active ? '#FFFFFF' : '#98A2B3',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} weight={active ? 'fill' : 'regular'} />
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
                    lineHeight: 1.4,
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

// =====================================================
// 7. NAVIGATION SECTIONS
// =====================================================

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
        px: collapsed ? 1.5 : 2,

        '&::-webkit-scrollbar': {
          width: 5,
        },

        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'rgba(255,255,255,0.12)',
          borderRadius: 4,
        },
      }}
    >
      {ADMIN_NAVIGATION.map((section, sectionIndex) => (
        <Box
          key={section.key}
          sx={{
            mb: 2.5,
          }}
        >
          {!collapsed ? (
            <Typography
              sx={{
                px: 1.5,
                mb: 1,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#667085',
              }}
            >
              {section.title}
            </Typography>
          ) : (
            sectionIndex > 0 && (
              <Divider
                sx={{
                  my: 2,
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

// =====================================================
// 8. SIDEBAR FOOTER
// =====================================================

function SidebarFooter({
  collapsed,
  isMobile = false,
  onToggleCollapse,
}: Pick<SidebarContentProps, 'collapsed' | 'isMobile' | 'onToggleCollapse'>) {
  return (
    <Box sx={{ mt: 'auto', flexShrink: 0 }}>
      <Divider
        sx={{
          borderColor: SIDEBAR_BORDER,
          mx: 2,
        }}
      />

      {!collapsed && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            p: 2.5,
          }}
        >
          <ShieldCheck size={20} weight="duotone" color="#15B79F" />

          <Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: '#FFFFFF',
              }}
            >
              Platform Administration
            </Typography>

            <Typography
              sx={{
                fontSize: 11,
                color: SIDEBAR_MUTED,
                mt: 0.35,
              }}
            >
              SurplusIQ · Admin Console
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
            pb: 2,
          }}
        >
          <Tooltip title={collapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'} placement="right">
            <IconButton
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
              sx={{
                color: SIDEBAR_MUTED,
                border: `1px solid ${SIDEBAR_BORDER}`,
                borderRadius: '10px',

                '&:hover': {
                  bgcolor: HOVER_BACKGROUND,
                  color: '#FFFFFF',
                },
              }}
            >
              {collapsed ? <CaretDoubleRight size={18} /> : <CaretDoubleLeft size={18} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

// =====================================================
// 9. SIDEBAR CONTENT
// =====================================================

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
      {/* Logo and mobile close button */}
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
          <SidebarLogo collapsed={collapsed} />
        </Box>

        {isMobile && (
          <IconButton
            onClick={onCloseMobile}
            aria-label="Đóng menu"
            sx={{
              position: 'absolute',
              right: 12,
              top: 28,
              color: '#98A2B3',

              '&:hover': {
                bgcolor: HOVER_BACKGROUND,
                color: '#FFFFFF',
              },
            }}
          >
            <X size={20} />
          </IconButton>
        )}
      </Box>

      {/* Workspace */}
      {!collapsed && <WorkspaceInfo />}

      {/* Navigation */}
      <SidebarNavigation
        pathname={pathname}
        collapsed={collapsed}
        onNavigate={onNavigate}
        onCloseMobile={onCloseMobile}
      />

      {/* Footer */}
      <SidebarFooter
        collapsed={collapsed}
        isMobile={isMobile}
        onToggleCollapse={onToggleCollapse}
      />
    </Box>
  );
}

// =====================================================
// 10. MAIN ADMIN SIDEBAR
// =====================================================

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
      {/* ===========================================
          DESKTOP SIDEBAR
          =========================================== */}

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

      {/* ===========================================
          MOBILE / TABLET DRAWER
          =========================================== */}

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
