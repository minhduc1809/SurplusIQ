import { useEffect, useRef, useState } from 'react';

import type { FormEvent } from 'react';

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowRight,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Leaf,
  LockKey,
  ShieldCheck,
  SquaresFour,
  WarningCircle,
} from '@phosphor-icons/react';

import { useAdminAuth } from '../../auth/AdminAuthProvider';

import type { AdminSession } from '../../api/admin-auth.api';

import { ADMIN_ROUTES } from '../../config/admin-navigation';

import { ADMIN_COLORS } from '../../theme/create-theme';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

export interface AdminLoginPageProps {
  /**
   * Hàm xử lý sau khi đăng nhập thành công.
   *
   * Nếu không truyền, trang tự điều hướng
   * tới /admin/overview bằng trình duyệt.
   */
  onAuthenticated?: (session: AdminSession) => void;
}

// =====================================================
// 2. KIỂM TRA DỮ LIỆU ĐĂNG NHẬP
// =====================================================

/**
 * Kiểm tra định dạng email cơ bản.
 *
 * Backend tiếp tục chịu trách nhiệm xác thực
 * thông tin đăng nhập và kiểm tra tài khoản.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Trả về thông báo lỗi tương ứng với email.
 */
function validateEmail(email: string): string {
  const normalized = email.trim();

  if (!normalized) {
    return 'Vui lòng nhập địa chỉ email.';
  }

  if (!isValidEmail(normalized)) {
    return 'Địa chỉ email không đúng định dạng.';
  }

  return '';
}

/**
 * Kiểm tra mật khẩu tại giao diện.
 *
 * Không áp dụng quy tắc đăng ký mật khẩu
 * khi người dùng chỉ đang đăng nhập.
 */
function validatePassword(password: string): string {
  if (!password) {
    return 'Vui lòng nhập mật khẩu.';
  }

  return '';
}

// =====================================================
// 3. COMPONENT LOGO
// =====================================================

function SurplusIQLogo({ light = false }: { light?: boolean }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
      }}
      spacing={1.5}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          borderRadius: '13px',
          background: 'linear-gradient(135deg, #8179FF, #635BFF)',
          boxShadow: '0 6px 18px rgba(99, 91, 255, 0.25)',
        }}
      >
        <SquaresFour size={25} color="#FFFFFF" weight="fill" />
      </Box>

      <Box>
        <Typography
          sx={{
            fontSize: 21,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.045em',
            color: light ? '#FFFFFF' : 'text.primary',
          }}
        >
          SurplusIQ
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: light ? '#98A2B3' : 'text.secondary',
          }}
        >
          PLATFORM ADMIN
        </Typography>
      </Box>
    </Stack>
  );
}

// =====================================================
// 4. KHU VỰC GIỚI THIỆU THƯƠNG HIỆU
// =====================================================

/**
 * Khu vực bên trái của trang đăng nhập.
 *
 * Chỉ hiển thị trên màn hình desktop.
 *
 * Không hiển thị số liệu hoặc trạng thái giả
 * vì người dùng chưa được xác thực.
 */
function LoginBrandPanel() {
  return (
    <Box
      component="aside"
      sx={{
        display: {
          xs: 'none',
          lg: 'flex',
        },

        position: 'relative',
        minHeight: '100dvh',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',

        p: {
          lg: 5,
          xl: 7,
        },

        backgroundColor: ADMIN_COLORS.sidebar.background,

        backgroundImage: [
          'radial-gradient(',
          'ellipse at 18% 18%,',
          'rgba(99,91,255,0.22),',
          'transparent 45%)',
          ',',
          'radial-gradient(',
          'ellipse at 90% 90%,',
          'rgba(21,183,159,0.12),',
          'transparent 48%)',
        ].join(''),

        color: '#FFFFFF',
      }}
    >
      {/* Logo thương hiệu */}

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <SurplusIQLogo light />
      </Box>

      {/* Nội dung giới thiệu */}

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 550,
          mx: 'auto',
          width: '100%',
          py: 5,
        }}
      >
        <Stack spacing={3.5}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 1,
              px: 1.5,
              py: 0.9,
              borderRadius: '999px',
              border: '1px solid rgba(165,180,252,0.24)',
              bgcolor: 'rgba(99,91,255,0.12)',
            }}
          >
            <ShieldCheck size={18} color="#A5B4FC" weight="duotone" />

            <Typography
              sx={{
                fontSize: 12,
                color: '#D6D6FF',
                fontWeight: 600,
              }}
            >
              Không gian quản trị nền tảng
            </Typography>
          </Box>

          <Typography
            component="h2"
            sx={{
              fontSize: {
                lg: 43,
                xl: 52,
              },
              lineHeight: 1.14,
              fontWeight: 750,
              letterSpacing: '-0.055em',
            }}
          >
            Quản trị thông minh.
            <Box
              component="span"
              sx={{
                display: 'block',
                mt: 1,
                color: '#A5B4FC',
              }}
            >
              Tác động bền vững.
            </Box>
          </Typography>

          <Typography
            sx={{
              fontSize: 15,
              lineHeight: 1.9,
              color: '#A7B0C2',
              maxWidth: 475,
            }}
          >
            Trung tâm điều hành SurplusIQ được thiết kế để hỗ trợ giám sát vận hành, quản lý đối tác
            và theo dõi hoạt động của nền tảng chống lãng phí thực phẩm.
          </Typography>

          {/* Thẻ giới thiệu các nhóm chức năng */}

          <Box
            sx={{
              mt: 2,
              p: 3,
              borderRadius: '22px',
              border: '1px solid rgba(255,255,255,0.11)',
              bgcolor: 'rgba(255,255,255,0.035)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Stack spacing={2.5}>
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Platform Administration
              </Typography>

              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '12px',
                    bgcolor: 'rgba(99,91,255,0.16)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <SquaresFour size={22} color="#A5B4FC" weight="duotone" />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Quản lý tập trung
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#98A2B3',
                      mt: 0.4,
                    }}
                  >
                    Tám phân hệ quản trị nền tảng
                  </Typography>
                </Box>
              </Stack>

              <Divider
                sx={{
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              />

              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '12px',
                    bgcolor: 'rgba(21,183,159,0.12)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Leaf size={22} color="#56D9C4" weight="duotone" />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Theo dõi tác động
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#98A2B3',
                      mt: 0.4,
                    }}
                  >
                    Dữ liệu môi trường và vận hành
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Thông tin chân trang */}

      <Typography
        sx={{
          position: 'relative',
          zIndex: 1,
          color: '#667085',
          fontSize: 12,
        }}
      >
        © {new Date().getFullYear()} SurplusIQ. Platform Administration.
      </Typography>
    </Box>
  );
}

// =====================================================
// 5. COMPONENT TRANG ĐĂNG NHẬP
// =====================================================

export function AdminLoginPage({ onAuthenticated }: AdminLoginPageProps) {
  // ---------------------------------------------------
  // Lấy trạng thái từ Authentication Provider
  // ---------------------------------------------------

  const {
    login,
    session,
    isAuthenticated,
    isLoading,
    status,
    error: authError,
    clearError,
  } = useAdminAuth();

  // ---------------------------------------------------
  // Trạng thái biểu mẫu
  // ---------------------------------------------------

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);

  const [passwordTouched, setPasswordTouched] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------
  // Tránh điều hướng lặp lại khi React render
  // ---------------------------------------------------

  const redirectedRef = useRef(false);

  // ---------------------------------------------------
  // Tính toán lỗi dữ liệu đầu vào
  // ---------------------------------------------------

  const emailError = emailTouched ? validateEmail(email) : '';

  const passwordError = passwordTouched ? validatePassword(password) : '';

  const visibleError = formError || authError;

  const busy = submitting || isLoading || status === 'checking';

  // ===================================================
  // 6. ĐIỀU HƯỚNG KHI ĐÃ XÁC THỰC
  // ===================================================

  /**
   * Khi người dùng đã có phiên Admin,
   * chuyển sang Dashboard.
   *
   * Nếu ứng dụng có router riêng, component cha
   * có thể truyền onAuthenticated để điều hướng
   * mà không tải lại toàn bộ trang.
   */
  useEffect(() => {
    if (!isAuthenticated || !session || redirectedRef.current) {
      return;
    }

    redirectedRef.current = true;

    if (onAuthenticated) {
      onAuthenticated(session);
    } else {
      window.location.replace(ADMIN_ROUTES.overview);
    }
  }, [isAuthenticated, session, onAuthenticated]);

  // ===================================================
  // 7. XỬ LÝ THAY ĐỔI BIỂU MẪU
  // ===================================================

  const handleEmailChange = (nextValue: string) => {
    setEmail(nextValue);
    setFormError(null);
    clearError();
  };

  const handlePasswordChange = (nextValue: string) => {
    setPassword(nextValue);
    setFormError(null);
    clearError();
  };

  // ===================================================
  // 8. XỬ LÝ ĐĂNG NHẬP
  // ===================================================

  /**
   * Không gọi fetch trực tiếp tại giao diện.
   *
   * Toàn bộ xác thực, kiểm tra role ADMIN
   * và lưu phiên đã được triển khai trong
   * admin-auth.api.ts và AdminAuthProvider.tsx.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    setEmailTouched(true);
    setPasswordTouched(true);
    setFormError(null);
    clearError();

    const nextEmailError = validateEmail(email);

    const nextPasswordError = validatePassword(password);

    if (nextEmailError || nextPasswordError) {
      return;
    }

    setSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      // Không điều hướng trực tiếp ở đây.
      // useEffect sẽ xử lý khi phiên được chấp nhận.
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể đăng nhập. Vui lòng thử lại.';

      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ===================================================
  // 9. GIAO DIỆN CHÍNH
  // ===================================================

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          lg: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
        },
        bgcolor: 'background.default',
      }}
    >
      {/* ======================================
          CỘT TRÁI: THƯƠNG HIỆU
          ====================================== */}

      <LoginBrandPanel />

      {/* ======================================
          CỘT PHẢI: BIỂU MẪU ĐĂNG NHẬP
          ====================================== */}

      <Box
        component="main"
        sx={{
          minWidth: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          px: {
            xs: 3,
            sm: 5,
            xl: 8,
          },
          py: {
            xs: 4,
            md: 5,
          },
        }}
      >
        {/* Logo chỉ hiển thị trên mobile */}

        <Box
          sx={{
            display: {
              xs: 'block',
              lg: 'none',
            },
          }}
        >
          <SurplusIQLogo />
        </Box>

        {/* Nội dung biểu mẫu */}

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 440,
            mx: 'auto',
            py: {
              xs: 6,
              lg: 4,
            },
          }}
        >
          {/* Nhãn khu vực quản trị */}

          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              alignSelf: 'flex-start',
              mb: 3,
              px: 1.5,
              py: 0.8,
              bgcolor: 'action.hover',
              borderRadius: '999px',
              color: 'primary.main',
            }}
          >
            <ShieldCheck size={17} weight="duotone" />

            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Super Admin Access
            </Typography>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: 30,
                sm: 36,
              },
              fontWeight: 750,
              letterSpacing: '-0.045em',
              lineHeight: 1.2,
              color: 'text.primary',
            }}
          >
            Chào mừng trở lại
          </Typography>

          <Typography
            sx={{
              mt: 1.5,
              color: 'text.secondary',
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            Đăng nhập bằng tài khoản được cấp quyền quản trị nền tảng SurplusIQ.
          </Typography>

          {/* ==================================
              KIỂM TRA PHIÊN SAU KHI TẢI TRANG
              ================================== */}

          {status === 'checking' || isAuthenticated ? (
            <Stack
              spacing={2}

              sx={{
                alignItems: 'center',
                py: 7,
                mt: 4,
                textAlign: 'center',
              }}
            >
              <CircularProgress size={34} thickness={4} />

              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {isAuthenticated
                  ? 'Đang chuyển đến Dashboard...'
                  : 'Đang kiểm tra phiên đăng nhập...'}
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  fontSize: 12,
                  maxWidth: 280,
                }}
              >
                {isAuthenticated
                  ? 'Phiên Admin đã được chấp nhận.'
                  : 'Hệ thống đang kiểm tra phiên đã lưu với Backend.'}
              </Typography>
            </Stack>
          ) : (
            <Box
              component="form"
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
              noValidate
              sx={{
                mt: 4,
                width: '100%',
              }}
            >
              <Stack spacing={2.75}>
                {/* THÔNG BÁO LỖI ĐĂNG NHẬP */}

                {visibleError && (
                  <Alert
                    severity="error"
                    variant="outlined"
                    icon={<WarningCircle size={22} weight="duotone" />}
                    sx={{
                      borderRadius: '12px',
                      lineHeight: 1.7,
                    }}
                  >
                    {visibleError}
                  </Alert>
                )}

                {/* TRƯỜNG EMAIL */}

                <Stack spacing={1}>
                  <Typography
                    component="label"
                    htmlFor="admin-login-email"
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Địa chỉ email
                  </Typography>

                  <TextField
                    id="admin-login-email"
                    fullWidth
                    required
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => handleEmailChange(event.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="Nhập email quản trị"
                    error={Boolean(emailError)}
                    helperText={emailError || ' '}
                    disabled={busy}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <EnvelopeSimple size={20} />
                          </InputAdornment>
                        ),
                      },
                      htmlInput: {
                        autoComplete: 'username',
                        inputMode: 'email',
                        maxLength: 255,
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 50,
                        borderRadius: '12px',
                      },
                    }}
                  />
                </Stack>

                {/* TRƯỜNG MẬT KHẨU */}

                <Stack spacing={1}>
                  <Typography
                    component="label"
                    htmlFor="admin-login-password"
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    Mật khẩu
                  </Typography>

                  <TextField
                    id="admin-login-password"
                    fullWidth
                    required
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => handlePasswordChange(event.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="Nhập mật khẩu"
                    error={Boolean(passwordError)}
                    helperText={passwordError || ' '}
                    disabled={busy}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockKey size={20} />
                          </InputAdornment>
                        ),

                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              edge="end"
                              disabled={busy}
                              onClick={() => setShowPassword((previous) => !previous)}
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                              aria-pressed={showPassword}
                            >
                              {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },

                      htmlInput: {
                        autoComplete: 'current-password',
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 50,
                        borderRadius: '12px',
                      },
                    }}
                  />
                </Stack>

                {/* NÚT ĐĂNG NHẬP */}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={busy}
                  endIcon={!busy ? <ArrowRight size={19} /> : undefined}
                  sx={{
                    height: 50,
                    borderRadius: '12px',
                    fontSize: 14,
                    fontWeight: 700,
                    mt: '4px !important',
                    boxShadow: '0 5px 18px rgba(99,91,255,0.2)',

                    '&:hover': {
                      boxShadow: '0 7px 24px rgba(99,91,255,0.28)',
                    },
                  }}
                >
                  {busy ? (
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: 'center',
                      }}
                      spacing={1.5}
                    >
                      <CircularProgress color="inherit" size={18} />
                      <span>Đang đăng nhập...</span>
                    </Stack>
                  ) : (
                    'Đăng nhập vào Super Admin'
                  )}
                </Button>

                {/* THÔNG BÁO QUYỀN TRUY CẬP */}

                <Alert
                  severity="info"
                  variant="standard"
                  icon={<ShieldCheck size={20} weight="duotone" />}
                  sx={{
                    borderRadius: '12px',
                    bgcolor: 'action.hover',

                    '& .MuiAlert-message': {
                      fontSize: 12,
                      lineHeight: 1.75,
                      color: 'text.secondary',
                    },
                  }}
                >
                  Khu vực này chỉ dành cho tài khoản có vai trò <strong>ADMIN</strong>. Tài khoản
                  cửa hàng và khách hàng không được phép truy cập.
                </Alert>
              </Stack>
            </Box>
          )}

          {/* ==================================
              LIÊN KẾT QUAY LẠI ỨNG DỤNG
              ================================== */}

          <Divider sx={{ my: 4 }} />

          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography color="text.secondary" sx={{ fontSize: 12 }}>
              Không thuộc bộ phận quản trị?
            </Typography>

            <Link
              href="/"
              underline="hover"
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: 'primary.main',
              }}
            >
              Trở về SurplusIQ
            </Link>
          </Stack>
        </Box>

        {/* CHÂN TRANG KHU VỰC FORM */}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 1,
          }}
        >
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: 11,
              textAlign: 'center',
            }}
          >
            SurplusIQ Platform Administration
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default AdminLoginPage;
