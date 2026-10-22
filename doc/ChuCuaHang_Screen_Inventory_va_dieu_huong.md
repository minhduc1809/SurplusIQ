# Screen Inventory và bảng điều hướng: app Chủ cửa hàng

> Nguồn: route trong `apps/android-merchant/.../MainActivity.kt` và mã màn hình. Gộp các route cùng chức năng thành một dòng. Trạng thái dựa trên đọc mã và chụp màn hình thực tế một số màn, chưa kiểm thử tay hết.

## 1. Screen Inventory

| Mã | Tên màn | Mục đích | Route/điểm vào | Thành phần chính | Hành động → màn đích | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| A01 | Đăng nhập | Vào tài khoản chủ/nhân viên | (auth) login | Email, mật khẩu, quên mật khẩu | Đăng nhập → Hôm nay; Quên mật khẩu → A03; Đăng ký → A02; Kích hoạt → A05 | Đủ | Đăng nhập Google chưa có |
| A02 | Đăng ký cửa hàng | Tạo tài khoản + cửa hàng 3 bước | (auth) register | Họ tên, email, mật khẩu, tên/địa chỉ/SĐT cửa hàng, điều khoản | Tiếp → bước kế; Gửi → A04 | Thiếu một phần | Thiếu loại hình, bản đồ (BE chưa có) |
| A03 | Quên mật khẩu | Gửi mã OTP đặt lại | (auth) forgot | Email | Gửi mã → A04 (đặt lại) | Đủ |  |
| A04 | Xác thực OTP / Đặt lại | Nhập OTP, đặt mật khẩu mới | (auth) verify/reset | Ô OTP 6 số, mật khẩu mới | Xác nhận → A01 | Đủ |  |
| A05 | Kích hoạt nhân viên | Nhập mã mời, đặt mật khẩu | (auth) activate | Mã mời, mật khẩu | Kích hoạt → Hôm nay | Đủ | Chưa có deep link |
| B01 | Hôm nay (Dashboard) | Tổng quan trong ngày | today | Lịch tuần, thẻ doanh thu, Truy cập nhanh (9 ô), trạng thái cửa hàng, thẻ chỉ số, biểu đồ tuần, Cần xử lý | Ô nhanh → B02/QR/Suất/Số cuối ngày/Báo cáo/Rescue Lab/Timeline/Khiếu nại/Đánh giá; Trạng thái → D04; Cần xử lý → B03 | Đủ |  |
| B02 | Việc cần làm | Danh sách việc + cấu hình nhắc | tasks | Thẻ việc, mức khẩn, giờ nhắc | Nút việc → màn xử lý | Đủ |  |
| B03 | Thông báo | Danh sách có tab theo loại | notifications | Tab loại (số chưa đọc), thẻ có icon loại, Đọc tất cả | Chạm thông báo → Đơn/Khiếu nại/Đánh giá/Đề xuất giá | Đủ |  |
| B04 | Tài khoản | Hồ sơ cá nhân, đổi mật khẩu, đăng xuất | account | Thông tin, đổi mật khẩu, đăng xuất | Cửa hàng → Thêm; Đăng xuất → A01 | Đủ |  |
| C01 | Đơn hàng | Danh sách đơn theo ngày/trạng thái | orders (tab) | Bộ chọn ngày, tab trạng thái, tìm mã, thẻ đơn có icon trạng thái, xuất CSV | Chạm đơn → C02; Lịch hẹn → C04; Xuất CSV | Đủ |  |
| C02 | Chi tiết đơn | Xem và hủy đơn | order/{id} | Mã, trạng thái, món, tiền, mốc thời gian, khiếu nại liên quan | Hủy đơn (có lý do, xác nhận) | Đủ | Khiếu nại liên quan chưa chạm mở C-khiếu nại |
| C03 | Quét QR nhận hàng | Xác nhận đơn bằng QR/mã dự phòng | verify (tab giữa) | Hướng dẫn 3 bước, nút mở camera, ô mã 6/8 ký tự | Mở camera → kết quả; Xác nhận mã → kết quả | Đủ | Dùng trình quét Google Play services, không xin quyền camera riêng |
| C04 | Lịch hẹn nhận hàng | Nhóm đơn theo khung giờ | pickup-schedule | Khung giờ, danh sách đơn | Chạm đơn → C02 | Đủ |  |
| D01 | Thực phẩm: Món | Danh mục món dạng lưới 2 cột | items (tab) | Chuyển Món/Suất, tìm, lọc nhóm/trạng thái, sắp xếp, thẻ món | Thêm → D02; Thẻ → D03; ⋯ Nhập CSV/Kiểm tra dữ liệu | Đủ |  |
| D02 | Tạo / Sửa món | Form món | item-new, item-edit/{id} | Ảnh (chọn từ máy), tên, nhóm, giá, HSD, thành phần, dị ứng | Lưu → D03 | Đủ | AI mô tả món chưa nối |
| D03 | Chi tiết món | Xem món, TrustPass, suất liên quan | item/{id} | Ảnh/icon, chỉ số, thẻ TrustPass, lịch sử suất | Sửa → D02; TrustPass → D05; Lưu trữ/Khôi phục | Đủ |  |
| D04 | Nhập món CSV | Nhập hàng loạt | items-import | Chọn tệp, xem trước, báo lỗi dòng | Nhập → D01 | Đủ |  |
| D05 | TrustPass | Hồ sơ minh bạch món | trustpass/{id} | Thành phần, dị ứng, chuẩn bị, hạn dùng, bảo quản, lịch sử, cờ rà soát | Lưu và công bố | Thiếu một phần | Chưa có nháp |
| D06 | Kiểm tra dữ liệu món | Phát hiện món thiếu thông tin | items-quality | Danh sách vấn đề | Chạm → D02 | Đủ |  |
| E01 | Thực phẩm: Suất bán | Danh sách suất | offers (thuộc tab Thực phẩm) | Chuyển Món/Suất, lọc, thẻ suất | Tạo → E02; Thẻ → E03; ⋯ Nhân bản/Túi bất ngờ/Gợi ý tặng | Đủ |  |
| E02 | Tạo suất / Nhân bản | Mở bán suất cuối ngày | offer-new, offers-clone | Món, số lượng, giá, khung nhận | Lưu → E03 | Đủ |  |
| E03 | Chi tiết/Sửa suất | Điều chỉnh, đóng, hủy | offer/{id} | Thông tin, tồn, lịch sử giá | Sửa, đóng, hủy; Lịch sử → E04 | Đủ |  |
| E04 | Lịch sử suất | Thay đổi của suất | offer-history/{id} | Dòng thời gian | — | Đủ |  |
| E05 | Túi bất ngờ | Gộp món thành túi | surprise-bags | Danh sách, form tạo | Tạo túi | Đủ |  |
| E06 | Gợi ý tặng | Phần còn lại có thể tặng | donation-suggestions | Danh sách gợi ý | Chuyển Rescue Bridge | Đủ |  |
| F01 | Thêm (menu) | Cổng vào mọi nghiệp vụ còn lại | more (tab) | Thẻ tài khoản, nhóm Hồ sơ/Rescue/Gói/Dự báo/AI/Báo cáo/Ưu đãi/Hỗ trợ/Nhân viên/Khách | Mỗi dòng → màn tương ứng | Đủ | Cũng mở được từ Tài khoản (store-menu) |
| F02 | Hồ sơ cửa hàng | Tên, địa chỉ, SĐT, giờ mở | store-profile | Form, giờ 7 ngày | Lưu | Thiếu một phần | Logo: chưa nối tải ảnh |
| F03 | Cài đặt vận hành & quy tắc | Khung giờ, giá sàn, suất tối đa, trễ, nhận hộ | store-settings | Form, tab lịch sử thay đổi | Lưu | Đủ |  |
| F04 | Tạm ngưng/Mở lại | Dừng nhận đơn | store-pause | Thẻ trạng thái, hộp xác nhận | Tạm ngưng/Mở lại | Đủ |  |
| F05 | Lịch cửa hàng | Ngày nghỉ, giờ đặc biệt | store-schedule | Lịch tháng, form khai báo | Khai báo, sửa, xóa | Đủ |  |
| F06 | Xuất dữ liệu | Xuất đơn, sao kê | data-export | Chọn kỳ, nút xuất, hạn mức | Xuất CSV | Thiếu một phần | Thiếu PDF, báo cáo hao hụt |
| F07 | Nhật ký hoạt động | Audit 12 tháng | activity-log | Lọc hành động/ngày, thẻ log | Chạm log → chi tiết | Đủ |  |
| G01 | Gói dịch vụ | So sánh gói, dùng thử Pro | subscription | Thẻ gói, trạng thái | Nâng cấp → G02 | Đủ |  |
| G02 | Gia hạn gói | Thanh toán gia hạn | subscription-renew | Chu kỳ, thanh toán | Thanh toán | Đủ |  |
| G03 | Hóa đơn gói | Lịch sử thanh toán | invoices | Danh sách hóa đơn | — | Đủ |  |
| G04 | Hạn mức sử dụng | Đã dùng/còn lại | quotas | Thanh tiến độ theo tính năng | Nâng cấp → G01 | Đủ |  |
| H01 | Dự báo số lượng | Gợi ý số làm ngày mai (Pro) | forecast | Thẻ dự báo theo món | Ghi đè, giải thích | Đủ |  |
| H02 | Số thực tế cuối ngày | Nhập đã làm/bán/hết hàng | forecast-actuals | Form theo món | Lưu | Đủ |  |
| H03 | Sự kiện đặc biệt | Lễ, khuyến mãi | special-events | Danh sách, form | Thêm/xóa | Đủ |  |
| H04 | Xu hướng dự báo | Độ chính xác, 7 ngày tới | forecast-trends | Biểu đồ đường | — | Đủ |  |
| H05 | Đề xuất giá theo giờ | Duyệt giá giảm | price-proposals | Thẻ đề xuất, đếm ngược | Duyệt/Từ chối | Đủ | Áp dụng giá gợi ý trực tiếp chưa nối |
| H06 | Lịch sử quyết định giá | Đổi giá theo ngày | price-history | Danh sách theo ngày | — | Đủ |  |
| J01 | Rescue Timeline | Lô sắp hết hạn theo nguy cơ | rescue-timeline | Danh sách lô, mức nguy cơ | Chạm lô → xử lý | Đủ |  |
| J02 | Rescue Pool | Gom nhu cầu mua chung | rescue-pool | Đợt, tiến độ, form cung ứng | Mở/đóng đợt | Đủ |  |
| J03 | Rescue Bridge | Bàn giao cho đơn vị tiếp nhận | rescue-bridge | Yêu cầu, khớp đơn vị | Gửi/xác nhận | Đủ |  |
| J04 | Rescue Lab | Mô phỏng mức giảm | rescue-lab | Danh sách kịch bản, form phiên bản, biểu đồ cột kép Mô phỏng vs Thực tế, ghi nhận áp dụng, so sánh | Tạo, chạy lại, áp dụng, đối chiếu | Thiếu một phần | Chỉ chọn theo nhóm món |
| K01 | Khiếu nại | Danh sách theo trạng thái | complaints | Tab trạng thái, đếm ngược hạn | Chạm → K02 | Đủ |  |
| K02 | Xử lý khiếu nại | Chấp nhận/từ chối/gia hạn | complaint/{id} | Mô tả, ảnh, đơn, hạn | Hoàn tiền, từ chối, gia hạn | Đủ | AI soạn phản hồi chưa nối |
| K03 | Đánh giá | Tổng quan + danh sách | reviews | Điểm TB, tab Tất cả/Tích cực/Tiêu cực/Chưa phản hồi, thẻ đánh giá | Phản hồi công khai | Đủ |  |
| L01 | Báo cáo kinh doanh | Tổng quan, món, giờ, giá, so sánh kỳ | reports | Tab, thẻ pastel hao hụt/thu hồi, thanh xếp hạng | — | Thiếu một phần | Thiếu chuỗi theo ngày (BE) |
| L02 | Đối soát & sao kê | Tuần hiện tại + sao kê đã chốt | reconciliation | Thẻ kỳ, danh sách sao kê | Chạm → L03 | Đủ | Chỉ chủ |
| L03 | Chi tiết sao kê | Bút toán, CSV | statement/{id} | Tổng hợp, dòng bút toán | Tải CSV | Đủ | PDF chưa có |
| L04 | Tác động môi trường | Số suất cứu, chia sẻ | impact | Thẻ số liệu, văn bản chia sẻ | Chia sẻ | Thiếu một phần | Thiếu công tắc công khai |
| M01 | Khách của cửa hàng | Đã mua / Phân nhóm / Yêu thích | customers | Danh sách ẩn danh, 4 thẻ nhóm, biểu đồ tuần | Chi tiết, ghi chú, chỉnh ngưỡng | Đủ | Chủ chỉnh ngưỡng |
| M02 | Ưu đãi | Danh sách + tạo/sửa | promotions | Thẻ ưu đãi, form, xem trước | Tạo, sửa, tạm dừng, kết thúc | Đủ |  |
| M03 | Chiến dịch thông báo | Danh sách + tạo | campaigns | Thẻ chiến dịch, form | Tạo, hủy, xem hiệu quả | Đủ | AI soạn chưa nối |
| N01 | Nhân viên | Danh sách, mời, đổi quyền, khóa, gỡ | staff | Thẻ nhân viên, lời mời | Mời, đổi quyền, khóa (lý do), gỡ | Đủ |  |
| N02 | Hoạt động nhân viên | Thao tác theo người | staff-activity | Chip nhân viên, lọc loại | — | Đủ |  |
| P01 | Trợ lý AI | Hỏi đáp, lịch sử, tuần, cảnh báo, đề xuất, nhật ký, cấu hình | ai | Tab, chat, nút Vì sao? | Gửi, đánh giá, chấp nhận thẻ | Thiếu một phần | Chưa nhập micro |
| P02 | Yêu cầu hỗ trợ | Gửi, trao đổi, đính kèm ảnh | support | Danh sách, form, luồng chat | Gửi, trả lời, đóng | Đủ |  |

Tổng 60 dòng (nhiều route gộp): 52 đủ, 8 còn thiếu một phần.

## 2. Bảng điều hướng

### 2.1 Thanh điều hướng dưới (5 mục)

| Mục | Đích | Gồm |
|---|---|---|
| Hôm nay | B01 | Dashboard, truy cập nhanh |
| Đơn hàng | C01 | Danh sách đơn → C02, C04 |
| Quét QR (nút giữa) | C03 | Quét, nhập mã dự phòng |
| Thực phẩm | D01 / E01 | Chuyển Món ↔ Suất bán bằng hai chip ở đầu màn |
| Thêm | F01 | Mọi nghiệp vụ còn lại, theo nhóm |

Mọi màn chính còn có: chuông thông báo (→ B03) và avatar cửa hàng (→ B04) trên thanh trên; nút nổi Trợ lý AI (→ P01) ở góc dưới, ẩn với nhân viên quầy và trên màn Quét QR.

### 2.2 Truy cập nhanh trên Dashboard (cuộn ngang)

| Ô | Đích |
|---|---|
| Đơn hàng (số đơn chờ nhận) | C01 |
| Quét QR | C03 |
| Suất bán | E01 |
| Số cuối ngày | H02 |
| Hao hụt | L01 |
| Rescue Lab | J04 |
| Rescue Timeline | J01 |
| Khiếu nại (số chờ xử lý) | K01 |
| Đánh giá | K03 |

### 2.3 Nhóm trong "Thêm" (F01)

| Nhóm | Mục |
|---|---|
| Hồ sơ và vận hành | F02 Hồ sơ, F03 Cài đặt, F04 Tạm ngưng, F05 Lịch, F06 Xuất dữ liệu, F07 Nhật ký |
| Rescue | J01 Timeline, J02 Pool, J03 Bridge, J04 Lab |
| Gói dịch vụ | G01 Gói, G03 Hóa đơn, G04 Hạn mức |
| Dự báo và định giá | H01–H06 |
| Trợ lý AI | P01 |
| Báo cáo và đối soát | L01 Báo cáo, L02 Đối soát, L04 Tác động |
| Ưu đãi và chiến dịch | M02, M03 |
| Hỗ trợ | P02 |
| Nhân viên | N01, N02 |
| Khách hàng | M01 Khách, K01 Khiếu nại, K03 Đánh giá |

### 2.4 Quy tắc quay lại

- Chuyển giữa 5 tab: lưu và khôi phục trạng thái từng tab, không chồng thêm lớp.
- Màn con mở từ tab hoặc từ Thêm: nút quay lại về màn trước; màn gốc của tab có thanh trên với avatar và chuông.
- Quyền: nhân viên quầy chỉ dùng được Hôm nay, Đơn hàng, Quét QR, Lịch hẹn và xem món/suất; mục nào backend từ chối sẽ hiện thông báo lỗi tại màn (menu chưa ẩn theo quyền).
