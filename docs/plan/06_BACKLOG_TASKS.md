# 06 — DANH MỤC CÔNG VIỆC TRIỂN KHAI (TASK BACKLOG)

> **Mục tiêu**: Bảng phân rã chi tiết toàn bộ các task kỹ thuật theo từng mốc (M0 đến M8) bao phủ trọn vẹn **220 Use Cases** (94 Khách hàng `R1-001`..`R1-094` + 126 Cửa hàng `R2-001`..`R2-126`) và **11 quy tắc vòng đời gói** (`VC-01`..`VC-11`).  
> **Quy chuẩn**: Bắt buộc tuân thủ [rule.md](../../rule.md) — mỗi task làm trên một nhánh chức năng riêng biệt tách từ `development`, commit đúng cú pháp `type(scope): ...`, kiểm thử linter trước khi push.  
> **Ký hiệu kích thước**: S (1–2 giờ), M (0.5–1 ngày), L (2–3 ngày).

---

## Mốc M0: Thiết lập Nền móng Kỹ thuật & Chuẩn hóa Công cụ (Tooling)

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) & Trạng thái |
|---|---|---|---|---|---|---|---|
| `TASK-M0-01` | Cấu hình ESLint Flat Config, Prettier & script lint ở Root | `infra` | N/A (Infra) | `feature/infra-eslint-setup` | `chore(infra): setup eslint flat config and prettier for monorepo` | S | Chạy `npm run lint` ở root kiểm tra sạch toàn bộ `packages/*` và `apps/*`.<br>✅ **[Đã hoàn thành]** (Commit `bad7caa`, merge `77d46d3`) |
| `TASK-M0-02` | Cấu hình Git Hooks (`.githooks/`) & Commitlint kiểm soát thông điệp commit | `infra` | N/A (Infra) | `feature/infra-commitlint-husky` | `chore(infra): enforce conventional commit format with husky` | S | Chặn commit sai cú pháp `type(scope): ...` và chặn commit trực tiếp lên `main`/`development`.<br>✅ **[Đã hoàn thành]** (Commit `60a2fa4`, `af696fe`, `5d3a5b4`) |
| `TASK-M0-03` | Sửa lỗi biên dịch Backend & Cấu hình TypeORM Migration | `back` | N/A (Infra) | `fix/back-compilation-and-migrations` | `fix(back): fix missing entity imports and setup typeorm migrations` | M | Sửa import entity, tắt `synchronize: true`, tách riêng `data-source.ts`, `nest build` pass.<br>✅ **[Đã hoàn thành]** (Commit `39ee326`, merge `a05e6d7`) |
| `TASK-M0-04` | Thiết lập bộ khung kiểm thử Jest / Vitest cho Core và Backend | `infra` | N/A (Infra) | `feature/infra-testing-setup` | `chore(infra): configure jest and vitest runners` | S | Chạy `npm run test` thành công trên cả `packages/core` (Vitest) và `apps/backend` (Jest).<br>✅ **[Đã hoàn thành]** (Commit `2ac7335`, merge `0c16e18` & `690cce8`, merge `65cb259`) |
| `TASK-M0-05` | Thiết lập GitHub Actions CI Pipeline (`.github/workflows/ci.yml`) | `infra` | N/A (Infra) | `feature/infra-ci-and-m0-status` | `chore(infra): add github actions ci workflow and mark m0 completed` | S | Tự động chạy `lint`, `test`, `build` mỗi khi push / mở PR vào `main` hoặc `development`.<br>✅ **[Đã hoàn thành]** |

---

## Mốc M1: Tái cấu trúc & Hoàn thiện Thư viện Lõi (`packages/core`)

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M1-01` | Sửa thuật toán `DynamicPricingEngine` chuẩn theo BRD | `core` | `R2-044`, `R2-046`, `R2-047`, BR-064, BR-065 | `feature/core-pricing-engine` | `feat(core): update dynamic pricing with floor price and 500 step` | M | Làm tròn bội 500, giá sàn 40%, chặn tối đa 3 lần đổi giá, đề xuất $\le$ giá hiện tại (BR-064). |
| `TASK-M1-02` | Sửa thuật toán `ForecastingEngine` chuẩn theo BRD | `core` | `R2-036`, `R2-037`, `R2-041`, `R2-042`, `R2-043`, BR-060 | `feature/core-forecasting-engine` | `feat(core): update forecasting with dow average and fallback` | M | < 14 ngày dùng số hôm qua kèm cờ `LOW`, $\ge$ 14 ngày dùng trung bình thứ + sự kiện, bỏ thời tiết (Ch.13 #10). |
| `TASK-M1-03` | Cập nhật `QrTokenEngine` (HMAC không PII) & `BackupPinEngine` | `core` | `R1-057`, `R2-052`, BR-022 | `feature/core-qr-token-engine` | `feat(core): secure qr token without pii and backup pin generator` | S | Token không chứa buyerId (BR-022), sinh mã PIN 6 ký tự không nhập nhằng (loại bỏ `0, O, 1, I, L`). |
| `TASK-M1-04` | Xây dựng `ReconciliationEngine` tính toán đối soát tuần | `core` | `R2-063`, `R2-066`, `R2-067`, `VC-10`, BR-075 | `feature/core-reconciliation-engine` | `feat(core): implement weekly reconciliation calculation` | M | Tính chuẩn xác Gross, hoa hồng 10%, hoàn tiền khiếu nại, phí thuê bao và Net Payout (BR-075). |
| `TASK-M1-05` | Xây dựng `CustomerSegmentationEngine` phân nhóm quy tắc | `core` | `R2-084`, `R2-087` | `feature/core-segmentation-engine` | `feat(core): rule-based customer segmentation engine` | S | Phân 4 nhóm Mới, Thân thiết, Rời bỏ, Hay không đến nhận (chỉ chạy khi $\ge 20$ khách theo 12.19.1). |
| `TASK-M1-06` | Xây dựng `AnomalyDetectionEngine` phát hiện bất thường | `core` | `R2-099`, `R2-112`, BR-096 | `feature/core-anomaly-engine` | `feat(core): anomaly detection using median and mad baseline` | M | Cần $\ge 28$ ngày dữ liệu, loại ngày nghỉ/sự kiện, phát hiện lệch $> 2.5 \times \text{MAD}$ (BR-096). |
| `TASK-M1-07` | Viết 100% Unit Test cho toàn bộ engines của `packages/core` | `core` | Core Unit Tests | `test/core-full-unit-tests` | `test(core): add comprehensive unit test suite covering all engines` | M | Đạt coverage $\ge 90\%$ dòng, test đủ các ca biên giá sàn, hết hạn, cold-start. |

---

## Mốc M2: Backend Nền tảng, CSDL & Phân quyền 3 Lớp (`apps/backend`)

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M2-01` | Khởi tạo CSDL Migration PostGIS & TypeORM Entities | `back` | Toàn bộ 45 bảng thực thể | `feature/back-database-migrations` | `feat(back): generate initial typeorm migrations for postgis schema` | L | Tạo đủ các bảng theo kế hoạch 01, có GIST index vị trí và ràng buộc CHECK. |
| `TASK-M2-02` | Xây dựng `SettingsService` quản lý bảng tham số | `back` | `R2-007`, `R2-101`, `R2-102` | `feature/back-settings-service` | `feat(back): settings service for platform and store parameters` | S | Đọc tham số có cache Redis, không hard-code con số nghiệp vụ trong code. |
| `TASK-M2-03` | Xây dựng `AuthModule` (Khách & Cửa hàng, OTP, JWT, 2FA) | `back` | `R1-001`..`R1-004`, `R1-007`, `R1-008`, `R1-013`, `R1-014`, `R2-001`..`R2-004` | `feature/back-auth-module` | `feat(back): authentication for customer and store with otp and jwt` | L | Tách kênh (Khách cấm web, Chủ cấm app theo 9.1), OTP 6 số 5 phút, khóa 15 phút sau 5 lần sai. |
| `TASK-M2-04` | Xây dựng hệ thống Guards phân quyền 3 lớp & Hạn mức gói | `back` | `R2-011`, `R2-016`, `R2-076`..`R2-081`, `VC-01`..`VC-11` | `feature/back-rbac-quota-guards` | `feat(back): three-tier rbac guard and subscription quota guard` | M | Lớp 1 (Role) $\to$ Lớp 2 (Store Permission: Owner/Manager/Counter) $\to$ Lớp 3 (Gói & Hạn mức). |
| `TASK-M2-05` | Xây dựng `AuditLogModule` & `IdempotencyInterceptor` | `back` | `R1-040`, `R2-075`, BR-015 | `feature/back-audit-idempotency` | `feat(back): audit logging and idempotency interceptor` | M | Lưu vết thay đổi nhạy cảm (12 tháng), kiểm soát header `Idempotency-Key` chống lặp (BR-015). |

---

## Mốc M3: Vòng lặp Giao dịch Cốt lõi P0 (`apps/backend`)

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M3-01` | Xây dựng `CatalogModule` quản lý danh mục món | `back` | `R2-017`..`R2-024` | `feature/back-catalog-items` | `feat(back): item catalog management with soft archive` | M | CRUD món, lưu trữ không xóa vật lý (BR-051), khai báo thành phần dị ứng. |
| `TASK-M3-02` | Xây dựng `OffersModule` quản lý suất bán & tồn kho | `back` | `R2-026`..`R2-035` | `feature/back-offers-management` | `feat(back): daily offers management with floor price validation` | M | Tạo suất kiểm tra giá sàn, giới hạn 20 suất/ngày với gói Cơ bản (BR-054), điều chỉnh tồn ghi lý do. |
| `TASK-M3-03` | Xây dựng `OrdersModule` với UPDATE có điều kiện chống bán vượt | `back` | `R1-040`, `R1-043`, `R1-044`, `R1-046`, `R1-048`, `R1-055`, `R2-049`, `R2-051`, `R2-053` | `feature/back-orders-concurrency` | `feat(back): atomic hold orders with 10min timer and price lock` | L | Giữ suất 10 phút, trừ tồn nguyên tử bằng UPDATE có điều kiện, khóa giá chốt, chặn khách bị phạt (BR-020). |
| `TASK-M3-04` | Xây dựng `PaymentsModule` giả lập VietQR & Xác nhận thanh toán | `back` | `R1-041`, `R1-047`, `R1-056`, `VC-07`, `VC-10` | `feature/back-payments-module` | `feat(back): simulated vietqr payment and idempotent confirmation` | M | Tạo giao dịch, xác nhận khớp tiền, webhook giả lập, hoàn tiền tự động khi thanh toán muộn (R1-047). |
| `TASK-M3-05` | Cấu hình BullMQ Jobs nhả suất 10 phút & Quá hạn nhận | `back` | `R1-042`, `R1-059`, `R2-034` | `feature/back-bullmq-jobs` | `feat(back): background jobs for releasing expired holds and pickups` | M | Nhả suất trả tồn kho sau 10 phút (BR-017), chuyển `PICKUP_EXPIRED` và tăng bộ đếm noshow. |
| `TASK-M3-06` | Xây dựng API Quét nhận hàng QR & Mã dự phòng 6 số | `back` | `R1-057`, `R1-058`, `R2-052` | `feature/back-pickup-verification` | `feat(back): pickup verification via hmac qr and 6-char backup pin` | M | Quét thành công chuyển `PICKED_UP` một lần duy nhất, hỗ trợ PIN 6 số, kiểm tra khung giờ + 15 phút. |
| `TASK-M3-07` | Viết kịch bản Concurrency Stress Test 100 request tranh 1 suất | `back` | Kiểm thử tranh chấp tồn kho P0 | `test/back-concurrency-stress-test` | `test(back): concurrency race-condition test for overselling prevention` | M | Chạy test: đúng 1 đơn 201 Created, 99 đơn 400 Bad Request, tồn kho bằng đúng 0, không âm. |

---

## Mốc M4: Web Quản trị Tiệm Bánh P0 (`apps/web`)

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M4-01` | Khởi tạo Khung Web App, Router, AuthContext & RoleGuard | `web` | `R2-001`..`R2-003`, `R2-005`..`R2-007`, `R2-011`, `R2-016` | `feature/web-shell-and-auth` | `feat(web): app shell router authcontext and permission guards` | M | Đăng nhập/Đăng ký cửa hàng, điều hướng menu thích ứng theo 3 nhóm quyền (Owner/Manager/Counter). |
| `TASK-M4-02` | Màn hình Quản lý Danh mục món ăn (`/catalog`) | `web` | `R2-017`..`R2-024` | `feature/web-catalog-page` | `feat(web): item catalog page with create edit and archive` | M | Danh sách món, form tạo món có khai báo dị ứng, nút lưu trữ/khôi phục. |
| `TASK-M4-03` | Màn hình Quản lý Suất bán & Tồn kho (`/offers`) | `web` | `R2-026`..`R2-035` | `feature/web-offers-page` | `feat(web): daily offers page with real-time stock and floor check` | M | Đăng suất kiểm tra giá sàn, thanh đo tồn kho, nút điều chỉnh tồn có lý do, hủy suất hoàn tiền. |
| `TASK-M4-04` | Màn hình Quét QR nhận hàng & Bàn phím PIN (`/pickup`) | `web` | `R2-052` | `feature/web-qr-pickup-scanner` | `feat(web): webrtc qr camera scanner and numpad backup pin` | L | Camera WebRTC quét QR nhạy, bàn phím số to rõ nhập PIN 6 số, hiển thị tên khách che chữ cái đầu. |
| `TASK-M4-05` | Màn hình Danh sách Đơn hàng & Lịch hẹn (`/orders`) | `web` | `R2-049`, `R2-051`, `R2-053` | `feature/web-orders-page` | `feat(web): orders management and daily pickup schedule` | M | Lọc theo ngày/trạng thái, hiển thị lịch hẹn nhận theo mốc 15 phút, tên khách rút gọn (BR-068). |
| `TASK-M4-06` | Màn hình Báo cáo Đối soát & Sao kê tuần (`/reconciliation`) | `web` | `R2-063`, `R2-066`, `R2-067` | `feature/web-reconciliation-page` | `feat(web): weekly immutable statement page with pdf export` | M | Bảng sao kê tuần bất biến, khấu trừ 10% hoa hồng, nút tải tệp PDF và CSV. |

---

## Mốc M5: App Android Khách Hàng P0 (`apps/android`)

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M5-01` | Cấu hình Navigation, Theme, Đăng ký & Xác thực OTP | `app` | `R1-001`..`R1-004` | `feature/app-auth-navigation` | `feat(app): compose navigation theme and otp verification screen` | M | Đăng ký SĐT/Email, nhập OTP 6 số đếm ngược 5 phút, lưu JWT và Refresh Token. |
| `TASK-M5-02` | Màn hình Khám phá Deal theo Bán kính GPS (`DealListScreen`) | `app` | `R1-009`, `R1-020`, `R1-023`..`R1-027` | `feature/app-deal-discovery` | `feat(app): deal discovery screen with postgis radius query` | L | Lấy GPS, lọc bán kính (1, 3, 5, 10km), danh sách deal thẻ có cảnh báo dị ứng trùng hồ sơ. |
| `TASK-M5-03` | Màn hình Giữ suất & Đếm ngược 10 phút (`OrderHoldScreen`) | `app` | `R1-040`, `R1-042`..`R1-044`, `R1-046`, `R1-048`, `R1-055` | `feature/app-order-hold-checkout` | `feat(app): order hold screen with 10-minute animated countdown` | M | Gọi API giữ suất kèm `Idempotency-Key`, thanh đếm ngược 10 phút, hiển thị giá khóa cố định. |
| `TASK-M5-04` | Màn hình Thanh toán VietQR Mô phỏng | `app` | `R1-041`, `R1-047`, `R1-056` | `feature/app-vietqr-payment` | `feat(app): simulated vietqr payment screen with transfer syntax` | S | Hiển thị mã QR ngân hàng, số tiền, cú pháp `SUQ<ORDER_ID>`, nút xác nhận chuyển khoản. |
| `TASK-M5-05` | Màn hình Vé Nhận Hàng (`QrPickupPassScreen`) | `app` | `R1-057`, `R1-058`, `R1-059` | `feature/app-pickup-pass-screen` | `feat(app): pickup pass screen with max brightness and backup pin` | M | Tự tăng độ sáng cực đại, hiển thị QR Token HMAC offline từ Room DB, hiện mã PIN 6 số to rõ. |

---

## Mốc M6: Phân hệ Vận hành & Hậu mãi P1

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M6-01` | Phân hệ Khiếu nại 24h & Cửa hàng xử lý 48h | `back`, `web`, `app` | `R1-061`..`R1-063`, `R1-067`, `R1-068`, `R2-054`..`R2-056`, `R2-059`, `R2-060` | `feature/all-complaints-module` | `feat(all): complaints management with 24h window and 48h sla` | L | Khách gửi khiếu nại kèm 3 ảnh trong 24h; Tiệm phản hồi 48h, quá hạn tự hoàn 100% (BR-071). |
| `TASK-M6-02` | Phân hệ Đánh giá 1–5 sao & Tiệm phản hồi công khai | `back`, `web`, `app` | `R1-064`, `R1-065`, `R2-057`, `R2-058` | `feature/all-reviews-module` | `feat(all): ratings and reviews with public store response` | M | Đánh giá đơn đã nhận, sửa trong 24h, tiệm phản hồi công khai, ẩn đánh giá không xóa vật lý. |
| `TASK-M6-03` | Quản lý Gói dịch vụ & 11 Quy tắc Vòng đời (VC-01..VC-11) | `back`, `web` | `R2-011`..`R2-016`, `VC-01`..`VC-11` | `feature/back-web-subscription-lifecycle` | `feat(back,web): subscription packages and lifecycle rules vc01-11` | L | Tự kích hoạt dùng thử 1 tháng, gia hạn, hết hạn chuyển Cơ bản, theo dõi hạn mức tháng. |
| `TASK-M6-04` | Phân hệ Dự báo số lượng làm bánh ngày mai (Gói Pro) | `back`, `web` | `R2-036`..`R2-043` | `feature/all-pro-forecasting` | `feat(all): daily forecast dashboard with dow average and override` | L | Job tính dự báo 22:00, giao diện web duyệt/ghi đè số lượng, nhập số thực tế cuối ngày (48h). |
| `TASK-M6-05` | Phân hệ Đề xuất Định giá theo giờ (Gói Pro) | `back`, `web` | `R2-008`, `R2-044`..`R2-048` | `feature/all-pro-dynamic-pricing` | `feat(all): hourly dynamic pricing proposals with auto mode` | M | Đề xuất giá hiệu lực 15 phút, duyệt tay hoặc chế độ tự động, lưu lịch sử quyết định giá. |
| `TASK-M6-06` | Quản lý Nhân viên & Phân quyền cửa hàng (Mời qua email) | `back`, `web` | `R2-076`..`R2-081` | `feature/back-web-staff-management` | `feat(back,web): staff invitations and role assignment` | M | Mời nhân viên bằng email (link 72h), đổi nhóm quyền (Manager/Counter), giới hạn 1 nv ở gói Cơ bản. |
| `TASK-M6-07` | App Khách hàng: Hồ sơ, Bảo mật, Đặt nâng cao & Hỗ trợ | `app` | `R1-005`..`R1-008`, `R1-010`, `R1-013`..`R1-015`, `R1-021`, `R1-022`, `R1-028`, `R1-029`, `R1-038`, `R1-045`, `R1-049`..`R1-051`, `R1-054`, `R1-060`, `R1-069`..`R1-075`, `R1-077`..`R1-080` | `feature/app-p1-features` | `feat(app): profile 2fa saved stores map and support tickets` | L | Bản đồ Compose, lưu 50 yêu thích, 2FA, hẹn giờ 15p, tải PDF biên nhận, ticket hỗ trợ. |
| `TASK-M6-08` | Web Cửa hàng: Vận hành thường nhật, Lịch hẹn & Báo cáo nâng cao | `web` | `R2-004`, `R2-009`, `R2-010`, `R2-025`, `R2-029`, `R2-050`, `R2-061`, `R2-062`, `R2-064`, `R2-068`..`R2-075`, `R2-095`..`R2-098`, `R2-101`, `R2-102`, `R2-106`, `R2-107`, `R2-121` | `feature/web-p1-operations` | `feat(web): daily tasks schedule reports audit log and donation hints` | L | Bảng việc hôm nay, lịch hẹn 15p, báo cáo theo món/giờ, tạm ngưng quán, gợi ý từ thiện. |

---

## Mốc M7: Tăng trưởng, Khách hàng & Mô phỏng P2

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M7-01` | Phân hệ Ưu đãi & Chiến dịch gửi khách thân thiết | `back`, `web`, `app` | `R1-053`, `R1-078`..`R1-080`, `R2-088`..`R2-090`, `R2-092`..`R2-094` | `feature/all-promotions-campaigns` | `feat(all): discount promotions and scheduled campaigns` | L | Tạo ưu đãi không thấp hơn giá sàn, gửi chiến dịch theo lịch, chặn gửi đêm 22:00–07:00 (BR-086). |
| `TASK-M7-02` | Phân hệ Túi Bất Ngờ (Surprise Bag) thanh lý cuối ngày | `back`, `web`, `app` | `R1-026`, `R2-091` | `feature/all-surprise-bags` | `feat(all): surprise bags with mandatory allergen disclosure` | M | Gộp nhiều món dư giá cố định, bắt buộc khai báo thành phần/dị ứng có thể có (BR-085). |
| `TASK-M7-03` | Phân hệ Khách hàng của quán & Phân nhóm quy tắc | `back`, `web` | `R2-082`..`R2-087` | `feature/back-web-customer-segments` | `feat(back,web): store customer insights and rule-based segments` | M | Danh sách khách ẩn danh (chữ cái đầu), phân nhóm Mới/Thân thiết/Rời bỏ (khi $\ge 20$ khách). |
| `TASK-M7-04` | App Khách hàng: Tiện ích Thông minh, Ăn uống & Tác động | `app` | `R1-011`, `R1-012`, `R1-016`..`R1-019`, `R1-030`..`R1-037`, `R1-039`, `R1-052`, `R1-066`, `R1-076`, `R1-081`, `R1-093` | `feature/app-p2-smart-features` | `feat(app): dietary profile deal alerts badges and impact stats` | L | Hồ sơ dị ứng, cảnh báo deal theo điều kiện, mã nhận hộ 8 ký tự, thống kê kg thực phẩm cứu được. |
| `TASK-M7-05` | Web Cửa hàng: Mô phỏng chính sách, Demo & Xuất dữ liệu | `web` | `R2-065`, `R2-099`, `R2-100`, `R2-103`, `R2-104`, `R2-105` | `feature/web-p2-simulation-export` | `feat(web): policy simulation batch updates demo mode and data export` | M | Chế độ demo 2 phút/ngày, mô phỏng giá 14-90 ngày, xuất toàn bộ dữ liệu CSV/JSON. |
| `TASK-M7-06` | Cải tiến Bộ Mô phỏng Benchmark 4 Chế độ (`apps/simulation`) | `simulation` | N/A (Simulation) | `feature/simulation-seeded-benchmark` | `feat(simulation): seeded prng and price elasticity simulation` | M | Tích hợp Seeded PRNG (Mulberry32) tái lập 100%, tách biệt đường cong co giãn cầu, in disclaimer. |

---

## Mốc M8: Tích hợp AI Gemini Có Kiểm soát (AI Gateway)

| Mã Task | Tên công việc | Scope | UCs & Quy tắc | Nhánh Git | Commit mẫu | Size | Tiêu chí hoàn thành (DoD) |
|---|---|---|---|---|---|---|---|
| `TASK-M8-01` | Xây dựng `AiGatewayService` bảo mật, Proxy & Hạn mức gọi | `back` | Nền tảng cho 32 UC AI (`R1-082`..`R1-094`, `R2-021`, `R2-108`..`R2-126`) | `feature/back-ai-gateway-proxy` | `feat(back): secure ai gateway proxy with tenant scoping and timeout` | M | Ràng buộc `store_id` ở cấp SQL chống rò rỉ dữ liệu, timeout 10s fallback, kiểm soát hạn mức gọi (10 CB / 300 Pro / 30 App). |
| `TASK-M8-02` | Trợ lý AI cho Chủ quán (19 Use Cases) | `back`, `web` | `R2-021`, `R2-108`..`R2-120`, `R2-122`..`R2-126` | `feature/all-store-ai-assistant` | `feat(all): store ai assistant for business qna and weekly summary` | L | Hỏi đáp số liệu (R2-108), tóm tắt tuần (R2-111), gợi ý thẻ hành động (R2-114), soạn mô tả món từ ảnh (R2-021), đọc nhãn hạn dùng OCR (R2-120). |
| `TASK-M8-03` | Trợ lý "Cứu Món" cho Khách hàng (13 Use Cases) | `back`, `app` | `R1-082`..`R1-092`, `R1-094` | `feature/all-customer-savebite-ai` | `feat(all): customer savebite ai assistant with natural language search` | L | Tìm deal bằng câu nói (R1-082), hỏi dị ứng/thành phần (R1-087), soạn đơn khiếu nại từ ảnh (R1-089), tóm tắt đánh giá (R1-094). |
