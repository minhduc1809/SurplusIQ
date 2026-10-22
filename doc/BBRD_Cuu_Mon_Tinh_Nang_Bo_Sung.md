# BBRD -- Đặc tả yêu cầu nghiệp vụ bổ sung cho Cứu Món

**Phiên bản:** 1.0 \| **Ngày:** 18/10/2026 \| **Trạng thái:** Đề xuất để
xác nhận nghiệp vụ\
**Phạm vi:** Web quản lý cửa hàng và ứng dụng Android khách hàng

## 1. Mục đích và nguyên tắc

Tài liệu mô tả nghiệp vụ cho các tính năng bổ sung của Cứu Món, dựa trên
danh sách tính năng hiện có R1-001--R1-094 (khách hàng Android) và
R2-001--R2-126 (cửa hàng Web).

Hệ thống hiện đã có tìm kiếm/lọc deal, bản đồ, đặt hàng, thanh toán, QR
nhận hàng, đánh giá/khiếu nại, hồ sơ ăn uống, trợ lý AI, cá nhân hóa,
thông báo, quản lý tồn, dự báo, giá động, túi bất ngờ, chiến dịch, phân
tích, mô phỏng giá và gợi ý quyên góp. Do đó, tài liệu phân biệt **tính
năng mới** với **phần mở rộng nghiệp vụ**; không mặc định xây lại chức
năng đang có.

Nguyên tắc: - Dữ liệu nghiệp vụ ở Backend là nguồn sự thật; AI không
được tự tạo deal, giá, tồn kho, đơn, trạng thái thanh toán hoặc xác nhận
an toàn thực phẩm. - Đăng ký nhu cầu không phải đơn hàng; không giữ tồn
và không thu tiền. - Các hành động ảnh hưởng giá, số lượng, cung ứng,
bàn giao hoặc điểm thưởng phải có quyền phù hợp và nhật ký. - Không tự
suy luận hạn dùng, thành phần hoặc dị ứng khi thiếu dữ liệu. - Các chỉ
số tác động môi trường phải ghi rõ là ước tính và công thức nguồn. -
Triển khai theo giai đoạn, kiểm chứng bằng dữ liệu thực tế.

## 2. Danh mục đề xuất và quan hệ với hệ thống hiện tại

  -----------------------------------------------------------------------
  Mã                Tính năng         Phía              Quan hệ với hiện
                                                        tại
  ----------------- ----------------- ----------------- -----------------
  CM-B01            Rescue Timeline   Chủ cửa hàng     Mở rộng tồn kho,
                    -- Theo dõi vòng                    dự báo, giá động,
                    đời/nguy cơ tồn                     bảng việc và gợi
                    dư theo lô                          ý hành động

  CM-B02            Rescue Pool       Chủ cửa hàng       Nghiệp vụ mới
                    Manager -- Quản                     
                    lý đợt gom nhu                      
                    cầu/cung ứng                        

  CM-B03            Rescue Bridge --  Chủ cửa hàng       Mở rộng gợi ý
                    Điều phối bàn                       quyên góp R2-121
                    giao thực phẩm                      thành quy trình
                                                        có trạng thái

  CM-B04            Rescue Lab --     Chủ cửa hàng       Mở rộng
                    Đánh giá chiến                      R2-104/R2-105 và
                    lược xử lý hàng                     theo dõi đề xuất
                    dư                                  R2-115

  CM-B05            TrustPass Manager Chủ cửa hàng       Mở rộng dữ liệu
                    -- Hồ sơ minh                       món, thành phần,
                    bạch lô món                         ảnh và hạn dùng

  CM-C01            Rescue Basket --  Khách Android     Nghiệp vụ mới
                    Giỏ món theo nhu                    
                    cầu                                 

  CM-C02            Rescue Pool --    Khách Android     Phần khách hàng
                    Đăng ký nhu                         của CM-B02
                    cầu/tham gia đợt                    
                    mua                                 

  CM-C03            TrustPass -- Xem  Khách Android     Phần hiển thị của
                    hồ sơ món                           CM-B05

  CM-C04            Rescue Rewards -- Khách Android     Mở rộng ví ưu
                    Điểm thưởng theo                    đãi/huy hiệu
                    giao dịch hoàn                      R1-078--R1-081
                    tất                                 

  CM-C05            Rescue Radar --   Khách Android     Mở rộng
                    Xếp hạng deal                       R1-020--R1-039,
                    theo khả năng                       không thay thế
                    nhận                                tìm kiếm/bản đồ
  -----------------------------------------------------------------------

### Ngoài phạm vi bản đầu

-   Giao hàng liên cửa hàng hoặc xây mạng lưới logistics riêng.
-   Tự thu tiền trước khi đợt Rescue Pool đủ điều kiện.
-   Tự động quyết định thực phẩm an toàn để bán/quyên góp.
-   Tích hợp POS/kế toán bên ngoài khi chưa xác định API.
-   Mô hình AI riêng khi quy tắc xác định đã đáp ứng MVP.

## 3. Vai trò và thuật ngữ

  -----------------------------------------------------------------------
  Thuật ngữ                           Định nghĩa
  ----------------------------------- -----------------------------------
  Khách hàng                          Người sử dụng app Android để tìm,
                                      đăng ký nhu cầu, đặt và nhận món

  Chủ cửa hàng                        Người quản lý cửa hàng, duyệt quyết
                                      định kinh doanh và phân quyền

  Nhân viên cửa hàng                  Người thao tác trong phạm vi quyền
                                      được cấp

  Đơn vị tiếp nhận                    Tổ chức nhận thực phẩm qua quy
                                      trình Rescue Bridge

  Món                                 Sản phẩm trong danh mục cửa hàng

  Suất                                Đơn vị bán có giá, số lượng và
                                      khung nhận

  Lô món                              Lượng món có thông tin chuẩn bị/hạn
                                      dùng/điều kiện xử lý được quản lý
                                      như một đơn vị

  Nhu cầu quan tâm                    Đăng ký chưa phải đơn hàng, không
                                      giữ tồn

  Đơn chính thức                      Đơn được tạo qua luồng đặt hàng
                                      hiện có

  Thông tin khai báo                  Dữ liệu do cửa hàng nhập/xác nhận;
                                      không đồng nghĩa xác minh độc lập

  Đã xác minh                         Chỉ dùng khi có quy trình và bằng
                                      chứng xác minh cụ thể
  -----------------------------------------------------------------------

## 4. Quy trình xuyên suốt

1.  Cửa hàng khai báo món/suất và số lượng.
2.  Hệ thống dùng dữ liệu hợp lệ để phát hiện nguy cơ tồn dư; nếu thiếu
    dữ liệu phải hiển thị cảnh báo.
3.  Cửa hàng cân nhắc tiếp tục bán, điều chỉnh giá theo quy tắc hiện có,
    tạo túi bất ngờ hoặc đề nghị bàn giao.
4.  Khách có thể đăng ký nhu cầu qua Rescue Pool; đăng ký chưa tạo đơn
    và chưa giữ tồn.
5.  Cửa hàng đưa ra đề nghị cung ứng có giá, số lượng, khung nhận và hạn
    xác nhận.
6.  Khách xác nhận mua; Backend kiểm tra lại điều kiện và chuyển qua
    luồng đặt hàng hiện tại.
7.  Ghi nhận kết quả: đã bán/đã nhận, hủy, hết hạn nhận hoặc đã bàn
    giao.
8.  Kết quả được dùng cho báo cáo và đánh giá chiến lược.

Trạng thái đề xuất: - **Rescue Pool:** Nháp → Mở đăng ký → Tổng hợp nhu
cầu → Chờ cửa hàng → Đề nghị cung ứng → Mở đặt hàng → Hoàn tất / Không
đủ điều kiện / Hủy / Hết hạn. - **Rescue Bridge:** Nháp → Đã gửi → Đã
chấp nhận/Từ chối → Chờ bàn giao → Đã bàn giao / Thất bại / Hủy. -
**TrustPass:** Nháp → Chờ xác nhận → Đang hiển thị → Tạm ẩn/Hết hiệu
lực. - **Rescue Lab:** Nháp → Đang chạy → Hoàn tất/Thất bại.

Trạng thái cuối cùng phải được kiểm tra ở Backend, không dựa riêng vào
giao diện.

------------------------------------------------------------------------

# PHẦN A --- CỬA HÀNG WEB

## 5. CM-B01 --- Rescue Timeline: Theo dõi vòng đời và nguy cơ tồn dư

### Mục tiêu

Giúp cửa hàng ưu tiên lô/suất cần xử lý dựa trên số lượng còn lại, thời
gian còn lại và tốc độ bán. Đây là lớp điều phối trên dữ liệu tồn/dự
báo/giá động hiện có, không phải hệ thống dự báo tách biệt.

### Tác nhân và tiền điều kiện

-   Tác nhân: chủ cửa hàng, nhân viên được phân quyền, tác vụ nền.
-   Cửa hàng có lô/suất đang hoạt động; có dữ liệu số lượng, giá, khung
    nhận và trạng thái.
-   Người dùng chỉ xem dữ liệu thuộc cửa hàng mình.
-   Nếu thiếu dữ liệu cần thiết, hệ thống phải ghi nhận trạng thái "chưa
    đủ dữ liệu".

### Luồng chính

1.  Hệ thống lấy tồn khả dụng, thời gian đến cuối khung nhận, lịch sử
    bán và dữ liệu liên quan.
2.  Tính mức nguy cơ theo quy tắc đã cấu hình.
3.  Hiển thị danh sách ưu tiên và lý do: số lượng còn, thời gian còn,
    tốc độ bán tham chiếu, dữ liệu thiếu/cũ.
4.  Chủ/nhân viên mở lô và xem hành động khả dụng: cập nhật tồn, xem
    giá, điều chỉnh theo quyền, tạo túi bất ngờ hoặc mở Rescue Bridge.
5.  Người dùng chọn hành động; Backend kiểm tra lại tồn, trạng thái và
    quyền.
6.  Hệ thống ghi hành động, người thực hiện, thời gian và kết quả.
7.  Cập nhật trạng thái khi lô được bán hết, hết hạn, bàn giao hoặc đóng
    theo quy tắc.

### Ngoại lệ

-   Tồn thiếu/cũ: cảnh báo, không tạo kết luận chắc chắn.
-   Suất hết/đóng: chặn hành động và tải lại trạng thái.
-   Đơn đang giữ suất: không trừ/cộng tồn lần hai.
-   Người dùng thiếu quyền: chỉ xem hoặc chuyển yêu cầu.
-   Tác vụ nền lỗi: ghi lỗi và cho phép xử lý lại; không đánh dấu hoàn
    tất.

### Quy tắc nghiệp vụ

-   **BR-B01-01:** Chỉ dùng dữ liệu trong phạm vi cửa hàng.
-   **BR-B01-02:** Không tự suy ra hạn dùng nếu chưa có dữ liệu hợp lệ.
-   **BR-B01-03:** Mức nguy cơ phải giải thích bằng yếu tố tính toán.
-   **BR-B01-04:** Đề xuất không tự sửa giá/tồn nếu chưa có quy tắc tự
    động được phê duyệt.
-   **BR-B01-05:** Dữ liệu thay đổi phải làm mới kết quả hoặc đánh dấu
    cần tính lại.
-   **BR-B01-06:** Không bán/bàn giao khi đã vượt điều kiện thời
    gian/chính sách.
-   **BR-B01-07:** Lưu lịch sử hành động và kết quả.

### Dữ liệu chính

`lot_id`, `store_id`, `item_id/slot_id`, `quantity_available`,
`pickup_end_at`, `expiry_at` (nếu có), `risk_level`, `risk_factors`,
`calculated_at`, `data_quality_status`, `recommended_actions`,
`action_taken`, `outcome`.

### Tiêu chí nghiệm thu

-   Danh sách có mức ưu tiên, lý do và thời điểm tính.
-   Thiếu dữ liệu được cảnh báo, không bị diễn giải thành dữ liệu hợp
    lệ.
-   Chặn hành động khi suất hết/đóng hoặc người dùng thiếu quyền.
-   Tồn không bị cập nhật hai lần trong tình huống đồng thời.
-   Có thể truy vết dữ liệu đầu vào, quyết định và kết quả.

### Phụ thuộc

Quản lý món/suất/tồn; dự báo; giá động; bảng việc cần làm; túi bất ngờ;
Rescue Bridge; phân quyền; nhật ký.

------------------------------------------------------------------------

## 6. CM-B02 --- Rescue Pool Manager: Quản lý đợt gom nhu cầu

### Mục tiêu

Cho cửa hàng xem nhu cầu tổng hợp trước khi quyết định cung ứng, nhằm
giảm tình trạng đăng món rồi chờ khách mà không biết nhu cầu thực tế.

### Tác nhân và tiền điều kiện

-   Tác nhân: chủ cửa hàng, nhân viên được phân quyền, khách qua CM-C02,
    hệ thống.
-   Cửa hàng được phép hoạt động; có khu vực phục vụ, nhóm món, khung
    nhận và quy tắc cung ứng.
-   Có thời hạn đăng ký và điều kiện mở đợt rõ ràng.

### Luồng chính

1.  Chủ tạo đợt hoặc nhận đề xuất nhu cầu.
2.  Hệ thống hiển thị nhu cầu tổng hợp theo nhóm món, số lượng quan tâm,
    ngân sách và khung giờ.
3.  Chủ kiểm tra khả năng cung cấp/tồn.
4.  Chủ chấp nhận, đề xuất số lượng/giá/khung nhận hoặc từ chối.
5.  Backend kiểm tra giá, số lượng, thời gian, tồn và quy tắc cửa hàng.
6.  Chủ xác nhận; hệ thống lưu phiên bản đề nghị cung ứng và hạn hiệu
    lực.
7.  Khách đủ điều kiện được thông báo và chủ động xác nhận mua.
8.  Tạo đơn qua luồng đặt hàng hiện tại.
9.  Đóng đợt theo hết hạn, hết số lượng hoặc điều kiện kết thúc.
10. Báo cáo số đăng ký, đơn tạo, đơn nhận, số lượng bán và lý do thất
    bại.

### Ngoại lệ

-   Không đủ nhu cầu: đóng "Không đủ điều kiện"; không tạo đơn/thu tiền.
-   Cửa hàng từ chối hoặc không phản hồi: thông báo khách và đóng theo
    thời hạn.
-   Tồn thay đổi: yêu cầu cập nhật nguồn cung.
-   Giá/số lượng/khung nhận thay đổi: khách phải xác nhận lại điều kiện
    trọng yếu.
-   Đợt bị hủy sau khi có đơn: xử lý đơn theo chính sách hủy/hoàn tiền
    hiện có.
-   Đăng ký trùng: cập nhật đăng ký hiện có hoặc chặn trùng.
-   Nhu cầu vượt cung: không xác nhận vượt số lượng khả dụng.

### Quy tắc nghiệp vụ

-   **BR-B02-01:** Đăng ký nhu cầu không phải đơn hàng, không giữ tồn,
    không thu tiền.
-   **BR-B02-02:** Mỗi khách có tối đa một đăng ký hiệu lực cho cùng lựa
    chọn trong một đợt, trừ khi cho phép sửa số lượng.
-   **BR-B02-03:** Đợt phải có khu vực, nhóm món, thời gian mở/đóng và
    điều kiện kết thúc.
-   **BR-B02-04:** Ngưỡng tối thiểu/tối đa và hạn xác nhận phải công bố
    trước.
-   **BR-B02-05:** Cửa hàng quyết định có cung ứng hay không.
-   **BR-B02-06:** Giá và điều kiện cuối cùng phải được khách xác nhận
    trước khi tạo đơn.
-   **BR-B02-07:** Tạo đơn qua luồng hiện tại, có giữ tồn nguyên tử và
    chống tạo trùng.
-   **BR-B02-08:** Chỉ hiển thị thông tin tổng hợp cần thiết, không lộ
    dữ liệu cá nhân.
-   **BR-B02-09:** Thay đổi/hủy phải có lý do và nhật ký.
-   **BR-B02-10:** Không thu tiền ở giai đoạn đăng ký nhu cầu.

### Dữ liệu chính

`pool_id`, `store_id`, `pool_title`, `target_category/item_id`,
`service_area`, `registration_open_at`, `registration_close_at`,
`minimum_demand`, `maximum_supply`, `target_budget_range`,
`pickup_window`, `proposed_price`, `pool_status`, `registration_count`,
`confirmed_order_count`, `cancellation_reason`, `created_by`,
`updated_by`.

### Tiêu chí nghiệm thu

-   Đăng ký không giảm tồn, không tạo đơn, không thu tiền.
-   Cửa hàng xem được nhu cầu tổng hợp.
-   Không mở đặt hàng khi thiếu giá, số lượng, khung nhận hoặc điều kiện
    bắt buộc.
-   Không tạo đơn vượt nguồn cung.
-   Khách phải xác nhận lại khi điều kiện trọng yếu thay đổi.
-   Kết quả đợt liên kết được với đơn phát sinh.

### Phụ thuộc

Tài khoản; địa điểm; danh mục món; tồn/suất; đặt hàng; thanh toán; thông
báo; phân quyền; báo cáo.

------------------------------------------------------------------------

## 7. CM-B03 --- Rescue Bridge: Điều phối bàn giao thực phẩm

### Mục tiêu

Mở rộng R2-121 từ gợi ý quyên góp thành quy trình có đơn vị tiếp nhận,
xác nhận số lượng/thời gian và ghi nhận kết quả bàn giao.

### Tác nhân và tiền điều kiện

-   Chủ/nhân viên được ủy quyền; đơn vị tiếp nhận; vận hành nền tảng.
-   Có lô/suất còn lại, dữ liệu loại món/số lượng/thời gian và điều kiện
    bảo quản do cửa hàng khai báo.
-   Đơn vị tiếp nhận có hồ sơ hợp lệ và năng lực tiếp nhận được khai
    báo.
-   Có chính sách về loại thực phẩm, thời hạn và điều kiện bàn giao.

### Luồng chính

1.  Cửa hàng chủ động tạo đề nghị hoặc nhận gợi ý khi gần cuối khung
    nhận.
2.  Cửa hàng xác nhận số lượng thực tế có thể bàn giao.
3.  Hệ thống lọc đơn vị theo loại thực phẩm, khu vực, thời gian và năng
    lực.
4.  Cửa hàng gửi đề nghị kèm số lượng, thời điểm sẵn sàng, hạn nhận và
    điều kiện liên quan.
5.  Đơn vị tiếp nhận chấp nhận, từ chối hoặc đề xuất thay đổi.
6.  Hai bên thống nhất thời gian và người chịu trách nhiệm.
7.  Khi bàn giao, hai bên xác nhận số lượng thực tế và bằng chứng theo
    chính sách.
8.  Đóng đề nghị là đã bàn giao toàn bộ/một phần, thất bại hoặc hủy.
9.  Cập nhật báo cáo lượng bàn giao; không tính trùng với lượng đã bán.

### Ngoại lệ

-   Không có đơn vị phù hợp: thông báo rõ, không tự gán nơi nhận.
-   Đơn vị từ chối/không đến: ghi nhận trạng thái và lý do.
-   Lô hết hạn/không đủ điều kiện: chặn bàn giao.
-   Số lượng thực giao khác dự kiến: lưu số thực tế và chênh lệch.
-   Tranh chấp: chuyển xử lý, không tự kết luận bên đúng.
-   Thiếu bằng chứng bắt buộc: không hoàn tất nếu chính sách yêu cầu.

### Quy tắc nghiệp vụ

-   **BR-B03-01:** Cửa hàng quyết định có bàn giao; hệ thống chỉ điều
    phối.
-   **BR-B03-02:** Chỉ đơn vị tiếp nhận hợp lệ mới được chọn.
-   **BR-B03-03:** Ghép nối xét loại, số lượng, thời gian, khu vực và
    năng lực.
-   **BR-B03-04:** Hệ thống không tự xác nhận món an toàn.
-   **BR-B03-05:** Số lượng bàn giao không vượt lượng còn khả dụng.
-   **BR-B03-06:** Hoàn tất ghi người xác nhận, thời điểm và bằng chứng
    nếu bắt buộc.
-   **BR-B03-07:** Không tính cùng lượng là vừa bán vừa bàn giao.
-   **BR-B03-08:** Lưu nhật ký thay đổi, hủy và thất bại.
-   **BR-B03-09:** Chỉ chia sẻ thông tin liên hệ cần thiết.
-   **BR-B03-10:** Trách nhiệm vận chuyển/chi phí phải được xác định
    trước khi mở rộng.

### Dữ liệu chính

`transfer_id`, `store_id`, `recipient_org_id`, `batch_id/slot_id`,
`food_category`, `quantity_proposed`, `quantity_accepted`,
`quantity_handed_over`, `available_at`, `handover_deadline`,
`storage_notes`, `transfer_status`, `sender_confirmed_by`,
`recipient_confirmed_by`, `evidence_reference`, `failure_reason`.

### Tiêu chí nghiệm thu

-   Chỉ đơn vị hợp lệ được chọn.
-   Theo dõi được từ gửi đề nghị đến kết quả.
-   Số lượng thực tế không bị trừ tồn hai lần.
-   Không hoàn tất khi điều kiện bắt buộc chưa đạt.
-   Báo cáo phân biệt đề nghị, chấp nhận và thực tế bàn giao.

### Phụ thuộc

R2-121; tồn; TrustPass; hồ sơ đơn vị tiếp nhận; thông báo; nhật ký; báo
cáo và hỗ trợ tranh chấp.

------------------------------------------------------------------------

## 8. CM-B04 --- Rescue Lab: Đánh giá chiến lược xử lý hàng dư

### Mục tiêu

Mở rộng mô phỏng giá R2-104/R2-105 và theo dõi đề xuất R2-115 thành quy
trình có phiên bản kịch bản, giả định, dữ liệu nguồn và kết quả quan sát
thực tế.

### Luồng chính

1.  Người dùng chọn mục tiêu: giảm tồn dư, tăng doanh thu thu hồi, tăng
    tỷ lệ bán hoặc so sánh chiến lược.
2.  Chọn khoảng thời gian, nhóm món, kịch bản và giả định.
3.  Hệ thống kiểm tra dữ liệu đầu vào, cảnh báo dữ liệu thiếu.
4.  Người dùng chạy và lưu kịch bản.
5.  Lõi tính toán xác định tạo kết quả; AI không tự tạo số liệu.
6.  Hệ thống lưu phiên bản cấu hình, dữ liệu nguồn, thời điểm và kết
    quả.
7.  Người dùng so sánh kịch bản theo cùng tiêu chí.
8.  Nếu áp dụng thật, người có quyền ghi nhận thời gian/phạm vi.
9.  Hệ thống theo dõi chỉ số thực tế trong cửa sổ đã chọn.
10. Báo cáo chênh lệch giữa mô phỏng và quan sát, kèm giới hạn diễn
    giải.

### Ngoại lệ

-   Dữ liệu thiếu: không chạy hoặc chạy chế độ hạn chế với cảnh báo.
-   Lỗi tính toán: trạng thái thất bại, không lưu kết quả dở dang như
    hoàn tất.
-   Kịch bản thay đổi: tạo phiên bản mới, không ghi đè lịch sử.
-   Kịch bản không được áp dụng: chỉ là mô phỏng, không hiển thị như kết
    quả thực.
-   Nhiều yếu tố cùng thay đổi: không khẳng định một yếu tố là nguyên
    nhân duy nhất.
-   Thiếu quyền: chặn truy cập dữ liệu ngoài phạm vi.

### Quy tắc nghiệp vụ

-   **BR-B04-01:** Mỗi lần chạy lưu phiên bản, nguồn dữ liệu, khoảng
    thời gian và thời điểm.
-   **BR-B04-02:** Chỉ so sánh trực tiếp kịch bản có cơ sở dữ liệu/tiêu
    chí tương thích.
-   **BR-B04-03:** Phân biệt rõ số liệu mô phỏng và số liệu thực tế.
-   **BR-B04-04:** Không tự áp dụng thay đổi giá/tồn từ kết quả.
-   **BR-B04-05:** Hành động thực tế cần người có quyền xác nhận.
-   **BR-B04-06:** Không kết luận quan hệ nhân quả khi thiết kế đánh giá
    không đủ căn cứ.
-   **BR-B04-07:** Không lộ dữ liệu của cửa hàng khác.
-   **BR-B04-08:** Chỉ số phải có định nghĩa/công thức/nguồn thống nhất.
-   **BR-B04-09:** Tác vụ dài có trạng thái tiến trình và xử lý lỗi.

### Dữ liệu chính

`experiment_id`, `store_id`, `scenario_id/version`, `objective`,
`date_range`, `item_scope`, `assumptions`, `input_snapshot_ref`,
`simulation_status`, `simulated_metrics`, `applied_at/by`,
`observation_window`, `actual_metrics`, `comparison_result`,
`limitation_notes`.

### Tiêu chí nghiệm thu

-   Có thể truy lại kịch bản và dữ liệu nguồn.
-   Không nhầm số liệu mô phỏng với số liệu thật.
-   Sửa kịch bản không thay đổi kết quả phiên bản cũ.
-   Không tự thay đổi giá/tồn.
-   Báo cáo thể hiện giả định, dữ liệu thiếu và giới hạn.

### Phụ thuộc

R2-104/R2-105/R2-112--R2-116; báo cáo; dữ liệu chất lượng; phân quyền và
nhật ký.

------------------------------------------------------------------------

## 9. CM-B05 --- TrustPass Manager: Hồ sơ minh bạch lô món

### Mục tiêu

Chuẩn hóa dữ liệu khách cần trước khi mua, nêu rõ nguồn khai báo và lịch
sử cập nhật. TrustPass không phải chứng nhận an toàn thực phẩm.

### Luồng chính

1.  Chủ/nhân viên có quyền mở món/lô và cập nhật hồ sơ.
2.  Hệ thống tái sử dụng trường hiện có: thành phần, dị ứng, thời gian
    chuẩn bị, hạn dùng/khung nhận, hướng dẫn bảo quản, ảnh và ghi chú.
3.  Người dùng xác nhận nguồn dữ liệu và các trường bắt buộc.
4.  Hệ thống kiểm tra định dạng và mâu thuẫn có thể phát hiện.
5.  Người dùng lưu nháp hoặc công bố.
6.  Khách xem hồ sơ trên chi tiết món; trường thiếu phải ghi "Chưa được
    cung cấp".
7.  Khi trường trọng yếu đổi, lưu phiên bản và thời điểm.
8.  Khi món hết/đóng, hồ sơ không được hiển thị như đang bán.
9.  Nếu bị báo cáo sai lệch, chuyển trạng thái cần rà soát theo quy
    trình.

### Ngoại lệ

-   Thiếu thành phần/dị ứng: không tự suy đoán.
-   AI trích hạn dùng: chỉ điền đề xuất; chủ xác nhận trước khi lưu
    chính thức (liên quan R2-120).
-   Thông tin mâu thuẫn: cảnh báo/chặn công bố theo mức độ.
-   Ảnh không hợp lệ: dùng quy tắc kiểm tra ảnh hiện có.
-   Cập nhật sau khi khách đặt: lưu lịch sử và áp dụng chính sách thông
    báo đã duyệt.
-   Báo cáo vi phạm: chuyển rà soát, không tự kết luận.

### Quy tắc nghiệp vụ

-   **BR-B05-01:** Nguồn mặc định là cửa hàng, trừ khi có quy trình xác
    minh khác.
-   **BR-B05-02:** Không dùng "đã xác minh" khi chưa có quy trình/bằng
    chứng.
-   **BR-B05-03:** Không tự sinh thành phần, dị ứng, hạn dùng hoặc hướng
    dẫn bảo quản như dữ kiện chắc chắn.
-   **BR-B05-04:** Trường trống không đồng nghĩa "không có".
-   **BR-B05-05:** Hạn dùng khác khung nhận; không thay thế nhau.
-   **BR-B05-06:** Lưu người cập nhật, thời điểm, giá trị cũ/mới và
    nguồn nếu có.
-   **BR-B05-07:** Hồ sơ tuân theo trạng thái món/lô.
-   **BR-B05-08:** Không công khai dữ liệu nội bộ hoặc cá nhân.
-   **BR-B05-09:** Không tuyên bố an toàn tuyệt đối.
-   **BR-B05-10:** Thay đổi trọng yếu sau đặt hàng phải theo chính sách
    xử lý đã duyệt.

### Dữ liệu chính

`trustpass_id`, `item_id/batch_id/slot_id`, `declared_ingredients`,
`declared_allergens`, `prepared_at`, `expiry_at`, `pickup_window`,
`storage_instructions`, `information_source`, `verification_status`,
`version_no`, `published_at`, `updated_by/at`, `review_status`.

### Tiêu chí nghiệm thu

-   Phân biệt được thông tin khai báo, chưa có và đã xác minh.
-   Không biến dữ liệu thiếu thành "không có".
-   Chỉ người có quyền sửa hồ sơ.
-   Lưu lịch sử trường trọng yếu.
-   Hồ sơ món hết/đóng không hiển thị như đang hoạt động.
-   Kết quả AI chưa xác nhận không được công bố chính thức.

### Phụ thuộc

R2-119/R2-120; danh mục món/suất; R1-026; R1-016/R1-087; nhật ký và báo
cáo vi phạm.

------------------------------------------------------------------------

# PHẦN B --- KHÁCH HÀNG ANDROID

## 10. CM-C01 --- Rescue Basket: Giỏ món theo nhu cầu

### Mục tiêu

Đề xuất tổ hợp món phù hợp ngân sách, số người, thời gian nhận, khu vực
và sở thích. Chỉ sử dụng suất có thật, không tạo món giả.

### Luồng chính

1.  Khách chọn tạo giỏ theo nhu cầu.
2.  Nhập ngân sách, số người, khung nhận, khu vực và sở thích.
3.  Hệ thống loại suất đóng/hết/không đủ số lượng hoặc không đáp ứng
    điều kiện cứng.
4.  Tạo các phương án giỏ từ dữ liệu suất thực.
5.  Xếp hạng theo mức phù hợp, tổng giá, khoảng cách, khả năng nhận kịp
    và đa dạng.
6.  Hiển thị tổng giá, số suất, cửa hàng, khung nhận và lý do gợi ý.
7.  Khách thay/bỏ món hoặc đổi tiêu chí; hệ thống tính lại.
8.  Khi khách chọn đặt, Backend kiểm tra lại tồn/giá.
9.  Nếu còn hợp lệ, chuyển qua luồng đặt hàng hiện tại; nếu không, báo
    và đề xuất lựa chọn thay thế nhưng không tự đổi món.

### Ngoại lệ

-   Không có giỏ: gợi ý nới điều kiện, không tạo deal giả.
-   Tổng vượt ngân sách: không gắn nhãn phù hợp ngân sách.
-   Thiếu dữ liệu dị ứng: cảnh báo chưa xác định, không khẳng định an
    toàn.
-   Món hết khi đặt: yêu cầu khách xác nhận thay đổi.
-   Nhiều cửa hàng/khung nhận xung đột: MVP ưu tiên một cửa hàng/điểm
    nhận.
-   Giá thay đổi: dùng giá server mới nhất trước khi xác nhận.

### Quy tắc nghiệp vụ

-   **BR-C01-01:** Chỉ dùng suất mở và khả dụng.
-   **BR-C01-02:** Giỏ gợi ý không giữ tồn, không tạo đơn, không thu
    tiền.
-   **BR-C01-03:** Tổng giá tính từ giá/ưu đãi hiện hành.
-   **BR-C01-04:** Thay món/số lượng phải tính lại giá và điều kiện
    nhận.
-   **BR-C01-05:** Không tự thay món hoặc đặt thay khách.
-   **BR-C01-06:** MVP ưu tiên một cửa hàng/điểm nhận.
-   **BR-C01-07:** Thiếu thông tin dị ứng không đồng nghĩa không có chất
    gây dị ứng.
-   **BR-C01-08:** Lý do xếp hạng phải có căn cứ.
-   **BR-C01-09:** Luồng đặt hàng hiện tại chịu trách nhiệm giữ
    tồn/thanh toán/hủy/hoàn tiền/QR.
-   **BR-C01-10:** Không có kết quả phải trả thông báo rõ.

### Dữ liệu chính

`basket_request_id`, `customer_id`, `budget_max`, `people_count`,
`preferred_pickup_window`, `location/saved_place_id`,
`dietary_preferences`, `allergen_profile_ref`, `basket_items`,
`estimated_total`, `ranking_reasons`, `generated_at`,
`availability_checked_at`.

### Tiêu chí nghiệm thu

-   Không có món giả/hết hàng trong kết quả ở thời điểm truy vấn.
-   Tổng giá khớp các suất trong giỏ.
-   Không giữ tồn trước khi đặt.
-   Món hết phải yêu cầu khách xác nhận thay thế.
-   Xử lý dị ứng thận trọng.
-   Thay đổi tiêu chí cập nhật kết quả.

### Phụ thuộc

R1-020--R1-026; R1-016; R1-082--R1-087; tồn, ưu đãi, đặt hàng, địa điểm.

------------------------------------------------------------------------

## 11. CM-C02 --- Rescue Pool: Đăng ký nhu cầu/tham gia đợt mua

### Mục tiêu

Cho khách đăng ký nhu cầu ở một khu vực trước khi cửa hàng quyết định
cung ứng; phân biệt rõ đăng ký nhu cầu và đơn hàng.

### Luồng chính

1.  Khách mở danh sách đợt phù hợp.
2.  Xem nhóm món, khu vực, thời hạn, ngưỡng mở đợt, số lượng dự kiến và
    khung nhận.
3.  Chọn món/nhóm món, số lượng quan tâm, ngân sách và khung nhận.
4.  Gửi đăng ký; hệ thống xác nhận nhưng không tạo đơn, giữ tồn hay thu
    tiền.
5.  Khách theo dõi trạng thái, sửa/rút nhu cầu trong thời hạn được phép.
6.  Khi cửa hàng công bố đề nghị cung ứng, app hiển thị giá, số lượng,
    khung nhận và hạn xác nhận.
7.  Khách chủ động xác nhận mua; Backend kiểm tra lại đề nghị và tạo đơn
    theo luồng hiện tại.
8.  App thông báo khi đợt đủ điều kiện, hết hạn, bị từ chối hoặc hủy.

### Ngoại lệ

-   Đợt đóng: chặn đăng ký.
-   Vượt số lượng: báo giới hạn.
-   Đã có đơn chính thức: rút nhu cầu không thay thế thao tác hủy đơn.
-   Đề nghị hết hạn: không cho đặt từ đề nghị cũ.
-   Điều kiện thay đổi: yêu cầu xem/xác nhận lại.
-   Thông báo lỗi: trạng thái vẫn đúng trong app.
-   Khách không đủ điều kiện ưu đãi: không hiển thị giá ưu đãi không áp
    dụng.

### Quy tắc nghiệp vụ

-   **BR-C02-01:** Đăng ký nhu cầu không phải giao dịch.
-   **BR-C02-02:** Giá/số lượng trước đề nghị cung ứng là dự kiến nếu
    được hiển thị.
-   **BR-C02-03:** Tách rõ "Đã đăng ký nhu cầu" và "Đã đặt hàng".
-   **BR-C02-04:** Công bố ngưỡng và thời hạn trước đăng ký.
-   **BR-C02-05:** Không tự chuyển đăng ký thành đơn/thanh toán.
-   **BR-C02-06:** Kiểm tra lại điều kiện ở server trước khi tạo đơn.
-   **BR-C02-07:** Chặn đăng ký trùng cho cùng lựa chọn.
-   **BR-C02-08:** Không công khai danh sách người tham gia.
-   **BR-C02-09:** Thông báo phải phân biệt đề nghị, cung ứng và đơn
    chính thức.
-   **BR-C02-10:** Đơn hiện hữu xử lý theo luồng hủy/hoàn tiền hiện tại.

### Dữ liệu chính

`pool_id`, `customer_registration_id`, `customer_id`,
`selected_category/item`, `requested_quantity`, `budget_range`,
`preferred_pickup_window`, `registration_status`, `registered_at`,
`offer_version`, `offer_expiry_at`, `linked_order_id`, `withdrawn_at`.

### Tiêu chí nghiệm thu

-   Đăng ký không giảm tồn/không tạo đơn/không thu tiền.
-   Khách xem được điều kiện trước đăng ký.
-   Đề nghị hết hạn không tạo đơn được.
-   Thay đổi điều kiện trọng yếu cần xác nhận lại.
-   Đơn liên kết với đợt nguồn.

### Phụ thuộc

CM-B02; thông báo R1-073/R1-075; địa điểm; đơn hàng/thanh toán và chính
sách hủy.

------------------------------------------------------------------------

## 12. CM-C03 --- TrustPass: Xem hồ sơ minh bạch món

### Mục tiêu

Cho khách xem dữ liệu do cửa hàng khai báo, dữ liệu chưa có và dữ liệu
đã xác minh theo quy trình. Không tuyên bố an toàn tuyệt đối.

### Luồng chính

1.  Khách mở chi tiết món và TrustPass.
2.  Xem thành phần, dị ứng khai báo, hạn dùng nếu có, khung nhận, hướng
    dẫn bảo quản và nguồn thông tin.
3.  Trường thiếu hiển thị "Chưa được cung cấp".
4.  Khách có thể mở hỗ trợ hoặc báo cáo theo chức năng hiện có.
5.  Hiển thị thời điểm cập nhật mới nhất.
6.  Nếu món hết/đóng hoặc hồ sơ bị ẩn, không trình bày như món đang bán.

### Quy tắc nghiệp vụ

-   **BR-C03-01:** Chỉ hiển thị dữ liệu được phép công khai.
-   **BR-C03-02:** Trường trống không đồng nghĩa không có thành phần/dị
    ứng.
-   **BR-C03-03:** Phân biệt cửa hàng khai báo và xác minh độc lập.
-   **BR-C03-04:** Không khẳng định món an toàn tuyệt đối/phù hợp mọi
    người.
-   **BR-C03-05:** Hồ sơ nhất quán với chi tiết và trạng thái suất.
-   **BR-C03-06:** Hiển thị thời điểm cập nhật khi dữ liệu ảnh hưởng
    quyết định mua.
-   **BR-C03-07:** Hồ sơ dị ứng chỉ làm nổi bật dữ liệu liên quan, không
    thay thế kiểm tra thực tế.
-   **BR-C03-08:** Cho phép báo cáo thông tin có khả năng gây hiểu nhầm.

### Dữ liệu và nghiệm thu

Dữ liệu hiển thị: mã món/lô, thành phần, dị ứng, hạn dùng/khung nhận,
hướng dẫn bảo quản, nguồn, trạng thái xác minh, thời điểm cập nhật,
trạng thái hồ sơ.\
Nghiệm thu: phân biệt rõ thiếu dữ liệu với "không có"; không hiện nhãn
xác minh sai; thông tin khớp trạng thái món; có đường dẫn hỗ trợ/báo
cáo.

### Phụ thuộc

CM-B05; R1-026; R1-016/R1-087; R1-069/R1-070.

------------------------------------------------------------------------

## 13. CM-C04 --- Rescue Rewards: Điểm thưởng theo giao dịch hoàn tất

### Mục tiêu

Khuyến khích khách quay lại bằng điểm thưởng gắn với giao dịch đủ điều
kiện. Đây là phần mở rộng ví ưu đãi/huy hiệu hiện có, không tạo tiền tệ
độc lập nếu có thể mở rộng hệ thống hiện tại.

### Luồng chính

1.  Khách xem điều kiện nhận và đổi điểm.
2.  Khách đặt và nhận món.
3.  Hệ thống kiểm tra trạng thái đơn và quy tắc chương trình.
4.  Tạo bút toán cộng điểm với mã nguồn duy nhất.
5.  Khách xem số dư/lịch sử.
6.  Khách đổi điểm lấy ưu đãi; hệ thống kiểm tra số dư, hạn dùng, điều
    kiện và giới hạn.
7.  Trừ điểm nguyên tử và cấp ưu đãi.
8.  Nếu đơn bị hoàn tiền/hủy theo trường hợp cần hoàn tác, tạo bút toán
    điều chỉnh và ghi lý do.
9.  Giao dịch nghi ngờ bị lạm dụng có thể được đưa vào rà soát theo
    chính sách.

### Ngoại lệ

-   Đơn chưa nhận: chưa cộng nếu chương trình yêu cầu nhận thành công.
-   Đơn hoàn tiền sau khi cộng điểm: hoàn tác theo điều khoản; không xóa
    lịch sử.
-   Đổi điểm đồng thời: không để số dư âm.
-   Ưu đãi hết hạn/hết lượt: không trừ điểm.
-   Chương trình tạm dừng: xử lý điểm hiện hữu theo điều khoản đã công
    bố.
-   Nghi ngờ gian lận: ghi trạng thái rà soát, không tự kết luận.
-   Xóa tài khoản: xử lý điểm theo điều khoản chương trình/chính sách dữ
    liệu.

### Quy tắc nghiệp vụ

-   **BR-C04-01:** Cộng điểm theo sự kiện hợp lệ, không chỉ khi tạo đơn.
-   **BR-C04-02:** Mỗi đơn nguồn chỉ cộng một lần; xử lý lặp phải
    idempotent.
-   **BR-C04-03:** Công bố quy đổi, hạn dùng, giới hạn và hoàn tác.
-   **BR-C04-04:** Số dư không âm; đổi điểm phải cập nhật nguyên tử.
-   **BR-C04-05:** Không xóa bút toán; điều chỉnh bằng bút toán đối ứng.
-   **BR-C04-06:** Đơn hủy/hoàn tiền không nhận điểm nếu chính sách
    không cho phép.
-   **BR-C04-07:** Điểm không thay thế hoàn tiền của đơn.
-   **BR-C04-08:** Chương trình có hiệu lực, điều kiện và giới hạn.
-   **BR-C04-09:** Huy hiệu/tác động tách khỏi số dư điểm; tác động ước
    tính có công thức.
-   **BR-C04-10:** Ghi nhật ký cộng/trừ/đổi/điều chỉnh.

### Dữ liệu chính

`reward_account_id`, `customer_id`, `points_balance`, `ledger_entry_id`,
`source_order_id`, `entry_type`, `points_delta`, `rule_version`,
`created_at`, `expiry_at`, `redemption_id`, `reversal_of_entry_id`,
`reason`.

### Tiêu chí nghiệm thu

-   Không cộng điểm trùng cho cùng đơn.
-   Số dư không âm khi đổi đồng thời.
-   Lịch sử có nguồn/lý do.
-   Đơn hoàn tiền được xử lý đúng chính sách.
-   Khách thấy điều kiện trước khi đổi.
-   Điểm không làm sai lệch thanh toán/hoàn tiền.

### Phụ thuộc

R1-078--R1-081; R1-043/R1-047/R1-077; R2-088--R2-094; thông báo và nhật
ký.

------------------------------------------------------------------------

## 14. CM-C05 --- Rescue Radar: Xếp hạng deal theo khả năng nhận

### Mục tiêu

Mở rộng danh sách/bản đồ hiện có để ưu tiên deal khách có khả năng nhận
kịp, phù hợp địa điểm/ngân sách và còn khả dụng, thay vì chỉ sắp theo
khoảng cách hoặc giảm giá.

### Luồng chính

1.  Khách mở danh sách/bản đồ và chọn GPS, địa điểm đã lưu hoặc nhập
    tay.
2.  Hệ thống truy vấn suất đang mở.
3.  Áp dụng điều kiện cứng: trạng thái, khung nhận, ngân sách và các bộ
    lọc ăn uống.
4.  Xếp hạng phần còn lại theo khoảng cách, thời gian còn lại, mức phù
    hợp và dữ liệu khả dụng.
5.  Hiển thị lý do gợi ý có căn cứ.
6.  Khách đổi địa điểm/khung giờ/bộ lọc và hệ thống cập nhật.
7.  Khi mở chi tiết/đặt, Backend kiểm tra lại tồn và trạng thái.
8.  Nếu suất hết hoặc không còn phù hợp, báo trạng thái mới.

### Ngoại lệ

-   Không cấp GPS: dùng địa điểm nhập tay.
-   Không có nguồn thời gian di chuyển: không khẳng định "đến kịp".
-   Suất hết sau khi tải danh sách: làm mới ở chi tiết/đặt.
-   Thiếu dữ liệu thành phần: hiển thị cảnh báo.
-   Không có kết quả: gợi ý nới điều kiện nhưng không tự thay đổi điều
    kiện cứng.
-   Vị trí sai: cho phép chọn lại địa điểm.

### Quy tắc nghiệp vụ

-   **BR-C05-01:** Chỉ truy vấn deal thật đang mở; AI không tạo deal.
-   **BR-C05-02:** Áp dụng điều kiện cứng trước khi xếp hạng.
-   **BR-C05-03:** Lý do xếp hạng phải có căn cứ.
-   **BR-C05-04:** Không khẳng định thời gian đến nếu thiếu nguồn hợp
    lệ.
-   **BR-C05-05:** Dùng vị trí theo quyền/lựa chọn của khách; hỗ trợ
    nhập tay.
-   **BR-C05-06:** Không ưu tiên suất hết/hết hạn/không đủ số lượng.
-   **BR-C05-07:** Xếp hạng không thay thế kiểm tra tồn khi đặt.
-   **BR-C05-08:** Cá nhân hóa tuân theo đồng ý R1-017.
-   **BR-C05-09:** Không tiết lộ vị trí chính xác của khách cho cửa
    hàng.
-   **BR-C05-10:** Đo mở chi tiết, bắt đầu đặt, nhận thành công và bỏ lỡ
    khung nhận.

### Dữ liệu chính

`location_source`, `search_radius`, `time_window`, `budget_limit`,
`dietary_filter`, `candidate_slot_id`, `availability_snapshot_at`,
`ranking_score`, `ranking_reasons`, `travel_time_source`,
`recommendation_position`.

### Tiêu chí nghiệm thu

-   Kết quả chỉ có deal thật đang mở.
-   Nhập tay được khi không cấp GPS.
-   Lý do gợi ý không bịa đặt.
-   Không khẳng định đến kịp nếu thiếu dữ liệu.
-   Tắt cá nhân hóa được theo thiết lập hiện tại.
-   Không cho đặt theo dữ liệu tồn cũ.

### Phụ thuộc

R1-009/R1-015/R1-017/R1-020--R1-039/R1-084--R1-085; dữ liệu suất/tồn;
bản đồ nếu tích hợp.

------------------------------------------------------------------------

# PHẦN C --- QUY TẮC XUYÊN SUỐT

## 15. Trạng thái, tồn và giao dịch

1.  Backend là nơi xác nhận trạng thái; không tin trạng thái do client
    tự gửi.
2.  Tạo đăng ký Pool, xác nhận đề nghị, tạo đơn, cộng điểm và bàn giao
    phải chống xử lý trùng.
3.  Tạo đơn chính thức dùng cơ chế giữ tồn nguyên tử hiện có.
4.  Thay đổi giá/số lượng/khung nhận phải được hiển thị trước xác nhận.
5.  Thanh toán/hoàn tiền tiếp tục dùng luồng hiện tại.
6.  Tác vụ lỗi phải có thể đối soát và phục hồi, không tự đánh dấu thành
    công.

## 16. Riêng tư và phân quyền

-   Khách chỉ truy cập hồ sơ/đơn của chính mình.
-   Cửa hàng chỉ truy cập dữ liệu thuộc cửa hàng mình.
-   Nhân viên thao tác theo nhóm quyền hiện có; không mặc nhiên có quyền
    cấu hình nhạy cảm.
-   Thông tin Pool phải giảm thiểu dữ liệu nhận dạng.
-   Thay đổi giá, cung ứng, bàn giao, điểm và TrustPass phải có nhật ký
    phù hợp.
-   Thời hạn lưu dữ liệu, quyền xóa/xuất và nghĩa vụ đối soát cần theo
    chính sách hiện hành.

## 17. AI và tính giải thích

-   AI không tự tạo giá, tồn, đơn, thanh toán, số liệu tác động hoặc
    trạng thái xác minh.
-   AI chỉ diễn đạt/đề xuất từ dữ liệu và quyền hợp lệ.
-   Thiếu dữ liệu phải trả lời rõ là chưa có.
-   Hành động ảnh hưởng giao dịch cần người có quyền xác nhận, trừ khi
    có quy tắc tự động được phê duyệt.
-   Không dùng AI để khẳng định an toàn hoặc không có chất gây dị ứng.

## 18. Thông báo

Các sự kiện có thể thông báo: Pool sắp đóng, cửa hàng phản hồi, đề nghị
cung ứng sắp hết hạn, đợt bị hủy, bàn giao thay đổi/thất bại, điểm được
cộng/đổi/điều chỉnh/sắp hết hạn, TrustPass thay đổi trọng yếu và lô có
nguy cơ tồn dư. Thông báo phải liên kết đúng đối tượng, tránh gửi lặp;
lỗi gửi không làm sai trạng thái nghiệp vụ.

## 19. Yêu cầu phi chức năng

-   Danh sách phải hỗ trợ phân trang/lọc khi dữ liệu tăng.
-   Mô phỏng và tổng hợp lớn chạy nền, không chặn đặt hàng.
-   Giao diện có trạng thái tải/rỗng/lỗi/thử lại.
-   Kiểm tra quyền ở Backend cho mọi tài nguyên.
-   Giới hạn tốc độ thao tác có nguy cơ lạm dụng như đăng ký Pool và đổi
    điểm.
-   Ảnh/bằng chứng được kiểm tra loại, kích thước và quyền truy cập.
-   Lưu người thực hiện, thời gian, đối tượng, hành động và kết quả;
    không ghi bí mật vào nhật ký.
-   Hiển thị điều kiện, giá, khung nhận, hạn xác nhận và chính sách
    trước khi người dùng xác nhận.

