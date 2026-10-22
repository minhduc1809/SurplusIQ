/**
 * TRI THỨC HƯỚNG DẪN SỬ DỤNG SURPLUSIQ DÀNH CHO CHATBOT
 * Nguồn: docs/d_li_u_chatbot_h_ng_d_n_s_d_ng_surplusiq.md
 * Định dạng chuẩn: [Tên nút / Màn hình] ➔ [Bước tiếp theo] kèm Lưu ý, Quy tắc, Nguyên nhân & Cách xử lý.
 * Không yêu cầu render nút bấm điều hướng; trả lời tự thân hoàn chỉnh bằng Markdown văn bản.
 */

export const SURPLUSIQ_CORE_RULES_TEXT = `
## QUY TẮC CHUNG CỐT LÕI SURPLUSIQ:
1. Giữ suất chờ thanh toán: Tối đa 10 phút. Quá hạn tự nhả suất (nếu đã chuyển khoản muộn sẽ được hoàn tiền 100%).
2. Số lượng đặt: Từ 1 đến 5 suất/đơn (tùy giới hạn quán cài đặt), dùng tối đa 1 mã ưu đãi/đơn.
3. Hủy đơn đã thanh toán: Khách phải hủy trước giờ bắt đầu nhận hàng ít nhất 60 phút (hoàn tiền 100%). Sát giờ hơn (< 60 phút) không thể tự hủy trên app, nếu có sự cố phải dùng chức năng [Báo sự cố] hoặc [Khiếu nại].
4. Khóa đặt hàng (Bom hàng): Khách không đến nhận 3 lần trong vòng 30 ngày ➔ Hệ thống tự động khóa quyền đặt hàng trong 7 ngày.
5. Khiếu nại & Xử lý: Khách gửi khiếu nại trong vòng 24 giờ kể từ lúc nhận hàng; Quán phải phản hồi xử lý trong vòng 48 giờ (quá hạn 48h hệ thống tự động hoàn tiền 100% cho khách).
6. Mã OTP & Bảo mật: OTP có hiệu lực 5 phút. Nhập sai OTP hoặc mật khẩu 5 lần ➔ Tạm khóa tài khoản 15 phút. Gửi lại OTP tối đa 3 lần/giờ.
7. Giới hạn lưu trữ (Khách): Tối đa 5 địa điểm đã lưu, 50 quán yêu thích, 50 deal đã lưu, 20 deal xem gần đây, 10 cảnh báo deal bật cùng lúc (tối đa 3 thông báo/ngày, không gửi trong khung 22:00 - 07:00).
8. Giới hạn AI: Khách hàng hỏi tối đa 30 lượt/ngày. Chủ quán: Gói Cơ bản 10 lượt/tháng, Gói Pro 300 lượt/tháng.
`;

export const CUSTOMER_GUIDE_KNOWLEDGE_PROMPT = `
${SURPLUSIQ_CORE_RULES_TEXT}

## HƯỚNG DẪN THAO TÁC TRÊN APP KHÁCH HÀNG (THEO ĐỊNH DẠNG [NÚT/MÀN HÌNH] ➔ [BƯỚC TIẾP]):

1. Tài khoản & Bảo mật:
- Đăng ký: Màn hình Đăng nhập ➔ [Đăng ký] ➔ Nhập Họ tên (2-60 ký tự), SĐT/Email, Mật khẩu (≥ 8 ký tự, gồm chữ & số) ➔ Tích đồng ý Điều khoản ➔ [Đăng ký] ➔ Nhập OTP 6 số từ email ➔ [Xác nhận].
- Đăng nhập: Mở App ➔ Nhập [Tài khoản] (SĐT/Email) & [Mật khẩu] ➔ [Đăng nhập] (hoặc [Tiếp tục với Google]).
- Quên mật khẩu: Màn hình Đăng nhập ➔ [Quên mật khẩu?] ➔ Nhập SĐT/Email ➔ [Gửi mã xác thực] ➔ Nhập OTP 6 số & Mật khẩu mới ➔ [Đặt lại mật khẩu].
- Đổi mật khẩu: Tab [Tôi] ➔ [Đổi mật khẩu] ➔ Nhập mật khẩu hiện tại, mật khẩu mới (≥ 8 ký tự chữ & số) & OTP ➔ [Đổi mật khẩu].
- Bật/Tắt 2FA: Tab [Tôi] ➔ [Xác thực hai bước] ➔ Gạt công tắc: Bật (nhập mã OTP) / Tắt (nhập mật khẩu).
- Hồ sơ ăn uống & Dị ứng: Tab [Tôi] ➔ [Hồ sơ ăn uống] ➔ Chọn chất dị ứng / Ăn chay / Món không ăn ➔ Bật đồng ý lưu dữ liệu ➔ [Lưu].
- Xóa tài khoản: Tab [Tôi] ➔ [Quyền riêng tư & dữ liệu] ➔ [Yêu cầu xóa tài khoản] ➔ Nhập mật khẩu xác nhận (Chờ 7 ngày để ẩn danh; không xóa được khi còn đơn/khiếu nại đang mở).

2. Vị trí & Tìm kiếm Deal:
- Cấp quyền vị trí & Bán kính: Mở App ➔ [Cho phép dùng vị trí hiện tại] ➔ Kéo thanh trượt bán kính (0.5 - 10 km) ➔ [Áp dụng vị trí & Khám phá].
- Lưu địa điểm (Tối đa 5): Tab [Tôi] ➔ [Địa điểm của tôi] ➔ [+ Thêm địa điểm] ➔ Nhập Tên, chọn địa chỉ/ghim bản đồ, chỉnh bán kính ➔ [Lưu].
- Tìm kiếm tự nhiên bằng AI: Tab [Khám phá] ➔ Bấm ô [Tìm món ngon, tiệm...] ➔ Gõ câu tự nhiên (VD: "bánh ngọt dưới 30k gần chỗ làm sau 19h") ➔ Xem kết quả khớp bộ lọc.
- Thiết lập Rescue Radar: Tab [Deal] ➔ [Khả năng nhận cao] ➔ [Thiết lập Radar] ➔ Chọn điểm xuất phát, khung giờ nhận, ngân sách ➔ Bật [Ưu tiên deal nhận kịp] ➔ Xác nhận.
- Xem chi tiết Deal & TrustPass: Bấm vào Deal ➔ Xem giá, khung giờ nhận, số suất còn. Bấm [Thành phần, dị ứng & TrustPass] để xem chi tiết hạn dùng, bảo quản, nguồn gốc do quán khai báo.

3. Đặt hàng, Thanh toán & Nhận hàng:
- Giữ suất (Đặt hàng): Mở Deal ➔ [Đặt giữ suất] ➔ Chọn [Số lượng suất] (nút - / +, từ 1-5), nhập [Ghi chú cho tiệm], chọn [Ưu đãi] ➔ Bấm [Giữ suất • <Số tiền>].
- Thanh toán VietQR: Sau khi giữ suất ➔ Mở app ngân hàng quét mã [VietQR] (giữ nguyên số tiền và nội dung bắt đầu bằng SUQ...) trong vòng 10 phút ➔ Quay lại app bấm [Kiểm tra thanh toán] (cách nhau ≥ 1 phút) hoặc tải ảnh biên lai nếu ngân hàng báo chậm.
- Xem vé nhận hàng (QR / PIN): Tab [Tôi] ➔ [Đơn hàng của tôi] ➔ Tab [Đang mở] ➔ Bấm [Xem vé nhận] ➔ Đưa mã QR cho quán quét hoặc đọc Mã PIN 6 ký tự dự phòng.
- Báo "Tôi sắp đến": Mở chi tiết đơn đã thanh toán (trong khung giờ nhận) hoặc màn hình Vé nhận ➔ Bấm [Tôi sắp đến] (chỉ báo 1 lần/đơn).
- Nhờ người nhận hộ: Mở chi tiết đơn đã thanh toán ➔ [Tạo mã nhận hộ] ➔ Gửi mã 8 ký tự cho người nhận hộ (Muốn hủy bấm [Thu hồi mã]).
- Báo sự cố khi đến nhận: Mở chi tiết đơn đã thanh toán (trong khung nhận) ➔ [Báo sự cố] ➔ Chọn loại sự cố (Quán đóng cửa, Món chưa sẵn sàng, Sai món, Chờ lâu...) + mô tả + tối đa 3 ảnh ➔ Gửi (Quán không phản hồi sau 2 giờ sẽ tự động hoàn tiền).
- Hủy đơn đã thanh toán: Mở chi tiết đơn ➔ [Hủy đơn] ➔ Chọn lý do ➔ Xác nhận hủy (Phải hủy trước giờ mở nhận ≥ 60 phút; nhớ cài trước Tài khoản nhận hoàn tiền).

4. Khiếu nại, Đánh giá & Hỗ trợ:
- Gửi khiếu nại (Trong 24h sau khi nhận): Chi tiết đơn đã nhận ➔ [Khiếu nại] ➔ Chọn loại vi phạm ➔ Nhập mô tả (10-500 ký tự) + đính tối đa 3 ảnh (≤ 5MB/ảnh) ➔ [Gửi]. Quán có 48 giờ để phản hồi xử lý.
- Đánh giá quán: Chi tiết đơn đã nhận ➔ [Đánh giá] ➔ Chọn 1-5 sao + nhận xét (≤ 300 ký tự) ➔ [Gửi đánh giá].
- Cài tài khoản nhận hoàn tiền: Tab [Tôi] ➔ [Tài khoản nhận hoàn tiền] ➔ Chọn Ngân hàng, nhập Số tài khoản & Tên chủ tài khoản ➔ [Lưu].
- Đổi điểm thưởng: Tab [Tôi] ➔ [Điểm thưởng] ➔ Chọn ưu đãi ➔ [Đổi] ➔ [Xác nhận đổi] (Tối đa 3 lần đổi/ngày; điểm hết hạn sau 180 ngày).

5. Tra cứu nhanh lỗi thường gặp của Khách:
- Tài khoản bị tạm khóa đặt hàng: Do không đến nhận 3 lần trong 30 ngày. Cách xử lý: Chờ hết 7 ngày khóa (xem tại Tab [Tôi] ➔ [Trạng thái khóa đặt]).
- Đơn hết hạn 10 phút: Do chưa quét thanh toán kịp. Đặt lại đơn mới; nếu tiền đã trừ thì hệ thống hoàn 100% vào tài khoản nhận hoàn tiền.
- Đã chuyển tiền nhưng đơn chưa đổi trạng thái: Chờ 1-2 phút bấm [Kiểm tra thanh toán] hoặc tải ảnh biên lai chuyển khoản.
- Không tự hủy được đơn: Do đã dưới 60 phút trước giờ nhận. Nếu đến nơi gặp sự cố, hãy bấm [Báo sự cố] hoặc [Khiếu nại].
- Không tìm thấy quán / Danh sách deal trống: Cấp quyền vị trí cho app, kéo tăng bán kính tìm kiếm (lên 5-10 km) hoặc bấm [Đặt lại] bộ lọc.
`;

export const STORE_GUIDE_KNOWLEDGE_PROMPT = `
${SURPLUSIQ_CORE_RULES_TEXT}

## HƯỚNG DẪN VẬN HÀNH DÀNH CHO CHỦ CỬA HÀNG (APP & WEB MERCHANT):

1. Gói Dịch Vụ Cửa Hàng:
- Chỉ có 1 vai trò duy nhất là Chủ cửa hàng (Owner).
- Gói Cơ bản (Miễn phí): 20 suất mở/ngày, nhập CSV 100 dòng/lần, 2 ưu đãi cùng lúc, 4 chiến dịch/tháng, xuất đơn 5 lần/tháng, xuất báo cáo 3 lần/tháng, xem hao hụt 7 ngày, AI hỏi đáp 10 lượt/tháng.
- Gói Pro (Dùng thử 1 tháng hoặc trả phí): 100 suất mở/ngày, nhập CSV 500 dòng/lần, 10 ưu đãi cùng lúc, 30 chiến dịch/tháng, xuất đơn 60 lần/tháng, xuất báo cáo 30 lần/tháng, xem hao hụt 365 ngày, AI hỏi đáp 300 lượt/tháng. Mở khóa: Dự báo số lượng, Định giá động theo giờ, Chế độ giá tự động, Phân nhóm khách, Rescue Lab.
- Nâng cấp / Gia hạn gói Pro: Menu [Cửa hàng] ➔ [Gói dịch vụ] ➔ [Gia hạn gói Chuyên nghiệp] ➔ Quét mã QR thanh toán ➔ [Kiểm tra thanh toán].

2. Hồ sơ & Cài đặt Vận hành:
- Cập nhật hồ sơ & Giờ mở cửa: Menu [Cửa hàng] (hoặc [Cài đặt cửa hàng] trên Web) ➔ [Hồ sơ cửa hàng] ➔ Sửa tên, địa chỉ, SĐT, giờ đóng/mở T2 - CN ➔ [Lưu].
- Nộp hợp đồng pháp lý: Menu [Cửa hàng] ➔ [Hồ sơ kinh doanh và hợp đồng] ➔ Chọn loại hình (Cá nhân / Hộ kinh doanh / Công ty), tải file hợp đồng đã ký ➔ Gửi duyệt.
- Cài đặt quy tắc kinh doanh: Menu [Cửa hàng] ➔ [Cài đặt vận hành & quy tắc] ➔ Đặt Giờ nhận mặc định (tối đa 3h), Giá sàn (≥ giá vốn), Tỷ lệ giá vốn, Chế độ định giá (Duyệt tay / Tự động), Thời gian trễ cho phép (0-30 phút), Suất tối đa/đơn (1-5), Bật/tắt nhận hộ ➔ [Lưu].
- Tạm ngưng / Mở lại quán hôm nay: Menu [Cửa hàng] ➔ [Tạm ngưng / mở lại] ➔ [Tạm ngưng hôm nay] (Chọn lý do; các suất mở tự đóng, đơn đã thanh toán vẫn phải giao). Khi bán lại bấm [Mở lại cửa hàng].

3. Quản lý Món & TrustPass (Hồ sơ minh bạch):
- Thêm món mới: Tab [Món] ➔ [Thêm món mới] ➔ Nhập Tên món (2-80 ký tự), Danh mục, Giá gốc, Giá vốn, Trọng lượng, Hạn dùng, Thành phần, Chất dị ứng, Ảnh ➔ [Lưu].
- Nhập món hàng loạt từ CSV: Tab [Món] ➔ Màn hình Nhập món ➔ Tải file mẫu, điền dữ liệu (dấu ;) ➔ Tải file CSV lên ➔ Kiểm tra bảng ➔ Nhập các dòng hợp lệ.
- Khai báo TrustPass: Tab [Món] ➔ Chọn món ➔ [Hồ sơ minh bạch] ➔ Nhập thành phần, dị ứng, giờ chuẩn bị, hạn dùng (phải sau giờ chuẩn bị), hướng dẫn bảo quản ➔ [Lưu].

4. Quản lý Suất bán, Tồn kho & Túi bất ngờ:
- Tạo suất bán hôm nay: Tab [Suất] ➔ [Tạo suất hôm nay] ➔ Chọn món, nhập Số lượng (1-500), Giá bán (bội số của 500, từ Giá sàn đến Giá gốc), Khung nhận (tối đa 3h, trong giờ mở cửa) ➔ [Lưu nháp] hoặc [Mở bán].
- Nhân bản suất hôm qua: Tab [Suất] ➔ [Nhân bản suất hôm qua] ➔ Tích chọn suất ➔ Sửa nhanh số lượng/giá/giờ ➔ [Tạo suất hôm nay].
- Tạo Túi bất ngờ: Tab [Suất] ➔ [Túi bất ngờ] ➔ Nhập tên túi, số lượng (1-500), giá bán cố định, giá trị ước tính tối thiểu (≥ 1.000đ), chọn danh mục món ➔ [Mở bán].
- Điều chỉnh tồn kho: Tab [Suất] ➔ Chọn suất ➔ [Điều chỉnh tồn] ➔ Nhập số cộng/trừ ➔ Chọn lý do (Làm thêm, Hỏng, Bán tại quầy...) ➔ Xác nhận.
- Đóng / Hủy suất: Tab [Suất] ➔ Chọn [Đóng suất] (chọn lý do) hoặc [Hủy suất] (chọn lý do; các đơn đã mua sẽ tự hủy và hoàn tiền 100%).

5. Đơn hàng, Quét QR Giao hàng & Xử lý Khiếu nại:
- Quét QR / Nhập PIN giao hàng: Mở [Xác nhận nhận hàng] ➔ Quét mã QR của khách (hoặc nhập Mã PIN 6 ký tự / Mã nhận hộ 8 ký tự) ➔ Kiểm tra thông tin ➔ Giao món ➔ Bấm [Xác nhận đã giao] (Chỉ xác nhận được trong khung nhận + tối đa 15 phút trễ).
- Xử lý khiếu nại (Trong 48 giờ): Mở [Khiếu nại] ➔ Chọn khiếu nại "Chờ xử lý" ➔ Chọn 1 trong 3:
  * [Chấp nhận]: Nhập số tiền hoàn (> 0 và ≤ tổng đơn) + ghi chú.
  * [Từ chối]: Nhập lý do rõ ràng (10-300 ký tự).
  * [Gia hạn]: Xin thêm thời gian xử lý (tối đa 1 lần khi chưa quá 48h).
- Xử lý sự cố nhận hàng của khách: Tab [Đơn hàng] ➔ Mở đơn "Chờ quán xử lý" ➔ Chọn xác nhận lỗi / mời khách quét lại / phản bác kèm ghi chú (Trong vòng 2 giờ, quá hạn tự hoàn tiền).
- Trả lời đánh giá: Mở [Đánh giá của khách] ➔ Lọc [Chưa phản hồi] ➔ Nhập phản hồi (≤ 300 ký tự, chỉ trả lời 1 lần) ➔ Gửi.

6. Báo cáo, Đối soát & Sao kê Tuần:
- Xem Báo cáo: Mở [Báo cáo] ➔ Xem các tab [Tổng quan] (hao hụt & thu hồi), [So sánh kỳ], [Theo món], [Theo giờ], [Hiệu quả giá], [Tác động môi trường].
- Đối soát & Tải sao kê: Mở [Đối soát và sao kê] ➔ Xem thực nhận dự kiến tuần này ➔ Chọn kỳ sao kê ➔ Bấm tải file CSV.
- Trợ lý AI Cửa hàng: Mở mục [AI] / [Trợ lý AI] ➔ Tab [Hỏi đáp] để hỏi số liệu; Tab [Tóm tắt tuần]; Mục [Cảnh báo bất thường] & [Đề xuất hành động] để bấm [Chấp nhận] / [Bỏ qua].
`;

/**
 * Trình khớp câu hỏi hướng dẫn sử dụng dành cho KHÁCH HÀNG (Customer App Guide Matcher)
 * Trả về câu trả lời Markdown chi tiết theo đúng tài liệu.
 */
export function matchCustomerAppGuide(norm: string): string | null {
  // 1. Quét mã QR / Vé nhận hàng / Nhập PIN / Không quét được QR
  if (
    norm.includes('quet qr') ||
    norm.includes('ma pin') ||
    norm.includes('ve nhan') ||
    norm.includes('lay mon') ||
    norm.includes('nhan hang') ||
    norm.includes('khong quet duoc') ||
    norm.includes('loi ma qr')
  ) {
    return (
      '### Hướng dẫn Xem vé nhận hàng & Nhận món tại quán:\n\n' +
      '* **Cách mở vé nhận:** Tab `[Tôi]` ➔ `[Đơn hàng của tôi]` ➔ Tab `[Đang mở]` ➔ Bấm `[Xem vé nhận]` (hoặc mở chi tiết đơn) ➔ Đưa mã **QR** cho quán quét hoặc đọc **mã PIN 6 ký tự** dự phòng.\n' +
      '* **Báo sắp đến:** Mở chi tiết đơn đã thanh toán hoặc màn hình Vé nhận ➔ Bấm `[Tôi sắp đến]` (chỉ bấm 1 lần/đơn để quán chuẩn bị trước).\n' +
      '* **Nhờ người nhận hộ:** Mở chi tiết đơn đã thanh toán ➔ `[Tạo mã nhận hộ]` ➔ Gửi mã 8 ký tự cho người đi lấy hộ.\n' +
      '* **Nếu quán báo không quét được mã QR:**\n' +
      '  1. Kiểm tra xem bạn có đến đúng chi nhánh của quán không.\n' +
      '  2. Đảm bảo đến đúng khung giờ nhận (quán chỉ quét được trong khung giờ + tối đa 15 phút trễ).\n' +
      '  3. Đọc cho nhân viên **Mã PIN dự phòng 6 số** (Mã PIN không chứa các ký tự dễ nhầm: `0`, `O`, `1`, `I`, `L`) hoặc **Mã nhận hộ 8 ký tự** để quán nhập tay.'
    );
  }

  // 1. Khóa tài khoản / Bom hàng / Không đến nhận (Ưu tiên kiểm tra trước để tránh nhầm với đặt hàng)
  if (
    norm.includes('khoa dat') ||
    norm.includes('bi khoa') ||
    norm.includes('bom hang') ||
    norm.includes('khong den lay') ||
    norm.includes('khong den nhan') ||
    norm.includes('mo khoa')
  ) {
    return (
      '### Quy định Khóa đặt hàng do không đến nhận (Bom hàng):\n\n' +
      '* **Nguyên nhân:** Khách hàng đặt đơn đã thanh toán nhưng không đến nhận hàng **3 lần trong vòng 30 ngày**.\n' +
      '* **Hình thức xử lý:** Hệ thống tự động khóa quyền đặt hàng mới trong vòng **7 ngày** nhằm đảm bảo công bằng cho các cửa hàng đối tác.\n' +
      '* **Cách kiểm tra:** Vào Tab `[Tôi]` ➔ Bấm `[Trạng thái khóa đặt]` để xem lịch sử số lần vi phạm và thời điểm chính xác tài khoản được mở khóa tự động.\n' +
      '* **Lưu ý:** Hết thời hạn 7 ngày, quyền đặt hàng sẽ tự động được khôi phục bình thường mà bạn không cần phải làm đơn khiếu nại.'
    );
  }

  // 2. Hủy đơn hàng / Hoàn tiền
  if (
    norm.includes('huy don') ||
    norm.includes('huy dat') ||
    norm.includes('hoan tien') ||
    norm.includes('rut don') ||
    norm.includes('doi y')
  ) {
    return (
      '### Quy định & Thao tác Hủy đơn hàng:\n\n' +
      '* **Cách hủy đơn:** Mở chi tiết đơn hàng ➔ Bấm `[Hủy đơn]` ➔ Chọn lý do ➔ Bấm xác nhận hủy.\n' +
      '* **Quy tắc thời gian (Bắt buộc):**\n' +
      '  - Đơn đã thanh toán chỉ có thể hủy trước giờ bắt đầu nhận hàng ít nhất **60 phút** (hoàn tiền 100%).\n' +
      '  - Nếu còn dưới 60 phút trước giờ nhận, nút hủy sẽ bị khóa. Bạn không thể tự hủy trên app.\n' +
      '* **Nếu đến quán gặp sự cố (quán đóng cửa, hết món, chờ quá lâu):** Mở chi tiết đơn ➔ Bấm `[Báo sự cố]` ➔ Chọn loại sự cố kèm ảnh chụp để được hỗ trợ hoàn tiền tự động sau 2 giờ.\n' +
      '* **Nhận tiền hoàn:** Vào Tab `[Tôi]` ➔ `[Tài khoản nhận hoàn tiền]` để nhập số tài khoản ngân hàng nhận tiền hoàn tự động.'
    );
  }

  // 3. Khiếu nại & Đánh giá
  if (
    norm.includes('khieu nai') ||
    norm.includes('chat luong kem') ||
    norm.includes('do an hong') ||
    norm.includes('sai mon') ||
    norm.includes('thieu mon') ||
    norm.includes('danh gia')
  ) {
    return (
      '### Hướng dẫn Gửi Khiếu nại & Đánh giá đơn hàng:\n\n' +
      '* **Gửi khiếu nại:** Chi tiết đơn hàng đã nhận ➔ Bấm `[Khiếu nại]` ➔ Chọn loại vi phạm ➔ Nhập mô tả chi tiết (10-500 ký tự) + đính kèm tối đa 3 ảnh chụp thực tế (≤ 5MB/ảnh) ➔ `[Gửi]`.\n' +
      '* **Thời hạn khiếu nại:**\n' +
      '  - Khách phải gửi khiếu nại trong vòng **24 giờ** kể từ thời điểm nhận hàng.\n' +
      '  - Cửa hàng có tối đa **48 giờ** để phản hồi (chấp nhận hoàn tiền hoặc từ chối kèm lý do). Nếu quán quá hạn 48h không phản hồi, hệ thống sẽ **tự động hoàn tiền 100%** cho bạn.\n' +
      '* **Gửi đánh giá quán:** Chi tiết đơn đã nhận ➔ Bấm `[Đánh giá]` ➔ Chọn từ 1 đến 5 sao và viết nhận xét (≤ 300 ký tự) ➔ Bấm `[Gửi đánh giá]` (có thể sửa trong vòng 24h).'
    );
  }

  // 4. Đặt hàng / Giữ suất 10 phút / Thanh toán VietQR
  if (
    norm.includes('dat hang') ||
    norm.includes('giu suat') ||
    norm.includes('10 phut') ||
    norm.includes('vietqr') ||
    norm.includes('chuyen khoan') ||
    norm.includes('thanh toan') ||
    norm.includes('kiem tra thanh toan')
  ) {
    return (
      '### Quy trình Đặt giữ suất & Thanh toán VietQR:\n\n' +
      '* **Bước 1 (Giữ suất):** Mở Deal ➔ Bấm `[Đặt giữ suất]` ➔ Chọn `[Số lượng suất]` (từ 1 đến 5 suất), nhập `[Ghi chú cho tiệm]`, chọn mã `[Ưu đãi]` (nếu có) ➔ Bấm `[Giữ suất • <Số tiền>]`.\n' +
      '* **Bước 2 (Thanh toán):** Hệ thống giữ suất tối đa trong **10 phút**. Mở app ngân hàng quét mã `[VietQR]`, giữ nguyên số tiền và nội dung chuyển khoản bắt đầu bằng `SUQ...` ➔ Quay lại app bấm `[Kiểm tra thanh toán]`.\n\n' +
      '> **Lưu ý quan trọng:**\n' +
      '- Sau 10 phút chưa thanh toán, hệ thống sẽ tự động nhả suất cho người khác. Nếu bạn lỡ chuyển khoản muộn, hệ thống sẽ hoàn trả 100% tiền vào tài khoản hoàn tiền của bạn.\n' +
      '- Nếu đã chuyển khoản thành công nhưng đơn chưa đổi trạng thái: Chờ 1-2 phút rồi bấm lại `[Kiểm tra thanh toán]` (mỗi lần cách nhau ≥ 1 phút) hoặc tải ảnh biên lai chuyển khoản để hệ thống đối soát.'
    );
  }

  // 6. Tìm kiếm deal / Bán kính / Bộ lọc / Vị trí / Không thấy quán
  if (
    norm.includes('tim mon') ||
    norm.includes('ban kinh') ||
    norm.includes('vi tri') ||
    norm.includes('khong thay quan') ||
    norm.includes('deal trong') ||
    norm.includes('bo loc') ||
    norm.includes('radar') ||
    norm.includes('tim kiem')
  ) {
    return (
      '### Hướng dẫn Tìm kiếm & Khám phá Deal cứu món:\n\n' +
      '* **Cấp quyền vị trí & Chỉnh bán kính:** Mở App ➔ Chọn `[Cho phép dùng vị trí hiện tại]` ➔ Kéo thanh trượt bán kính từ **0.5 km đến 10 km** ➔ `[Áp dụng vị trí & Khám phá]`.\n' +
      '* **Tìm kiếm thông minh bằng AI:** Tab `[Khám phá]` ➔ Bấm ô `[Tìm món ngon, tiệm...]` ➔ Bạn có thể gõ câu tự nhiên như: *"bánh ngọt dưới 30k gần Duy Tân sau 18h"*, AI sẽ tự động phân tích và lọc deal phù hợp.\n' +
      '* **Nếu không thấy quán hoặc danh sách Deal trống:**\n' +
      '  1. Bấm vào thanh địa chỉ trên cùng Trang chủ để kéo tăng bán kính tìm kiếm (lên 5 - 10 km).\n' +
      '  2. Bấm vào biểu tượng `[Bộ lọc]` góc phải thanh tìm kiếm ➔ Bấm `[Đặt lại]` để xóa các bộ lọc giá/khung giờ quá hẹp.\n' +
      '  3. Lưu tối đa 5 địa chỉ quen thuộc tại Tab `[Tôi]` ➔ `[Địa điểm của tôi]` để chuyển đổi nhanh giữa Nhà riêng và Công ty.'
    );
  }

  // 7. Hướng dẫn tổng quan / Cách sử dụng app chung cho khách
  if (
    norm.includes('huong dan') ||
    norm.includes('cach dung') ||
    norm.includes('su dung app') ||
    norm.includes('dung app') ||
    norm.includes('ung dung') ||
    norm.includes('bat dau') ||
    norm.includes('chuc nang') ||
    norm.includes('tinh nang')
  ) {
    return (
      '### Cẩm nang 3 bước sử dụng ứng dụng SurplusIQ dành cho Khách hàng:\n\n' +
      '* **Bước 1: Tìm món & Giữ suất:** Mở Tab `[Khám phá]` hoặc `[Deal]` ➔ Chọn món ăn yêu thích còn dư trong ngày ➔ Bấm `[Đặt giữ suất]` (từ 1 đến 5 suất/đơn).\n' +
      '* **Bước 2: Quét mã VietQR trong 10 phút:** Mở app ngân hàng quét mã `[VietQR]` hiển thị trên màn hình với đúng số tiền và nội dung `SUQ...` ➔ Quay lại app bấm `[Kiểm tra thanh toán]`.\n' +
      '* **Bước 3: Đến quán nhận hàng đúng giờ:** Đến cửa hàng đúng khung giờ nhận đã ghi trên đơn ➔ Mở Tab `[Tôi]` ➔ `[Đơn hàng của tôi]` ➔ Bấm `[Xem vé nhận]` để đưa mã **QR** cho nhân viên quét (hoặc đọc **mã PIN 6 số** dự phòng).\n\n' +
      '> **Một số quy tắc quan trọng bạn cần ghi nhớ:**\n' +
      '- Hủy đơn đã thanh toán phải thực hiện trước giờ mở nhận ít nhất **60 phút**.\n' +
      '- Không đến nhận hàng **3 lần trong 30 ngày** sẽ bị tạm khóa đặt hàng 7 ngày.\n' +
      '- Sau khi nhận hàng, bạn có **24 giờ** để gửi khiếu nại nếu món ăn gặp sự cố chất lượng.'
    );
  }

  return null;
}

/**
 * Trình khớp câu hỏi hướng dẫn sử dụng dành cho CHỦ CỬA HÀNG (Store / Merchant Guide Matcher)
 * Trả về câu trả lời Markdown chi tiết theo đúng tài liệu.
 */
export function matchStoreAppGuide(norm: string): string | null {
  // 1. Quét QR giao món / Nhập PIN / Khách đến nhận hàng
  if (
    norm.includes('quet qr') ||
    norm.includes('quet ma') ||
    norm.includes('ma pin') ||
    norm.includes('giao mon') ||
    norm.includes('khach den lay') ||
    norm.includes('xac nhan giao') ||
    norm.includes('nhap pin')
  ) {
    return (
      '### Quy trình Quét mã QR & Giao món cho khách tại quầy:\n\n' +
      '* **Bước 1:** Khách xuất trình Vé nhận hàng trên ứng dụng SurplusIQ.\n' +
      '* **Bước 2:** Mở mục `[Xác nhận nhận hàng]` trên app chủ quán (hoặc bấm biểu tượng Quét QR trên thanh điều hướng).\n' +
      '* **Bước 3:** Hướng camera quét mã **QR** của khách. Nếu camera lỗi hoặc mã mờ, bạn chuyển sang bấm nhập **Mã PIN 6 ký tự** dự phòng (hoặc Mã nhận hộ 8 ký tự do khách cung cấp).\n' +
      '* **Bước 4:** Kiểm tra thông tin đơn hàng khớp đúng món và số lượng ➔ Bàn giao món cho khách ➔ Bấm `[Xác nhận đã giao]`.\n\n' +
      '> **Lưu ý nghiệp vụ:**\n' +
      '- Hệ thống chỉ cho phép quét xác nhận trong khung giờ nhận hàng đã cài đặt + tối đa **15 phút trễ** cho phép.\n' +
      '- Bạn có thể mở mục `[Lịch hẹn nhận hàng]` để xem trước số lượng suất cần chuẩn bị theo từng khung 15 phút và nhận diện khách có gắn nhãn *"Khách sắp đến"*.'
    );
  }

  // 2. Đăng suất bán / Túi bất ngờ / Chỉnh sửa tồn kho
  if (
    norm.includes('dang mon') ||
    norm.includes('tui bat ngo') ||
    norm.includes('suat cuu') ||
    norm.includes('mo ban') ||
    norm.includes('tao suat') ||
    norm.includes('suat ban') ||
    norm.includes('dieu chinh ton') ||
    norm.includes('dong suat') ||
    norm.includes('huy suat')
  ) {
    return (
      '### Hướng dẫn Đăng suất bán & Quản lý tồn kho cuối ngày:\n\n' +
      '* **Đăng suất bán món cụ thể:** Tab `[Suất]` ➔ `[Tạo suất hôm nay]` ➔ Chọn món đang hoạt động ➔ Nhập Số lượng (1-500), Giá bán (bội số 500đ, từ Giá sàn đến Giá gốc), Khung giờ nhận (tối đa 3h trong giờ mở cửa) ➔ Bấm `[Mở bán]`.\n' +
      '* **Đăng Túi bất ngờ (Surprise Bag):** Tab `[Suất]` ➔ Bấm `[Túi bất ngờ]` ➔ Nhập tên túi, số lượng (1-500), giá bán cố định, giá trị ước tính tối thiểu (≥ 1.000đ) ➔ Chọn danh mục món ➔ Bấm `[Mở bán]`.\n' +
      '* **Nhân bản nhanh:** Tab `[Suất]` ➔ Bấm `[Nhân bản suất hôm qua]` để copy nhanh các suất bán cũ chỉ với 1 chạm.\n' +
      '* **Điều chỉnh tồn kho khi bán thêm/hỏng:** Tab `[Suất]` ➔ Chọn suất ➔ Bấm `[Điều chỉnh tồn]` ➔ Nhập số lượng tăng (+) hoặc giảm (-) ➔ Chọn lý do (Làm thêm, Hỏng, Bán tại quầy...) ➔ Xác nhận.\n' +
      '* **Đóng hoặc Hủy suất:** Chọn `[Đóng suất]` (nếu hết hàng sớm) hoặc `[Hủy suất]` (nếu gặp sự cố; lưu ý các đơn khách đã mua sẽ tự động hủy và hoàn tiền 100%).'
    );
  }

  // 3. Xử lý khiếu nại của khách
  if (
    norm.includes('khieu nai') ||
    norm.includes('khach phan anh') ||
    norm.includes('den bu') ||
    norm.includes('xu ly khieu nai') ||
    norm.includes('hoan tien cho khach')
  ) {
    return (
      '### Quy trình Xử lý Khiếu nại khách hàng (Trong 48 giờ):\n\n' +
      '* **Màn hình xử lý:** Mở mục `[Khiếu nại]` (hoặc mục `[Khách hàng]` trên Web Merchant) ➔ Chọn khiếu nại có trạng thái *"Chờ xử lý"* ➔ Xem hình ảnh và mô tả của khách.\n' +
      '* **Lựa chọn 1 trong 3 hành động:**\n' +
      '  1. `[Chấp nhận]`: Nhập số tiền đồng ý hoàn trả (> 0 và ≤ tổng đơn hàng) + lời xin lỗi/ghi chú gửi khách.\n' +
      '  2. `[Từ chối]`: Nhập lý do từ chối rõ ràng và minh bạch (10 - 300 ký tự).\n' +
      '  3. `[Gia hạn]`: Xin thêm thời gian xác minh nội bộ với nhân viên ca trực (tối đa 1 lần khi khiếu nại chưa quá hạn 48h).\n\n' +
      '> **Quy định quan trọng:** Cửa hàng có tối đa **48 giờ** để giải quyết. Nếu quá 48 giờ không phản hồi, hệ thống SurplusIQ sẽ **tự động chấp nhận khiếu nại và hoàn tiền 100%** từ doanh thu đối soát của quán.'
    );
  }

  // 4. Đối soát tài chính / Sao kê tuần / Rút tiền / Doanh thu
  if (
    norm.includes('doi soat') ||
    norm.includes('sao ke') ||
    norm.includes('rut tien') ||
    norm.includes('chu ky') ||
    norm.includes('nhan tien') ||
    norm.includes('giai ngan') ||
    norm.includes('doanh thu') ||
    norm.includes('bao cao')
  ) {
    return (
      '### Cơ chế Báo cáo Doanh thu & Đối soát tài chính Tuần:\n\n' +
      '* **Xem Báo cáo Doanh thu & Hao hụt:** Mở mục `[Báo cáo]` ➔ Xem số đơn hoàn tất, doanh thu gộp, lượng kg thực phẩm đã cứu và chỉ số giảm CO2.\n' +
      '* **Xem Đối soát & Tải sao kê:** Mở mục `[Đối soát và sao kê]` ➔ Xem số tiền thực nhận dự kiến tuần này (`Doanh thu gộp - Phí hoa hồng - Hoàn tiền - Phí gói`).\n' +
      '* **Chu kỳ đối soát:**\n' +
      '  - Hệ thống tự động chốt sao kê tuần vào cuối Chủ nhật hàng tuần.\n' +
      '  - Các kỳ sao kê đã khóa (`LOCKED`) sẽ được giải ngân về tài khoản ngân hàng của quán kèm mã Checksum SHA-256 bảo đảm tính bất biến.\n' +
      '  - Bạn có thể bấm nút `[Tải CSV]` hoặc `[Tải PDF]` để xuất bảng kê đối soát phục vụ kế toán.'
    );
  }

  // 5. Gói dịch vụ Pro vs Cơ bản
  if (
    norm.includes('goi pro') ||
    norm.includes('goi dich vu') ||
    norm.includes('chuyen nghiep') ||
    norm.includes('goi co ban') ||
    norm.includes('nang cap') ||
    norm.includes('gia han')
  ) {
    return (
      '### Bảng so sánh Quyền lợi Gói dịch vụ Cửa hàng:\n\n' +
      '* **Gói Cơ bản (Miễn phí vĩnh viễn):**\n' +
      '  - 20 suất mở bán/ngày, nhập CSV 100 dòng/lần, 2 mã ưu đãi cùng lúc, 4 chiến dịch thông báo/tháng.\n' +
      '  - Xem lịch sử báo cáo & hao hụt 7 ngày, hỏi đáp AI 10 lượt/tháng.\n' +
      '* **Gói Chuyên nghiệp (Pro - Dùng thử 1 tháng hoặc trả phí):**\n' +
      '  - 100 suất mở bán/ngày, nhập CSV 500 dòng/lần, 10 ưu đãi cùng lúc, 30 chiến dịch/tháng.\n' +
      '  - Xem lịch sử báo cáo 365 ngày, hỏi đáp AI 300 lượt/tháng.\n' +
      '  - **Mở khóa tính năng nâng cao:** Dự báo số lượng AI, Định giá tự động theo giờ, Phân nhóm khách hàng CRM và Phòng thí nghiệm mô phỏng Rescue Lab.\n' +
      '* **Cách nâng cấp / gia hạn:** Menu `[Cửa hàng]` ➔ `[Gói dịch vụ]` ➔ `[Gia hạn gói Chuyên nghiệp]` ➔ Quét mã QR thanh toán ➔ Bấm `[Kiểm tra thanh toán]`.'
    );
  }

  // 6. Thêm món mới / Hồ sơ minh bạch TrustPass
  if (
    norm.includes('them mon') ||
    norm.includes('sua mon') ||
    norm.includes('trustpass') ||
    norm.includes('ho so minh bach') ||
    norm.includes('thanh phan') ||
    norm.includes('di ung')
  ) {
    return (
      '### Hướng dẫn Thêm món ăn & Khai báo Hồ sơ minh bạch (TrustPass):\n\n' +
      '* **Thêm món mới:** Tab `[Món]` ➔ Bấm `[Thêm món mới]` ➔ Điền Tên món (2-80 ký tự), Danh mục, Giá gốc, Giá vốn, Trọng lượng chuẩn (gram), Thời hạn dùng chuẩn ➔ Bấm `[Lưu]`.\n' +
      '* **Khai báo TrustPass:** Tab `[Món]` ➔ Chọn món cần khai báo ➔ Bấm `[Hồ sơ minh bạch]` ➔ Điền thông tin chuẩn: Thành phần nguyên liệu, Các chất gây dị ứng (đậu phộng, hải sản, sữa...), Giờ chuẩn bị, Hạn sử dụng an toàn và Hướng dẫn bảo quản ➔ Bấm `[Lưu]`.\n' +
      '* **Ý nghĩa:** TrustPass giúp món ăn của bạn được gắn huy hiệu minh bạch, tăng 40% tỷ lệ khách tin tưởng đặt đơn cứu món.'
    );
  }

  // 7. Hướng dẫn tổng quan / Quy trình vận hành chung cho Chủ quán
  if (
    norm.includes('huong dan') ||
    norm.includes('cach dung') ||
    norm.includes('su dung app') ||
    norm.includes('dung app') ||
    norm.includes('van hanh') ||
    norm.includes('ung dung') ||
    norm.includes('bat dau') ||
    norm.includes('quy trinh') ||
    norm.includes('chuc nang')
  ) {
    return (
      '### Quy trình 3 bước vận hành cửa hàng trên SurplusIQ:\n\n' +
      '* **Bước 1: Đăng suất bán cuối ngày:** Vào Tab `[Suất]` ➔ Bấm `[Tạo suất hôm nay]` hoặc `[Túi bất ngờ]` ➔ Cài đặt số lượng suất, giá bán (giảm 40% - 60% so với giá gốc) và khung giờ nhận hàng trước giờ quán đóng cửa.\n' +
      '* **Bước 2: Quét mã giao hàng tại quầy:** Khi khách đến nhận, mở mục `[Xác nhận nhận hàng]` ➔ Quét mã **QR** trên app của khách (hoặc nhập **Mã PIN 6 số** dự phòng) ➔ Kiểm tra đúng món ➔ Giao đồ và bấm xác nhận.\n' +
      '* **Bước 3: Đóng ca & Theo dõi đối soát:** Vào mục `[Báo cáo]` để kiểm tra doanh thu trong ngày và lượng thức ăn đã giải cứu thành công. Hệ thống tự động chốt sao kê tuần và giải ngân định kỳ về tài khoản ngân hàng của bạn tại mục `[Đối soát và sao kê]`.\n\n' +
      '> **Một số tính năng quan trọng khác bạn nên biết:**\n' +
      '- Menu `[Cửa hàng]` ➔ `[Tạm ngưng / mở lại]` nếu quán cần nghỉ đột xuất hôm nay.\n' +
      '- Mục `[Khiếu nại]` để xử lý các phản ánh của khách trong vòng 48 giờ.'
    );
  }

  return null;
}
