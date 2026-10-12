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
- **Gửi Khiếu Nại Trong 24 Giờ (R1-061..R1-063, R1-067..R1-068)**:
  - Khách chỉ được khiếu nại trong vòng 24h sau khi nhận hàng (BR-026).
  - Chọn danh mục lý do (Hàng ôi thiu, Không đúng loại, Thiếu trọng lượng, Khác) kèm mô tả 10-500 ký tự.
  - Chụp tối đa 3 ảnh làm bằng chứng thực tế (mỗi ảnh tối đa 5 MB).
  - Bổ sung bằng chứng: Cho phép bổ sung tối đa 2 lần khi trạng thái còn đang Chờ cửa hàng (R1-068).
  - Theo dõi tiến trình: Chờ tiệm phản hồi (tối đa 48h) $\to$ Hoàn tiền tự động nếu tiệm quá hạn (BR-071, R2-060).
  - Cho phép rút khiếu nại (R1-063) khi tiệm chưa xử lý; xem lịch sử khiếu nại (R1-067).
- **Đánh Giá & Báo Cáo Vi Phạm (R1-064..R1-066, R1-069)**:
  - Chấm 1-5 sao và nhận xét cho đơn Đã nhận (R1-064); cho phép sửa trong 24h (R1-065); ẩn đánh giá công khai (R1-066).
  - Báo cáo vi phạm (R1-069): Báo cáo tiệm hoặc đánh giá sai sự thật.
- **Hỗ Trợ Người Thật & FAQ (R1-070..R1-072)**:
  - Gửi yêu cầu hỗ trợ nền tảng (tối đa 5 yêu cầu mở đồng thời), trao đổi luồng tin nhắn và tra cứu FAQ hướng dẫn.
- **Bảng Thành Tích Tác Động Cá Nhân & Ví Ưu Đãi (R1-076..R1-081)**:
  - Hiển thị số liệu thực tế đã cứu được (chỉ tính các đơn `PICKED_UP` theo BR-033):
    * Tổng số tiền đã tiết kiệm được so với giá gốc.
    * Tổng số kg thực phẩm đã cứu khỏi bị tiêu hủy (chỉ tính món có khai báo trọng lượng).
    * Huy hiệu sống xanh và chia sẻ ảnh thành tích lên mạng xã hội (không chứa PII).
  - Ví ưu đãi (R1-078..R1-080): Quản lý voucher được tặng, nhận ưu đãi từ chiến dịch quán yêu thích, xem lịch sử tiết kiệm.

### 3.5. Trợ Lý AI "Cứu Món" Thông Minh (R1-082..R1-094)
- **Hạn mức vận hành**: 30 lượt hỏi/ngày và tối đa 10 lượt soạn khiếu nại/ngày (8.2 GOI-KH).
- **Tìm deal tự nhiên (R1-082)**: Chuyển câu gõ tự nhiên ("bánh ngọt dưới 30k gần chỗ làm sau 19h") thành bộ lọc có cấu trúc, hiển thị bộ lọc đã hiểu để khách có thể bấm sửa tay nếu muốn (BR-036).
- **Trò chuyện trợ lý Cứu Món (R1-083)**: Tra cứu deal quanh mình, cách nhận hàng, trạng thái đơn hiện tại (chỉ đọc dữ liệu của chính khách).
- **Gợi ý deal cá nhân hóa có lý do (R1-084, R1-085)**: Dựa trên lịch sử mua, tiệm yêu thích; kèm giải thích ngắn (AI chỉ viết câu giải thích từ điểm số thuật toán).
- **So sánh deal & Hỏi đáp an toàn thực phẩm (R1-086, R1-087)**:
  * So sánh 2-3 deal cạnh nhau: Đối chiếu giá, giờ nhận, khoảng cách.
  * AI chỉ trích xuất từ dữ liệu thành phần tiệm đã khai báo; nếu tiệm chưa khai báo, AI trả lời "Chưa có thông tin" kèm nút liên hệ tiệm, tuyệt đối không tự bịa thông tin an toàn (BR-038).
- **Soạn khiếu nại từ ảnh (R1-089)**: Khách chụp ảnh món hỏng $\to$ AI gợi ý loại khiếu nại và bản nháp mô tả để khách kiểm tra trước khi bấm gửi.
- **Nút chuyển tiếp người hỗ trợ (R1-090)**: Chuyển sang luồng hỗ trợ người thật kèm tóm tắt hội thoại khi có tranh chấp tiền bạc hoặc an toàn thực phẩm.
- **Quản lý hội thoại & Đánh giá AI (R1-091..R1-094)**: Xem và xóa lịch sử chat AI (lưu tối đa 90 ngày); nút bấm hữu ích / không hữu ích sau mỗi phản hồi; tóm tắt đánh giá quán khi có ≥ 10 đánh giá.

---

## 4. Ma trận 94 Use Cases trên App Khách hàng (R1-001 đến R1-094)

| Nhóm tính năng | Mã Use Case | Tên tính năng | Phân kỳ | Màn hình Compose tương ứng |
|---|---|---|---|---|
| **Tài khoản & Hồ sơ** | `R1-001` | Đăng ký tài khoản khách hàng | P0 | `RegisterScreen` |
| | `R1-002` | Xác minh tài khoản bằng OTP 6 số | P0 | `OtpVerificationScreen` |
| | `R1-003` | Đăng nhập tài khoản | P0 | `LoginScreen` |
| | `R1-004` | Đăng xuất tài khoản | P0 | `ProfileScreen` (Settings) |
| | `R1-005` | Xem hồ sơ cá nhân | P1 | `ProfileScreen` |
| | `R1-006` | Chỉnh sửa hồ sơ cá nhân | P1 | `EditProfileScreen` |
| | `R1-007` | Đổi mật khẩu | P1 | `ChangePasswordScreen` |
| | `R1-008` | Đặt lại mật khẩu khi quên | P1 | `ForgotPasswordScreen` |
| | `R1-009` | Cấp quyền vị trí & chọn bán kính tìm deal | P0 | `LocationPermissionDialog` |
| | `R1-010` | Bật/tắt nhóm thông báo | P1 | `NotificationSettingsScreen` |
| | `R1-011` | Yêu cầu xóa tài khoản (chờ 7 ngày) | P2 | `DeleteAccountScreen` |
| | `R1-012` | Quản lý đồng ý điều khoản & vị trí | P2 | `ConsentsManagementScreen` |
| | `R1-013` | Bật/tắt xác thực hai bước (2FA) | P1 | `TwoFactorAuthScreen` |
| | `R1-014` | Xem & đăng xuất thiết bị từ xa | P1 | `ActiveSessionsScreen` |
| | `R1-015` | Lưu địa điểm quen thuộc (max 5 địa điểm) | P1 | `SavedPlacesScreen` |
| | `R1-016` | Thiết lập hồ sơ ăn uống & dị ứng | P2 | `DietaryProfileScreen` |
| | `R1-017` | Quản lý đồng ý ưu đãi & cá nhân hóa | P2 | `PrivacyConsentsScreen` |
| | `R1-018` | Xuất bản sao dữ liệu cá nhân (JSON/CSV) | P2 | `DataExportScreen` |
| | `R1-019` | Hủy yêu cầu xóa tài khoản trong 7 ngày | P2 | `CancelDeleteAccountScreen` |
| **Khám phá Deal** | `R1-020` | Xem danh sách deal gần (PostGIS) | P0 | `DealListScreen` |
| | `R1-021` | Xem bản đồ deal (Maps Compose) | P1 | `DealMapScreen` |
| | `R1-022` | Tìm kiếm deal theo từ khóa tiếng Việt | P1 | `DealSearchScreen` |
| | `R1-023` | Lọc deal (giá, loại, % giảm, khung giờ) | P0 | `FilterBottomSheet` |
| | `R1-024` | Sắp xếp deal (khoảng cách, giá, giảm) | P0 | `SortBottomSheet` |
| | `R1-025` | Cuộn tải thêm phân trang cursor (20/trang) | P0 | `DealListScreen` |
| | `R1-026` | Xem chi tiết deal | P0 | `DealDetailScreen` |
| | `R1-027` | Xem chi tiết cửa hàng | P0 | `StoreDetailScreen` |
| | `R1-028` | Thêm cửa hàng yêu thích (max 50) | P1 | `StoreDetailScreen` |
| | `R1-029` | Bỏ cửa hàng yêu thích | P1 | `StoreDetailScreen` / `FavoritesScreen` |
| | `R1-030` | Đăng ký nhận thông báo deal quanh khu | P2 | `AreaAlertBottomSheet` |
| | `R1-031` | Tạo cảnh báo deal theo điều kiện (max 10) | P2 | `CreateDealAlertScreen` |
| | `R1-032` | Xem, sửa, xóa cảnh báo deal | P2 | `DealAlertsListScreen` |
| | `R1-033` | Lưu bộ lọc tìm kiếm thường dùng (max 10) | P2 | `SavedFiltersBottomSheet` |
| | `R1-034` | Lưu deal để xem sau (max 50) | P2 | `SavedDealsScreen` |
| | `R1-035` | Xem lịch sử 20 deal đã xem gần đây (30d) | P2 | `RecentlyViewedScreen` |
| | `R1-036` | So sánh các deal cạnh nhau (2-3 deal) | P2 | `DealComparisonScreen` |
| | `R1-037` | Chia sẻ deal qua liên kết | P2 | `ShareDealAction` |
| | `R1-038` | Chỉ đường đến tiệm qua bản đồ ngoài | P1 | `DirectionsAction` |
| | `R1-039` | Xem deal tại vị trí khác | P2 | `ChangeLocationScreen` |
| **Đặt hàng & Thanh toán**| `R1-040` | Chọn số lượng & giữ suất 10 phút | P0 | `CheckoutHoldScreen` |
| | `R1-041` | Thanh toán đơn bằng VietQR / Cổng giả lập | P0 | `VietQrPaymentScreen` |
| | `R1-042` | Tự động nhả suất khi hết 10 phút (BullMQ) | P0 | `OrderExpiredDialog` |
| | `R1-043` | Hủy đơn đã thanh toán trước 60 phút | P0 | `OrderDetailScreen` |
| | `R1-044` | Xem danh sách đơn của tôi | P0 | `MyOrdersScreen` |
| | `R1-045` | Lọc và tìm đơn hàng | P1 | `MyOrdersScreen` (Filters) |
| | `R1-046` | Xem chi tiết đơn hàng | P0 | `OrderDetailScreen` |
| | `R1-047` | Tự hoàn tiền khi thanh toán đến muộn | P0 | `PaymentLateRefundDialog` |
| | `R1-048` | Xem trạng thái khóa đặt 7 ngày noshow | P0 | `OrderLockStatusScreen` |
| | `R1-049` | Chọn giờ hẹn nhận trong khung nhận (15p) | P1 | `PickupSlotPicker` |
| | `R1-050` | Gửi ghi chú cho quán khi đặt (max 150 ký tự)| P1 | `CheckoutHoldScreen` |
| | `R1-051` | Đặt lại món đã mua | P1 | `MyOrdersScreen` (Reorder) |
| | `R1-052` | Tạo mã nhận hộ 8 ký tự cho người thân | P2 | `ProxyPickupCodeDialog` |
| | `R1-053` | Áp dụng ưu đãi vào đơn khi đặt | P2 | `PromoCodeBottomSheet` |
| | `R1-054` | Xem và tải biên nhận đơn PDF | P1 | `ReceiptViewerScreen` |
| | `R1-055` | Tiếp tục thanh toán đơn đang giữ | P0 | `ResumeCheckoutBanner` |
| | `R1-056` | Kiểm tra lại trạng thái thanh toán cổng | P0 | `PaymentRecheckAction` |
| **Nhận hàng** | `R1-057` | Xem mã QR nhận hàng & PIN dự phòng 6 số | P0 | `QrPickupPassScreen` |
| | `R1-058` | Nhận hàng (chủ quét QR) | P0 | `OrderClaimedSuccessScreen` |
| | `R1-059` | Đơn quá hạn không nhận (noshow tự động) | P0 | `OrderNoShowDialog` |
| | `R1-060` | Báo cho cửa hàng là sắp đến (1 lần) | P1 | `ArrivingButton` |
| **Hậu mãi & Hỗ trợ** | `R1-061` | Gửi khiếu nại chất lượng (24h, max 3 ảnh) | P1 | `CreateComplaintScreen` |
| | `R1-062` | Xem trạng thái & phản hồi khiếu nại (48h) | P1 | `ComplaintDetailScreen` |
| | `R1-063` | Rút khiếu nại | P1 | `ComplaintDetailScreen` |
| | `R1-064` | Gửi đánh giá cửa hàng (1-5 sao) | P1 | `CreateReviewScreen` |
| | `R1-065` | Sửa đánh giá trong vòng 24 giờ | P1 | `EditReviewScreen` |
| | `R1-066` | Ẩn đánh giá của tôi | P2 | `ReviewDetailScreen` |
| | `R1-067` | Xem lịch sử các khiếu nại | P1 | `ComplaintsListScreen` |
| | `R1-068` | Bổ sung bằng chứng khiếu nại (max 2 lần) | P1 | `AddEvidenceScreen` |
| | `R1-069` | Báo cáo cửa hàng hoặc nội dung vi phạm | P1 | `ReportViolationScreen` |
| | `R1-070` | Gửi yêu cầu hỗ trợ cho người thật (max 5) | P1 | `CreateSupportTicketScreen` |
| | `R1-071` | Xem trạng thái & trao đổi trong luồng hỗ trợ | P1 | `SupportChatScreen` |
| | `R1-072` | Xem trung tâm trợ giúp & FAQ | P1 | `HelpCenterScreen` |
| **Thông báo & Tác động**| `R1-073` | Xem danh sách thông báo (lưu 90 ngày) | P1 | `NotificationsScreen` |
| | `R1-074` | Đánh dấu đã đọc thông báo | P1 | `NotificationsScreen` |
| | `R1-075` | Nhắc giờ nhận hàng trước 30 phút (hệ thống)| P1 | `PushNotificationHandler` |
| | `R1-076` | Xem thống kê tác động cá nhân (kg, CO2, tiền)| P2 | `ImpactDashboardScreen` |
| | `R1-077` | Xem lịch sử thanh toán & hoàn tiền | P1 | `PaymentTransactionsScreen` |
| **Ví Ưu đãi & Thành tích**| `R1-078` | Xem ví ưu đãi cá nhân | P1 | `PromoWalletScreen` |
| | `R1-079` | Nhận ưu đãi từ cửa hàng | P1 | `ClaimPromoScreen` |
| | `R1-080` | Xem lịch sử dùng ưu đãi | P1 | `PromoHistoryScreen` |
| | `R1-081` | Xem huy hiệu & chia sẻ ảnh thành tích sống xanh | P2 | `GreenBadgesScreen` |
| **Trợ lý AI Cứu Món** | `R1-082` | [AI] Tìm deal bằng câu hỏi tự nhiên | P2 | `AiDealSearchScreen` |
| | `R1-083` | [AI] Trò chuyện với trợ lý Cứu Món | P2 | `SaveBiteChatScreen` |
| | `R1-084` | [AI] Gợi ý deal cá nhân hóa kèm lý do | P2 | `PersonalizedDealsScreen` |
| | `R1-085` | [AI] Xem lý do gợi ý & chỉnh sở thích | P2 | `WhyAmISeeingThisDialog` |
| | `R1-086` | [AI] Tóm tắt & so sánh deal giúp lựa chọn | P2 | `AiDealCompareScreen` |
| | `R1-087` | [AI] Hỏi về thành phần & dị ứng của món | P2 | `AllergenAiQaDialog` |
| | `R1-088` | [AI] Hướng dẫn nhận hàng & theo dõi đơn qua AI | P2 | `SaveBiteChatScreen` |
| | `R1-089` | [AI] Soạn khiếu nại từ ảnh (max 10 lượt/ngày) | P2 | `AiDraftComplaintScreen` |
| | `R1-090` | [AI] Chuyển cuộc trò chuyện cho người hỗ trợ | P2 | `EscalateSupportDialog` |
| | `R1-091` | [AI] Xem & xóa lịch sử chat AI (90 ngày) | P2 | `AiChatHistoryScreen` |
| | `R1-092` | [AI] Đánh giá chất lượng câu trả lời AI | P2 | `AiFeedbackWidget` |
| | `R1-093` | Nhận thông báo deal vào giờ hay mua (thống kê)| P2 | `SmartNotificationJob` |
| | `R1-094` | [AI] Tóm tắt đánh giá của cửa hàng (≥ 10 đánh giá)| P2 | `StoreReviewSummaryCard` |
