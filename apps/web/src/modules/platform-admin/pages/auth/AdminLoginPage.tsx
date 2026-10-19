import { useEffect, useRef, useState } from 'react';

import type { FormEvent } from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowLeft,
  ArrowRight,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  Key,
  LockKey,
  ShieldCheck,
  SquaresFour,
  WarningCircle,
} from '@phosphor-icons/react';

import { useAdminAuth } from '../../auth/AdminAuthProvider';

import { AdminTwoFactorRequiredError, type AdminSession } from '../../api/admin-auth.api';

import { ADMIN_ROUTES } from '../../config/admin-navigation';

export interface AdminLoginPageProps {
  onAuthenticated?: (session: AdminSession) => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function validatePassword(password: string): string {
  if (!password) {
    return 'Vui lòng nhập mật khẩu.';
  }
  return '';
}

function validateOtp(otpCode: string, required: boolean): string {
  const trimmed = otpCode.trim();
  if (!trimmed) {
    return required ? 'Vui lòng nhập mã xác thực 6 chữ số.' : '';
  }
  if (!/^\d{6}$/.test(trimmed)) {
    return 'Mã xác thực phải gồm đúng 6 chữ số.';
  }
  return '';
}

export function AdminLoginPage({ onAuthenticated }: AdminLoginPageProps) {
  const {
    login,
    session,
    isAuthenticated,
    isLoading,
    status,
    error: authError,
    twoFactorChallenge,
    clearError,
    clearTwoFactorChallenge,
  } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [otpTouched, setOtpTouched] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectedRef = useRef(false);

  const isTwoFactorStep = Boolean(twoFactorChallenge);
  const otpVisible = isTwoFactorStep || showOtpInput;

  const emailError = emailTouched ? validateEmail(email) : '';
  const passwordError = passwordTouched ? validatePassword(password) : '';
  const otpError = otpTouched ? validateOtp(otpCode, isTwoFactorStep) : '';
  const visibleError = formError || authError;
  const busy = submitting || isLoading || status === 'checking';

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

  const handleOtpChange = (nextValue: string) => {
    const digitsOnly = nextValue.replace(/\D/g, '').slice(0, 6);
    setOtpCode(digitsOnly);
    setFormError(null);
    clearError();
  };

  const handleBackFromTwoFactor = () => {
    clearTwoFactorChallenge();
    setOtpCode('');
    setOtpTouched(false);
    setFormError(null);
  };

  const handleResendOtp = async () => {
    if (busy) return;
    setFormError(null);
    clearError();
    setSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password,
        deviceId: twoFactorChallenge?.deviceId,
      });
    } catch (caughtError) {
      if (!(caughtError instanceof AdminTwoFactorRequiredError)) {
        setFormError(
          caughtError instanceof Error ? caughtError.message : 'Không thể gửi lại mã xác thực.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    setEmailTouched(true);
    setPasswordTouched(true);
    if (otpVisible) {
      setOtpTouched(true);
    }
    setFormError(null);
    clearError();

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    const nextOtpError = otpVisible ? validateOtp(otpCode, isTwoFactorStep) : '';

    if (nextEmailError || nextPasswordError || nextOtpError) {
      return;
    }

    setSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
        ...(otpCode.trim() ? { otpCode: otpCode.trim() } : {}),
        ...(twoFactorChallenge?.deviceId ? { deviceId: twoFactorChallenge.deviceId } : {}),
      });
    } catch (caughtError) {
      if (caughtError instanceof AdminTwoFactorRequiredError) {
        setShowOtpInput(true);
        setFormError(null);
        return;
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể đăng nhập. Vui lòng thử lại.';

      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F4F5F7',
        px: 2.5,
        py: 4,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 4.5 },
          borderRadius: '14px',
          bgcolor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
        }}
      >
        {/* Header StarAdmin Brand */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              bgcolor: '#1F3BB3',
              display: 'grid',
              placeItems: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(31, 59, 179, 0.25)',
            }}
          >
            <SquaresFour size={22} weight="fill" />
          </Box>
          <Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#1E293B',
                }}
              >
                Surplus
              </Typography>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  color: '#1F3BB3',
                }}
              >
                Admin
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>
              Hệ thống quản trị điều hành trung tâm
            </Typography>
          </Box>
        </Stack>

        <Typography
          component="h1"
          sx={{
            fontSize: 22,
            fontWeight: 700,
            color: '#1E293B',
            letterSpacing: '-0.02em',
          }}
        >
          {isTwoFactorStep ? 'Xác thực 2 lớp (2FA)' : 'Đăng nhập quản trị'}
        </Typography>

        <Typography
          sx={{
            mt: 0.75,
            fontSize: 13.5,
            color: '#64748B',
            lineHeight: 1.6,
          }}
        >
          {isTwoFactorStep
            ? `Nhập mã OTP 6 chữ số đã gửi tới ${twoFactorChallenge?.target || email} để hoàn tất đăng nhập.`
            : 'Nhập thông tin tài khoản Super Admin để tiếp tục.'}
        </Typography>

        {status === 'checking' || isAuthenticated ? (
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              py: 6,
              mt: 2,
              textAlign: 'center',
            }}
          >
            <CircularProgress size={32} thickness={4} sx={{ color: '#1F3BB3' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>
              {isAuthenticated
                ? 'Đang chuyển đến Dashboard...'
                : 'Đang kiểm tra phiên đăng nhập...'}
            </Typography>
          </Stack>
        ) : (
          <Box
            component="form"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
            noValidate
            sx={{ mt: 3, width: '100%' }}
          >
            <Stack spacing={2.25}>
              {visibleError && (
                <Alert
                  severity="error"
                  variant="outlined"
                  icon={<WarningCircle size={20} weight="duotone" />}
                  sx={{ borderRadius: '10px', fontSize: 13 }}
                >
                  {visibleError}
                </Alert>
              )}

              {isTwoFactorStep && twoFactorChallenge && (
                <Alert
                  severity="info"
                  icon={<ShieldCheck size={20} weight="duotone" />}
                  sx={{
                    borderRadius: '10px',
                    bgcolor: '#EEF2FF',
                    color: '#1E3A8A',
                    border: '1px solid #C7D2FE',
                    fontSize: 13,
                  }}
                >
                  <Stack spacing={0.75}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                      {twoFactorChallenge.message}
                    </Typography>
                    {twoFactorChallenge.otpPreview && (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 12 }}>Mã OTP (Dev):</Typography>
                        <Chip
                          size="small"
                          label={twoFactorChallenge.otpPreview}
                          onClick={() => handleOtpChange(twoFactorChallenge.otpPreview || '')}
                          sx={{
                            fontWeight: 700,
                            bgcolor: '#1F3BB3',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        />
                      </Stack>
                    )}
                  </Stack>
                </Alert>
              )}

              {/* Email */}
              <Stack spacing={0.75}>
                <Typography
                  component="label"
                  htmlFor="admin-login-email"
                  sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}
                >
                  Email quản trị
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
                  placeholder="admin@surplusiq.vn"
                  error={Boolean(emailError)}
                  helperText={emailError || ''}
                  disabled={busy || isTwoFactorStep}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EnvelopeSimple size={18} color="#64748B" />
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
                      height: 44,
                      borderRadius: '8px',
                      bgcolor: isTwoFactorStep ? '#F8FAFC' : '#FFFFFF',
                    },
                  }}
                />
              </Stack>

              {/* Password */}
              <Stack spacing={0.75}>
                <Typography
                  component="label"
                  htmlFor="admin-login-password"
                  sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}
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
                  helperText={passwordError || ''}
                  disabled={busy || isTwoFactorStep}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockKey size={18} color="#64748B" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            edge="end"
                            size="small"
                            disabled={busy}
                            onClick={() => setShowPassword((prev) => !prev)}
                            onMouseDown={(event) => event.preventDefault()}
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                          >
                            {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
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
                      height: 44,
                      borderRadius: '8px',
                      bgcolor: isTwoFactorStep ? '#F8FAFC' : '#FFFFFF',
                    },
                  }}
                />
              </Stack>

              {/* 2FA OTP Verification Code Field */}
              {otpVisible ? (
                <Stack
                  spacing={0.75}
                  sx={{
                    p: 1.75,
                    borderRadius: '10px',
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography
                      component="label"
                      htmlFor="admin-login-otp"
                      sx={{ fontSize: 12.5, fontWeight: 700, color: '#1F3BB3' }}
                    >
                      Mã xác thực 2FA (OTP 6 số)
                    </Typography>
                    {!isTwoFactorStep && (
                      <Button
                        type="button"
                        size="small"
                        onClick={() => {
                          setShowOtpInput(false);
                          setOtpCode('');
                          setOtpTouched(false);
                        }}
                        sx={{ fontSize: 11.5, minWidth: 0, px: 1, color: '#64748B' }}
                      >
                        Ẩn mã
                      </Button>
                    )}
                  </Stack>

                  <TextField
                    id="admin-login-otp"
                    fullWidth
                    name="otpCode"
                    value={otpCode}
                    onChange={(event) => handleOtpChange(event.target.value)}
                    onBlur={() => setOtpTouched(true)}
                    placeholder="Nhập mã 6 chữ số (VD: 123456)"
                    error={Boolean(otpError)}
                    helperText={
                      otpError ||
                      (isTwoFactorStep
                        ? 'Mã xác thực có hiệu lực trong 5 phút.'
                        : 'Chỉ điền nếu tài khoản của bạn đã bật bảo mật 2FA.')
                    }
                    disabled={busy}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Key size={18} color="#1F3BB3" />
                          </InputAdornment>
                        ),
                      },
                      htmlInput: {
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        maxLength: 6,
                        autoComplete: 'one-time-code',
                        style: {
                          letterSpacing: '0.2em',
                          fontWeight: 700,
                        },
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        height: 44,
                        borderRadius: '8px',
                        bgcolor: '#FFFFFF',
                      },
                    }}
                  />

                  {isTwoFactorStep && (
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}
                    >
                      <Button
                        type="button"
                        size="small"
                        startIcon={<ArrowLeft size={14} />}
                        onClick={handleBackFromTwoFactor}
                        disabled={busy}
                        sx={{ fontSize: 12, color: '#475569' }}
                      >
                        Đổi tài khoản
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        onClick={() => void handleResendOtp()}
                        disabled={busy}
                        sx={{ fontSize: 12, fontWeight: 600, color: '#1F3BB3' }}
                      >
                        Gửi lại mã OTP
                      </Button>
                    </Stack>
                  )}
                </Stack>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="button"
                    size="small"
                    startIcon={<Key size={15} />}
                    onClick={() => setShowOtpInput(true)}
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#1F3BB3',
                      textTransform: 'none',
                      px: 1,
                    }}
                  >
                    Xác thực bằng mã 2FA (OTP)
                  </Button>
                </Box>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={busy}
                endIcon={!busy ? <ArrowRight size={18} /> : undefined}
                sx={{
                  height: 44,
                  borderRadius: '8px',
                  fontSize: 14,
                  fontWeight: 600,
                  bgcolor: '#1F3BB3',
                  boxShadow: '0 4px 12px rgba(31, 59, 179, 0.2)',
                  '&:hover': {
                    bgcolor: '#172E8C',
                    boxShadow: '0 6px 16px rgba(31, 59, 179, 0.28)',
                  },
                }}
              >
                {busy ? (
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    <CircularProgress color="inherit" size={16} />
                    <span>Đang xác thực...</span>
                  </Stack>
                ) : isTwoFactorStep ? (
                  'Xác nhận mã OTP & Đăng nhập'
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </Stack>
          </Box>
        )}

        <Divider sx={{ my: 2.75, borderColor: '#F1F5F9' }} />

        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: '#64748B' }}>
            <ShieldCheck size={16} color="#1F3BB3" weight="duotone" />
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
              Bảo mật 2FA • Role <strong>ADMIN</strong>
            </Typography>
          </Stack>

          <Link
            href="/"
            underline="hover"
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: '#1F3BB3',
            }}
          >
            Trang chủ SurplusIQ
          </Link>
        </Stack>
      </Paper>
    </Box>
  );
}

export default AdminLoginPage;
