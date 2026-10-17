# QUY TẮC PHÁT TRIỂN DỰ ÁN SURPLUSIQ (RULE.MD)

> **Mục đích**: Tài liệu này định nghĩa toàn bộ quy chuẩn bắt buộc về quy trình Git, phân nhánh, quy tắc commit, chuẩn hóa code (ESLint / Linter) và quy tắc triển khai kỹ thuật cho toàn bộ thành viên và AI Assistant tham gia phát triển hệ thống SurplusIQ.

## Theo Dõi Tiến Độ Dự Án

[Bảng theo dõi tiến độ dự án SurplusIQ](https://docs.google.com/spreadsheets/d/1foXJRuqRQCVc8uH5k7tI3uODuFnvglDVlHfo43jUml4/edit?usp=sharing)

---

## 1. Quy Trình Phân Nhánh Git (Branching Workflow)

1. **Nhánh `main` & Nhánh `development`**:
   - `main`: Nhánh Production, chỉ nhận code ổn định từ `development` khi release.
   - `development`: Nhánh tích hợp chính (Integration Branch) cho toàn bộ quá trình phát triển.
   - **Tuyệt đối không commit trực tiếp lên `main` và `development`**.
2. **Quy trình đồng bộ bắt buộc trước khi bắt đầu code (Sync `main` & `development`)**:
   - Để tránh rủi ro sót hotfix trên production hoặc bị lệch nhánh (divergence), trước khi tạo bất kỳ nhánh nào bắt buộc phải đồng bộ cả `main` và `development`:
     ```bash
     # Bước 1: Kéo toàn bộ metadata mới nhất từ remote
     git fetch origin --prune

     # Bước 2: Đồng bộ nhánh main mới nhất từ remote (bảo đảm nhận đủ hotfix production)
     git checkout main
     git pull origin main

     # Bước 3: Đồng bộ nhánh development và tích hợp thay đổi từ main (nếu có)
     git checkout development
     git pull origin development
     git merge main

     # Bước 4: Tạo nhánh chức năng (feature) hoặc sửa lỗi (fix) mới từ development
     git checkout -b feature/<scope>-<ten-chuc-nang>
     # hoặc
     git checkout -b fix/<scope>-<ten-loi>
     ```
3. **Quy ước đặt tên nhánh**:
   - Tính năng mới: `feature/back-<ten-tinh-nang>`, `feature/web-<ten-tinh-nang>`, `feature/app-<ten-tinh-nang>`, `feature/core-<ten-tinh-nang>`
   - Sửa lỗi: `fix/back-<ten-loi>`, `fix/web-<ten-loi>`, `fix/app-<ten-loi>`
   - Tối ưu/Tái cấu trúc: `refactor/<scope>-<noi-dung>`
   - Tài liệu/Kế hoạch: `docs/<noi-dung>`
4. **Quy tắc Merge bắt buộc có Merge Commit (`--no-ff`)**:
   - Khi merge bất kỳ nhánh chức năng nào vào `development` (hoặc `development` vào `main`):
   - **Tuyệt đối không dùng Fast-Forward** để tránh làm thẳng đồ thị commit (git graph).
   - Bắt buộc tạo **Merge Commit** rõ ràng bằng cờ `--no-ff`:
     ```bash
     git checkout development
     git merge --no-ff <ten-nhanh-chuc-nang> -m "Merge branch '<ten-nhanh-chuc-nang>' into development"
     ```
   - Trên GitHub: Khi duyệt Pull Request, bắt buộc chọn **"Create a merge commit"** (nghiêm cấm dùng *Squash and merge* hoặc *Rebase and merge* làm mất nhánh đồ thị).

---

## 2. Quy Tắc Commit Git (Git Commit Convention)

Mọi commit phải tuân thủ nghiêm ngặt định dạng chuẩn, thể hiện rõ **loại thay đổi** và **thành phần áp dụng (scope)**:

### 2.1. Cấu trúc cú pháp
```text
<type>(<scope>): <mô tả ngắn gọn về thay đổi>
```
hoặc dạng rút gọn:
```text
<type>: [<scope>] <mô tả ngắn gọn về thay đổi>
```

### 2.2. Các tiền tố (Types) bắt buộc
- `feat:` Thêm tính năng mới hoặc Use Case mới.
- `update:` Cập nhật logic, thay đổi cấu hình, nâng cấp luồng nghiệp vụ hiện có.
- `fix:` Sửa lỗi (bug fix), vá lỗi điều kiện biên hoặc xử lý ngoại lệ.
- `refactor:` Tái cấu trúc mã nguồn mà không làm thay đổi hành vi nghiệp vụ.
- `test:` Bổ sung hoặc cập nhật unit test, integration test, benchmark test.
- `docs:` Thêm hoặc cập nhật tài liệu (BRD, Plan, README, Rule,...).

### 2.3. Quy định về Scope (Phần code bị ảnh hưởng)
Bắt buộc phải ghi rõ scope tương ứng với ứng dụng / gói:
- `back`: Dành cho Backend API (NestJS, TypeORM, Redis BullMQ, Database Migrations).
- `web`: Dành cho Web Dashboard Chủ quán & Nhân viên (React, Vite, CSS).
- `app`: Dành cho Mobile App Android Khách hàng (Kotlin, Jetpack Compose).
- `core`: Dành cho Thư viện chia sẻ (`@surplusiq/core` - Forecasting, Pricing, QR token HMAC).
- `simulation`: Dành cho Hệ thống benchmark mô phỏng 4 chế độ.
- `infra`: Dành cho Docker, CI/CD, Scripts hạ tầng.

### 2.4. Ví dụ Commit hợp lệ
```bash
git commit -m "feat(back): them api dat hang voi khoa pessimistic_write chong ban vuot ton"
git commit -m "update(web): tich hop giao dien quet ma qr nhan hang voi camera stream"
git commit -m "fix(app): sua loi hien thi gia chot sau khi ap dung uu dai giam gia"
git commit -m "feat(core): cai dat dynamic pricing engine voi rang buoc gia san 40%"
git commit -m "docs(all): tao ban ke hoach chi tiet va rule quy trinh phat trien"
```

---

## 3. Quy Trình Đồng Bộ Trước Khi Push (Pre-Push Sync Workflow)

Trước khi đẩy code (push) lên remote repository hoặc tạo Pull Request:
1. **Kiểm tra trạng thái làm việc cục bộ**:
   ```bash
   git status
   ```
2. **Kéo cập nhật mới nhất từ nhánh `development` về**:
   - Bắt buộc phải pull `development` về nhánh chức năng hiện tại để phát hiện và xử lý xung đột (conflict) ngay tại máy cục bộ:
     ```bash
     git fetch origin
     git merge origin/development
     # hoặc: git rebase origin/development
     ```
3. **Xử lý triệt để mọi xung đột (nếu có)** và chạy kiểm thử/linter cục bộ thành công.
4. **Push nhánh chức năng lên remote**:
   ```bash
   git push origin feature/<scope>-<ten-chuc-nang>
   ```

---

## 4. Chuẩn Hóa Mã Nguồn Với ESLint & Bộ Công Cụ Kiểm Soát Chất Lượng

1. **Chuẩn ESLint cho Monorepo TypeScript (Backend, Web, Core, Simulation)**:
   - Toàn bộ mã nguồn TypeScript/JavaScript phải vượt qua kiểm tra của ESLint:
     ```bash
     npm run lint
     # hoặc sửa lỗi tự động:
     npm run lint:fix
     ```
   - Không được phép commit code có cảnh báo (warning) nghiêm trọng hoặc lỗi (error) cú pháp.
   - Cấm lạm dụng kiểu `any` để lách luật TypeScript; phải định nghĩa interface/type chặt chẽ theo mô hình dữ liệu BRD.
2. **Chuẩn Linter cho Android (Kotlin)**:
   - Sử dụng `ktlint` hoặc Android Studio Code Style để định dạng mã nguồn Kotlin.
3. **Nguyên tắc "Anti-AI Slop" (Chống code rác & code bỏ dở)**:
   - **Tuyệt đối không bỏ dở code**: Cấm commit các đoạn code chứa `// TODO: tự hoàn thiện sau`, `/* giữ nguyên các hàm khác */` khi triển khai chức năng.
   - **Không bịa đặt hàm hay thư viện**: Mọi thư viện sử dụng phải có trong `package.json` hoặc cấu hình chuẩn của dự án.
   - **Xử lý lỗi từ gốc**: Bắt buộc xử lý lỗi cụ thể, cấm dùng `try/catch` rỗng để che giấu lỗi giao dịch tiền tệ hay kho hàng.

---

## 5. Quy Tắc Triển Khai Kỹ Thuật Đặc Thù của SurplusIQ

1. **Chống Bán Vượt Tồn Kho (Overselling Prevention)**:
   - Mọi thao tác giữ suất (`createOrder`) phải thực thi trong Database Transaction và kích hoạt Khóa ghi bi quan:
     ```typescript
     setLock('pessimistic_write') // SELECT ... FOR UPDATE trên hàng Offer
     ```
   - Kiểm tra `remainingQuantity >= requestedQuantity` một cách nguyên tử. Nếu không đủ, bắt buộc Rollback ngay lập tức.
2. **Tính Idempotent (Chống Xử Lý Trùng Lặp)**:
   - Mọi endpoint liên quan đến thanh toán, giữ suất, hoàn tiền phải kiểm tra khóa Idempotency (`idempotency_key`) trước khi xử lý nghiệp vụ.
3. **An Toàn Mã QR Nhận Hàng**:
   - QR Token phải được ký mã hóa bằng thuật toán HMAC-SHA256 (`jti`, `order_id`, `expire_at`), chỉ có giá trị dùng 1 lần duy nhất (`is_used = true` sau khi quét).
   - Luôn đi kèm mã dự phòng ngẫu nhiên 6 ký tự để nhân viên quầy nhập tay khi camera hỏng.
4. **Tách Biệt Lõi Xác Định và AI (Core vs AI Separation)**:
   - Lõi nghiệp vụ (Giao dịch, Giữ suất, Dự báo thống kê, Định giá sàn, Đối soát tuần) phải chạy độc lập và hoạt động bình thường ngay cả khi dịch vụ AI Gemini bị gián đoạn hoặc hết hạn mức.
   - AI chỉ đóng vai trò chuyển hóa ngôn ngữ tự nhiên, phân tích tóm tắt và hỗ trợ soạn thảo nội dung theo schema có kiểm soát.

---

## 6. Bảng Checklist Kiểm Tra Trước Khi Push (Pre-Push Checklist)

| STT | Hạng mục kiểm tra | Lệnh xác thực | Trạng thái bắt buộc |
|---|---|---|---|
| 1 | Đã đồng bộ `main` và `development` từ remote trước khi phân nhánh | `git fetch origin --prune; git pull origin main; git pull origin development` | Hoàn tất trước khi code |
| 2 | Đang đứng trên nhánh chức năng (không phải `main` / `development`) | `git branch --show-current` | `feature/*` hoặc `fix/*` hoặc `docs/*` |
| 3 | Đã chuẩn hóa code bằng ESLint / Linter | `npm run lint` | Pass (0 error) |
| 4 | Biên dịch Typescript không có lỗi | `npm run build` | Thành công |
| 5 | Chạy Unit Test kiểm thử logic | `npm run test` | Pass |
| 6 | Đã kéo cập nhật mới nhất từ `development` về trước khi push | `git pull origin development` | Already up to date / Đã merge |
| 7 | Định dạng commit đúng `feat:`, `update:`, `fix:` kèm `[scope]` | `git log -1` | Hợp lệ theo mục 2 |

---

## 7. Quy Tắc Quy Trình Code Với Custom Slash Commands

Khi Claude Code được cấu hình các lệnh trong `~/.claude/commands/`, sử dụng lệnh phù hợp với phạm vi công việc để chuẩn hóa quy trình. Các lệnh này hỗ trợ thực hiện quy tắc dự án, không thay thế việc đọc code hiện có, chạy kiểm thử hoặc xác minh kết quả thực tế.

1. **Làm rõ yêu cầu và lập kế hoạch**:
   - Với tính năng hoặc thay đổi có nhiều bước, dùng `/spec` để xác định mục tiêu, phạm vi, tiêu chí nghiệm thu và các trường hợp biên trước khi code.
   - Dùng `/plan` để chia công việc thành các tác vụ nhỏ, có thứ tự và kết quả kiểm chứng được.
2. **Triển khai theo lát cắt nhỏ**:
   - Dùng `/build` để triển khai từng lát cắt hoàn chỉnh; giữ thay đổi đúng phạm vi, tuân thủ các quy tắc tại mục 4 và mục 5.
   - Không coi nội dung do AI đề xuất là sự thật nếu chưa đối chiếu với code, dependency và cấu hình hiện có.
3. **Kiểm thử và giữ chuẩn chất lượng**:
   - Dùng `/test` để chọn và chạy kiểm thử phù hợp với thay đổi. Báo cáo chính xác lệnh đã chạy và kết quả; không tuyên bố kiểm thử đạt nếu chưa thực thi.
   - Dùng `/constraints` để xác định các ngưỡng chất lượng liên quan trước thay đổi lớn. Không hạ ngưỡng, bỏ qua hoặc xóa kiểm tra để làm cho build/test đạt.
4. **Rà soát và đơn giản hóa**:
   - Dùng `/review` để rà soát thay đổi trước khi merge; xử lý các lỗi ảnh hưởng tính đúng đắn, bảo mật, dữ liệu hoặc khả năng vận hành.
   - Dùng `/code-simplify` khi cần giảm độ phức tạp; việc đơn giản hóa phải giữ nguyên hành vi và vẫn vượt qua các kiểm thử liên quan.
5. **Hiệu năng web và phát hành**:
   - Dùng `/webperf` cho thay đổi có khả năng ảnh hưởng tốc độ tải, tương tác hoặc tài nguyên của web; đánh giá bằng số liệu hoặc phép đo phù hợp, không tối ưu dựa trên phỏng đoán.
   - Dùng `/ship` khi chuẩn bị phát hành để kiểm tra các điều kiện hoàn tất. Chỉ phát hành khi các kiểm tra bắt buộc trong mục 6 đạt và thay đổi đã được rà soát.
6. **Áp dụng theo phạm vi**:
   - Không bắt buộc chạy mọi lệnh cho mỗi thay đổi nhỏ; chọn các bước phù hợp, nhưng không được bỏ qua yêu cầu kiểm thử, lint, build và rà soát vốn áp dụng cho thay đổi.
   - Nếu môi trường không có một slash command, thực hiện trực tiếp các bước tương ứng theo quy tắc này; không xem việc thiếu command là lý do để bỏ qua quy trình.
