# Phân tích: 4 mục cần bạn quyết định trước khi sửa

Cả 4 mục đều thuộc nhóm **bảo mật / quy tắc nghiệp vụ**. Sửa sai hướng có thể làm hỏng luồng thanh toán hoặc khóa người dùng thật. Mỗi mục dưới đây có: hiện trạng, rủi ro, các phương án, đề xuất và **câu cần bạn trả lời**.

| Mã | Chủ đề | Mức | Phụ thuộc bên ngoài | Câu cần trả lời |
|---|---|---|---|---|
| BUG-003 | Chữ ký webhook thanh toán | P0 | Có (cổng thanh toán) | Cổng thanh toán thật là gì, ký bằng thuật toán nào? |
| BUG-002 | Guard cho `/store/settings` | P0 | Không | Vai trò nào được xem/sửa cấu hình? |
| BUG-017 | Đăng nhập khi đang chờ xóa tài khoản | P1 | Không | Có cho đăng nhập trong 7 ngày ân hạn để hủy không? |
| Q-08 | `price-history` công khai hay không | P2 | Không | Lịch sử giá có là dữ liệu công khai không? |

---

## BUG-003 — Webhook thanh toán không xác thực chữ ký (P0)

**Hiện trạng**
- Ai cũng gọi được endpoint webhook mà không cần chữ ký, rồi đẩy đơn sang `PAID`.
- Ở production, test `TC-PROD-004` và `TC-SEC-PAY-001` vẫn FAIL.
- Biến `PAYMENT_WEBHOOK_SECRET` có trong `.env.example` nhưng **không được dùng ở đâu trong code**.

**Rủi ro:** kẻ xấu tự đánh dấu đơn đã trả tiền → lấy hàng miễn phí, doanh thu ghi sai.

**Phương án**

| | Mô tả | Ưu | Nhược |
|---|---|---|---|
| A | HMAC-SHA256 trên **body thô** với `PAYMENT_WEBHOOK_SECRET`, gửi trong header chữ ký; so sánh thời gian hằng; có timestamp chống phát lại | Chuẩn, làm ngay được | Phải khớp định dạng của cổng thanh toán thật |
| B | Theo đúng định dạng của cổng thật (VNPay, MoMo, PayOS, Stripe…) | Đúng với production | Cần biết cổng nào, cần tài liệu và khóa thử |
| C | Tạm khóa webhook ở production, chỉ giữ cho môi trường dev | Chặn lỗ hổng tức thì | Mất luồng thanh toán thật nếu đã dùng |

**Đề xuất:** làm **C ngay** (an toàn), sau đó **B**. Làm A chỉ khi bạn xác nhận cổng thật dùng HMAC-SHA256 trên body thô.

**Cần bạn trả lời**
1. Cổng thanh toán thật là gì (hay vẫn chỉ là mô phỏng)?
2. Header chữ ký tên gì, thuật toán gì, có timestamp không?
3. Nếu chưa có cổng thật: có đồng ý khóa webhook ở production không?

---

## BUG-002 — `/store/settings` không có guard (P0)

**Hiện trạng**
- `GET/PUT /store/settings` trả 200 cho **không token** và **cả khách hàng**.
- App cửa hàng đang truyền header `x-store-id` thay vì dựa vào token (`StoreApiService.kt` ~dòng 438–450, `OperationalSettingsScreen.kt` ~dòng 79). Kẻ xấu đổi `x-store-id` là đọc/sửa cấu hình của cửa hàng khác.

**Rủi ro:** lộ và sửa cấu hình vận hành của mọi cửa hàng (hạn mức, giờ, phí…).

**Phương án**

| | Xem (GET) | Sửa (PUT) |
|---|---|---|
| A | OWNER, MANAGER, COUNTER | OWNER |
| B | OWNER, MANAGER | OWNER |
| C | OWNER, MANAGER, COUNTER | OWNER, MANAGER |

**Đề xuất:** **A** — Quầy cần xem giờ/ca để vận hành, nhưng chỉ chủ được sửa; cửa hàng lấy từ token, bỏ `x-store-id`.

**Cần bạn trả lời**
1. COUNTER có được xem cấu hình không?
2. MANAGER có được sửa không, hay chỉ OWNER?
3. Có chấp nhận bỏ `x-store-id` ở app cửa hàng (cần phát hành lại app) không?

---

## BUG-017 — Tài khoản chờ xóa không đăng nhập được (P1)

**Hiện trạng**
- Sau khi bấm "xóa tài khoản" (7 ngày ân hạn, BR-007), tài khoản ở trạng thái `PENDING_DELETE` và **không đăng nhập được**.
- Nhưng việc **hủy yêu cầu xóa** lại cần đăng nhập → người dùng không tự hủy được. Test `TC-ACCT-002` FAIL.

**Phương án**

| | Mô tả | Ưu | Nhược |
|---|---|---|---|
| A | Cho đăng nhập khi `PENDING_DELETE`, app chỉ hiện màn "Hủy yêu cầu xóa" | Đúng ý "ân hạn để hủy" | Cần thêm màn trong app, cần giới hạn quyền trong phiên này |
| B | Hủy qua liên kết email/OTP, không cần đăng nhập | Không mở phiên | Cần kênh email/OTP, làm nhiều hơn |
| C | Giữ nguyên, bỏ khái niệm hủy | Không code | Trái BR-007 |

**Đề xuất:** **A**, phiên chỉ gọi được "hủy xóa" và "đăng xuất", mọi API khác trả 403.

**Cần bạn trả lời**
1. Chọn A, B hay C?
2. Trong thời gian chờ, có ẩn tài khoản khỏi danh sách/đơn hàng của cửa hàng không?

---

## Q-08 — `GET /customer/deals/:id/price-history`

**Hiện trạng:** endpoint nằm ở `customer-deals.controller.ts:343`. Test bảo mật kỳ vọng "cần đăng nhập", nhưng hiện chưa rõ quy tắc nghiệp vụ. Khi chạy với id test, endpoint trả 404 (không có dữ liệu), chưa đủ bằng chứng để kết luận.

**Phương án**

| | Mô tả |
|---|---|
| A | Công khai (giống danh sách suất) — hợp với trang khám phá cho khách chưa đăng nhập |
| B | Yêu cầu đăng nhập khách hàng |

**Đề xuất:** **A nếu danh sách suất đã công khai**, vì lịch sử giá là dữ liệu cùng mức; khi đó **sửa test** thay vì sửa code. Chọn B nếu muốn chống thu thập dữ liệu giá.

**Cần bạn trả lời:** khách chưa đăng nhập có được xem lịch sử giá không?

---

## Mục chưa sửa và lý do (không cần quyết định gấp)

| Mã | Nội dung | Ghi chú |
|---|---|---|
| BUG-022 | Tên "SaveBite AI" trong app/backend | Cần bạn chốt tên thương hiệu trợ lý AI: giữ "SaveBite AI" hay đổi thành "SurplusIQ AI"? Đổi sẽ ảnh hưởng chuỗi giao diện, prompt, test. |
| BUG-012 | Vùng chạm nhỏ / chữ nhỏ | Chưa sửa hàng loạt. Cần quét lại bằng bộ test responsive để xác định đúng chỗ, tránh sửa mò. |

## Thứ tự đề xuất sau khi bạn trả lời
1. BUG-003 (chặn webhook giả) và BUG-002 (guard settings) — cùng đợt, kèm test.
2. BUG-017 — kèm màn "Hủy yêu cầu xóa" trong app khách.
3. Q-08 — sửa code hoặc sửa test tùy câu trả lời.
4. Chạy lại toàn bộ `run-audit-all` trên DB sạch để xác nhận.

*Lưu ý: file này nằm trong `doc/`, không được commit.*
