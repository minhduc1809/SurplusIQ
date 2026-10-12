/**
 * SurplusIQ QR Token & Pickup Pass Types
 * Tuân thủ BR-022, 9.1 (Bảo mật & Quyền riêng tư - Tuyệt đối không chứa PII)
 */

export interface QrTokenPayload {
  jti: string; // UUID v4 định danh vé nhận hàng duy nhất (chống replay attack)
  orderId: string; // Mã đơn hàng
  storeId: string; // Mã cửa hàng tiếp nhận
  exp: number; // Unix timestamp tính bằng milliseconds hết hạn nhận
}

export type QrVerifyErrorCode = 'INVALID_SIGNATURE' | 'EXPIRED' | 'MALFORMED';

export interface QrVerifyResult {
  isValid: boolean;
  payload?: QrTokenPayload;
  errorCode?: QrVerifyErrorCode;
  errorMessage?: string;
}

// Bảng ký tự loại trừ các ký tự dễ nhầm lẫn (loại bỏ 0, O, 1, I, L)
export const BACKUP_PIN_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
