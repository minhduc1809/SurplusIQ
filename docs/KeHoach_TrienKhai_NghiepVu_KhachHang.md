# Kế Hoạch Triển Khai Nghiệp Vụ & Màn Hình Khách Hàng (Customer App)

> **Dự án:** SurplusIQ Monorepo  
> **Thời điểm cập nhật:** 20/10/2026  
> **Vai trò phụ trách:** Senior Staff Backend & Android Engineer  
> **Căn cứ tài liệu:** `docs/KhachHang_Nghiep_vu_va_man_hinh_chua_lam.md`, `docs/BRD_Full_SurplusIQ.md`

---

## 1. TỔNG QUAN ĐỐI CHIẾU MÃ NGUỒN (ACTIVE CODEBASE AUDIT)

Qua đối chiếu trực tiếp giữa mã nguồn hoạt động (`apps/backend`, `apps/android`) và bản mô tả bàn giao:

1. **Các điểm đã hoàn thành gần đây:**
   - **Quy tắc mật khẩu (K02, K05, K54):** Commit `055eb4e` & `e92deaf` đã chuẩn hóa mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số (`weakPassword`) trên cả Android ViewModel và Backend DTOs.
   - **Làm mới phiên tự động:** `TokenAuthenticator.kt` tự động làm mới access token 15 phút qua refresh token 30 ngày khi gặp mã 401.

2. **Các điểm Backend đã có sẵn nhưng Android chưa đấu nối (Quick-Win):**
   - **K58 Hồ sơ ăn uống & dị ứng:** API `GET/PUT customer/dietary-profile` sẵn sàng 100%. Android menu tab Tôi đang mở nhầm `PreferencesScreen` (chỉ có tùy chọn giờ/ăn chay, thiếu toàn bộ phần khai báo dị ứng an toàn thực phẩm).
   - **K11 Tìm kiếm:** Backend có `customer/saved-filters`, `customer/ai/search`, `customer/view-history`. Android chỉ có ô tìm kiếm in-memory trên trang chủ.
   - **K12 Bộ lọc & Sắp xếp:** Backend `QueryDealsDto` hỗ trợ đầy đủ `maxPrice`, `minDiscountPercent`, `sortBy`, `radiusKm`. Android thiếu `@Query` param trong Retrofit và thiếu Bottom Sheet lọc chuyên sâu.
   - **K13 Chi tiết deal bổ sung:** Backend có `customer/ai/deals/:id/summary` và `recipe-ideas`. Android chưa hiển thị khối AI và thiếu carousel ảnh.

3. **Các điểm Backend còn thiếu API bắt buộc:**
   - **K15 Đánh giá công khai của cửa hàng:** Chưa có route `GET customer/stores/:id/reviews` kèm thống kê 1–5 sao.
   - **K38 Lịch sử đánh giá của tôi:** Chưa có route `GET customer/reviews`.
   - **Upload Media:** Chưa có API tải ảnh `POST upload/image` (hiện tại khiếu nại K34/K36 và đổi avatar K53 đang yêu cầu dán link URL).
   - **KC03/KC04 Rescue Basket (Giỏ cứu):** Chưa có route thay/bỏ món và tạo đơn cho cả giỏ (`POST customer/baskets/order`).
   - **K51 Lịch sử hội thoại AI:** Chưa có bảng lưu phiên và route lịch sử chat.

---

## 2. KẾ HOẠCH TRIỂN KHAI THEO 4 GIAI ĐOẠN

```
[Phase 1] ───► [Phase 2] ───────────► [Phase 3] ───────► [Phase 4]
An toàn & Cửa   Hậu mãi, Media,       Rescue Basket &    Mở rộng & Tăng
ngõ tìm kiếm    Bản đồ OSM & Socket   Rescue Pool nâng   trưởng (KX01-18)
(P0 - ĐÃ XONG)  (P1 - Đang làm)       cao (P2 - 4 ngày)  (P3 - backlog)
```

---

### GIAI ĐOẠN 1: An Toàn Thực Phẩm & Cửa Ngõ Khám Phá (Ưu tiên P0 - ĐÃ HOÀN THÀNH)

#### Task 1.1: [K58] Màn hình Hồ sơ ăn uống & Dị ứng (Dietary Profile) - [x] ĐÃ HOÀN THÀNH
- **Trạng thái:** Hoàn tất 100%.
- **Chi tiết triển khai:**
  1. Căn chỉnh chuẩn schema DTO `ProfileDtos.kt` khớp với Backend NestJS (`allergens: List<String>`, `excludedItems: List<String>`).
  2. Bổ sung `getDietaryProfile()` và `updateDietaryProfile()` trong `ProfileRepository.kt` và `ProfileRepositoryImpl.kt` (kết nối endpoint thực tế `GET/PUT customer/dietary-profile`, không mock data).
  3. Cập nhật `ProfileViewModel.kt` quản lý state dị ứng và các hàm `loadDietaryProfile()`, `saveDietaryProfile()`.
  4. Tạo màn hình `DietaryProfileScreen.kt` tại `apps/android/app/src/main/java/com/surplusiq/app/ui/screens/profile/DietaryProfileScreen.kt`:
     - Nhóm chip dị ứng: Gluten, Sữa bò, Trứng, Đậu phộng/Hạt, Hải sản, Đậu nành, Khác (nhập tự do).
     - Chế độ ăn uống: Bình thường, Ăn chay (Vegetarian), Thuần chay (Vegan), Halal.
     - Switch đồng ý lưu dữ liệu nhạy cảm kèm cam kết bảo mật.
     - Nút Lưu (gọi API cập nhật thực tế).
  5. Sửa `ProfileScreen.kt` để mục "Hồ sơ ăn uống & dị ứng" mở đúng màn hình `DietaryProfileScreen` thay vì `PreferencesScreen`.
  6. Tích hợp `AppDestination.DietaryProfile` trong `SurplusAppRoot.kt`.

#### Task 1.2: [K11] Màn hình Tìm kiếm chuyên biệt (Search Flow) - [x] ĐÃ HOÀN THÀNH
- **Trạng thái:** Hoàn tất 100%.
- **Chi tiết triển khai:**
  1. Thêm `AppDestination.Search` trong `SurplusAppRoot.kt`.
  2. Tạo `SearchScreen.kt` tại `apps/android/app/src/main/java/com/surplusiq/app/ui/screens/discovery/SearchScreen.kt`:
     - Ô TextField tìm kiếm tự động request focus khi mở (`FocusRequester`).
     - Mục "Tìm kiếm gần đây" (Recent Searches): lưu và đọc qua `SharedPreferences`, có nút xóa từng mục và xóa tất cả.
     - Chip gợi ý các từ khóa hot/phổ biến (Trending Searches).
     - Tích hợp tìm kiếm thông minh bằng ngôn ngữ tự nhiên với SaveBite AI (`POST customer/ai/search` qua `AiApiService`).
     - Thẻ giải thích AI thông minh (`explanation`) với giao diện màu Lilac đặc trưng.
     - Đầy đủ 4 trạng thái UI: Đang tải (Loading), Trống (Empty có gợi ý từ khóa), Lỗi kết nối (Error kèm nút thử lại), Thành công (Success với danh sách `DealCard`).
  3. Đấu nối thanh tìm kiếm tại `DiscoverHomeScreen.kt` để người dùng chạm vào sẽ mở ngay `SearchScreen`.

#### Task 1.3: [K12] Bottom Sheet Bộ lọc & Sắp xếp chuyên sâu - [x] ĐÃ HOÀN THÀNH
- **Trạng thái:** Hoàn tất 100%.
- **Chi tiết triển khai:**
  1. Cập nhật `DiscoveryApiService.kt`: Bổ sung `@Query("minDiscountPercent")` và `@Query("sortBy")` vào hàm `findNearbyDeals`.
  2. Cập nhật `DiscoveryRepository.kt` và `DiscoveryRepositoryImpl.kt` truyền đầy đủ tham số lọc xuống backend.
  3. Cập nhật `DiscoveryViewModel.kt`: bổ sung `minDiscountPercent`, `sortBy` vào `DiscoveryUiState`, các hàm `updateFilterSort()` và `resetFilterSort()`.
  4. Tạo component `FilterSortBottomSheet.kt`:
     - Tiêu chí sắp xếp: Gần nhất (Mặc định), Giá tăng dần (`price_asc`), % Giảm sâu nhất (`discount_desc`), Sắp hết hạn thu gom (`closing_soon`).
     - Mức giảm giá tối thiểu: Tất cả, Từ 20%, Từ 30%, Từ 50%, Giảm sốc từ 70%.
     - Nút "Đặt lại" và "Áp dụng".
  5. Đấu nối nút Filter trên `DiscoverHomeScreen.kt` mở trực tiếp `FilterSortBottomSheet`.

#### Task 1.4: [K13] Hoàn thiện màn Chi tiết Deal - [x] ĐÃ HOÀN THÀNH
- **Trạng thái:** Hoàn tất 100%.
- **Chi tiết triển khai:**
  1. Cảnh báo dị ứng cá nhân hóa: Tự động so sánh danh sách dị ứng của deal với hồ sơ ăn uống của người dùng (`userAllergens`). Nếu phát hiện dị ứng trùng lặp, hiển thị ngay Banner cảnh báo đỏ nổi bật cảnh báo người dùng trước khi đặt giữ.
  2. Nút Chia sẻ deal: Thêm icon Share trên thanh hành động hero header; khi click sẽ kích hoạt Android Native Share Sheet (`Intent.ACTION_SEND`) chia sẻ thông tin deal và lời kêu gọi giải cứu thức ăn.
  3. Khối "Mẹo bảo quản & Công thức từ AI": Tích hợp hướng dẫn làm nóng và mẹo bảo quản theo từng danh mục món ăn (Bánh, Món mặn, Nông sản...), lời khuyên an toàn thực phẩm và thông điệp giảm phát thải CO2 của SurplusIQ.

---

### GIAI ĐOẠN 2: Hoàn Thiện Backend Core API & Hậu Mãi Đánh Giá (Ưu tiên P1) - [x] ĐÃ HOÀN THÀNH 100%

#### Task 2.1: [Backend + Android] Đánh giá công khai của quán (K15) & Đánh giá của tôi (K38) - [x] ĐÃ HOÀN THÀNH
- **Backend:**
  - Viết `GET customer/stores/:id/reviews` trong `CustomerStoresController` (kèm thống kê sao trung bình, phân bổ 1..5 sao và phân trang).
  - Viết `GET customer/reviews` trong `CustomerInteractionsController` (lấy danh sách đánh giá của user, kèm cờ `canEdit: boolean` trong 24h và phản hồi của quán).
- **Android:**
  - Tạo `StoreReviewsScreen.kt` (K15).
  - Hoàn thiện `MyReviewsScreen.kt` (K38): Hỗ trợ sửa và ẩn đánh giá.

#### Task 2.2: [Backend + Android] Upload Media & Chỉnh sửa hồ sơ (K53, K34/K36) - [x] ĐÃ HOÀN THÀNH
- **Backend:**
  - Triển khai `POST upload/image` nhận multipart/form-data, validate mime-type và dung lượng <= 5MB.
- **Android:**
  - Tạo `EditProfileScreen.kt` (K53): Đổi avatar, cắt tròn, cập nhật họ tên.
  - Tích hợp bộ chọn ảnh vào `CreateComplaintScreen.kt` và `ComplaintDetailScreen.kt`.

#### Task 2.3: [K57] Màn hình Cài đặt thông báo độc lập - [x] ĐÃ HOÀN THÀNH
- **Backend:** Thêm API `GET /customer/notification-settings` và `PUT /customer/notification-settings`.
- **Android:** Tách thành màn `NotificationSettingsScreen.kt` riêng biệt kết nối trực tiếp `NotificationsViewModel`.

#### Task 2.4: [K08, K10, Backend, Web] Chuyển Đổi Bản Đồ Mở (OpenStreetMap) & Realtime WebSocket Engine - [x] ĐÃ HOÀN THÀNH
- **Backend:** Gắn WebSocket Server (`ws`) tại `/ws` với các sự kiện: `deal.stock_updated`, `deal.flash_rescue`, `order.hold_reserved`.
- **Android Client:** Tích hợp `OsmDroid` (`org.osmdroid:osmdroid-android`), chuyển đổi hoàn toàn `PinLocationScreen.kt` (K08) và `DealMapScreen.kt` (K10), loại bỏ rào cản Google Maps API key; kết nối `RealtimeWebSocketClient` cập nhật tức thời số lượng suất trên bản đồ.
- **Web Dashboard:** Tích hợp `StoreMapLeaflet.tsx` trên nền OpenStreetMap và lắng nghe WebSocket realtime.

---

### GIAI ĐOẠN 3: Nâng Cấp Rescue Basket, Pool & Trợ Lý AI (Ưu tiên P2) - [x] ĐÃ HOÀN THÀNH 100%

#### Task 3.1: [KC03, KC04] Rescue Basket (Giỏ Cứu) - [x] ĐÃ HOÀN THÀNH
- **Backend:** Thêm endpoint `POST customer/baskets/substitutes` (gợi ý món thay thế cùng quán) và `POST customer/baskets/checkout` (đặt giữ nguyên tử 10 phút cả giỏ).
- **Android:** Dựng `BasketDetailScreen.kt` (thay món, bỏ món) và `BasketCheckoutScreen.kt` (kiểm tra trước khi đặt, đếm ngược 10 phút, đặt giữ nguyên tử).

#### Task 3.2: [KC08] Màn hình "Nhu cầu của tôi" (Rescue Pool) - [x] ĐÃ HOÀN THÀNH
- **Android:** Dựng `MyRescueDemandsScreen.kt` 2 tab: "Nhu cầu đang chờ gom" & "Đơn hàng từ đợt gom", cho phép chỉnh sửa ngân sách/khung giờ, rút nhu cầu (kèm chọn lý do) và chuyển trực tiếp sang Chi tiết đơn hàng.

#### Task 3.3: [K51] Quản lý Lịch sử hội thoại AI & Ghi nhớ ngữ cảnh (R1-091) - [x] ĐÃ HOÀN THÀNH
- **Backend:** CRUD phiên hội thoại (`GET/DELETE customer/ai/conversations`, `GET customer/ai/conversations/:id/messages`, `GET/PUT customer/ai/memory-setting`), tích hợp ngữ cảnh 5 tin nhắn vào prompt Gemini.
- **Android:** Dựng `AiChatHistoryScreen.kt` (xem danh sách, chuyển phiên, xóa từng phiên, xóa tất cả, switch bật/tắt ghi nhớ ngữ cảnh), nâng cấp `SaveBiteAiSheet.kt` với icon Lịch sử chat và phiên mới.

---

### GIAI ĐOẠN 4: Tính Năng Mở Rộng & Tăng Trưởng (Ưu tiên P3 - Backlog)

- **KX01:** Tài khoản nhận hoàn tiền và theo dõi hoàn tiền VietQR.
- **KX02:** Đính kèm biên lai chuyển khoản khi đối soát tự động chưa nhận được webhook.
- **KX04:** Xin gia hạn giờ nhận hàng (+15 phút, +30 phút qua `PATCH customer/orders/:id/pickup-slot`).
- **KX06:** Đăng ký nhận tin khi deal hết hàng ("Báo tôi khi có lại").
- **KX07:** Lịch sử giá và theo dõi biến động giá.
- **KX09:** Hành trình khách hàng mới (Onboarding 4 slide vuốt ngang).

---

## 3. QUY CHUẨN KỸ THUẬT & NGHIỆM THU (DEFINITION OF DONE)

1. **Tuyệt đối không dùng dữ liệu giả (No Mock Data):** Mọi trạng thái lỗi phải hiển thị nguyên bản lỗi từ Backend, kèm nút "Thử lại".
2. **4 trạng thái giao diện bắt buộc:** Mọi màn hình phải có đầy đủ: `Loading` (Skeleton/Progress), `Error` (kèm Retry), `Empty` (kèm CTA), `Success`.
3. **Màu sắc & Token UI:** Sử dụng token từ `com.surplusiq.app.ui.theme.Color.kt` (màu thương hiệu cam `#FF8A3D`), không hardcode mã hex.
4. **Idempotency:** Các tác vụ tạo đơn, thanh toán, thay đổi trạng thái bắt buộc gửi header `Idempotency-Key`.
5. **Kiểm thử tự động:** Viết Unit Test cho ViewModel (StateFlow + Turbine) và NestJS Controller/Service (`*.spec.ts`).
