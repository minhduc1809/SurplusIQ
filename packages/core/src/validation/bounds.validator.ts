/**
 * Bounds & Rounding Validators
 * Tuân thủ quy tắc làm tròn bội số 500 VND (BR-064, BR-066)
 */

/**
 * Làm tròn giá về bội số 500 VND gần nhất
 * Ví dụ:
 *  - 25.200 -> 25.000
 *  - 25.250 -> 25.500
 *  - 25.300 -> 25.500
 *  - 25.750 -> 26.000
 */
export function roundTo500(price: number): number {
  if (isNaN(price) || !isFinite(price)) {
    return 0;
  }
  return Math.round(price / 500) * 500;
}

/**
 * Kiểm tra giá sàn (Hard Floor Price)
 * Mặc định 40% giá gốc trừ khi có cấu hình cụ thể
 */
export function calculateFloorPrice(
  originalPrice: number,
  customFloor?: number,
  floorRatio: number = 0.4,
): number {
  if (customFloor !== undefined && customFloor > 0) {
    return roundTo500(customFloor);
  }
  const ratio = Math.max(0.1, Math.min(0.9, floorRatio));
  return roundTo500(originalPrice * ratio);
}
