# 04 — ỨNG DỤNG ANDROID KHÁCH HÀNG (`apps/android`)

> **Vị trí**: `apps/android` (Kotlin, Jetpack Compose, Material 3, Clean Architecture + MVVM, Retrofit 2, Room DB, Coroutines/Flow).  
> **Người dùng**: Khách hàng mua suất bánh cứu món (BUYER) — bao phủ 94 Use Cases R1-001..R1-094.  
> **Quy chuẩn**: Tuân thủ [rule.md](../../rule.md) — nhánh `feature/app-<ten>`, commit `feat(app): ...`, chuẩn hóa Kotlin style.

---

## 1. Kiến trúc ứng dụng Android (Clean Architecture + MVI/MVVM)

```mermaid
flowchart TD
    subgraph UI [Tầng Giao Diện (Jetpack Compose)]
        AuthScreen[Màn hình Đăng ký / Đăng nhập / OTP]
        DealScreen[Màn hình Khám phá Deal (Bản đồ / Danh sách)]
        HoldTimerScreen[Màn hình Đếm ngược Giữ suất 10p]
        PaymentScreen[Màn hình Thanh toán VietQR Mô phỏng]
        PickupScreen[Màn hình Vé nhận hàng QR Offline + PIN 6 số]
        ComplaintScreen[Màn hình Khiếu nại 24h kèm 3 ảnh]
        AiChatScreen[Màn hình Trợ lý Cứu Món AI]
    end

    subgraph ViewModel [Tầng ViewModel & StateFlow]
        DealsVM[DealsViewModel]
        OrderVM[OrderCheckoutViewModel]
        PickupVM[PickupPassViewModel]
        AiVM[SaveBiteAiViewModel]
    end

    subgraph Domain [Tầng Nghiệp Vụ (Use Cases)]
        GetDealsUC[GetNearbyDealsUseCase (PostGIS Radius)]
        HoldOfferUC[HoldOfferUseCase (Idempotency Key)]
        VerifyLocalTokenUC[VerifyLocalPickupTokenUseCase]
        SubmitComplaintUC[SubmitComplaintUseCase]
    end

    subgraph Data [Tầng Dữ Liệu & Bộ Nhớ Cục Bộ]
        Repo[OrderRepository / DealRepository]
        RemoteAPI[Retrofit API Client (apps/backend)]
        LocalDB[Room Database: Cache Deals, Offline QR Pass, Consents]
    end

    UI --> ViewModel
    ViewModel --> Domain
    Domain --> Repo
    Repo --> RemoteAPI
    Repo --> LocalDB
```

---

## 2. Cấu trúc thư mục mã nguồn Android

```text
apps/android/app/src/main/java/com/surplusiq/app/
├── SurplusIQApp.kt               # Application class
├── MainActivity.kt               # Single Activity điều hướng Compose Navigation
├── di/                           # Dependency Injection (Hilt / Manual DI)
├── data/
│   ├── api/                      # Retrofit Interfaces & DTOs
│   ├── local/
│   │   ├── AppDatabase.kt        # Room DB
│   │   ├── dao/                  # OrderDao, DealDao, ConsentDao
│   │   └── entity/               # ActiveOrderEntity, CachedDealEntity
│   └── repository/               # Repositories Implementation
├── domain/
│   ├── model/                    # Domain Models (Deal, Order, UserProfile)
│   └── usecase/                  # Use Cases độc lập
└── ui/
    ├── navigation/               # NavHost, Screen Routes, BottomBar
    ├── theme/                    # Color (Emerald/Amber/Slate), Typography, Shape
    ├── components/               # DealCard, CountdownTimer, AllergenTag, EmptyState
    └── screens/
        ├── auth/                 # LoginScreen, RegisterScreen, OtpScreen
        ├── discovery/            # DealListScreen, DealMapScreen, DealDetailScreen
        ├── checkout/             # OrderHoldScreen, VietQrPaymentScreen
        ├── pickup/               # QrPickupPassScreen (Độ sáng cực đại + Mã 6 số)
        ├── postpurchase/         # ComplaintScreen, ReviewScreen, ImpactStatsScreen
        └── ai/                   # SaveBiteAssistantScreen
```

---

## 3. Đặc tả chi tiết các luồng nghiệp vụ khách hàng

### 3.1. Luồng Khám phá Deal theo Vị trí (R1-020..R1-039)
- **Truy vấn Bán kính PostGIS (R1-020)**:
  - Tự động lấy tọa độ GPS; nếu khách từ chối quyền vị trí, cho phép nhập địa chỉ ghim tay (BR-004).
  - Thanh chọn bán kính: 1km, 3km, 5km, 10km.
  - Chuyển đổi giữa chế độ **Danh sách phân trang** (20 deal/trang theo BR-009) và **Bản đồ trực quan** (Maps Compose).
- **Thẻ Deal Minh Bạch & Cảnh Báo Dị Ứng (R1-026)**:
  - Hiển thị giá gốc gạch ngang và giá bán hiện tại (Mức giảm từ 40% đến 60%).
  - Số suất còn lại khả dụng (đã trừ số lượng các đơn đang giữ suất).
  - Đồng hồ đếm ngược đến khung giờ nhận hàng của quán.
  - **Huy hiệu Cảnh báo Dị ứng**: Tự động so sánh thành phần quán khai báo với hồ sơ dị ứng khách đã lưu (R1-016), hiện tag đỏ nổi bật nếu trùng (ví dụ: *Có chứa Đậu phộng / Gluten*).

### 3.2. Luồng Giữ suất & Thanh toán trong 10 Phút (R1-040..R1-056)
- **Giữ Suất Mua Hàng (R1-040)**:
  - Khách chọn số lượng (tối đa 5 suất/đơn theo 3.2.1) $\to$ Nhấn "Cứu món này".
  - App tự sinh `Idempotency-Key` (UUID) gửi kèm request `POST /api/v1/orders`.
  - Màn hình chuyển sang trạng thái **Đếm ngược 10 phút giữ suất** (BR-017).
  - **Khóa Giá Chốt**: Giá đơn hàng được khóa cố định theo giá tại thời điểm giữ suất, tuyệt đối không bị ảnh hưởng nếu quán đổi giá sau đó (BR-016).
- **Thanh Toán VietQR Mô Phỏng (R1-041)**:
  - Hiển thị mã VietQR kèm số tiền chính xác và cú pháp chuyển khoản `SUQ<ORDER_ID>`.
  - Nút "Mở App Ngân Hàng" hoặc "Xác nhận đã chuyển khoản" (trong môi trường dev: gọi endpoint giả lập xác nhận).
- **Xử lý Ngoại lệ Thanh toán**:
  - *Thoát app giữa chừng (R1-055)*: Khi mở lại, app hiển thị banner nổi bật đơn đang giữ suất kèm đồng hồ thời gian còn lại để khách tiếp tục thanh toán.
  - *Thanh toán đến muộn (R1-047)*: Nếu tiền vào sau khi đã hết 10 phút giữ suất, app hiển thị thông báo "Đơn đã hết hạn giữ. Tiền đã được hoàn 100% tự động về tài khoản của bạn".
  - *Hủy đơn trước 60 phút (R1-043)*: Cho phép hủy đơn và nhận hoàn tiền 100% nếu thời gian còn $\ge 60$ phút trước khung nhận (BR-018).

### 3.3. Vé Nhận Hàng An Toàn (Pickup Pass) — R1-057..R1-060
- **Tối ưu Quét Mã Tại Quầy**:
  - Khi mở màn hình vé nhận hàng: Tự động kích hoạt **độ sáng màn hình tối đa (Max Brightness)** và giữ màn hình luôn sáng (`FLAG_KEEP_SCREEN_ON`).
  - Hiển thị mã QR chứa Token HMAC-SHA256 (được lưu offline trong Room DB đề phòng mất sóng tại tiệm).
  - Hiển thị to rõ ràng **Mã dự phòng 6 chữ số** (ví dụ: `7K9X2B`) bên dưới mã QR để nhân viên quầy nhập tay khi cần.
- **Nút "Tôi Sắp Đến" (R1-060)**:
  - Cho phép khách bấm trước khi đến tiệm (chỉ bấm được 1 lần duy nhất trong khung nhận theo BR-025).
  - Gửi tín hiệu thông báo về Web của tiệm bánh để chuẩn bị sẵn túi bánh.
- **Phản hồi Tức thời**:
  - Khi tiệm bánh quét mã thành công, màn hình app lập tức rung phản hồi (Haptic feedback), chuyển sang trạng thái "ĐÃ NHẬN HÀNG THÀNH CÔNG" và hiển thị nút gửi đánh giá.

### 3.4. Hậu Mãi, Khiếu Nại & Đo Lường Tác Động (R1-061..R1-081)
- **Gửi Khiếu Nại Trong 24 Giờ (R1-061)**:
  - Khách chỉ được khiếu nại trong vòng 24h sau khi nhận hàng (BR-026).
  - Chọn danh mục lý do (Hàng ôi thiu, Không đúng loại, Thiếu trọng lượng).
  - Chụp tối đa 3 ảnh làm bằng chứng thực tế.
  - Theo dõi tiến trình: Chờ tiệm phản hồi (tối đa 48h) $\to$ Hoàn tiền tự động nếu quá hạn (BR-071).
- **Bảng Thành Tích Tác Động Cá Nhân (R1-076)**:
  - Hiển thị số liệu thực tế đã cứu được (chỉ tính các đơn `PICKED_UP` theo BR-033):
    * Tổng số tiền đã tiết kiệm được so với giá gốc.
    * Tổng số kg thực phẩm đã cứu khỏi bị tiêu hủy (chỉ tính món có khai báo trọng lượng).
    * Lượng phát thải CO2e tương đương giảm thiểu được.

### 3.5. Trợ Lý AI "Cứu Món" Thông Minh (R1-082..R1-094)
- **Hạn mức vận hành**: 30 lượt hỏi/ngày và tối đa 10 lượt soạn khiếu nại/ngày (8.2 GOI-KH).
- **Tìm deal tự nhiên**: Chuyển câu gõ tự nhiên thành bộ lọc có cấu trúc, hiển thị bộ lọc đã hiểu để khách có thể bấm sửa tay nếu muốn (BR-036).
- **Hỏi đáp an toàn thực phẩm**: AI chỉ trích xuất từ dữ liệu thành phần tiệm đã khai báo; nếu tiệm chưa khai báo, AI trả lời "Chưa có thông tin" kèm nút liên hệ tiệm, tuyệt đối không tự bịa thông tin an toàn (BR-038).
- **Nút chuyển tiếp người hỗ trợ (R1-090)**: Chuyển sang luồng hỗ trợ người thật khi có tranh chấp tiền bạc hoặc an toàn thực phẩm.
