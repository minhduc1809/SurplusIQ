# Khách hàng: nghiệp vụ và màn hình chưa làm (tài liệu bàn giao)

> Cập nhật 20/10/2026. App: `apps/android` (Kotlin, Jetpack Compose, Hilt). Backend: `apps/backend` (NestJS). Nguồn danh sách màn: `doc/SurplusIQ_Thong_ke_man_hinh_theo_vai_tro.md` (mục 3.1, 94 màn). Mô tả thiết kế ở mục 4 là **nguyên văn từ tài liệu gốc**.

> **Độ tin cậy của bảng trạng thái:** lập bằng cách đọc code, danh sách API app đang gọi và route backend `customer/*`. Chưa kiểm thử runtime từng màn. Những chỗ ghi "kiểm tra" nghĩa là chưa xác minh được hết yêu cầu của tài liệu. Chỉ có Trang chủ, tab Deal, tab Tôi, chi tiết deal đã được chạy và xem trên emulator.

## 1. Tóm tắt

| Trạng thái | Số màn |
|---|---|
| Đã có | 49 |
| Một phần | 17 |
| Chưa có | 28 |
| Tổng | 94 |

Nhóm việc nên làm trước (theo rủi ro và giá trị):

1. **K58 Hồ sơ ăn uống và dị ứng**: menu đang mở nhầm màn; liên quan an toàn thực phẩm; backend đã sẵn.
2. **K12 Bộ lọc, K11 Tìm kiếm**: là cửa vào chính của người dùng; backend phần lớn sẵn.
3. **K13 Chi tiết deal** (chia sẻ, ảnh, AI), **K15 đánh giá công khai** (cần BE).
4. **K37/K38 đánh giá của tôi** (cần BE thêm danh sách), **K53 chỉnh sửa hồ sơ**, **K57 cài đặt thông báo + FCM**.
5. **KC03/KC04 giỏ cứu** (cần BE), **KC08, KC15**.
6. Nhóm "Đề xuất thêm" (KX01–KX18): làm sau cùng, hầu hết chưa có backend.

## 2. Quy ước kỹ thuật cần biết

- **Chạy thử:** docker (`surplusiq_postgres`, `surplusiq_redis`) → `npm run dev:backend` ở thư mục gốc (cổng 4000) → mở `apps/android` bằng Android Studio, chạy trên emulator (URL mặc định `http://10.0.2.2:4000/`). Tài khoản seed: khách `customer@surplusiq.vn` / `Surplus@1`.
- **Cấu trúc:** `ui/screens/<nhóm>` (màn hình), `ui/viewmodel` (Hilt ViewModel + StateFlow), `domain/repository` (interface), `data/repository` (cài đặt), `data/remote/api` + `dto` (Retrofit/Gson), `di` (Hilt).
- **Điều hướng:** không dùng Navigation Compose; dùng `sealed class AppDestination` trong `ui/navigation/SurplusAppRoot.kt`. Thêm màn mới = thêm một `object`/`data class` vào `AppDestination` rồi thêm nhánh `when` tương ứng.
- **Giao diện:** chỉ Light Theme. Màu ở `ui/theme/Color.kt` (tên biến cũ `ForestGreen*`/`SkyBlue*` thực chất đã là màu cam `#FF8A3D`; **không hardcode màu trong màn hình**). Thanh điều hướng đáy dùng `ui/components/BottomBar.kt` (`SqBottomBar`), nút giữa là "Rổ cứu".
- **Quy tắc "không dữ liệu giả":** mọi lỗi API phải hiển thị lỗi thật, không thay bằng dữ liệu mẫu (xem `AuthRepositoryImpl`, `OrderRepositoryImpl` ghi rõ "rule 0.1"). Không bịa điểm đánh giá, dị ứng, khoảng cách.
- **Phiên đăng nhập:** access token chỉ sống 15 phút; `data/remote/TokenAuthenticator.kt` tự đổi refresh token khi gặp 401.
- **Tiếng Việt:** chuỗi hiển thị dùng tiếng Việt; tên thương hiệu giữ nguyên (SurplusIQ, Rescue Basket...). Đã Việt hóa các chuỗi tiếng Anh phát hiện được bằng tìm kiếm tự động; vẫn nên rà bằng mắt khi chạy từng màn.
- **Mỗi API mới:** khai báo ở `data/remote/api/*ApiService.kt`, DTO ở `dto/`, repository tương ứng, rồi ViewModel. Hàm có tác dụng tạo/ghi nên gửi `Idempotency-Key` (xem `RescueTimeline` bên app merchant làm mẫu).

## 3. Bảng trạng thái toàn bộ màn khách hàng

| Mã | Tên màn | Nhóm | Trạng thái | Hiện có trong app | Backend |
|---|---|---|---|---|---|
| K01 | Đăng nhập | A. Truy cập và vị trí | **Đã có** | auth/LoginScreen.kt | POST auth/customer/login |
| K02 | Đăng ký | A. Truy cập và vị trí | **Một phần** | auth/RegisterScreen.kt | POST auth/customer/register |
| K03 | Xác minh OTP | A. Truy cập và vị trí | **Một phần** | auth/OtpVerificationScreen.kt | POST auth/customer/verify-otp, resend-otp |
| K04 | Quên mật khẩu | A. Truy cập và vị trí | **Đã có** | auth/ForgotPasswordScreen.kt | POST auth/password/forgot |
| K05 | Đặt mật khẩu mới | A. Truy cập và vị trí | **Một phần** | auth/ResetPasswordScreen.kt | POST auth/password/reset |
| K06 | Quyền vị trí và bán kính | A. Truy cập và vị trí | **Đã có** | location/LocationSettingsScreen.kt | lưu cục bộ (SharedPreferences) |
| K07 | Địa điểm của tôi | A. Truy cập và vị trí | **Đã có** | location/SavedPlacesScreen.kt | GET/POST/DELETE customer/saved-places |
| K08 | Ghim vị trí tạm | A. Truy cập và vị trí | **Đã có** | location/PinLocationScreen.kt | cục bộ |
| K09 | Trang chủ danh sách deal | B. Khám phá deal | **Đã có** | discovery/DiscoverHomeScreen.kt, BrowseScreen.kt | GET customer/deals |
| K10 | Bản đồ deal | B. Khám phá deal | **Đã có** | discovery/DealMapScreen.kt | GET customer/deals/map |
| K11 | Tìm kiếm | B. Khám phá deal | **Một phần** | Chỉ có ô tìm kiếm trên Trang chủ (lọc theo tên món/cửa hàng ngay trên máy). | BE sẵn: POST/GET/DELETE customer/saved-filters, POST customer/ai/search (app đã khai báo hàm gọi nhưng chưa có UI), GET/DELETE customer/view-history. |
| K12 | Bộ lọc và sắp xếp | B. Khám phá deal | **Một phần** | discovery/PreferencesScreen.kt chỉ là "Tùy chọn của bạn" (loại món, ăn chay/thuần chay, khung giờ), KHÔNG phải bộ lọc. | GET customer/deals nhận query lọc (cần BE xác nhận tham số: giá tối đa, % giảm, khoảng cách, sắp xếp). |
| K13 | Chi tiết deal | B. Khám phá deal | **Một phần** | discovery/DealDetailScreen.kt (giá, khung nhận, TrustPass, dị ứng, nút đặt). | BE sẵn: GET customer/deals/:id, :id/trustpass, :id/share, POST/DELETE :id/save, POST ai/allergy-check, GET ai/deals/:id/summary, ai/deals/:id/recipe-ideas. |
| K14 | Chi tiết cửa hàng | B. Khám phá deal | **Một phần** | store/StoreDetailScreen.kt (thông tin, điểm sao, yêu thích, báo cáo cửa hàng). | GET customer/stores/:id |
| K15 | Đánh giá công khai của cửa hàng | B. Khám phá deal | **Chưa có** | — | CHƯA có route lấy đánh giá công khai của cửa hàng (R1-094) — cần BE thêm GET customer/stores/:id/reviews kèm thống kê 1–5 sao và tóm tắt 90 ngày. |
| K16 | So sánh deal | B. Khám phá deal | **Đã có** | discovery/CompareDealsScreen.kt | GET customer/deals/compare |
| K17 | Deal đã lưu và đã xem | B. Khám phá deal | **Đã có** | discovery/SavedDealsScreen.kt | GET customer/saved-deals, view-history |
| K18 | Cửa hàng yêu thích | B. Khám phá deal | **Đã có** | favourites/FavouritesScreen.kt | GET/POST/DELETE customer/favorites |
| K19 | Danh sách cảnh báo deal | B. Khám phá deal | **Đã có** | alerts/DealAlertsScreen.kt | GET/DELETE customer/deal-alerts |
| K20 | Tạo hoặc sửa cảnh báo | B. Khám phá deal | **Đã có** | alerts/DealAlertEditScreen.kt | POST/PUT customer/deal-alerts |
| K21 | Gợi ý dành cho bạn | B. Khám phá deal | **Một phần** | BrowseScreen.kt (chế độ "Gần nhất" và "Khả năng nhận cao" từ Radar). | GET customer/deals/radar |
| K22 | Xác nhận đặt | C. Đặt hàng và thanh toán | **Đã có** | checkout/OrderHoldCheckoutScreen.kt | POST customer/orders |
| K23 | Chọn ưu đãi | C. Đặt hàng và thanh toán | **Đã có** | checkout/PromotionPickerSheet.kt | GET customer/promotions/wallet |
| K24 | Thanh toán VietQR | C. Đặt hàng và thanh toán | **Đã có** | checkout/OrderHoldCheckoutScreen.kt (VietQR + "Tôi đã chuyển tiền, kiểm tra lại") | POST customer/orders/:id/payments, payments/recheck |
| K25 | Kết quả thanh toán | C. Đặt hàng và thanh toán | **Đã có** | checkout/PaymentResultScreen.kt | GET customer/orders/:id/payments |
| K26 | Đơn của tôi | C. Đặt hàng và thanh toán | **Đã có** | orders/MyOrdersScreen.kt | GET customer/orders, orders/active |
| K27 | Chi tiết đơn | C. Đặt hàng và thanh toán | **Đã có** | orders/OrderDetailScreen.kt | GET customer/orders/:id |
| K28 | QR nhận hàng | C. Đặt hàng và thanh toán | **Đã có** | pickup/PickupPassScreen.kt | GET customer/orders/:id/pickup-pass, POST :id/arriving |
| K29 | Mã nhận hộ | C. Đặt hàng và thanh toán | **Đã có** | tạo mã nhận hộ nằm trong orders/OrderDetailScreen.kt | POST/GET/DELETE customer/orders/:id/proxy-code |
| K30 | Hủy đơn | C. Đặt hàng và thanh toán | **Đã có** | orders/CancelOrderSheet.kt | POST customer/orders/:id/cancel |
| K31 | Biên nhận | C. Đặt hàng và thanh toán | **Đã có** | orders/ReceiptScreen.kt | GET customer/orders/:id/receipt |
| K32 | Đặt lại món đã mua | C. Đặt hàng và thanh toán | **Đã có** | orders/ReorderScreen.kt | POST customer/orders/reorder/:oldOrderId |
| K33 | Trạng thái khóa đặt | C. Đặt hàng và thanh toán | **Đã có** | orders/OrderLockStatusScreen.kt | GET customer/order-lock |
| K34 | Gửi khiếu nại | D. Hậu mãi và hỗ trợ | **Đã có** | postpurchase/CreateComplaintScreen.kt | POST customer/orders/:id/complaints |
| K35 | Lịch sử khiếu nại | D. Hậu mãi và hỗ trợ | **Đã có** | postpurchase/ComplaintListScreen.kt | GET customer/complaints |
| K36 | Chi tiết khiếu nại | D. Hậu mãi và hỗ trợ | **Đã có** | postpurchase/ComplaintDetailScreen.kt | GET customer/complaints/:id, POST withdraw, attachments |
| K37 | Gửi đánh giá | D. Hậu mãi và hỗ trợ | **Một phần** | postpurchase/CreateReviewScreen.kt (gửi đánh giá mới). | BE sẵn: POST orders/:id/reviews, PUT customer/reviews/:id, DELETE customer/reviews/:id |
| K38 | Đánh giá của tôi | D. Hậu mãi và hỗ trợ | **Một phần** | postpurchase/MyReviewsScreen.kt đang là màn trống ghi "Hệ thống chưa hỗ trợ xem lại các đánh giá đã gửi". | CHƯA có route liệt kê đánh giá của tôi — cần BE thêm GET customer/reviews. |
| K39 | Báo cáo vi phạm | D. Hậu mãi và hỗ trợ | **Đã có** | postpurchase/ReportViolationScreen.kt | POST customer/reports |
| K40 | Gửi yêu cầu hỗ trợ | D. Hậu mãi và hỗ trợ | **Đã có** | support/SupportTicketListScreen.kt (form tạo yêu cầu) | POST customer/support-tickets |
| K41 | Danh sách hỗ trợ | D. Hậu mãi và hỗ trợ | **Đã có** | support/SupportTicketListScreen.kt | GET customer/support-tickets |
| K42 | Chi tiết hỗ trợ | D. Hậu mãi và hỗ trợ | **Đã có** | support/SupportTicketDetailScreen.kt | GET :id, POST :id/messages, POST :id/close |
| K43 | Trung tâm trợ giúp | D. Hậu mãi và hỗ trợ | **Một phần** | support/HelpCenterScreen.kt chỉ liệt kê Câu hỏi thường gặp. | GET customer/help-center/faq |
| K44 | Bài viết trợ giúp | D. Hậu mãi và hỗ trợ | **Chưa có** | — | Chỉ có danh sách FAQ; chưa có route bài viết chi tiết (xác nhận với BE hoặc dùng nội dung FAQ). |
| K45 | Thông báo | E. Thông báo, ưu đãi, tác động | **Đã có** | notifications/NotificationsScreen.kt | GET customer/notifications, PATCH read, read-all |
| K46 | Lịch sử thanh toán và hoàn tiền | E. Thông báo, ưu đãi, tác động | **Đã có** | profile/TransactionHistoryScreen.kt | GET customer/transactions |
| K47 | Ví ưu đãi | E. Thông báo, ưu đãi, tác động | **Đã có** | rewards/PromotionWalletScreen.kt | GET customer/promotions/wallet, POST :id/claim |
| K48 | Tác động cá nhân | E. Thông báo, ưu đãi, tác động | **Đã có** | profile/ImpactScreen.kt | GET customer/impact |
| K49 | Huy hiệu và chia sẻ | E. Thông báo, ưu đãi, tác động | **Một phần** | Huy hiệu hiển thị trong ImpactScreen.kt. | GET customer/impact/badges |
| K50 | Trợ lý Cứu Món | F. Trợ lý AI | **Đã có** | ai/SaveBiteAiSheet.kt | POST customer/ai/chat, ai/allergy-check, ai/feedback |
| K51 | Lịch sử hội thoại AI | F. Trợ lý AI | **Chưa có** | — | CHƯA có route lịch sử hội thoại AI — cần BE (tài liệu R1-091). |
| K52 | Tài khoản của tôi | G. Tài khoản và quyền riêng tư | **Đã có** | profile/ProfileScreen.kt | GET customer/profile |
| K53 | Chỉnh sửa hồ sơ | G. Tài khoản và quyền riêng tư | **Chưa có** | — | BE sẵn: PUT customer/profile (tên). CHƯA có upload ảnh đại diện; đổi email/SĐT cần OTP (K03). |
| K54 | Đổi mật khẩu | G. Tài khoản và quyền riêng tư | **Đã có** | profile/ChangePasswordScreen.kt | POST auth/password/change |
| K55 | Xác thực hai bước | G. Tài khoản và quyền riêng tư | **Chưa có** | — | CHƯA có route 2FA trong customer/*. |
| K56 | Thiết bị đăng nhập | G. Tài khoản và quyền riêng tư | **Chưa có** | — | CHƯA có route danh sách/thu hồi thiết bị. |
| K57 | Cài đặt thông báo | G. Tài khoản và quyền riêng tư | **Một phần** | Công tắc cài đặt nằm trong notifications/NotificationsScreen.kt. | GET/PUT customer/notification-settings; POST/DELETE customer/fcm-token |
| K58 | Hồ sơ ăn uống và dị ứng | G. Tài khoản và quyền riêng tư | **Chưa có** | Menu "Hồ sơ ăn uống & dị ứng" ở tab Tôi đang mở nhầm màn "Tùy chọn của bạn" (chỉ có loại món/ăn chay/giờ) — KHÔNG có khai báo dị ứng. | BE sẵn: GET/PUT customer/dietary-profile (app đã khai báo hàm gọi nhưng chưa có UI). |
| K59 | Quyền riêng tư và đồng ý | G. Tài khoản và quyền riêng tư | **Một phần** | profile/PrivacyDataScreen.kt (xuất dữ liệu, xin xóa tài khoản, lịch sử đồng ý). | GET/POST customer/consents |
| K60 | Xuất dữ liệu cá nhân | G. Tài khoản và quyền riêng tư | **Một phần** | Nút "Xuất dữ liệu của tôi" trong PrivacyDataScreen.kt. | POST customer/data-export |
| K61 | Xóa tài khoản | G. Tài khoản và quyền riêng tư | **Đã có** | PrivacyDataScreen.kt (xin xóa, hủy yêu cầu) | POST/DELETE customer/delete-request |
| KC01 | Tạo giỏ theo nhu cầu | Rescue Basket | **Đã có** | basket/RescueBasketScreen.kt | POST customer/baskets/suggest |
| KC02 | Các phương án giỏ | Rescue Basket | **Đã có** | basket/RescueBasketScreen.kt (BasketCard) | POST customer/baskets/suggest |
| KC03 | Chi tiết giỏ | Rescue Basket | **Chưa có** | — | CHƯA có route thay món/bỏ món trong giỏ (chỉ có baskets/suggest). |
| KC04 | Xác nhận đặt giỏ | Rescue Basket | **Chưa có** | — | CHƯA có route đặt cả giỏ (hiện chỉ đặt từng suất qua POST customer/orders). |
| KC05 | Danh sách đợt Pool | Rescue Pool | **Đã có** | pool/RescuePoolListScreen.kt | GET customer/rescue-pools |
| KC06 | Chi tiết đợt | Rescue Pool | **Đã có** | pool/RescuePoolDetailScreen.kt | GET customer/rescue-pools/:id |
| KC07 | Đăng ký nhu cầu | Rescue Pool | **Đã có** | form đăng ký nhu cầu nằm trong RescuePoolDetailScreen.kt | POST/PATCH customer/rescue-pools/:id/register\|registration |
| KC08 | Nhu cầu của tôi | Rescue Pool | **Một phần** | Thẻ "đăng ký của tôi" hiển thị trong RescuePoolListScreen.kt. | GET customer/rescue-pools (myRegistration) |
| KC09 | Đề nghị cung ứng | Rescue Pool | **Đã có** | xác nhận đề nghị trong RescuePoolDetailScreen.kt | POST customer/rescue-pools/:id/confirm-offer |
| KC10 | Hồ sơ minh bạch món (TrustPass) | TrustPass | **Đã có** | khối TrustPass trong DealDetailScreen.kt | GET customer/deals/:id/trustpass |
| KC11 | Điểm thưởng | Rescue Rewards | **Đã có** | rewards/RewardsScreen.kt | GET customer/rewards/balance |
| KC12 | Lịch sử điểm | Rescue Rewards | **Đã có** | RewardsScreen.kt (lịch sử điểm) | GET customer/rewards/history |
| KC13 | Đổi điểm lấy ưu đãi | Rescue Rewards | **Đã có** | RewardsScreen.kt (đổi điểm) | POST customer/rewards/redeem |
| KC14 | Quy tắc chương trình điểm | Rescue Rewards | **Chưa có** | — | Nội dung tĩnh (hoặc BE cấu hình). |
| KC15 | Thiết lập Radar | Rescue Radar | **Một phần** | Nút chuyển chế độ "Khả năng nhận cao" trong BrowseScreen.kt. | GET customer/deals/radar |
| KX01 | Tài khoản nhận hoàn và theo dõi hoàn tiền | Đề xuất thêm | **Chưa có** | — | Chưa thấy route tài khoản nhận hoàn. |
| KX02 | Báo đã chuyển khoản và biên lai | Đề xuất thêm | **Chưa có** | — | Có payments/recheck; CHƯA có upload biên lai. |
| KX03 | Báo sự cố khi đến nhận | Đề xuất thêm | **Chưa có** | — | Chưa thấy route báo sự cố khi nhận. |
| KX04 | Xin gia hạn giờ nhận | Đề xuất thêm | **Chưa có** | — | Có PATCH customer/orders/:id/pickup-slot (cần BE xác nhận có phải gia hạn giờ nhận). |
| KX05 | Đổi suất hoặc chuyển nhượng đơn | Đề xuất thêm | **Chưa có** | — | Chưa thấy route đổi/chuyển nhượng đơn. |
| KX06 | Danh sách chờ suất đã hết | Đề xuất thêm | **Chưa có** | — | Chưa thấy route danh sách chờ. |
| KX07 | Theo dõi giá và lịch sử giá | Đề xuất thêm | **Chưa có** | — | Chưa thấy route lịch sử giá. |
| KX08 | Hồ sơ ăn uống nhiều thành viên | Đề xuất thêm | **Chưa có** | — | Chưa thấy route hồ sơ nhiều thành viên (chỉ có dietary-profile cho một người). |
| KX09 | Hành trình khách mới | Đề xuất thêm | **Chưa có** | — | Không cần BE (giao diện cục bộ). |
| KX10 | Giới thiệu bạn bè | Đề xuất thêm | **Chưa có** | — | Chưa thấy route giới thiệu bạn bè. |
| KX11 | Chat theo đơn | Đề xuất thêm | **Chưa có** | — | Chưa thấy route chat theo đơn. |
| KX12 | Theo dõi đơn trực tiếp | Đề xuất thêm | **Chưa có** | — | Một phần có pickup-pass; chưa thấy trạng thái "đang chuẩn bị". |
| KX13 | Danh mục và bộ sưu tập deal | Đề xuất thêm | **Chưa có** | — | Chưa thấy route bộ sưu tập. |
| KX14 | Chi tiết bộ sưu tập | Đề xuất thêm | **Chưa có** | — | Chưa thấy route bộ sưu tập. |
| KX15 | Món đã nhận: nhắc dùng và bảo quản | Đề xuất thêm | **Chưa có** | — | Có thể dựa trên orders đã nhận + hạn dùng từ TrustPass (cần BE xác nhận). |
| KX16 | Chi tiêu và mục tiêu tháng | Đề xuất thêm | **Chưa có** | — | Có thể tính từ transactions/impact; chưa có mục tiêu tháng. |
| KX17 | Tác động cộng đồng | Đề xuất thêm | **Chưa có** | — | Chưa thấy route tổng hợp cộng đồng. |
| KX18 | Tặng suất | Đề xuất thêm | **Chưa có** | — | Chưa thấy route tặng suất. |

## 4. Chi tiết từng màn chưa làm hoặc làm một phần

Mỗi mục gồm: trạng thái hiện tại, backend, việc cần làm và **mô tả thiết kế đầy đủ nguyên văn** từ tài liệu gốc (kích thước thiết kế 390×844, tiếng Việt).

### Nhóm: A. Truy cập và vị trí

#### K02 · Đăng ký  (Một phần)

- **UC / mã tính năng:** R1-001   **Nguồn:** BRD gốc
- **Hiện có trong app:** auth/RegisterScreen.kt
- **Backend:** POST auth/customer/register
- **Việc cần làm:** Ô mật khẩu đang ghi "Từ 6 ký tự"; tài liệu yêu cầu ≥ 8 ký tự, có chữ và số, kèm danh sách điều kiện đạt/chưa đạt và ô Nhập lại mật khẩu, tick đồng ý điều khoản. Cần đối chiếu rule thật với BE (R1-001) rồi sửa đồng bộ cả K05.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn Đăng ký: tiêu đề "Tạo tài khoản"; ô Họ tên (2–60 ký tự); ô Email hoặc SĐT (nhập một trong hai); ô Mật khẩu (từ 8 ký tự, có chữ và số) kèm thanh đo độ mạnh; hộp tích đồng ý Điều khoản và Chính sách quyền riêng tư (liên…

#### K03 · Xác minh OTP  (Một phần)

- **UC / mã tính năng:** R1-002, R1-013, R1-006   **Nguồn:** BRD gốc
- **Hiện có trong app:** auth/OtpVerificationScreen.kt
- **Backend:** POST auth/customer/verify-otp, resend-otp
- **Việc cần làm:** Mới dùng cho đăng ký. Tài liệu yêu cầu dùng chung cho 2FA và đổi email/SĐT (phụ thuộc K55, K53).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn Xác minh OTP dùng chung cho đăng ký, xác thực hai bước và đổi email hoặc SĐT: tiêu đề, dòng "Mã đã gửi tới ***@gmail.com" (che một phần), 6 ô nhập số, bộ đếm "Gửi lại mã sau 45 giây", nút "Xác minh", liên kết "Đổi …

#### K05 · Đặt mật khẩu mới  (Một phần)

- **UC / mã tính năng:** R1-008   **Nguồn:** BRD gốc
- **Hiện có trong app:** auth/ResetPasswordScreen.kt
- **Backend:** POST auth/password/reset
- **Việc cần làm:** Cùng vấn đề quy tắc mật khẩu như K02 (đang "Từ 6 ký tự").
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn Đặt mật khẩu mới: ô OTP 6 số, Mật khẩu mới, Nhập lại mật khẩu; danh sách điều kiện (từ 8 ký tự, có chữ và số) tự tick xanh theo thời gian thực; nút "Đặt lại mật khẩu". Thành công thì hiện thông báo và về Đăng nhập. Gh…

### Nhóm: B. Khám phá deal

#### K11 · Tìm kiếm  (Một phần)

- **UC / mã tính năng:** R1-022, R1-082   **Nguồn:** BRD gốc
- **Hiện có trong app:** Chỉ có ô tìm kiếm trên Trang chủ (lọc theo tên món/cửa hàng ngay trên máy).
- **Backend:** BE sẵn: POST/GET/DELETE customer/saved-filters, POST customer/ai/search (app đã khai báo hàm gọi nhưng chưa có UI), GET/DELETE customer/view-history.
- **Việc cần làm:** Làm màn Tìm kiếm riêng: tự focus, "Tìm gần đây" (lưu cục bộ), "Bộ lọc đã lưu" (saved-filters), ô "Hỏi tự nhiên" gọi ai/search, trạng thái không có kết quả.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn Tìm kiếm: ô nhập tự lấy focus; mục "Tìm gần đây" và "Bộ lọc đã lưu"; ô gợi ý "Hỏi tự nhiên" (Trợ lý AI) với ví dụ "bánh ngọt dưới 30 nghìn gần chỗ làm sau 19 giờ". Khi người dùng gõ một câu hỏi, hiện bước "Tôi hiểu bạ…

#### K12 · Bộ lọc và sắp xếp  (Một phần)

- **UC / mã tính năng:** R1-023, R1-024, R1-033   **Nguồn:** BRD gốc
- **Hiện có trong app:** discovery/PreferencesScreen.kt chỉ là "Tùy chọn của bạn" (loại món, ăn chay/thuần chay, khung giờ), KHÔNG phải bộ lọc.
- **Backend:** GET customer/deals nhận query lọc (cần BE xác nhận tham số: giá tối đa, % giảm, khoảng cách, sắp xếp).
- **Việc cần làm:** Làm bottom sheet Bộ lọc & sắp xếp: nhiều loại món, thanh trượt giá tối đa, % giảm tối thiểu 0–90, khoảng cách, khung giờ nhận, ăn chay, loại trừ dị ứng, sắp xếp; nút Áp dụng/Đặt lại; đếm số bộ lọc đang bật; lưu bộ lọc (K11).
- **Mô tả thiết kế (nguyên văn):** Thiết kế bottom sheet cao gần toàn màn: chọn nhiều Loại món (chip), thanh trượt Giá tối đa, thanh trượt % giảm tối thiểu 0–90, chọn Khung giờ nhận; mục Sắp xếp (Khoảng cách mặc định, Giá thấp, Giảm nhiều, Sắp hết hạn nhận); nút "L…

#### K13 · Chi tiết deal  (Một phần)

- **UC / mã tính năng:** R1-026, R1-034, R1-037, R1-085, R1-087   **Nguồn:** BRD gốc
- **Hiện có trong app:** discovery/DealDetailScreen.kt (giá, khung nhận, TrustPass, dị ứng, nút đặt).
- **Backend:** BE sẵn: GET customer/deals/:id, :id/trustpass, :id/share, POST/DELETE :id/save, POST ai/allergy-check, GET ai/deals/:id/summary, ai/deals/:id/recipe-ideas.
- **Việc cần làm:** Thiếu: carousel ảnh (hiện chỉ một ảnh bìa), nút Chia sẻ (deals/:id/share), tóm tắt AI/ý tưởng chế biến (có nhãn "Nội dung AI"), đánh giá công khai (K15), "Báo tôi nếu có lại"/theo dõi giá (KX06/KX07).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn Chi tiết deal: carousel ảnh lớn, nút Lưu và Chia sẻ trên đầu; tên món, nhãn % giảm, giá gốc gạch ngang, giá bán; "Còn X suất" kèm thanh tiến trình; khung giờ nhận; hạn dùng; mô tả. Khối "Thành phần và dị ứng do cửa hà…

#### K14 · Chi tiết cửa hàng  (Một phần)

- **UC / mã tính năng:** R1-027, R1-028, R1-029, R1-038, R1-069   **Nguồn:** BRD gốc
- **Hiện có trong app:** store/StoreDetailScreen.kt (thông tin, điểm sao, yêu thích, báo cáo cửa hàng).
- **Backend:** GET customer/stores/:id
- **Việc cần làm:** Thiếu danh sách deal đang mở của cửa hàng và lối vào đánh giá công khai (K15).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn cửa hàng: ảnh bìa và logo, tên, điểm sao và số đánh giá, giờ mở cửa hôm nay, địa chỉ và khoảng cách; nút tim "Yêu thích", nút "Chỉ đường" (mở ứng dụng bản đồ ngoài), menu "⋯" có "Báo cáo cửa hàng". Hai tab: "Deal đang…

#### K15 · Đánh giá công khai của cửa hàng  (Chưa có)

- **UC / mã tính năng:** R1-094, R1-064   **Nguồn:** BRD gốc
- **Hiện có trong app:** —
- **Backend:** CHƯA có route lấy đánh giá công khai của cửa hàng (R1-094) — cần BE thêm GET customer/stores/:id/reviews kèm thống kê 1–5 sao và tóm tắt 90 ngày.
- **Việc cần làm:** Làm màn sau khi BE có API.
- **Mô tả thiết kế (nguyên văn):** Thiết kế danh sách đánh giá: đầu trang điểm trung bình lớn và biểu đồ phân bố 1–5 sao; khối "Tóm tắt từ đánh giá 90 ngày gần nhất" (Trợ lý AI, ba ý chính về chất lượng, đúng giờ, thái độ) có nhãn tham khảo. Mỗi đánh giá có tên rút…

#### K21 · Gợi ý dành cho bạn  (Một phần)

- **UC / mã tính năng:** R1-084, R1-085, R1-093   **Nguồn:** BRD gốc
- **Hiện có trong app:** BrowseScreen.kt (chế độ "Gần nhất" và "Khả năng nhận cao" từ Radar).
- **Backend:** GET customer/deals/radar
- **Việc cần làm:** Thiếu dòng lý do trên từng thẻ ("Vì bạn hay mua bánh mì sau 19:00") và menu "⋯" để giảm gợi ý loại/cửa hàng (R1-093); cần cờ nhận biết nội dung do hệ thống gợi ý.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn "Dành cho bạn": danh sách deal được xếp hạng, mỗi thẻ có dòng lý do như "Vì bạn hay mua bánh mì sau 19:00". Menu "⋯" mở sheet "Vì sao gợi ý?" liệt kê các thành phần (đã mua, cửa hàng yêu thích, giờ hay mua, hồ sơ ăn u…

### Nhóm: D. Hậu mãi và hỗ trợ

#### K37 · Gửi đánh giá  (Một phần)

- **UC / mã tính năng:** R1-064, R1-065   **Nguồn:** BRD gốc
- **Hiện có trong app:** postpurchase/CreateReviewScreen.kt (gửi đánh giá mới).
- **Backend:** BE sẵn: POST orders/:id/reviews, PUT customer/reviews/:id, DELETE customer/reviews/:id
- **Việc cần làm:** Thiếu sửa/xóa đánh giá trong 24 giờ (PUT/DELETE đã có ở BE, app chưa gọi).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn chấm sao 1–5 lớn và ô nhận xét tối đa 300 ký tự có đếm; hiện tên món và cửa hàng; trong 24 giờ có thể sửa nên hiển thị "Bạn có thể sửa trong 23:12 nữa"; nút "Gửi đánh giá"; lưu ý nhẹ về nội dung phù hợp.

#### K38 · Đánh giá của tôi  (Một phần)

- **UC / mã tính năng:** R1-065, R1-066   **Nguồn:** BRD gốc
- **Hiện có trong app:** postpurchase/MyReviewsScreen.kt đang là màn trống ghi "Hệ thống chưa hỗ trợ xem lại các đánh giá đã gửi".
- **Backend:** CHƯA có route liệt kê đánh giá của tôi — cần BE thêm GET customer/reviews.
- **Việc cần làm:** Sau khi BE có API: danh sách (cửa hàng, sao, nhận xét, ngày, phản hồi của cửa hàng), nút Sửa (còn hạn 24 giờ), Xóa.
- **Mô tả thiết kế (nguyên văn):** Thiết kế danh sách đánh giá khách đã gửi: cửa hàng, sao, nhận xét, ngày, phản hồi của cửa hàng; hành động Sửa (còn hạn 24 giờ) và Ẩn (có xác nhận, ghi chú không xóa vĩnh viễn); đánh giá đã ẩn có nhãn xám.

#### K43 · Trung tâm trợ giúp  (Một phần)

- **UC / mã tính năng:** R1-072   **Nguồn:** BRD gốc
- **Hiện có trong app:** support/HelpCenterScreen.kt chỉ liệt kê Câu hỏi thường gặp.
- **Backend:** GET customer/help-center/faq
- **Việc cần làm:** Thiếu ô tìm kiếm, lưới chủ đề (Nhận hàng, Hoàn tiền, Thanh toán, Dùng mã QR, Tài khoản), lối vào gửi yêu cầu hỗ trợ.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn Trợ giúp: ô tìm kiếm, lưới chủ đề (Nhận hàng, Hoàn tiền, Thanh toán, Dùng mã QR, Tài khoản), mục "Câu hỏi thường gặp", cuối trang nút "Liên hệ hỗ trợ" và "Hỏi trợ lý".

#### K44 · Bài viết trợ giúp  (Chưa có)

- **UC / mã tính năng:** R1-072   **Nguồn:** BRD gốc
- **Hiện có trong app:** —
- **Backend:** Chỉ có danh sách FAQ; chưa có route bài viết chi tiết (xác nhận với BE hoặc dùng nội dung FAQ).
- **Việc cần làm:** Màn đọc bài: bước đánh số, ảnh, hộp lưu ý, "Bài viết có hữu ích không?".
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn đọc bài: tiêu đề, ngày cập nhật, nội dung có các bước đánh số, ảnh minh họa, hộp lưu ý; cuối bài "Bài viết có hữu ích không?" (Có/Không) và liên kết bài liên quan.

### Nhóm: E. Thông báo, ưu đãi, tác động

#### K49 · Huy hiệu và chia sẻ  (Một phần)

- **UC / mã tính năng:** R1-081   **Nguồn:** BRD gốc
- **Hiện có trong app:** Huy hiệu hiển thị trong ImpactScreen.kt.
- **Backend:** GET customer/impact/badges
- **Việc cần làm:** Thiếu thanh tiến độ tới mốc kế tiếp và nút Chia sẻ (ảnh thẻ chia sẻ, không lộ thông tin cá nhân).
- **Mô tả thiết kế (nguyên văn):** Thiết kế lưới huy hiệu cột mốc (theo số đơn và kg cứu được) với trạng thái đã mở hoặc khóa và thanh tiến độ tới mốc tiếp theo; nút "Chia sẻ thành tích" tạo ảnh vuông đẹp, không chứa tên, đơn hay vị trí, rồi mở share sheet. Không d…

### Nhóm: F. Trợ lý AI

#### K51 · Lịch sử hội thoại AI  (Chưa có)

- **UC / mã tính năng:** R1-091   **Nguồn:** BRD gốc
- **Hiện có trong app:** —
- **Backend:** CHƯA có route lịch sử hội thoại AI — cần BE (tài liệu R1-091).
- **Việc cần làm:** Danh sách hội thoại, vuốt xóa, "Xóa tất cả", công tắc "Ghi nhớ".
- **Mô tả thiết kế (nguyên văn):** Thiết kế danh sách hội thoại (thời điểm, tóm tắt một dòng); vuốt để xóa từng hội thoại, nút "Xóa tất cả" có xác nhận; công tắc "Ghi nhớ ngữ cảnh" kèm giải thích quyền riêng tư; trạng thái rỗng.

### Nhóm: G. Tài khoản và quyền riêng tư

#### K53 · Chỉnh sửa hồ sơ  (Chưa có)

- **UC / mã tính năng:** R1-006   **Nguồn:** BRD gốc
- **Hiện có trong app:** —
- **Backend:** BE sẵn: PUT customer/profile (tên). CHƯA có upload ảnh đại diện; đổi email/SĐT cần OTP (K03).
- **Việc cần làm:** Form chỉnh sửa hồ sơ: họ tên 2–60 ký tự, đổi ảnh (JPG/PNG ≤ 2 MB, cắt tròn — chờ API), đổi email/SĐT qua OTP.
- **Mô tả thiết kế (nguyên văn):** Thiết kế form: đổi ảnh đại diện (JPG hoặc PNG tối đa 2 MB, cắt tròn), Họ tên 2–60 ký tự; trường Email hoặc SĐT hiển thị nút "Đổi" mở luồng OTP tới định danh mới; nút "Lưu". Lỗi định dạng và dung lượng ảnh.

#### K55 · Xác thực hai bước  (Chưa có)

- **UC / mã tính năng:** R1-013   **Nguồn:** BRD gốc
- **Hiện có trong app:** —
- **Backend:** CHƯA có route 2FA trong customer/*.
- **Việc cần làm:** Công tắc bật/tắt, kênh nhận OTP, nhập OTP xác nhận khi bật.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn bật/tắt: công tắc lớn, giải thích "Yêu cầu OTP khi đăng nhập thiết bị lạ", chọn kênh nhận OTP (email hoặc SĐT đã xác minh), bước xác minh OTP khi bật; tắt cần nhập mật khẩu; hiển thị trạng thái hiện tại.

#### K56 · Thiết bị đăng nhập  (Chưa có)

- **UC / mã tính năng:** R1-014   **Nguồn:** BRD gốc
- **Hiện có trong app:** —
- **Backend:** CHƯA có route danh sách/thu hồi thiết bị.
- **Việc cần làm:** Danh sách thiết bị, "Thiết bị hiện tại", đăng xuất từ xa, đăng xuất tất cả.
- **Mô tả thiết kế (nguyên văn):** Thiết kế danh sách thiết bị: tên thiết bị, hệ điều hành, lần hoạt động cuối, IP rút gọn, vị trí gần đúng; thiết bị hiện tại có nhãn "Thiết bị này"; nút "Đăng xuất" từng thiết bị và "Đăng xuất tất cả thiết bị khác" có xác nhận.

#### K57 · Cài đặt thông báo  (Một phần)

- **UC / mã tính năng:** R1-010, R1-093   **Nguồn:** BRD gốc
- **Hiện có trong app:** Công tắc cài đặt nằm trong notifications/NotificationsScreen.kt.
- **Backend:** GET/PUT customer/notification-settings; POST/DELETE customer/fcm-token
- **Việc cần làm:** Tách thành màn Cài đặt thông báo riêng theo 5 nhóm (Deal mới ở gần, Nhắc giờ nhận, Trạng thái đơn, Khiếu nại, Ưu đãi); giờ yên lặng. Đẩy thông báo FCM chưa nối (cần google-services.json, ghi chú trong SurplusAppRoot).
- **Mô tả thiết kế (nguyên văn):** Thiết kế danh sách công tắc theo nhóm: Deal mới ở gần, Nhắc giờ nhận, Trạng thái đơn, Khiếu nại, Ưu đãi; mỗi công tắc có mô tả ngắn. Cảnh báo nhẹ khi tắt "Nhắc giờ nhận" (dễ bị tính không đến nhận). Nếu quyền thông báo hệ thống bị…

#### K58 · Hồ sơ ăn uống và dị ứng  (Chưa có)

- **UC / mã tính năng:** R1-016   **Nguồn:** BRD gốc
- **Hiện có trong app:** Menu "Hồ sơ ăn uống & dị ứng" ở tab Tôi đang mở nhầm màn "Tùy chọn của bạn" (chỉ có loại món/ăn chay/giờ) — KHÔNG có khai báo dị ứng.
- **Backend:** BE sẵn: GET/PUT customer/dietary-profile (app đã khai báo hàm gọi nhưng chưa có UI).
- **Việc cần làm:** Làm màn đúng nghĩa: chip dị ứng (Gluten, Sữa, Trứng, Hạt, Hải sản, Khác), món không ăn, chế độ ăn; dùng để cảnh báo trên chi tiết deal. Đây là tính năng liên quan an toàn thực phẩm — ưu tiên cao.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn khai báo tùy chọn: chip dị ứng (Gluten, Sữa, Trứng, Hạt, Hải sản, Khác có ô nhập), danh sách món không ăn (chọn nhiều), công tắc đồng ý lưu dữ liệu ăn uống kèm giải thích đây là dữ liệu nhạy cảm; nút "Lưu"; ghi chú "C…

#### K59 · Quyền riêng tư và đồng ý  (Một phần)

- **UC / mã tính năng:** R1-012, R1-017   **Nguồn:** BRD gốc
- **Hiện có trong app:** profile/PrivacyDataScreen.kt (xuất dữ liệu, xin xóa tài khoản, lịch sử đồng ý).
- **Backend:** GET/POST customer/consents
- **Việc cần làm:** Thiếu công tắc riêng cho từng loại đồng ý (vị trí, thông báo tiếp thị, cá nhân hóa) và hiển thị phiên bản điều khoản.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn quyền riêng tư: phiên bản điều khoản đã đồng ý và thời điểm; công tắc riêng cho Đồng ý dùng vị trí, Nhận ưu đãi từ cửa hàng, Cá nhân hóa đề xuất theo lịch sử, Ghi nhớ ngữ cảnh trợ lý AI; mỗi công tắc có thời điểm đổi …

#### K60 · Xuất dữ liệu cá nhân  (Một phần)

- **UC / mã tính năng:** R1-018   **Nguồn:** BRD gốc
- **Hiện có trong app:** Nút "Xuất dữ liệu của tôi" trong PrivacyDataScreen.kt.
- **Backend:** POST customer/data-export
- **Việc cần làm:** Thiếu chọn phạm vi (hồ sơ, đơn, đánh giá, khiếu nại, đồng ý), định dạng JSON/CSV, trạng thái yêu cầu, tải về.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn: chọn phạm vi dữ liệu bằng hộp kiểm (hồ sơ, đơn, đánh giá, khiếu nại, đồng ý), định dạng JSON hoặc CSV, nút "Yêu cầu xuất"; trạng thái "Đang chuẩn bị", rồi liên kết tải hết hạn sau 24 giờ có đếm ngược.

### Nhóm: Rescue Basket

#### KC03 · Chi tiết giỏ  (Chưa có)

- **UC / mã tính năng:** CM-C01   **Nguồn:** BBRD bổ sung
- **Hiện có trong app:** —
- **Backend:** CHƯA có route thay món/bỏ món trong giỏ (chỉ có baskets/suggest).
- **Việc cần làm:** Chi tiết giỏ, ± số lượng, "Thay món" (suất thay thế cùng cửa hàng), "Bỏ món", tổng giá cập nhật.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn chi tiết giỏ: danh sách suất (ảnh, tên, số lượng − và +, giá), nút "Thay món" (mở suất thay thế cùng cửa hàng) và "Bỏ món"; tổng giá tính lại ngay, khung nhận chung cập nhật theo; cảnh báo dị ứng theo hồ sơ, hoặc "Chư…

#### KC04 · Xác nhận đặt giỏ  (Chưa có)

- **UC / mã tính năng:** CM-C01   **Nguồn:** BBRD bổ sung
- **Hiện có trong app:** —
- **Backend:** CHƯA có route đặt cả giỏ (hiện chỉ đặt từng suất qua POST customer/orders).
- **Việc cần làm:** Màn kiểm tra trước khi đặt; xử lý suất hết trong lúc xem.
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn kiểm tra trước khi đặt: danh sách cuối cùng, tổng tiền, ưu đãi áp dụng, khung nhận, thông báo "Giữ suất trong 10 phút". Nếu có món hết hoặc giá đổi: hộp thoại liệt kê thay đổi với nút "Xác nhận thay đổi" và "Quay lại …

### Nhóm: Rescue Pool

#### KC08 · Nhu cầu của tôi  (Một phần)

- **UC / mã tính năng:** CM-C02   **Nguồn:** BBRD bổ sung
- **Hiện có trong app:** Thẻ "đăng ký của tôi" hiển thị trong RescuePoolListScreen.kt.
- **Backend:** GET customer/rescue-pools (myRegistration)
- **Việc cần làm:** Thiếu màn hai tab "Nhu cầu" và "Đơn từ đợt" với chip phân biệt "Đã đăng ký nhu cầu" và "Đã đặt hàng".
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn hai tab "Nhu cầu" và "Đơn từ đợt": thẻ đăng ký có chip phân biệt rõ "Đã đăng ký nhu cầu" (xanh nhạt) và "Đã đặt hàng" (xanh đậm), trạng thái đợt, hạn; hành động Sửa và Rút nhu cầu (có xác nhận). Khi đã có đơn: ghi chú…

### Nhóm: Rescue Rewards

#### KC14 · Quy tắc chương trình điểm  (Chưa có)

- **UC / mã tính năng:** CM-C04   **Nguồn:** BBRD bổ sung
- **Hiện có trong app:** —
- **Backend:** Nội dung tĩnh (hoặc BE cấu hình).
- **Việc cần làm:** Trang quy tắc dạng mục thu gọn: tỷ lệ cộng điểm, đơn đủ điều kiện, hạn dùng điểm, giới hạn đổi.
- **Mô tả thiết kế (nguyên văn):** Thiết kế trang điều khoản dạng mục thu gọn: tỷ lệ cộng điểm, điều kiện đơn đủ điều kiện (Đã nhận), hạn dùng điểm, giới hạn đổi, trường hợp hoàn tác khi đơn hoàn tiền, xử lý khi chương trình tạm dừng hoặc xóa tài khoản, thời gian h…

### Nhóm: Rescue Radar

#### KC15 · Thiết lập Radar  (Một phần)

- **UC / mã tính năng:** CM-C05   **Nguồn:** BBRD bổ sung
- **Hiện có trong app:** Nút chuyển chế độ "Khả năng nhận cao" trong BrowseScreen.kt.
- **Backend:** GET customer/deals/radar
- **Việc cần làm:** Thiếu bottom sheet thiết lập Radar: điểm xuất phát (GPS/địa điểm đã lưu/nhập tay), khung giờ nhận, ngân sách, bán kính; nhãn giải thích xếp hạng.
- **Mô tả thiết kế (nguyên văn):** Thiết kế bottom sheet "Radar deal" dùng trên Trang chủ và Bản đồ: chọn điểm xuất phát (GPS, địa điểm đã lưu, nhập tay), khung giờ nhận, ngân sách, bộ lọc ăn uống; công tắc "Ưu tiên deal nhận kịp". Mỗi thẻ deal có chip lý do xếp hạ…

### Nhóm: Đề xuất thêm

#### KX01 · Tài khoản nhận hoàn và theo dõi hoàn tiền  (Chưa có)

- **UC / mã tính năng:** N08   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route tài khoản nhận hoàn.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn "Hoàn tiền": khối "Tài khoản nhận hoàn" (ngân hàng, số tài khoản che giữa, tên chủ tài khoản, nút Thêm và Sửa); danh sách yêu cầu hoàn với chip Chờ, Hoàn thành, Lỗi, Chờ thông tin và thời hạn xử lý dự kiến; thẻ đơn cầ…

#### KX02 · Báo đã chuyển khoản và biên lai  (Chưa có)

- **UC / mã tính năng:** N56   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Có payments/recheck; CHƯA có upload biên lai.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn sau khi khách bấm "Tôi đã chuyển": đồng hồ giữ suất thêm tối đa 5 phút, trạng thái "Đang chờ xác nhận", ô đính ảnh biên lai hoặc nhập mã giao dịch, dòng thời gian (Đã báo, Đang đối chiếu, Đã xác nhận hoặc Chưa thấy ti…

#### KX03 · Báo sự cố khi đến nhận  (Chưa có)

- **UC / mã tính năng:** N10   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route báo sự cố khi nhận.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế form "Không nhận được hàng" mở từ chi tiết đơn trong khung nhận: chọn lý do (Cửa hàng đóng cửa, Hết hàng, Cửa hàng từ chối, Không quét được), mô tả ngắn, tối đa 3 ảnh; dòng "Đơn này tạm không tính lần không đến nhận". Sau…

#### KX04 · Xin gia hạn giờ nhận  (Chưa có)

- **UC / mã tính năng:** N11   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Có PATCH customer/orders/:id/pickup-slot (cần BE xác nhận có phải gia hạn giờ nhận).
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế bottom sheet "Xin nhận trễ": chọn +15 hoặc +30 phút, lý do tùy chọn, nút "Gửi yêu cầu"; trạng thái Chờ cửa hàng, Được chấp nhận (QR kéo dài đến HH:mm), Bị từ chối; chỉ gửi một lần mỗi đơn và chỉ trong khung nhận.

#### KX05 · Đổi suất hoặc chuyển nhượng đơn  (Chưa có)

- **UC / mã tính năng:** N64   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route đổi/chuyển nhượng đơn.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn hai lựa chọn thay vì hủy: "Đổi sang suất khác của cùng cửa hàng" (danh sách suất, hiện chênh lệch giá cần bù hoặc hoàn) và "Chuyển cho người khác" (tạo liên kết hoặc mã, người nhận cần có tài khoản). Tóm tắt đơn hiện …

#### KX06 · Danh sách chờ suất đã hết  (Chưa có)

- **UC / mã tính năng:** N18   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route danh sách chờ.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế nút "Báo tôi nếu có lại" trên suất hết và màn "Đang chờ": danh sách suất đang chờ với công tắc Bật/Tắt, trạng thái Đang chờ, Có suất trở lại (kèm nút "Xem ngay"), Đã hết lượt thông báo; chú thích "Thông báo không giữ suất…

#### KX07 · Theo dõi giá và lịch sử giá  (Chưa có)

- **UC / mã tính năng:** N72   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route lịch sử giá.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế bottom sheet từ Chi tiết deal: biểu đồ đường lịch sử giá của suất (các lần đổi giá thật, không dự đoán), ô "Báo tôi khi giá ≤" (nhập số), công tắc "Báo mọi lần giảm giá", danh sách đang theo dõi; dòng "Giá chốt khi đặt kh…

#### KX08 · Hồ sơ ăn uống nhiều thành viên  (Chưa có)

- **UC / mã tính năng:** N76   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route hồ sơ nhiều thành viên (chỉ có dietary-profile cho một người).
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế danh sách tối đa 5 thành viên (biệt danh, chip dị ứng, món không ăn), nút Thêm, Sửa, Xóa; công tắc đồng ý dữ liệu nhạy cảm; trên Chi tiết deal có chọn "Đang xem cho:" để cảnh báo theo từng người; không lưu tuổi hay ngày s…

#### KX09 · Hành trình khách mới  (Chưa có)

- **UC / mã tính năng:** N67   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Không cần BE (giao diện cục bộ).
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế 4 màn giới thiệu vuốt ngang: (1) Cứu Món là gì, (2) Cách nhận hàng bằng QR, (3) Cấp vị trí và chọn bán kính, (4) Bật thông báo và nhận voucher chào mừng; chấm tiến độ, nút Bỏ qua; kết thúc ở Trang chủ với deal đầu tiên gắ…

#### KX10 · Giới thiệu bạn bè  (Chưa có)

- **UC / mã tính năng:** N20   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route giới thiệu bạn bè.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn "Mời bạn": mã giới thiệu lớn, nút Chia sẻ (Zalo, tin nhắn, sao chép); mô tả phần thưởng cho cả hai sau đơn "Đã nhận" đầu tiên của bạn; danh sách bạn đã mời với trạng thái Đã cài, Đã nhận đơn đầu, Đã nhận thưởng; điều …

#### KX11 · Chat theo đơn  (Chưa có)

- **UC / mã tính năng:** N36   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route chat theo đơn.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn chat gắn với một đơn đang hoạt động: bong bóng khách và cửa hàng, tin nhắn mẫu một chạm ("Tôi đang đến", "Tôi mặc áo xanh", "Cho tôi trễ 10 phút"), ẩn số điện thoại, nhãn "Cuộc trò chuyện đóng sau khi đơn hoàn tất", n…

#### KX12 · Theo dõi đơn trực tiếp  (Chưa có)

- **UC / mã tính năng:** N71   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Một phần có pickup-pass; chưa thấy trạng thái "đang chuẩn bị".
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn theo dõi đơn dạng dòng thời gian lớn: Đã thanh toán, Cửa hàng đang chuẩn bị, Đã chuẩn bị xong, Đã nhận; thẻ "Gợi ý giờ xuất phát" dựa trên khoảng cách (nhãn Ước tính); nút "Mở mã QR", "Tôi sắp đến", "Chỉ đường"; cập n…

#### KX13 · Danh mục và bộ sưu tập deal  (Chưa có)

- **UC / mã tính năng:** N34   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route bộ sưu tập.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn khám phá theo chủ đề: lưới danh mục (Bánh mì, Bánh ngọt, Cơm, Đồ uống, Túi bất ngờ…), dải banner do vận hành quản lý, các bộ sưu tập ngang ("Giảm sâu tối nay", "Chay", "Dưới 30k") hiển thị thẻ deal từ dữ liệu thật; lị…

#### KX14 · Chi tiết bộ sưu tập  (Chưa có)

- **UC / mã tính năng:** N34   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route bộ sưu tập.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế danh sách deal của một bộ sưu tập: ảnh bìa, tiêu đề, mô tả, thời gian hiệu lực, thẻ deal như Trang chủ có lọc và sắp xếp. Khi hết hiệu lực: "Bộ sưu tập đã kết thúc".

#### KX15 · Món đã nhận: nhắc dùng và bảo quản  (Chưa có)

- **UC / mã tính năng:** N74   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Có thể dựa trên orders đã nhận + hạn dùng từ TrustPass (cần BE xác nhận).
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn "Tủ đồ đã cứu" liệt kê món đã nhận: ảnh, tên, đồng hồ đếm ngược đến hạn dùng do cửa hàng khai báo, chip hướng dẫn bảo quản (chỉ hiện khi cửa hàng khai báo), nút "Nhắc tôi". Món thiếu hạn dùng ghi "Chưa có thông tin hạ…

#### KX16 · Chi tiêu và mục tiêu tháng  (Chưa có)

- **UC / mã tính năng:** N69   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Có thể tính từ transactions/impact; chưa có mục tiêu tháng.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn thống kê tháng: tiền tiết kiệm, số suất cứu, biểu đồ cột theo tuần, mục tiêu tháng tự đặt (ví dụ 8 suất) với vòng tiến độ. Không có chuỗi ngày ép buộc hay cảnh báo mất chuỗi. Nhãn "Ước tính" cho khối lượng thực phẩm.

#### KX17 · Tác động cộng đồng  (Chưa có)

- **UC / mã tính năng:** N70   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route tổng hợp cộng đồng.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn tổng hợp ẩn danh theo khu vực: số kg thực phẩm cứu trong tuần, số suất, số cửa hàng tham gia; biểu đồ theo ngày; không hiển thị người mua cụ thể; nút "Chia sẻ"; nhãn "Ước tính" mở giải thích công thức.

#### KX18 · Tặng suất  (Chưa có)

- **UC / mã tính năng:** N77   **Nguồn:** Đề xuất thêm
- **Hiện có trong app:** —
- **Backend:** Chưa thấy route tặng suất.
- **Việc cần làm:** Toàn bộ theo mô tả bên dưới. Ưu tiên thấp (mục "Đề xuất thêm", chưa nằm trong BRD gốc).
- **Mô tả thiết kế (nguyên văn):** Thiết kế màn tặng: chọn suất hoặc đơn, nhập tên người nhận và lời nhắn, tạo liên kết hoặc mã để người nhận dùng trong app của họ (mở rộng cơ chế nhận hộ); xem trước thiệp quà; trạng thái Chưa nhận, Đã nhận, Hết hạn; hạn nhận theo …

## 5. Việc kỹ thuật tồn đọng (không thuộc một màn cụ thể)

**Đã xử lý trong lần dọn này**

- Gỡ `data/mock/SampleData.kt` và mọi chỗ thay dữ liệu mẫu khi API lỗi: trước đây lỗi tải chi tiết deal vẫn trả về một deal giả "thành công" (có thể khiến khách đặt nhầm suất).
- Gỡ dữ liệu bịa trong `DiscoveryRepositoryImpl`: điểm sao 4,7/4,8, 98/120 đánh giá, dị ứng "Gluten, Sữa bò" gắn cho MỌI deal, khung nhận "Hôm nay 20:00–21:30", mô tả/"trong túi có gì" bịa, khoảng cách "1,2 km". Nay lấy từ API; thiếu thì để trống/ẩn.
- Việt hóa chuỗi tiếng Anh còn sót (nút "Reserve" → "Đặt giữ suất", màn Tùy chọn, tiêu đề tab Deal).
- Bỏ banner "Sắp hết giờ nhận" ở Trang chủ (trùng với mục cùng tên bên dưới), gọn header còn một hàng, bỏ khối "Đánh giá" lặp lại điểm sao ở chi tiết deal.
- Thêm làm mới token tự động (trước đây dùng quá 15 phút là bị báo "Vui lòng đăng nhập").

**Còn tồn đọng**

- Danh sách deal (`customer/deals`) không trả điểm đánh giá và dị ứng nên thẻ deal không hiện sao; nếu muốn hiện cần BE bổ sung trường.
- Các hàm API khai báo nhưng chưa có UI gọi: `getCustomerOrders`, `getDietaryProfile`/`updateDietaryProfile` (K58), `recordConsent` (K59), `getPaymentStatus`, `searchDealsWithAi` (K11). Hàm `refreshAccessToken` cũ đã xóa (được `TokenAuthenticator` thay thế).
- CO₂ giảm đang ước tính cứng 2,5 kg/kg ở `SurplusAppRoot.kt`.
- Thông báo đẩy FCM chưa nối (cần `google-services.json`); xem ghi chú `shortcut:` trong `SurplusAppRoot.kt`.
- Tải ảnh khiếu nại: BE chỉ nhận URL, chưa có API upload (ComplaintDetailScreen đang bắt khách dán URL). Cần BE thêm upload hoặc dùng bộ nhớ ngoài.
- Mật khẩu: app đang ghi "Từ 6 ký tự" nhưng tài liệu yêu cầu ≥ 8 ký tự có chữ và số; cần chốt rule với BE rồi sửa K02, K05, K54.
- Nên thêm kiểm thử: chưa thấy test cho ViewModel/Repository của app khách.
- Hai tên cũ dễ gây hiểu nhầm: `ForestGreenPrimary`, `SkyBlue*` (thực chất là cam). Nên đổi tên khi có dịp, không ảnh hưởng chức năng.

## 6. Cách nhận một màn để làm

1. Chọn mã màn ở mục 4, đọc "Mô tả thiết kế" và cột Backend. Nếu ghi "CHƯA có route", hỏi bên backend trước, đừng tự giả lập dữ liệu.
2. Dựng theo thứ tự: DTO + ApiService → Repository → ViewModel → Screen → thêm `AppDestination`.
3. Dùng sẵn component: `ui/components` (`DealCard`, `StateViews` gồm loading/lỗi/rỗng, `LoadStateContent`), màu từ `ui/theme/Color.kt`, bo góc 20–28dp, viền `DividerColor`.
4. Cần đủ 4 trạng thái: đang tải, lỗi (có nút Thử lại), rỗng, thành công. Mọi nút phải có hành vi thật.
5. Chạy thử trên emulator với backend thật và chụp màn hình để duyệt.