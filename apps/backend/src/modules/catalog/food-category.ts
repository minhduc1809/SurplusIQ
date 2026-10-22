/** 10 nhóm món chuẩn của hệ thống (BRD bổ sung: loại món). Lưu mã vào items.category, app hiển thị tên ngắn. */
export const FOOD_CATEGORIES = [
  { code: 'RICE', label: 'Cơm' },
  { code: 'NOODLE', label: 'Phở & Bún' },
  { code: 'BREAD', label: 'Bánh mì' },
  { code: 'FASTFOOD', label: 'Đồ nhanh' },
  { code: 'SNACK', label: 'Ăn vặt' },
  { code: 'HEALTHY', label: 'Healthy' },
  { code: 'SWEET', label: 'Bánh ngọt' },
  { code: 'DRINK', label: 'Đồ uống' },
  { code: 'PRODUCE', label: 'Nông sản' },
  { code: 'OTHER', label: 'Khác' },
] as const;

export type FoodCategoryCode = (typeof FOOD_CATEGORIES)[number]['code'];

const CODES = new Set<string>(FOOD_CATEGORIES.map((c) => c.code));

const plain = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

/** Từ khóa theo thứ tự ưu tiên (bánh mì phải xét trước "mì", đồ uống trước "trà"...). */
const RULES: Array<[FoodCategoryCode, RegExp]> = [
  ['BREAD', /banh mi/],
  ['DRINK', /tra sua|ca phe|cafe|nuoc ep|sinh to|nuoc uong|tra dao|smoothie/],
  [
    'SWEET',
    /banh kem|croissant|banh ngot|tiramisu|flan|donut|cookie|mousse|\bche\b|\bkem\b|cupcake|banh su|brownie/,
  ],
  ['HEALTHY', /salad|ngu coc|\bchay\b|healthy|granola|yogurt|sua chua/],
  ['FASTFOOD', /burger|pizza|ga ran|khoai tay|khoai chien|hot dog|sandwich/],
  ['SNACK', /xien|banh trang|banh bao|do nuong|nem nuong|banh bot|an vat/],
  ['PRODUCE', /rau cu|trai cay|hoa qua|\brau\b|trung|nong san/],
  ['NOODLE', /\bpho\b|\bbun\b|\bmi\b|\bmien\b|\bchao\b|hu tieu|banh canh|banh cuon|mi quang/],
  ['RICE', /\bcom\b/],
];

/** Chuẩn hóa mọi giá trị cũ/nhập tay (mã, tên ngắn, "Meals"...) về một mã; không đoán được thì dùng tên món, rồi OTHER. */
export function normalizeFoodCategory(
  raw: string | null | undefined,
  itemName = '',
): FoodCategoryCode {
  const value = (raw ?? '').trim();
  const upper = value.toUpperCase();
  // "Other" cũ trùng mã OTHER nên vẫn thử đoán theo tên món trước khi chốt Khác
  if (CODES.has(upper) && upper !== 'OTHER') return upper as FoodCategoryCode;
  const byLabel = FOOD_CATEGORIES.find((c) => plain(c.label) === plain(value));
  if (byLabel) return byLabel.code;
  const text = plain(`${itemName} ${value}`);
  for (const [code, re] of RULES) if (re.test(text)) return code;
  return plain(value) === 'groceries' ? 'PRODUCE' : 'OTHER';
}
