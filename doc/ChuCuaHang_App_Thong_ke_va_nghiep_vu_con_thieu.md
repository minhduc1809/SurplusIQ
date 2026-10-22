# App Chủ cửa hàng: thống kê màn hình, nghiệp vụ và việc còn thiếu để bàn giao

> Nguồn đối chiếu: `doc/SurplusIQ_Thong_ke_man_hinh_theo_vai_tro.md` (S01–S74), route trong `apps/android-merchant/.../MainActivity.kt`, các controller `store/*` của backend. Trạng thái dựa trên đọc mã và gọi thử API dev, **chưa kiểm thử tay từng màn trên thiết bị**. Mã: `apps/android-merchant`.

## 1. Con số tổng hợp

| Chỉ số | Số lượng |
|---|---|
| Màn hình trong doc (S01–S74) | 74 |
| Màn hình mở rộng ngoài doc (Rescue Timeline, Pool, Bridge, Lab, TrustPass) | 5 |
| File màn hình Compose (`ui/screens`) | 58 |
| Điểm đến điều hướng chính (route NavHost) | 56 |
| Màn xác thực ngoài NavHost (đăng nhập, đăng ký, quên mật khẩu, OTP, kích hoạt nhân viên) | 5 |
| Endpoint `store/*` của backend | 170 |
| Endpoint app đã gọi | 152 (18 chưa nối, xem mục 5) |

### Phân loại 74 màn trong doc

| Trạng thái | Số màn | Ý nghĩa |
|---|---|---|
| Đủ cả App và BE | 53 | Có màn, có API, luồng chính chạy (chưa kiểm thử tay) |
| BE chưa có, app đã làm phần có thể | 13 | App hiển thị phần BE đã hỗ trợ; phần còn thiếu cần BE làm trước |
| BE đã có, app chưa nối | 6 | Việc thuần app, không cần chờ BE |
| Chưa làm | 1 | Cần quyết định/thiết kế |
| Bỏ có chủ đích | 1 | Thay bằng tính năng khác |
| **Tổng** | **74** | |

## 2. Bảng chi tiết theo màn

Ký hiệu: ✅ đủ · 🟧 BE thiếu · 🟦 app thiếu (BE có) · ⬜ chưa làm · ➖ bỏ.

| Mã | Màn | Trạng thái | Ghi chú |
|---|---|---|---|
| S01 | Đăng nhập | ✅ |  |
| S02 | Đăng ký tài khoản và cửa hàng | 🟧 | Form chỉ thu họ tên chủ, email, mật khẩu, tên/địa chỉ/SĐT cửa hàng. BE chưa có loại hình cửa hàng, tọa độ; chưa có gợi ý địa chỉ và ghim bản đồ xem trước. |
| S03 | Quên và đặt lại mật khẩu | ✅ | Khác doc: dùng mã OTP gửi email thay vì liên kết hết hạn 30 phút. |
| S04 | Kích hoạt tài khoản nhân viên | 🟦 | Nhập mã mời thủ công. Chưa có deep link từ liên kết mời; BE không tự gửi email mời nên chủ phải chuyển mã. |
| S05 | Tài khoản của tôi | ✅ |  |
| S06 | Bảng điều khiển hôm nay | ✅ |  |
| S07 | Việc cần làm hôm nay | ✅ |  |
| S08 | Thông báo | ✅ |  |
| S09 | Hồ sơ cửa hàng | 🟦 | BE đã có endpoint tải ảnh (POST store/uploads/image) nhưng màn Hồ sơ chưa nối, đang chỉ nhận URL logo. |
| S10 | Cài đặt vận hành | ✅ |  |
| S11 | Tạm ngưng và mở lại cửa hàng | ✅ |  |
| S12 | Lịch cửa hàng | ✅ |  |
| S13 | Quy tắc kinh doanh | ✅ |  |
| S14 | Xuất dữ liệu cửa hàng | ✅ |  |
| S15 | Nhật ký hoạt động | ✅ |  |
| S16 | Gói dịch vụ và dùng thử Pro | ✅ |  |
| S17 | Gia hạn gói Pro | ✅ |  |
| S18 | Hóa đơn gói | ✅ |  |
| S19 | Hạn mức sử dụng | ✅ |  |
| S20 | Danh sách món | ✅ |  |
| S21 | Chi tiết món | ✅ |  |
| S22 | Tạo và sửa món | 🟦 | Ảnh món đã tải từ máy được. BE có POST store/ai/describe-item (AI soạn mô tả) chưa nối vào form. Chưa có AI đọc ảnh/kiểm tra ảnh. |
| S23 | Nhập món từ CSV | ✅ |  |
| S24 | Kiểm tra dữ liệu | ✅ |  |
| S25 | Danh sách suất | ✅ |  |
| S26 | Tạo suất | ✅ |  |
| S27 | Nhân bản suất hôm qua | ✅ |  |
| S28 | Chi tiết và chỉnh sửa suất | ✅ |  |
| S29 | Lịch sử thay đổi của suất | ✅ |  |
| S30 | Túi bất ngờ | ✅ |  |
| S31 | Gợi ý tặng phần không bán được | ✅ |  |
| S32 | Dự báo số lượng | ✅ |  |
| S33 | Nhập số thực tế cuối ngày | ✅ |  |
| S34 | Sự kiện đặc biệt | ✅ |  |
| S35 | Độ chính xác và xu hướng dự báo | ✅ |  |
| S36 | Đề xuất giá giảm theo giờ | 🟦 | BE có GET store/offers/:id/pricing-recommendation và POST .../apply-pricing chưa nối; app mới duyệt/từ chối đề xuất. |
| S37 | Lịch sử quyết định giá | ✅ |  |
| S38 | Mô phỏng chính sách giá | ➖ | Bỏ có chủ đích: endpoint mô phỏng cũ là số giả đã xóa khỏi BE. Rescue Lab thay thế. |
| S39 | Danh sách đơn | ✅ |  |
| S40 | Chi tiết đơn | ✅ |  |
| S41 | Quét QR nhận hàng | ✅ |  |
| S42 | Lịch hẹn nhận hàng | ✅ |  |
| S43 | Danh sách khiếu nại | ✅ |  |
| S44 | Xử lý khiếu nại | ✅ |  |
| S45 | Đánh giá của khách | 🟦 | BE có AI soạn phản hồi đánh giá/khiếu nại và phân tích cảm xúc (store/ai/draft-review-reply, draft-complaint-reply, sentiment-analysis) chưa nối vào màn Đánh giá/Khiếu nại. |
| S46 | Báo cáo hao hụt và thu hồi | 🟧 | Có tổng hợp hao hụt/thu hồi theo kỳ 7/30/90 ngày. Thiếu biểu đồ cột chồng hao hụt và đường doanh thu thu hồi, bộ chọn ngày/tuần/tháng: BE chưa trả chuỗi theo ngày. |
| S47 | Doanh thu và đơn | 🟧 | So sánh hai kỳ theo mẫu cố định (7/14/30 ngày), chưa chọn kỳ A/B tùy ý, chưa có nhóm theo ngày/tuần/tháng và biểu đồ đường: BE overview không trả chuỗi. |
| S48 | Báo cáo theo món | ✅ |  |
| S49 | Phân bố bán hàng theo giờ | 🟧 | Có thanh số đơn theo giờ. Thiếu bản đồ nhiệt thứ × giờ và tỷ lệ bán hết theo giờ: BE chỉ gom theo giờ, chưa theo thứ. |
| S50 | Hiệu quả đề xuất giá | 🟧 | Có số đề xuất, tỷ lệ duyệt. Doanh thu cộng thêm là ước lượng cố định (35.000đ/đề xuất), chưa so sánh với nhóm không giảm giá; BE cần tính thật. |
| S51 | Đối soát doanh thu và hoa hồng | ✅ |  |
| S52 | Sao kê đối soát tuần | 🟧 | Danh sách và chi tiết sao kê, tải CSV. PDF: BE chỉ tạo tệp PDF tối thiểu, chưa phải sao kê PDF đúng nghĩa nên app chưa dùng. |
| S53 | Xuất báo cáo | 🟧 | Mới xuất đơn và sao kê kế toán (CSV). Thiếu báo cáo hao hụt, PDF, xem trước, lịch sử tệp đã xuất: BE chưa có. |
| S54 | Tác động môi trường | 🟧 | Có số liệu và nút chia sẻ liên kết. Thiếu công tắc công khai/riêng tư, trang tác động công khai, tải ảnh thành tích: BE chưa có. |
| S55 | Chế độ demo | ⬜ | Chưa làm. BE chỉ bật/tắt cờ isDemo, tua nhanh và đồng hồ giả lập chưa tồn tại (apps/simulation chưa nối). |
| S56 | Khách đã mua | ✅ |  |
| S57 | Phân nhóm khách | ✅ |  |
| S58 | Khách yêu thích cửa hàng | 🟧 | Có tổng số và lượt thêm mới theo tuần. Không có lượt bỏ yêu thích vì BE xóa dòng thay vì đánh dấu. |
| S59 | Danh sách ưu đãi | ✅ |  |
| S60 | Tạo ưu đãi | ✅ |  |
| S61 | Chiến dịch thông báo | ✅ |  |
| S62 | Tạo chiến dịch | 🟦 | BE có store/ai/draft-marketing-campaign và draft-notification chưa nối vào form chiến dịch. Chưa có "Đề xuất ưu đãi phù hợp" (BE chưa có). |
| S63 | Danh sách nhân viên | ✅ |  |
| S64 | Mời và đổi quyền nhân viên | ✅ |  |
| S65 | Hoạt động của nhân viên | ✅ |  |
| S66 | Trợ lý cửa hàng | 🟧 | Chat nhiều lượt có số liệu 7 ngày. Chưa nhập bằng micro (app). Câu trả lời chỉ là văn bản, BE chưa trả bảng/biểu đồ nhỏ và dòng "Nguồn". |
| S67 | Lịch sử hội thoại AI | ✅ |  |
| S68 | Báo cáo tuần thông minh | 🟧 | Chỉ tạo báo cáo 7 ngày gần nhất. Chưa xem các tuần trước, chưa lưu báo cáo tuần: BE chưa lưu lịch sử. |
| S69 | Cảnh báo bất thường và phân tích nguyên nhân | ✅ |  |
| S70 | Đề xuất hành động và theo dõi kết quả | 🟧 | Thẻ đề xuất mới chỉ có một quy tắc (món bán dưới 50%). Tab "Đang theo dõi" chưa có kết quả sau áp dụng (resultEvaluation chưa được tính); chưa có nút "Vì sao đề xuất?". |
| S71 | Cấu hình AI | ✅ |  |
| S72 | Mức dùng và nhật ký AI | 🟧 | Nhật ký có thời điểm, tính năng, đầu vào/ra tóm tắt. Thiếu lượt bị từ chối, phạm vi dữ liệu AI đọc, phản hồi trong thẻ nhật ký; mức dùng xem ở màn Hạn mức. |
| S73 | Gửi yêu cầu hỗ trợ | ✅ |  |
| S74 | Danh sách và trao đổi hỗ trợ | ✅ |  |

Ngoài doc: Rescue Timeline ✅, Rescue Pool ✅, Rescue Bridge ✅, Rescue Lab 🟦 (chọn phạm vi theo nhóm món; BE hỗ trợ chọn từng món, chưa nối), TrustPass 🟧 (có khai báo, lịch sử, cờ rà soát; chưa có trạng thái nháp/công bố, quy trình rà soát sau báo cáo, AI trích hạn dùng từ ảnh).

## 3. Việc thuần app (BE đã có, chỉ cần nối)

Ưu tiên cao vì không phụ thuộc BE.

| # | Việc | Màn | Endpoint BE có sẵn | Mô tả |
|---|---|---|---|---|
| 1 | Tải logo cửa hàng | S09 Hồ sơ | `POST store/uploads/image` | Dùng `rememberImagePicker` + `StoreRepository.uploadImageUri` (đã có trong ItemFormScreen) để chọn ảnh, tải lên, rồi gửi `logoUrl` cho PUT store/profile. Bỏ ô nhập URL. |
| 2 | AI soạn mô tả món | S22 Form món | `POST store/ai/describe-item` | Nút "Soạn bằng AI" ở ô mô tả: gửi tên, nhóm, thành phần; điền kết quả vào ô để chủ sửa rồi mới lưu. Phải hiển thị nhãn "AI gợi ý". Tốn hạn mức `ai_content_gen`. |
| 3 | AI soạn phản hồi đánh giá/khiếu nại | S45, S44 | `POST store/ai/draft-review-reply, draft-complaint-reply` | Nút "Gợi ý trả lời" trong hộp phản hồi/từ chối, chọn giọng điệu (mặc định lấy từ cấu hình AI). Chỉ điền vào ô, chủ gửi thủ công. |
| 4 | Phân tích cảm xúc đánh giá | S45 | `POST store/ai/sentiment-analysis` | Thẻ tóm tắt điểm mạnh/cần cải thiện trên đầu màn Đánh giá. |
| 5 | AI soạn chiến dịch/thông báo | S62 | `POST store/ai/draft-marketing-campaign, draft-notification` | Nút "Soạn bằng AI" với 3 giọng điệu ở form chiến dịch; giới hạn tiêu đề 50, nội dung 150 ký tự. |
| 6 | Gợi ý combo / túi bất ngờ | S30 | `POST store/ai/suggest-combos` | Gợi ý món ghép khi tạo túi bất ngờ. |
| 7 | Định giá theo gợi ý | S36 | `GET store/offers/:id/pricing-recommendation, POST .../apply-pricing` | Xem giá gợi ý của một suất và áp dụng. Xác nhận trước khi áp dụng. |
| 8 | Chọn từng món trong Rescue Lab | Rescue Lab | `POST store/rescue-lab/scenarios (trường `itemIds`)` | Thêm bộ chọn món (tối đa 100) bên cạnh chọn nhóm món. |
| 9 | Deep link mời nhân viên | S04 | `(không cần BE mới)` | Thêm intent-filter mở màn Kích hoạt khi bấm liên kết mời; hiện chỉ nhập mã thủ công. |
| 10 | Ngày/tháng cho so sánh kỳ | S47 | `POST store/reports/compare-periods` | Bộ chọn ngày thay cho 3 mẫu 7/14/30 ngày (BE đã nhận ngày bất kỳ). |

## 4. Việc cần BE làm trước (rồi mới làm app)

| # | Nghiệp vụ | Màn | BE cần làm | App làm sau đó |
|---|---|---|---|---|
| 1 | Biểu đồ theo ngày cho báo cáo | S46, S47 | Endpoint trả chuỗi theo ngày/tuần/tháng: suất làm, đã bán, bỏ, doanh thu thu hồi; nhóm theo kỳ. | Biểu đồ cột chồng và đường; bộ chọn kỳ. |
| 2 | Phân bố theo thứ × giờ và tỷ lệ bán hết theo giờ | S49 | Mở rộng `reports/hourly-distribution` thêm chiều thứ và tỷ lệ bán hết. | Bản đồ nhiệt, câu gợi ý "khung 19–20h bán nhanh nhất". |
| 3 | Hiệu quả đề xuất giá thật | S50 | Tính doanh thu thu hồi của nhóm có/không giảm giá, hàng bỏ trước và sau; bỏ số ước lượng 35.000đ cố định. Nhãn "so sánh quan sát, không phải thử nghiệm". | Biểu đồ so sánh hai nhóm. |
| 4 | Sao kê PDF thật | S52 | Sinh PDF sao kê đúng nghĩa (hiện là PDF tối thiểu giả) hoặc dùng thư viện PDF. | Nút tải PDF. |
| 5 | Xuất báo cáo đầy đủ | S53 | Xuất báo cáo hao hụt, đối soát (CSV/PDF), lưu lịch sử tệp đã xuất, trả hạn mức còn lại. | Màn chọn loại báo cáo, kỳ, định dạng; danh sách tệp đã xuất. |
| 6 | Tác động công khai | S54 | Công tắc công khai/riêng tư của trang tác động, trang công khai thật, ảnh thành tích. | Công tắc, xem trước, tải ảnh. |
| 7 | Lượt bỏ yêu thích | S58 | Ghi nhận bỏ yêu thích (đánh dấu thay vì xóa dòng) và trả số giảm theo tuần. | Biểu đồ tăng/giảm. |
| 8 | Báo cáo tuần lưu và xem lại | S68 | Lưu báo cáo tuần theo tuần, API xem tuần trước; bảng chỉ số do hệ thống tính. | Vuốt giữa các tuần. |
| 9 | Thẻ đề xuất đa dạng và đo kết quả | S70 | Thêm quy tắc sinh thẻ (đổi khung nhận, mở túi bất ngờ, giảm giá sớm); tính `resultEvaluation` sau khi chấp nhận; trả lý do "Vì sao đề xuất?" từ bảng quyết định. | Tab "Đang theo dõi" hiện kết quả; nút "Vì sao". |
| 10 | Nhật ký AI đầy đủ | S72 | Ghi lượt bị từ chối vì hết hạn mức, phạm vi dữ liệu AI đọc. | Hiển thị thêm trong thẻ nhật ký. |
| 11 | Biểu đồ/bảng trong trả lời AI | S66 | Trả kèm dữ liệu có cấu trúc (bảng, chuỗi số) và nguồn dữ liệu cùng câu trả lời. | Bảng/biểu đồ nhỏ và dòng "Nguồn". |
| 12 | Loại hình và tọa độ cửa hàng | S02, S09 | Thêm loại hình cửa hàng, nhận hoặc tự xác định tọa độ từ địa chỉ; API gợi ý địa chỉ. | Chọn loại hình, gợi ý địa chỉ, ghim bản đồ xem trước. |
| 13 | Ngưỡng cảnh báo bất thường | S69 | Nếu muốn chỉnh độ nhạy: lưu cấu hình riêng (hiện chỉ có tham số `sensitivity` mỗi lần gọi). | Màn cấu hình độ nhạy. |
| 14 | Hồ sơ TrustPass nháp và rà soát | TrustPass | Trạng thái nháp/công bố; quy trình rà soát sau báo cáo sai lệch (hiện chỉ gắn cờ UNDER_REVIEW); AI trích hạn dùng từ ảnh cần chủ xác nhận. | Nút lưu nháp/công bố; theo dõi kết quả rà soát. |
| 15 | Chế độ demo (S55) | S55 | Đồng hồ ảo thật, mô phỏng dữ liệu (có thể dùng apps/simulation), sự kiện chạy; hiện chỉ có cờ `isDemo`. | Màn demo, banner đỏ "ĐANG DEMO". |
| 16 | Đính kèm tệp ngoài ảnh | S73 | Quy tắc cho PDF/tệp khác (hiện chỉ ảnh JPEG/PNG/WebP tối đa 5 MB, 3 ảnh). | Chọn tệp. |

## 5. 18 endpoint `store/*` của BE mà app chưa gọi

| Endpoint | Ghi chú |
|---|---|
| `GET store/customers/:id/notes` | Không cần: ghi chú đã trả trong danh sách khách. |
| `GET store/demo/virtual-clock, POST store/demo/virtual-clock` | Thuộc S55, xem mục 4. |
| `GET store/donations` | Lịch sử quyên góp; có thể thêm vào S31. |
| `GET store/offers/:id/pricing-recommendation, POST store/offers/:id/apply-pricing` | Xem mục 3. |
| `GET store/rescue-lab/metric-definitions` | Định nghĩa chỉ số; app tự đặt nhãn, có thể dùng để hiện công thức. |
| `GET store/rescue-lab/versions/:id` | Chi tiết một phiên bản; app đã lấy qua chi tiết kịch bản. |
| `GET store/statements, GET store/statements/:id/pdf` | Danh sách đã có qua `reports/reconciliation`; PDF xem mục 4. |
| `PATCH store/marketing/promotions/:id` | Trùng với PUT, app dùng PUT. |
| `POST store/ai/describe-item, draft-complaint-reply, draft-marketing-campaign, draft-notification, draft-review-reply, sentiment-analysis, suggest-combos` | Xem mục 3. |

## 6. Việc kỹ thuật tồn đọng

- **Chưa kiểm thử tay trên thiết bị** hầu hết màn mới (khiếu nại, đánh giá, báo cáo, đối soát, ưu đãi, chiến dịch, nhân viên, khách, Rescue Lab, trợ lý AI, hỗ trợ, TrustPass, chọn ảnh). Mới build, lint và gọi thử API. Cần chạy lần lượt với tài khoản `owner@rincon.vn`.
- **Dữ liệu seed ít**: khiếu nại, đánh giá, chiến dịch, nhân viên đều rỗng; cần tạo dữ liệu mẫu để kiểm thử luồng xử lý. Phân nhóm khách cần từ 20 khách; cảnh báo bất thường cần 28 ngày dữ liệu.
- **Phân quyền**: nhân viên quầy (COUNTER) chỉ thấy một số màn. Menu "Cửa hàng" chưa ẩn mục theo quyền, BE trả 403 và app hiện lỗi; nên ẩn mục theo `session.getPermission()`.
- **Phân trang**: món chỉ tải 100 đầu; lịch sử giá gửi một request mỗi suất.
- **Ảnh**: màn xem ảnh tải nguyên ảnh không thu nhỏ (`Forms.kt`).
- **Thông báo đẩy (FCM)**: chưa có; thông báo chỉ xem trong app.
- **BASE_URL cứng** cho dev (`SessionManager.kt`); cần màn/cấu hình cho bản phát hành.
- **Nhánh git**: toàn bộ thay đổi từ đợt 1 đến nay (BE và app) **chưa commit**; cần chia nhánh `feature/*` nhỏ theo `rule.md`.
- **Bảo mật khóa**: khóa Cloudinary đã lộ trong hội thoại phát triển; nên đổi API secret. Khóa chỉ nằm trong `.env` (gitignored).
- **Ghi chú `shortcut:` cũ** trong mã có vài dòng đã lỗi thời (ví dụ ở RegisterScreen, CustomersScreen, AiScreen, SupportScreen, StoreProfileScreen); xem lại khi nối việc ở mục 3.

## 7. Gợi ý thứ tự làm

1. Kiểm thử tay và sửa lỗi hiển thị các màn mới (1 người, vài ngày).
2. Mục 3: nối các tính năng AI và tải logo (việc thuần app, nhanh).
3. BE: mục 4 các dòng 1, 2, 3, 5, 9 (báo cáo và đề xuất) rồi app làm biểu đồ tương ứng.
4. BE: S54, S58, S68, S72, TrustPass nháp.
5. Quyết định riêng: S55 (chế độ demo) và tệp đính kèm ngoài ảnh.
