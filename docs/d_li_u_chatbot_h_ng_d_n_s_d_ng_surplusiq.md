# DỮ LIỆU HƯỚNG DẪN SỬ DỤNG SURPLUSIQ (CỨU MÓN) CHO CHATBOT

> **Hướng dẫn cho Chatbot:** Khi người dùng hoặc chủ cửa hàng hỏi cách thực hiện một tính năng, hãy trả lời ngắn gọn theo đúng định dạng luồng nút bấm `[Tên nút / Màn hình]` ➔ `[Bước tiếp theo]` kèm theo `Lưu ý` nếu có.

---

## PHẦN 1: QUY TẮC CHUNG CỐT LÕI
* **Giữ suất chờ thanh toán:** Tối đa 10 phút. Quá hạn tự nhả suất (nếu đã chuyển khoản muộn sẽ được hoàn 100%).
* **Số lượng đặt:** Từ 1 đến 5 suất/đơn (tùy giới hạn của quán), dùng tối đa 1 ưu đãi/đơn.
* **Hủy đơn đã thanh toán:** Phải hủy trước giờ bắt đầu nhận ít nhất **60 phút** (hoàn 100%). Sát giờ hơn không tự hủy được, phải gửi Khiếu nại nếu có sự cố.
* **Khóa đặt hàng (Bom hàng):** Không đến nhận **3 lần trong 30 ngày** ➔ Khóa đặt hàng **7 ngày**.
* **Khiếu nại:** Khách gửi trong **24 giờ** từ lúc nhận; Quán phải phản hồi trong **48 giờ** (quá hạn hệ thống tự hoàn tiền 100%).
* **Mã OTP & Bảo mật:** Hiệu lực 5 phút. Nhập sai OTP hoặc mật khẩu **5 lần** ➔ Khóa **15 phút**. Gửi lại OTP tối đa 3 lần/giờ.
* **Giới hạn lưu trữ (Khách):** Tối đa 5 địa điểm, 50 quán yêu thích, 50 deal đã lưu, 20 deal xem gần đây, 10 cảnh báo deal bật cùng lúc (tối đa 3 thông báo/ngày, không gửi từ 22:00 - 07:00).
* **Giới hạn AI (Khách):** Hỏi đáp 30 lượt/ngày.

---

## PHẦN 2: LUỒNG NGƯỜI DÙNG (APP KHÁCH HÀNG)

### 2.1. Tài khoản & Bảo mật
* **Đăng ký:** Màn hình Đăng nhập ➔ `[Đăng ký]` / `[Tạo tài khoản mới]` ➔ Nhập Họ tên (2-60 ký tự), SĐT/Email, Mật khẩu ($\ge$ 8 ký tự, gồm chữ & số) ➔ Tích đồng ý Điều khoản ➔ `[Đăng ký]` ➔ Nhập 6 số OTP từ email ➔ `[Xác nhận]`.
* **Đăng nhập:** Mở App ➔ Nhập `[Tài khoản]` (SĐT/Email) & `[Mật khẩu]` ➔ `[Đăng nhập]` (hoặc `[Tiếp tục với Google]`).
* **Quên mật khẩu:** Màn hình Đăng nhập ➔ `[Quên mật khẩu?]` ➔ Nhập SĐT/Email ➔ `[Gửi mã xác thực]` ➔ Nhập OTP 6 số & Mật khẩu mới ➔ `[Đặt lại mật khẩu]`.
* **Chỉnh sửa hồ sơ:** Tab `[Tôi]` (Tài khoản) ➔ `[Chỉnh sửa hồ sơ]` ➔ Đổi ảnh ($\le$ 2MB, JPG/PNG), Tên, hoặc bấm `[Đổi]` SĐT/Email (cần nhập OTP) ➔ `[Lưu]`.
* **Đổi mật khẩu:** Tab `[Tôi]` ➔ `[Đổi mật khẩu]` ➔ Nhập mật khẩu hiện tại, mật khẩu mới ($\ge$ 8 ký tự chữ & số) & OTP (nếu có email) ➔ `[Đổi mật khẩu]`.
* **Bật/Tắt xác thực 2 bước (2FA):** Tab `[Tôi]` ➔ `[Xác thực hai bước]` ➔ Gạt công tắc: Bật (nhập mã OTP) / Tắt (nhập mật khẩu).
* **Quản lý thiết bị đăng nhập:** Tab `[Tôi]` ➔ `[Thiết bị đăng nhập]` ➔ `[Đăng xuất]` ở thiết bị lạ hoặc `[Đăng xuất tất cả thiết bị khác]`.
* **Hồ sơ ăn uống & Dị ứng:** Tab `[Tôi]` ➔ `[Hồ sơ ăn uống]` ➔ Chọn chất dị ứng / Ăn chay / Món không ăn ➔ Bật đồng ý lưu dữ liệu ➔ `[Lưu]`.
* **Quyền riêng tư & Xuất dữ liệu:** Tab `[Tôi]` ➔ `[Quyền riêng tư & dữ liệu]` ➔ Bật/tắt các công tắc đồng ý (Vị trí, Ưu đãi, Cá nhân hóa, Ghi nhớ AI). Để tải dữ liệu: Bấm `[Xuất dữ liệu của tôi]` ➔ Mở link tải (hiệu lực 24h).
* **Xóa tài khoản / Hủy xóa:** Tab `[Tôi]` ➔ `[Quyền riêng tư & dữ liệu]` ➔ `[Yêu cầu xóa tài khoản]` ➔ Nhập mật khẩu xác nhận (Chờ 7 ngày để ẩn danh; không xóa được khi còn đơn/khiếu nại đang mở). Muốn hủy: Đăng nhập lại trong 7 ngày ➔ Chọn hủy yêu cầu xóa.
* **Đăng xuất:** Tab `[Tôi]` ➔ Kéo xuống cuối ➔ `[Đăng xuất]`.

### 2.2. Vị trí & Địa điểm
* **Cấp quyền vị trí & Bán kính:** Mở App ➔ `[Cho phép dùng vị trí hiện tại]` (hoặc `[Nhập địa chỉ khác thủ công]`) ➔ Kéo thanh trượt bán kính ($0.5 - 10\text{ km}$) ➔ `[Áp dụng vị trí & Khám phá]`.
* **Lưu địa điểm quen thuộc (Tối đa 5):** Tab `[Tôi]` ➔ `[Địa điểm của tôi]` ➔ `[+ Thêm địa điểm]` ➔ Nhập Tên (1-30 ký tự), tìm địa chỉ/ghim bản đồ, chỉnh bán kính ➔ `[Lưu]`.
* **Ghim vị trí tạm thời:** Trang chủ `[Khám phá]` ➔ Bấm thanh vị trí phía trên ➔ Kéo ghim bản đồ hoặc gõ địa chỉ vào ô `[Nhập địa chỉ...]` ➔ Chỉnh bán kính ➔ `[Xem deal tại đây]` (Muốn lưu lại bấm `[Lưu thành địa điểm]`).

### 2.3. Khám phá & Tìm kiếm Deal
* **Xem danh sách Deal:** Mở tab `[Deal]` ➔ Chọn `[Gần nhất]` hoặc `[Khả năng nhận cao]` (xếp theo Rescue Radar) ➔ Bấm vào thẻ món để xem chi tiết.
* **Thiết lập Rescue Radar:** Tab `[Deal]` ➔ Chọn `[Khả năng nhận cao]` ➔ `[Thiết lập Radar]` ➔ Chọn điểm xuất phát, khung giờ nhận, ngân sách, bộ lọc ăn uống ➔ Bật `[Ưu tiên deal nhận kịp]` ➔ Xác nhận.
* **Xem bản đồ Deal:** Mở tab `[Khám phá]` ➔ Chọn danh mục món hoặc lọc `[Gần nhất]` / `[Giảm nhiều nhất]` / `[Đánh giá cao]` ➔ Bấm ghim trên bản đồ ➔ Chọn `[Chỉ đường]` hoặc `[Ghé thăm]`.
* **Tìm kiếm tự nhiên bằng AI:** Tab `[Khám phá]` ➔ Bấm ô `[Tìm món ngon, tiệm...]` ➔ Gõ tên món hoặc câu tự nhiên (VD: *"bánh ngọt dưới 30k gần chỗ làm sau 19h"*) ➔ Xem kết quả khớp bộ lọc AI.
* **Bộ lọc & Sắp xếp:** Tab `[Khám phá]` ➔ Bấm nút `[Bộ lọc]` (icon phễu/thanh trượt góc phải ô tìm kiếm) ➔ Chọn cách sắp xếp, mức giảm giá tối thiểu (0-90%), giá tối đa, chế độ ăn ➔ `[Áp dụng]` (hoặc `[Đặt lại]`).
* **Xem chi tiết Deal & TrustPass (Hồ sơ minh bạch):** Bấm vào Deal ➔ Xem giá, khung giờ nhận, số suất còn. Bấm `[Thành phần, dị ứng & TrustPass]` (hoặc `[Hồ sơ minh bạch]`) để xem chi tiết hạn dùng, bảo quản, nguồn gốc do quán khai báo.
* **Yêu thích & Xem cửa hàng:** Chi tiết Deal ➔ Bấm tên quán (hoặc `[Xem cửa hàng]`) ➔ Xem tab `[Thực đơn]`, `[Đánh giá]`, `[Thông tin]` ➔ Bấm icon `[Trái tim]` để Yêu thích. Xem lại tại tab `[Yêu thích]` ở thanh menu dưới.
* **Xem Deal đã lưu, đã xem & So sánh (2-3 deal):** Tab `[Deal]` ➔ Bấm icon `[Bookmark/Đã lưu]` góc trên phải ➔ Xem tab `[Đã lưu]` hoặc `[Xem gần đây]`. Để so sánh: Bấm icon `[So sánh]` góc trên phải ➔ Chọn 2-3 deal ➔ `[So sánh]`.
* **Tạo cảnh báo Deal:** Tab `[Tôi]` ➔ Mục Tiện ích khác ➔ `[Cảnh báo deal]` ➔ `[Tạo cảnh báo]` ➔ Chọn `[Danh mục]` hoặc `[Cửa hàng cụ thể]`, chọn loại món, nhập `[Giá tối đa]`, kéo thanh giảm tối thiểu ➔ `[Lưu cảnh báo]`.
* **Xem gợi ý "Dành cho bạn":** Mở mục `[Dành cho bạn]` ➔ Lọc `[Phù hợp nhất]` / `[Giảm sâu nhất]` / `[Sắp hết]` ➔ Bấm `[Vì sao món này hợp với bạn?]` hoặc `[Tùy chỉnh]` để chỉnh hồ sơ vị giác (Cần bật đồng ý cá nhân hóa và có $\ge 3$ đơn đã nhận).

### 2.4. Đặt hàng, Thanh toán & Nhận hàng
* **Giữ suất (Đặt hàng):** Mở Deal ➔ `[Đặt giữ suất]` ➔ Chọn `[Số lượng suất]` (nút `-` / `+`, từ 1-5), nhập `[Ghi chú cho tiệm]`, chọn `[Ưu đãi]` ➔ Bấm `[Giữ suất • <Số tiền>]`.
* **Thanh toán VietQR:** Sau khi giữ suất ➔ Mở app ngân hàng quét mã `[VietQR]` (Giữ nguyên số tiền và nội dung bắt đầu bằng `SUQ...`) trong vòng **10 phút** ➔ Quay lại app bấm `[Kiểm tra thanh toán]` (cách nhau tối thiểu 1 phút) hoặc gửi biên lai nếu lỗi.
* **Xem đơn hàng & Vé nhận hàng (QR/PIN):** Tab `[Tôi]` ➔ `[Đơn hàng của tôi]` ➔ Tab `[Đang mở]` ➔ Bấm `[Xem vé nhận]` (hoặc mở chi tiết đơn) ➔ Đưa mã **QR** cho quán quét hoặc đọc mã **PIN 6 ký tự** dự phòng.
* **Báo "Tôi sắp đến":** Mở chi tiết đơn đã thanh toán (trong khung giờ nhận) hoặc màn hình Vé nhận ➔ Bấm `[Tôi sắp đến]` (chỉ báo 1 lần/đơn).
* **Nhờ người nhận hộ:** Mở chi tiết đơn đã thanh toán ➔ `[Tạo mã nhận hộ]` ➔ Gửi mã 8 ký tự cho người nhận hộ (Muốn hủy bấm `[Thu hồi mã]`).
* **Nhắn tin với quán theo đơn:** Mở chi tiết đơn đã thanh toán ➔ `[Trò chuyện với quán]` ➔ Nhập tin nhắn hoặc chọn mẫu (Tối đa 30 tin/giờ; đóng sau khi hoàn tất đơn 24h).
* **Báo sự cố khi đến nhận:** Mở chi tiết đơn đã thanh toán (trong khung nhận) ➔ `[Báo sự cố]` ➔ Chọn loại sự cố (*Quán đóng cửa, Món chưa sẵn sàng, Sai món, Chờ lâu, Khác*) + mô tả + tối đa 3 ảnh ➔ Gửi (Quán không phản hồi sau 2h sẽ tự hoàn tiền).
* **Theo dõi tiến trình xử lý sự cố:** Mở chi tiết đơn ➔ `[Theo dõi đơn]`.
* **Hủy đơn:** Mở chi tiết đơn ➔ `[Hủy đơn]` ➔ Chọn lý do ➔ Xác nhận hủy (Đơn đã thanh toán phải hủy trước giờ mở nhận $\ge 60$ phút; nhớ cài Tài khoản nhận hoàn tiền).
* **Xem biên nhận / Đặt lại:** Mở chi tiết đơn đã nhận ➔ Bấm `[Xem biên nhận]` (chọn `[Tải PDF]` / `[Chia sẻ]`) hoặc bấm `[Đặt lại]` ➔ `[Đặt nhanh]`.
* **Xem trạng thái khóa đặt hàng:** Tab `[Tôi]` ➔ `[Trạng thái khóa đặt]` (Xem số lần bom hàng trong 30 ngày và ngày mở khóa).

### 2.5. Giỏ cứu hộ & Mua chung (Rescue Pool)
* **Tạo & Đặt Giỏ cứu hộ tự động:** Mở `[Giỏ cứu hộ]` (nút giỏ hàng nổi ở giữa thanh menu dưới) ➔ Nhập Ngân sách, Số người, Khung nhận, Khu vực ➔ `[Tạo giỏ]` ➔ Chọn phương án ➔ `[Xem & Tùy chỉnh giỏ này]` (tăng/giảm/đổi món cùng quán) ➔ `[Đặt giữ giỏ này]` ➔ `[Xác nhận đặt giữ giỏ]` ➔ Thanh toán VietQR trong 10 phút.
* **Đăng ký nhu cầu Mua chung (Rescue Pool):** Mở `[Rescue Pool - Đăng ký nhu cầu]` ➔ Chọn đợt ➔ `[Gửi đăng ký nhu cầu]` ➔ Chọn món, số lượng, ngân sách, khung nhận ➔ `[Gửi]` (Đây chưa phải đơn hàng, chưa thu tiền).
* **Sửa/Rút nhu cầu & Xác nhận mua chung:** Vào `[Nhu cầu của tôi]` ➔ Tab `[Nhu cầu đang chờ gom]` ➔ `[Cập nhật nhu cầu]` để sửa/rút. Khi quán gửi đề nghị cung ứng: Mở thông báo hoặc `[Nhu cầu của tôi]` ➔ Kiểm tra giá cuối & khung nhận ➔ `[Xác nhận mua]` ➔ Thanh toán VietQR. Xem đơn tại tab `[Đơn hàng từ đợt gom]`.

### 2.6. Khiếu nại, Đánh giá & Hỗ trợ
* **Gửi khiếu nại (Trong 24h sau khi nhận):** Chi tiết đơn đã nhận ➔ `[Khiếu nại]` ➔ Chọn loại vi phạm ➔ Nhập mô tả (10-500 ký tự) + đính tối đa 3 ảnh ($\le 5\text{MB}$/ảnh) ➔ `[Gửi]`.
* **Theo dõi, Bổ sung bằng chứng & Rút khiếu nại:** Tab `[Tôi]` ➔ `[Khiếu nại của tôi]` ➔ Chọn khiếu nại (đang *Chờ cửa hàng*) ➔ Bổ sung ảnh/mô tả (tối đa 2 lần) hoặc bấm `[Rút khiếu nại]`.
* **Gửi, Sửa & Ẩn đánh giá:** Chi tiết đơn đã nhận ➔ `[Đánh giá]` ➔ Chọn 1-5 sao + nhận xét ($\le 300$ ký tự) ➔ `[Gửi đánh giá]`. Để sửa (trong 24h) hoặc ẩn: Vào `[Đánh giá của tôi]` ➔ Chọn `[Sửa]` hoặc `[Ẩn]` ➔ `[Ẩn đánh giá]`.
* **Báo cáo vi phạm:** Tại trang Quán / Deal / Đánh giá ➔ Bấm icon `[⋮]` (3 chấm) ➔ `[Báo cáo vi phạm]` / `[Báo cáo cửa hàng]` ➔ Chọn lý do, nhập mô tả ($\le 300$ ký tự) + ảnh ➔ `[Gửi báo cáo]`.
* **Gửi & Theo dõi yêu cầu hỗ trợ:** Tab `[Tôi]` ➔ `[Yêu cầu hỗ trợ]` ➔ `[Tạo yêu cầu mới]` ➔ Chọn loại, đơn liên quan, nhập nội dung (10-1000 ký tự) + tối đa 3 ảnh ➔ `[Gửi]`. Xem phản hồi tại danh sách `[Yêu cầu hỗ trợ]`, nhắn xong bấm `[Đóng yêu cầu]`.
* **Trung tâm trợ giúp:** Tab `[Tôi]` ➔ `[Trung tâm trợ giúp]` ➔ Tìm bài viết hoặc bấm `[Liên hệ hỗ trợ]` / `[Hỏi trợ lý]`.

### 2.7. Thông báo, Giao dịch, Ưu đãi, Điểm & AI
* **Xem thông báo:** Bấm icon `[Chuông]` ở Trang chủ ➔ Xem tab `[Thông báo giao dịch]` hoặc `[Thông báo khuyến mãi]` ➔ `[Đánh dấu đã đọc toàn bộ]`.
* **Cài tài khoản nhận hoàn tiền:** Tab `[Tôi]` ➔ `[Tài khoản nhận hoàn tiền]` ➔ Chọn Ngân hàng, nhập Số tài khoản & Tên chủ tài khoản ➔ `[Lưu]`.
* **Lịch sử giao dịch:** Tab `[Tôi]` ➔ `[Lịch sử giao dịch]` ➔ Lọc `[Thanh toán]` / `[Hoàn tiền]`.
* **Ví ưu đãi:** Tab `[Tôi]` ➔ `[Ví ưu đãi]` ➔ Nhập mã vào ô `[Nhập mã nhận ưu đãi]` ➔ `[Nhận]` (Cần bật đồng ý nhận ưu đãi trong Quyền riêng tư).
* **Đổi điểm thưởng:** Tab `[Tôi]` ➔ `[Điểm thưởng]` ➔ Chọn ưu đãi ➔ `[Đổi]` ➔ `[Xác nhận đổi]` (Tối đa 3 lần đổi/ngày; điểm hết hạn sau 180 ngày).
* **Thành tích sống xanh:** Tab `[Tôi]` ➔ `[Thành tích sống xanh]` ➔ Xem số đơn, kg thực phẩm cứu được, huy hiệu ➔ `[Chia sẻ]`.
* **Hỏi Trợ lý SaveBite AI & Xóa lịch sử AI:** Bấm icon `[Trợ lý AI]` (mặt cười cam góc dưới phải) ➔ Chọn câu gợi ý hoặc gõ câu hỏi (Lưu ý: AI không tự đặt/hủy đơn thay bạn). Để xóa lịch sử: Mở `[Lịch sử hội thoại AI]` ➔ Chọn xóa hội thoại / `[Xóa tất cả]` hoặc bật/tắt `[Ghi nhớ ngữ cảnh]`.

---

## PHẦN 3: LUỒNG CHỦ CỬA HÀNG (APP & WEB MERCHANT)

> **Quy tắc Gói dịch vụ Cửa hàng:** Chỉ có 1 vai trò duy nhất là **Chủ cửa hàng** (không có tài khoản nhân viên).
> * **Gói Cơ bản (Miễn phí):** 20 suất mở/ngày, nhập CSV 100 dòng/lần, 2 ưu đãi cùng lúc, 4 chiến dịch/tháng, xuất đơn 5 lần/tháng, xuất báo cáo 3 lần/tháng, xem hao hụt 7 ngày, AI hỏi đáp 10 lượt/tháng.
> * **Gói Pro (Dùng thử 1 tháng hoặc trả phí):** 100 suất mở/ngày, nhập CSV 500 dòng/lần, 10 ưu đãi cùng lúc, 30 chiến dịch/tháng, xuất đơn 60 lần/tháng, xuất báo cáo 30 lần/tháng, xem hao hụt 365 ngày, AI hỏi đáp 300 lượt/tháng. Mở khóa: *Dự báo số lượng, Định giá động theo giờ, Chế độ giá tự động, Phân nhóm khách, Rescue Lab*.

### 3.1. Tài khoản, Hồ sơ & Cài đặt Vận hành
* **Đăng ký cửa hàng (Trên App):** Màn hình Đăng nhập ➔ `[Đăng ký]` ➔ Nhập Họ tên chủ (2-60 ký tự), Email, Mật khẩu ($\ge 8$ ký tự chữ & số), Tên cửa hàng (2-80 ký tự), Địa chỉ, SĐT ➔ Tích điều khoản ➔ `[Đăng ký]` ➔ Nhập OTP 6 số từ email ➔ Chờ Admin duyệt.
* **Đăng nhập (App & Web):** Nhập Email & Mật khẩu ➔ `[Đăng nhập]` (Trên Web truy cập `/` hoặc `/merchant-v2`).
* **Cập nhật hồ sơ & Giờ mở cửa:** Menu `[Cửa hàng]` (hoặc `[Cài đặt cửa hàng]` trên Web) ➔ `[Hồ sơ cửa hàng]` ➔ Sửa tên, địa chỉ, SĐT, đặt giờ đóng/mở từ Thứ 2 - Chủ nhật ➔ `[Lưu]`.
* **Nộp hợp đồng pháp lý:** Menu `[Cửa hàng]` ➔ `[Hồ sơ kinh doanh và hợp đồng]` ➔ Chọn loại hình (*Cá nhân / Hộ kinh doanh / Công ty*), tải file hợp đồng đã ký ➔ Gửi duyệt.
* **Cài đặt quy tắc kinh doanh:** Menu `[Cửa hàng]` ➔ `[Cài đặt vận hành & quy tắc]` ➔ Đặt Giờ nhận mặc định (tối đa 3h), Giá sàn ($\ge$ giá vốn), Tỷ lệ giá vốn, Chế độ định giá (*Duyệt tay / Tự động*), Thời gian trễ cho phép (0-30 phút), Suất tối đa/đơn (1-5), Bật/tắt nhận hộ ➔ `[Lưu]`.
* **Tạm ngưng / Mở lại quán hôm nay:** Menu `[Cửa hàng]` ➔ `[Tạm ngưng / mở lại]` ➔ `[Tạm ngưng hôm nay]` (Chọn lý do; các suất đang mở sẽ tự đóng, đơn đã thanh toán vẫn phải giao). Khi bán lại bấm `[Mở lại cửa hàng]`.
* **Khai báo lịch nghỉ nhiều ngày / Giờ đặc biệt:** Menu `[Cửa hàng]` ➔ `[Lịch cửa hàng]` ➔ Chọn tháng ➔ `[Khai báo]` ➔ Chọn khoảng ngày & loại (*Nghỉ* hoặc *Giờ đặc biệt*) ➔ `[Lưu]`.
* **Quản lý Gói dịch vụ (Pro):** Menu `[Cửa hàng]` ➔ `[Gói dịch vụ]` ➔ Chọn nâng cấp/dùng thử Pro hoặc hạ gói. Để gia hạn: Vào `[Gia hạn gói Chuyên nghiệp]` ➔ Quét mã QR thanh toán ➔ `[Kiểm tra thanh toán]`. Xem hạn mức tại `[Hạn mức sử dụng]` và tải PDF tại `[Hóa đơn gói]`.

### 3.2. Quản lý Món & Hồ sơ Minh bạch (TrustPass)
* **Thêm / Sửa món:** Tab `[Món]` ➔ `[Thêm món mới]` (hoặc bấm vào món chọn `[Sửa món]`) ➔ Nhập Tên món (2-80 ký tự, không trùng), Danh mục, Giá gốc, Giá vốn, Trọng lượng, Hạn dùng chuẩn, Thành phần, Chất dị ứng, Ảnh món ➔ `[Lưu]`.
* **Nhập món hàng loạt từ CSV:** Tab `[Món]` ➔ Màn hình Nhập món ➔ Tải file mẫu, điền dữ liệu (ngăn cách bằng dấu `;`) ➔ Tải file CSV lên ➔ Kiểm tra bảng ➔ Bấm nhập các dòng hợp lệ.
* **Lưu trữ / Khôi phục món:** Tab `[Món]` ➔ Mở menu của món ➔ Chọn `[Lưu trữ]` (ẩn món) hoặc `[Khôi phục]` (đưa về *Đang dùng*).
* **Kiểm tra dữ liệu thiếu:** Tab `[Món]` ➔ `[Kiểm tra dữ liệu]` ➔ Lọc (*Thiếu trọng lượng / Thiếu giá vốn / Thiếu dị ứng*) ➔ Chọn các món và bổ sung hàng loạt.
* **Khai báo TrustPass (Hồ sơ minh bạch):** Tab `[Món]` ➔ Chọn món ➔ `[Hồ sơ minh bạch]` ➔ Nhập thành phần, dị ứng, giờ chuẩn bị, hạn dùng (phải sau giờ chuẩn bị), hướng dẫn bảo quản ➔ `[Lưu]`.

### 3.3. Quản lý Suất bán, Tồn kho & Túi bất ngờ
* **Tạo suất bán hôm nay:** Tab `[Suất]` ➔ `[Tạo suất hôm nay]` ➔ Chọn món (đang dùng), nhập Số lượng (1-500), Giá bán (bội số của 500, từ Giá sàn đến Giá gốc), Khung nhận (tối đa 3h, trong giờ mở cửa) ➔ `[Lưu nháp]` hoặc `[Mở bán]`.
* **Nhân bản suất hôm qua:** Tab `[Suất]` ➔ `[Nhân bản suất hôm qua]` ➔ Tích chọn các suất ➔ Sửa nhanh số lượng/giá/khung giờ ➔ `[Tạo suất hôm nay]`.
* **Tạo Túi bất ngờ:** Tab `[Suất]` ➔ `[Túi bất ngờ]` ➔ Nhập tên túi, số lượng (1-500), giá bán cố định, giá trị ước tính tối thiểu ($\ge 1.000\text{đ}$), chọn danh mục món (phải khai báo đủ thành phần & dị ứng) ➔ `[Mở bán]`.
* **Chỉnh sửa, Điều chỉnh tồn, Đóng hoặc Hủy suất:** Tab `[Suất]` ➔ Chọn suất:
  * *Sửa:* Đổi số lượng, giá, khung nhận ➔ `[Lưu]` (Đơn đã giữ/thanh toán vẫn giữ giá cũ).
  * *Điều chỉnh tồn:* Nhập số cộng/trừ (tồn mới không được nhỏ hơn số đã bán + đang giữ) ➔ Chọn lý do (*Làm thêm, Hỏng, Bán tại quầy, Khác*) ➔ Xác nhận.
  * *Đóng suất sớm:* Chọn `[Đóng suất]` ➔ Chọn lý do (*Hết nguyên liệu, Đóng cửa, Khác*).
  * *Hủy suất:* Chọn `[Hủy suất]` ➔ Chọn lý do (*Sự cố quán, Sự cố chất lượng, Bất khả kháng, Khác*) ➔ Xác nhận (Các đơn đã mua sẽ tự hủy và hoàn tiền 100%).
* **Ghi nhận tặng phần dư cuối ngày:** Tab `[Suất]` ➔ `[Gợi ý tặng phần còn lại]` (hiện khi còn $\ge 3$ suất và $< 30$ phút) ➔ Sau khi tặng, bấm `[Đã tặng]` ➔ Nhập số lượng (Không tính hoa hồng).

### 3.4. Đơn hàng, Quét QR Nhận hàng & Khiếu nại
* **Quét QR / Nhập PIN giao hàng cho khách:** Mở `[Xác nhận nhận hàng]` ➔ Quét mã QR của khách (hoặc nhập mã PIN 6 ký tự / mã nhận hộ 8 ký tự) ➔ Kiểm tra thông tin hợp lệ ➔ Giao món ➔ Bấm `[Xác nhận đã giao]` / `[Xác nhận nhận hàng]` (Chỉ xác nhận được trong khung nhận + tối đa 15 phút).
* **Xem lịch hẹn chuẩn bị hàng:** Mở `[Lịch hẹn nhận hàng]` ➔ Xem số suất cần chuẩn bị theo từng khung 15 phút và các đơn có nhãn *"Khách sắp đến"*.
* **Hủy đơn do quán:** Tab `[Đơn hàng]` ➔ Chọn đơn chưa nhận ➔ `[Hủy đơn]` ➔ Chọn lý do (*Quán hết nguyên liệu, Quán có việc đột xuất, Sự cố thiết bị, Khác*) ➔ Xác nhận (Hoàn 100% cho khách, không mất hoa hồng, suất không cộng lại vào kho).
* **Xử lý sự cố nhận hàng của khách:** Tab `[Đơn hàng]` ➔ Mở đơn có trạng thái *"Chờ quán xử lý"* ➔ Chọn xác nhận lỗi / mời khách quét lại / phản bác kèm ghi chú ➔ Gửi phản hồi (Trong vòng **2 giờ**, quá hạn tự hoàn tiền).
* **Xử lý Khiếu nại (Trong 48 giờ):** Mở `[Khiếu nại]` (hoặc `[Khách hàng]` trên Web) ➔ Chọn khiếu nại *"Chờ xử lý"* ➔ Chọn 1 trong 3:
  * `[Chấp nhận]`: Nhập số tiền hoàn ($> 0$ và $\le$ tổng đơn) + ghi chú.
  * `[Từ chối]`: Nhập lý do rõ ràng (10-300 ký tự).
  * `[Gia hạn]`: Xin thêm thời gian xử lý (tối đa 1 lần khi chưa quá 48h).
* **Trả lời đánh giá của khách:** Mở `[Đánh giá của khách]` ➔ Lọc `[Chưa phản hồi]` ➔ Nhập phản hồi ($\le 300$ ký tự, chỉ trả lời 1 lần/đánh giá) ➔ Gửi.

### 3.5. Dự báo, Định giá (Gói Pro), Ưu đãi & Báo cáo
* **Xem dự báo & Nhập số thực tế cuối ngày:**
  * *Xem dự báo (Pro):* Mở `[Dự báo số lượng]` (hoặc `[Dự báo & giá Pro]`) ➔ Xem số lượng gợi ý và độ tin cậy (cần $\ge 14$ ngày dữ liệu).
  * *Nhập thực tế cuối ngày:* Mở `[Số thực tế cuối ngày]` ➔ Chọn *Hôm nay* hoặc *Hôm qua* (trong vòng 48h) ➔ Nhập `[Số đã làm]`, số bán tại quầy, giờ hết hàng sớm ➔ `[Lưu]`.
  * *Sự kiện đặc biệt:* Mở `[Sự kiện đặc biệt]` ➔ Nhập ngày, loại sự kiện, mức ảnh hưởng (*Giảm/Trung bình/Tăng*) ➔ `[Lưu]`.
* **Duyệt đề xuất giá giảm theo giờ (Pro):** Mở `[Đề xuất giá theo giờ]` ➔ Xem tab `[Chờ duyệt]` ➔ Bấm `[Duyệt]` hoặc `[Từ chối]` trong vòng **15 phút** (Tối đa 3 lần đổi giá/suất, không thấp hơn giá sàn).
* **Tạo Ưu đãi & Chiến dịch thông báo:**
  * *Tạo ưu đãi:* Mở `[Ưu đãi]` ➔ `[+ Tạo ưu đãi]` ➔ Nhập tên (2-60 ký tự), chọn *Giảm %* (tối đa 50%) hoặc *Giảm tiền* (tối đa 50% giá bán), chọn nhóm khách, thời hạn ➔ `[Lưu]`.
  * *Tạo chiến dịch:* Mở `[Chiến dịch thông báo]` ➔ `[+ Tạo chiến dịch]` ➔ Nhập tiêu đề ($\le 50$ ký tự), nội dung ($\le 150$ ký tự), chọn nhóm khách & giờ gửi ➔ Lên lịch (Muốn hủy phải bấm `[Hủy chiến dịch]` trước giờ gửi $> 15$ phút).
* **Xem Báo cáo & Sao kê đối soát:**
  * *Báo cáo:* Mở `[Báo cáo]` ➔ Xem các tab `[Tổng quan]` (hao hụt & thu hồi), `[So sánh kỳ]`, `[Theo món]`, `[Theo giờ]`, `[Hiệu quả giá]`, `[Tác động môi trường]`.
  * *Đối soát & Tải sao kê:* Mở `[Đối soát và sao kê]` ➔ Xem thực nhận dự kiến tuần này ➔ Chọn kỳ sao kê ➔ Bấm tải file `CSV`.
* **Trợ lý AI Cửa hàng:** Mở mục `[AI]` / `[Trợ lý AI]` ➔ Tab `[Hỏi đáp]` để hỏi số liệu doanh thu/hao hụt; Tab `[Tóm tắt tuần]` xem báo cáo 7 ngày; Mục `[Cảnh báo bất thường]` & `[Đề xuất hành động]` để bấm `[Chấp nhận]` / `[Bỏ qua]` gợi ý từ AI.

### 3.6. Rescue: Cứu hàng nâng cao (App & Web)
* **Rescue Timeline (Theo dõi nguy cơ tồn dư):** Mở `[Rescue Timeline]` ➔ Xem các lô mức *Khẩn cấp / Trung bình / Thấp* ➔ Bấm vào lô ➔ Chọn hành động: Cập nhật tồn, Đề xuất giá, Tạo túi bất ngờ, hoặc mở Rescue Bridge.
* **Rescue Pool (Quản lý đợt mua chung):** Mở `[Rescue Pool]` ➔ Tạo đợt mới (nhập tên, nhóm món, khu vực, giờ mở/đóng, ngưỡng tối thiểu, số lượng tối đa, khung nhận, giá dự kiến) ➔ Chuyển sang `[Mở đăng ký]` ➔ Xem nhu cầu tổng hợp ➔ Chốt đăng ký & Gửi `[Đề nghị cung ứng]` (chốt giá, số lượng, hạn xác nhận) để khách đặt đơn.
* **Rescue Bridge (Bàn giao thực phẩm dư cho tổ chức nhận):** Mở `[Rescue Bridge]` ➔ Chọn suất còn dư & tạo đề nghị (số lượng, bảo quản, hạn nhận) ➔ Chọn đơn vị tiếp nhận & gửi đề nghị (hoặc copy link `/bridge/respond/<mã>` gửi cho đơn vị) ➔ Đơn vị chấp nhận ➔ Xác nhận thỏa thuận ➔ Khi giao hàng, nhập số lượng thực tế & bấm `[Xác nhận bàn giao]`.
* **Rescue Lab (Mô phỏng chiến lược xử lý hàng dư - Gói Pro):** Mở `[Rescue Lab]` ➔ Tạo kịch bản mới ➔ Chọn mục tiêu (*Giảm tồn dư / Tăng doanh thu thu hồi / Tăng tỷ lệ bán / So sánh chiến lược*), khoảng thời gian, nhóm món (cần $\ge 14$ ngày dữ liệu) ➔ `[Chạy kịch bản]` ➔ So sánh 2-3 kịch bản và ghi nhận áp dụng thực tế.

---

## PHẦN 4: TRA CỨU NHANH LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

1. **"Tài khoản đang bị tạm khóa quyền đặt hàng..."**
   * *Nguyên nhân:* Khách không đến nhận hàng 3 lần trong 30 ngày.
   * *Cách xử lý:* Chờ hết hạn khóa 7 ngày (Xem ngày mở tại `[Tôi]` ➔ `[Trạng thái khóa đặt]`).
2. **"Đơn hàng đã hết thời gian giữ suất 10 phút..."**
   * *Nguyên nhân:* Chưa hoàn tất thanh toán trong 10 phút giữ suất.
   * *Cách xử lý:* Đặt lại đơn mới. Nếu đã lỡ chuyển tiền sau khi hết hạn, hệ thống sẽ hoàn lại 100% (Nhớ cài `[Tài khoản nhận hoàn tiền]`).
3. **Đã chuyển khoản VietQR nhưng đơn chưa chuyển sang "Đã thanh toán"**
   * *Nguyên nhân:* Ngân hàng báo chậm hoặc khách sửa sai số tiền / nội dung chuyển khoản (`SUQ...`).
   * *Cách xử lý:* Chờ 1-2 phút rồi bấm `[Kiểm tra thanh toán]` (cách nhau $\ge 1$ phút) và đính kèm ảnh biên lai chuyển khoản để Admin đối soát thủ công.
4. **"Chỉ có thể hủy đơn đã thanh toán trước giờ bắt đầu nhận hàng ít nhất 60 phút..."**
   * *Nguyên nhân:* Bấm hủy khi còn dưới 60 phút trước giờ mở khung nhận.
   * *Cách xử lý:* Không tự hủy được. Nếu đến quán gặp sự cố (quán đóng cửa, hết món...), hãy dùng nút `[Báo sự cố]` hoặc `[Khiếu nại]`.
5. **Quán không quét được mã QR hoặc báo lỗi mã nhận hàng**
   * *Cách xử lý:*
     * Kiểm tra xem khách có đến đúng chi nhánh/cửa hàng của đơn không (*"Mã QR thuộc về cửa hàng khác"*).
     * Kiểm tra khung giờ nhận (chỉ quét được trong khung nhận + tối đa 15 phút trễ).
     * Chuyển sang nhập tay **Mã PIN dự phòng 6 ký tự** (Lưu ý: Mã PIN không bao giờ chứa các ký tự `0`, `O`, `1`, `I`, `L`) hoặc **Mã nhận hộ 8 ký tự**.
6. **Không tìm thấy quán hoặc danh sách Deal trống**
   * *Cách xử lý:* Cấp quyền vị trí cho App, bấm vào thanh địa chỉ ở Trang chủ để kéo tăng bán kính tìm kiếm (lên 5 - 10 km), hoặc bấm `[Đặt lại]` trong phần Bộ lọc.