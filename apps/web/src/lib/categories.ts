/** Nhãn tiếng Việt của mã danh mục món (khớp backend/src/modules/catalog/food-category.ts). */
const LABELS: Record<string, string> = {
  RICE: 'Cơm',
  NOODLE: 'Phở & Bún',
  BREAD: 'Bánh mì',
  FASTFOOD: 'Đồ nhanh',
  SNACK: 'Ăn vặt',
  HEALTHY: 'Healthy',
  SWEET: 'Bánh ngọt',
  DRINK: 'Đồ uống',
  PRODUCE: 'Nông sản',
  OTHER: 'Khác',
};

export const categoryLabel = (code: string | null | undefined) =>
  (code && LABELS[code]) || code || 'Khác';
