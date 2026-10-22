export const PAYMENTS_CONSTANTS = {
  // Tài khoản thụ hưởng lấy từ .env (VIETQR_*), đọc lúc dùng để luôn khớp cấu hình hiện tại; giá trị sau || chỉ là mặc định cho dev.
  VIETQR: {
    get BANK_BIN() {
      return process.env.VIETQR_BANK_ID || '970422';
    },
    get BANK_NAME() {
      return process.env.VIETQR_BANK_NAME || 'MB Bank';
    },
    get ACCOUNT_NO() {
      return process.env.VIETQR_ACCOUNT_NO || '1900888999';
    },
    get ACCOUNT_NAME() {
      return process.env.VIETQR_ACCOUNT_NAME || 'SURPLUSIQ ESCROW';
    },
    get TEMPLATE() {
      return process.env.VIETQR_TEMPLATE || 'compact2';
    },
    SYNTAX_PREFIX: 'SUQ',
  },
  /**
   * Thời gian chờ tối thiểu giữa 2 lần kiểm tra lại trạng thái (giây) - R1-056
   */
  RECHECK_RATE_LIMIT_SECONDS: 60,
  /**
   * Thời gian tối đa giao dịch ở trạng thái PENDING_CONFIRM trước khi đánh dấu FAILED (giờ) - VC-07
   */
  PENDING_MAX_HOURS: 24,
  /**
   * Thời hạn mặc định của vé nhận hàng QR nếu offer không có pickupSlot (giờ)
   */
  DEFAULT_PICKUP_TOKEN_EXPIRY_HOURS: 24,
};
