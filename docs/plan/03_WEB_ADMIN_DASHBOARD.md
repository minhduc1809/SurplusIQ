# 03 — GIAO DIỆN WEB QUẢN TRỊ CỬA HÀNG (`apps/web`)

> **Vị trí**: `apps/web` (React 18, Vite, TypeScript, React Router v6, Lucide Icons, Clean Modern CSS).  
> **Người dùng**: Chủ cửa hàng tiệm bánh (OWNER), Quản lý (MANAGER), Nhân viên quầy (COUNTER) — bao phủ 126 Use Cases R2-001..R2-126.  
> **Quy chuẩn**: Tuân thủ [rule.md](../../rule.md) — nhánh `feature/web-<ten>`, commit `feat(web): ...`, chuẩn hóa ESLint.

---

## 1. Kiến trúc phân quyền giao diện (3 Nhóm quyền & Khóa gói)

Giao diện tự động thích ứng theo 3 lớp kiểm soát nghiệp vụ:

```mermaid
flowchart TD
    Login[Người dùng đăng nhập] --> GroupCheck{Nhóm quyền?}
    GroupCheck -->|COUNTER| CounterUI[Giao diện Quầy tinh gọn:<br/>• Quét QR & Nhập PIN 6 số<br/>• Đơn trong ngày (Ẩn SĐT)<br/>• Nhập tồn thực tế]
    GroupCheck -->|MANAGER| ManagerUI[Giao diện Vận hành:<br/>• Danh mục & Suất bán<br/>• Xử lý khiếu nại<br/>• Báo cáo & Lịch hẹn]
    GroupCheck -->|OWNER| OwnerUI[Giao diện Toàn quyền:<br/>• Toàn bộ quyền Manager<br/>• Quản lý gói & Hóa đơn<br/>• Mời nhân viên & Phân quyền<br/>• Cấu hình giá sàn & Quy tắc]

    ManagerUI & OwnerUI --> PlanCheck{Gói dịch vụ?}
    PlanCheck -->|Cơ bản (BASIC)| BasicView[Giới hạn:<br/>• 20 suất/ngày<br/>• Báo cáo 7 ngày<br/>• 1 nhân viên<br/>• Khóa Dự báo & Định giá Pro]
    PlanCheck -->|Pro / Dùng thử| ProView[Mở khóa Pro:<br/>• 100 suất/ngày<br/>• Báo cáo 365 ngày<br/>• 5 nhân viên<br/>• Dashboard Dự báo & Định giá tự động]
```

---

## 2. Cấu trúc cây thư mục mã nguồn

```text
apps/web/src/
├── main.tsx
├── App.tsx
├── router/
│   ├── index.tsx                 # Định tuyến với RoleRoute & PlanRoute
│   └── navigation.config.ts      # Menu items theo nhóm quyền
├── contexts/
│   ├── AuthContext.tsx           # Quản lý User, Store, Permission Group
│   ├── QuotaContext.tsx          # Theo dõi hạn mức sử dụng thời gian thực
│   └── TimeMachineContext.tsx    # Đồng hồ ảo (Virtual Clock) phục vụ demo
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx         # Sidebar + Header + QuotaIndicator
│   │   ├── CounterLayout.tsx     # Giao diện quầy cảm ứng toàn màn hình
│   │   └── Header.tsx            # Thông báo, hồ sơ, nút Time Machine
│   ├── common/
│   │   ├── Button.tsx, Modal.tsx, Badge.tsx, Table.tsx, Toast.tsx
│   │   ├── EmptyState.tsx        # Trạng thái rỗng kèm gợi ý (9.5)
│   │   └── QuotaProgress.tsx     # Thanh đo hạn mức (ví dụ: 15/20 suất)
│   ├── scanner/
│   │   ├── WebRtcQrScanner.tsx   # Quét camera WebRTC
│   │   └── NumpadBackupPin.tsx   # Bàn phím số nhập mã PIN 6 ký tự
│   └── time-machine/
│       └── TimeMachineBar.tsx    # Thanh điều khiển giả lập thời gian
├── pages/
│   ├── auth/                     # Đăng nhập, Đăng ký, OTP, Quên mật khẩu
│   ├── catalog/                  # Danh mục món, Import CSV, AI đọc ảnh
│   ├── offers/                   # Quản lý suất bán, Điều chỉnh tồn
│   ├── orders/                   # Đơn hàng trong ngày, Lịch hẹn nhận
│   ├── pickup/                   # Màn hình Quét QR tại quầy
│   ├── complaints/               # Tiếp nhận & Xử lý khiếu nại 48h
│   ├── reviews/                  # Phản hồi đánh giá công khai
│   ├── reconciliation/           # Sao kê tuần bất biến (10% hoa hồng)
│   ├── settings/                 # Cấu hình giá sàn, Giờ mở cửa, Quy tắc
│   ├── staff/                    # Mời nhân viên, Phân quyền (Chỉ Owner)
│   ├── subscription/             # Gói dịch vụ & Hóa đơn (Chỉ Owner)
│   ├── pro/
│   │   ├── forecasting/          # Dự báo số lượng làm bánh ngày mai
│   │   ├── dynamic-pricing/      # Đề xuất giảm giá theo giờ
│   │   ├── customer-segments/    # Phân nhóm khách hàng (≥ 20 khách)
│   │   └── campaigns/            # Chiến dịch gửi khách thân thiết
│   └── ai-assistant/             # Hỏi đáp số liệu kinh doanh, Tóm tắt tuần
└── services/
    ├── api.client.ts             # Axios instance gắn JWT & Error Interceptor
    └── modules/                  # API calls: auth, offers, orders, etc.
```

---

## 3. Đặc tả chi tiết các màn hình nghiệp vụ

### 3.1. Màn hình Quét mã QR nhận hàng tại quầy (`/pickup`) — R2-052
- **Dành cho**: Cả 3 vai trò (Chủ, Quản lý, Nhân viên quầy).
- **Trải nghiệm Quét Camera (WebRTC)**:
  - Tự động nhận diện khung hình vé QR của khách hàng.
  - Khi quét thành công: Phát âm thanh *beep* xác nhận, hiển thị thẻ xanh lá lớn:
    * Mã đơn hàng: `#ORD-8921`
    * Tên khách: `Nguyễn V. A.` (che chữ cái đầu theo BR-068, tuyệt đối không hiện SĐT).
    * Tên món & Số lượng: `3x Bánh Croissant bơ Pháp`.
    * Trạng thái cập nhật: `ĐÃ NHẬN HÀNG`.
- **Bàn phím nhập mã dự phòng (Fallback Numpad)**:
  - Nút chuyển nhanh sang chế độ "Nhập mã 6 ký tự".
  - Bàn phím số to rõ tối ưu cho màn hình cảm ứng POS/Tablet.
- **Xử lý ngoại lệ tại chỗ**:
  - Mã QR đã quét trước đó: Báo đỏ lớn "Vé đã sử dụng lúc 20:15 bởi nhân viên khác".
  - Mã QR quá hạn: Báo lỗi "Vé đã quá thời hạn nhận hàng cho phép (+15 phút)".
  - Mã QR sai cửa hàng: Báo lỗi "Vé này thuộc về chi nhánh khác".

### 3.2. Màn hình Quản lý Suất bán & Tồn kho (`/offers`) — R2-026..R2-035
- **Tạo suất bán mới (`POST /store/offers`)**:
  - Chọn món từ danh mục $\to$ Hệ thống tự động gợi ý giá bán và khung giờ nhận mặc định của quán (R2-007).
  - Khóa giá sàn an toàn: Nếu nhập giá bán thấp hơn giá sàn ($P_{floor}$), form lập tức báo lỗi và vô hiệu hóa nút đăng bán (BR-054).
  - Kiểm tra hạn mức gói: Nếu gói Cơ bản đã đạt 20 suất mở trong ngày, hiển thị thông báo đạt trần kèm nút gợi ý nâng cấp Pro (12.11.1).
- **Thanh đo tồn kho thời gian thực**:
  - Cập nhật số lượng tồn khả dụng ngay khi có khách giữ suất trên app.
  - Nút bấm nhanh "Điều chỉnh tồn kho" (`POST /store/offers/:id/adjust-stock`): bắt buộc chọn lý do (Hỏng bánh, Bán tại quầy, Làm thêm) theo BR-056.
  - Nút "Hủy suất" (`POST /store/offers/:id/cancel`): cảnh báo hủy suất sẽ tự động hoàn tiền 100% cho toàn bộ đơn đã thanh toán và gửi thông báo cho khách (BR-057).

### 3.3. Màn hình Báo cáo Đối soát & Sao kê tuần (`/reconciliation`) — R2-063, R2-066, R2-067
- **Bảng Sao Kê Bất Biến (Thứ Hai đến Chủ Nhật)**:
  - Hiển thị bảng tổng kết rõ ràng:
    1. Tổng tiền hàng khách mua (Gross Sales).
    2. Khấu trừ hoa hồng nền tảng: Cố định 10% (Chương 13 #2).
    3. Khấu trừ tiền hoàn khiếu nại (nếu có).
    4. Trừ phí gói Pro (nếu phát sinh trong kỳ).
    5. **Số tiền thực nhận (Net Payout)**.
- **Trạng thái Sao kê**:
  - Sao kê tuần hiện tại hiển thị nhãn `TẠM TÍNH`.
  - Sao kê các tuần trước hiển thị nhãn `ĐÃ CHỐT BẤT BIẾN` (LOCKED).
  - Nút tải tệp PDF sao kê chính thức và xuất tệp CSV phục vụ kế toán tiệm bánh.

### 3.4. Màn hình Xử lý Khiếu nại (`/complaints`) — R2-054..R2-060
- **Đồng hồ đếm ngược 48 giờ**:
  - Mỗi khiếu nại hiển thị đồng hồ đếm ngược thời gian phản hồi còn lại.
  - Cảnh báo: "Nếu không phản hồi trong 48h, hệ thống sẽ tự động hoàn tiền 100% cho khách hàng" (BR-071).
- **Xem bằng chứng & Quyết định**:
  - Xem tối đa 3 ảnh chụp thực tế do khách hàng gửi kèm mô tả.
  - Nút "Chấp nhận khiếu nại": Nhập số tiền hoàn $\to$ kích hoạt hoàn tiền tự động (không thu hoa hồng phần này).
  - Nút "Từ chối khiếu nại": Bắt buộc nhập lý do từ chối từ 10 đến 300 ký tự (BR-072).
  - Nút "Gia hạn thêm 24h": Chỉ được dùng 1 lần duy nhất cho mỗi khiếu nại (BR-073).

### 3.5. Màn hình Tính năng Pro: Dự báo & Định giá Động (`/pro/...`)
- **Dự Báo Số Lượng Ngày Mai (`/pro/forecasting`) — R2-036..R2-043**:
  - Biểu đồ trực quan so sánh: Lượng làm thực tế vs Lượng bán qua app vs Lượng thừa 14 ngày qua.
  - Bảng khuyến nghị số lượng cho ngày mai kèm khoảng tin cậy $[\text{Thấp}, \text{Khuyến nghị}, \text{Cao}]$ và nhãn độ tin cậy.
  - Nút "Xem giải thích" (R2-037): Xem lý do sinh từ template (trung bình thứ, hệ số sự kiện).
  - Nút "Chấp nhận" hoặc "Ghi đè số lượng" (R2-038): Lưu số lượng làm mặc định khi tạo suất ngày mai.
- **Đề Xuất Định Giá Theo Giờ (`/pro/dynamic-pricing`) — R2-044..R2-048**:
  - Danh sách đề xuất giá cho các suất đang mở bán kèm đồng hồ đếm ngược 15 phút hiệu lực (BR-065).
  - Hiển thị rõ: Giá hiện tại $\to$ Giá đề xuất (làm tròn bội 500đ) $\to$ Giá sàn an toàn.
  - Toggle chuyển chế độ: "Duyệt tay từng lần" hoặc "Tự động áp dụng theo thuật toán".

---

### 3.6. Màn hình Gói Dịch vụ & Hạn mức (`/subscription`) — R2-011..R2-016, VC-01..VC-11
- **Chỉ dành cho**: Chủ cửa hàng (OWNER). Quản lý và nhân viên quầy bị ẩn hoàn toàn (12.18.2).
- **Thẻ thông tin gói hiện tại**:
  * Hiển thị gói: `Cơ bản (BASIC)`, `Dùng thử Pro (TRIAL)` hoặc `Pro (PRO)`.
  * Trạng thái và ngày bắt đầu / kết thúc chu kỳ (VC-01, VC-02).
  * Đồng hồ đếm ngược ngày hết hạn; cảnh báo nhắc nhở trước 7 ngày và 1 ngày (VC-04).
- **Hành động vòng đời gói**:
  * Nút "Nâng cấp lên Pro" / "Gia hạn Pro" (R2-012, R2-013, VC-02, VC-03): Hiển thị modal VietQR chuyển khoản 300.000 VND/tháng kèm mã giao dịch duy nhất (`gateway_txn_id`, VC-10).
  * Nút "Hạ về Cơ bản" / "Hủy Pro" (R2-012, R2-014, VC-05, VC-08): Modal xác nhận nêu rõ quyền lợi Pro được bảo lưu đến hết ngày `period_end`, không hoàn tiền phần thừa; sau đó tự chuyển về Basic (VC-06).
- **Bảng hạn mức sử dụng thời gian thực (`/subscription/quotas`) — R2-016**:
  * Hiển thị tiến độ: Suất mở hôm nay (15/20 CB hoặc 45/100 Pro), AI đọc ảnh (18/20 CB hoặc 120/300 Pro), AI hỏi đáp (8/10 CB hoặc 150/300 Pro), Nhân viên (1/1 CB hoặc 3/5 Pro), Ưu đãi chạy (2/2 CB hoặc 6/10 Pro), Chiến dịch tháng (3/4 CB hoặc 12/30 Pro).
  * Nút tải hóa đơn PDF (`/subscription/invoices`) — R2-015 (bất biến).

### 3.7. Màn hình Nhân viên & Phân quyền (`/staff`) — R2-076..R2-081
- **Chỉ dành cho**: Chủ cửa hàng (OWNER).
- **Mời nhân viên (`POST /store/staff/invite`) — R2-076**:
  * Nhập email nhân viên, họ tên, chọn nhóm quyền: `Quản lý (MANAGER)` hoặc `Nhân viên quầy (COUNTER)`.
  * Tạo liên kết mời dùng 1 lần, có hiệu lực trong 72 giờ.
  * Chặn mời vượt hạn mức gói (tối đa 1 ở Basic, 5 ở Pro).
- **Quản lý danh sách & Giám sát (`/staff/list`) — R2-077..R2-081**:
  * Danh sách: Tên, email, nhóm quyền, trạng thái (`Chờ kích hoạt`, `Hoạt động`, `Tạm khóa`), lần hoạt động cuối.
  * Nút "Đổi nhóm quyền" (R2-078), "Tạm khóa / Mở khóa" (R2-079), "Gỡ nhân viên" (R2-080).
  * Nhật ký thao tác nhân viên (R2-081): Lọc theo nhân viên, xem lịch sử quét QR, điều chỉnh tồn, hủy đơn trong 90 ngày.

### 3.8. Màn hình Phân nhóm Khách hàng & Ưu đãi & Túi bất ngờ (`/customers`, `/promotions`) — R2-082..R2-094
- **Danh sách khách hàng ẩn danh (`/customers`) — R2-082, R2-083**:
  * Hiển thị: Mã khách rút gọn (`#KH-9021`), chữ cái đầu họ tên (`Nguyễn V. A.`), tổng số đơn, tổng chi tiêu, ngày mua cuối, số lần không đến nhận (noshow). Tuyệt đối không hiển thị SĐT/email/địa chỉ.
  * Ghi chú nội bộ về khách (R2-085): Thêm ghi chú ngắn (tối đa 200 ký tự, cấm PII).
- **Phân nhóm khách theo quy tắc (`/customers/segments`) — R2-084 (Pro)**:
  * 4 tệp khách tự động tính hằng ngày: `Mới`, `Thân thiết` (≥ 5 đơn), `Có nguy cơ rời` (> 30 ngày không mua), `Thường không đến nhận` (tỷ lệ noshow cao, R2-087). Yêu cầu tối thiểu 20 khách.
- **Quản lý Ưu đãi & Túi bất ngờ (`/promotions`) — R2-088..R2-091**:
  * Tạo ưu đãi: Giảm % (max 50%) hoặc Giảm tiền (max 50% giá bán), chọn đối tượng áp dụng (Tất cả, Khách yêu thích, Thân thiết, Nguy cơ rời). Giới hạn 2 ưu đãi chạy ở Basic, 10 ở Pro.
  * Tạo Túi bất ngờ (`Surprise Bag`) — R2-091: Gộp nhiều món dư cuối ngày, giá bán cố định ≤ 60% giá trị ước tính tối thiểu, bắt buộc khai báo cảnh báo dị ứng.
- **Chiến dịch thông báo (`/promotions/campaigns`) — R2-092..R2-094**:
  * Soạn tin nhắn gửi khách yêu thích đã bật nhận ưu đãi (tiêu đề ≤ 50, nội dung ≤ 150 ký tự). Giới hạn 4 chiến dịch/tháng ở Basic, 30 ở Pro. Không gửi trong khung 22:00 - 07:00. Báo cáo tỷ lệ mở và doanh thu phát sinh trong 24h.

### 3.9. Màn hình Công việc, Lịch nhận & Quyên góp từ thiện (`/calendar`, `/donations`) — R2-095..R2-098, R2-121
- **Bảng việc cần làm hôm nay (`/tasks`) — R2-095, R2-096**:
  * Tổng hợp việc ưu tiên: Đề xuất giá chờ duyệt (15p), Khiếu nại sắp hết hạn (48h), Nhập số thực tế cuối ngày, Suất chưa mở bán, Món thiếu dữ liệu.
- **Lịch hẹn nhận hàng theo mốc 15 phút (`/calendar/pickups`) — R2-098**:
  * Gom đơn theo từng mốc 15 phút để quầy chuẩn bị hàng sẵn sàng. Đánh dấu cờ "Khách báo sắp đến" (R1-060).
- **Khai báo ngày nghỉ & Giờ đặc biệt (`/calendar/closures`) — R2-097**:
  * Khai báo ngày nghỉ lễ hoặc giờ mở cửa đặc biệt để hệ thống loại trừ khỏi dự báo và chặn đăng suất.
- **Ghi nhận tặng từ thiện suất ế (`/donations`) — R2-121**:
  * Khi còn dưới 30 phút hết khung nhận và còn ≥ 3 suất, hệ thống nhắc chủ cân nhắc tặng cho nơi nhận hỗ trợ. Ghi nhận số suất tặng, không tính phí và hoa hồng.

### 3.10. Màn hình Cấu hình quán, Audit Log & Xuất dữ liệu (`/settings`) — R2-101..R2-103
- **Quy tắc kinh doanh của tiệm (`/settings/rules`) — R2-101**:
  * Suất tối đa mỗi đơn (1-5, mặc định 5).
  * Thời gian trễ cho phép khi nhận (0-30 phút, mặc định 15 phút).
  * Cho phép nhận hộ bằng mã 8 ký tự (bật/tắt).
- **Nhật ký thay đổi cấu hình & Audit log (`/settings/audit-logs`) — R2-102, R2-075**:
  * Bảng bất biến: Thời điểm, người thực hiện, hành động, giá trị cũ/mới, địa chỉ IP (lưu 12 tháng).
- **Xuất toàn bộ dữ liệu cửa hàng (`/settings/export`) — R2-103**:
  * Xuất toàn bộ món, suất, đơn (khách đã ẩn danh), sao kê dạng CSV/JSON (link tải hết hạn 24h).

### 3.11. Màn hình Mô phỏng Chính sách giá (`/pro/simulation`) — R2-104, R2-105
- **Chỉ dành cho**: Gói Pro.
- Chọn kịch bản giá (giảm cố định 30% cuối ngày vs định giá động WMA) chạy trên 14-90 ngày dữ liệu lịch sử của quán.
- Hiển thị bảng so sánh: Doanh thu thu hồi ước tính, Hao hụt ước tính, Số lần hết hàng sớm. Nhãn ghi rõ "Số liệu ước tính mô phỏng".

### 3.12. Màn hình Trợ lý AI Quản trị (`/ai-assistant`) — R2-021, R2-108..R2-126
- **Hỏi đáp dữ liệu kinh doanh bằng ngôn ngữ tự nhiên (R2-108, R2-109)**:
  * Hộp chat thông minh: Chủ hỏi câu hỏi kinh doanh $\to$ Backend biên dịch thành truy vấn chỉ số có cấu trúc trong CSDL $\to$ Trả về biểu đồ/bảng số liệu thật kèm lời giải thích ngắn.
  * Hạn mức: 10 câu/tháng ở Basic, 300 câu/tháng ở Pro. Fallback: Nếu AI timeout 10s hoặc ngắt kết nối, hiển thị danh mục báo cáo dựng sẵn.
- **Thẻ đề xuất hành động thông minh (R2-114, R2-115) — Pro**:
  * Hệ thống phát sinh tối đa 20 thẻ đề xuất/tháng: Đổi khung nhận, Giảm lượng làm món A, Tạo túi bất ngờ cuối ngày.
  * Chủ bấm "Chấp nhận" $\to$ Kích hoạt thao tác; theo dõi đo lường kết quả trong 7 ngày.
- **Công cụ hỗ trợ nhập liệu AI**:
  * AI đọc ảnh món điền thông tin (R2-021, R2-119): Nhận diện ảnh, cảnh báo mờ/tối, gợi ý tên món.
  * AI đọc hạn dùng từ ảnh nhãn OCR (R2-120): Điền sẵn ngày giờ hạn dùng để chủ kiểm tra.
  * AI soạn nội dung marketing & gợi ý phản hồi khiếu nại (R2-117, R2-118).
- **Cấu hình & Nhật ký AI (`/ai-assistant/settings`) — R2-122..R2-125**:
  * Bật/tắt từng tính năng AI, chọn giọng điệu (Thân thiện / Trang trọng / Ngắn gọn).
  * Xem nhật ký truy vết AI 90 ngày (ai hỏi, tính năng, độ trễ, kết quả, phản hồi).

---

## 4. Bộ điều khiển Time Machine Simulation (`TimeMachineBar`) — R2-065

Thanh công cụ cố định trên đỉnh giao diện (chỉ kích hoạt ở chế độ Demo/Dev):
- Hiển thị thời gian ảo: `Đồng hồ giả lập: 20:30 (Khung nhận 20:00 - 21:30)`.
- Các nút tương tác:
  * `+ 15 phút`: Xem giá động tự động giảm nấc tiếp theo.
  * `+ 30 phút`: Xem các đơn quá hạn chuyển sang cảnh báo hết hạn nhận.
  * `Sang ngày hôm sau`: Kích hoạt job chốt số cuối ngày, sinh dự báo mới và sao kê tuần.
- Toàn bộ giao diện kết nối WebSocket / Polling phản ứng tức thời với thời gian ảo.

---

## 5. Ma trận Phân quyền Vai trò & Gói dịch vụ cho 126 Use Cases R2

| Nhóm tính năng | Mã Use Case | Vai trò (Owner / Manager / Counter) | Gói áp dụng | Hạn mức áp dụng |
|---|---|---|---|---|
| **Tài khoản & Cửa hàng** | `R2-001..R2-003` | Owner (Đăng ký, Đăng nhập, Đăng xuất) | Tất cả | — |
| | `R2-004` | Owner, Manager, Counter (Đổi/Quên mật khẩu) | Tất cả | Link reset 30 phút |
| | `R2-005..R2-006` | Owner toàn quyền, Manager chỉ xem hồ sơ | Tất cả | Logo max 2MB |
| | `R2-007` | Owner (Khung giờ mặc định, giá sàn ≥ 40%) | Tất cả | Giá sàn 10-100% |
| | `R2-008` | Owner (Chế độ giá: Duyệt tay / Tự động) | Duyệt tay: CB; Tự động: Pro | Tự động chỉ gói Pro |
| | `R2-009..R2-010` | Owner (Tạm ngưng / Mở lại quán) | Tất cả | — |
| **Gói dịch vụ (VC-01..11)** | `R2-011..R2-016` | **Chỉ Owner** (Quản lý & Quầy bị khóa) | Tất cả (Basic/Trial/Pro) | Pro: 300.000đ/tháng |
| **Danh mục món** | `R2-017..R2-024` | Owner, Manager (Xem, Tạo, Sửa, Lưu trữ) | Tất cả | Tên duy nhất trong quán |
| | `R2-025` | Owner, Manager (Nhập CSV) | Tất cả | 100 dòng CB / 500 dòng Pro |
| **Suất bán & Tồn kho** | `R2-026..R2-030` | Owner, Manager (Xem, Tạo, Sửa, Nhân bản) | Tất cả | 20 suất/ngày CB / 100 Pro |
| | `R2-031` | Owner, Manager, Counter (Điều chỉnh tồn) | Tất cả | Bắt buộc chọn lý do |
| | `R2-032..R2-033` | Owner, Manager (Đóng sớm, Hủy hoàn tiền) | Tất cả | Hoàn 100% không hoa hồng |
| | `R2-034..R2-035` | Tự động đóng hết giờ & Xem lịch sử suất | Tất cả | Lưu vết bất biến |
| **Dự báo Pro** | `R2-036..R2-038` | Owner, Manager (Xem, Chấp nhận, Ghi đè) | **Chỉ Pro / Dùng thử** | Tối thiểu 14 ngày dữ liệu |
| | `R2-039` | Owner, Manager, Counter (Nhập số cuối ngày) | Tất cả (nuôi dữ liệu) | Nhập trong vòng 48h |
| | `R2-040..R2-043` | Owner, Manager (Sự kiện, MAE, Xu hướng 7d) | **Chỉ Pro / Dùng thử** | Xu hướng cần 28 ngày |
| **Định giá động Pro** | `R2-044..R2-048` | Owner, Manager (Đề xuất, Duyệt, Lịch sử) | **Chỉ Pro / Dùng thử** | Hết hạn 15p; max 3 lần đổi |
| **Đơn & Quầy** | `R2-049..R2-051` | Owner, Manager (Toàn bộ); Counter (Hôm nay) | Tất cả | Che họ tên; cấm xem SĐT |
| | `R2-052` | **Owner, Manager, Counter** (Quét QR/PIN 6 số) | Tất cả | WebRTC + Numpad |
| | `R2-053` | Owner, Manager (Hủy đơn quán hoàn 100%) | Tất cả | Hoàn 100% không hoa hồng |
| **Khiếu nại & Đánh giá**| `R2-054..R2-056` | Owner, Manager (Xem, Chấp nhận, Từ chối) | Tất cả | Phản hồi trong 48h |
| | `R2-057..R2-058` | Owner, Manager (Phản hồi đánh giá 24h) | Tất cả | 1 phản hồi công khai/đánh giá |
| | `R2-059..R2-060` | Gia hạn 24h & Tự động hoàn tiền 48h | Tất cả | Hoàn 100% tự động |
| **Báo cáo & Đối soát** | `R2-061` | Owner, Manager, Counter (Dashboard hôm nay) | Tất cả | Thời gian thực |
| | `R2-062` | Owner, Manager (Báo cáo hao hụt) | 7 ngày CB / 365 ngày Pro | Báo cáo cuốn chiếu |
| | `R2-063, R2-066..067`| Owner, Manager (Đối soát & Sao kê tuần) | Tất cả | Hoa hồng cố định 10% |
| | `R2-064` | Owner, Manager (Xuất CSV/PDF) | 3 lần/tháng CB / 30 lần Pro | Không chứa PII khách |
| | `R2-068..R2-073` | Owner, Manager (Doanh thu, Món, Giờ, Môi trường) | Tất cả | Đầy đủ biểu đồ phân tích |
| **Nhân viên (Phân quyền)**| `R2-076..R2-081` | **Chỉ Owner** (Mời, Đổi quyền, Khóa, Gỡ) | 1 NV ở CB / 5 NV ở Pro | Link mời 72h |
| **Khách hàng & Ưu đãi**| `R2-082..R2-087` | Owner, Manager (Xem khách ẩn danh, Ghi chú) | Phân nhóm: **Chỉ Pro** | ≥ 20 khách |
| | `R2-088..R2-094` | Owner, Manager (Ưu đãi, Túi bất ngờ, Chiến dịch) | 2 ưu đãi, 4 chiến dịch CB / 10 ưu đãi, 30 chiến dịch Pro | Không gửi 22:00-07:00 |
| **Lịch & Vận hành** | `R2-095..R2-098` | Owner, Manager (Việc cần làm, Ngày nghỉ); Counter (Lịch hẹn) | Tất cả | Mốc 15 phút |
| | `R2-099..R2-100` | Owner, Manager (Kiểm tra dữ liệu, Sửa loạt) | Tất cả | Max 100 món/lần |
| | `R2-101..R2-103` | **Chỉ Owner** (Quy tắc quán, Audit log, Xuất data) | Tất cả | Link xuất data 24h |
| **Mô phỏng chính sách**| `R2-104..R2-105` | Owner, Manager (Chạy & So sánh mô phỏng) | **Chỉ Pro / Dùng thử** | 14-90 ngày dữ liệu |
| **Hỗ trợ nền tảng** | `R2-106..R2-107` | Owner, Manager (Gửi & Trao đổi hỗ trợ) | Tất cả | Max 10 yêu cầu mở |
| **Trợ lý AI & Quản trị**| `R2-021, R2-119..120`| Owner, Manager (AI đọc ảnh món, OCR nhãn) | 20 lượt CB / 300 lượt Pro | Timeout 10s fallback |
| | `R2-108..R2-110` | Owner, Manager (Hỏi đáp dữ liệu, Chat trợ lý) | 10 lượt CB / 300 lượt Pro | Không suy đoán số liệu |
| | `R2-111, R2-113` | Owner, Manager (Tóm tắt tuần, Phân tích biến động) | **Chỉ Pro / Dùng thử** | 1 bản/tuần |
| | `R2-112` | Phát hiện biến động bất thường (MAD > 2.5) | **Chỉ Pro / Dùng thử** | Thống kê thuần, không LLM |
| | `R2-114..R2-115` | Owner, Manager (Thẻ đề xuất hành động) | **Chỉ Pro / Dùng thử** | 20 thẻ/tháng, theo dõi 7d |
| | `R2-116..R2-118` | Owner, Manager (Giải thích quyết định, Soạn nội dung) | 10 lượt CB / 200 lượt Pro | Duyệt trước khi đăng |
| | `R2-121` | Owner, Manager (Gợi ý tặng từ thiện suất ế) | Tất cả | Quy tắc thuần ≥ 3 suất |
| | `R2-122..R2-125` | **Chỉ Owner** (Cấu hình AI, Xem mức dùng, Audit AI) | Tất cả | Lưu log 90 ngày |
| | `R2-126` | Owner, Manager (AI đề xuất ưu đãi/chiến dịch) | **Chỉ Pro / Dùng thử** | 20 đề xuất/tháng |

