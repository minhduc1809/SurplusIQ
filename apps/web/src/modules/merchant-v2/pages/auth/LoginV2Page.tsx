import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../../../../lib/auth';
import { MerchantThemeProvider } from '../../theme/MerchantThemeProvider';
import { MERCHANT_V2_ROUTES } from '../../config/merchant-navigation';

/** Chỉ cho quay lại đường dẫn nội bộ của V2 để tránh chuyển hướng ra ngoài. */
export function safeRedirect(): string {
  const r = new URLSearchParams(window.location.search).get('redirect');
  return r && r.startsWith('/merchant-v2/') && !r.startsWith('//') ? r : MERCHANT_V2_ROUTES.today;
}

export function LoginV2Page() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      window.location.replace(safeRedirect());
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <MerchantThemeProvider>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'background.default',
          px: 2,
        }}
      >
        <Card component="form" onSubmit={submit} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Đăng nhập cửa hàng
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                SurplusIQ Merchant
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
            <TextField
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy || !email || !password}
            >
              Đăng nhập
            </Button>
          </Stack>
        </Card>
      </Box>
    </MerchantThemeProvider>
  );
}

export default LoginV2Page;
