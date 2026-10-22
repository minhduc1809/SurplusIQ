# Cập nhật sổ lỗi và quyết định nghiệp vụ

Cập nhật sau đợt sửa lỗi và rà soát logic nghiệp vụ. Tất cả lỗi dưới đây đã có test tái hiện trong `apps/backend/test/audit/*` (lỗi nghiệp vụ mới là `business.test.mjs`).

## 1. Trạng thái sổ lỗi

| Mã | Mức | Nội dung | Trạng thái |
|---|---|---|---|
| BUG-001 | P0 | API treo khi nhiều yêu cầu giữ suất đồng thời (cạn pool, nhật ký ghi ngoài giao dịch) | Đã sửa, TC-CONC-001/002 đạt |
| BUG-002 | P0 | `/store/settings` không guard | Đã sửa (xem quyết định D-01) |
| BUG-003 | P0 | Webhook thanh toán không xác thực | Đã sửa: bắt buộc header `x-webhook-secret` (xem D-02) |
| BUG-004 | P0 | `/jobs/*` công khai | Đã sửa: chỉ ADMIN |
| BUG-005 | P0 | Hủy suất không hoàn tiền | Đã sửa |
| BUG-006 | P1 | Idempotency không an toàn khi bấm đúp | Đã sửa |
| BUG-007 | P1 | App cửa hàng gọi PUT promotions (404) | Đã sửa (PATCH) |
| BUG-008 | P2 | Job dự báo lỗi 500 khi chạy lại | Đã sửa |
| BUG-009 | P2 | Ảnh/dữ liệu giả trong app khách | Đã sửa (bỏ ảnh mẫu, ảnh dự phòng, "850 m", địa chỉ mặc định) |
| BUG-010 | P2 | Cột Thao tác bị che ở màn hẹp | Đã sửa (cột cố định bên phải) |
| BUG-011 | P3 | Nhãn tiếng Anh ở admin | Đã sửa |
| BUG-012 | P3 | Vùng chạm nhỏ, chữ nhỏ | **Chưa sửa** (cần đo lại trước) |
| BUG-013 | P3 | Hai biến VITE API ở admin | Đã sửa |
| BUG-014 | P3 | Id seed không phải UUID v4 | Đã sửa (validator nhận mọi phiên bản) |
| BUG-015 | P2 | `/customer/consents` trả 500 | Đã sửa (400) |
| BUG-016 | P1 | Xóa tài khoản không xác nhận lại | Đã sửa (cần mật khẩu) |
| BUG-017 | P1 | Tài khoản chờ xóa không đăng nhập để hủy | Đã sửa (xem D-03) |
| BUG-018 | P3 | Thông báo đăng nhập lộ tài khoản | Đã sửa |
| BUG-019 | P3 | Swagger công khai ở production | Đã sửa |
| BUG-020 | P3 | URL ảnh cổng 3000 | Đã sửa (4000) |
| BUG-021 | P3 | DTO realtime không decorator | Đã sửa |
| BUG-022 | P3 | Tên "SaveBite AI" | **Chờ quyết định tên thương hiệu** |
| BUG-023/024 | P3 | Bố cục vỡ khi chữ lớn | Đã sửa chip tìm kiếm và thẻ chỉ số; chưa đo lại bằng quét responsive |
| BUG-025 | P0 | JWT ký bằng khóa mặc định công khai | Đã sửa (đọc `JWT_SECRET` lười, không giá trị dự phòng) |
| BUG-026 | P0 | Webhook làm sống lại đơn đã hủy/đã nhận thành PAID | Đã sửa, TC-BIZ-001 |
| BUG-027 | P1 | Trả thừa tiền cho đơn đã PAID sinh thêm vé, không hoàn | Đã sửa, TC-BIZ-002 |
| BUG-028 | P1 | Sai số tiền bị rollback, mất bản ghi đối soát thủ công | Đã sửa, TC-BIZ-003 |
| BUG-029 | P1 | Hạn mức "tối đa mỗi đơn" của cửa hàng không được áp dụng | Đã sửa, TC-BIZ-004 |
| BUG-030 | P1 | Đặt được suất đã quá giờ nhận | Đã sửa, TC-BIZ-005 |
| BUG-031 | P2 | Giờ hẹn nhận ngoài khung giờ không bị chặn khi giữ chỗ | Đã sửa, TC-BIZ-006 |
| BUG-032 | P1 | Sửa suất/điều chỉnh tồn đè lên đơn đặt đồng thời | Đã sửa (khóa dòng suất) |
| BUG-033 | P2 | `soldQuantity` luôn 0: báo cáo/thẻ đề xuất sai, cho giảm tổng dưới số đã giữ | Đã sửa cách tính (= tổng − còn lại), TC-BIZ-008 |
| BUG-034 | P0 | Cửa hàng hủy đơn đã thanh toán không hoàn tiền, không thu hồi vé | Đã sửa, TC-BIZ-009 |
| BUG-035 | P2 | Hết hạn giữ suất đúng lúc nhận tiền: tồn kho không được trả | Đã sửa |
| BUG-036 | P2 | Trả tồn kho mở lại suất đã quá giờ nhận | Đã sửa |

## 2. Quyết định nghiệp vụ cần ghi vào BRD

| Mã | Quy tắc |
|---|---|
| D-01 (BUG-002) | Cấu hình cửa hàng: xem = OWNER, MANAGER, COUNTER; sửa = chỉ OWNER; lịch sử cấu hình = OWNER, MANAGER. Cửa hàng lấy từ token, `x-store-id` khác cửa hàng của người dùng bị 403 và ghi log. COUNTER chỉ nhận giờ nhận hàng, phút ân hạn, số lượng tối đa mỗi đơn. Gói Pro tính từ đăng ký thật. |
| D-02 (BUG-003) | Chưa có dịch vụ biến động số dư. Production xác nhận thanh toán thủ công qua admin (`confirmByAdmin`). Webhook chỉ nhận khi gửi đúng `PAYMENT_WEBHOOK_SECRET`; thiếu cấu hình khóa thì đóng. Khi chọn SePay/Casso thì đổi cách đọc header theo dịch vụ đó. |
| D-03 (BUG-017) | Khách `PENDING_DELETE` đăng nhập được trong 7 ngày ân hạn nhưng phiên bị giới hạn: chỉ xem trạng thái tài khoản, hủy yêu cầu xóa, đăng xuất; API khác trả 403 `ACCOUNT_PENDING_DELETE`. Còn đơn PENDING_PAYMENT hoặc PAID thì chặn yêu cầu xóa (409 `ACCOUNT_DELETE_BLOCKED_OPEN_ORDERS`). Quy tắc chặn xóa khi còn đơn đã được chủ dự án xác nhận. |
| D-04 (Q-08) | `GET /customer/deals/:id/price-history` công khai, nhưng chỉ cho suất OPEN của cửa hàng ACTIVE (còn lại 404); giới hạn 30 lần/phút/IP (429). |
| D-05 (hủy đơn) | Cửa hàng hủy đơn đã thanh toán: hoàn 100% cho khách, thu hồi vé QR và mã nhận hộ, **không trả tồn kho** (đồ ăn không hoàn lại được). Khách tự hủy đơn đã thanh toán trước khung nhận 60 phút (R1-043): hoàn 100% và trả tồn kho (giữ nguyên quy tắc cũ). |
| D-06 (thanh toán) | Tiền đến cho đơn không còn chờ thanh toán (đã PAID, đã hủy, đã nhận) hoặc quá hạn giữ suất: không đổi trạng thái đơn, hoàn 100%. Sai số tiền: lưu giao dịch ở trạng thái đối soát thủ công rồi báo lỗi. |

## 3. Việc còn mở
- BUG-012, BUG-022; ghi D-01..D-06 vào BRD chính thức (bản nguồn ở thư mục này).
- Cột `soldQuantity` vẫn bằng 0 trong DB (chỉ đổi chỗ đọc).
- Chưa có kiểm tra tổng tiền hoàn không vượt tiền đã thu trên toàn đơn (chỉ phần khiếu nại có chặn hoàn trùng).
- Chưa chạy lại `run-audit-all`, e2e web, smoke Android sau đợt sửa nghiệp vụ; chưa rà Rescue Pool, Rescue Bridge, đổi/tặng suất, đánh giá, gói dịch vụ.
- Đổi `PAYMENT_WEBHOOK_SECRET` trước khi dùng thật.
