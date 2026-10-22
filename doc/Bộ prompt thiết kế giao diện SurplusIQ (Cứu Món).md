# Bộ prompt thiết kế giao diện SurplusIQ

Nguồn: SurplusIQ\_BRD\_UC\_Status.xlsx (220 UC: 94 khách, 126 cửa hàng) · Lập ngày 18/10/2026

## 1. Tổng hợp số lượng màn hình

| Đối tượng | Nền tảng | Màn hiện có theo BRD | Màn bổ sung theo đề xuất (dự kiến) |
| --- | --- | --- | --- |
| Khách hàng | App Android | **61** | 14 |
| Chủ cửa hàng (gồm Quản lý, Nhân viên quầy) | Web responsive, thiết kế mobile-first để tái dùng cho app | **74** | 12 |
| Quản trị nền tảng | Web | 0 (BRD chưa có vai này) | 22 |
| **Tổng** |  | **135** | **48** |

Cách đếm: một màn là một trang hoặc view độc lập. Bottom sheet, hộp thoại nhỏ và các biến thể trạng thái được tính vào màn chủ. Một màn có thể phục vụ nhiều UC. Mọi UC trong BRD đều được gán vào ít nhất một màn. Các UC chạy nền của hệ thống (nhả suất, hoàn tiền tự động, chốt đối soát, nhắc giờ nhận…) không có màn riêng mà hiện qua trạng thái, thông báo và màn liên quan. Chưa tính các màn hệ thống dùng chung (splash, mất mạng, bảo trì, yêu cầu cập nhật app, bị từ chối quyền), được mô tả trong prompt nền.

Giả định: BRD ghi phía cửa hàng là web, nên các prompt phía cửa hàng viết cho web responsive (desktop 1440 và mobile 390) để dùng lại khi làm app chủ cửa hàng.

## 2. Danh sách màn hình

### 2.1 Khách hàng (61 màn)

| Nhóm | Số màn | Màn hình |
| --- | --- | --- |
| A. Truy cập và vị trí | 8 | K01 Đăng nhập · K02 Đăng ký · K03 Xác minh OTP · K04 Quên mật khẩu · K05 Đặt mật khẩu mới · K06 Quyền vị trí và bán kính · K07 Địa điểm của tôi · K08 Ghim vị trí tạm |
| B. Khám phá deal | 13 | K09 Trang chủ danh sách deal · K10 Bản đồ deal · K11 Tìm kiếm · K12 Bộ lọc và sắp xếp · K13 Chi tiết deal · K14 Chi tiết cửa hàng · K15 Đánh giá công khai của cửa hàng · K16 So sánh deal · K17 Deal đã lưu và đã xem · K18 Cửa hàng yêu thích · K19 Danh sách cảnh báo deal · K20 Tạo hoặc sửa cảnh báo · K21 Gợi ý dành cho bạn |
| C. Đặt hàng và thanh toán | 12 | K22 Xác nhận đặt · K23 Chọn ưu đãi · K24 Thanh toán VietQR · K25 Kết quả thanh toán · K26 Đơn của tôi · K27 Chi tiết đơn · K28 QR nhận hàng · K29 Mã nhận hộ · K30 Hủy đơn · K31 Biên nhận · K32 Đặt lại món đã mua · K33 Trạng thái khóa đặt |
| D. Hậu mãi và hỗ trợ | 11 | K34 Gửi khiếu nại · K35 Lịch sử khiếu nại · K36 Chi tiết khiếu nại · K37 Gửi đánh giá · K38 Đánh giá của tôi · K39 Báo cáo vi phạm · K40 Gửi yêu cầu hỗ trợ · K41 Danh sách hỗ trợ · K42 Chi tiết hỗ trợ · K43 Trung tâm trợ giúp · K44 Bài viết trợ giúp |
| E. Thông báo, ưu đãi, tác động | 5 | K45 Thông báo · K46 Lịch sử thanh toán và hoàn tiền · K47 Ví ưu đãi · K48 Tác động cá nhân · K49 Huy hiệu và chia sẻ |
| F. Trợ lý AI | 2 | K50 Trợ lý Cứu Món · K51 Lịch sử hội thoại AI |
| G. Tài khoản và quyền riêng tư | 10 | K52 Tài khoản của tôi · K53 Chỉnh sửa hồ sơ · K54 Đổi mật khẩu · K55 Xác thực hai bước · K56 Thiết bị đăng nhập · K57 Cài đặt thông báo · K58 Hồ sơ ăn uống và dị ứng · K59 Quyền riêng tư và đồng ý · K60 Xuất dữ liệu cá nhân · K61 Xóa tài khoản |

### 2.2 Chủ cửa hàng (74 màn)

| Nhóm | Số màn | Màn hình |
| --- | --- | --- |
| 1. Truy cập | 5 | S01 Đăng nhập · S02 Đăng ký tài khoản và cửa hàng · S03 Quên và đặt lại mật khẩu · S04 Kích hoạt tài khoản nhân viên · S05 Tài khoản của tôi |
| 2. Tổng quan | 3 | S06 Bảng điều khiển hôm nay · S07 Việc cần làm · S08 Thông báo |
| 3. Hồ sơ và vận hành | 7 | S09 Hồ sơ cửa hàng · S10 Cài đặt vận hành · S11 Tạm ngưng và mở lại · S12 Lịch cửa hàng · S13 Quy tắc kinh doanh · S14 Xuất dữ liệu cửa hàng · S15 Nhật ký hoạt động |
| 4. Gói dịch vụ | 4 | S16 Gói dịch vụ và dùng thử Pro · S17 Gia hạn gói Pro · S18 Hóa đơn gói · S19 Hạn mức sử dụng |
| 5. Danh mục món | 5 | S20 Danh sách món · S21 Chi tiết món · S22 Tạo và sửa món · S23 Nhập món từ CSV · S24 Kiểm tra dữ liệu |
| 6. Suất và tồn kho | 7 | S25 Danh sách suất · S26 Tạo suất · S27 Nhân bản suất hôm qua · S28 Chi tiết và chỉnh sửa suất · S29 Lịch sử suất · S30 Túi bất ngờ · S31 Gợi ý tặng phần không bán được |
| 7. Dự báo và định giá | 7 | S32 Dự báo số lượng · S33 Nhập số thực tế · S34 Sự kiện đặc biệt · S35 Độ chính xác và xu hướng · S36 Đề xuất giá · S37 Lịch sử quyết định giá · S38 Mô phỏng chính sách giá |
| 8. Đơn và nhận hàng | 4 | S39 Danh sách đơn · S40 Chi tiết đơn · S41 Quét QR nhận hàng · S42 Lịch hẹn nhận hàng |
| 9. Khiếu nại và đánh giá | 3 | S43 Danh sách khiếu nại · S44 Xử lý khiếu nại · S45 Đánh giá của khách |
| 10. Báo cáo và đối soát | 10 | S46 Hao hụt và thu hồi · S47 Doanh thu và đơn · S48 Báo cáo theo món · S49 Phân bố theo giờ · S50 Hiệu quả đề xuất giá · S51 Đối soát · S52 Sao kê tuần · S53 Xuất báo cáo · S54 Tác động môi trường · S55 Chế độ demo |
| 11. Khách của cửa hàng | 3 | S56 Khách đã mua · S57 Phân nhóm khách · S58 Khách yêu thích |
| 12. Ưu đãi và chiến dịch | 4 | S59 Danh sách ưu đãi · S60 Tạo ưu đãi · S61 Chiến dịch thông báo · S62 Tạo chiến dịch |
| 13. Nhân viên | 3 | S63 Danh sách nhân viên · S64 Mời và đổi quyền · S65 Hoạt động nhân viên |
| 14. Trợ lý AI và phân tích | 7 | S66 Trợ lý cửa hàng · S67 Lịch sử hội thoại AI · S68 Báo cáo tuần thông minh · S69 Bất thường và nguyên nhân · S70 Đề xuất hành động · S71 Cấu hình AI · S72 Mức dùng và nhật ký AI |
| 15. Hỗ trợ nền tảng | 2 | S73 Gửi yêu cầu hỗ trợ · S74 Danh sách và trao đổi hỗ trợ |

## 3. Prompt nền (dán một lần ở đầu phiên làm việc, trước các prompt màn)

Bạn là UI designer. Thiết kế giao diện cho SurplusIQ, thương hiệu "Cứu Món": nền tảng bán suất thực phẩm dư cuối ngày với giá giảm. Các nguyên tắc sau áp dụng cho mọi màn:

- Ngôn ngữ giao diện là tiếng Việt, giọng thân thiện, ngắn gọn.
- Khách hàng dùng app Android, khung 390×844, Material Design 3, thanh điều hướng dưới có 5 mục: Khám phá, Bản đồ, Đơn của tôi, Thông báo, Tài khoản. Chủ cửa hàng dùng web responsive: desktop 1440×900 có thanh bên trái nhóm menu, mobile 390×844 có menu dưới hoặc hamburger.
- Màu: xanh lá chủ đạo #2E7D32, xanh nhạt #E8F5E9 cho nền nhấn, cam #F57C00 cho giá và phần trăm giảm, nền #FAFAFA, chữ #1F2937, đỏ #D32F2F cho lỗi và hủy, vàng #F9A825 cho trạng thái chờ. Font Inter hoặc Roboto, bo góc 12px, bóng nhẹ.
- Tiền VND ghi "45.000đ". Giá gốc gạch ngang, giá bán đậm màu cam. Giờ dạng 24 giờ "HH:mm", ngày "dd/MM/yyyy".
- Chip trạng thái đơn: Chờ thanh toán (vàng), Đã thanh toán (xanh dương), Đã nhận (xanh lá), Hết hạn giữ và Hết hạn nhận (xám), Đã hủy (đỏ).
- Mọi màn có đủ bốn trạng thái: đang tải (skeleton), rỗng (minh họa đơn giản, một câu nhắc và nút hành động), lỗi (thông báo ngắn và nút Thử lại) và có dữ liệu.
- Màn hệ thống dùng chung: splash, mất mạng, bảo trì, yêu cầu cập nhật phiên bản, quyền bị từ chối kèm hướng dẫn mở cài đặt.
- Dữ liệu mẫu tiếng Việt thực tế như "Tiệm bánh Lúa Mới", "Bánh mì que pate", "Túi bất ngờ", khoảng cách "350 m".
- Nội dung do AI tạo luôn gắn nhãn "Trợ lý AI". Khi liên quan thành phần hoặc dị ứng thêm dòng "Thông tin chỉ mang tính tham khảo, theo khai báo của cửa hàng". Không dùng cách nói khẳng định về an toàn thực phẩm.
- Dữ liệu khách hiển thị cho cửa hàng luôn rút gọn (chữ cái đầu, mã rút gọn). Không hiện thông tin liên lạc.
- Khả năng truy cập: vùng chạm tối thiểu 48dp, tương phản đạt AA, hỗ trợ cỡ chữ lớn.

## 4. Prompt từng màn: Khách hàng (K01–K61)

Mỗi prompt dưới đây dùng kèm prompt nền ở mục 3.

### K01 Đăng nhập

UC: R1-003

Thiết kế màn Đăng nhập: logo Cứu Món và khẩu hiệu "Cứu món ngon, giảm lãng phí" ở trên; ô Email hoặc số điện thoại; ô Mật khẩu có nút ẩn/hiện; nút chính "Đăng nhập" rộng toàn chiều ngang; liên kết "Quên mật khẩu?" và "Chưa có tài khoản? Đăng ký". Trạng thái: lỗi từng ô, lỗi chung "Sai thông tin đăng nhập", nút đang xử lý có vòng quay. Khi tài khoản đang chờ xóa hiện khối thông báo kèm nút "Khôi phục tài khoản" (cần mật khẩu).

### K02 Đăng ký

UC: R1-001

Thiết kế màn Đăng ký: tiêu đề "Tạo tài khoản"; ô Họ tên (2–60 ký tự); ô Email hoặc SĐT (nhập một trong hai); ô Mật khẩu (từ 8 ký tự, có chữ và số) kèm thanh đo độ mạnh; hộp tích đồng ý Điều khoản và Chính sách quyền riêng tư (liên kết mở bản đầy đủ); công tắc đồng ý dùng vị trí tách riêng, mặc định tắt. Nút "Tạo tài khoản" chỉ bật khi hợp lệ. Hiện lỗi trùng email hoặc SĐT. Gửi xong chuyển sang màn OTP.

### K03 Xác minh OTP

UC: R1-002, R1-013, R1-006

Thiết kế màn Xác minh OTP dùng chung cho đăng ký, xác thực hai bước và đổi email hoặc SĐT: tiêu đề, dòng "Mã đã gửi tới \*\*\*@gmail.com" (che một phần), 6 ô nhập số, bộ đếm "Gửi lại mã sau 45 giây", nút "Xác minh", liên kết "Đổi email/SĐT". Trạng thái: sai mã (ô rung nhẹ, báo số lần thử còn lại), mã hết hạn, bị khóa tạm do thử quá số lần.

### K04 Quên mật khẩu

UC: R1-008

Thiết kế màn nhập Email hoặc SĐT để nhận OTP đặt lại mật khẩu: một ô nhập, nút "Gửi mã", thông báo trung tính "Nếu tài khoản tồn tại, mã đã được gửi" để không lộ thông tin, liên kết quay lại Đăng nhập.

### K05 Đặt mật khẩu mới

UC: R1-008

Thiết kế màn Đặt mật khẩu mới: ô OTP 6 số, Mật khẩu mới, Nhập lại mật khẩu; danh sách điều kiện (từ 8 ký tự, có chữ và số) tự tick xanh theo thời gian thực; nút "Đặt lại mật khẩu". Thành công thì hiện thông báo và về Đăng nhập. Ghi chú các thiết bị khác sẽ bị đăng xuất.

### K06 Quyền vị trí và bán kính

UC: R1-009, R1-012

Thiết kế màn dùng cho lần đầu và trong Cài đặt: minh họa bản đồ, giải thích ngắn vì sao cần vị trí (chỉ để tìm deal gần), nút "Cho phép vị trí" và "Nhập địa chỉ thủ công"; thanh trượt bán kính 0,5–10 km (mặc định 2 km) kèm vòng tròn xem trước trên bản đồ; công tắc "Cho phép dùng vị trí" có thể thu hồi. Trạng thái quyền bị từ chối: hướng dẫn mở cài đặt hệ thống.

### K07 Địa điểm của tôi

UC: R1-015, R1-039

Thiết kế danh sách tối đa 5 địa điểm (Nhà, Nơi làm việc…): mỗi thẻ có nhãn, địa chỉ, bán kính riêng, biểu tượng sửa và xóa. Nút "Thêm địa điểm" mở form: nhãn 1–30 ký tự, tìm địa chỉ hoặc ghim bản đồ, bán kính tùy chọn. Đủ 5 địa điểm thì vô hiệu nút thêm và hiện chú thích. Chạm một thẻ để xem deal tại đó.

### K08 Ghim vị trí tạm

UC: R1-039

Thiết kế bản đồ toàn màn có ghim kéo được và ô tìm địa chỉ ở trên. Thanh dưới hiển thị địa chỉ đang chọn, bán kính và nút "Xem deal tại đây"; chip "Lưu thành địa điểm". Sau khi áp dụng, Trang chủ hiện nhãn nhỏ "Đang xem ở vị trí khác".

### K09 Trang chủ danh sách deal

UC: R1-020, R1-024, R1-025, R1-039, R1-084

Thiết kế màn Khám phá: đầu trang là vị trí hiện tại (hoặc địa điểm đã chọn) và bán kính, ô tìm kiếm, chip lọc nhanh (Bánh mì, Bánh ngọt, Dưới 30k, Sắp hết giờ). Khối ngang "Dành cho bạn" (3–5 thẻ có dòng lý do), sau đó danh sách deal dọc. Thẻ deal gồm ảnh món, tên món, tên cửa hàng, giá gốc gạch ngang, giá bán màu cam, nhãn % giảm, "Còn 3 suất", khung giờ nhận "19:00–21:00", khoảng cách. Cuộn đến cuối thì tải thêm 20 deal. Nút nổi chuyển sang Bản đồ, nút Sắp xếp và Lọc. Trạng thái rỗng: "Chưa có deal quanh bạn" kèm nút "Báo tôi khi có deal" và "Mở rộng bán kính".

### K10 Bản đồ deal

UC: R1-021

Thiết kế bản đồ toàn màn: ghim cửa hàng hiện số deal và giá thấp nhất, chấm vị trí người dùng, thanh tìm kiếm và chip lọc ở trên. Chạm ghim mở thẻ tóm tắt dưới đáy (tên cửa hàng, deal nổi bật, giá thấp nhất, khoảng cách) có nút "Xem chi tiết". Nút "Danh sách" để quay lại, nút định vị lại, gom ghim khi thu nhỏ.

### K11 Tìm kiếm

UC: R1-022, R1-082

Thiết kế màn Tìm kiếm: ô nhập tự lấy focus; mục "Tìm gần đây" và "Bộ lọc đã lưu"; ô gợi ý "Hỏi tự nhiên" (Trợ lý AI) với ví dụ "bánh ngọt dưới 30 nghìn gần chỗ làm sau 19 giờ". Khi người dùng gõ một câu hỏi, hiện bước "Tôi hiểu bạn muốn:" dưới dạng chip bộ lọc (món, giá tối đa, khu vực, giờ) để sửa trước khi xem kết quả. Kết quả là danh sách thẻ deal như Trang chủ. Không có kết quả thì gợi ý nới bộ lọc.

### K12 Bộ lọc và sắp xếp

UC: R1-023, R1-024, R1-033

Thiết kế bottom sheet cao gần toàn màn: chọn nhiều Loại món (chip), thanh trượt Giá tối đa, thanh trượt % giảm tối thiểu 0–90, chọn Khung giờ nhận; mục Sắp xếp (Khoảng cách mặc định, Giá thấp, Giảm nhiều, Sắp hết hạn nhận); nút "Lưu bộ lọc" mở ô đặt tên 1–30 ký tự; chân cố định gồm "Xóa lọc" và "Xem 24 deal".

### K13 Chi tiết deal

UC: R1-026, R1-034, R1-037, R1-085, R1-087

Thiết kế màn Chi tiết deal: carousel ảnh lớn, nút Lưu và Chia sẻ trên đầu; tên món, nhãn % giảm, giá gốc gạch ngang, giá bán; "Còn X suất" kèm thanh tiến trình; khung giờ nhận; hạn dùng; mô tả. Khối "Thành phần và dị ứng do cửa hàng khai báo" dạng chip, cảnh báo đỏ nếu trùng hồ sơ dị ứng của khách. Thẻ cửa hàng (tên, điểm sao, khoảng cách, địa chỉ) mở Chi tiết cửa hàng. Nút "Hỏi trợ lý về món này" (AI chỉ trả lời từ dữ liệu khai báo) và "Vì sao gợi ý?" nếu đến từ gợi ý. Thanh dưới cố định có giá và nút "Đặt ngay". Hết suất thì nút vô hiệu "Đã hết suất" và gợi ý tạo cảnh báo.

### K14 Chi tiết cửa hàng

UC: R1-027, R1-028, R1-029, R1-038, R1-069

Thiết kế màn cửa hàng: ảnh bìa và logo, tên, điểm sao và số đánh giá, giờ mở cửa hôm nay, địa chỉ và khoảng cách; nút tim "Yêu thích", nút "Chỉ đường" (mở ứng dụng bản đồ ngoài), menu "⋯" có "Báo cáo cửa hàng". Hai tab: "Deal đang mở" (thẻ deal) và "Đánh giá". Nếu chưa có deal: thông báo và nút "Báo tôi khi có deal mới".

### K15 Đánh giá công khai của cửa hàng

UC: R1-094, R1-064

Thiết kế danh sách đánh giá: đầu trang điểm trung bình lớn và biểu đồ phân bố 1–5 sao; khối "Tóm tắt từ đánh giá 90 ngày gần nhất" (Trợ lý AI, ba ý chính về chất lượng, đúng giờ, thái độ) có nhãn tham khảo. Mỗi đánh giá có tên rút gọn, sao, nhận xét, ngày và phản hồi của cửa hàng nếu có; menu "⋯" có "Báo cáo đánh giá". Khi chưa đủ số đánh giá tối thiểu thì ẩn tóm tắt AI.

### K16 So sánh deal

UC: R1-036, R1-086

Thiết kế bảng so sánh 2–3 deal cạnh nhau, cuộn ngang được: ảnh, giá gốc, giá bán, % giảm, khoảng cách, khung giờ nhận, thành phần và dị ứng, điểm đánh giá; ô tốt nhất mỗi hàng được tô nổi. Bên dưới là khối "Tóm tắt từ Trợ lý AI" (đoạn ngắn nêu khác biệt dựa trên dữ liệu bảng) và nút "Đặt" trên từng cột. Có nút bỏ một deal khỏi so sánh. Còn dưới 2 deal thì yêu cầu chọn thêm.

### K17 Deal đã lưu và đã xem

UC: R1-034, R1-035

Thiết kế màn hai tab: "Đã lưu" và "Xem gần đây" (tối đa 20). Mỗi mục là thẻ deal nhỏ; deal hết hạn hoặc hết suất có nhãn xám "Đã hết". Chế độ chọn nhiều để bật nút "So sánh" (2–3 deal). Vuốt để bỏ lưu. Rỗng: "Lưu deal để xem sau".

### K18 Cửa hàng yêu thích

UC: R1-028, R1-029

Thiết kế danh sách cửa hàng yêu thích dạng thẻ: logo, tên, điểm sao, khoảng cách, số deal đang mở (huy hiệu xanh khi có), nút tim để bỏ yêu thích kèm thanh hoàn tác. Chạm thẻ mở Chi tiết cửa hàng. Rỗng: giải thích yêu thích giúp nhận thông báo khi cửa hàng có deal mới.

### K19 Danh sách cảnh báo deal

UC: R1-030, R1-031, R1-032

Thiết kế màn "Cảnh báo deal": danh sách thẻ điều kiện, mỗi thẻ ghi tóm tắt ("Bánh ngọt · dưới 40.000đ · giảm từ 30% · 19:00–21:00 · trong 2 km"), công tắc Bật/Tắt, số lần đã kích hoạt và lần cuối; vuốt để xóa, chạm để sửa. Nút nổi "＋ Tạo cảnh báo". Khối đầu trang "Báo tôi khi khu vực có deal" dành cho lúc khu vực chưa có deal. Rỗng: ví dụ cảnh báo gợi ý.

### K20 Tạo hoặc sửa cảnh báo

UC: R1-030, R1-031, R1-032

Thiết kế form: chọn Loại món (chip nhiều lựa chọn) hoặc Cửa hàng cụ thể (có tìm kiếm), Giá tối đa, % giảm tối thiểu, Khung giờ, Bán kính (mặc định theo cài đặt), khung giờ nhận thông báo tùy chọn, công tắc Bật/Tắt. Hiện dòng xem trước "Bạn sẽ nhận thông báo khi…". Nút "Lưu cảnh báo". Lỗi khi chưa chọn điều kiện nào.

### K21 Gợi ý dành cho bạn

UC: R1-084, R1-085, R1-093

Thiết kế màn "Dành cho bạn": danh sách deal được xếp hạng, mỗi thẻ có dòng lý do như "Vì bạn hay mua bánh mì sau 19:00". Menu "⋯" mở sheet "Vì sao gợi ý?" liệt kê các thành phần (đã mua, cửa hàng yêu thích, giờ hay mua, hồ sơ ăn uống) và hành động "Không quan tâm cửa hàng này", "Không quan tâm loại món này", "Tắt cá nhân hóa". Khi chưa đồng ý cá nhân hóa: màn giải thích và nút bật. Có mục "Đã ẩn" để khôi phục.

### K22 Xác nhận đặt

UC: R1-040, R1-049, R1-050, R1-053

Thiết kế màn xác nhận đặt: tóm tắt deal (ảnh nhỏ, tên, cửa hàng); bộ chọn số lượng − / + (từ 1 đến min(5, số còn lại)); chọn giờ hẹn nhận theo mốc 15 phút trong khung nhận (chip); ô ghi chú cho cửa hàng 0–150 ký tự có đếm; dòng "Ưu đãi" (chạm để chọn); bảng tính gồm đơn giá chốt × số lượng, ưu đãi, tổng tiền; thông báo "Giữ suất trong 10 phút sau khi đặt". Nút "Đặt và thanh toán". Lỗi: hết suất khi đặt, đang bị khóa đặt (hiện ngày mở lại), vượt số suất tối đa của cửa hàng.

### K23 Chọn ưu đãi

UC: R1-053, R1-079

Thiết kế bottom sheet "Chọn ưu đãi": ô nhập mã và nút "Áp dụng"; danh sách ưu đãi trong ví (tên, giá trị giảm, điều kiện, hạn dùng); mục không đủ điều kiện làm mờ kèm lý do; chọn một (radio) vì mỗi đơn tối đa 1 ưu đãi; nút "Xác nhận" cập nhật tổng tiền. Lỗi: mã không hợp lệ hoặc đã hết hạn.

### K24 Thanh toán VietQR

UC: R1-041, R1-055, R1-056

Thiết kế màn Thanh toán: đồng hồ đếm ngược giữ suất 10:00 nổi bật; số tiền; ảnh mã VietQR lớn (hoặc nhãn "Cổng giả lập" ở chế độ thử); thông tin nhận (ngân hàng, số tài khoản, nội dung chuyển khoản) có nút sao chép; nút "Lưu mã QR"; nút phụ "Tôi đã chuyển tiền, kiểm tra lại". Khi mở lại app giữa chừng: banner "Bạn có đơn đang giữ" đưa về đây. Hết giờ thì chuyển sang màn kết quả "Hết hạn giữ".

### K25 Kết quả thanh toán

UC: R1-041, R1-042, R1-047, R1-056

Thiết kế một màn với bốn biến thể: (1) Thành công: dấu tick xanh, mã đơn, nút "Xem mã QR nhận hàng"; (2) Đang chờ xác nhận: nút "Kiểm tra lại"; (3) Hết hạn giữ: suất đã nhả, nút "Xem deal khác"; (4) Thanh toán đến muộn: giải thích đang hoàn tiền tự động, trạng thái hoàn Chờ, Hoàn thành hoặc Lỗi, đường dẫn tới Lịch sử thanh toán. Luôn có nút "Về Trang chủ".

### K26 Đơn của tôi

UC: R1-044, R1-045, R1-055

Thiết kế danh sách đơn mới nhất trước: thẻ đơn có ảnh món, tên món × số lượng, cửa hàng, tổng tiền, chip trạng thái, khung nhận; đơn Chờ thanh toán có đồng hồ còn lại và nút "Tiếp tục thanh toán". Thanh tìm theo mã đơn hoặc tên cửa hàng, nút lọc mở sheet (nhiều trạng thái, từ ngày đến ngày). Phân nhóm "Đang hoạt động" và "Đã hoàn tất". Rỗng: "Bạn chưa có đơn nào".

### K27 Chi tiết đơn

UC: R1-046, R1-043, R1-051, R1-052, R1-060, R1-061, R1-064

Thiết kế chi tiết đơn: chip trạng thái, mã đơn, dòng thời gian (Đã giữ, Đã thanh toán, Đã nhận); khối món, số lượng, giá chốt, ưu đãi, tổng tiền, mã giao dịch; thông tin nhận (khung nhận, giờ hẹn, địa chỉ, nút Chỉ đường). Khi Đã thanh toán: nút lớn "Mở mã QR", "Tôi sắp đến" (một lần), "Tạo mã nhận hộ", "Hủy đơn" kèm hạn hủy. Khi Đã nhận: "Đánh giá", "Gửi khiếu nại", "Đặt lại", "Biên nhận". Hiện trạng thái khiếu nại liên quan và dòng "Hoàn tiền" nếu có.

### K28 QR nhận hàng

UC: R1-057

Thiết kế màn QR toàn màn, nền sáng tối đa: mã QR rất lớn ở giữa, bên dưới mã dự phòng 6 ký tự cỡ lớn dễ đọc, tên món, cửa hàng, khung nhận và giờ hẹn; nút "Tôi sắp đến". Tự tăng độ sáng màn hình. Khi cửa hàng quét thành công chuyển sang trạng thái "Đã nhận" với hiệu ứng tick xanh. Hết hiệu lực: làm mờ QR kèm giải thích. QR chỉ chứa mã ký, không có thông tin cá nhân.

### K29 Mã nhận hộ

UC: R1-052

Thiết kế màn tạo mã nhận hộ: giải thích ngắn "Mã dùng một lần, hết hạn theo khung nhận"; hiển thị mã 8 ký tự lớn; nút "Chia sẻ" (Zalo, tin nhắn…); trạng thái Chưa dùng, Đã dùng, Thu hồi; nút "Thu hồi mã". Nếu cửa hàng không cho nhận hộ: ẩn chức năng và hiện thông báo.

### K30 Hủy đơn

UC: R1-043

Thiết kế màn hoặc sheet xác nhận hủy: tóm tắt đơn, số tiền hoàn đủ, hạn hủy ("Hủy được đến 18:00"), chọn lý do (chip và ô khác), cảnh báo "Không thể hoàn tác"; nút "Xác nhận hủy" (đỏ) và "Giữ đơn". Quá hạn hủy: nút vô hiệu kèm giải thích. Sau khi hủy: trạng thái hoàn tiền và liên kết Lịch sử thanh toán.

### K31 Biên nhận

UC: R1-054

Thiết kế biên nhận gọn kiểu hóa đơn: mã đơn, cửa hàng, món, số lượng, giá chốt, ưu đãi, tổng tiền, thời gian thanh toán, mã giao dịch; dòng ghi "Biên nhận không phải hóa đơn thuế"; nút "Tải PDF" và "Chia sẻ".

### K32 Đặt lại món đã mua

UC: R1-051

Thiết kế màn từ đơn cũ: hiển thị món và cửa hàng cũ, danh sách các suất đang mở cùng món (thẻ nhỏ: giá, số còn lại, khung nhận), nút "Đặt nhanh" dẫn đến Xác nhận đặt. Rỗng: "Hiện chưa có suất cùng món" kèm nút "Tạo cảnh báo cho món này".

### K33 Trạng thái khóa đặt

UC: R1-048

Thiết kế màn thông tin chống lạm dụng: số lần không đến nhận trong 30 ngày (thanh tiến trình tới ngưỡng), trạng thái "Đang bị khóa đặt đến dd/MM/yyyy HH:mm" hoặc "Bình thường", danh sách đơn bị tính (mã, cửa hàng, ngày), gợi ý cách tránh (nhớ khung giờ, hủy sớm), liên kết "Xin hỗ trợ". Giọng điệu nhẹ nhàng, không đổ lỗi.

### K34 Gửi khiếu nại

UC: R1-061, R1-089

Thiết kế form khiếu nại cho đơn Đã nhận: chọn loại (Hàng hỏng, Sai món, Thiếu hàng, Khác), ô mô tả 10–500 ký tự, đính kèm tối đa 3 ảnh (mỗi ảnh tối đa 5 MB) có xem trước; nút "Soạn giúp bằng AI" (chụp ảnh và mô tả ngắn, AI gợi ý loại và bản nháp, khách sửa được, nhãn Trợ lý AI); hiển thị hạn gửi còn lại. Nút "Gửi khiếu nại"; thông báo khi quá hạn.

### K35 Lịch sử khiếu nại

UC: R1-067

Thiết kế danh sách khiếu nại có bộ lọc trạng thái (Chờ cửa hàng, Đã chấp nhận hoàn tiền, Bị từ chối, Đã đóng): mỗi thẻ có đơn, loại, ngày gửi, ngày xử lý, số tiền hoàn. Rỗng: "Bạn chưa có khiếu nại nào".

### K36 Chi tiết khiếu nại

UC: R1-062, R1-063, R1-068

Thiết kế màn chi tiết: chip trạng thái, thông tin đơn, nội dung và ảnh khách đã gửi, dòng thời gian trao đổi, phản hồi của cửa hàng, số tiền hoàn. Khi cửa hàng yêu cầu thêm thông tin: khối "Bổ sung bằng chứng" (tối đa 3 ảnh và mô tả 0–300). Nút "Rút khiếu nại" khi chưa xử lý (xác nhận hai bước). Khi bị từ chối: nút "Liên hệ hỗ trợ".

### K37 Gửi đánh giá

UC: R1-064, R1-065

Thiết kế màn chấm sao 1–5 lớn và ô nhận xét tối đa 300 ký tự có đếm; hiện tên món và cửa hàng; trong 24 giờ có thể sửa nên hiển thị "Bạn có thể sửa trong 23:12 nữa"; nút "Gửi đánh giá"; lưu ý nhẹ về nội dung phù hợp.

### K38 Đánh giá của tôi

UC: R1-065, R1-066

Thiết kế danh sách đánh giá khách đã gửi: cửa hàng, sao, nhận xét, ngày, phản hồi của cửa hàng; hành động Sửa (còn hạn 24 giờ) và Ẩn (có xác nhận, ghi chú không xóa vĩnh viễn); đánh giá đã ẩn có nhãn xám.

### K39 Báo cáo vi phạm

UC: R1-069

Thiết kế form: chọn đối tượng (Cửa hàng, Deal, Đánh giá), lý do (mô tả sai, nội dung xúc phạm, hành vi đáng ngờ…), mô tả 0–300 ký tự, ảnh tùy chọn; nút "Gửi báo cáo"; màn xác nhận "Chúng tôi đã nhận báo cáo".

### K40 Gửi yêu cầu hỗ trợ

UC: R1-070

Thiết kế form: loại (Đơn, Thanh toán, Tài khoản, Khác), chọn đơn liên quan (tùy chọn), nội dung 10–1000 ký tự, tối đa 3 ảnh; ghi chú "Yêu cầu về đơn sẽ được gửi tới cửa hàng trước"; nút "Gửi". Phía trên gợi ý các bài trợ giúp liên quan.

### K41 Danh sách hỗ trợ

UC: R1-071

Thiết kế danh sách yêu cầu: loại, tiêu đề rút gọn, mã đơn, trạng thái (Mới, Đang xử lý, Đã trả lời, Đã đóng), thời gian cập nhật, chấm xanh khi có phản hồi mới; nút "＋ Yêu cầu mới".

### K42 Chi tiết hỗ trợ

UC: R1-071

Thiết kế màn trò chuyện theo luồng yêu cầu: bong bóng của khách, người hỗ trợ và cửa hàng có nhãn người trả lời, tệp đính kèm, trạng thái ở đầu màn; ô nhập trả lời 1–1000 ký tự và nút đính kèm. Khi đã đóng: thanh "Yêu cầu đã đóng" và nút "Tạo yêu cầu mới".

### K43 Trung tâm trợ giúp

UC: R1-072

Thiết kế màn Trợ giúp: ô tìm kiếm, lưới chủ đề (Nhận hàng, Hoàn tiền, Thanh toán, Dùng mã QR, Tài khoản), mục "Câu hỏi thường gặp", cuối trang nút "Liên hệ hỗ trợ" và "Hỏi trợ lý".

### K44 Bài viết trợ giúp

UC: R1-072

Thiết kế màn đọc bài: tiêu đề, ngày cập nhật, nội dung có các bước đánh số, ảnh minh họa, hộp lưu ý; cuối bài "Bài viết có hữu ích không?" (Có/Không) và liên kết bài liên quan.

### K45 Thông báo

UC: R1-073, R1-074, R1-075

Thiết kế danh sách thông báo nhóm theo ngày: biểu tượng loại (deal mới, trạng thái đơn, nhắc giờ nhận, khiếu nại), tiêu đề, nội dung, thời gian, chấm xanh chưa đọc; chạm để mở màn liên quan; nút "Đánh dấu tất cả đã đọc"; tab lọc theo nhóm. Rỗng: "Chưa có thông báo".

### K46 Lịch sử thanh toán và hoàn tiền

UC: R1-077, R1-047

Thiết kế danh sách giao dịch: mã giao dịch, mã đơn, số tiền, loại (Thanh toán, Hoàn tiền), trạng thái (Thành công, Chờ, Lỗi), thời gian; lọc theo loại và thời gian. Chạm xem chi tiết với dòng thời gian trạng thái hoàn tiền (Chờ, rồi Hoàn thành hoặc Lỗi) và nút "Hỏi về giao dịch này".

### K47 Ví ưu đãi

UC: R1-078, R1-079, R1-080

Thiết kế màn hai tab "Đang có" và "Đã dùng": thẻ ưu đãi dạng phiếu răng cưa (tên, giá trị giảm, điều kiện, hạn dùng, trạng thái); ô nhập mã nhận ưu đãi; mục "Ưu đãi từ cửa hàng yêu thích" có nút "Nhận". Tab "Đã dùng" liệt kê ưu đãi, đơn áp dụng, số tiền giảm và tổng tiết kiệm. Có nhãn riêng cho ưu đãi hết hạn.

### K48 Tác động cá nhân

UC: R1-076

Thiết kế màn thống kê: ba số lớn (Số đơn đã nhận, Tiền tiết kiệm so với giá gốc, Thực phẩm đã cứu ≈ kg) gắn nhãn "ước tính"; biểu đồ cột theo tháng; câu giải thích cách tính; nút "Xem huy hiệu". Rỗng: lời mời đặt đơn đầu tiên.

### K49 Huy hiệu và chia sẻ

UC: R1-081

Thiết kế lưới huy hiệu cột mốc (theo số đơn và kg cứu được) với trạng thái đã mở hoặc khóa và thanh tiến độ tới mốc tiếp theo; nút "Chia sẻ thành tích" tạo ảnh vuông đẹp, không chứa tên, đơn hay vị trí, rồi mở share sheet. Không dùng chuỗi ngày ép buộc hay cảnh báo mất chuỗi.

### K50 Trợ lý Cứu Món

UC: R1-083, R1-087, R1-088, R1-090, R1-092

Thiết kế màn chat nhiều lượt: tiêu đề "Trợ lý Cứu Món" và nhãn AI; bong bóng người dùng và trợ lý, thẻ deal nhúng trong câu trả lời, thẻ trạng thái đơn của chính khách; chip gợi ý ("Đơn của tôi đã sẵn sàng chưa?", "Món này có gluten không?"). Dưới mỗi câu trả lời có nút hữu ích hoặc không hữu ích và chọn lý do (Sai thông tin, Không liên quan, Khác). Khi ngoài phạm vi hoặc khách muốn gặp người: thẻ "Chuyển cho nhân viên hỗ trợ" kèm tóm tắt hội thoại. Dòng nhắc "Thông tin thành phần chỉ theo khai báo của cửa hàng". Khi AI lỗi: quay về nút gợi ý thủ công.

### K51 Lịch sử hội thoại AI

UC: R1-091

Thiết kế danh sách hội thoại (thời điểm, tóm tắt một dòng); vuốt để xóa từng hội thoại, nút "Xóa tất cả" có xác nhận; công tắc "Ghi nhớ ngữ cảnh" kèm giải thích quyền riêng tư; trạng thái rỗng.

### K52 Tài khoản của tôi

UC: R1-005, R1-004

Thiết kế màn Tài khoản: đầu trang ảnh đại diện, họ tên, email hoặc SĐT che một phần, ngày tham gia, số lần không đến nhận 30 ngày (chạm mở Trạng thái khóa đặt); danh sách menu theo nhóm (Hồ sơ, Địa điểm của tôi, Hồ sơ ăn uống, Thông báo, Bảo mật, Quyền riêng tư, Ví ưu đãi, Tác động, Đánh giá của tôi, Khiếu nại, Trợ giúp); dưới cùng nút "Đăng xuất" và số phiên bản app.

### K53 Chỉnh sửa hồ sơ

UC: R1-006

Thiết kế form: đổi ảnh đại diện (JPG hoặc PNG tối đa 2 MB, cắt tròn), Họ tên 2–60 ký tự; trường Email hoặc SĐT hiển thị nút "Đổi" mở luồng OTP tới định danh mới; nút "Lưu". Lỗi định dạng và dung lượng ảnh.

### K54 Đổi mật khẩu

UC: R1-007

Thiết kế form: Mật khẩu hiện tại, Mật khẩu mới (từ 8 ký tự, có chữ và số, khác mật khẩu cũ), Nhập lại; danh sách điều kiện; ghi chú "Các thiết bị khác sẽ bị đăng xuất"; nút "Đổi mật khẩu". Lỗi sai mật khẩu hiện tại.

### K55 Xác thực hai bước

UC: R1-013

Thiết kế màn bật/tắt: công tắc lớn, giải thích "Yêu cầu OTP khi đăng nhập thiết bị lạ", chọn kênh nhận OTP (email hoặc SĐT đã xác minh), bước xác minh OTP khi bật; tắt cần nhập mật khẩu; hiển thị trạng thái hiện tại.

### K56 Thiết bị đăng nhập

UC: R1-014

Thiết kế danh sách thiết bị: tên thiết bị, hệ điều hành, lần hoạt động cuối, IP rút gọn, vị trí gần đúng; thiết bị hiện tại có nhãn "Thiết bị này"; nút "Đăng xuất" từng thiết bị và "Đăng xuất tất cả thiết bị khác" có xác nhận.

### K57 Cài đặt thông báo

UC: R1-010, R1-093

Thiết kế danh sách công tắc theo nhóm: Deal mới ở gần, Nhắc giờ nhận, Trạng thái đơn, Khiếu nại, Ưu đãi; mỗi công tắc có mô tả ngắn. Cảnh báo nhẹ khi tắt "Nhắc giờ nhận" (dễ bị tính không đến nhận). Nếu quyền thông báo hệ thống bị tắt: dẫn tới cài đặt hệ thống.

### K58 Hồ sơ ăn uống và dị ứng

UC: R1-016

Thiết kế màn khai báo tùy chọn: chip dị ứng (Gluten, Sữa, Trứng, Hạt, Hải sản, Khác có ô nhập), danh sách món không ăn (chọn nhiều), công tắc đồng ý lưu dữ liệu ăn uống kèm giải thích đây là dữ liệu nhạy cảm; nút "Lưu"; ghi chú "Cảnh báo dựa trên thông tin cửa hàng khai báo, không đảm bảo tuyệt đối"; nút "Xóa hồ sơ ăn uống".

### K59 Quyền riêng tư và đồng ý

UC: R1-012, R1-017

Thiết kế màn quyền riêng tư: phiên bản điều khoản đã đồng ý và thời điểm; công tắc riêng cho Đồng ý dùng vị trí, Nhận ưu đãi từ cửa hàng, Cá nhân hóa đề xuất theo lịch sử, Ghi nhớ ngữ cảnh trợ lý AI; mỗi công tắc có thời điểm đổi gần nhất; liên kết sang "Xuất dữ liệu" và "Xóa tài khoản".

### K60 Xuất dữ liệu cá nhân

UC: R1-018

Thiết kế màn: chọn phạm vi dữ liệu bằng hộp kiểm (hồ sơ, đơn, đánh giá, khiếu nại, đồng ý), định dạng JSON hoặc CSV, nút "Yêu cầu xuất"; trạng thái "Đang chuẩn bị", rồi liên kết tải hết hạn sau 24 giờ có đếm ngược.

### K61 Xóa tài khoản

UC: R1-011, R1-019

Thiết kế màn cảnh báo rõ: liệt kê điều gì xảy ra (dữ liệu cá nhân được ẩn danh, đơn giữ dưới dạng không nhận diện, chờ 7 ngày để hủy). Không xóa được khi còn đơn đã thanh toán chưa kết thúc (hiện danh sách đơn đang chặn). Nhập mật khẩu xác nhận, lý do tùy chọn, nút đỏ "Yêu cầu xóa". Sau khi gửi: màn trạng thái "Chờ xóa, còn 6 ngày" với nút "Hủy yêu cầu xóa" (cần mật khẩu).

## 5. Prompt từng màn: Chủ cửa hàng (S01–S74)

Mỗi prompt dưới đây dùng kèm prompt nền ở mục 3. Thiết kế cho web responsive (desktop 1440 và mobile 390).

### S01 Đăng nhập

UC: R2-002

Thiết kế màn đăng nhập web: logo Cứu Món, tiêu đề "Dành cho chủ cửa hàng", ô Email, Mật khẩu (ẩn/hiện), nút "Đăng nhập", liên kết "Quên mật khẩu?" và "Đăng ký cửa hàng". Desktop chia hai cột (trái minh họa tiệm bánh, phải form), mobile một cột. Lỗi: sai thông tin, tài khoản nhân viên bị tạm khóa, cửa hàng đang tạm ngưng.

### S02 Đăng ký tài khoản và cửa hàng

UC: R2-001

Thiết kế form đăng ký ba bước có thanh tiến trình: (1) Họ tên chủ, Email, Mật khẩu từ 8 ký tự gồm chữ và số; (2) Thông tin cửa hàng: tên 2–80 ký tự, loại hình (Tiệm bánh, Cà phê–bánh), địa chỉ có gợi ý và ghim bản đồ xem trước tọa độ, SĐT, giờ mở/đóng từng ngày; (3) Đồng ý điều khoản và trách nhiệm an toàn thực phẩm (bắt buộc, mở được văn bản). Sau đăng ký: màn "Hãy xác minh email" có nút gửi lại, và nhắc chờ duyệt hồ sơ nếu cổng duyệt cửa hàng được bật.

### S03 Quên và đặt lại mật khẩu

UC: R2-004

Thiết kế hai trạng thái: nhập email để nhận liên kết (hạn 30 phút) kèm thông báo trung tính; trang đặt mật khẩu mới với Mật khẩu mới, Nhập lại, danh sách điều kiện. Liên kết hết hạn có nút gửi lại. Thành công thì về Đăng nhập.

### S04 Kích hoạt tài khoản nhân viên

UC: R2-076

Thiết kế trang từ liên kết mời: lời chào "Bạn được mời vào \[Tên cửa hàng\] với vai trò Nhân viên quầy", họ tên và email hiển thị khóa, ô đặt mật khẩu và nhập lại, nút "Kích hoạt tài khoản". Liên kết hết hạn hoặc đã dùng: thông báo và gợi ý liên hệ chủ cửa hàng.

### S05 Tài khoản của tôi

UC: R2-003, R2-004

Thiết kế trang tài khoản cá nhân: họ tên, email, vai trò (Chủ, Quản lý, Nhân viên quầy), khối đổi mật khẩu (hiện tại, mới, nhập lại; ghi chú các phiên khác bị thu hồi), nút "Đăng xuất". Menu avatar ở đầu mọi trang dẫn tới đây.

### S06 Bảng điều khiển hôm nay

UC: R2-061

Thiết kế dashboard: hàng thẻ chỉ số thời gian thực (Tổng suất, Đã bán, Đang giữ, Còn lại, Doanh thu hôm nay, Đơn chờ nhận); khối "Cần xử lý ngay" (đề xuất giá chờ duyệt kèm đếm ngược, khiếu nại sắp hết hạn, nhắc nhập số cuối ngày); danh sách ngắn đơn sắp tới giờ nhận; nút nhanh "Quét QR", "Tạo suất", "Nhân bản hôm qua"; biểu đồ cột bán theo giờ hôm nay. Banner gói (Cơ bản/Pro, hạn dùng thử). Khi cửa hàng đang tạm ngưng: thanh cố định ở đầu trang.

### S07 Việc cần làm hôm nay

UC: R2-095, R2-096

Thiết kế danh sách việc cần làm: mỗi mục có biểu tượng loại, mô tả, hạn, nhãn mức khẩn (Cao, Vừa, Thấp) và nút hành động dẫn thẳng đến màn xử lý; lọc theo loại; panel bên phải "Cấu hình nhắc việc" (loại việc, giờ nhắc HH:mm, kênh web hoặc email). Rỗng: "Bạn đã xử lý hết".

### S08 Thông báo

UC: R2-074

Thiết kế danh sách thông báo web: đơn mới, đơn hủy, khiếu nại, đề xuất giá, nhắc nhập số cuối ngày; lọc theo loại; đánh dấu đã đọc từng mục hoặc tất cả; chạm mở màn liên quan. Chuông trên thanh đầu trang hiển thị số chưa đọc.

### S09 Hồ sơ cửa hàng

UC: R2-005, R2-006

Thiết kế trang hồ sơ có chế độ xem và sửa: logo (tải lên), tên 2–80 ký tự, địa chỉ (đổi địa chỉ sẽ tự xác định lại tọa độ, có bản đồ xem trước), SĐT, giờ mở/đóng theo từng ngày trong tuần (bảng 7 dòng có công tắc nghỉ), trạng thái hoạt động, gói và ngày hết hạn. Nút "Lưu thay đổi" kèm cảnh báo khi đổi địa chỉ.

### S10 Cài đặt vận hành

UC: R2-007, R2-008

Thiết kế form: Khung giờ nhận mặc định (giờ bắt đầu và kết thúc, tối đa 3 giờ), Giá sàn (% giá gốc), Mức giảm tối đa. Mục "Chế độ định giá" gồm hai thẻ chọn: "Duyệt tay" (hệ thống chỉ đề xuất) và "Tự động" (tự áp dụng đề xuất trong ràng buộc), có giải thích và cảnh báo khi chọn Tự động. Mục dành cho Pro hiển thị khóa nếu chưa có gói.

### S11 Tạm ngưng và mở lại cửa hàng

UC: R2-009, R2-010

Thiết kế trang trạng thái cửa hàng: thẻ lớn "Đang mở bán" hoặc "Đang tạm ngưng". Nút "Tạm ngưng" mở hộp thoại (lý do chọn sẵn, ngày mở lại dự kiến tùy chọn) và cảnh báo suất đang mở sẽ đóng, bị ẩn khỏi bản đồ, đơn đã thanh toán xử lý thế nào. Khi đang ngưng: nút "Mở lại cửa hàng" và thông tin lý do.

### S12 Lịch cửa hàng

UC: R2-097

Thiết kế lịch tháng, ô ngày nghỉ và giờ đặc biệt tô màu khác nhau; nút "Khai báo" mở panel: chọn ngày hoặc khoảng ngày, loại (Nghỉ, Giờ đặc biệt), giờ mở–đóng nếu đặc biệt; danh sách bên phải các khai báo sắp tới với sửa và xóa; chú thích "Suất và dự báo sẽ không tính nhầm các ngày này".

### S13 Quy tắc kinh doanh

UC: R2-101, R2-102

Thiết kế trang quy tắc riêng trong khung nền tảng cho phép: Suất tối đa mỗi đơn (1–5), Thời gian trễ cho phép (0–30 phút), công tắc Cho phép nhận hộ; mỗi trường hiển thị khoảng hợp lệ của nền tảng. Tab "Lịch sử thay đổi" dạng bảng (thời điểm, người đổi, cấu hình, giá trị cũ và mới). Ghi chú "Thay đổi chỉ áp dụng cho đơn tạo sau".

### S14 Xuất dữ liệu cửa hàng

UC: R2-103

Thiết kế màn: chọn phạm vi (món, suất, đơn đã ẩn danh khách, báo cáo, sao kê), định dạng CSV hoặc JSON, nút "Yêu cầu xuất"; bảng lịch sử yêu cầu với trạng thái (Đang chuẩn bị, Sẵn sàng) và liên kết tải hết hạn 24 giờ có đếm ngược; hiển thị hạn mức xuất còn lại của gói.

### S15 Nhật ký hoạt động

UC: R2-075

Thiết kế bảng nhật ký: thời gian, hành động (đổi giá, hủy suất, điều chỉnh tồn, xuất dữ liệu, đổi hồ sơ), đối tượng, giá trị cũ và mới, người thực hiện, IP; lọc theo khoảng ngày và loại hành động; phân trang; chi tiết mở trong drawer bên phải.

### S16 Gói dịch vụ và dùng thử Pro

UC: R2-011, R2-012, R2-014

Thiết kế màn so sánh gói Cơ bản và Pro: hai cột quyền lợi (dự báo, định giá động, hạn mức AI, suất mở, báo cáo), giá tháng và hoa hồng; thẻ trạng thái hiện tại (ngày kết thúc dùng thử hoặc hạn gói); nút "Nâng cấp lên Pro" hoặc "Hạ về Cơ bản khi hết kỳ"; mục "Hủy gia hạn" có hộp thoại lý do và thông báo quyền lợi giữ đến hết kỳ đã trả.

### S17 Gia hạn gói Pro

UC: R2-013

Thiết kế màn gia hạn: chu kỳ 1 tháng, số tiền theo cấu hình, ngày hiệu lực mới; mã thanh toán (VietQR hoặc giả lập) kèm đồng hồ và nút kiểm tra thanh toán; trạng thái chờ, thành công, thất bại; hỗ trợ gia hạn trước hoặc sau ngày hết hạn.

### S18 Hóa đơn gói

UC: R2-015

Thiết kế bảng lịch sử thanh toán gói: kỳ, số tiền, trạng thái, mã giao dịch, ngày thanh toán, nút tải hóa đơn; lọc theo năm; tổng đã chi; rỗng khi đang dùng thử.

### S19 Hạn mức sử dụng

UC: R2-016

Thiết kế trang hạn mức: mỗi hạn mức (suất mở, lượt AI, xuất báo cáo, nhập CSV…) là một thẻ có thanh tiến trình Đã dùng và Còn lại, ngày đặt lại; đổi màu cam khi vượt 80%, đỏ khi hết; nút "Nâng cấp" khi hết hạn mức.

### S20 Danh sách món

UC: R2-017, R2-018, R2-023, R2-024

Thiết kế bảng hoặc lưới món: ảnh, tên, loại, giá gốc, hạn dùng chuẩn, trạng thái; thanh tìm kiếm, lọc loại (Bánh mì, Bánh ngọt, Bánh kem, Đồ uống…) và trạng thái (Đang dùng, Đã lưu trữ), sắp xếp theo tên hoặc ngày tạo; menu "⋯" mỗi dòng: Xem, Sửa, Lưu trữ, Khôi phục; nút chính "＋ Tạo món" và "Nhập CSV". Mặc định ẩn món đã lưu trữ.

### S21 Chi tiết món

UC: R2-019

Thiết kế trang chi tiết: ảnh lớn, đầy đủ thuộc tính (loại, giá gốc, hạn dùng chuẩn, trọng lượng, giá vốn, thành phần, dị ứng), thẻ tổng kết (số suất đã tạo, tổng đã bán, tổng bỏ), bảng lịch sử các suất tạo từ món; nút Sửa và Lưu trữ.

### S22 Tạo và sửa món

UC: R2-020, R2-021, R2-022, R2-119, R2-120

Thiết kế form hai cột: trái tải ảnh (kéo thả hoặc chụp) có nút "Gợi ý từ ảnh bằng AI", kết quả kiểm tra ảnh (mờ, tối, không khớp loại món) và đọc hạn dùng từ ảnh nhãn; phải gồm Tên món (2–80 ký tự, duy nhất), Loại, Giá gốc, Hạn dùng chuẩn, Trọng lượng, Giá vốn, Thành phần và nhóm dị ứng (chip), Mô tả (nút "Soạn mô tả bằng AI"). Giá trị do AI gợi ý gắn nhãn "Gợi ý, cần bạn xác nhận", dinh dưỡng chỉ để tham khảo. Ghi chú "Đổi giá gốc không đổi giá của suất đang mở".

### S23 Nhập món từ CSV

UC: R2-025

Thiết kế màn ba bước: tải mẫu CSV; kéo thả tệp (tối đa 500 dòng, 2 MB); bảng kiểm tra từng dòng (hợp lệ xanh, lỗi đỏ kèm lý do) và nút "Nhập các dòng hợp lệ"; màn kết quả tóm tắt số dòng thành công và lỗi, nút tải tệp lỗi; hiển thị hạn mức nhập còn lại.

### S24 Kiểm tra dữ liệu

UC: R2-099, R2-100

Thiết kế danh sách cảnh báo: món thiếu trọng lượng, giá vốn hoặc thành phần, ngày không nhất quán, giá gốc đổi lớn; mỗi cảnh báo có loại, đối tượng, mức độ, gợi ý sửa, trạng thái (Mở, Đã xử lý, Bỏ qua). Chọn nhiều món để mở drawer "Cập nhật hàng loạt" (trọng lượng, hạn dùng chuẩn, loại).

### S25 Danh sách suất

UC: R2-026, R2-027, R2-034

Thiết kế bảng suất theo ngày có bộ chọn ngày và thanh lọc (trạng thái Nháp, Đang mở, Hết suất, Đã đóng, Đã hủy; món): món, giá gốc, giá bán, tổng, đã bán, đang giữ, còn, khung nhận, trạng thái; thanh tiến trình bán; nút "＋ Tạo suất", "Nhân bản hôm qua", "Tạo túi bất ngờ"; hành động nhanh mỗi dòng (Sửa, Điều chỉnh tồn, Đóng sớm, Hủy).

### S26 Tạo suất

UC: R2-028, R2-038

Thiết kế form: chọn Món (có tìm), Số lượng 1–500 (nếu có dự báo thì gợi ý số khuyến nghị kèm nút "Dùng số này"), Giá bán (bội số 500, không thấp hơn giá sàn, không cao hơn giá gốc, hiện % giảm tự tính), Khung nhận (tối đa 3 giờ, mặc định từ cài đặt), Hạn dùng; nút "Lưu nháp" và "Mở bán"; phần xem trước thẻ như khách nhìn thấy; lỗi từng trường theo quy tắc.

### S27 Nhân bản suất hôm qua

UC: R2-029

Thiết kế danh sách suất hôm qua có hộp kiểm, mỗi dòng cho sửa nhanh số lượng, giá, khung nhận (đã điền gợi ý); thanh dưới "Đã chọn 5 suất" và nút "Tạo suất hôm nay"; cảnh báo nếu món đã lưu trữ hoặc hôm nay cửa hàng nghỉ.

### S28 Chi tiết và chỉnh sửa suất

UC: R2-030, R2-031, R2-032, R2-033

Thiết kế trang chi tiết suất: thông tin chính, số liệu tồn (tổng, đã bán, đang giữ, còn); tab "Chỉnh sửa" (số lượng tổng, giá, khung nhận, ghi chú, chỉ khi Nháp hoặc Đang mở); nút "Điều chỉnh tồn" mở hộp thoại (số cộng hoặc trừ, lý do bắt buộc: Làm thêm, Hỏng, Bán tại quầy, Khác); "Đóng suất sớm"; "Hủy suất và hoàn tiền" (xác nhận mạnh, hiện số đơn bị hủy và tiền hoàn). Liên kết sang Lịch sử thay đổi.

### S29 Lịch sử thay đổi của suất

UC: R2-035

Thiết kế dòng thời gian thay đổi của suất: thời điểm, người thực hiện, trường đổi, giá trị cũ và mới, lý do; lọc theo loại thay đổi (giá, số lượng, trạng thái, điều chỉnh tồn).

### S30 Túi bất ngờ

UC: R2-091

Thiết kế form tạo túi: Tên túi, Số lượng túi, Giá bán cố định, Giá trị ước tính tối thiểu, Loại món có thể có (chip) và các nhóm dị ứng có thể có; hộp xem trước phía khách "Túi bất ngờ, giá trị từ 80.000đ"; ghi chú "Khách chỉ biết loại và giá trị tối thiểu"; nút "Mở bán".

### S31 Gợi ý tặng phần không bán được

UC: R2-121

Thiết kế màn xuất hiện gần cuối khung nhận: danh sách suất còn tồn kèm đếm ngược, gợi ý "Cân nhắc tặng cho nơi nhận hỗ trợ"; danh sách nơi nhận do chủ tự nhập (tên, địa chỉ, SĐT) có thêm, sửa, xóa; nút "Đã tặng" để ghi số lượng; ghi chú nền tảng không xác minh nơi nhận.

### S32 Dự báo số lượng

UC: R2-036, R2-037, R2-038, R2-042

Thiết kế trang Pro: bảng dự báo cho ngày mai theo món (số lượng khuyến nghị, khoảng thấp–cao, nhãn độ tin cậy Thấp/Vừa/Cao, thời điểm tính). Nút "Vì sao?" mở panel giải thích (trung bình theo thứ, hiệu chỉnh thời tiết và sự kiện, số ngày dữ liệu). Mỗi dòng có "Chấp nhận" hoặc nhập số khác kèm lý do. Khi độ tin cậy thấp: banner cảnh báo và phương án dự phòng (ví dụ "Nấu như hôm qua"). Chưa có gói Pro: màn khóa mời dùng thử.

### S33 Nhập số thực tế cuối ngày

UC: R2-039

Thiết kế form cuối ngày theo từng món: Số đã làm, Bán tại quầy, Giờ hết hàng sớm (HH:mm, tùy chọn); số bán qua app tự điền; nút "Lưu số thực tế"; nhắc nhập hằng ngày; thông báo "Số liệu giúp dự báo chính xác hơn".

### S34 Sự kiện đặc biệt

UC: R2-040

Thiết kế danh sách và form khai báo: ngày, loại (Lễ, Khuyến mãi, Sự kiện, Đóng cửa), ghi chú tối đa 100 ký tự, mức ảnh hưởng (Giảm, Trung bình, Tăng); lịch hiển thị chấm màu; sửa và xóa.

### S35 Độ chính xác và xu hướng dự báo

UC: R2-041, R2-043

Thiết kế hai tab: "Độ chính xác" (sai số trung bình tuyệt đối, so với cách "Nấu như hôm qua", biểu đồ đường theo tuần hoặc tháng, theo món) và "Xu hướng 7 ngày tới" (bảng ngày × món với khoảng thấp–cao và độ tin cậy, biểu đồ đường). Có nhãn dự phòng khi thiếu dữ liệu.

### S36 Đề xuất giá giảm theo giờ

UC: R2-044, R2-045, R2-046, R2-047

Thiết kế trang Pro: danh sách đề xuất cho suất đang mở gồm suất, giá hiện tại, giá đề xuất, % giảm, giờ hiệu lực, dự kiến bán hết, đồng hồ đếm ngược hết hiệu lực; mở rộng dòng để xem giải thích (giờ còn lại, tốc độ bán, tồn, hạn dùng, giá sàn); nút "Duyệt" và "Từ chối hoặc đặt giá thủ công" (bội số 500, không thấp hơn giá sàn, không cao hơn giá hiện tại). Chế độ Tự động: huy hiệu "Tự động áp dụng" và lịch sử.

### S37 Lịch sử quyết định giá

UC: R2-048

Thiết kế bảng quyết định giá: thời điểm, suất, giá cũ và mới, nguồn quyết định (Chủ duyệt, Tự động, Thủ công), số bán sau 30 phút; lọc theo ngày và nguồn; biểu đồ nhỏ giá theo giờ cho suất đang chọn.

### S38 Mô phỏng chính sách giá

UC: R2-104, R2-105

Thiết kế hai phần: chạy mô phỏng (chọn kịch bản như "Giảm cố định 30% cuối ngày" so với "Đề xuất động", khoảng ngày lịch sử 14–90, giả định độ co giãn) và danh sách các lần chạy đã lưu. Chọn 2–3 lần để so sánh cạnh nhau: hao hụt ước tính, doanh thu thu hồi ước tính, thời điểm hết hàng. Nhãn "Ước tính từ dữ liệu lịch sử, không phải cam kết".

### S39 Danh sách đơn

UC: R2-049, R2-050

Thiết kế bảng đơn, đơn hôm nay ở đầu: mã đơn, tên khách rút gọn, món × số lượng, tổng tiền, trạng thái, khung nhận và giờ hẹn; lọc ngày, trạng thái, món; tìm theo mã; nút "Xuất CSV" (kiểm tra hạn mức); dòng có ghi chú của khách hiện biểu tượng ghi chú.

### S40 Chi tiết đơn

UC: R2-051, R2-053

Thiết kế trang hoặc drawer: trạng thái và mốc thời gian, món, số lượng, ghi chú của khách, giờ hẹn, tổng tiền, hoa hồng và tiền sau hoa hồng, khiếu nại liên quan; nút "Hủy đơn" (lý do bắt buộc, xác nhận hoàn tiền đủ) chỉ với đơn Đã thanh toán.

### S41 Quét QR nhận hàng

UC: R2-052, R1-058

Thiết kế màn thao tác nhanh cho quầy: khung camera lớn quét QR liên tục, ô nhập mã dự phòng 6 ký tự. Sau khi quét hiện thẻ kết quả to rõ: Hợp lệ (tên món, số lượng, ghi chú, nút "Xác nhận đã giao") hoặc Không hợp lệ (đã dùng, sai cửa hàng, hết hạn, chưa thanh toán); phản hồi âm thanh và rung; danh sách 5 lần quét gần nhất. Bố cục tối ưu cho điện thoại, nút cỡ lớn.

### S42 Lịch hẹn nhận hàng

UC: R2-098

Thiết kế dòng thời gian theo mốc 15 phút trong ngày: mỗi mốc liệt kê đơn (mã, món, số lượng, ghi chú), nhãn "Khách sắp đến" nổi bật khi khách báo; tổng số suất cần chuẩn bị theo mốc; chuyển nhanh hôm nay hoặc ngày mai; dùng được cho Chủ và Nhân viên quầy.

### S43 Danh sách khiếu nại

UC: R2-054

Thiết kế bảng khiếu nại: đơn, loại, khách rút gọn, ngày gửi, hạn phản hồi (đếm ngược, đỏ khi còn dưới 6 giờ), trạng thái; tab "Chờ phản hồi" và "Đã xử lý"; chạm mở chi tiết.

### S44 Xử lý khiếu nại

UC: R2-054, R2-055, R2-056, R2-059, R2-060, R2-118

Thiết kế trang hai cột: trái là nội dung khách (loại, mô tả, ảnh phóng to được); phải là khung quyết định: "Chấp nhận" (toàn bộ hoặc một phần, số tiền hoàn lớn hơn 0 và không quá tổng đơn, ghi chú tối đa 300), "Từ chối" (lý do 10–300 ký tự bắt buộc), "Đề nghị gia hạn 24 giờ" (một lần, lý do 10–200). Nút "Soạn phản hồi bằng AI" (bản nháp, chủ sửa được). Thông báo "Quá hạn sẽ tự động hoàn tiền". Hiển thị lịch sử trao đổi và yêu cầu bổ sung bằng chứng.

### S45 Đánh giá của khách

UC: R2-057, R2-058, R2-118

Thiết kế danh sách đánh giá: sao, nhận xét, ngày, tên khách rút gọn; mỗi thẻ có ô phản hồi công khai (một lần, tối đa 300 ký tự) với nút "Gợi ý phản hồi bằng AI" và nút "Báo cáo đánh giá vi phạm" (lý do, ghi chú); lọc theo sao và chưa phản hồi; điểm trung bình và phân bố ở đầu trang.

### S46 Báo cáo hao hụt và thu hồi

UC: R2-062

Thiết kế báo cáo ngày, tuần, tháng: bộ chọn kỳ, thẻ tổng (Hàng làm, Đã bán, Hàng bỏ, Doanh thu thu hồi, kg cứu được ước tính), biểu đồ cột chồng hao hụt (suất và tiền) và đường doanh thu thu hồi; hai khối tách riêng "Hao hụt" và "Thu hồi"; nút xuất.

### S47 Doanh thu và đơn

UC: R2-068, R2-072

Thiết kế bộ chọn kỳ và nhóm theo ngày, tuần, tháng; thẻ doanh thu, số đơn, giá trị trung bình, doanh thu thu hồi, hoàn tiền; biểu đồ đường. Chế độ "So sánh hai kỳ": chọn kỳ A và B, hiển thị chênh lệch phần trăm từng chỉ số bằng mũi tên xanh hoặc đỏ.

### S48 Báo cáo theo món

UC: R2-069

Thiết kế bảng xếp hạng món: đã bán, hao hụt, tỷ lệ bán hết, giá bán trung bình; hai tab "Bán chạy" và "Hao hụt nhiều" có thanh ngang; sắp xếp theo cột; nhãn cảnh báo cho món có tỷ lệ bán hết thấp.

### S49 Phân bố bán hàng theo giờ

UC: R2-070

Thiết kế bản đồ nhiệt thứ × giờ (số đơn) và biểu đồ cột theo giờ; chip chọn hiển thị tỷ lệ bán hết; câu gợi ý dựa trên dữ liệu như "Khung 19–20h bán nhanh nhất"; chú thích dùng để chọn khung nhận và thời điểm giảm giá.

### S50 Hiệu quả đề xuất giá

UC: R2-071

Thiết kế các thẻ: số đề xuất, tỷ lệ duyệt, doanh thu thu hồi so với nhóm không giảm, hàng bỏ trước và sau; biểu đồ so sánh hai nhóm; nhãn "So sánh quan sát, không phải thử nghiệm".

### S51 Đối soát doanh thu và hoa hồng

UC: R2-063

Thiết kế bảng đối soát kỳ hiện tại: đơn Đã nhận và Không đến nhận, tiền thu, hoa hồng (tham số 10%), hoàn tiền, phí thuê bao, số thực nhận; tổng ở thanh dưới; lọc theo ngày; chú thích cách tính hoa hồng và dòng "Kỳ chưa chốt".

### S52 Sao kê đối soát tuần

UC: R2-066, R2-067

Thiết kế danh sách sao kê đã chốt theo tuần (thứ hai đến chủ nhật): kỳ, tổng thu, hoa hồng, hoàn tiền, thuê bao, thực nhận, trạng thái; mở chi tiết thấy danh sách đơn của kỳ; nút "Tải PDF/CSV"; nhãn "Đã chốt, không sửa được".

### S53 Xuất báo cáo

UC: R2-064

Thiết kế màn chọn loại báo cáo (Hao hụt, Đối soát), kỳ, định dạng CSV hoặc PDF; xem trước nhanh; nút "Xuất"; lịch sử các tệp đã xuất; hiển thị hạn mức xuất còn lại.

### S54 Tác động môi trường

UC: R2-073

Thiết kế trang tác động: số suất cứu được, kg thực phẩm ước tính, tiền thu hồi; xem trước "Trang tác động công khai" như khách thấy; công tắc "Công khai" và liên kết chia sẻ; nút tải ảnh thành tích; nhãn "Ước tính".

### S55 Chế độ demo

UC: R2-065

Thiết kế chế độ demo tua nhanh: nút "Bắt đầu demo" (1 ngày = 2 phút trên dữ liệu mẫu), thanh tốc độ, đồng hồ mô phỏng, dòng sự kiện chạy (dự báo, đề xuất giá, đơn, hao hụt), khung xem vòng lặp học; banner đỏ "ĐANG DEMO, dữ liệu mẫu" cố định; nút thoát.

### S56 Khách đã mua

UC: R2-082, R2-083, R2-085

Thiết kế bảng khách ẩn danh: mã rút gọn, chữ cái đầu, số đơn, tổng chi, lần mua cuối, số lần không đến. Mở một khách xem lịch sử đơn, món hay mua, khiếu nại, đánh giá; ô ghi chú nội bộ (tối đa 200 ký tự) gắn mã khách; ghi chú "Không hiển thị thông tin liên lạc".

### S57 Phân nhóm khách

UC: R2-084, R2-087

Thiết kế bốn thẻ nhóm (Mới, Thân thiết, Có nguy cơ rời, Hay không đến nhận) với số khách và đặc điểm; chọn thẻ xem danh sách ẩn danh; mục cấu hình ngưỡng (ví dụ số đơn thân thiết) có lưu; nhóm "Hay không đến nhận" có danh sách mã rút gọn, số lần không đến, số đơn.

### S58 Khách yêu thích cửa hàng

UC: R2-086

Thiết kế thẻ tổng số khách yêu thích, biểu đồ tăng giảm theo tuần, mẹo ngắn để tăng lượt yêu thích; không hiển thị danh tính.

### S59 Danh sách ưu đãi

UC: R2-089, R2-090

Thiết kế bảng ưu đãi: tên, loại, giá trị, đối tượng, trạng thái, lượt dùng trên giới hạn, doanh thu từ đơn dùng ưu đãi, số tiền giảm; hành động Sửa (chỉ khi chưa có lượt dùng), Tạm dừng, Kết thúc sớm; nút "＋ Tạo ưu đãi".

### S60 Tạo ưu đãi

UC: R2-088, R2-090

Thiết kế form: Tên 2–60 ký tự, Loại (Giảm %, Giảm tiền), Giá trị, Đối tượng (Tất cả, Khách yêu thích, Nhóm Thân thiết…), thời gian hiệu lực, giới hạn lượt; cảnh báo "Ưu đãi không đưa giá thấp hơn giá sàn"; xem trước thẻ ưu đãi khách nhìn thấy; ghi chú mỗi đơn tối đa 1 ưu đãi.
