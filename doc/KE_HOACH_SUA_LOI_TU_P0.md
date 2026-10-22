# KẾ HOẠCH SỬA LỖI TỪ P0 (Giai đoạn E1)

> Nguồn: sổ lỗi trong `docs/audit/PROJECT_BUSINESS_AUDIT_REPORT.md`. Mọi lỗi dưới đây đã có test tái hiện đang FAIL (regression test). Quy trình mỗi lỗi: (1) test tái hiện FAIL → (2) sửa tối thiểu đúng nguyên nhân gốc → (3) test đó PASS → (4) chạy cả lớp liên quan + `npm run test:audit:all` so với baseline → (5) cập nhật sổ lỗi/RTM. Nhóm P0 xong thì chạy full test, có test từng PASS nay FAIL thì dừng xử lý hồi quy trước.

## Đợt 1 – P0 (bảo mật và mất tiền, làm trước, theo thứ tự)

| # | Lỗi | Nguyên nhân gốc | Phương án | File dự kiến đổi | Rủi ro hồi quy | Test tái hiện / chạy lại | Độ phức tạp | Phụ thuộc |
|---|---|---|---|---|---|---|---|---|
| 1 | **BUG-004** `/jobs/*` công khai (gồm `account-anonymize`, `run-all`) | `JobsController` không có guard nào | Gắn `@Roles(UserRole.ADMIN)` + `JwtAuthGuard, RolesGuard` (hoặc header secret nội bộ `JOBS_SECRET` cho cron ngoài). Scheduler `bullmq.scheduler.ts` gọi thẳng `JobsService` nên không bị ảnh hưởng | `jobs/jobs.controller.ts`; (nếu dùng secret) `.env.example` | Thấp. Kiểm: ai đang gọi HTTP `/jobs/*` (script ops, CI)? | TC-SEC-AUTHN-001 (phần /jobs), TC-PROD-006; thêm TC: ADMIN gọi được, STORE/CUSTOMER 403 | S | – |
| 2 | **BUG-002** `/store/settings` (+history) không guard, store/gói lấy từ header client | `SettingsController` tự đọc `x-store-id`, `x-user-id`, `x-is-pro` | Gắn `JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard`; GET: OWNER/MANAGER/COUNTER, PUT: OWNER/MANAGER (đúng mô tả "Quản lý trừ cấu hình"); lấy `storeId` từ `@CurrentStore()`, actor từ `@CurrentUser()`, cờ Pro **tra từ subscription trong DB** (bỏ `x-is-pro`); bỏ giá trị mặc định `00000000-…0001` | `settings/settings.controller.ts`, `settings.service.ts` (nhận plan thay vì cờ), module import SubscriptionsService | **Cao hơn dự kiến: app cửa hàng đang gửi `x-store-id`** (`android-merchant/.../StoreApiService.kt:438-450`, `OperationalSettingsScreen.kt:79`). Sửa backend trước sẽ không phá app vì backend bỏ qua header, nhưng nên dọn app (bỏ header) cùng PR. Web V1/V2 chưa gọi endpoint này | TC-SEC-SETTINGS-001/002/003/004, TC-PROD-005, TC-PLAN; thêm TC: Quầy PUT → 403, store B không đọc được cấu hình store A | M | Kiểm quyền `COUNTER` GET có đúng ý nghiệp vụ không (Q mới) |
| 3 | **BUG-003** Webhook thanh toán không xác thực | `PAYMENT_WEBHOOK_SECRET` có trong `.env.example` nhưng **không code nào dùng** (đã grep) | Xác thực chữ ký HMAC-SHA256 trên **raw body** bằng `PAYMENT_WEBHOOK_SECRET` (header `x-signature`, so sánh `timingSafeEqual`), từ chối 401 nếu thiếu/sai; thêm kiểm thời gian (`x-timestamp` ±5 phút) chống phát lại. `/dev/payments/:txnId/confirm` (mô phỏng) giữ nguyên, gọi thẳng `processPaymentWebhook` nên không đi qua chữ ký. Không đổi `PaymentWebhookDto` | `payments/payments-webhook.controller.ts`, `main.ts` (bật `rawBody`), helper mới `payments/webhook-signature.ts` | Trung bình: cổng thật phải ký đúng định dạng. **Chờ xác nhận:** cổng VietQR/ngân hàng thật đang dùng thuật toán/tên header nào → nếu khác, đổi hàm verify, không đổi luồng | TC-SEC-PAY-001, TC-PROD-004; thêm TC: chữ ký đúng → PAID, chữ ký sai/thiếu → 401, timestamp cũ → 401, lặp cùng gatewayTxnId idempotent | M | **BLOCKED một phần – chờ xác nhận định dạng chữ ký của cổng thật** (phần HMAC chung vẫn làm được) |
| 4 | **BUG-005** Hủy suất không tạo giao dịch hoàn tiền | `OffersService.cancelOffer` chỉ đặt `CANCELLED`, không gọi `createRefundTransaction` (`offers/offers.service.ts` ~775-780). Luồng khách tự hủy (`orders.service.ts:374`) và khiếu nại (`complaint-decision.ts`) đã tạo hoàn | Trong **cùng giao dịch** hủy: với mỗi đơn `PAID` gọi `createRefundTransaction(manager, order, order.totalAmount, \`REFUND-${order.code}-…\`)`; đơn `PENDING_PAYMENT` chỉ hủy (chưa thu tiền); cộng lại tồn/ưu đãi như luồng khách hủy; idempotent theo `gatewayTxnId`; thông báo cho khách | `offers/offers.service.ts` (+ import từ `payments/refund-transaction`), có thể cần `DataSource.transaction` | Trung bình: payout admin (`/admin/refund-payouts`) sẽ hiện thêm lệnh. Kiểm số tiền = `totalAmount` (đã gồm giảm giá, trừ trợ giá nền tảng) | TC-FLOW-004-01/002; thêm TC: nhiều đơn, đơn đã PICKED_UP không hoàn, hủy lần hai không hoàn kép, admin thấy lệnh PENDING | M | – |
| 5 | **BUG-001** API treo khi ≥ ~20 yêu cầu giữ suất đồng thời | Trong `holdOrder` (giao dịch giữ khóa `FOR UPDATE`) gọi `auditLogService.log()` (`orders.service.ts` ~285) bằng **repository riêng ngoài giao dịch**: mỗi giao dịch giữ 1 kết nối và đòi thêm 1 kết nối nữa; khi số giao dịch đồng thời ≥ `DB_POOL_MAX=20` thì không ai lấy được kết nối thứ hai → kẹt vĩnh viễn (xác nhận bằng `pg_stat_activity`: pid `idle in transaction` 620 giây) | (a) Chuyển ghi audit sang **sau commit** (hoặc truyền `manager` vào `log()`); (b) rà các điểm gọi service khác ngoài `manager` trong `work` (cancelHold, markPaid, …); (c) đặt `statement_timeout`/`lock_timeout`/`idle_in_transaction_session_timeout` cho pool; (d) giới hạn đồng thời theo `offerId` bằng khóa tư vấn | `orders/orders.service.ts`, `audit/audit-log.service.ts` (nhận manager tùy chọn), `app.module.ts` (cấu hình pool), có thể `jobs.service.ts` | **Cao nhất**: động vào luồng đặt/hủy/thanh toán. Cần chạy lại toàn bộ `orders-concurrency.spec.ts` + flows | TC-CONC-001/002 (phải PASS), TC-FLOW-002-01, jest orders; thêm TC tải 50 yêu cầu/ suất và 50 suất khác nhau | M–L | Làm sau 1–4 để các test khác không bị nhiễu; nên có timeout (d) trước để lỗi không còn treo toàn hệ thống |

Sau Đợt 1 chạy `npm run test:audit:all` (DB test được dựng lại sạch). Điều kiện qua đợt: các TC tái hiện ở trên PASS, **không** TC nào từng PASS trở thành FAIL, jest backend 527/527.

## Đợt 2 – P1

| # | Lỗi | Nguyên nhân gốc | Phương án | File | Rủi ro | Test | Độ phức tạp |
|---|---|---|---|---|---|---|---|
| 6 | BUG-006 Idempotency không an toàn khi bấm đúp | Interceptor lưu khóa **sau** khi xử lý bằng `tap(async …)` không chờ, không ràng buộc duy nhất → hai yêu cầu song song cùng khóa đều chạy | Chèn bản ghi khóa (`INSERT … ON CONFLICT DO NOTHING`, unique `scope,user_id,key`) **trước** khi xử lý; nếu trùng và chưa có phản hồi → 409 `IDEMPOTENCY_IN_PROGRESS`; xử lý xong cập nhật phản hồi; lỗi thì xóa khóa | `common/interceptors/idempotency.interceptor.ts`, migration unique index | Trung bình: mọi route `@Idempotent` | TC-FLOW-002-03/003b | M |
| 7 | BUG-007 App cửa hàng gọi `PUT promotions/{id}` (404) | Hai decorator chồng (`@Patch`+`@Put`) chỉ đăng ký một route | Sửa app dùng `PATCH` (`StoreApiService.kt:390`); tùy chọn thêm handler PUT riêng nếu cần tương thích | `android-merchant/.../StoreApiService.kt`, repository gọi | Thấp | TC-CONTRACT-002; chạy lại màn Ưu đãi trên emulator | S |
| 8 | BUG-016 Xóa tài khoản không yêu cầu xác nhận | `requestAccountDelete` chỉ cần JWT | Yêu cầu `password` (hoặc OTP) trong body DTO mới `RequestDeleteDto`; cập nhật app khách màn xóa tài khoản | `customer-profile/*.controller.ts|service.ts`, DTO, `android/.../SecurityScreens`/Hồ sơ | Trung bình: đổi hợp đồng API (app khách phải gửi mật khẩu) | TC-ACCT-001 | M |
| 9 | BUG-017 PENDING_DELETE không đăng nhập được để hủy xóa | Kiểm tra trạng thái khi login coi PENDING_DELETE như bị khóa | Cho đăng nhập ở PENDING_DELETE (cờ `pendingDelete=true` trong phản hồi), chặn thao tác ghi quan trọng; đăng nhập thành công thì app hiện màn "Hủy yêu cầu xóa" | `auth/auth.service.ts`, app khách | Trung bình: phụ thuộc quyết định nghiệp vụ | TC-ACCT-002 | M · **chờ xác nhận nghiệp vụ**: có cho đăng nhập trong ân hạn không (mô tả R1-019 ngầm hiểu là có) |
| 10 | RISK-04 JWT secret dự phòng cố định | 4 file dùng `process.env.JWT_SECRET \|\| '<hằng>'` | Một `ConfigService`/hàm `requireEnv('JWT_SECRET')` ném lỗi khi thiếu (trừ `NODE_ENV=test`), dùng chung 4 nơi (auth, orders, payments, pickups) | `auth/auth.constants.ts`, `orders.service.ts:46`, `payments.service.ts:54`, `pickups.service.ts:51` | Thấp–TB: môi trường thiếu biến sẽ không khởi động | thêm TC: khởi động backend không có JWT_SECRET → thoát với lỗi | S |

## Đợt 3 – P2/P3 (gộp theo nguyên nhân)

| Lỗi | Phương án | Độ phức tạp |
|---|---|---|
| BUG-015 `/customer/consents` 500 | DTO + validate (400) | S |
| BUG-008 job dự báo lỗi khi chạy lại | UPSERT theo (store,item,date) | S |
| BUG-009, BUG-020 ảnh giả/cổng 3000 trong app khách | Bỏ ảnh Unsplash cứng (hiển thị trạng thái rỗng), dùng base URL Retrofit cho ảnh tải lên | S–M |
| BUG-010, BUG-012, BUG-023, BUG-024 responsive/chữ lớn | Bảng Suất dạng thẻ ≤600px; `min-width` nút icon 44px; `maxLines`/`weight` cho tiêu đề và hàng chỉ số ở app cửa hàng; `FlowRow` cho thẻ gợi ý tìm kiếm app khách | M |
| BUG-011, BUG-022 nhãn tiếng Anh/tên "SaveBite AI" | Việt hóa, thống nhất tên "Trợ lý Cứu Món" | S |
| BUG-013 hai biến VITE API | Thống nhất `VITE_API_URL` cho cả admin | S |
| BUG-014 seed id không phải UUID v4 | Sinh id v4 hoặc nới validator | S |
| BUG-018 thông báo đăng nhập lộ tài khoản | Một thông báo chung, vẫn đếm lần sai nội bộ | S |
| BUG-019 Swagger công khai production | Chỉ bật khi `NODE_ENV!=='production'` hoặc sau auth | S |
| BUG-021 DTO realtime không decorator | Thêm decorator hoặc xóa endpoint | S |
| `GET /customer/deals/:id/price-history` công khai | **BLOCKED – chờ xác nhận (Q-08)** | – |

## Thứ tự thực hiện đề xuất

1) BUG-004 → 2) BUG-002 (+ dọn header ở app cửa hàng) → 3) BUG-003 (phần HMAC chung) → 4) BUG-005 → 5) BUG-001 → chạy full test và so baseline → Đợt 2 (BUG-006, 007, 016, 017, RISK-04) → full test → Đợt 3.

## Câu hỏi cần bạn trả lời trước khi sửa

1. **BUG-003:** cổng thanh toán thật ký webhook bằng gì (HMAC-SHA256 header nào)? Nếu chưa có cổng thật, tôi dùng HMAC-SHA256 trên raw body + `PAYMENT_WEBHOOK_SECRET` làm chuẩn nội bộ.
2. **BUG-002:** Nhân viên Quầy có được xem cấu hình cửa hàng (GET) không, hay chỉ Chủ/Quản lý?
3. **BUG-017:** có cho khách đăng nhập trong 7 ngày ân hạn xóa tài khoản để hủy yêu cầu không?
4. **Q-08:** lịch sử giá của deal có cho người chưa đăng nhập xem không (tính minh bạch KX07)?
