import type { ReactNode } from 'react';
import { MerchantThemeProvider } from '../modules/merchant-v2/theme/MerchantThemeProvider';

/** Dùng lại trang MUI của bản V2 bên trong khung bản gốc (cùng đăng nhập, cùng API). */
export function V2Embed({ children }: { children: ReactNode }) {
  return <MerchantThemeProvider>{children}</MerchantThemeProvider>;
}
