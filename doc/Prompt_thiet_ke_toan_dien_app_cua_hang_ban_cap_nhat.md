# PROMPT THIẾT KẾ LẠI TOÀN DIỆN ỨNG DỤNG QUẢN LÝ CỬA HÀNG THỰC PHẨM

## Rincón del Pan -- Chi nhánh Pasteur

## 1. Vai trò và mục tiêu

Bạn là **Lead Product Designer, Senior UI/UX Designer và Mobile Design
System Architect**. Hãy rà soát và thiết kế lại **toàn bộ giao diện ứng
dụng dành cho chủ/quản lý cửa hàng đồ ăn**, từ Dashboard đến tất cả màn
hình con, trạng thái rỗng, loading, thông báo, chatbot, biểu mẫu, chi
tiết và các thao tác sau khi bấm nút.

Đây là yêu cầu **thiết kế lại sản phẩm đang tồn tại**, không phải tạo
một vài màn hình minh họa. Giao diện hiện tại có các khu vực như
Dashboard, đơn hàng, thực phẩm, hao hụt, đánh giá, tác vụ cuối ngày,
thông báo, cài đặt và quét QR. Hãy kiểm tra code, route, component,
quyền truy cập và nghiệp vụ hiện có để xác định chính xác phạm vi.
**Không được chỉ làm Dashboard hoặc dựng một bộ mockup ít màn hình rồi
kết luận hoàn thành.**

Mục tiêu: - Hiện đại, chỉn chu theo tiêu chuẩn sản phẩm mobile quốc tế;
rõ ràng, nhất quán, dễ học và dễ thao tác. - Tập trung vào công việc
thực tế của chủ cửa hàng: theo dõi hoạt động, xử lý đơn, quản lý thực
phẩm, hạn dùng/hao hụt, đánh giá và các công việc cần làm. - Ưu tiên nền
sáng trắng, phân cấp nội dung rõ ràng; các thẻ, bảng, biểu đồ và vùng
thao tác phải nổi lên nhờ độ tương phản, đường viền tinh tế, phân lớp và
bóng đổ nhẹ --- không phụ thuộc vào việc tô màu nền đậm. - Thiết kế đủ
sâu đến từng màn con, từng nút bấm, trạng thái tương tác và luồng quay
lại. - Giữ đúng nghiệp vụ, dữ liệu, API, quyền, điều hướng và hành vi đã
có. Không tự ý bịa thêm chức năng hoặc số liệu.

## 2. Bắt buộc kiểm kê toàn bộ màn hình trước khi thiết kế

Trước khi sửa UI, hãy đọc cấu trúc dự án và lập danh sách tất cả: -
Route/màn hình chính và màn hình con. - Component dùng chung, thanh điều
hướng, modal, bottom sheet, dialog, menu, bộ lọc, tìm kiếm, form và biểu
đồ. - Các nút bấm, hành động, điểm vào/điểm ra của từng luồng. - Các
trạng thái: đang tải, thành công, thất bại, không có dữ liệu, không có
kết quả tìm kiếm, mất kết nối, lỗi xác thực, không đủ quyền, dữ liệu
chưa hoàn chỉnh. - Những màn hình hiện có nhưng đang thiếu thiết kế, chỉ
có giao diện sơ sài, chưa nối hành động hoặc không thể truy cập thuận
tiện.

Tạo **Screen Inventory** có các cột:
`Mã màn | Tên màn | Mục đích | Route/điểm vào | Thành phần chính | Hành động/nút bấm | Màn đích | Trạng thái cần thiết | Ghi chú`.

Đối chiếu danh sách với code thực tế; không giới hạn số màn theo hình
tham khảo. Không được bỏ qua màn con chỉ vì chúng không nằm trên thanh
menu chính.

## 3. Tổ chức lại kiến trúc thông tin và điều hướng

Không đưa toàn bộ chức năng vào màn **Hồ sơ/Cá nhân/Cài đặt**. Hồ sơ chỉ
chứa thông tin tài khoản, thông tin cá nhân phù hợp, bảo mật và các tùy
chọn cá nhân thực sự cần thiết. Chức năng vận hành cửa hàng phải nằm ở
khu vực nghiệp vụ riêng.

Hãy phân chia theo nguyên tắc sau, nhưng điều chỉnh theo route và nghiệp
vụ thực tế trong code:

### 3.1. Dashboard / Hôm nay

Là màn tổng quan và điểm xuất phát cho công việc trong ngày: - Lời chào,
tên cửa hàng/chi nhánh, trạng thái hoạt động và nút thông báo. - Ngày
hiện tại hoặc bộ chọn ngày nếu hệ thống đang hỗ trợ. - Nhóm KPI quan
trọng, có đơn vị và khoảng thời gian rõ ràng. - Biểu đồ doanh thu theo
ngày/tuần nếu có dữ liệu phù hợp. - Khu vực **Truy cập nhanh** đến các
tính năng nổi bật. - Khu vực **Cần xử lý** cho công việc chờ, đơn cần
chú ý hoặc tác vụ cuối ngày. - Có thể sắp xếp lại thứ tự theo mức độ ưu
tiên nghiệp vụ, không thêm số liệu giả.

### 3.2. Đơn hàng

-   Danh sách đơn, tìm kiếm, lọc, phân loại trạng thái và sắp xếp nếu đã
    hỗ trợ.
-   Trạng thái đơn thể hiện bằng nhãn dễ phân biệt, không chỉ dựa vào
    màu.
-   Màn chi tiết đơn: thông tin đơn, thời gian, khách hàng và sản phẩm
    theo dữ liệu hệ thống; tổng tiền; lịch sử/trạng thái nếu có.
-   Nút thao tác chỉ xuất hiện khi hợp lệ với trạng thái và quyền của
    người dùng.
-   Các thao tác quan trọng như xác nhận, hoàn tất, hủy phải có xác nhận
    phù hợp; tránh đặt nút nguy hiểm cạnh nút chính mà không có phân
    biệt.
-   Có trạng thái danh sách rỗng, lỗi tải, không tìm thấy kết quả và
    đang tải.

### 3.3. Thực phẩm / Sản phẩm / Tồn kho

-   Danh sách và cách hiển thị phù hợp với dữ liệu thật: ảnh sản phẩm
    nếu có ảnh hợp lệ; nếu không có ảnh thì dùng icon minh họa theo loại
    thực phẩm.
-   Tìm kiếm, bộ lọc danh mục/trạng thái và thao tác thêm/sửa/xem chi
    tiết theo chức năng đang tồn tại.
-   Form thêm/sửa có nhãn trường, đơn vị, bắt buộc/không bắt buộc, kiểm
    tra dữ liệu và thông báo lỗi ngay cạnh trường.
-   Hiển thị rõ số lượng, đơn vị, tình trạng và hạn dùng nếu nghiệp vụ
    có các trường đó.
-   Không hiển thị ô ảnh trống, ảnh lỗi hoặc placeholder gây cảm giác dữ
    liệu bị hỏng.

### 3.4. Hao hụt / Thực phẩm được cứu

-   Tách bạch ý nghĩa của thực phẩm được cứu, hao hụt và các chỉ số liên
    quan; không gộp thành một thẻ gây hiểu nhầm.
-   Bộ lọc thời gian và biểu đồ chỉ sử dụng khi có dữ liệu đủ điều kiện.
-   Mỗi chỉ số phải có tên, đơn vị, kỳ thống kê và cách diễn giải rõ
    ràng.
-   Nếu chưa phát sinh dữ liệu, trình bày trạng thái rỗng thân thiện và
    hướng dẫn hành động phù hợp; không dựng biểu đồ giả.

### 3.5. Đánh giá

-   Danh sách đánh giá, điểm trung bình và phân loại chỉ khi hệ thống có
    dữ liệu.
-   Trạng thái chưa có đánh giá cần có icon phù hợp, thông điệp ngắn và
    giải thích rằng dữ liệu sẽ xuất hiện khi phát sinh.
-   Không tạo điểm đánh giá giả hoặc để khoảng trống lớn như một màn
    hình chưa hoàn thiện.

### 3.6. Công việc cần xử lý / Tác vụ cuối ngày

-   Tập hợp các việc đang chờ từ nghiệp vụ thực tế, sắp xếp theo mức độ
    ưu tiên và hạn xử lý nếu có.
-   Mỗi mục có tiêu đề rõ, mô tả ngắn, trạng thái, thời điểm phù hợp và
    nút hành động trực tiếp.
-   Bấm vào nhiệm vụ phải mở đúng màn hình/biểu mẫu cần xử lý, không chỉ
    đưa về Dashboard.
-   Khi hoàn thành, cập nhật trạng thái theo cơ chế hiện có và hiển thị
    phản hồi rõ ràng.

### 3.7. Thông báo

-   Phân nhóm thông báo theo loại hoặc trạng thái nếu dữ liệu hỗ trợ.
-   Có trạng thái đã đọc/chưa đọc, hành động mở chi tiết và đánh dấu đã
    đọc nếu hệ thống có hỗ trợ.
-   Không để biểu tượng chuông chỉ mang tính trang trí.

### 3.8. Quét QR

-   Giữ nút quét QR nổi bật nếu đây là hành động trung tâm của sản phẩm.
-   Nút giữa thanh điều hướng không được che nhãn, che nội dung hoặc gây
    khó chạm các tab bên cạnh.
-   Có màn xin quyền camera, trạng thái đang quét, quét thành công, mã
    không hợp lệ, camera bị từ chối và cách thử lại.
-   Không tự chế thêm luồng QR nếu chưa có trong code.

### 3.9. Hồ sơ / Cài đặt / Trợ giúp

Chỉ đặt ở khu vực này các nội dung đúng bản chất như: - Thông tin tài
khoản hoặc thông tin cá nhân. - Tùy chọn giao diện/ngôn ngữ nếu đang
được hỗ trợ. - Bảo mật, đăng xuất, trợ giúp và thông tin ứng dụng nếu
có. - Cấu hình cửa hàng chỉ đặt tại đây nếu đúng với quyền và cấu trúc
nghiệp vụ hiện có; nếu là nghiệp vụ quản lý riêng, hãy tạo khu vực truy
cập phù hợp thay vì nhồi vào Hồ sơ. - Không biến Hồ sơ thành một danh
sách dài chứa tất cả tính năng.

### 3.10. Chatbot / Trợ lý hỏi đáp

-   Nếu ứng dụng đã có chatbot hoặc có chức năng trợ lý hỏi đáp, thiết
    kế nút nổi ở góc dưới màn hình, nằm phía trên thanh điều hướng và
    không che CTA hoặc nội dung.
-   Nút nổi nhỏ gọn, icon dễ hiểu, có nhãn/tooltip ở lần đầu nếu phù
    hợp; không chiếm diện tích thường trực quá lớn.
-   Khi mở, chatbot xuất hiện dưới dạng bottom sheet hoặc màn hình hội
    thoại phù hợp với kích thước thiết bị.
-   Có lời chào ngắn, gợi ý câu hỏi nhanh dựa trên nghiệp vụ thật, ô
    nhập nội dung, nút gửi, trạng thái đang trả lời, lỗi và thử lại.
-   Phân biệt tin nhắn người dùng và trợ lý bằng bố cục, không chỉ bằng
    màu. Hỗ trợ nội dung dài và cuộn hội thoại.
-   Không giả vờ chatbot có khả năng truy cập dữ liệu hoặc thực hiện
    nghiệp vụ nếu backend hiện tại không hỗ trợ. Nếu không có chatbot
    trong code, chỉ xây dựng khi phạm vi dự án cho phép và nêu rõ phần
    tích hợp cần thiết; không tạo giao diện giả làm như đã hoạt động.

## 4. Truy cập nhanh trên Dashboard

Thiết kế một khu vực **Truy cập nhanh** thực sự hữu ích, không biến
Dashboard thành lưới nút quá dày.

-   Chọn khoảng 4--6 hành động thường dùng nhất dựa trên nghiệp vụ và
    code thực tế; đây là gợi ý bố cục, không phải yêu cầu phải thêm tính
    năng mới.
-   Ưu tiên những thao tác như xem đơn cần xử lý, quản lý thực phẩm, ghi
    nhận số lượng cuối ngày, xem hao hụt hoặc quét QR **chỉ khi những
    chức năng này đang tồn tại**.
-   Mỗi mục có icon nhất quán, nhãn ngắn, vùng chạm đủ lớn và trạng thái
    nhấn rõ.
-   Có thể dùng lưới 2 cột hoặc nhóm nút ngang có thể cuộn tùy số lượng;
    tránh nhiều màu nền cạnh tranh.
-   Hành động quan trọng nhất có thể dùng màu nhấn cam; các mục còn lại
    dùng nền trắng, viền nhẹ hoặc màu pastel rất nhạt.
-   Có thể hiển thị badge số lượng công việc chờ nếu số liệu thật có
    sẵn.
-   Mỗi nút phải điều hướng đến đúng màn hoặc mở đúng hành động; không
    tạo nút chỉ để trang trí.
-   Không lặp lại nguyên một danh sách tính năng dài đã có ở thanh điều
    hướng. Dashboard chỉ là nơi truy cập nhanh, không thay thế kiến trúc
    màn hình nghiệp vụ.

## 5. Hệ thống thiết kế và phối màu

### 5.1. Nền và phân lớp

-   Màu nền tổng thể: trắng hoặc trắng ngà rất nhẹ, ưu tiên cảm giác
    sạch và sáng.
-   Khu vực nội dung chính: nền trắng, phân tách bằng khoảng cách và
    đường viền tinh tế.
-   Card: trắng hoặc sắc độ trung tính rất nhạt, có viền mảnh màu trung
    tính và bóng đổ mềm, nhỏ, nhất quán để nổi lên khỏi nền.
-   Không dùng bóng đổ đậm, viền dày, hiệu ứng kính quá mức, gradient
    rực hoặc quá nhiều mảng màu.
-   Phân biệt nền trang, card, modal, bottom sheet và thanh điều hướng
    theo độ sâu thị giác; không cần mỗi vùng một màu khác nhau.

### 5.2. Màu thương hiệu

-   Giữ màu cam san hô hiện có làm màu nhấn chính, tham chiếu `#FF8A3D`
    nếu phù hợp với token màu hiện tại.
-   Nền chính: trắng; bề mặt: trắng; viền: xám ấm/be nhạt; văn bản
    chính: đen than; văn bản phụ: xám trung tính.
-   Xanh mint/xanh lá nhạt dùng cho trạng thái tích cực; vàng kem cho
    cảnh báo nhẹ; đỏ dịu cho lỗi/hủy; các màu trạng thái phải có ý nghĩa
    nhất quán.
-   Không sử dụng màu chỉ để trang trí nếu nó khiến người dùng hiểu nhầm
    trạng thái.
-   Màu chữ và icon phải đủ tương phản; không dùng chữ xám quá nhạt trên
    nền trắng.
-   Dark Mode nếu ứng dụng có hỗ trợ: dùng nền đen hoặc xám than sâu, bề
    mặt sáng hơn nền một cấp, viền vừa đủ nhìn thấy, giữ màu nhấn thương
    hiệu; không chỉ đảo màu tự động khiến card và chữ khó đọc.

### 5.3. Card, bảng và danh sách

-   Card cần có phân cấp rõ: tiêu đề, dữ liệu chính, đơn vị, chú thích
    và hành động.
-   Không đặt mọi thành phần vào card riêng lẻ; nhóm các thông tin liên
    quan để tránh giao diện vụn.
-   Dùng viền và bóng nhẹ để card tách khỏi nền; độ nổi của card phải
    nhất quán giữa các màn.
-   Danh sách đơn/sản phẩm nên ưu tiên khả năng quét nhanh: tiêu đề, mã
    hoặc thông tin phụ, trạng thái, dữ liệu quan trọng và hành động.
-   Trên mobile, tránh bảng ngang quá rộng. Chuyển thành danh sách/card
    theo hàng nếu phù hợp; chỉ cho cuộn ngang khi dữ liệu thực sự cần
    dạng bảng.
-   Tránh các card cao nhưng chỉ có vài dòng; không để vùng trống lớn
    không có mục đích.
-   Các card cùng nhóm có chiều cao, padding và cách căn chỉnh nhất
    quán.

### 5.4. Typography và icon

-   Dùng một hệ font dễ đọc, tối đa hai họ font nếu thực sự cần.
-   Có phân cấp rõ giữa tiêu đề màn, tiêu đề khu vực, dữ liệu KPI, nội
    dung, chú thích và nhãn.
-   Không dùng quá nhiều kiểu đậm/kích thước; không viết hoa toàn bộ
    nhãn.
-   Ưu tiên bộ icon vector đồng nhất về nét, kích thước và phong cách.
-   Icon phải có ý nghĩa trực quan, đi kèm nhãn khi biểu tượng có thể
    gây mơ hồ.
-   Không dùng emoji làm icon chính trong giao diện sản phẩm.
-   **Không có ảnh thì dùng icon hoặc minh họa vector phù hợp; không có
    dữ liệu thì dùng trạng thái rỗng bằng icon.** Không hiển thị khung
    ảnh lỗi, ảnh stock không liên quan, ảnh giả hoặc khoảng trắng như
    phần giao diện chưa tải xong.


## 5.5. Quy tắc phối màu chi tiết — màu cam là màu thương hiệu chủ đạo

**Nguyên tắc cốt lõi:** màu cam hiện có là màu nhận diện chính của Rincón del Pan. Giữ tinh thần thương hiệu cam, nhưng không phủ cam lên toàn bộ giao diện. Màu cam phải giúp người dùng nhận ra hành động quan trọng và điểm cần chú ý; nền sáng, typography, khoảng trắng và phân cấp thị giác vẫn là nền tảng.

### Bảng màu chuẩn

- **Brand / Primary Orange:** ưu tiên lấy đúng mã cam đang được sử dụng trong code hoặc tài sản thương hiệu. Nếu chưa có design token đáng tin cậy, dùng `#FF8A3D` làm giá trị tham chiếu và kiểm tra tương phản trước khi áp dụng.
- **Orange Hover / Pressed:** dùng sắc cam tối hơn màu chính để biểu thị hover, pressed hoặc active; tạo bằng token được định nghĩa thống nhất, không tự chọn một màu khác nhau ở từng màn.
- **Orange Tint / Subtle Surface:** dùng sắc cam pha trắng rất nhạt cho vùng nhấn nhẹ như chip đang chọn, icon nền, thông tin nổi bật hoặc vùng phụ trợ. Không dùng sắc này làm nền cho mọi card.
- **App Background:** trắng hoặc trắng ngà rất nhẹ.
- **Surface / Card:** trắng; dùng viền xám ấm rất nhạt và bóng đổ mềm, tiết chế.
- **Text Primary:** đen than hoặc xám đậm, đủ tương phản.
- **Text Secondary:** xám trung tính dễ đọc; không làm nhạt đến mức khó nhìn.
- **Border / Divider:** xám ấm hoặc be nhạt, thống nhất toàn ứng dụng.
- **Success:** xanh lá/mint có kiểm soát.
- **Warning:** vàng hổ phách hoặc vàng kem có độ tương phản phù hợp.
- **Error / Destructive:** đỏ dịu nhưng đủ phân biệt với cam thương hiệu.
- **Info:** xanh lam trung tính khi thật sự cần phân biệt thông tin.
- Không tự thêm màu trang trí mới nếu chưa có lý do UX rõ ràng. Mọi màu trạng thái phải có ý nghĩa ổn định, không dùng cùng một màu cho các ý nghĩa mâu thuẫn.

### Quy tắc phân bổ màu

- Dùng cam chủ yếu cho CTA chính, trạng thái được chọn, điểm nhấn dữ liệu quan trọng, liên kết/hành động nổi bật và một số chi tiết nhận diện.
- Các CTA chính cùng cấp trong cùng ngữ cảnh phải dùng cùng màu cam, kiểu chữ, chiều cao, bo góc, padding và trạng thái tương tác.
- Nút phụ dùng nền trắng/trung tính, viền và chữ theo token chung; không tự tạo nút phụ màu tím, xanh, hồng hoặc nhiều màu khác nhau chỉ để làm giao diện sinh động.
- Nút hủy/xóa nguy hiểm dùng hệ màu destructive nhất quán, không dùng cam thương hiệu thay cho màu lỗi nếu điều đó khiến người dùng hiểu sai mức độ rủi ro.
- Nền card, bảng, modal và bottom sheet ưu tiên trung tính. Chỉ dùng nền cam nhạt khi có mục đích phân cấp cụ thể; không biến toàn bộ dashboard thành một mảng cam.
- Biểu đồ dùng cam cho chuỗi dữ liệu chính. Chuỗi phụ dùng bảng màu phụ có kiểm soát, dễ phân biệt và có chú giải; không dùng nhiều màu rực cho từng cột nếu không mang ý nghĩa dữ liệu.
- Không dùng gradient cam trên mọi card/nút. Gradient chỉ được sử dụng nếu đã có trong ngôn ngữ thương hiệu và thực sự giúp phân cấp; mặc định ưu tiên màu phẳng, sạch, tinh tế.
- Không dùng màu sắc làm tín hiệu duy nhất: trạng thái phải có thêm nhãn, icon hoặc nội dung phù hợp.
- Kiểm tra độ tương phản của chữ, icon, viền và trạng thái focus. Nếu chữ trắng trên cam không đạt độ tương phản cần thiết, hãy dùng chữ đậm màu than hoặc điều chỉnh token màu; không đánh đổi khả năng đọc để giữ thẩm mỹ.
- Màu hover, pressed, focused, selected, disabled, loading và focus-visible phải được định nghĩa thành token, không tùy tiện chỉnh riêng từng màn.
- Dark Mode chỉ triển khai nếu sản phẩm hiện có hỗ trợ hoặc phạm vi yêu cầu cho phép; khi đó phải có bộ token riêng đã kiểm tra, không đảo màu máy móc.

### Quy tắc đồng nhất component

- Xây dựng một **design system dùng chung** với các token như `color.brand.primary`, `color.brand.hover`, `color.brand.pressed`, `color.brand.tint`, `color.text.primary`, `color.text.secondary`, `color.border.default`, `color.surface`, `color.status.success`, `color.status.warning`, `color.status.error`, cùng token typography, spacing, radius, elevation và kích thước điều khiển.
- Tất cả nút cùng loại phải dùng chung một component nền tảng và variant rõ ràng, ví dụ `primary`, `secondary`, `tertiary`, `destructive`, `icon`. Không tạo nút mới bằng cách sao chép rồi tự sửa màu, kích thước hoặc bo góc ở từng màn.
- Chuẩn hóa component dùng chung cho input, select, search, date picker, checkbox, radio, switch, tab, filter chip, badge, tooltip, dialog, bottom sheet, toast/snackbar, card và trạng thái tải/rỗng/lỗi.
- Mọi component cùng loại phải có cùng quy tắc về chiều cao, padding, khoảng cách icon–label, font, radius, viền, focus ring, hover, pressed, disabled và loading. Chỉ cho phép biến thể khi có lý do UX rõ ràng và được định nghĩa trong design system.
- Nếu code đã có component hoặc token, hãy tái sử dụng và chuẩn hóa chúng thay vì tạo một hệ thống song song. Trước khi thêm component mới, kiểm tra xem component tương đương đã tồn tại chưa.
- Không dùng inline style hoặc mã màu hard-code rải rác trong từng màn nếu có thể dùng token/theme. Thay đổi màu thương hiệu phải có thể thực hiện tập trung.
- Sau khi triển khai, rà soát toàn bộ ứng dụng để tìm nút lệch màu, khác kích thước, khác radius, sai trạng thái hoặc component trùng lặp; sửa đồng bộ, không chỉ sửa màn hình đang xem.

## 5.6. Responsive và breakpoint

- Thiết kế theo hướng **mobile-first nhưng responsive thực sự**, không chỉ thu nhỏ giao diện desktop. Mọi màn hình phải thích ứng tốt với điện thoại nhỏ, điện thoại lớn, tablet và desktop/web nếu nền tảng dự án hỗ trợ.
- Kiểm tra tối thiểu các nhóm kích thước: màn hình nhỏ khoảng `320–359px`, điện thoại phổ biến `360–430px`, tablet khoảng `600–1023px`, và desktop từ `1024px` trở lên. Đây là mốc kiểm thử tham khảo; hãy ưu tiên breakpoint theo layout và framework thực tế của dự án.
- Dùng layout linh hoạt, constraint, grid/flex và spacing theo hệ thống; tránh cố định chiều rộng/chiều cao khiến nội dung tràn hoặc bị cắt. Chỉ đặt max-width khi cần giới hạn độ dài dòng hoặc bề rộng biểu mẫu.
- Trên mobile, ưu tiên một cột, thao tác một tay, vùng chạm đủ lớn và điều hướng phù hợp với nền tảng. Trên tablet/desktop, có thể chuyển sang nhiều cột hoặc bố cục master-detail khi điều đó giúp sử dụng không gian tốt hơn.
- Bảng dữ liệu rộng phải có phương án mobile rõ ràng: chuyển thành danh sách/card hoặc cho cuộn ngang có chủ đích kèm dấu hiệu nhận biết; không để toàn trang tràn ngang.
- KPI, card, biểu đồ, biểu mẫu, bộ lọc, tiêu đề, breadcrumb, thanh điều hướng và nhóm nút phải tự sắp xếp lại theo bề rộng. Không để chữ, icon, badge hoặc nút chồng lấn; tên cửa hàng dài và dữ liệu dài phải được xử lý có chủ đích.
- Modal trên màn hình nhỏ cần chuyển thành dialog/bottom sheet phù hợp, có thể cuộn nội dung và vẫn nhìn thấy hành động chính. Bàn phím ảo không được che trường đang nhập hoặc nút lưu/xác nhận.
- Xử lý safe area, thanh trạng thái, thanh điều hướng hệ điều hành, thanh tab dưới, FAB/chatbot và padding đáy; các thành phần nổi không được che CTA hoặc nội dung có thể tương tác.
- Kiểm thử cả chiều dọc/ngang nếu ứng dụng hỗ trợ, phóng to chữ, nội dung dài, trạng thái loading/empty/error và danh sách dài. Không được coi responsive là hoàn thành chỉ vì giao diện không vỡ ở một kích thước.
- Nếu nền tảng có các quy ước native riêng, tuân thủ hành vi phù hợp của nền tảng thay vì ép mọi thiết bị dùng cùng một bố cục cứng nhắc.


## 6. Quy tắc biểu đồ và dữ liệu

-   Chỉ vẽ biểu đồ khi có dữ liệu thật, đủ điều kiện và có ý nghĩa.
-   Tiêu đề phải nói rõ chỉ số và khoảng thời gian; hiển thị đơn vị,
    nhãn trục cần thiết, chú giải nếu có nhiều chuỗi.
-   Dùng màu cam cho chuỗi dữ liệu chính; đường lưới nhẹ, điểm dữ liệu
    dễ nhìn, tooltip hoặc chi tiết khi tương tác nếu phù hợp.
-   Không tạo vòng tròn Kcal, mục tiêu calo hoặc thành phần từ ứng dụng
    sức khỏe. Đây là ứng dụng vận hành cửa hàng đồ ăn, không phải app
    theo dõi dinh dưỡng cá nhân.
-   Không dùng biểu đồ trang trí nếu một chỉ số lớn hoặc danh sách sẽ
    truyền tải tốt hơn.
-   Khi dữ liệu rỗng, hiển thị icon phù hợp, tiêu đề như "Chưa có dữ
    liệu", mô tả ngắn và hành động tiếp theo nếu có ích.
-   Không tạo số 0 giả để lấp biểu đồ nếu backend phân biệt giữa "giá
    trị bằng 0" và "chưa có dữ liệu".
-   Làm rõ khác biệt giữa dữ liệu bằng 0, chưa có dữ liệu, đang tải và
    lỗi tải dữ liệu.

## 7. Thiết kế mọi nút bấm và tương tác

Mỗi nút phải có mục đích và kết quả xác định: - **Primary button:** dùng
cho hành động chính của màn; nền cam thương hiệu, chữ đủ tương phản,
kích thước chạm thoải mái. - **Secondary button:** nền trắng hoặc trung
tính, viền nhẹ; dùng cho hành động phụ. - **Tertiary/text button:** dùng
cho hành động ít quan trọng, không cạnh tranh CTA chính. - **Destructive
button:** dùng màu cảnh báo phù hợp và yêu cầu xác nhận khi thao tác có
hậu quả đáng kể. - **Icon button:** có vùng chạm đủ lớn, tooltip hoặc
nhãn trợ năng; không dùng icon khó hiểu mà không có ngữ cảnh. -
**Tab/filter/chip:** trạng thái chọn và chưa chọn phải phân biệt rõ; giữ
nguyên bộ lọc hiện tại khi quay lại nếu phù hợp. - **FAB/nút nổi:**
không che nội dung, nút lưu, bàn phím hoặc thanh điều hướng.

Với từng nút, hãy kiểm tra: 1. Có hành động thật không? 2. Điều hướng
đến màn nào hoặc thực hiện việc gì? 3. Có trạng thái disabled/loading
không? 4. Thành công/thất bại phản hồi như thế nào? 5. Có cần xác nhận
trước khi thực hiện không? 6. Quay lại có giữ ngữ cảnh, bộ lọc và vị trí
cuộn hợp lý không?

Không để nút giả, liên kết rỗng, bấm không phản hồi hoặc nhiều nút cùng
nhấn mạnh ngang nhau. **Các nút cùng variant phải dùng chung component và token màu/kích thước/trạng thái trên toàn ứng dụng; không được tự phối màu hoặc tạo kiểu riêng lẻ theo từng màn.** Không thay đổi nghiệp vụ hoặc quyền chỉ để giao
diện trông hoàn chỉnh hơn.

## 8. Loading, empty state, error và feedback

Thiết kế đầy đủ trạng thái cho mọi màn hình có dữ liệu hoặc thao tác bất
đồng bộ.

### Loading

-   Dùng skeleton có hình dạng gần với nội dung thật, như skeleton card,
    hàng danh sách hoặc biểu đồ.
-   Dùng spinner nhỏ cho hành động ngắn như gửi biểu mẫu hoặc xác nhận.
-   Với tác vụ dài, hiển thị trạng thái dễ hiểu và cho biết người dùng
    nên chờ hay có thể tiếp tục thao tác khác.
-   Tránh phủ spinner toàn màn hình quá lâu, nhấp nháy, chuyển động liên
    tục hoặc animation gây mất tập trung.
-   Không nhảy bố cục mạnh khi dữ liệu tải xong; giữ chiều cao và vị trí
    thành phần ổn định.
-   Khóa nút gửi khi đang xử lý để tránh gửi lặp; thể hiện trạng thái
    đang thực hiện.

### Empty state

-   Có icon vector hoặc minh họa tối giản, tiêu đề ngắn, giải thích và
    CTA nếu có hành động hữu ích.
-   Ví dụ: chưa có đơn hàng, chưa có đánh giá, chưa phát sinh hao hụt,
    chưa có kết quả tìm kiếm.
-   CTA phải dẫn đến chức năng thực sự có sẵn.
-   Không sử dụng ảnh stock hoặc hình minh họa khổng lồ khiến người dùng
    phải cuộn qua vùng trống.

### Error state

-   Thông báo lỗi dễ hiểu, không chỉ hiển thị mã lỗi kỹ thuật.
-   Đưa ra hành động phù hợp như thử lại, kiểm tra dữ liệu hoặc quay
    lại.
-   Giữ dữ liệu người dùng đã nhập khi có thể và an toàn.
-   Không hiển thị lỗi backend thô hoặc thông tin nhạy cảm.

### Feedback

-   Toast/snackbar dùng cho kết quả ngắn; inline validation cho lỗi
    trường dữ liệu; dialog cho xác nhận quan trọng.
-   Trạng thái thành công, cảnh báo và thất bại phải nhất quán.
-   Không dùng popup cho mọi hành động nhỏ.
-   Có phản hồi thị giác khi nhấn, chọn tab, mở/đóng modal, gửi form
    hoặc cập nhật trạng thái; chuyển động ngắn và tiết chế.

## 9. Quy tắc thiết kế form và màn chi tiết

-   Chia form dài thành các nhóm thông tin theo logic nghiệp vụ; không
    dồn mọi trường vào một khối.
-   Label luôn hiển thị; placeholder chỉ là ví dụ, không thay thế label.
-   Đánh dấu trường bắt buộc rõ ràng; thông báo lỗi ngay dưới trường
    liên quan.
-   Dùng đúng bàn phím theo kiểu dữ liệu, định dạng tiền/số/ngày phù hợp
    và đơn vị rõ ràng.
-   Nút lưu/xác nhận đặt ở vị trí dễ thấy; xử lý bàn phím để không che
    trường đang nhập hoặc CTA.
-   Khi thoát form có dữ liệu chưa lưu, cảnh báo phù hợp.
-   Màn chi tiết cần ưu tiên thông tin quan trọng nhất, nhóm dữ liệu
    liên quan, trạng thái và hành động hợp lệ; không biến màn chi tiết
    thành một trang dài không có phân cấp.

## 10. Thanh điều hướng dưới và các khu vực truy cập

-   Chỉ giữ các mục cấp cao thực sự được dùng thường xuyên; đặt nhãn
    tiếng Việt ngắn và dễ hiểu.
-   Giữ nút quét QR ở giữa nếu đây là chức năng trung tâm hiện có, nhưng
    bảo đảm không che nội dung hoặc làm lệch bố cục.
-   Trạng thái đang chọn dùng màu cam; mục chưa chọn dùng màu trung tính
    có đủ tương phản.
-   Thanh điều hướng có nền riêng và tách khỏi nội dung bằng viền hoặc
    bóng rất nhẹ.
-   Cộng đủ khoảng đệm đáy cho nội dung cuộn để phần cuối không bị thanh
    menu che.
-   Không đặt mọi tính năng vào tab "Thêm" hoặc "Hồ sơ" mà không phân
    nhóm.
-   Những chức năng ít dùng có thể đặt trong khu vực "Thêm" theo nhóm rõ
    ràng, nhưng nghiệp vụ chính như đơn hàng/thực phẩm phải dễ tìm theo
    kiến trúc phù hợp.
-   Đảm bảo vùng an toàn hệ điều hành, kích thước chạm và khả năng sử
    dụng bằng một tay.

## 11. Chuyển động và hiệu ứng

-   Dùng animation ngắn, mượt và có mục đích: chuyển tab, mở bottom
    sheet, phản hồi nút, skeleton shimmer nhẹ hoặc cập nhật trạng thái.
-   Ưu tiên opacity/transform nhẹ; tránh phóng to nảy quá mức, parallax,
    hiệu ứng 3D hoặc animation liên tục.
-   Không làm chậm thao tác nghiệp vụ; người dùng phải có thể tương tác
    ngay khi trạng thái cho phép.
-   Tôn trọng cài đặt giảm chuyển động của hệ điều hành nếu dự án hỗ
    trợ.
-   Không dùng animation để che thời gian tải dữ liệu hoặc làm giao diện
    trông như đang hoạt động khi thực tế không có phản hồi.

## 12. Responsive, khả năng tiếp cận và chất lượng hiển thị

-   Thiết kế ưu tiên mobile nhưng phải thích ứng với nhiều kích thước
    màn hình và tỷ lệ hiển thị.
-   Không cắt tiêu đề, số liệu, nhãn, biểu đồ hoặc nút; xử lý tên cửa
    hàng dài và nội dung dài có chủ đích.
-   Bảo đảm tương phản chữ/nền, không truyền đạt trạng thái chỉ bằng
    màu, hỗ trợ kích thước chữ phù hợp và nhãn trợ năng cho icon button.
-   Các vùng chạm phải thoải mái; không đặt nút nguy hiểm sát nút chính.
-   Kiểm tra màn hình nhỏ, màn hình lớn, bàn phím mở, cuộn danh sách
    dài, modal, loading và empty state.
-   Tránh tràn ngang ngoài ý muốn, chồng lấn FAB/chatbot với bottom
    navigation và lỗi safe area.

## 13. Yêu cầu triển khai trên code thực tế

-   Đọc cấu trúc code, design tokens, navigation/routes, API, model dữ
    liệu và quyền người dùng trước khi sửa.
-   Tái sử dụng component hợp lý; tạo hoặc chuẩn hóa design system gồm
    màu, typography, spacing, radius, elevation, icon, button, input,
    card, chip, dialog, bottom sheet, loading và empty state.
-   Không viết lại toàn bộ ứng dụng nếu không cần thiết; không thay API,
    dữ liệu, logic nghiệp vụ hoặc quyền truy cập ngoài phạm vi.
-   Không thay dữ liệu backend bằng dữ liệu giả để làm biểu đồ đẹp hơn.
-   Mọi màn hình được thiết kế phải nối với route thật; mọi nút được làm
    phải có hành động đúng. Nếu chức năng chưa có backend, ghi rõ là
    chưa tích hợp thay vì giả lập thành công.
-   Không chỉ thay màu hoặc bo góc; phải giải quyết thứ bậc thông tin,
    luồng thao tác, mật độ nội dung, điều hướng và trạng thái.

## 14. Quy trình thực hiện bắt buộc

### Giai đoạn 1 --- Audit

1.  Đọc cấu trúc dự án và xác định framework, navigation, component dùng
    chung, dữ liệu/API và quyền.
2.  Lập Screen Inventory cho toàn bộ màn hiện có.
3.  Lập bảng điều hướng: từ màn nào, bấm nút nào, đến màn nào.
4.  Phát hiện màn thiếu, nút vô dụng, tính năng bị nhồi vào Hồ sơ, trạng
    thái chưa thiết kế và các lỗi bố cục.

### Giai đoạn 2 --- Chuẩn hóa kiến trúc và design system

1.  Đề xuất cấu trúc điều hướng gọn và hợp lý nhưng không làm mất chức
    năng.
2.  Xác định vai trò Dashboard và nhóm truy cập nhanh.
3.  Chuẩn hóa màu, typography, spacing, card, button, icon, chart, form,
    modal và trạng thái.
4.  Chốt nguyên tắc dùng ảnh/icon và xử lý dữ liệu rỗng.

### Giai đoạn 3 --- Thiết kế và triển khai toàn bộ màn

1.  Thiết kế Dashboard đầy đủ, có KPI, biểu đồ hợp lý, truy cập nhanh và
    công việc cần xử lý.
2.  Thiết kế tất cả màn nghiệp vụ và màn con theo Screen Inventory.
3.  Thiết kế mọi màn chi tiết, form thêm/sửa, bộ lọc, tìm kiếm, xác nhận
    và phản hồi sau thao tác.
4.  Thiết kế chatbot nếu có, thông báo, cài đặt, hồ sơ và các trạng thái
    phụ trợ.
5.  Hoàn thiện loading, empty, error, success, disabled và trạng thái
    quyền truy cập.
6.  Áp dụng nhất quán trên toàn bộ ứng dụng, không dừng sau một vài màn
    đầu tiên.

### Giai đoạn 4 --- Kiểm thử và nghiệm thu

1.  Đi qua từng route từ điểm vào thực tế.
2.  Bấm thử từng nút và kiểm tra đích đến/kết quả.
3.  Kiểm tra danh sách, chi tiết, thêm, sửa, hủy/xóa nếu có, lọc, tìm
    kiếm, xác nhận, quay lại và trạng thái tải.
4.  Kiểm tra không có dữ liệu, dữ liệu thật bằng 0, lỗi API và thao tác
    đang chạy.
5.  Kiểm tra thanh điều hướng, QR, chatbot, safe area, cuộn và bàn phím.
6.  Kiểm tra tính nhất quán giữa các màn, chế độ sáng/tối nếu đang hỗ
    trợ.

## 15. Tiêu chí nghiệm thu --- không được bỏ qua

Chỉ coi là hoàn thành khi: - Tất cả màn hình và màn con trong Screen
Inventory đã được xử lý, không chỉ Dashboard. - Có danh sách rõ các màn
đã hoàn thiện và màn chưa thể hoàn thiện do thiếu API/dữ liệu/quyền. -
Không có tính năng chính bị nhét hết vào Hồ sơ. - Dashboard có truy cập
nhanh thực sự hữu ích, nhưng không trở thành một trang chứa mọi chức
năng. - Mọi nút bấm quan trọng có hành động và đích đến rõ ràng; không
có nút trang trí hoặc dead-end. - Card, bảng, biểu đồ, form, modal và
bottom navigation tuân theo cùng một design system. - Nền sáng trắng là
chủ đạo; card nổi lên nhờ phân lớp tinh tế; màu cam dùng có kiểm soát. -
Không có vòng tròn Kcal, mục tiêu calo hoặc thành phần không thuộc
nghiệp vụ quản lý cửa hàng. - Không có ảnh lỗi, ảnh giả, dữ liệu giả,
biểu đồ giả hoặc khoảng trống do trạng thái chưa thiết kế. - Loading,
empty, error và success được thiết kế phù hợp. - Chatbot được thiết kế
đúng vai trò nếu tính năng tồn tại; không che nội dung hay thanh điều
hướng. - Giao diện hoạt động tốt trên kích thước điện thoại khác nhau,
không tràn, chồng lấn hoặc bị che.

## 16. Đầu ra cần bàn giao

1.  **Toàn bộ giao diện đã được triển khai trên code hiện tại**, không
    chỉ ảnh minh họa.
2.  Screen Inventory đầy đủ và bảng điều hướng giữa các màn.
3.  Design system/tokens và component dùng chung đã chuẩn hóa.
4.  Danh sách các màn đã hoàn thành, các luồng đã kiểm thử và các vấn đề
    còn tồn tại.
5.  Danh sách những điểm bị chặn do thiếu API, dữ liệu, quyền hoặc chức
    năng backend; không che giấu bằng mock data.
6.  Ảnh chụp hoặc bản xem trước của các màn tiêu biểu, đồng thời bảo đảm
    toàn bộ màn con vẫn truy cập được trong ứng dụng.

**Chỉ dẫn cuối:** Hãy làm như đang nâng cấp một sản phẩm thương mại thực
tế. Kiểm kê trước, cấu trúc lại điều hướng, xây dựng design system, sau
đó triển khai đồng bộ từng màn và kiểm thử từng luồng. Không kết thúc
công việc sau khi dựng vài màn hình đẹp. Mọi quyết định thiết kế phải
phục vụ nghiệp vụ, khả năng đọc, tốc độ thao tác và tính nhất quán của
toàn bộ ứng dụng.
