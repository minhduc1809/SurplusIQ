export const PAYMENTS_CONSTANTS = {
  VIETQR: {
    BANK_BIN: '970422', // MBBank
    BANK_NAME: 'Ngân hàng TMCP Quân Đội (MBBank)',
    ACCOUNT_NO: '1900888999',
    ACCOUNT_NAME: 'SURPLUSIQ ESCROW',
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
