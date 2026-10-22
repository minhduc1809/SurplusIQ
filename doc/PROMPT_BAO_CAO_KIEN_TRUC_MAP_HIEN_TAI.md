# PROMPT: BÁO CÁO KIẾN TRÚC MAP HIỆN TẠI (CHỈ ĐỌC – DỪNG CHỜ DUYỆT)

## VAI TRÒ

Bạn là Senior Backend/GIS Engineer kiêm Software Architect. Nhiệm vụ duy nhất của lượt này: **đọc code hiện tại và báo cáo chức năng map "khách hàng định vị quán ăn gần đây, thấy quán có đồ sale/đồ dư" đang được xây dựng như thế nào.** Sau đó dừng lại để người dùng xem trước.

## RÀNG BUỘC CỨNG

1. **Chỉ đọc.** Không sửa code, không tạo/xoá file ứng dụng, không chạy migration, không seed dữ liệu, không ghi vào DB. Chỉ được tạo duy nhất file báo cáo ở mục "Kết quả cần giao".
2. Nếu cần xem DB: chỉ dùng lệnh đọc (xem schema, `SELECT`, `EXPLAIN`). Không bao giờ chạy `INSERT/UPDATE/DELETE/DROP/ALTER`. In ra tên DB/host đang trỏ tới (che mật khẩu, token, API key) và nếu nghi là production thì **không kết nối**, chỉ đọc file migration/schema trong code.
3. **Mỗi nhận định phải có bằng chứng:** file:dòng, đoạn code ngắn, hoặc kết quả lệnh. Không có bằng chứng thì ghi "chưa xác định được" hoặc "rủi ro", tuyệt đối không đoán cho trọn câu.
4. Không thấy trong code thì ghi rõ "không có trong code". Không bịa tên bảng, tên API, tên thư viện.
5. Không tiết lộ secret: gặp API key, mật khẩu, token trong code thì chỉ ghi vị trí file:dòng và loại secret, **không chép giá trị** vào báo cáo.
6. Không tự suy diễn nghiệp vụ. Chỗ chưa rõ thì đưa vào mục câu hỏi cần xác nhận.

## PHẠM VI ĐỌC

Toàn bộ phần code liên quan tới map và định vị quán ăn trong 4 ứng dụng: APP-CUSTOMER (chính), APP-OWNER, WEB-OWNER, WEB-ADMIN, cùng Backend, Database (migration, schema, model, seed hiện có), cấu hình môi trường.

## NỘI DUNG CẦN BÁO CÁO

### 1. Tổng quan
- Cấu trúc repo, công nghệ của từng ứng dụng và backend, vị trí các thư mục liên quan tới map.
- Sơ đồ luồng (Mermaid): Vị trí khách → App → API → Business logic → Truy vấn không gian → DB → Response → Marker/Danh sách.

### 2. Phía client (App Khách hàng, và chỗ khác nếu có map)
- Thư viện bản đồ đang dùng, phiên bản, cách cấp API key (chỉ ghi vị trí, không chép key).
- Cách lấy vị trí người dùng, xin quyền, xử lý khi bị từ chối, vị trí nhập tay.
- Cách vẽ marker, gom cụm, thẻ thông tin quán, danh sách.
- Tham số gửi lên backend: tên field, đơn vị bán kính, có gửi viewport/bounds không.
- Tìm kiếm, lọc (đang sale, mở cửa, loại món, giá), sắp xếp, phân trang.

### 3. Phía backend
- Endpoint tìm quán/deal theo vị trí: route, method, tham số, schema response, phân quyền.
- **Cách tính khoảng cách:** Haversine trong code, PostGIS, MongoDB 2dsphere, geohash, Elasticsearch, hay tính ở client. Đơn vị, bán kính mặc định và tối đa, quy ước biên (đúng bán kính có được tính không).
- Rule lọc: trạng thái cửa hàng nào được hiện, trạng thái deal nào, giờ mở cửa, khung giờ deal, số lượng còn lại, deal hết hạn xử lý bằng truy vấn thời gian thực hay job nền.
- Sắp xếp mặc định, giới hạn kết quả, cache, geocoding/reverse geocoding.

### 4. Cơ sở dữ liệu
Bảng gồm: tên bảng/collection | cột | kiểu | ràng buộc | ý nghĩa | ví dụ giá trị hợp lệ, cho các thực thể: cửa hàng, địa chỉ, toạ độ, giờ mở cửa, sản phẩm, deal/khuyến mãi/đồ dư, tồn kho, danh mục, hình ảnh.
- Kiểu lưu toạ độ (lat/lng tách cột, geometry, geography, GeoJSON), SRID, **thứ tự lat,lng hay lng,lat**.
- Index không gian đã có chưa, migration tương ứng.
- Múi giờ và định dạng thời gian lưu trữ.
- Dữ liệu seed hoặc dữ liệu mẫu đang có sẵn.

### 5. Liên ứng dụng
- Chủ cửa hàng tạo cửa hàng, nhập toạ độ/địa chỉ, tạo deal ở đâu và bằng API nào.
- Admin duyệt/khoá cửa hàng ảnh hưởng thế nào tới hiển thị trên map.
- Khách đọc dữ liệu qua API nào, cùng một thực thể có hiển thị đồng nhất giữa các ứng dụng không.

### 6. Hiện trạng chức năng: đúng, thiếu hay mockup
Với từng chức năng con của map, gán nhãn `PASS` / `PARTIAL` / `FAIL` / `NOT IMPLEMENTED` / `NEEDS CLARIFICATION` dựa trên **đọc code** (chưa chạy test nên chỉ ghi "theo code"), kèm file:dòng. Quét và liệt kê:
- Dữ liệu quán hardcode trên client, toạ độ cứng, danh sách mẫu khi API lỗi hoặc rỗng.
- Hàm tính khoảng cách giả, bán kính hardcode, hàm giả lập thành công, `catch` nuốt lỗi.
- Nút/màn hình chưa gắn handler, API client gọi mà backend không có route, và ngược lại.
- TODO, FIXME, HACK trong luồng map.
- Secret lộ trong repo (chỉ ghi vị trí).

### 7. Rủi ro và điểm chưa hợp lý
Mỗi mục ghi dạng `[XÁC NHẬN]` (có bằng chứng trong code) hoặc `[RỦI RO]` (nghi ngờ), kèm mức độ P0–P3 và lý do. Ví dụ cần soi: đảo lat/lng, thiếu index không gian, tính khoảng cách ở client mà không kiểm ở server, lộ quán bị khoá hoặc chờ duyệt, deal hết hạn vẫn hiện, sai múi giờ, thiếu phân trang, không giới hạn bán kính.

### 8. Hợp đồng dữ liệu đầu vào cho seed (phần quan trọng nhất)
Danh sách trường **bắt buộc / tuỳ chọn** cho từng thực thể cần có dữ liệu để map chạy được, kèm enum hợp lệ, thứ tự toạ độ, đơn vị tiền, định dạng thời gian, và thứ tự tạo (thực thể nào phải có trước). Ghi rõ nên đẩy dữ liệu qua API nào hay bảng nào, và vì sao.

### 9. Câu hỏi cần xác nhận nghiệp vụ
Mỗi câu gồm: mô tả, nguồn (file:dòng), câu hỏi cụ thể, phương án đề xuất. Ví dụ: "đồ sale" khác "đồ dư" thế nào; điểm đúng bán kính có tính không; quán ngoài giờ mở cửa có hiện không; deal hết hạn xử lý ra sao.

### 10. Giới hạn của báo cáo
Liệt kê file/thư mục chưa đọc được, phần chưa xác định được và lý do.

## KẾT QUẢ CẦN GIAO

Ghi **một file duy nhất**: `docs/audit/MAP_ARCHITECTURE_REPORT.md`, theo đúng 10 mục trên.

Sau đó trả lời trong khung chat bằng phần tóm tắt ngắn gồm: công nghệ map, cách tính khoảng cách, kiểu lưu toạ độ, số mục `PASS/PARTIAL/FAIL/NOT IMPLEMENTED`, số mockup/hardcode tìm thấy, số rủi ro theo mức độ, số câu hỏi cần xác nhận.

## DỪNG LẠI SAU KHI BÁO CÁO

**Không** làm tiếp phần thiết kế dữ liệu, seed, viết test hay sửa lỗi. Kết thúc bằng câu: "Đã xong báo cáo kiến trúc map, chờ bạn xem và xác nhận trước khi sang bước seed dữ liệu."

**BẮT ĐẦU NGAY: tìm và đọc toàn bộ code liên quan tới map trong repository hiện tại.**
