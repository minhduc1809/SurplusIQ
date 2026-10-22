# KẾ HOẠCH KIỂM THỬ VÀ TEST CASE THEO BRD – SURPLUSIQ

> Gốc truy vết: `doc/BRD_Nghiep_vu_he_thong_hien_tai.md`. Kết quả dưới đây là **baseline chưa sửa code** (ngày 21/10/2026, môi trường test: backend cổng 4100, DB `surplusiq_test`).

## B1. Kế hoạch

**Phạm vi đã làm:** bảo mật/phân quyền API, luồng tiền & trạng thái đơn/suất, đồng thời, hợp đồng API app/web–backend, responsive web (owner + admin).
**Chưa làm (NOT RUN):** E2E giao diện mobile (APP-OWNER chưa có test nào; APP-CUSTOMER chỉ có smoke 8 bước), responsive Android, test hiển thị từng màn K01–K94/S01–S110, các luồng FL-008..FL-013, gói dịch vụ, khiếu nại, Rescue*.

| Lớp | Công cụ | Lệnh một dòng |
|---|---|---|
| Hợp đồng API (tĩnh) | node:test | `npm --workspace=@surplusiq/backend run test:audit:contract` |
| Bảo mật/phân quyền/IDOR | node:test + fetch | `npm --workspace=@surplusiq/backend run test:audit:security` |
| Luồng tiền & trạng thái (xác minh DB) | node:test + pg | `npm --workspace=@surplusiq/backend run test:audit:flows` |
| Đồng thời / độ sẵn sàng (chạy riêng, cuối) | node:test | `npm --workspace=@surplusiq/backend run test:audit:concurrency` |
| Responsive web 10 viewport | Playwright-core + Chrome | `node apps/web/tests/audit/responsive.audit.mjs` |
| Có sẵn trước đó | jest 527, vitest 71, `test:flows:live` 30 bước, `test:web:e2e` 16 bước, smoke Android 8 bước | `npm test`, `npm run test:flows:live`, `npm run test:web:e2e` |

**Môi trường test (bắt buộc):** DB riêng `surplusiq_test` (tạo bằng `create database`, chạy `migration:run` và `seed-runner` với `POSTGRES_DB=surplusiq_test`); backend riêng cổng 4100 **không watch** (`test/audit/restart-test-backend.ps1` khởi động lại sạch); web cho responsive: `VITE_API_URL` và `VITE_API_BASE_URL` cùng trỏ 4100, cổng 5180. Helper từ chối chạy trên cổng 4000 hoặc `NODE_ENV=production`.
Tài khoản test (seed): customer@surplusiq.vn / customer1@surplusiq.test (khách A/B), owner@rincon.vn / owner2@surplusiq.test (cửa hàng A/B), admin@surplusiq.vn. **Thiếu:** tài khoản Quản lý và Nhân viên quầy (chưa kiểm được phân quyền COUNTER/MANAGER), tài khoản đơn vị tiếp nhận → BLOCKED.
**Tiêu chí vào:** BRD đã sinh, backend test chạy. **Tiêu chí ra:** mọi TC chạy; FAIL do lỗi thật được ghi vào sổ lỗi, không sửa test cho xanh.

## B3. Test case (đã viết và đã chạy baseline)

| Mã TC | Yêu cầu BRD / API | Mục tiêu | Kết quả baseline | Ghi chú | File |
|---|---|---|---|---|---|
| TC-SEC-AUTHN-001 | ROLE-*, API-* (mọi endpoint không công khai), BR bảo mật JWT | [API-*] không token: mọi endpoint không công khai trả 401/403 | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-AUTHN-002 | ROLE-*, API-* (mọi endpoint không công khai), BR bảo mật JWT | token rác bị từ chối ở endpoint khách/cửa hàng/admin | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-AUTHZ-001 | ROLE-CUSTOMER/OWNER/ADMIN × API-* | khách hàng không gọi được endpoint cửa hàng/admin | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-AUTHZ-002 | ROLE-CUSTOMER/OWNER/ADMIN × API-* | chủ cửa hàng không gọi được endpoint khách/admin | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-AUTHZ-003 | ROLE-CUSTOMER/OWNER/ADMIN × API-* | admin không gọi được endpoint khách | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-IDOR-001 | FL-001, FL-004..006, ROLE-*, API-customer/orders/:id/*, API-store/orders/:id/* | khách B không đọc/ghi được đơn của khách A (mọi route /customer/orders/:id/*) | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-IDOR-002 | FL-001, FL-004..006, ROLE-*, API-customer/orders/:id/*, API-store/orders/:id/* | cửa hàng B không thấy/không sửa được đơn và suất của cửa hàng A | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-IDOR-003 | FL-001, FL-004..006, ROLE-*, API-customer/orders/:id/*, API-store/orders/:id/* | danh sách đơn của cửa hàng B không chứa đơn của cửa hàng A | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-IDOR-004 | FL-001, FL-004..006, ROLE-*, API-customer/orders/:id/*, API-store/orders/:id/* | danh sách đơn của khách B không chứa đơn của khách A | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-IDOR-005 | FL-001, FL-004..006, ROLE-*, API-customer/orders/:id/*, API-store/orders/:id/* | cửa hàng B không quét được QR của đơn thuộc cửa hàng A | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-IDOR-006 | FL-001, FL-004..006, ROLE-*, API-customer/orders/:id/*, API-store/orders/:id/* | khách B không đọc được lời tặng của khách A | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-PAY-001 | FL-001, BR-015, BR-016, ST-ORDER-001, ST-PAYMENT-001 | [BR-015,BR-016] webhook giả mạo không xác thực không được chuyển đơn sang PAID | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-PAY-002 | FL-001, BR-015, BR-016, ST-ORDER-001, ST-PAYMENT-001 | [BR-016] webhook sai số tiền không làm đơn PAID | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-PAY-003 | FL-001, BR-015, BR-016, ST-ORDER-001, ST-PAYMENT-001 | webhook lặp cùng gatewayTxnId xử lý idempotent (không ghi nhận hai lần) | **PASS** |  | `test/audit/security.test.mjs` |
| TC-SEC-PAY-004 | FL-001, BR-015, BR-016, ST-ORDER-001, ST-PAYMENT-001 | [RISK-02] /dev/payments/:txnId/confirm phải bị khóa khi NODE_ENV=production | **BLOCKED** | BLOCKED – cần chạy backend với NODE_ENV=production (chưa có  | `test/audit/security.test.mjs` |
| TC-SEC-PAY-005 | FL-001, BR-015, BR-016, ST-ORDER-001, ST-PAYMENT-001 | [RISK-03] /realtime/trigger-test phải 404 ở production | **BLOCKED** | BLOCKED – cần chạy backend với NODE_ENV=production | `test/audit/security.test.mjs` |
| TC-SEC-SETTINGS-001 | FR-APPOWN (Hồ sơ/Cài đặt vận hành, Gói Pro), API-store/settings | GET /store/settings không token phải bị từ chối | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-SETTINGS-002 | FR-APPOWN (Hồ sơ/Cài đặt vận hành, Gói Pro), API-store/settings | GET /store/settings/history không token phải bị từ chối | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-SETTINGS-003 | FR-APPOWN (Hồ sơ/Cài đặt vận hành, Gói Pro), API-store/settings | PUT /store/settings không token không được sửa cấu hình | **FAIL** |  | `test/audit/security.test.mjs` |
| TC-SEC-SETTINGS-004 | FR-APPOWN (Hồ sơ/Cài đặt vận hành, Gói Pro), API-store/settings | BR gói Pro: header x-is-pro do client gửi không được bật chế độ giá AUTO | **PASS** |  | `test/audit/security.test.mjs` |
| TC-FLOW-001-01 | FL-001, ST-ORDER-001, BR-016, BR-022 | [BR-016] đơn giữ chỗ chốt giá = đơn giá × số lượng, trạng thái PENDING_PAYMENT, tồn giảm | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-001-02 | FL-001, ST-ORDER-001, BR-016, BR-022 | thanh toán xong: PAID, có giao dịch SUCCEEDED đúng số tiền, sinh QR + PIN | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-001-03 | FL-001, ST-ORDER-001, BR-016, BR-022 | cửa hàng quét QR: PICKED_UP; quét lại lần 2 bị từ chối (ST-ORDER cấm chuyển) | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-001-04 | FL-001, ST-ORDER-001, BR-016, BR-022 | thanh toán lại cho đơn đã PAID bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-002-01 | FL-001, FL-002, BR-015, BR-017, BR-019, BR-020 | hai khách cùng giữ suất cuối: đúng một người thành công, tồn không âm | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-002-03 | FL-001, FL-002, BR-015, BR-017, BR-019, BR-020 | cùng Idempotency-Key gửi lại sau 0,5 giây chỉ tạo một đơn (client retry) | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-002-03b | FL-001, FL-002, BR-015, BR-017, BR-019, BR-020 | [BR-015] bấm đúp: hai yêu cầu SONG SONG cùng Idempotency-Key chỉ tạo một đơn | **FAIL** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-002-04 | FL-001, FL-002, BR-015, BR-017, BR-019, BR-020 | [FL-002] hết hạn giữ chỗ: job trả tồn và chuyển HOLD_EXPIRED | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-003--1 | BR-019, BR-054, API-customer/orders, API-store/offers | [BR-019] số lượng -1 bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-003-0 | BR-019, BR-054, API-customer/orders, API-store/offers | [BR-019] số lượng 0 bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-003-04 | BR-019, BR-054, API-customer/orders, API-store/offers | đặt suất đã hủy/đã đóng bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-003-1 | BR-019, BR-054, API-customer/orders, API-store/offers | .5 [BR-019] số lượng 1.5 bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-003-6 | BR-019, BR-054, API-customer/orders, API-store/offers | (>5) [BR-019] số lượng 6 (>5) bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-003-O | BR-019, BR-054, API-customer/orders, API-store/offers | khung nhận kết thúc trước bắt đầu bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-003-chuỗi | BR-019, BR-054, API-customer/orders, API-store/offers | [BR-019] số lượng chuỗi bị từ chối | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-004-01 | FL-003, ST-ORDER-001, ST-OFFER-001, R1-043, R2-033 | cửa hàng hủy suất: mọi đơn PAID thành CANCELLED + có giao dịch hoàn đúng tiền | **FAIL** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-004-02 | FL-003, ST-ORDER-001, ST-OFFER-001, R1-043, R2-033 | hủy suất lần hai không hoàn tiền thêm (không hoàn kép) | **FAIL** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-004-03 | FL-003, ST-ORDER-001, ST-OFFER-001, R1-043, R2-033 | khách hủy đơn PAID còn xa giờ nhận: được hoàn 100%, tồn trả lại | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-004-04 | FL-003, ST-ORDER-001, ST-OFFER-001, R1-043, R2-033 | hủy hai lần không hoàn kép | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-004-05 | FL-003, ST-ORDER-001, ST-OFFER-001, R1-043, R2-033 | không hủy được đơn đã PICKED_UP | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-004-06 | FL-003, ST-ORDER-001, ST-OFFER-001, R1-043, R2-033 | [R1-043] hủy trong vòng 60 phút trước giờ BẮT ĐẦU nhận bị từ chối (đã xác nhận bằng thông báo máy chủ), đơn giữ nguyên PAID | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-005-01 | ST-OFFER-001, R2-031, R2-032 | không đóng được suất đã hủy | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-005-02 | ST-OFFER-001, R2-031, R2-032 | điều chỉnh tồn không được làm âm | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-FLOW-005-03 | ST-OFFER-001, R2-031, R2-032 | bán hết suất → SOLD_OUT | **PASS** |  | `test/audit/flows.test.mjs` |
| TC-CONC-001 | BR-017/BR-020 (chống bán quá), phi chức năng: độ sẵn sàng | 20 yêu cầu đồng thời trên suất 3: tổng số lượng giữ chỗ ≤ 3 | **FAIL** |  | `test/audit/concurrency.test.mjs` |
| TC-CONC-002 | BR-017/BR-020 (chống bán quá), phi chức năng: độ sẵn sàng | sau tải đồng thời, API vẫn phản hồi trong 5 giây (không treo vì cạn kết nối/khóa) | **FAIL** |  | `test/audit/concurrency.test.mjs` |
| TC-CONTRACT-001 | API-* (hợp đồng app/web ↔ backend), FR-APPOWN, FR-APPCUS, FR-WEBOWN | APP-CUSTOMER: mọi Retrofit endpoint có route backend | **PASS** |  | `test/audit/contract.test.mjs` |
| TC-CONTRACT-002 | API-* (hợp đồng app/web ↔ backend), FR-APPOWN, FR-APPCUS, FR-WEBOWN | APP-OWNER: mọi Retrofit endpoint có route backend | **FAIL** |  | `test/audit/contract.test.mjs` |
| TC-CONTRACT-003 | API-* (hợp đồng app/web ↔ backend), FR-APPOWN, FR-APPCUS, FR-WEBOWN | WEB-OWNER: mọi lời gọi api.* có route backend | **PASS** |  | `test/audit/contract.test.mjs` |

**Tổng:** 49 test case tự động ghi mã TC: FAIL=14, PASS=33, BLOCKED=2. Test chặn (BLOCKED) vì thiếu môi trường production: TC-SEC-PAY-004/005.

Test case **chưa tự động** (BLOCKED – chờ xác nhận nghiệp vụ): hoàn chênh lệch khi đổi suất (Q-01), hết hạn điểm FIFO (Q-02), DV01–DV07 (Q-03), danh sách AD01–AD22 (Q-04), quyền lợi gói (Q-07).

## B2. Ma trận truy vết yêu cầu – test (RTM)

| Nhóm yêu cầu | Tổng | Đã có test tự động | Ghi chú |
|---|---|---|---|
| FL (luồng) | 13 | 4 (FL-001, 002, 003 có TC-FLOW; FL-004/005/006 chỉ có script live `test:flows:live` chưa gắn mã) | FL-007..013 chưa có test |
| ST (trạng thái) | 12 | 2 một phần (ST-ORDER, ST-OFFER); ST-PAYMENT một phần | 9 chưa test |
| BR (quy tắc) | 99 + 7 bổ sung | BR-015, BR-016, BR-019, BR-022 (gián tiếp), BR-054 = 5 | ~100 chưa có test |
| API | 383 | 383 qua ma trận quyền không-token/sai-vai-trò (AUTHN/AUTHZ); ~30 route qua IDOR/luồng | Hợp đồng app/web ↔ backend: 3 nhóm |
| FR-WEBOWN (21 trang) + FR-WEBADM (11) | 32 | 18 trang đo responsive (8 owner + login + 8 admin + login) | Chưa kiểm hành vi từng trang ngoài E2E 16 bước |
| FR-APPCUS (94) / FR-APPOWN (110) | 204 | 0 gắn mã FR; smoke 8 bước app khách (không gắn mã) | **NOT RUN** |

**Yêu cầu quan trọng chưa có test (ghi nhận, không che giấu):** toàn bộ APP-OWNER; K22–K25 (đặt/thanh toán) ở mức giao diện; khiếu nại 48 giờ (FL-010); gói dịch vụ Basic/Pro (FL-011) ngoài một kiểm tra Pro; Rescue Bridge/Pool; điểm thưởng; tính xác thực của webhook thật; ma trận quyền Chủ/Quản lý/Quầy.

## B4. Responsive

Viewport đo: 320×640, 360×740, 390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, 844×390 (ngang), 1024×600. Chỉ số: cuộn ngang trang, phần tử tràn khung, vùng chạm <44px, chữ <14px. Ảnh: `docs/audit/screenshots/` (320, 390, 768, 1440). **Android: NOT RUN** (chỉ có một emulator Pixel_8; chưa có ma trận thiết bị, chưa đo chữ lớn/safe area/bàn phím).

| Màn (FR) | Đường dẫn | Cuộn ngang | Vùng chạm <44px @360 | Chữ <14px (max) | Ảnh |
|---|---|---|---|---|---|
| FR-WEBADM-disputes | `/admin/disputes` | không (0/10) | 39/39 | 63 | `screenshots/FR-WEBADM-disputes_390x844.png` |
| FR-WEBADM-login | `/admin/login` | không (0/10) | 5/6 | 8 | `screenshots/FR-WEBADM-login_390x844.png` |
| FR-WEBADM-merchants | `/admin/merchants` | không (0/10) | 40/40 | 63 | `screenshots/FR-WEBADM-merchants_390x844.png` |
| FR-WEBADM-orders | `/admin/orders` | không (0/10) | 38/38 | 62 | `screenshots/FR-WEBADM-orders_390x844.png` |
| FR-WEBADM-overview | `/admin/overview` | không (0/10) | 65/65 | 196 | `screenshots/FR-WEBADM-overview_390x844.png` |
| FR-WEBADM-settings | `/admin/settings` | không (0/10) | 38/38 | 96 | `screenshots/FR-WEBADM-settings_390x844.png` |
| FR-WEBADM-settlement | `/admin/settlement` | không (0/10) | 37/37 | 61 | `screenshots/FR-WEBADM-settlement_390x844.png` |
| FR-WEBADM-subscriptions | `/admin/subscriptions` | không (0/10) | 51/51 | 128 | `screenshots/FR-WEBADM-subscriptions_390x844.png` |
| FR-WEBADM-users | `/admin/users` | không (0/10) | 38/38 | 71 | `screenshots/FR-WEBADM-users_390x844.png` |
| FR-WEBOWN-customers | `/merchant-v2/growth/customers` | không (0/10) | 7/7 | 22 | `screenshots/FR-WEBOWN-customers_390x844.png` |
| FR-WEBOWN-login | `/merchant-v2/login` | không (0/10) | 2/3 | 2 | `screenshots/FR-WEBOWN-login_390x844.png` |
| FR-WEBOWN-marketing | `/merchant-v2/growth/marketing` | không (0/10) | 7/7 | 22 | `screenshots/FR-WEBOWN-marketing_390x844.png` |
| FR-WEBOWN-offers | `/merchant-v2/sales/offers` | không (0/10) | 61/61 | 64 | `screenshots/FR-WEBOWN-offers_390x844.png` |
| FR-WEBOWN-orders | `/merchant-v2/sales/orders` | không (0/10) | 15/15 | 160 | `screenshots/FR-WEBOWN-orders_390x844.png` |
| FR-WEBOWN-reports | `/merchant-v2/growth/reports` | không (0/10) | 8/8 | 23 | `screenshots/FR-WEBOWN-reports_390x844.png` |
| FR-WEBOWN-settings | `/merchant-v2/settings` | không (0/10) | 6/6 | 6 | `screenshots/FR-WEBOWN-settings_390x844.png` |
| FR-WEBOWN-staff | `/merchant-v2/growth/staff` | không (0/10) | 5/5 | 24 | `screenshots/FR-WEBOWN-staff_390x844.png` |
| FR-WEBOWN-today | `/merchant-v2/today` | không (0/10) | 6/7 | 20 | `screenshots/FR-WEBOWN-today_390x844.png` |

Ma trận màn × viewport đầy đủ (180 phép đo) ở `docs/audit/responsive-results.json`.