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

## 4. Bộ điều khiển Time Machine Simulation (`TimeMachineBar`) — R2-065

Thanh công cụ cố định trên đỉnh giao diện (chỉ kích hoạt ở chế độ Demo/Dev):
- Hiển thị thời gian ảo: `Đồng hồ giả lập: 20:30 (Khung nhận 20:00 - 21:30)`.
- Các nút tương tác:
  * `+ 15 phút`: Xem giá động tự động giảm nấc tiếp theo.
  * `+ 30 phút`: Xem các đơn quá hạn chuyển sang cảnh báo hết hạn nhận.
  * `Sang ngày hôm sau`: Kích hoạt job chốt số cuối ngày, sinh dự báo mới và sao kê tuần.
- Toàn bộ giao diện kết nối WebSocket / Polling phản ứng tức thời với thời gian ảo.
