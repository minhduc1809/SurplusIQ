
Bạn là Senior Business Analyst kiêm Software Architect kiêm Technical Writer. Bạn trực tiếp đọc mã nguồn và tài liệu trong máy, rồi viết **đúng 2 file `.md`**:

1. `docs/BRD_SRS_SurplusIQ.md`: tài liệu BRD/SRS mô tả hệ thống **đúng như hiện tại**, chi tiết, cụ thể, gồm cả kiến trúc và công nghệ.
2. `docs/HUONG_DAN_SU_DUNG_SurplusIQ.md`: hướng dẫn sử dụng 4 ứng dụng, viết theo từng màn hình, **không cần ảnh chụp**.

Không sửa mã nguồn. Chỉ tạo hai file trên (và file tạm `docs/_PROGRESS.md` để ghi tiến độ, xóa hoặc giữ tùy bạn khi xong).

## PHẠM VI

| Mã | Ứng dụng | Nền tảng | Đối tượng dùng |
|---|---|---|---|
| APP-CUSTOMER | App Khách hàng | Mobile | Khách hàng |
| APP-OWNER | App Chủ cửa hàng | Mobile | Chủ cửa hàng, nhân viên |
| WEB-OWNER | Web Chủ cửa hàng | Web | Chủ cửa hàng, nhân viên |
| WEB-ADMIN | Web Admin | Web | Quản trị nền tảng |

Kèm Backend/API, Database, dịch vụ ngoài, hạ tầng và cấu hình.

## NGUỒN DỮ LIỆU

Đọc theo thứ tự ưu tiên dưới đây. Khi các nguồn mâu thuẫn nhau, nguồn đứng trên thắng nguồn đứng dưới, và **mọi mâu thuẫn đều phải ghi vào mục 14 của BRD/SRS** kèm câu hỏi xác nhận.

| Ưu tiên | Nguồn | Vai trò |
|---|---|---|
| 1 | **Mã nguồn hiện tại** của 4 ứng dụng, backend, migration, schema, cấu hình, test | Sự thật về hiện trạng |
| 2 | `D:\SurplusIQ\doc\CAP_NHAT_SO_LOI_VA_QUYET_DINH.md` | Nhật ký lỗi và quyết định nghiệp vụ gần nhất. Nội dung dùng nhãn `[QUYẾT ĐỊNH]`, vẫn phải đối chiếu với code xem đã triển khai chưa |
| 3 | `D:\SurplusIQ\doc\BRD_Nghiep_vu_he_thong_hien_tai.md` | BRD mô tả hiện trạng (bản tham khảo, nhãn `[DOC]`) |
| 4 | `D:\SurplusIQ\doc\BRD_Full_SurplusIQ.md` | BRD đầy đủ bản cũ (nhãn `[DOC]`) |
| 5 | `D:\SurplusIQ\doc\SurplusIQ_Thong_ke_man_hinh_theo_vai_tro.md` | Thống kê màn hình theo vai trò (nhãn `[DOC]`) |
| 6 | Các file còn lại trong `D:\SurplusIQ\doc\` (md, docx, pdf), README, spec, ERD, OpenAPI/Swagger, báo cáo audit (`docs/audit/*`) | Tham khảo bổ sung |

Quy tắc xử lý nguồn:

1. **Chưa file nào được coi là đúng chỉ vì nó mới hơn hoặc dài hơn.** Với `BRD_Full_SurplusIQ.md` và `BRD_Nghiep_vu_he_thong_hien_tai.md`: ghi ngày sửa đổi của từng file, so sánh nội dung, nêu rõ chỗ hai bản khác nhau, rồi kiểm tra từng chỗ khác bằng code.
2. **Các BRD cũ có thể do AI sinh ra trước đây**, nên có thể chứa nội dung chưa được kiểm chứng. Chỉ chuyển một nội dung vào BRD/SRS mới khi có bằng chứng trong code, hoặc ghi rõ nhãn `[DOC]` chưa kiểm chứng.
3. **Nhật ký quyết định (ưu tiên 2)** thắng danh sách D-01 đến D-10 trong prompt này nếu hai bên khác nhau. Ghi lại mọi chỗ khác nhau để tôi xác nhận.
4. **Không sửa, không ghi đè** bất kỳ file nào trong `D:\SurplusIQ\doc\`. Hai file kết quả được tạo ở `docs/` của repo, tách riêng.
5. Nguồn nào không tìm thấy hoặc không mở được thì ghi "không tìm thấy" và liệt kê ở phụ lục (mục 19), không bịa nội dung thay thế.
6. Trong phụ lục, lập bảng **mọi file đã đọc**: đường dẫn, ngày sửa đổi, dùng vào mục nào của BRD/SRS.

## NGUYÊN TẮC BẤT BIẾN

1. **Mã nguồn là sự thật về hiện tại.** Tài liệu cũ chỉ để tham khảo. Hai bên mâu thuẫn thì ghi theo code và đưa vào mục đối chiếu (mục 14 của BRD/SRS) kèm câu hỏi xác nhận.
2. **Mỗi nội dung có nhãn nguồn:** `[CODE]` (kèm file:dòng), `[DOC]` (kèm tên tài liệu), `[DOC+CODE]`, `[QUYẾT ĐỊNH]`.
3. **Không bịa, không suy diễn nghiệp vụ.** Không thấy trong code thì ghi "không có trong code". Chỗ chưa rõ ghi `[CẦN XÁC NHẬN]` kèm câu hỏi cụ thể.
4. **Mô tả cái ĐANG CÓ, không mô tả cái MUỐN CÓ.** Chức năng đã quyết nhưng chưa có trong code ghi `[CHƯA TRIỂN KHAI]`. Chức năng có giao diện nhưng chưa chạy thật (mock, hardcode, chưa nối API, chưa lưu DB) ghi `[CHƯA HOÀN THIỆN]`.
5. **Không tiết lộ secret.** Gặp khóa, mật khẩu, token, số tài khoản trong code hoặc `.env` thì chỉ ghi tên biến và vị trí, **không chép giá trị** vào bất kỳ file nào.
6. **Chỉ ghi vào thư mục `docs/`.** Không chạy migration, không ghi DB. Nếu cần xem DB thì chỉ đọc schema/migration trong code hoặc dùng lệnh chỉ đọc trên DB test.
7. **Không tuyên bố đầy đủ** nếu chưa đọc hết. Phần chưa đọc ghi ở phụ lục.
8. **Tên trạng thái, enum, tên nút, thông báo lấy nguyên văn từ code** (enum, file chuỗi giao diện, i18n), không tự đặt.

## QUYẾT ĐỊNH ĐÃ CHỐT (đối chiếu với code, không coi là đã triển khai)

Mỗi mục phải được kiểm tra trong code và ghi vào BRD/SRS là `[ĐÃ CÓ]`, `[MỘT PHẦN]` hoặc `[CHƯA TRIỂN KHAI]`:

| Mã | Quyết định |
|---|---|
| D-01 | Thanh toán dùng **VietQR sinh mã QR**, không có cổng thanh toán. Production **xác nhận thủ công** qua `confirmByAdmin`. Webhook `POST /payments/webhook` bị khóa ở production (cờ `PAYMENT_WEBHOOK_ENABLED` mặc định tắt; khi bật bắt buộc khóa trong header) |
| D-02 | Đơn **đã nhận** thì **không hoàn tiền đơn**. Tiền chuyển thừa ngoài đơn vẫn được trả lại. Cửa hàng hủy đơn đã thanh toán (chưa nhận): hoàn 100%, thu hồi vé, **không tự trả tồn kho** |
| D-03 | `/store/settings`: xem OWNER, MANAGER, COUNTER; sửa chỉ OWNER; cửa hàng lấy từ token, bỏ qua `x-store-id` |
| D-04 | Tài khoản `PENDING_DELETE` được đăng nhập trong 7 ngày ân hạn, phiên chỉ được xem trạng thái, hủy yêu cầu xóa, đăng xuất. Khách còn đơn chưa nhận thì chặn yêu cầu xóa |
| D-05 | `price-history`: công khai cho suất đang hiển thị, kèm giới hạn tần suất (nếu danh sách suất đã công khai) |
| D-06 | Đăng ký cửa hàng: **bỏ chữ ký số**, chủ quán ký **hợp đồng scan**, tải lên, admin duyệt |
| D-07 | Bản đồ: lọc theo **nhóm món**; zoom đủ gần hiện logo quán; chủ quán phải ghim vị trí khi đăng ký |
| D-08 | Nhóm món đề xuất (mỗi suất chọn một): Cơm, Phở & Bún, Bánh mì, Đồ nhanh, Ăn vặt, Healthy, Bánh ngọt, Đồ uống, Nông sản, Khác (cộng chip "Tất cả" không lưu vào suất). Phải đối chiếu với nhóm đang có trong app (Món chính, Bánh & Đồ ngọt, Nông sản...) |
| D-09 | Gợi ý cá nhân hóa theo món đã mua: ý tưởng, chưa chốt cách làm |
| D-10 | Bản đồ dùng osmdroid + ô OpenStreetMap, PostGIS (`geography`, mét), toạ độ `[lng, lat]` (từ báo cáo kiến trúc map; xác minh lại) |

Các điểm nghi vấn đã biết từ các lượt audit trước (cần kiểm tra lại, **không coi là kết luận**): chủ cửa hàng chưa tự nhập được toạ độ quán; chỉ mục không gian có thể chưa khớp truy vấn; `soldQuantity` không còn nguồn chân lý; tên "SaveBite AI" còn trong app/backend; thư viện Google Maps còn trong cấu hình mà không dùng.

---

# QUY TRÌNH THỰC HIỆN

**Bước 1. Kiểm kê (chưa viết).** Quét repo: cấu trúc thư mục, công nghệ, cách build/chạy; danh sách tài liệu cũ và độ khớp với code; danh sách màn hình/route, endpoint, bảng DB, job nền, tích hợp ngoài, biến môi trường (chỉ tên).

**Bước 2. Đọc tài liệu cũ.** Trích vai trò, màn hình theo vai trò, chức năng, quy tắc đã ghi.

**Bước 3. Đọc mã nguồn và đối chiếu hai chiều.** Từ tài liệu sang code (chức năng có tồn tại không, chạy thật hay mock, rule thực thi ở UI/backend/DB) và từ code sang tài liệu (cái gì có trong code mà tài liệu không nhắc).

**Bước 4. Viết `BRD_SRS_SurplusIQ.md`** theo cấu trúc bên dưới.

**Bước 5. Viết `HUONG_DAN_SU_DUNG_SurplusIQ.md`**, chỉ làm **sau khi** xong các mục chức năng của BRD/SRS (mục 7 đến 10), vì hướng dẫn dựa vào danh sách màn hình đã đối chiếu.

**Bước 6. Kiểm tra chất lượng** (cuối tài liệu), rồi báo cáo.

**Về độ dài:** file BRD/SRS sẽ rất dài. Viết **từng mục một**, nối vào file sau khi xong mỗi mục, và ghi tiến độ vào `docs/_PROGRESS.md` (mục nào xong, mục nào còn, vướng ở đâu). Nếu hết ngữ cảnh, ở phiên sau đọc lại `_PROGRESS.md` và phần đã viết rồi làm tiếp. Không rút gọn nội dung chỉ vì file dài.

---

# PHẦN 1: CẤU TRÚC FILE `BRD_SRS_SurplusIQ.md`

Đầu file: tên tài liệu, phiên bản, ngày lập, commit hoặc phiên bản mã nguồn đã đọc, nguồn tài liệu đã dùng, quy ước nhãn nguồn (`[CODE]`...) và nhãn trạng thái (`PASS/PARTIAL/FAIL/NOT IMPLEMENTED/NEEDS CLARIFICATION`, `[ĐÃ CÓ]`...), bảng mã tham chiếu (`FR-`, `BR-`, `ST-`, `API-`), mục lục.

| Mục | Tiêu đề | Nội dung bắt buộc |
|---|---|---|
| 1 | Tổng quan và phạm vi | Mô hình kinh doanh hiện tại (đồ dư, suất bán, khách đặt, nhận hàng), bài toán giải quyết, đối tượng dùng, vai trò của từng ứng dụng, phạm vi và ngoài phạm vi, thuật ngữ |
| 2 | **Kiến trúc và công nghệ** | Xem chi tiết bên dưới |
| 3 | Vai trò và phân quyền | Danh sách vai trò theo code (ví dụ khách, OWNER, MANAGER, COUNTER, ADMIN), cách xác thực và cấp token, ma trận vai trò × chức năng × API theo **guard thực tế**, các endpoint công khai |
| 4 | Thực thể dữ liệu | Mỗi thực thể: bảng DB, cột, kiểu, ràng buộc, quan hệ, ý nghĩa nghiệp vụ; ERD Mermaid; chỉ mục; cột deprecated hoặc không dùng; múi giờ và định dạng thời gian lưu trữ |
| 5 | Vòng đời trạng thái | Với từng thực thể có trạng thái trong code (cửa hàng/hồ sơ, suất, đơn hàng, thanh toán, hoàn tiền, vé nhận hàng, khiếu nại, tài khoản, ...): bảng và sơ đồ Mermaid, **tên nguyên văn theo enum**, chuyển hợp lệ, điều kiện, ai thực hiện, hành động tự động (job). Nêu trạng thái ngõ cụt hoặc chuyển trái phép nếu có |
| 6 | Business rules | Bảng toàn bộ rule: mã BR, mô tả, nơi thực thi (UI/Backend/DB), nguồn file:dòng, điều kiện biên đã biết. Nhóm theo: đặt hàng, suất và tồn kho, thanh toán, hoàn tiền, hủy, nhận hàng, không đến nhận, khiếu nại, tài khoản, cửa hàng, bản đồ, giá/khuyến mãi |
| 7 | Chức năng APP-CUSTOMER | Theo mẫu chức năng bên dưới |
| 8 | Chức năng APP-OWNER | Theo mẫu chức năng |
| 9 | Chức năng WEB-OWNER | Theo mẫu chức năng |
| 10 | Chức năng WEB-ADMIN | Theo mẫu chức năng |
| 11 | Luồng nghiệp vụ và liên ứng dụng | Từng luồng đầu–cuối (đăng ký và duyệt cửa hàng, đăng suất, tìm quán và đặt hàng, thanh toán, nhận hàng, không đến nhận, hủy, hoàn tiền, khiếu nại, xóa tài khoản, đổi suất, tặng suất, Rescue Pool, Rescue Bridge, đánh giá, gói dịch vụ, và mọi luồng có trong code). Mỗi luồng có sơ đồ Mermaid, nêu ứng dụng tham gia mỗi bước. Có mục riêng cho luồng liên ứng dụng: tạo ở đâu, xử lý ở đâu, hiển thị ở đâu |
| 12 | Thanh toán và hoàn tiền | VietQR (cách sinh mã), xác nhận thủ công, webhook (trạng thái khóa, cờ cấu hình, cách xác thực), đối soát (`MANUAL_REVIEW`), hoàn tiền (các luồng gọi, kiểm tra tổng hoàn, idempotency, tài khoản nhận hoàn), tiền chuyển thừa, nhật ký kiểm toán. Đối chiếu D-01, D-02 |
| 13 | Bản đồ và định vị | Thư viện bản đồ, nguồn ô bản đồ, lấy vị trí và quyền, cách tính khoảng cách, kiểu lưu toạ độ, API tìm quán gần, rule lọc và hiển thị, giới hạn pin, nhóm món, logo, chỉ mục không gian. Đối chiếu D-07, D-08, D-10 |
| 14 | Đối chiếu tài liệu cũ và code | Ba bảng: (a) có trong tài liệu cũ, **không có** trong code; (b) có trong code, **không có** trong tài liệu cũ; (c) có cả hai nhưng **mô tả khác nhau**. Mỗi dòng kèm nguồn |
| 15 | Tích hợp, thông báo, job nền | Dịch vụ ngoài và điểm tích hợp, thông báo đẩy/email/SMS/realtime, job nền và lịch chạy, cơ chế hết hạn giữ suất, không đến nhận |
| 16 | Yêu cầu phi chức năng | Bảo mật (xác thực, phân quyền, giới hạn tần suất, quản lý secret), hiệu năng và chỉ mục, nhất quán dữ liệu (transaction, khóa dòng, idempotency), nhật ký, đa ngôn ngữ, responsive, sao lưu, môi trường |
| 17 | Danh mục API | Bảng toàn bộ endpoint: mã API, method, đường dẫn, controller, vai trò/guard, tham số, response chính, mã lỗi, chức năng liên quan, client nào gọi |
| 18 | Chưa hoàn thiện, chưa triển khai, cần xác nhận | (1) `[CHƯA HOÀN THIỆN]`: mock, hardcode, TODO, chưa nối API, fallback dữ liệu mẫu, kèm file:dòng. (2) `[CHƯA TRIỂN KHAI]` so với nhật ký quyết định D-01..D-10. (3) Câu hỏi `[CẦN XÁC NHẬN]`: mã, mô tả, nguồn, câu hỏi cụ thể, phương án đề xuất. (4) `[RỦI RO]` nhận thấy khi đọc (ghi rõ chưa phải lỗi đã xác nhận) |
| 19 | Phụ lục | Danh sách file mã nguồn và tài liệu đã đọc, danh sách **chưa đọc** và lý do, danh sách biến môi trường (chỉ tên, ý nghĩa, môi trường dùng), lệnh build và chạy |

## Yêu cầu riêng cho mục 2 (Kiến trúc và công nghệ)

Mỗi tiểu mục kèm bằng chứng (file cấu hình, file phụ thuộc, file:dòng):

1. **Sơ đồ kiến trúc tổng thể** (Mermaid): 4 ứng dụng, backend, DB, dịch vụ ngoài, hạ tầng.
2. **Bảng công nghệ theo thành phần:** ngôn ngữ, framework, thư viện chính **kèm phiên bản** lấy từ file phụ thuộc (package.json, build.gradle, pom, lock file...). Không ghi phiên bản nếu không đọc được từ file.
3. **Cấu trúc thư mục** từng thành phần và vai trò các thư mục chính.
4. **Backend:** kiểu API, cách tổ chức module/controller/service, xác thực (token, thời hạn, refresh), phân quyền (guard), xử lý lỗi, validation, job nền, cấu hình môi trường.
5. **Cơ sở dữ liệu:** hệ quản trị, phiên bản, extension (ví dụ PostGIS), công cụ migration, chiến lược giao dịch và khóa.
6. **Ứng dụng mobile:** nền tảng, ngôn ngữ, kiến trúc giao diện, quản lý trạng thái, gọi API, lưu trữ cục bộ, bản đồ, thông báo đẩy.
7. **Ứng dụng web:** framework, quản lý trạng thái, gọi API, định tuyến, giao diện.
8. **Dịch vụ ngoài và tích hợp:** từng dịch vụ, mục đích, cách xác thực, điểm tích hợp trong code.
9. **Môi trường và triển khai:** các môi trường, cách build, CI/CD, container, nơi chạy (chỉ ghi những gì có bằng chứng trong repo).
10. **Kiểm thử hiện có:** khung test, bộ test, cách chạy, phạm vi bao phủ đã biết.
11. **Phát hiện kiến trúc cần lưu ý:** thư viện không dùng, cấu hình thừa, entity lệch schema, key lộ trong repo (chỉ ghi vị trí), phụ thuộc lỗi thời. Ghi `[RỦI RO]`.

## Mẫu cho từng chức năng ở mục 7 đến 10

```
### FR-<APP>-<số>: <Tên chức năng>
- Màn hình / Route:
- Vai trò được dùng:
- Mục đích nghiệp vụ:
- Điều kiện tiên quyết:
- Luồng chính: (đánh số)
- Luồng thay thế và lỗi: (đánh số, kèm thông báo lỗi nguyên văn)
- Dữ liệu vào (trường, kiểu, bắt buộc, giới hạn):
- Kết quả:
- API: <mã API>   |   Bảng DB:
- Rule liên quan: <mã BR>
- Trạng thái đối tượng bị ảnh hưởng:
- Mức hoàn thiện: PASS | PARTIAL | FAIL | NOT IMPLEMENTED | NEEDS CLARIFICATION (theo đọc code)
- Nguồn: [CODE] file:dòng / [DOC] / [QUYẾT ĐỊNH]
```

---

# PHẦN 2: CẤU TRÚC FILE `HUONG_DAN_SU_DUNG_SurplusIQ.md`

Cấu trúc:

1. **Giới thiệu:** hệ thống dùng để làm gì, 4 ứng dụng nào dành cho ai (bảng), cách tìm hướng dẫn theo việc cần làm.
2. **Hướng dẫn App Khách hàng** (APP-CUSTOMER).
3. **Hướng dẫn App Chủ cửa hàng** (APP-OWNER).
4. **Hướng dẫn Web Chủ cửa hàng** (WEB-OWNER).
5. **Hướng dẫn Web Admin** (WEB-ADMIN).
6. **Câu hỏi thường gặp và xử lý lỗi:** tổng hợp từ các luồng lỗi trong code (thông báo nguyên văn → nguyên nhân → cách xử lý).
7. **Chức năng sắp có hoặc chưa dùng được:** gom toàn bộ chức năng `[CHƯA HOÀN THIỆN]` và `[CHƯA TRIỂN KHAI]`, nói rõ hiện chưa dùng được.

## Mẫu cho từng màn hình

```
### <Tên màn hình>
**Dùng để:** (một câu)
**Ai dùng được:** (vai trò)
**Vào màn hình này bằng cách:** (từ đâu bấm gì)
**Trên màn hình có:** (các khu vực, nút, trường nhập, đúng tên giao diện)

**Cách làm: <tên tác vụ>**
1. ...
2. ...
**Kết quả:** (người dùng thấy gì sau khi xong)
**Lưu ý và giới hạn:** (điều kiện, hạn mức, quy tắc cần biết)
**Nếu gặp lỗi:** (thông báo nguyên văn → nguyên nhân thường gặp → cách xử lý)
```

## Nội dung tối thiểu cho từng phần

- **App khách hàng:** cài đặt và đăng nhập/đăng ký, cho phép vị trí, xem bản đồ và danh sách quán gần, lọc theo nhóm món, xem chi tiết suất, đặt và giữ suất, thanh toán (quét VietQR), theo dõi đơn, nhận hàng bằng vé, hủy đơn, khiếu nại, đánh giá, hoàn tiền (khi nào có, khi nào không), quản lý tài khoản, xóa tài khoản và hủy yêu cầu xóa, và mọi chức năng khác có trong code.
- **App và Web chủ cửa hàng:** đăng ký cửa hàng, ghim vị trí, tải logo, tải hợp đồng (nếu đã triển khai), theo dõi trạng thái duyệt, tạo và sửa suất, điều chỉnh tồn kho, nhận và xử lý đơn, quét vé khi khách nhận hàng, hủy đơn, báo cáo và thống kê, cấu hình vận hành, quản lý nhân viên và phân quyền, và mọi chức năng khác có trong code. Nêu rõ **vai trò nào làm được gì** (OWNER, MANAGER, COUNTER).
- **Web Admin:** đăng nhập, duyệt hồ sơ cửa hàng (xem vị trí, xem hợp đồng, duyệt/từ chối/yêu cầu bổ sung), khóa và mở khóa cửa hàng, xác nhận thanh toán thủ công theo biên lai, xử lý đối soát và ngoại lệ, quản lý danh mục, quản lý người dùng, xem thống kê, và mọi chức năng khác có trong code.

## Quy tắc viết hướng dẫn

1. **Viết cho người dùng cuối:** câu ngắn, đời thường, không dùng thuật ngữ kỹ thuật (không nói API, endpoint, token, enum).
2. **Mỗi bước một hành động,** bắt đầu bằng động từ: "Bấm", "Nhập", "Chọn", "Kéo".
3. **Chỉ viết những gì chức năng thật sự làm được theo code.** Chức năng `[CHƯA HOÀN THIỆN]` hoặc `[CHƯA TRIỂN KHAI]` không viết như đã có, chỉ đưa vào mục 7.
4. **Không bịa hành vi giao diện.** Không rõ vị trí nút thì mô tả bằng tên nút và nhãn. Bước nào chưa chắc ghi `[CẦN XÁC NHẬN TRÊN GIAO DIỆN]`.
5. **Nói rõ quy tắc ảnh hưởng người dùng**, lấy từ mục 6 và 12 của BRD/SRS, không tự suy ra. Ví dụ: đơn đã nhận thì không hoàn tiền; suất có hạn nhận; tiền chuyển thừa được trả lại; tài khoản chờ xóa chỉ hủy được yêu cầu trong 7 ngày.
6. **Không chép secret, đường dẫn nội bộ hay dữ liệu cá nhân thật.**
7. **Dùng nhãn hiển thị** mà người dùng thấy, không dùng mã nội bộ (`PENDING_REVIEW`, `PAID`).

---

# KIỂM TRA CHẤT LƯỢNG TRƯỚC KHI BÀN GIAO

Thực hiện và ghi kết quả vào cuối `docs/_PROGRESS.md`:

1. Mọi màn hình/route của 4 ứng dụng có trong mục 7–10 của BRD/SRS và trong hướng dẫn (hoặc được ghi rõ là không dùng).
2. Mọi endpoint của backend có trong mục 17; endpoint không client nào gọi thì đánh dấu.
3. Mọi bảng/entity trong migration có trong mục 4; bảng không dùng thì đánh dấu.
4. Mọi enum trạng thái trong code có trong mục 5.
5. Mọi `BR-` có nguồn file:dòng hoặc nhãn `[DOC]`/`[QUYẾT ĐỊNH]`/`[CẦN XÁC NHẬN]`.
6. **Quét secret:** tìm trong hai file chuỗi trông như khóa, mật khẩu, token, số tài khoản; nếu thấy thì xóa ngay.
7. Tên trạng thái, vai trò, màn hình nhất quán giữa BRD/SRS và hướng dẫn.
8. Mọi quyết định D-01 đến D-10 có dòng trong BRD/SRS với trạng thái `[ĐÃ CÓ]/[MỘT PHẦN]/[CHƯA TRIỂN KHAI]`.
9. Liên kết và mục lục hoạt động; phần chưa đọc được liệt kê ở mục 19.

## CÁCH LÀM VIỆC VÀ BÁO CÁO

- Sau mỗi bước, báo cáo ngắn: đã đọc gì, bao nhiêu màn hình/endpoint/bảng/rule/trạng thái tìm thấy, bao nhiêu mâu thuẫn tài liệu–code, bao nhiêu mục cần xác nhận, bị chặn ở đâu.
- Chỉ hỏi người dùng khi cần quyết định nghiệp vụ hoặc thiếu quyền truy cập. Không hỏi những việc tự kiểm tra được bằng đọc code.
- Cuối cùng báo cáo tóm tắt: số màn hình, endpoint, bảng, enum trạng thái, rule, chức năng theo từng mức hoàn thiện; số mâu thuẫn tài liệu–code; số câu hỏi cần xác nhận; phần chưa đọc và lý do.

## KẾT QUẢ CẦN GIAO

- `docs/BRD_SRS_SurplusIQ.md`
- `docs/HUONG_DAN_SU_DUNG_SurplusIQ.md`

**BẮT ĐẦU NGAY với Bước 1 (Kiểm kê): quét repository, xác định 4 ứng dụng, backend, DB và đọc `D:\SurplusIQ\doc\SurplusIQ_Thong_ke_man_hinh_theo_vai_tro.md`. Chưa viết tài liệu, chưa sửa mã.**
