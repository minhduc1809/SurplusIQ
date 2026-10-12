# 06 — DANH MỤC CÔNG VIỆC TRIỂN KHAI (TASK BACKLOG)

> **Mục tiêu**: Bảng phân rã chi tiết toàn bộ các task kỹ thuật theo từng mốc (M0 đến M8).  
> **Quy chuẩn**: Bắt buộc tuân thủ [rule.md](../../rule.md) — mỗi task làm trên một nhánh chức năng riêng biệt, commit đúng cú pháp `type(scope): ...`, kiểm thử linter trước khi push.  
> **Ký hiệu kích thước**: S (1–2 giờ), M (0.5–1 ngày), L (2–3 ngày).

---

## Mốc M0: Thiết lập Nền móng Kỹ thuật & Chuẩn hóa Công cụ (Tooling)

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M0-01` | Cấu hình ESLint Flat Config, Prettier & script lint ở Root | `infra` | `feature/infra-eslint-setup` | `chore(infra): setup eslint flat config and prettier for monorepo` | S | Chạy `npm run lint` ở root kiểm tra được toàn bộ `packages/*` và `apps/*`. |
| `TASK-M0-02` | Cấu hình Husky & Commitlint kiểm soát thông điệp commit | `infra` | `feature/infra-commitlint-husky` | `chore(infra): enforce conventional commit format with husky` | S | Commit sai định dạng `feat:`, `update:`, `fix:` kèm scope bị chặn tại máy cục bộ. |
| `TASK-M0-03` | Sửa lỗi biên dịch Backend & Cấu hình TypeORM Migration | `back` | `fix/back-compilation-and-migrations` | `fix(back): fix missing entity imports and setup typeorm migrations` | M | Sửa các import lỗi trong `app.module.ts`, tắt `synchronize: true`, chạy được `npm run build`. |
| `TASK-M0-04` | Thiết lập bộ khung kiểm thử Jest / Vitest cho Core và Backend | `infra` | `feature/infra-testing-setup` | `chore(infra): configure jest and vitest runners` | S | Chạy `npm run test` thành công trên cả `packages/core` và `apps/backend`. |

---

## Mốc M1: Tái cấu trúc & Hoàn thiện Thư viện Lõi (`packages/core`)

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M1-01` | Sửa thuật toán `DynamicPricingEngine` chuẩn theo BRD | `core` | `feature/core-pricing-engine` | `feat(core): update dynamic pricing with floor price and 500 step` | M | Làm tròn bội 500, giá sàn 40%, chặn tối đa 3 lần đổi giá, đề xuất $\le$ giá hiện tại (BR-064). |
| `TASK-M1-02` | Sửa thuật toán `ForecastingEngine` chuẩn theo BRD | `core` | `feature/core-forecasting-engine` | `feat(core): update forecasting with dow average and fallback` | M | < 14 ngày dùng số hôm qua kèm cờ `LOW`, $\ge$ 14 ngày dùng trung bình thứ + sự kiện, bỏ thời tiết (Ch.13 #10). |
| `TASK-M1-03` | Cập nhật `QrTokenEngine` (HMAC không PII) & `BackupPinEngine` | `core` | `feature/core-qr-token-engine` | `feat(core): secure qr token without pii and backup pin generator` | S | Token không chứa buyerId (BR-022), sinh mã PIN 6 ký tự không nhập nhằng (loại bỏ `0, O, 1, I, L`). |
| `TASK-M1-04` | Xây dựng `ReconciliationEngine` tính toán đối soát tuần | `core` | `feature/core-reconciliation-engine` | `feat(core): implement weekly reconciliation calculation` | M | Tính chuẩn xác Gross, hoa hồng 10%, hoàn tiền khiếu nại, phí thuê bao và Net Payout (BR-075). |
| `TASK-M1-05` | Xây dựng `CustomerSegmentationEngine` phân nhóm quy tắc | `core` | `feature/core-segmentation-engine` | `feat(core): rule-based customer segmentation engine` | S | Phân 4 nhóm Mới, Thân thiết, Rời bỏ, Hay không đến nhận (chỉ chạy khi $\ge 20$ khách theo 12.19.1). |
| `TASK-M1-06` | Xây dựng `AnomalyDetectionEngine` phát hiện bất thường | `core` | `feature/core-anomaly-engine` | `feat(core): anomaly detection using median and mad baseline` | M | Cần $\ge 28$ ngày dữ liệu, loại ngày nghỉ/sự kiện, phát hiện lệch $> 2.5 \times \text{MAD}$ (BR-096). |
| `TASK-M1-07` | Viết 100% Unit Test cho toàn bộ engines của `packages/core` | `core` | `test/core-full-unit-tests` | `test(core): add comprehensive unit test suite covering all engines` | M | Đạt coverage $\ge 90\%$ dòng, test đủ các ca biên giá sàn, hết hạn, cold-start. |

---

## Mốc M2: Backend Nền tảng, CSDL & Phân quyền 3 Lớp (`apps/backend`)

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M2-01` | Khởi tạo CSDL Migration PostGIS & TypeORM Entities | `back` | `feature/back-database-migrations` | `feat(back): generate initial typeorm migrations for postgis schema` | L | Tạo đủ các bảng theo kế hoạch 01, có GIST index vị trí và ràng buộc CHECK. |
| `TASK-M2-02` | Xây dựng `SettingsService` quản lý bảng tham số | `back` | `feature/back-settings-service` | `feat(back): settings service for platform and store parameters` | S | Đọc tham số có cache Redis, không hard-code con số nghiệp vụ trong code. |
| `TASK-M2-03` | Xây dựng `AuthModule` (Khách & Cửa hàng, OTP, JWT, 2FA) | `back` | `feature/back-auth-module` | `feat(back): authentication for customer and store with otp and jwt` | L | Tách kênh (Khách cấm web, Chủ cấm app theo 9.1), OTP 6 số 5 phút, khóa 15 phút sau 5 lần sai. |
| `TASK-M2-04` | Xây dựng hệ thống Guards phân quyền 3 lớp & Hạn mức gói | `back` | `feature/back-rbac-quota-guards` | `feat(back): three-tier rbac guard and subscription quota guard` | M | Lớp 1 (Role) $\to$ Lớp 2 (Store Permission: Owner/Manager/Counter) $\to$ Lớp 3 (Gói & Hạn mức). |
| `TASK-M2-05` | Xây dựng `AuditLogModule` & `IdempotencyInterceptor` | `back` | `feature/back-audit-idempotency` | `feat(back): audit logging and idempotency interceptor` | M | Lưu vết thay đổi nhạy cảm (12 tháng), kiểm soát header `Idempotency-Key` chống lặp (BR-015). |

---

## Mốc M3: Vòng lặp Giao dịch Cốt lõi P0 (`apps/backend`)

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M3-01` | Xây dựng `CatalogModule` quản lý danh mục món | `back` | `feature/back-catalog-items` | `feat(back): item catalog management with soft archive` | M | CRUD món, lưu trữ không xóa vật lý (BR-051), khai báo thành phần dị ứng. |
| `TASK-M3-02` | Xây dựng `OffersModule` quản lý suất bán & tồn kho | `back` | `feature/back-offers-management` | `feat(back): daily offers management with floor price validation` | M | Tạo suất kiểm tra giá sàn, giới hạn 20 suất/ngày với gói Cơ bản (BR-054), điều chỉnh tồn ghi lý do. |
| `TASK-M3-03` | Xây dựng `OrdersModule` với UPDATE có điều kiện chống bán vượt | `back` | `feature/back-orders-concurrency` | `feat(back): atomic hold orders with 10min timer and price lock` | L | Giữ suất 10 phút, trừ tồn nguyên tử bằng UPDATE có điều kiện, khóa giá chốt, chặn khách bị phạt (BR-020). |
| `TASK-M3-04` | Xây dựng `PaymentsModule` giả lập VietQR & Xác nhận thanh toán | `back` | `feature/back-payments-module` | `feat(back): simulated vietqr payment and idempotent confirmation` | M | Tạo giao dịch, xác nhận khớp tiền, webhook giả lập, hoàn tiền tự động khi thanh toán muộn (R1-047). |
| `TASK-M3-05` | Cấu hình BullMQ Jobs nhả suất 10 phút & Quá hạn nhận | `back` | `feature/back-bullmq-jobs` | `feat(back): background jobs for releasing expired holds and pickups` | M | Nhả suất trả tồn kho sau 10 phút (BR-017), chuyển `PICKUP_EXPIRED` và tăng bộ đếm noshow. |
| `TASK-M3-06` | Xây dựng API Quét nhận hàng QR & Mã dự phòng 6 số | `back` | `feature/back-pickup-verification` | `feat(back): pickup verification via hmac qr and 6-char backup pin` | M | Quét thành công chuyển `PICKED_UP` một lần duy nhất, hỗ trợ PIN 6 số, kiểm tra khung giờ + 15 phút. |
| `TASK-M3-07` | Viết kịch bản Concurrency Stress Test 100 request tranh 1 suất | `back` | `test/back-concurrency-stress-test` | `test(back): concurrency race-condition test for overselling prevention` | M | Chạy test: đúng 1 đơn 201 Created, 99 đơn 400 Bad Request, tồn kho bằng đúng 0, không âm. |

---

## Mốc M4: Web Quản trị Tiệm Bánh P0 (`apps/web`)

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M4-01` | Khởi tạo Khung Web App, Router, AuthContext & RoleGuard | `web` | `feature/web-shell-and-auth` | `feat(web): app shell router authcontext and permission guards` | M | Đăng nhập/Đăng ký cửa hàng, điều hướng menu thích ứng theo 3 nhóm quyền (Owner/Manager/Counter). |
| `TASK-M4-02` | Màn hình Quản lý Danh mục món ăn (`/catalog`) | `web` | `feature/web-catalog-page` | `feat(web): item catalog page with create edit and archive` | M | Danh sách món, form tạo món có khai báo dị ứng, nút lưu trữ/khôi phục. |
| `TASK-M4-03` | Màn hình Quản lý Suất bán & Tồn kho (`/offers`) | `web` | `feature/web-offers-page` | `feat(web): daily offers page with real-time stock and floor check` | M | Đăng suất kiểm tra giá sàn, thanh đo tồn kho, nút điều chỉnh tồn có lý do, hủy suất hoàn tiền. |
| `TASK-M4-04` | Màn hình Quét QR nhận hàng & Bàn phím PIN (`/pickup`) | `web` | `feature/web-qr-pickup-scanner` | `feat(web): webrtc qr camera scanner and numpad backup pin` | L | Camera WebRTC quét QR nhạy, bàn phím số to rõ nhập PIN 6 số, hiển thị tên khách che chữ cái đầu. |
| `TASK-M4-05` | Màn hình Danh sách Đơn hàng & Lịch hẹn (`/orders`) | `web` | `feature/web-orders-page` | `feat(web): orders management and daily pickup schedule` | M | Lọc theo ngày/trạng thái, hiển thị lịch hẹn nhận theo mốc 15 phút, tên khách rút gọn (BR-068). |
| `TASK-M4-06` | Màn hình Báo cáo Đối soát & Sao kê tuần (`/reconciliation`) | `web` | `feature/web-reconciliation-page` | `feat(web): weekly immutable statement page with pdf export` | M | Bảng sao kê tuần bất biến, khấu trừ 10% hoa hồng, nút tải tệp PDF và CSV. |

---

## Mốc M5: App Android Khách Hàng P0 (`apps/android`)

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M5-01` | Cấu hình Navigation, Theme, Đăng ký & Xác thực OTP | `app` | `feature/app-auth-navigation` | `feat(app): compose navigation theme and otp verification screen` | M | Đăng ký SĐT/Email, nhập OTP 6 số đếm ngược 5 phút, lưu JWT và Refresh Token. |
| `TASK-M5-02` | Màn hình Khám phá Deal theo Bán kính GPS (`DealListScreen`) | `app` | `feature/app-deal-discovery` | `feat(app): deal discovery screen with postgis radius query` | L | Lấy GPS, lọc bán kính (1, 3, 5, 10km), danh sách deal thẻ có cảnh báo dị ứng trùng hồ sơ. |
| `TASK-M5-03` | Màn hình Giữ suất & Đếm ngược 10 phút (`OrderHoldScreen`) | `app` | `feature/app-order-hold-checkout` | `feat(app): order hold screen with 10-minute animated countdown` | M | Gọi API giữ suất kèm `Idempotency-Key`, thanh đếm ngược 10 phút, hiển thị giá khóa cố định. |
| `TASK-M5-04` | Màn hình Thanh toán VietQR Mô phỏng | `app` | `feature/app-vietqr-payment` | `feat(app): simulated vietqr payment screen with transfer syntax` | S | Hiển thị mã QR ngân hàng, số tiền, cú pháp `SUQ<ORDER_ID>`, nút xác nhận chuyển khoản. |
| `TASK-M5-05` | Màn hình Vé Nhận Hàng (`QrPickupPassScreen`) | `app` | `feature/app-pickup-pass-screen` | `feat(app): pickup pass screen with max brightness and backup pin` | M | Tự tăng độ sáng cực đại, hiển thị QR Token HMAC offline từ Room DB, hiện mã PIN 6 số to rõ. |

---

## Mốc M6: Phân hệ Vận hành & Hậu mãi P1

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M6-01` | Phân hệ Khiếu nại 24h & Cửa hàng xử lý 48h | `back`, `web`, `app` | `feature/all-complaints-module` | `feat(all): complaints management with 24h window and 48h sla` | L | Khách gửi khiếu nại kèm 3 ảnh trong 24h; Tiệm phản hồi 48h, quá hạn tự hoàn 100% (BR-071). |
| `TASK-M6-02` | Phân hệ Đánh giá 1–5 sao & Tiệm phản hồi công khai | `back`, `web`, `app` | `feature/all-reviews-module` | `feat(all): ratings and reviews with public store response` | M | Đánh giá đơn đã nhận, sửa trong 24h, tiệm phản hồi công khai, ẩn đánh giá không xóa vật lý. |
| `TASK-M6-03` | Quản lý Gói dịch vụ & 11 Quy tắc Vòng đời (VC-01..VC-11) | `back`, `web` | `feature/back-web-subscription-lifecycle` | `feat(back,web): subscription packages and lifecycle rules vc01-11` | L | Tự kích hoạt dùng thử 1 tháng, gia hạn, hết hạn chuyển Cơ bản, theo dõi hạn mức tháng. |
| `TASK-M6-04` | Phân hệ Dự báo số lượng làm bánh ngày mai (Gói Pro) | `back`, `web` | `feature/all-pro-forecasting` | `feat(all): daily forecast dashboard with dow average and override` | L | Job tính dự báo 22:00, giao diện web duyệt/ghi đè số lượng, nhập số thực tế cuối ngày (48h). |
| `TASK-M6-05` | Phân hệ Đề xuất Định giá theo giờ (Gói Pro) | `back`, `web` | `feature/all-pro-dynamic-pricing` | `feat(all): hourly dynamic pricing proposals with auto mode` | M | Đề xuất giá hiệu lực 15 phút, duyệt tay hoặc chế độ tự động, lưu lịch sử quyết định giá. |
| `TASK-M6-06` | Quản lý Nhân viên & Phân quyền cửa hàng (Mời qua email) | `back`, `web` | `feature/back-web-staff-management` | `feat(back,web): staff invitations and role assignment` | M | Mời nhân viên bằng email (link 72h), đổi nhóm quyền (Manager/Counter), giới hạn 1 nv ở gói Cơ bản. |

---

## Mốc M7: Tăng trưởng, Khách hàng & Mô phỏng P2

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M7-01` | Phân hệ Ưu đãi & Chiến dịch gửi khách thân thiết | `back`, `web`, `app` | `feature/all-promotions-campaigns` | `feat(all): discount promotions and scheduled campaigns` | L | Tạo ưu đãi không thấp hơn giá sàn, gửi chiến dịch theo lịch, chặn gửi đêm 22:00–07:00 (BR-086). |
| `TASK-M7-02` | Phân hệ Túi Bất Ngờ (Surprise Bag) thanh lý cuối ngày | `back`, `web`, `app` | `feature/all-surprise-bags` | `feat(all): surprise bags with mandatory allergen disclosure` | M | Gộp nhiều món dư giá cố định, bắt buộc khai báo thành phần/dị ứng có thể có (BR-085). |
| `TASK-M7-03` | Phân hệ Khách hàng của quán & Phân nhóm quy tắc | `back`, `web` | `feature/back-web-customer-segments` | `feat(back,web): store customer insights and rule-based segments` | M | Danh sách khách ẩn danh (chữ cái đầu), phân nhóm Mới/Thân thiết/Rời bỏ (khi $\ge 20$ khách). |
| `TASK-M7-04` | Cải tiến Bộ Mô phỏng Benchmark 4 Chế độ (`apps/simulation`) | `simulation` | `feature/simulation-seeded-benchmark` | `feat(simulation): seeded prng and price elasticity simulation` | M | Tích hợp Seeded PRNG (Mulberry32) tái lập 100%, tách biệt đường cong co giãn cầu, in disclaimer. |

---

## Mốc M8: Tích hợp AI Gemini Có Kiểm soát (AI Gateway)

| Mã Task | Tên công việc | Scope | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|
| `TASK-M8-01` | Xây dựng `AiGatewayService` bảo mật & Kiểm soát Schema | `back` | `feature/back-ai-gateway-proxy` | `feat(back): secure ai gateway proxy with tenant scoping and timeout` | M | Ràng buộc `store_id` ở cấp SQL chống rò rỉ dữ liệu, timeout 10s fallback, kiểm soát hạn mức gọi. |
| `TASK-M8-02` | Trợ lý AI cho Chủ quán (Hỏi đáp số liệu, Tóm tắt tuần) | `back`, `web` | `feature/all-store-ai-assistant` | `feat(all): store ai assistant for business qna and weekly summary` | L | Hỏi đáp dữ liệu cửa hàng, tóm tắt báo cáo tuần (R2-111), gợi ý soạn mô tả món từ ảnh (R2-021). |
| `TASK-M8-03` | Trợ lý "Cứu Món" cho Khách hàng (Tìm deal tự nhiên) | `back`, `app` | `feature/all-customer-savebite-ai` | `feat(all): customer savebite ai assistant with natural language search` | L | Tìm deal bằng câu nói, hỏi thành phần/dị ứng (chỉ trích dẫn dữ liệu tiệm khai báo theo BR-038). |
