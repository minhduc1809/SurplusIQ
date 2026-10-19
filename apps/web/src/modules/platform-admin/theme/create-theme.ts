import { createTheme } from '@mui/material/styles';
import type {} from '@mui/material/themeCssVarsAugmentation';

/**
 * SurplusIQ Platform Admin Design System
 *
 * Lấy cảm hứng từ Devias Material Kit React.
 *
 * Stack:
 * - React 18
 * - TypeScript
 * - Material UI v9
 * - Emotion
 *
 * Hỗ trợ:
 * - Chế độ Sáng / Tối
 * - Biến CSS theme
 * - Breakpoint responsive
 * - Ghi đè component nhất quán
 */

export const ADMIN_COLORS = {
  primary: '#635BFF',
  primaryDark: '#4F46E5',
  success: '#15B79F',
  warning: '#F79009',
  error: '#F04438',
  info: '#06AED4',

  light: {
    background: '#F8F9FC',
    paper: '#FFFFFF',
    textPrimary: '#111927',
    textSecondary: '#667085',
    divider: '#E5E7EB',
  },

  dark: {
    background: '#101828',
    paper: '#182230',
    textPrimary: '#F9FAFB',
    textSecondary: '#98A2B3',
    divider: '#344054',
  },

  sidebar: {
    background: '#0B1220',
    text: '#D0D5DD',
    muted: '#667085',
  },
} as const;

export const ADMIN_LAYOUT = {
  sidebarWidth: 280,
  collapsedSidebarWidth: 76,
  mobileSidebarWidth: 320,
  headerHeight: 64,
  contentMaxWidth: 1600,
  cardRadius: 20,
  buttonRadius: 12,
} as const;

export const adminTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },

  colorSchemes: {
    light: {
      palette: {
        mode: 'light',

        primary: {
          main: ADMIN_COLORS.primary,
          dark: ADMIN_COLORS.primaryDark,
          contrastText: '#FFFFFF',
        },

        secondary: {
          main: '#6C737F',
        },

        success: {
          main: ADMIN_COLORS.success,
        },

        warning: {
          main: ADMIN_COLORS.warning,
        },

        error: {
          main: ADMIN_COLORS.error,
        },

        info: {
          main: ADMIN_COLORS.info,
        },

        background: {
          default: ADMIN_COLORS.light.background,
          paper: ADMIN_COLORS.light.paper,
        },

        text: {
          primary: ADMIN_COLORS.light.textPrimary,
          secondary: ADMIN_COLORS.light.textSecondary,
        },

        divider: ADMIN_COLORS.light.divider,
      },
    },

    dark: {
      palette: {
        mode: 'dark',

        primary: {
          main: '#8179FF',
          dark: ADMIN_COLORS.primary,
          contrastText: '#FFFFFF',
        },

        secondary: {
          main: '#98A2B3',
        },

        success: {
          main: '#32D5B8',
        },

        warning: {
          main: '#FDB022',
        },

        error: {
          main: '#F97066',
        },

        info: {
          main: '#22C6E9',
        },

        background: {
          default: ADMIN_COLORS.dark.background,
          paper: ADMIN_COLORS.dark.paper,
        },

        text: {
          primary: ADMIN_COLORS.dark.textPrimary,
          secondary: ADMIN_COLORS.dark.textSecondary,
        },

        divider: ADMIN_COLORS.dark.divider,
      },
    },
  },

  typography: {
    fontFamily: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'].join(
      ',',
    ),

    h1: {
      fontSize: '3rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.04em',
    },

    h2: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.035em',
    },

    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.025em',
    },

    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },

    h5: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },

    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },

    subtitle1: {
      fontSize: '1rem',
      fontWeight: 600,
    },

    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 600,
    },

    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },

    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },

    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },

    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },

    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
    },
  },

  spacing: 8,

  shape: {
    borderRadius: 8,
  },

  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1440,
    },
  },

  zIndex: {
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: '100%',
        },

        body: {
          minHeight: '100%',
          WebkitFontSmoothing: 'antialiased',
        },

        '#root': {
          minHeight: '100%',
        },

        '*': {
          boxSizing: 'border-box',
        },

        '*:focus-visible': {
          outline: `2px solid ${ADMIN_COLORS.primary}`,
          outlineOffset: 2,
        },
      },
    },

    MuiCard: {
      defaultProps: {
        elevation: 0,
      },

      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: ADMIN_LAYOUT.cardRadius,
          backgroundImage: 'none',
          border: '1px solid var(--mui-palette-divider)',
          boxShadow: '0 5px 22px rgba(0, 0, 0, 0.04)',

          ...theme.applyStyles('dark', {
            boxShadow: '0 5px 22px rgba(0, 0, 0, 0.24)',
          }),
        }),
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },

        rounded: {
          borderRadius: 16,
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },

      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: ADMIN_LAYOUT.buttonRadius,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
        },

        sizeSmall: {
          minHeight: 32,
          padding: '6px 14px',
        },

        sizeMedium: {
          padding: '8px 20px',
        },

        sizeLarge: {
          minHeight: 46,
          padding: '11px 24px',
        },

        contained: {
          '&.MuiButton-colorPrimary:hover': {
            boxShadow: '0 4px 14px rgba(99, 91, 255, 0.22)',
          },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--mui-palette-divider)',
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },

        sizeSmall: {
          height: 24,
          fontSize: '0.75rem',
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid var(--mui-palette-divider)',
          padding: '14px 16px',
        },

        head: {
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: 'var(--mui-palette-text-secondary)',
          backgroundColor: 'var(--mui-palette-background-default)',
        },

        body: {
          fontSize: '0.875rem',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-hover:hover': {
            backgroundColor: 'rgba(99, 91, 255, 0.035)',
          },
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          padding: 8,
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid var(--mui-palette-divider)',
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },

    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },

      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
          padding: '8px 12px',
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 99,
        },

        bar: {
          borderRadius: 99,
        },
      },
    },
  },
});

export default adminTheme;
