# KIẾN TRÚC HỆ THỐNG SURPLUSIQ (VỪA ĐỦ)

## 1. Cấu Trúc Monorepo Chuẩn Hóa
- **`packages/core`**: Logic dự báo (`ForecastingEngine`), định giá động (`DynamicPricingEngine`), sinh mã QR token an toàn (`QrTokenEngine`). Viết bằng TypeScript thuần, không phụ thuộc framework, được import trực tiếp vào cả Backend và Simulation.
- **`apps/backend`**: NestJS REST API, TypeORM kết nối PostgreSQL + PostGIS, BullMQ + Redis, chống bán vượt tồn kho bằng cơ chế Lock `pessimistic_write` (`SELECT ... FOR UPDATE`).
- **`apps/web`**: Giao diện Quản trị tiệm & ESG viết bằng React + Vite, có cơ chế tua nhanh thời gian (Time Machine simulation) phục vụ demo và theo dõi hao hụt thực phẩm.
- **`apps/android`**: Ứng dụng di động Kotlin + Jetpack Compose cho người mua (Chế độ Cứu Món / SaveBite) và chủ tiệm quét mã nhận hàng.
- **`apps/simulation`**: Bộ benchmark mô phỏng 50-100 cửa hàng ảo trong 30 ngày so sánh 4 chế độ A, B, C, D.
- **`docker/`**: `docker-compose.yml` chứa PostgreSQL (PostGIS 16) và Redis 7 Alpine có healthcheck và data persistence volume.

---

## 2. Luồng Xử Lý Chống Bán Vượt Tồn Kho (Overselling Prevention)
Khi nhiều người mua cùng ấn đặt 1 suất bánh còn lại duy nhất lúc 20:59:
1. `OrdersService.createOrder` mở một Database Transaction.
2. Thực thi `setLock('pessimistic_write')` trên hàng `Offer` trong bảng `offers`.
3. Kiểm tra `remainingQuantity >= requestedQuantity`. Nếu không đủ -> Ngay lập tức Rollback và trả về lỗi `400 Bad Request`.
4. Nếu đủ: trừ số lượng tồn, sinh token QR bằng HMAC-SHA256, ghi vào bảng `orders`, và Commit Transaction.

---

## 3. Lệnh Khởi Chạy Nhanh Cho Dự Án

### Hạ tầng (Docker Postgres + Redis)
```powershell
npm run infra:up    # Bật PostgreSQL PostGIS và Redis
npm run infra:logs  # Xem logs container
npm run infra:down  # Tắt hạ tầng
```

### Chạy Dashboard Web (React)
```powershell
npm run dev:web
```

### Chạy Backend (NestJS)
```powershell
npm run dev:backend
```

### Chạy Thí Nghiệm Mô Phỏng 4 Chế Độ
```powershell
npm run dev:simulation
```
