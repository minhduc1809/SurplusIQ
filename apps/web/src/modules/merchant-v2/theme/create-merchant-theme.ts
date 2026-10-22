import { createTheme } from '@mui/material/styles';
import type {} from '@mui/material/themeCssVarsAugmentation';

export const MERCHANT_COLORS = {
  primary: '#1F3BB3',
  primaryDark: '#172E8C',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0EA5E9',
  light: {
    background: '#F4F5F7',
    paper: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    divider: '#E5E7EB',
  },
  dark: {
    background: '#0F172A',
    paper: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    divider: '#334155',
  },
} as const;

export const MERCHANT_LAYOUT = {
  sidebarWidth: 260,
  collapsedSidebarWidth: 72,
  mobileSidebarWidth: 280,
  headerHeight: 68,
  contentMaxWidth: 1440,
  cardRadius: 12,
  buttonRadius: 8,
} as const;

export const merchantTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        mode: 'light',
        primary: {
          main: MERCHANT_COLORS.primary,
          dark: MERCHANT_COLORS.primaryDark,
          contrastText: '#FFFFFF',
        },
        secondary: { main: '#6C737F' },
        success: { main: MERCHANT_COLORS.success },
        warning: { main: MERCHANT_COLORS.warning },
        error: { main: MERCHANT_COLORS.error },
        info: { main: MERCHANT_COLORS.info },
        background: {
          default: MERCHANT_COLORS.light.background,
          paper: MERCHANT_COLORS.light.paper,
        },
        text: {
          primary: MERCHANT_COLORS.light.textPrimary,
          secondary: MERCHANT_COLORS.light.textSecondary,
        },
        divider: MERCHANT_COLORS.light.divider,
      },
    },
    dark: {
      palette: {
        mode: 'dark',
        primary: { main: '#8179FF', dark: MERCHANT_COLORS.primary, contrastText: '#FFFFFF' },
        secondary: { main: '#98A2B3' },
        success: { main: '#32D5B8' },
        warning: { main: '#FDB022' },
        error: { main: '#F97066' },
        info: { main: '#22C6E9' },
        background: { default: MERCHANT_COLORS.dark.background, paper: MERCHANT_COLORS.dark.paper },
        text: {
          primary: MERCHANT_COLORS.dark.textPrimary,
          secondary: MERCHANT_COLORS.dark.textSecondary,
        },
        divider: MERCHANT_COLORS.dark.divider,
      },
    },
  },
  typography: {
    fontFamily: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'].join(
      ',',
    ),
    h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2 },
    h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.25 },
    h3: { fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 },
    h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35 },
    h5: { fontSize: '1rem', fontWeight: 600 },
    h6: { fontSize: '0.875rem', fontWeight: 600 },
    subtitle1: { fontSize: '1rem', fontWeight: 600 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.6 },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    button: { fontSize: '0.875rem', fontWeight: 600, textTransform: 'none' },
  },
  spacing: 8,
  shape: { borderRadius: 8 },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1440 } },
  zIndex: { appBar: 1100, drawer: 1200, modal: 1300, snackbar: 1400, tooltip: 1500 },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: MERCHANT_LAYOUT.cardRadius,
          backgroundImage: 'none',
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          ...theme.applyStyles('dark', { boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }),
        }),
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: 12 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: MERCHANT_LAYOUT.buttonRadius,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
        },
        sizeSmall: { minHeight: 32, padding: '5px 14px' },
        sizeMedium: { padding: '8px 20px' },
        sizeLarge: { minHeight: 46, padding: '11px 24px' },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--mui-palette-divider)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600 },
        sizeSmall: { height: 22, fontSize: '0.72rem' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: '1px solid var(--mui-palette-divider)', padding: '13px 16px' },
        head: {
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--mui-palette-text-secondary)',
          backgroundColor: 'var(--mui-palette-background-default)',
        },
        body: { fontSize: '0.875rem' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&.MuiTableRow-hover:hover': { backgroundColor: 'rgba(31,59,179,0.04)' } },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18, padding: 8 } } },
    MuiDrawer: {
      styleOverrides: { paper: { borderRight: '1px solid var(--mui-palette-divider)' } },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: { tooltip: { borderRadius: 6, fontSize: '0.73rem', padding: '6px 10px' } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 6, borderRadius: 99 }, bar: { borderRadius: 99 } },
    },
  },
});

export default merchantTheme;
