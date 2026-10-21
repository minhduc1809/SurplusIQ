/**
 * Khóa ký JWT/QR lấy từ biến môi trường, đọc LƯỜI tại nơi dùng (sau khi ConfigModule đã nạp .env).
 * Không có giá trị dự phòng: trước đây hằng số ở `auth.constants` được tính lúc import (trước khi nạp .env) nên
 * hệ thống ký/kiểm token bằng khóa công khai trong repo dù .env có JWT_SECRET mạnh (BUG-025).
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'test') return 'test-only-jwt-secret-not-for-runtime';
  throw new Error(
    'Thiếu biến môi trường JWT_SECRET: từ chối khởi động để không dùng khóa mặc định.',
  );
}
