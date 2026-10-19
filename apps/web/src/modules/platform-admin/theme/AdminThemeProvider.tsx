import type { ReactNode } from 'react';
import { useState } from 'react';

import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import { ThemeProvider, useColorScheme } from '@mui/material/styles';

import { Moon, Sun } from '@phosphor-icons/react';

import { adminTheme } from './create-theme';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

interface AdminThemeProviderProps {
  children: ReactNode;
}

type AdminColorMode = 'light' | 'dark';

// =====================================================
// 2. CẤU HÌNH
// =====================================================

// Lưu riêng cấu hình theme của Super Admin,
// không dùng chung key với Customer/Merchant.

const ADMIN_MODE_STORAGE_KEY = 'surplusiq-admin-mode';

const ADMIN_COLOR_SCHEME_STORAGE_KEY = 'surplusiq-admin-color-scheme';

// =====================================================
// 3. THEME PROVIDER
// =====================================================

export function AdminThemeProvider({ children }: AdminThemeProviderProps) {
  // Node dùng để gắn class light/dark riêng
  // cho khu vực Super Admin.

  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);

  return (
    <div
      ref={setRootElement}
      data-surplusiq-admin-root=""
      style={{
        minHeight: '100vh',
        width: '100%',
        isolation: 'isolate',
      }}
    >
      {rootElement && (
        <ThemeProvider
          theme={adminTheme}
          defaultMode="light"
          modeStorageKey={ADMIN_MODE_STORAGE_KEY}
          colorSchemeStorageKey={ADMIN_COLOR_SCHEME_STORAGE_KEY}
          // Gắn color scheme lên body để Dialog, Drawer
          // và Menu render qua Portal vẫn nhận đúng theme.
          colorSchemeNode={document.body}
          disableTransitionOnChange
        >
          <ScopedCssBaseline
            enableColorScheme
            sx={{
              minHeight: '100vh',
              backgroundColor: 'background.default',
              color: 'text.primary',
              fontFamily: 'typography.fontFamily',
            }}
          >
            {children}
          </ScopedCssBaseline>
        </ThemeProvider>
      )}
    </div>
  );
}

// =====================================================
// 4. CUSTOM HOOK
// =====================================================

/**
 * Hook sử dụng ở Sidebar, Topbar hoặc Settings.
 *
 * Ví dụ:
 *
 * const { mode, isDark, toggleMode } =
 *   useAdminColorMode();
 */

export function useAdminColorMode() {
  const { mode, systemMode, setMode } = useColorScheme();

  const resolvedMode: AdminColorMode =
    mode === 'dark' || (mode === 'system' && systemMode === 'dark') ? 'dark' : 'light';

  const isDark = resolvedMode === 'dark';

  const toggleMode = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  const changeMode = (newMode: AdminColorMode) => {
    setMode(newMode);
  };

  return {
    mode: resolvedMode,
    isDark,
    isLight: !isDark,
    toggleMode,
    changeMode,
  };
}

// =====================================================
// 5. NÚT CHUYỈN ĐỔI THEME
// =====================================================

/**
 * Nút chuyển đổi chế độ sáng / tối.
 *
 * Component sẽ được sử dụng trên AdminTopbar.
 */

export function AdminThemeToggle() {
  const { mode, isDark, toggleMode } = useAdminColorMode();

  const tooltipText = isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối';

  return (
    <Tooltip title={tooltipText} placement="bottom">
      <IconButton
        type="button"
        onClick={toggleMode}
        color="inherit"
        aria-label={tooltipText}
        aria-pressed={isDark}
        size="medium"
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          color: 'text.secondary',
          transition: 'background-color 0.2s ease',

          '&:hover': {
            backgroundColor: 'action.hover',
            color: 'text.primary',
          },
        }}
      >
        {mode === 'dark' ? <Sun size={21} weight="regular" /> : <Moon size={21} weight="regular" />}
      </IconButton>
    </Tooltip>
  );
}

export default AdminThemeProvider;
