import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Menu as MenuIcon, Bell, LogOut, Settings, ChevronRight } from 'lucide-react';
import { MerchantThemeToggle } from '../theme/MerchantThemeProvider';
import { MERCHANT_LAYOUT } from '../theme/create-merchant-theme';
import {
  getActiveV2Group,
  getActiveV2Item,
  MERCHANT_V2_NAVIGATION,
} from '../config/merchant-navigation';

export interface MerchantAccount {
  email?: string;
  phone?: string;
  storeName?: string;
}

interface MerchantTopbarProps {
  pathname: string;
  sidebarWidth: number;
  onOpenMobile: () => void;
  onNavigate: (href: string) => void;
  currentUser?: MerchantAccount | null;
  onLogout?: () => void;
  notificationCount?: number;
}

export function MerchantTopbar({
  pathname,
  onOpenMobile,
  onNavigate,
  currentUser,
  onLogout,
  notificationCount = 0,
}: MerchantTopbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const activeGroupKey = getActiveV2Group(pathname);
  const activeItemKey = getActiveV2Item(pathname);

  const activeGroup = MERCHANT_V2_NAVIGATION.find((g) => g.key === activeGroupKey);
  const activeItem = activeGroup?.items.find((i) => i.key === activeItemKey);

  const initials = (currentUser?.email || currentUser?.phone || 'U')[0].toUpperCase();
  const displayName =
    currentUser?.storeName || currentUser?.email || currentUser?.phone || 'Cửa hàng';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        zIndex: (t) => t.zIndex.appBar,
      }}
    >
      <Toolbar
        sx={{
          height: MERCHANT_LAYOUT.headerHeight,
          minHeight: `${MERCHANT_LAYOUT.headerHeight}px !important`,
          px: { xs: 2, sm: 3 },
          gap: 1.5,
        }}
      >
        {/* Mobile menu button */}
        <IconButton
          onClick={onOpenMobile}
          size="small"
          sx={{ display: { lg: 'none' }, mr: 0.5 }}
          aria-label="Mở menu"
        >
          <MenuIcon size={20} />
        </IconButton>

        {/* Breadcrumbs */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs
            separator={<ChevronRight size={14} />}
            sx={{ '& .MuiBreadcrumbs-separator': { color: 'text.disabled' } }}
          >
            {activeGroup && (
              <Typography
                variant="body2"
                color={activeItem ? 'text.secondary' : 'text.primary'}
                sx={{
                  fontWeight: activeItem ? 400 : 600,
                  cursor: activeGroup.href ? 'pointer' : 'default',
                }}
                onClick={() => activeGroup.href && onNavigate(activeGroup.href)}
              >
                {activeGroup.title}
              </Typography>
            )}
            {activeItem && (
              <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600 }} noWrap>
                {activeItem.title}
              </Typography>
            )}
          </Breadcrumbs>
        </Box>

        {/* Store status chip */}
        <Chip
          size="small"
          label="Đang mở"
          sx={{
            display: { xs: 'none', sm: 'flex' },
            bgcolor: 'rgba(16,185,129,0.1)',
            color: 'success.main',
            fontWeight: 600,
            fontSize: '0.75rem',
            '& .MuiChip-label': { px: 1.5 },
          }}
        />

        {/* Theme toggle */}
        <MerchantThemeToggle />

        {/* Notification bell */}
        <Tooltip title="Thông báo">
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <Badge badgeContent={notificationCount} color="error" max={9}>
              <Bell size={20} />
            </Badge>
          </IconButton>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5 }} />

        {/* User avatar */}
        <Tooltip title={displayName}>
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-controls={menuOpen ? 'merchant-user-menu' : undefined}
            aria-haspopup="true"
            sx={{ p: 0.25 }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: 'primary.main',
                fontSize: '0.8125rem',
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>

        {/* User dropdown */}
        <Menu
          id="merchant-user-menu"
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { sx: { mt: 1, minWidth: 200, borderRadius: '12px' } } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" noWrap>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {currentUser?.email || currentUser?.phone}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onNavigate('/merchant-v2/settings');
            }}
            sx={{ borderRadius: '8px', mx: 0.5, my: 0.25 }}
          >
            <ListItemIcon>
              <Settings size={16} />
            </ListItemIcon>
            Cài đặt cửa hàng
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              onLogout?.();
            }}
            sx={{ borderRadius: '8px', mx: 0.5, my: 0.25, color: 'error.main' }}
          >
            <ListItemIcon>
              <LogOut size={16} style={{ color: 'inherit' }} />
            </ListItemIcon>
            Đăng xuất
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default MerchantTopbar;
