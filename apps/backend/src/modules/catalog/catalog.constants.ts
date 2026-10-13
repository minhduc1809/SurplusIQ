export const CATALOG_CONSTANTS = {
  MIN_ORIGINAL_PRICE: 1000,
  MAX_ORIGINAL_PRICE: 5000000,
  PRICE_ROUNDING_STEP: 500, // BR-064: Bội số 500 VND
  MIN_SHELF_LIFE_HOURS: 1,
  MAX_SHELF_LIFE_HOURS: 168, // 7 ngày
  MIN_WEIGHT_GRAMS: 10,
  MAX_WEIGHT_GRAMS: 5000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  BASIC_MAX_CSV_ROWS: 100,
  PRO_MAX_CSV_ROWS: 500,
};

export const COMMON_ALLERGENS = [
  'Gluten',
  'Trứng',
  'Sữa (Lactose)',
  'Đậu phộng (Lạc)',
  'Đậu nành',
  'Hạt cây (Hạnh nhân, Óc chó, Điều)',
  'Giáp xác (Tôm, Cua)',
  'Cá',
  'Mè (Vừng)',
  'Cần tây',
  'Mù tạt',
  'Sulfite',
  'Đậu lupin',
  'Động vật thân mềm',
];

export const ITEM_CATEGORIES = ['Bánh mì', 'Bánh ngọt', 'Bánh kem', 'Đồ uống', 'Món mặn', 'Khác'];
