export const OFFERS_CONSTANTS = {
  DEFAULT_FLOOR_PRICE_RATIO: 0.4, // 40% giá gốc per BRD R2-007, BR-054
  PRICE_ROUNDING_STEP: 500, // Bội số 500 VND per BR-064
  MAX_PRICE_CHANGE_COUNT: 3, // Giới hạn tối đa 3 lần đổi giá per DB check constraint
  MAX_OFFER_QUANTITY: 500, // Số lượng suất tối đa 1-500 per R2-028
  MIN_OFFER_QUANTITY: 1, // Số lượng suất tối thiểu per R2-028
  MAX_FILTER_DAYS: 90, // Khoảng ngày lọc tối đa 90 ngày per R2-027
  MAX_NOTE_LENGTH: 200, // Ghi chú tối đa 200 ký tự per R2-028
};

export enum StockAdjustmentReason {
  ADD_MORE = 'Làm thêm',
  DAMAGED = 'Hỏng',
  COUNTER_SALE = 'Bán tại quầy',
  OTHER = 'Khác',
}

export enum OfferCloseReason {
  OUT_OF_INGREDIENTS = 'Hết nguyên liệu',
  STORE_CLOSING = 'Đóng cửa',
  OTHER = 'Khác',
}

export enum OfferCancelReason {
  STORE_INCIDENT = 'Sự cố quán',
  QUALITY_ISSUE = 'Sự cố chất lượng',
  FORCE_MAJEURE = 'Bất khả kháng',
  OTHER = 'Khác',
}
