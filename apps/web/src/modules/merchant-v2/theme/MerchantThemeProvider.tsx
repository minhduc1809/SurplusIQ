import type { ReactNode } from 'react';
import { useState } from 'react';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import { Moon, Sun } from '@phosphor-icons/react';
import { merchantTheme } from './create-merchant-theme';

const MERCHANT_MODE_KEY = 'surplusiq-merchant-v2-mode';
const MERCHANT_SCHEME_KEY = 'surplusiq-merchant-v2-color-scheme';

interface MerchantThemeProviderProps {
  children: ReactNode;
}

export function MerchantThemeProvider({ children }: MerchantThemeProviderProps) {
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setRootEl}
      data-surplusiq-merchant-v2-root=""
      style={{ minHeight: '100vh', width: '100%', isolation: 'isolate' }}
    >
      {rootEl && (
        <ThemeProvider
          theme={merchantTheme}
          defaultMode="light"
          modeStorageKey={MERCHANT_MODE_KEY}
          colorSchemeStorageKey={MERCHANT_SCHEME_KEY}
          colorSchemeNode={document.body}
          disableTransitionOnChange
        >
          <ScopedCssBaseline
            enableColorScheme
            sx={{
              minHeight: '100vh',
              backgroundColor: 'background.default',
              color: 'text.primary',
            }}
          >
            {children}
          </ScopedCssBaseline>
        </ThemeProvider>
      )}
    </div>
  );
}

export function useMerchantColorMode() {
  const { mode, systemMode, setMode } = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && systemMode === 'dark');
  return {
    isDark,
    toggleMode: () => setMode(isDark ? 'light' : 'dark'),
  };
}

export function MerchantThemeToggle() {
  const { isDark, toggleMode } = useMerchantColorMode();
  const label = isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';
  return (
    <Tooltip title={label} placement="bottom">
      <IconButton
        onClick={toggleMode}
        color="inherit"
        aria-label={label}
        size="medium"
        sx={{
          width: 38,
          height: 38,
          borderRadius: '10px',
          color: 'text.secondary',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
        }}
      >
        {isDark ? <Sun size={20} weight="regular" /> : <Moon size={20} weight="regular" />}
      </IconButton>
    </Tooltip>
  );
}

export default MerchantThemeProvider;
