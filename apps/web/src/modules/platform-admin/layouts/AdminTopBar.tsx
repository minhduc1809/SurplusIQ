import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import {
  AppBar,
  Avatar,
  Box,
  Breadcrumbs,
  ButtonBase,
  Chip,
  Dialog,
  Divider,
  IconButton,
  InputAdornment,
  Link,
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
  List as MenuIcon,
  MagnifyingGlass,
  Bell,
  CaretDown,
  ArrowRight,
  ShieldCheck,
  SignOut,
  Info,
  X,
} from '@phosphor-icons/react';

import { AdminThemeToggle } from '../theme/AdminThemeProvider';
import { ADMIN_LAYOUT } from '../theme/create-theme';

import {
  ADMIN_NAV_ITEMS,
  ADMIN_ROUTES,
  getActiveAdminNavItem,
  getAdminPageTitle,
  normalizeAdminPath,
} from '../config/admin-navigation';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

export interface AdminAccount {
  displayName?: string;
  email?: string;
  role?: string;
}

export interface AdminTopbarProps {
  // Đường dẫn trang hiện tại, dùng để xác định Breadcrumb.
  pathname: string;

  // Mở Sidebar dạng Drawer trên thiết bị di động.
  onOpenMobile: () => void;

  // Hàm điều hướng SPA, sẽ được truyền từ AdminLayout.
  onNavigate?: (href: string) => void;

  // Thông tin tài khoản thực tế sau khi đăng nhập.
  currentUser?: AdminAccount | null;

  // Hàm đăng xuất, được triển khai tại tầng xác thực.
  onLogout?: () => void;
}

// =====================================================
// 2. HÀM TIỆN ÍCH
// =====================================================

/**
 * Chuẩn hóa chuỗi để tìm kiếm không phân biệt
 * chữ hoa, chữ thường hoặc dấu tiếng Việt.
 */
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Lấy chữ cái đại diện cho tài khoản khi chưa có ảnh.
 * Không sử dụng tên hoặc ảnh đại diện giả.
 */
function getAccountInitial(name?: string): string {
  return name?.trim().charAt(0).toUpperCase() || 'A';
}

// =====================================================
// 3. COMPONENT CHÍNH
// =====================================================

export function AdminTopbar({
  pathname,
  onOpenMobile,
  onNavigate,
  currentUser,
  onLogout,
}: AdminTopbarProps) {
  // ---------------------------------------------------
  // Quản lý trạng thái các cửa sổ tương tác
  // ---------------------------------------------------

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [notificationAnchor, setNotificationAnchor] = useState<HTMLElement | null>(null);

  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);

  // ---------------------------------------------------
  // Xác định trang hiện tại
  // ---------------------------------------------------

  const activeItem = getActiveAdminNavItem(pathname);

  const currentPageTitle = getAdminPageTitle(pathname);

  const isDetailPage =
    activeItem !== undefined &&
    normalizeAdminPath(pathname) !== normalizeAdminPath(activeItem.href);

  // ---------------------------------------------------
  // Điều hướng giữa các trang Admin
  // ---------------------------------------------------

  const navigateTo = (href: string) => {
    setSearchOpen(false);
    setSearchQuery('');

    if (onNavigate) {
      onNavigate(href);
      return;
    }

    // Khi chưa tích hợp React Router, dùng điều hướng
    // trình duyệt để đảm bảo menu vẫn hoạt động.
    window.location.assign(href);
  };

  const handleLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    // Giữ nguyên hành vi mở tab mới của trình duyệt.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    if (onNavigate) {
      event.preventDefault();
      onNavigate(href);
    }
  };

  // ---------------------------------------------------
  // Lọc danh sách phân hệ trong tìm kiếm nhanh
  // ---------------------------------------------------

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

  // ---------------------------------------------------
  // Xử lý phím tắt Ctrl + K hoặc Cmd + K
  // ---------------------------------------------------

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

  // ---------------------------------------------------
  // Đóng và làm sạch dữ liệu tìm kiếm
  // ---------------------------------------------------

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  // ---------------------------------------------------
  // Xử lý chọn kết quả tìm kiếm bằng bàn phím
  // ---------------------------------------------------

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && filteredItems.length > 0) {
      event.preventDefault();
      navigateTo(filteredItems[0].href);
    }
  };

  // ---------------------------------------------------
  // Xử lý đăng xuất
  // ---------------------------------------------------

  const handleLogout = () => {
    setAccountAnchor(null);

    // Việc xóa token, thu hồi session và chuyển trang
    // do tầng xác thực quản lý, không thực hiện ở Topbar.
    onLogout?.();
  };

  return (
    <>
      {/* THANH ĐIỀU HƯỚNG CHÍNH */}

      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          top: 0,
          width: '100%',
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
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
          {/* NÚT MỞ SIDEBAR TRÊN MOBILE */}

          <IconButton
            onClick={onOpenMobile}
            aria-label="Mở menu quản trị"
            sx={{
              display: {
                xs: 'inline-flex',
                lg: 'none',
              },
              color: 'text.secondary',
            }}
          >
            <MenuIcon size={23} />
          </IconButton>

          {/* BREADCRUMB TRÊN DESKTOP */}

          <Breadcrumbs
            aria-label="Vị trí trang hiện tại"
            separator="/"
            sx={{
              display: {
                xs: 'none',
                md: 'flex',
              },
              flex: 1,

              '& .MuiBreadcrumbs-separator': {
                mx: 1,
                color: 'text.disabled',
              },
            }}
          >
            <Link
              href={ADMIN_ROUTES.overview}
              underline="hover"
              onClick={(event) => handleLinkClick(event, ADMIN_ROUTES.overview)}
              sx={{
                color: 'text.secondary',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Super Admin
            </Link>

            <Typography
              sx={{
                color: isDetailPage ? 'text.secondary' : 'text.primary',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {currentPageTitle}
            </Typography>

            {isDetailPage && (
              <Typography
                sx={{
                  color: 'text.primary',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Chi tiết
              </Typography>
            )}
          </Breadcrumbs>

          {/* TÊN TRANG TRÊN MOBILE */}

          <Typography
            noWrap
            sx={{
              display: {
                xs: 'block',
                md: 'none',
              },
              flex: 1,
              minWidth: 0,
              color: 'text.primary',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {currentPageTitle}
          </Typography>

          {/* NHÓM CÔNG CỤ BÊN PHẢI */}

          <Stack
            direction="row"
            spacing={{
              xs: 0.5,
              sm: 1,
            }}
            sx={{
              alignItems: 'center',
            }}
          >
            {/* TÌM KIẾM NHANH */}

            <ButtonBase
              onClick={() => setSearchOpen(true)}
              aria-label="Tìm kiếm phân hệ Admin"
              sx={{
                display: {
                  xs: 'none',
                  lg: 'flex',
                },
                alignItems: 'center',
                gap: 1.25,
                width: 260,
                height: 38,
                px: 1.5,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                color: 'text.secondary',
                justifyContent: 'flex-start',
                transition: 'border-color 0.2s',

                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <MagnifyingGlass size={18} />

              <Typography
                sx={{
                  fontSize: 13,
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                Tìm kiếm...
              </Typography>

              <Box
                component="span"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '5px',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                Ctrl K
              </Box>
            </ButtonBase>

            {/* TÌM KIẾM TRÊN MÀN HÌNH NHỎ */}

            <Tooltip title="Tìm kiếm">
              <IconButton
                onClick={() => setSearchOpen(true)}
                aria-label="Tìm kiếm"
                sx={{
                  display: {
                    xs: 'inline-flex',
                    lg: 'none',
                  },
                  color: 'text.secondary',
                }}
              >
                <MagnifyingGlass size={21} />
              </IconButton>
            </Tooltip>

            {/* CHUYỂN ĐỔI CHẾ ĐỘ SÁNG / TỐI */}

            <AdminThemeToggle />

            {/* KHU VỰC THÔNG BÁO */}

            <Tooltip title="Thông báo hệ thống">
              <IconButton
                onClick={(event) => setNotificationAnchor(event.currentTarget)}
                aria-label="Xem thông báo hệ thống"
                aria-haspopup="dialog"
                sx={{
                  color: 'text.secondary',
                  width: 40,
                  height: 40,
                }}
              >
                <Bell size={21} />
              </IconButton>
            </Tooltip>

            {/* MENU TÀI KHOẢN */}

            <Divider
              orientation="vertical"
              flexItem
              sx={{
                mx: 0.5,
                my: 0.75,
                display: {
                  xs: 'none',
                  sm: 'block',
                },
              }}
            />

            <ButtonBase
              onClick={(event) => setAccountAnchor(event.currentTarget)}
              aria-label="Mở menu tài khoản Admin"
              aria-haspopup="menu"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 0.75,
                py: 0.5,
                borderRadius: '12px',

                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {getAccountInitial(currentUser?.displayName)}
              </Avatar>

              <Box
                sx={{
                  display: {
                    xs: 'none',
                    xl: 'block',
                  },
                  textAlign: 'left',
                  maxWidth: 140,
                }}
              >
                <Typography
                  noWrap
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  {currentUser?.displayName || 'Quản trị viên'}
                </Typography>

                <Typography
                  noWrap
                  sx={{
                    fontSize: 11,
                    color: 'text.secondary',
                  }}
                >
                  {currentUser?.role || 'Admin'}
                </Typography>
              </Box>

              <CaretDown
                size={14}
                style={{
                  opacity: 0.6,
                }}
              />
            </ButtonBase>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ============================================
          HỘP THOẠI TÌM KIẾM TOÀN CỤC
          ============================================ */}

      <Dialog
        open={searchOpen}
        onClose={closeSearch}
        fullWidth
        maxWidth="sm"
        aria-label="Tìm kiếm phân hệ Admin"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '18px',
              overflow: 'hidden',
              p: 0,
            },
          },
        }}
      >
        {/* Ô NHẬP TỪ KHÓA */}

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
                    <MagnifyingGlass size={21} />
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
                height: 48,
              },
            }}
          />
        </Box>

        <Divider />

        {/* DANH SÁCH KẾT QUẢ */}

        <Box
          sx={{
            maxHeight: 390,
            overflowY: 'auto',
            p: 1.5,
          }}
        >
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
            <Box
              sx={{
                py: 5,
                textAlign: 'center',
              }}
            >
              <MagnifyingGlass size={30} color="#98A2B3" />

              <Typography
                sx={{
                  mt: 1.5,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Không tìm thấy kết quả
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 12,
                  color: 'text.secondary',
                }}
              >
                Thử tìm bằng từ khóa khác.
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
                    py: 1.5,
                    borderRadius: '12px',

                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText
                    primary={item.title}
                    secondary={item.description}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: 13,
                          fontWeight: 700,
                        },
                      },
                      secondary: {
                        sx: {
                          fontSize: 11,
                          mt: 0.4,
                        },
                      },
                    }}
                  />

                  <Stack
                    direction="row"
                    spacing={1}

                    sx={{ alignItems: 'center', ml: 1 }}
                  >
                    {item.backendAvailability === 'unavailable' && (
                      <Chip
                        label="Chưa có API"
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10 }}
                      />
                    )}

                    <ArrowRight size={17} color="#98A2B3" />
                  </Stack>
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        {/* HƯỚNG DẪN PHÍM TẮT */}

        <Divider />

        <Stack
          direction="row"

          spacing={1}
          sx={{
            alignItems: 'center',
            px: 2.5,
            py: 1.5,
          }}
        >
          <Chip label="Enter" size="small" variant="outlined" />

          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: 11,
            }}
          >
            Mở kết quả đầu tiên
          </Typography>

          <Chip label="Esc" size="small" variant="outlined" sx={{ ml: 'auto !important' }} />

          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: 11,
            }}
          >
            Đóng
          </Typography>
        </Stack>
      </Dialog>

      {/* ============================================
          CỬA SỔ THÔNG BÁO
          ============================================ */}

      <Popover
        open={Boolean(notificationAnchor)}
        anchorEl={notificationAnchor}
        onClose={() => setNotificationAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 340,
              maxWidth: 'calc(100vw - 24px)',
              borderRadius: '16px',
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
            py: 2,
          }}
        >
          <Typography
            sx={{
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            Thông báo hệ thống
          </Typography>

          <IconButton
            size="small"
            onClick={() => setNotificationAnchor(null)}
            aria-label="Đóng thông báo"
          >
            <X size={18} />
          </IconButton>
        </Stack>

        <Divider />

        <Stack
          spacing={1.5}
          sx={{
            alignItems: 'center',
            px: 3,
            py: 5,
            textAlign: 'center',
          }}
        >
          <Info size={30} color="#98A2B3" />

          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Chưa có API thông báo Admin
          </Typography>

          <Typography
            sx={{
              fontSize: 12,
              lineHeight: 1.7,
              color: 'text.secondary',
            }}
          >
            Backend hiện tại chưa có endpoint thông báo toàn sàn dành riêng cho Super Admin.
          </Typography>
        </Stack>
      </Popover>

      {/* ============================================
          MENU TÀI KHOẢN ADMIN
          ============================================ */}

      <Menu
        open={Boolean(accountAnchor)}
        anchorEl={accountAnchor}
        onClose={() => setAccountAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 260,
              borderRadius: '16px',
              mt: 1,
              py: 0.5,
            },
          },
        }}
      >
        {/* THÔNG TIN NGƯỜI DÙNG */}

        <Box sx={{ px: 2.5, py: 1.75 }}>
          <Typography
            noWrap
            sx={{
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {currentUser?.displayName || 'Quản trị viên'}
          </Typography>

          {currentUser?.email && (
            <Typography
              noWrap
              sx={{
                fontSize: 12,
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              {currentUser.email}
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={0.75}

            sx={{ alignItems: 'center', mt: 1 }}
          >
            <ShieldCheck size={16} color="#15B79F" />

            <Typography
              sx={{
                fontSize: 11,
                color: 'text.secondary',
              }}
            >
              {currentUser?.role || 'Quản trị viên'}
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ my: 0.75 }} />

        {/* CHỈ HIỂN THỊ ĐĂNG XUẤT
            KHI ĐÃ CÓ HÀM XỬ LÝ THỰC TẾ */}

        {onLogout ? (
          <MenuItem
            onClick={handleLogout}
            sx={{
              mx: 1,
              my: 0.5,
              borderRadius: '10px',
              color: 'error.main',
              gap: 1.5,
              fontSize: 13,
            }}
          >
            <SignOut size={19} />
            Đăng xuất
          </MenuItem>
        ) : (
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography
              sx={{
                fontSize: 11,
                color: 'text.secondary',
                lineHeight: 1.6,
              }}
            >
              Chức năng đăng xuất sẽ được kết nối ở phần Authentication.
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
}

export default AdminTopbar;
