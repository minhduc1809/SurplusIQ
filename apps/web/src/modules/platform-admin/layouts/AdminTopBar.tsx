import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import {
  AppBar,
  Avatar,
  Badge,
  Box,
  ButtonBase,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  ArrowRight,
  Bell,
  CalendarBlank,
  CaretDown,
  CrownSimple,
  Info,
  Key,
  List as MenuIcon,
  MagnifyingGlass,
  ShieldCheck,
  SignOut,
  X,
} from '@phosphor-icons/react';

import { adminAuthApi } from '../api/admin-auth.api';
import { ADMIN_LAYOUT } from '../theme/create-theme';
import { useOptionalAdminSnapshot } from '../snapshot/AdminSnapshotProvider';

import {
  ADMIN_NAV_ITEMS,
  ADMIN_ROUTES,
  getActiveAdminNavItem,
  getAdminPageTitle,
} from '../config/admin-navigation';

export interface AdminAccount {
  displayName?: string;
  email?: string;
  role?: string;
}

export interface AdminTopbarProps {
  pathname: string;
  onOpenMobile: () => void;
  onNavigate?: (href: string) => void;
  currentUser?: AdminAccount | null;
  onLogout?: () => void;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function getAccountInitial(name?: string): string {
  return name?.trim().charAt(0).toUpperCase() || 'A';
}

export function AdminTopbar({
  pathname,
  onOpenMobile,
  onNavigate,
  currentUser,
  onLogout,
}: AdminTopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [categoryAnchor, setCategoryAnchor] = useState<HTMLElement | null>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const [twoFactorStatusMsg, setTwoFactorStatusMsg] = useState<string | null>(null);
  // Bật/tắt 2FA phải nhập lại mật khẩu: lưu mục tiêu (bật hay tắt) để mở hộp xác nhận.
  const [twoFactorTarget, setTwoFactorTarget] = useState<boolean | null>(null);
  const [twoFactorPassword, setTwoFactorPassword] = useState('');

  const snapshotState = useOptionalAdminSnapshot();

  const operationalAlerts = useMemo(() => {
    const collections = snapshotState?.data?.collections;
    if (!collections) return [];

    const pendingStores = (collections.stores ?? []).filter(
      (row) => row.status === 'PENDING_VERIFY',
    ).length;
    const pendingComplaints = (collections.complaints ?? []).filter(
      (row) => row.status === 'PENDING_STORE',
    ).length;
    const pendingViolations = (collections.violations ?? []).filter(
      (row) => row.status === 'PENDING',
    ).length;
    const openAnomalies = (collections.anomalies ?? []).filter(
      (row) => row.status === 'OPEN',
    ).length;

    return [
      {
        key: 'pending-stores',
        title: 'Cửa hàng chờ duyệt KYC',
        count: pendingStores,
        href: ADMIN_ROUTES.merchants,
        description: `${pendingStores} hồ sơ đối tác đang chờ xác minh`,
      },
      {
        key: 'pending-complaints',
        title: 'Khiếu nại chờ trọng tài',
        count: pendingComplaints,
        href: ADMIN_ROUTES.disputes,
        description: `${pendingComplaints} khiếu nại cần xử lý hoàn tiền / phán quyết`,
      },
      {
        key: 'pending-violations',
        title: 'Báo cáo vi phạm mới',
        count: pendingViolations,
        href: ADMIN_ROUTES.disputes,
        description: `${pendingViolations} báo cáo vi phạm đang chờ xem xét`,
      },
      {
        key: 'open-anomalies',
        title: 'Cảnh báo bất thường AI',
        count: openAnomalies,
        href: ADMIN_ROUTES.overview,
        description: `${openAnomalies} cảnh báo vận hành đang mở trên toàn sàn`,
      },
    ].filter((item) => item.count > 0);
  }, [snapshotState?.data]);

  const totalAlerts = useMemo(
    () => operationalAlerts.reduce((sum, item) => sum + item.count, 0),
    [operationalAlerts],
  );

  const activeItem = getActiveAdminNavItem(pathname);
  const currentPageTitle = getAdminPageTitle(pathname);

  const formattedDate = useMemo(() => {
    const refDate = snapshotState?.data?.exportedAt
      ? new Date(snapshotState.data.exportedAt)
      : new Date();
    const validDate = Number.isFinite(refDate.getTime()) ? refDate : new Date();
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(validDate);
  }, [snapshotState?.data?.exportedAt]);

  const navigateTo = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    setCategoryAnchor(null);

    if (onNavigate) {
      onNavigate(href);
      return;
    }

    window.location.assign(href);
  };

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    if (onNavigate) {
      event.preventDefault();
      onNavigate(href);
    }
  };

  const filteredItems = useMemo(() => {
    const keyword = normalizeSearchText(searchQuery);
    if (!keyword) {
      return ADMIN_NAV_ITEMS;
    }

    return ADMIN_NAV_ITEMS.filter((item) => {
      const searchableText = normalizeSearchText(
        [item.title, item.description, ...(item.keywords || [])].join(' '),
      );
      return searchableText.includes(keyword);
    });
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (isSearchShortcut) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, []);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && filteredItems.length > 0) {
      event.preventDefault();
      navigateTo(filteredItems[0].href);
    }
  };

  const handleLogout = () => {
    setAccountAnchor(null);
    onLogout?.();
  };

  const handleToggle2FA = async (enable: boolean, password: string) => {
    try {
      const res = await adminAuthApi.toggleTwoFactor(enable, password);
      setTwoFactorStatusMsg(
        res.twoFactorEnabled
          ? 'Đã bật xác thực 2FA (OTP) cho tài khoản Admin.'
          : 'Đã tắt xác thực 2FA (OTP).',
      );
      void snapshotState?.reload();
    } catch (error) {
      setTwoFactorStatusMsg(
        error instanceof Error ? error.message : 'Không thể cập nhật trạng thái 2FA.',
      );
    }
  };

  const displayName =
    currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'Admin');

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          top: 0,
          width: '100%',
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: '#F4F5F7',
          borderBottom: '1px solid #E5E7EB',
          backgroundImage: 'none',
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            minHeight: {
              xs: 64,
              md: ADMIN_LAYOUT.headerHeight,
            },
            px: {
              xs: 2,
              sm: 3,
              lg: 4,
            },
            gap: 2,
          }}
        >
          {/* Mobile menu button */}
          <IconButton
            onClick={onOpenMobile}
            aria-label="Mở menu quản trị"
            sx={{
              display: {
                xs: 'inline-flex',
                lg: 'none',
              },
              color: '#475569',
            }}
          >
            <MenuIcon size={22} />
          </IconButton>

          {/* StarAdmin Greeting Header on Desktop */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              flex: 1,
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 400,
                color: '#64748B',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
              }}
            >
              Xin chào,{' '}
              <Box component="span" sx={{ fontWeight: 800, color: '#1E293B' }}>
                {displayName}
              </Box>
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: 12.5,
                color: '#64748B',
                mt: 0.25,
              }}
            >
              Your performance summary this week · Phân hệ:{' '}
              <Box component="span" sx={{ fontWeight: 600, color: '#1F3BB3' }}>
                {currentPageTitle}
              </Box>
            </Typography>
          </Box>

          {/* Mobile Page Title */}
          <Typography
            noWrap
            sx={{
              display: {
                xs: 'block',
                md: 'none',
              },
              flex: 1,
              minWidth: 0,
              color: '#1E293B',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {currentPageTitle}
          </Typography>

          {/* StarAdmin Right Controls */}
          <Stack direction="row" spacing={{ xs: 0.75, sm: 1.25 }} sx={{ alignItems: 'center' }}>
            {/* Select Category Dropdown (StarAdmin style) */}
            <ButtonBase
              onClick={(event) => setCategoryAnchor(event.currentTarget)}
              aria-label="Chọn phân hệ quản trị"
              sx={{
                display: { xs: 'none', lg: 'inline-flex' },
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                minWidth: 175,
                height: 36,
                px: 1.5,
                borderRadius: '6px',
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#1E293B',
                fontSize: 12.5,
                fontWeight: 500,
                '&:hover': {
                  borderColor: '#CBD5E1',
                },
              }}
            >
              <Box
                component="span"
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {activeItem?.title || 'Select Category'}
              </Box>
              <CaretDown size={13} color="#64748B" />
            </ButtonBase>

            {/* Date Picker Pill (StarAdmin style) */}
            <Box
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                alignItems: 'center',
                height: 36,
                borderRadius: '6px',
                bgcolor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 1,
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  borderRight: '1px solid #E2E8F0',
                  color: '#475569',
                }}
              >
                <CalendarBlank size={16} />
              </Box>
              <Typography
                sx={{
                  px: 1.5,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: '#334155',
                }}
              >
                {formattedDate}
              </Typography>
            </Box>

            {/* Quick Search Icon */}
            <Tooltip title="Tìm kiếm nhanh (Ctrl + K)">
              <IconButton
                onClick={() => setSearchOpen(true)}
                aria-label="Tìm kiếm phân hệ Admin"
                sx={{
                  color: '#334155',
                  width: 36,
                  height: 36,
                }}
              >
                <MagnifyingGlass size={19} />
              </IconButton>
            </Tooltip>

            {/* Quick Pro Approval Shortcut */}
            <Tooltip title="Duyệt gói Pro & Thuê bao">
              <IconButton
                onClick={() => navigateTo(ADMIN_ROUTES.subscriptions)}
                aria-label="Duyệt gói Pro"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  color: '#D97706',
                  width: 36,
                  height: 36,
                }}
              >
                <CrownSimple size={19} weight="duotone" />
              </IconButton>
            </Tooltip>

            {/* System Notifications Bell */}
            <Tooltip title="Thông báo hệ thống">
              <IconButton
                onClick={(event) => setNotificationAnchor(event.currentTarget)}
                aria-label="Xem thông báo hệ thống"
                aria-haspopup="dialog"
                sx={{
                  color: '#334155',
                  width: 36,
                  height: 36,
                }}
              >
                <Badge badgeContent={totalAlerts} color="error" max={99}>
                  <Bell size={19} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Account Avatar Button */}
            <ButtonBase
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              aria-label="Mở menu tài khoản Admin"
              aria-haspopup="menu"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                p: 0.4,
                borderRadius: '999px',
                '&:hover': {
                  bgcolor: 'rgba(15, 23, 42, 0.04)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: '#1F3BB3',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13.5,
                }}
              >
                {getAccountInitial(currentUser?.displayName || currentUser?.email)}
              </Avatar>
            </ButtonBase>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Category Menu */}
      <Menu
        open={Boolean(categoryAnchor)}
        anchorEl={categoryAnchor}
        onClose={() => setCategoryAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              width: 240,
              borderRadius: '10px',
              mt: 0.75,
              border: '1px solid #E5E7EB',
            },
          },
        }}
      >
        {ADMIN_NAV_ITEMS.map((item) => (
          <MenuItem
            key={item.key}
            selected={activeItem?.key === item.key}
            onClick={() => navigateTo(item.href)}
            sx={{ fontSize: 13, py: 1 }}
          >
            {item.title}
          </MenuItem>
        ))}
      </Menu>

      {/* Global Search Dialog */}
      <Dialog
        open={searchOpen}
        onClose={closeSearch}
        fullWidth
        maxWidth="sm"
        aria-label="Tìm kiếm phân hệ Admin"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '14px',
              overflow: 'hidden',
              p: 0,
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Tìm trang, tính năng, phân hệ..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlass size={20} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={closeSearch} aria-label="Đóng tìm kiếm">
                      <X size={18} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 46,
              },
            }}
          />
        </Box>

        <Divider />

        <Box sx={{ maxHeight: 380, overflowY: 'auto', p: 1.5 }}>
          <Typography
            sx={{
              px: 1,
              pb: 1,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'text.secondary',
            }}
          >
            {searchQuery ? `${filteredItems.length} KẾT QUẢ` : 'TRUY CẬP NHANH'}
          </Typography>

          {filteredItems.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <MagnifyingGlass size={28} color="#94A3B8" />
              <Typography sx={{ mt: 1.5, fontSize: 14, fontWeight: 600 }}>
                Không tìm thấy kết quả
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredItems.map((item) => (
                <ListItemButton
                  key={item.key}
                  component="a"
                  href={item.href}
                  onClick={(event) => {
                    closeSearch();
                    handleLinkClick(event, item.href);
                  }}
                  sx={{
                    mb: 0.5,
                    px: 2,
                    py: 1.25,
                    borderRadius: '10px',
                  }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                    slotProps={{
                      primary: { sx: { fontSize: 13, fontWeight: 700 } },
                      secondary: { sx: { fontSize: 11.5, mt: 0.25 } },
                    }}
                  />
                  <ArrowRight size={16} color="#94A3B8" />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Dialog>

      {/* Notifications Popover */}
      <Popover
        open={Boolean(notificationAnchor)}
        anchorEl={notificationAnchor}
        onClose={() => setNotificationAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 340,
              maxWidth: 'calc(100vw - 24px)',
              borderRadius: '12px',
              mt: 1,
              overflow: 'hidden',
            },
          },
        }}
      >
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.75,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Thông báo hệ thống</Typography>
          <IconButton
            size="small"
            onClick={() => setNotificationAnchor(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </IconButton>
        </Stack>

        <Divider />

        {operationalAlerts.length > 0 ? (
          <List disablePadding sx={{ py: 1 }}>
            {operationalAlerts.map((alert) => (
              <ListItemButton
                key={alert.key}
                onClick={() => {
                  setNotificationAnchor(null);
                  navigateTo(alert.href);
                }}
                sx={{ px: 2.5, py: 1.25 }}
              >
                <ListItemText
                  primary={alert.title}
                  secondary={alert.description}
                  slotProps={{
                    primary: { sx: { fontSize: 13, fontWeight: 700 } },
                    secondary: { sx: { fontSize: 12, mt: 0.25 } },
                  }}
                />
                <Chip
                  label={alert.count}
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 700, ml: 1 }}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Stack spacing={1.25} sx={{ alignItems: 'center', px: 3, py: 4, textAlign: 'center' }}>
            <Info size={28} color="#94A3B8" />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
              Không có cảnh báo tồn đọng
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              Tất cả hồ sơ KYC, khiếu nại và báo cáo vi phạm trên toàn sàn đã được xử lý.
            </Typography>
          </Stack>
        )}
      </Popover>

      {/* Account Menu */}
      <Menu
        open={Boolean(accountAnchor)}
        anchorEl={accountAnchor}
        onClose={() => {
          setAccountAnchor(null);
          setTwoFactorStatusMsg(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              borderRadius: '12px',
              mt: 1,
              py: 0.5,
            },
          },
        }}
      >
        <Box sx={{ px: 2.25, py: 1.5 }}>
          <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
            {currentUser?.displayName || 'Quản trị viên'}
          </Typography>

          {currentUser?.email && (
            <Typography noWrap sx={{ fontSize: 12, color: '#64748B', mt: 0.25 }}>
              {currentUser.email}
            </Typography>
          )}

          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 1 }}>
            <ShieldCheck size={16} color="#1F3BB3" weight="duotone" />
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#1F3BB3' }}>
              {currentUser?.role || 'ADMIN'}
            </Typography>
          </Stack>

          {twoFactorStatusMsg && (
            <Typography
              sx={{
                mt: 1,
                p: 1,
                borderRadius: '6px',
                bgcolor: '#EEF2FF',
                color: '#1E3A8A',
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {twoFactorStatusMsg}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={() => setTwoFactorTarget(true)}
          sx={{ mx: 1, my: 0.25, borderRadius: '8px', gap: 1.25, fontSize: 12.5 }}
        >
          <Key size={17} color="#1F3BB3" />
          Bật xác thực mã 2FA (OTP)
        </MenuItem>

        <MenuItem
          onClick={() => setTwoFactorTarget(false)}
          sx={{ mx: 1, my: 0.25, borderRadius: '8px', gap: 1.25, fontSize: 12.5 }}
        >
          <Key size={17} color="#64748B" />
          Tắt xác thực mã 2FA (OTP)
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {onLogout ? (
          <MenuItem
            onClick={handleLogout}
            sx={{
              mx: 1,
              my: 0.25,
              borderRadius: '8px',
              color: 'error.main',
              gap: 1.25,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <SignOut size={18} />
            Đăng xuất
          </MenuItem>
        ) : (
          <Box sx={{ px: 2.25, py: 1.25 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Chức năng đăng xuất sẽ được kết nối ở phần Authentication.
            </Typography>
          </Box>
        )}
      </Menu>

      <Dialog
        open={twoFactorTarget !== null}
        onClose={() => setTwoFactorTarget(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{twoFactorTarget ? 'Bật xác thực 2FA' : 'Tắt xác thực 2FA'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            type="password"
            label="Mật khẩu hiện tại"
            value={twoFactorPassword}
            onChange={(e) => setTwoFactorPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTwoFactorTarget(null)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={!twoFactorPassword}
            onClick={() => {
              const target = twoFactorTarget;
              const password = twoFactorPassword;
              setTwoFactorTarget(null);
              setTwoFactorPassword('');
              if (target !== null) void handleToggle2FA(target, password);
            }}
          >
            Xác nhận
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AdminTopbar;
