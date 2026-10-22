# SURPLUSIQ — BỘ QUY TẮC DESIGN SYSTEM & UI IMPLEMENTATION

**Phiên bản:** 1.0  
**Nguồn tham chiếu:** `CalAI_FINAL_Design_Code_Rules.md` và `SurplusIQ_BRD_UC_Status.xlsx`  
**Phạm vi:** Ứng dụng Android cho Khách hàng và giao diện web responsive cho Chủ cửa hàng  
**Định vị:** Nền tảng cứu món ăn ngon cuối ngày — giúp khách mua được món tốt với giá hợp lý, giúp cửa hàng giảm hao hụt và biến dữ liệu vận hành thành quyết định rõ ràng.

> Đây là bộ quy tắc riêng cho SurplusIQ, không phải bản sao của CalAI. CalAI dùng “Dark Luxury Canvas” cho sản phẩm wellness; SurplusIQ dùng **Soft Market Intelligence**: nền sáng như giấy thực phẩm sạch, các mảng pastel có chiều sâu như tem nhãn cửa hàng, và dữ liệu vận hành được trình bày sắc sảo nhưng không lạnh như phần mềm kế toán.

---

## 0. Mục tiêu chất lượng

Mọi màn hình, từ Home, bản đồ, deal, QR nhận hàng đến modal xác nhận hoàn tiền và trang cài đặt gói Pro, phải đạt đồng thời:

`FUNCTIONAL + CLEAR + WARM + RESPONSIVE + FAST + ACCESSIBLE + TRUSTWORTHY + DELIGHTFUL`

Trong 1–2 giây, người dùng phải hiểu được mình đang ở đâu, điều gì quan trọng nhất và bước tiếp theo là gì.

SurplusIQ không được trông như một ứng dụng coupon đại trà, một dashboard BI khô cứng, hay một ứng dụng “xanh” dùng quá nhiều màu lá. Chất lượng thị giác phải đến từ thứ bậc thông tin, vật liệu bề mặt, khoảng thở, dữ liệu đúng ngữ cảnh và tương tác có phản hồi — không đến từ việc phủ gradient, icon hay bóng đổ lên mọi thành phần.

### 0.1. Hai trải nghiệm, một thương hiệu

**Khách hàng trên mobile** cần cảm giác nhanh, gần gũi và có động lực hành động: tìm deal gần, hiểu món, giữ suất, thanh toán và nhận hàng không bối rối.

**Chủ cửa hàng trên web** cần cảm giác kiểm soát và đáng tin: biết hôm nay còn bao nhiêu suất, đơn nào cần xử lý, tiền và hao hụt ra sao, khi nào nên giảm giá hoặc nâng cấp Pro.

Hai trải nghiệm dùng chung màu, type, radius, icon, trạng thái và giọng điệu; nhưng không ép cùng một layout. Mobile ưu tiên một cột và thao tác bằng ngón tay. Web ưu tiên vùng làm việc rộng, bảng dữ liệu, bộ lọc, phím tắt và nhiều thông tin có thể so sánh.

---

# 1. Tư duy thiết kế đặc trưng SurplusIQ

## 1.1. Big idea: “Good food, right moment”

SurplusIQ biến món ăn sắp hết khung bán thành một cơ hội có thời hạn. Vì vậy giao diện cần kết hợp hai cảm giác:

- **Tươi và thân thiện:** màu pastel, hình ảnh món ăn, bo góc mềm, copy đời thường.
- **Rõ và có nhịp thời gian:** chip “Còn 42 phút”, thanh thời hạn, trạng thái đơn và số suất phải dễ quét.

Đừng biến thời hạn thành cảnh báo đỏ ở khắp nơi. Chỉ dùng màu nóng khi thời gian hoặc trạng thái thực sự cần chú ý.

## 1.2. Một điểm nhấn đáng nhớ

Điểm nhận diện chính là **“Deal Tile nổi như tem giấy dán trên khay món”**: card có một góc màu pastel, đường viền đứt hoặc notch nhỏ ở cạnh phải để gợi liên tưởng đến nhãn giảm giá; phần giá, số suất và thời gian vẫn là nội dung chính. Không dùng notch trên mọi card. Chỉ dùng cho deal nổi bật, chiến dịch hoặc túi bất ngờ.

Dashboard cửa hàng không dùng kiểu tem dán; thay vào đó dùng **“Control Surface”**: các khối số liệu phẳng hơn, đường baseline rõ, nhấn màu theo trạng thái và có chart dễ đọc.

## 1.3. Những điều cấm

- Không dùng emoji thay icon giao diện.
- Không dùng màu xanh lá cho mọi thứ liên quan đến tác động môi trường.
- Không dùng nền gradient toàn app.
- Không biến mọi card thành cùng một loại “bo 24 + bóng mờ”. Radius và elevation phải thể hiện thứ bậc.
- Không đặt quá nhiều badge, chip, icon và số trong một card deal.
- Không dùng ảnh món ăn chất lượng thấp, crop lệch hoặc có ánh sáng không đồng nhất.
- Không để trạng thái thanh toán, hoàn tiền, khiếu nại hoặc gói Pro chỉ được phân biệt bằng màu.
- Không tạo fake success khi API chưa xác nhận.
- Không làm Home đẹp nhưng Add/Edit/Modal dùng component mặc định của nền tảng.
- Không hiển thị “Something went wrong”; phải nói người dùng có thể làm gì tiếp theo.

---

# 2. Token nền tảng

Mọi screen và component phải sử dụng semantic token. Không hardcode màu trong screen. Tên token có thể ánh xạ sang CSS variables, Material Theme, Compose `ColorScheme` hoặc hệ thống theme hiện có.

## 2.1. Palette cốt lõi

| Token | Hex | Vai trò |
|---|---|---|
| `sqInk` | `#243033` | Chữ chính, icon chính, tiêu đề |
| `sqInkSoft` | `#536164` | Chữ phụ, mô tả |
| `sqInkMuted` | `#879394` | Metadata, placeholder, trạng thái chưa chọn |
| `sqCanvas` | `#FFF9F2` | Nền chính, ấm nhưng gần trắng |
| `sqSurface` | `#FFFFFF` | Card, sheet, dialog, input |
| `sqSurfaceSoft` | `#F7F1EA` | Nhóm nội dung phụ, vùng lọc |
| `sqLine` | `#E9E1D9` | Border và divider |
| `sqCoral` | `#F2766A` | Brand, CTA chính, deal nóng vừa phải |
| `sqCoralDeep` | `#D95A58` | Pressed, text accent, error gần brand |
| `sqCoralWash` | `#FFE3DE` | Nền pastel coral |
| `sqButter` | `#F6C85F` | Sắp hết, khuyến mãi, thời gian cần chú ý |
| `sqButterWash` | `#FFF1C9` | Nền pastel vàng |
| `sqMint` | `#71C7A3` | Đã nhận, tác động tích cực, giảm hao hụt |
| `sqMintDeep` | `#318A6A` | Chữ success trên nền sáng |
| `sqMintWash` | `#DDF3E8` | Nền pastel mint |
| `sqLilac` | `#A99AE9` | AI, Pro, insight, đề xuất |
| `sqLilacWash` | `#ECE8FF` | Nền pastel AI/Pro |
| `sqSky` | `#8AC8E8` | Bản đồ, thông tin, giao nhận |
| `sqSkyWash` | `#E1F2FA` | Nền pastel information |
| `sqError` | `#C84E56` | Lỗi, hủy, hành động phá hủy |
| `sqWarning` | `#A96B18` | Cảnh báo trên nền sáng |
| `sqInfo` | `#3D73A8` | Thông tin trên nền sáng |
| `sqOverlay` | `rgba(28, 35, 36, 0.42)` | Scrim modal/bottom sheet |

### Quy tắc màu

- Một màn thông thường chỉ có **1 màu hành động chính + 1 màu ngữ nghĩa phụ + neutral**.
- Màn deal có thể dùng coral + butter; màn nhận hàng có thể dùng mint + sky; AI dùng lilac + coral. Không dùng đủ sáu màu accent trong cùng một vùng.
- Màu pastel dùng làm nền hoặc điểm nhấn lớn; chữ nhỏ trên pastel phải dùng màu deep tương ứng, không dùng chữ trắng trên nền nhạt.
- `sqCoral` dành cho hành động chính và brand. Không dùng coral cho mọi tiêu đề, icon và card.
- Màu xanh lá đậm chỉ cho trạng thái “đã hoàn tất / tác động tích cực / giảm hao hụt”, không dùng để trang trí chung.
- Không dùng màu sắc là cách duy nhất để truyền trạng thái: luôn kèm nhãn, icon hoặc pattern.

## 2.2. Gradient có kiểm soát

Gradient là lớp vật liệu hiếm, không phải mặc định:

```css
--gradient-coral: linear-gradient(135deg, #F2766A 0%, #FF9A83 100%);
--gradient-mint: linear-gradient(135deg, #71C7A3 0%, #A9DEC3 100%);
--gradient-lilac: linear-gradient(135deg, #A99AE9 0%, #C7BDF4 100%);
--gradient-butter: linear-gradient(135deg, #F6C85F 0%, #FFE49A 100%);
```

Chỉ dùng cho CTA hero, deal nổi bật, progress/impact chart, AI insight và gói Pro. Không dùng gradient cho body, bảng dữ liệu, mọi card trong cùng một danh sách hay border của input.

## 2.3. Surface và elevation

SurplusIQ tạo cảm giác “nổi lên màn hình” bằng **một shadow mềm + contrast bề mặt + border rất nhẹ**, không dùng bóng đen dày.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `elevation-none` | không shadow | bảng, list row, vùng nền |
| `elevation-low` | `0 3px 12px rgba(67, 52, 42, .055)` | card thường |
| `elevation-mid` | `0 8px 24px rgba(67, 52, 42, .09)` | card nổi, bottom nav, popover |
| `elevation-high` | `0 16px 40px rgba(67, 52, 42, .14)` | dialog, sheet, floating CTA |
| `elevation-coral` | `0 7px 20px rgba(242, 118, 106, .22)` | CTA coral, chỉ khi action là trọng tâm |

Card nền trắng trên `sqCanvas` dùng `elevation-low` hoặc border. Chỉ card được chọn, hero hoặc floating element mới dùng `elevation-mid`. Dark theme không đảo shadow thành đen hơn; dùng surface contrast và viền 1px.

## 2.4. Dark theme tùy chọn

Nếu sản phẩm hỗ trợ dark mode, đây là ánh xạ chính thức, không phải phép đảo màu:

| Token sáng | Dark token | Hex |
|---|---|---|
| Canvas | `sqDarkCanvas` | `#191B1B` |
| Surface | `sqDarkSurface` | `#232626` |
| Surface soft | `sqDarkSurfaceSoft` | `#2C3030` |
| Elevated | `sqDarkElevated` | `#353A38` |
| Line | `sqDarkLine` | `#414846` |
| Ink | `sqDarkInk` | `#F7F2EA` |
| Ink soft | `sqDarkInkSoft` | `#C2C8C4` |
| Ink muted | `sqDarkInkMuted` | `#919A96` |
| Coral | `sqDarkCoral` | `#FF8B7F` |
| Mint | `sqDarkMint` | `#82D6B0` |
| Butter | `sqDarkButter` | `#FFD477` |
| Lilac | `sqDarkLilac` | `#B9ACF5` |

Giữ nguyên semantics, layout và thứ bậc. Giảm opacity glow trên nền tối; không làm pastel thành neon.

---

# 3. Typography

## 3.1. Font

Ưu tiên `Plus Jakarta Sans` cho chữ giao diện nếu stack cho phép: hình học mềm, hiện đại, đọc tốt ở giá và số lượng. Dùng một family xuyên suốt để giữ cảm giác sản phẩm thống nhất. Nếu nền tảng đã có font chuẩn và việc đổi font gây rủi ro, dùng font hiện có nhưng giữ scale và weight bên dưới.

Không dùng font display trang trí cho tiêu đề sản phẩm; SurplusIQ cần đáng tin khi hiển thị tiền, thời hạn, hoàn tiền và quy tắc gói.

## 3.2. Scale

| Token | Size | Weight | Line height | Dùng cho |
|---|---:|---:|---:|---|
| `display` | 32px | 750 | 1.12 | onboarding, số tác động lớn |
| `h1` | 28px | 750 | 1.18 | title màn chính |
| `h2` | 22px | 700 | 1.25 | section, deal title lớn |
| `h3` | 18px | 700 | 1.3 | card/detail title |
| `body-lg` | 16px | 450 | 1.5 | mô tả quan trọng |
| `body` | 14px | 450 | 1.5 | nội dung chuẩn |
| `body-medium` | 14px | 650 | 1.45 | label/action phụ |
| `caption` | 12px | 500 | 1.4 | metadata, thời gian |
| `overline` | 11px | 700 | 1.3 | chỉ dùng cho nhóm dữ liệu cần phân loại |
| `button` | 14–16px | 700 | 1.0 | CTA |

Tiêu đề dùng sentence case, không viết hoa toàn bộ. Số tiền, số suất và phần trăm dùng tabular numerals. Không giảm caption dưới 11px.

## 3.3. Quy tắc viết nội dung

Dùng động từ cụ thể: “Giữ suất”, “Thanh toán”, “Chỉ đường”, “Báo sắp đến”, “Hoàn tiền”. Không dùng “Submit”, “Continue” hoặc “Something went wrong” nếu có thể mô tả hành động thật.

Tên thao tác phải nhất quán trong toàn flow: nút “Giữ suất” → toast “Đã giữ suất”; nút “Lưu thay đổi” → success “Đã lưu thay đổi”.

AI phải nói rõ nguồn và mức độ chắc chắn khi cần: “Gợi ý dựa trên 18 đơn gần đây”, “AI chưa đủ dữ liệu để kết luận”. Không dùng wording khiến người dùng nghĩ AI đã thực hiện hành động nếu hệ thống chưa xác nhận.

---

# 4. Spacing, grid, radius

## 4.1. Spacing scale

Chỉ dùng: `4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64px`.

- Padding mobile chuẩn: 20px; màn cần nhiều không gian có thể 24px.
- Padding web: 24px trên panel, 32px ở page shell lớn.
- Khoảng giữa section: 24–32px.
- Khoảng giữa label và control: 8px.
- Khoảng giữa các field liên quan: 16px.
- Khoảng giữa các nhóm không liên quan: 24px.
- Khoảng dưới bottom navigation: thêm safe-area + 24px.

## 4.2. Radius

| Token | Radius | Dùng cho |
|---|---:|---|
| `radius-xs` | 6px | badge nhỏ, bảng |
| `radius-sm` | 10px | input, compact control |
| `radius-md` | 14px | button, row, chip |
| `radius-lg` | 18px | card chuẩn |
| `radius-xl` | 24px | deal tile, summary card |
| `radius-2xl` | 30px | hero, sheet lớn |
| `radius-pill` | 999px | chip, filter, avatar |

Không dùng quá bốn radius trong cùng một screen. Radius càng lớn thì bề mặt càng có vai trò lớn; không dùng `radius-2xl` cho icon button nhỏ.

## 4.3. Touch target và safe area

Touch target tối thiểu 44×44px. Icon visual chuẩn 20–22px, container 44–48px. Tôn trọng safe area và bàn phím. Không để CTA hoặc tab cuối bị bottom nav che.

---

# 5. Icon, ảnh và minh họa

## 5.1. Icon system

Chọn một họ duy nhất, ưu tiên Lucide hoặc Phosphor nếu stack chưa có thư viện. Stroke 1.75–2px, đầu nét bo tròn, icon 20–24px. Icon trạng thái có thể dùng filled circle nền pastel + icon line bên trong.

Icon phải giải thích hành động: bản đồ, giỏ/đơn, QR, chuông, lịch, ví, khiếu nại, cửa hàng, AI, biểu đồ. Không dùng icon bánh mì, túi đồ ăn hoặc lá cây chỉ để trang trí nếu không có thông tin cần truyền.

## 5.2. Hình ảnh món ăn

Ảnh món là tài sản thương mại quan trọng. Tỉ lệ crop ưu tiên 4:3 hoặc 1:1, chủ thể nằm rõ, nền không quá rối, overlay giá/thời gian không che món. Nếu ảnh lỗi, dùng một placeholder minh họa hình học màu `sqButterWash` + icon món ăn; không để ô vỡ hoặc ảnh ngẫu nhiên.

Các ảnh trong cùng một list phải có độ sáng và radius nhất quán. Không trộn ảnh stock quá bóng với ảnh cửa hàng chụp điện thoại nếu không có xử lý crop/overlay thống nhất.

## 5.3. Minh họa pastel

Khác CalAI, SurplusIQ không cần nhân vật 3D xuất hiện dày. Bộ minh họa nên là **soft editorial objects**: túi giấy cứu món, hộp bánh, tem deal, giỏ nhỏ, mặt trời cuối ngày; chất liệu matte, ánh sáng trên-trái, bóng mềm dưới-phải, màu coral/mint/butter/lilac.

Chỉ dùng minh họa ở onboarding, empty state lần đầu, hoàn thành nhận hàng, huy hiệu tác động, AI chưa có hội thoại và Pro. Không dùng ở bản đồ, bảng, chart, lịch sử đơn hoặc form nhiều field. Nếu chưa có bộ asset chung, dùng hình học vector đơn giản cùng token thay vì tải ảnh 3D rời rạc.

---

# 6. Component library bắt buộc

Tên component có thể điều chỉnh theo framework, nhưng phải tồn tại một thư viện tương đương:

```text
SqButton              SqIconButton           SqCard
SqDealTile             SqMerchantMetric        SqSearchField
SqInput                SqOtpInput              SqSelect
SqDateTimePicker       SqFilterChip            SqStatusBadge
SqTabBar               SqBottomNav             SqTopBar
SqMapPin               SqQuantityStepper       SqTimerBar
SqPriceBlock           SqOrderTimeline         SqQrCodePanel
SqToast                SqSnackbar              SqModal
SqBottomSheet          SqConfirmDialog         SqSkeleton
SqEmptyState           SqErrorState            SqOfflineState
SqPermissionCard       SqAiMessage             SqAiInsight
SqProgressRing         SqChartCard             SqDataTable
SqPagination            SqPlanGate              SqIllustration
```

Component dùng `state` và `callback` qua tham số; không tự gọi API, repository hay xử lý business rule. Ví dụ:

```kotlin
SqDealTile(
    deal = deal,
    onOpen = onOpenDeal,
    onSave = onSaveDeal,
    onReserve = onReserveDeal,
)
```

## 6.1. Buttons

Variant gồm Primary coral, Secondary surface, Outline, Tertiary text, Destructive, Icon và Loading.

- Chiều cao chuẩn mobile: 48–52px; web: 40–48px tùy density.
- Primary dùng `sqCoral` hoặc gradient coral có shadow coral rất nhẹ.
- Pressed: scale 0.97, translateY 1px, shadow giảm; 120–180ms.
- Loading: giữ chiều rộng và label không nhảy; spinner nhỏ + vô hiệu hóa duplicate submit.
- Disabled: giảm contrast nhưng vẫn đọc được; không chỉ dựa vào opacity quá thấp.
- CTA phải nói kết quả: “Giữ 2 suất”, “Thanh toán 96.000đ”, “Lưu bộ lọc”.

## 6.2. Deal Tile

Cấu trúc chuẩn:

```text
[Ảnh món 4:3]                 [bookmark]
[badge: Còn 42 phút]
Tên deal / tên cửa hàng
Giá mới     Giá gốc gạch ngang
[2.1 km]   [còn 4 suất]
[Giữ suất]
```

Một tile chỉ có một hành động chính. Nếu card nằm trong list khám phá, dùng “Xem deal” hoặc mở toàn tile; không đặt ba CTA cạnh nhau. Giá mới phải nổi bật nhất sau ảnh; thời hạn và số suất là metadata có ngữ nghĩa.

## 6.3. Status badge

Badge luôn có icon hoặc label, không chỉ có chấm màu.

- Đang mở: mint wash + “Đang nhận đặt”
- Sắp hết: butter wash + “Còn ít suất”
- Hết suất: neutral + “Đã hết”
- Chờ thanh toán: sky wash + “Chờ xác nhận”
- Đã thanh toán: mint wash + “Đã thanh toán”
- Đã nhận: mint deep nhẹ + “Đã nhận hàng”
- Đã hủy/hoàn tiền: coral wash + “Đã hoàn tiền”
- Khiếu nại đang xử lý: lilac wash + “Đang xem xét”

## 6.4. Timer bar

Dùng cho hold, khung nhận và deadline khiếu nại. Hiển thị cả label và thời gian, ví dụ “Giữ suất còn 08:42”. Khi còn ít thời gian, đổi từ coral/butter sang error semantic theo threshold nghiệp vụ; không tự đổi màu nếu chưa có rule.

## 6.5. Plan gate

Khi tính năng bị giới hạn bởi gói:

```text
[icon Pro] Tính năng này thuộc Pro
Xem dự báo ngày mai, độ tin cậy và gợi ý số suất.
Còn 0 lượt / Đặt lại vào 01/11 (nếu là quota)
[Xem gói Pro] [Để sau]
```

Không giấu tính năng bằng một disabled button không giải thích. Phân biệt “chưa đủ quyền”, “hết hạn mức”, “tài khoản chưa hoạt động” và “hệ thống tạm lỗi”.

## 6.6. Form

Cấu trúc: label → control → helper → error. Placeholder không thay label. Focus có border brand và ring nhẹ. Error có icon + câu hướng dẫn sửa.

Mọi form Save phải theo flow:

`Input → Validate → Disable duplicate → Loading → API → Success/Error → cập nhật state ngay → feedback`

Màn Add/Edit/Modal có cùng chất lượng với Home: header rõ, card/input đúng token, CTA có pressed/loading/success, không dùng dialog hoặc text field mặc định của OS.

## 6.7. Bảng dữ liệu cho merchant web

Bảng dùng nền `sqSurface`, header có contrast nhẹ, hàng cao tối thiểu 48px, số căn phải, text căn trái. Không dùng zebra stripe đậm. Trạng thái có badge. Row hover chỉ là feedback nhẹ; keyboard focus nhìn thấy rõ.

Trên màn hình hẹp, bảng chuyển thành card list hoặc cho phép scroll ngang có chủ đích; không ép tám cột vào một viewport.

---

# 7. Navigation và information architecture

## 7.1. Khách hàng mobile

Bottom navigation tối đa 4–5 điểm đến:

1. **Khám phá** — deal gần, tìm kiếm, bản đồ, bộ lọc.
2. **Đơn của tôi** — đơn đang giữ, thanh toán, lịch sử, QR nhận.
3. **Đã lưu** — deal/cửa hàng yêu thích, cảnh báo.
4. **Tác động** — thống kê cá nhân, huy hiệu, lịch sử hoàn tiền/ưu đãi nếu phù hợp.
5. **Tài khoản** — hồ sơ, dị ứng/ăn uống, thông báo, bảo mật, hỗ trợ.

Trợ lý Cứu Món là FAB hoặc entry point trong Khám phá/Đơn, không nhất thiết chiếm một tab nếu dữ liệu sử dụng chưa đủ để biện minh.

Bottom nav dạng dock nổi: nền surface, radius 20px, shadow mid, active item có pill coral wash + icon coral; label active luôn hiện, item inactive không dùng màu quá nhạt.

## 7.2. Merchant web

Sidebar desktop gồm:

- Hôm nay
- Suất & tồn kho
- Đơn hàng
- Món
- Báo cáo & tác động
- Dự báo & giá Pro
- Ưu đãi & chiến dịch
- Khách hàng
- Nhân viên
- Trợ lý AI
- Cài đặt cửa hàng

Top bar có cửa hàng hiện tại, trạng thái đang hoạt động/tạm ngưng, thông báo, gói hiện tại và avatar. Trên tablet sidebar thu gọn thành icon có tooltip; trên mobile web chuyển thành drawer hoặc bottom action bar.

## 7.3. Back và deep link

Back quay về context trước, không luôn đưa về Home. Deep link từ notification phải mở đúng deal, đơn, khiếu nại hoặc báo cáo; nếu phiên hết hạn, lưu đích đến và đưa người dùng về sau khi đăng nhập thành công.

---

# 8. Inventory màn hình và thứ tự ưu tiên

## 8.1. Khách hàng mobile

### P0 — luồng tạo giá trị chính

- Welcome/onboarding và giải thích quyền vị trí.
- Đăng ký, OTP, đăng nhập, quên/đặt lại mật khẩu.
- Khám phá deal gần.
- Tìm kiếm, bộ lọc, sắp xếp và bản đồ.
- Chi tiết deal và chi tiết cửa hàng.
- Chọn số lượng, chọn giờ nhận, ghi chú, áp dụng ưu đãi.
- Giữ suất và thanh toán VietQR/cổng giả lập.
- Đơn đang giữ, thanh toán chưa xác định, chi tiết đơn.
- QR nhận hàng, báo sắp đến, xác nhận đã nhận.
- Trạng thái hết hạn, hủy, hoàn tiền.

### P1 — giữ chân và tin cậy

- Đơn của tôi và bộ lọc/tìm đơn.
- Lưu deal/cửa hàng, lịch sử đã xem, so sánh deal.
- Thông báo giao dịch và nhắc giờ nhận.
- Khiếu nại, bổ sung bằng chứng, trao đổi và đánh giá.
- Ví ưu đãi, lịch sử dùng ưu đãi.
- Hồ sơ ăn uống/dị ứng và địa điểm quen thuộc.
- Thống kê tác động và huy hiệu.

### P2 — AI, bảo mật và hỗ trợ

- Cứu Món: hỏi deal tự nhiên, hỏi thành phần, hướng dẫn nhận hàng.
- Gợi ý cá nhân hóa kèm lý do và điều chỉnh sở thích.
- Soạn khiếu nại từ ảnh.
- Chuyển người hỗ trợ, lịch sử/xóa chat, đánh giá chất lượng AI.
- 2FA, thiết bị đăng nhập, xuất dữ liệu, xóa/hủy yêu cầu xóa tài khoản.
- FAQ và hỗ trợ người thật.

## 8.2. Merchant web

### P0 — vận hành hàng ngày

- Đăng ký cửa hàng, xác minh email, đăng nhập.
- Dashboard hôm nay: suất, đơn, doanh thu, việc cần làm.
- Danh mục món: tìm/lọc/sắp xếp, tạo/sửa/lưu trữ/khôi phục.
- Tạo suất, nhân bản hôm qua, chỉnh tồn kho có lý do, đóng/hủy suất.
- Danh sách đơn, lọc, xuất, chi tiết, quét QR.
- Khiếu nại và phản hồi đánh giá.
- Hồ sơ cửa hàng, giờ nhận mặc định, giá sàn, tạm ngưng/mở lại.

### P1 — tối ưu vận hành

- Dự báo số lượng, giải thích, độ tin cậy và phương án dự phòng.
- Định giá động, duyệt/từ chối/đặt giá thủ công.
- Báo cáo doanh thu, món, giờ bán, hao hụt và thu hồi.
- Đối soát, sao kê, xuất CSV/PDF, so sánh kỳ.
- Ưu đãi, túi bất ngờ, chiến dịch và hiệu quả.
- Việc cần làm, nhắc việc, ngày nghỉ và lịch hẹn.
- Cảnh báo chất lượng dữ liệu và cập nhật hàng loạt.

### P2 — tổ chức và intelligence

- Nhân viên và phân quyền.
- Khách đã mua, nhóm khách, khách thường không đến nhận.
- Quy tắc kinh doanh, lịch sử thay đổi, xuất dữ liệu.
- Mô phỏng chính sách và so sánh các lần thử.
- AI hỏi đáp dữ liệu, phát hiện bất thường, giải thích nguyên nhân, đề xuất hành động, soạn nội dung, kiểm tra ảnh/hạn dùng, đề xuất chiến dịch.
- Gói Cơ bản/Pro, dùng thử, hạn mức, thanh toán và vòng đời nâng/hạ cấp.

---

# 9. Screen recipe theo nghiệp vụ

## 9.1. Home/Khám phá khách hàng

Hero không phải banner quảng cáo. Mở đầu bằng câu hỏi và hành động:

```text
Gần bạn hôm nay
[ Tìm món, cửa hàng hoặc hỏi Cứu Món... ]
[Deal gần] [Mở bán sớm] [Dưới 50k] [Bánh ngọt]

Deal đang được cứu
[Deal Tile] [Deal Tile]

Bản đồ gần bạn                         Xem bản đồ
```

Nếu vị trí chưa được cấp, hiển thị Permission Card giải thích lợi ích và phương án nhập địa chỉ tay. Không khóa toàn bộ app chỉ vì user từ chối location.

## 9.2. Chi tiết deal

Thứ tự: ảnh → tên và cửa hàng → giá/số suất/thời hạn → thông tin món và dị ứng → giờ nhận → chỉ đường → CTA giữ suất cố định ở đáy.

CTA cố định chỉ hiển thị khi còn khả năng thao tác. Khi hết suất, chuyển thành “Đã hết suất” + “Xem deal tương tự”; không để button trông còn bấm được.

## 9.3. Checkout và thanh toán

Tóm tắt đơn phải cho thấy: món, số lượng, giờ nhận, giá gốc, ưu đãi, phí nếu có, tổng phải trả. Nếu mã ưu đãi không được áp dụng, nêu rõ lý do và số tiền sau khi kiểm tra server.

VietQR có trạng thái “Đang chờ xác nhận” riêng; không tự hiển thị thành công chỉ vì đã mở app ngân hàng. Cho nút “Kiểm tra lại” khi thanh toán chưa xác định.

## 9.4. QR nhận hàng

Màn QR là màn tập trung: mã lớn, độ tương phản cao, thời gian/khung nhận rõ, tên người nhận và mã đơn ngắn. Có nút “Báo sắp đến” và hướng dẫn “Đưa mã này cho cửa hàng quét”. Không đặt quá nhiều nội dung phụ cạnh QR.

## 9.5. Khiếu nại

Wizard tối đa các bước cần thiết: chọn lý do → mô tả → bằng chứng → xem lại và gửi. Trạng thái dùng timeline: Đã gửi, Cửa hàng đang xem, Cần bổ sung, Đã giải quyết. Mỗi bước nói rõ SLA hoặc hành động tiếp theo nếu nghiệp vụ có quy định.

## 9.6. Merchant dashboard

Dashboard hôm nay ưu tiên quyết định, không phải trang trí:

```text
[Ngày hôm nay] [Đang hoạt động] [Thông báo]

Cần xử lý ngay
[Đơn chờ nhận] [Suất sắp hết giờ] [Khiếu nại gần hạn]

Tổng quan hôm nay
[Suất đã bán] [Doanh thu] [Món được cứu] [Tỷ lệ thu hồi]

Dòng thời gian bán hàng / theo giờ

Việc cần làm hôm nay
```

Một chart chính mỗi vùng. Các metric card phải trả lời một câu hỏi vận hành; không đặt 12 KPI ngang hàng.

## 9.7. Dự báo và giá Pro

Không trình bày AI như lời tiên tri. Card dự báo cần có:

- Con số đề xuất và khoảng tin cậy.
- Dữ liệu/giải thích ngắn: “Dựa trên 14 ngày, thứ Sáu và mưa nhẹ”.
- Mức độ tin cậy: Cao/Vừa/Thấp, kèm câu giải thích.
- Phương án dự phòng khi tin cậy thấp.
- CTA rõ: “Chấp nhận 18 suất”, “Sửa số lượng”, “Xem dữ liệu”.

Mọi quyết định vẫn thuộc về chủ cửa hàng. AI chỉ gợi ý; hệ thống kiểm tra điều kiện trước khi thực hiện thay đổi thật.

## 9.8. Gói dịch vụ

Gói Cơ bản, Pro dùng thử và Pro phải so sánh bằng quyền lợi thực tế, không chỉ bằng danh sách marketing. Hiển thị giá, thời hạn, hạn mức đã dùng/còn lại, ngày hết hạn, hành vi khi hết hạn và nút hành động phù hợp.

- Pro dùng thử: hiển thị ngày kết thúc rõ, không tạo cảm giác tự động gia hạn nếu MVP không tự động gia hạn.
- Giao dịch chưa rõ: trạng thái chờ tối đa theo nghiệp vụ; chưa cấp quyền Pro.
- Hạ cấp: báo hiệu lực cuối kỳ và dữ liệu vượt hạn mức không bị xóa.
- Hạn mức: hiển thị “Còn 2/10 ưu đãi đang chạy”, không chỉ khóa nút.

---

# 10. States bắt buộc

Mọi màn/API quan trọng phải có `Loading → Success → Empty → Error → Retry`, và thêm Offline/Permission/Locked khi phù hợp.

## 10.1. Loading

- List/card/chart: skeleton mô phỏng đúng layout.
- AI đang phân tích ảnh hoặc đang suy luận: có animation mềm cố định + text “Đang đọc ảnh món…”; không dùng spinner vô danh.
- Thanh toán/Save: loading nằm trong CTA, giữ context, chặn gửi lặp.
- Không loading vô hạn; mọi request phải reset state khi success, error, cancel hoặc timeout.

## 10.2. Empty

Empty state phải chỉ ra lý do và bước tiếp theo:

- Chưa có deal gần: “Chưa có deal trong bán kính này. Mở rộng khu vực hoặc tạo cảnh báo.”
- Chưa có đơn: “Đơn đầu tiên của bạn có thể bắt đầu từ một deal gần.”
- Chưa có ưu đãi: “Bạn chưa lưu ưu đãi nào.”
- Merchant chưa có món: “Thêm món đầu tiên để tạo suất cuối ngày.”

Minh họa pastel chỉ dùng khi giúp người dùng hiểu và hành động, không dùng để che thiếu nội dung.

## 10.3. Error

Error nói nguyên nhân và hành động:

- Network: “Không kết nối được. Kiểm tra mạng rồi thử lại.”
- Payment unknown: “Chưa xác định được kết quả thanh toán. Bạn có thể kiểm tra lại, không cần thanh toán lần nữa.”
- Permission denied: “Bạn vẫn có thể nhập địa chỉ bằng tay để tìm deal.”
- Quota: “Bạn đã dùng hết 10 lượt AI tháng này. Lượt mới sẽ mở vào 01/11.”
- Auth: “Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.”

---

# 11. Motion và tactile interaction

| Token | Duration | Dùng cho |
|---|---:|---|
| `fast` | 120ms | pressed, chip, icon |
| `standard` | 180ms | button, state change |
| `emphasis` | 240ms | card expand, success |
| `page` | 300ms | chuyển màn, sheet |

Pressed button: scale 0.97 + shadow giảm. Card save/bookmark: icon morph hoặc scale nhẹ, không bounce liên tục. Timer cập nhật không được làm layout nhảy.

Bottom sheet: scrim + slide up + drag handle. Dialog: fade scrim + scale nhẹ. Sau Save thành công: button nén → progress → check → toast; chỉ quay màn khi state đã cập nhật.

Tôn trọng `prefers-reduced-motion` hoặc thiết lập reduced motion của hệ điều hành. Không dùng animation tự chạy cho chart nếu làm chậm việc đọc dữ liệu.

---

# 12. Accessibility và responsive

- Contrast text theo WCAG phù hợp; kiểm tra đặc biệt với chữ nhỏ trên pastel.
- Mọi icon button có accessibility label.
- Không dùng màu duy nhất để phân biệt đơn thanh toán, hủy, hoàn tiền hay khiếu nại.
- Focus ring rõ trên web; keyboard tab đi theo thứ tự đọc.
- Text scaling không làm mất CTA, QR hoặc thời hạn.
- Form lỗi nằm cạnh field tương ứng và có câu sửa.
- Bản đồ luôn có list fallback; người không cấp location vẫn dùng được bằng địa chỉ tay.
- Mobile nhỏ: 320px vẫn không clipping; web tablet không ép sidebar và bảng quá chật.
- Table có responsive alternative, không dùng scroll ngang ẩn mà không có dấu hiệu.
- Bottom nav, sticky CTA và bàn phím phải phối hợp an toàn.

---

# 13. Architecture và nguyên tắc triển khai

Bộ rule này không ép SurplusIQ dùng đúng kiến trúc CalAI. Trước khi code phải kiểm tra framework hiện tại, routing, state, API, auth và styling system. Reuse logic đang chạy; không rewrite backend chỉ để làm UI đẹp.

Dependency rule khuyến nghị:

```text
UI component/screen
    → ViewModel/Controller/Hook
    → Domain use case/service interface
    → Repository
    → API / local storage
```

UI không gọi trực tiếp API, database hoặc payment SDK. Component dùng chung stateless khi có thể; business validation và permission/quota phải ở domain/server, UI chỉ trình bày state.

## 13.1. State model

Mỗi feature quan trọng có một state rõ ràng, tránh nhiều boolean mâu thuẫn:

```kotlin
sealed interface LoadState<out T> {
    data object Idle : LoadState<Nothing>
    data object Loading : LoadState<Nothing>
    data class Success<T>(val data: T) : LoadState<T>
    data class Empty(val message: String) : LoadState<Nothing>
    data class Error(val message: String, val canRetry: Boolean = true) : LoadState<Nothing>
}
```

Form cần tách `idle`, `validating`, `saving`, `saved`, `saveError`; không để một `isLoading` chung khiến button, list và modal phản ứng sai.

## 13.2. API và lỗi

Repository tập trung map HTTP/network/timeout/permission/quota/payment states. UI phải có copy thân thiện cho các lỗi 400, 401, 403, 404, 409, 422, 429, 500, timeout và offline.

Các chức năng AI phải tuân thủ:

- Input dữ liệu lấy từ hệ thống; model chỉ sinh diễn đạt.
- AI không tự thay quyết định của khách/chủ.
- Action thật chỉ chạy sau server kiểm tra điều kiện.
- Lưu audit: request id, feature, phạm vi dữ liệu, model, latency, output và feedback.
- Khi thiếu dữ liệu/timeout/hết quota, hiển thị fallback rõ ràng.

## 13.3. Bảo mật

Không hardcode secret/token/API key. Không log OTP, mật khẩu, QR nhạy cảm hoặc dữ liệu dị ứng không cần thiết. Các luồng đổi mật khẩu, 2FA, thiết bị đăng nhập, xóa tài khoản và dữ liệu cá nhân phải tôn trọng rule trong BRD, không tự suy diễn từ UI.

---

# 14. Những điểm cần gắn cờ khi triển khai

Các mục sau có ảnh hưởng trực tiếp đến UI và không được che bằng thiết kế:

| Mã | Vấn đề cần xử lý trước khi chốt UX |
|---|---|
| `R1-007` | Đổi mật khẩu phải dùng đúng user identity, không fallback UUID cố định |
| `R1-038` | Chỉ đường hiện client-only; cần xác nhận phạm vi kiểm tra server |
| `R1-053` | Phải xác nhận số tiền sau ưu đãi được trừ đúng trước khi hiển thị thành công |
| `R1-083`, `R1-088` | Trợ lý phải đọc trạng thái đơn thật, không chỉ trả câu dựng sẵn |
| `R2-037` | UI phải hiển thị đầy đủ explanation của dự báo |
| `R2-042` | Cần thiết kế rõ confidence thấp và phương án dự phòng |
| `R2-062` | Tách hao hụt và thu hồi, không gộp mơ hồ trong một chart |
| `R2-081` | Nhật ký phải lọc được theo nhân viên |
| `R2-087` | Cần danh sách riêng khách thường không đến nhận |
| `R2-089` | Hiệu quả ưu đãi cần có metric, không chỉ danh sách |
| `R2-090` | Sửa nội dung ưu đãi phải hoạt động, không chỉ bật/tắt |
| `R2-105` | Lưu nhiều lần mô phỏng để so sánh |
| `R2-117` | Phân biệt soạn mô tả món và soạn thông báo |
| `R2-118` | AI cần hỗ trợ cả phản hồi khiếu nại và đánh giá nếu UI quảng bá cả hai |
| `R2-122` | Có cấu hình bật/tắt AI theo feature |
| `R2-126` | Không hiển thị đề xuất chiến dịch như đã có nếu backend chưa cung cấp |

### Cách biểu diễn trạng thái chưa sẵn sàng

Nếu backend chưa hỗ trợ, UI dùng “Sắp có” hoặc feature flag rõ ràng, không giả lập success. Nếu endpoint trả thiếu field, hiển thị phần dữ liệu có thật và nói rõ phần chưa khả dụng. Không dùng giá trị mẫu trong production để làm screenshot đẹp.

---

# 15. Visual QA checklist

## 15.1. Mỗi màn hình

```text
[ ] Mục tiêu màn hình hiểu được trong 2 giây
[ ] Có hierarchy rõ: title → thông tin chính → hành động
[ ] Màu đúng semantic token
[ ] Không có hardcoded màu trong screen
[ ] Radius và elevation đúng cấp
[ ] Không card nào nổi bật vô lý
[ ] Touch target tối thiểu 44px
[ ] Text không clipping/overflow
[ ] Loading có skeleton hoặc feedback đúng context
[ ] Empty có hướng hành động
[ ] Error có nguyên nhân + retry/fallback
[ ] Success chỉ hiển thị sau xác nhận thật
[ ] Keyboard, safe area, sticky CTA đã kiểm tra
[ ] Light/dark đã kiểm tra nếu hỗ trợ
[ ] Focus và screen reader label đã kiểm tra
```

## 15.2. Các flow nghiệm thu tối thiểu

```text
[ ] Tạo deal → đặt hàng → thanh toán → nhận hàng
[ ] Hết thời gian giữ → tự nhả suất → UI cập nhật
[ ] Thanh toán chưa xác định → kiểm tra lại không tạo đơn trùng
[ ] Áp dụng ưu đãi → tổng tiền được server xác nhận
[ ] QR nhận hàng → cửa hàng quét → trạng thái đơn cập nhật
[ ] Gửi khiếu nại → bổ sung bằng chứng → theo dõi phản hồi
[ ] Tạo món → tạo suất → điều chỉnh tồn kho có lý do
[ ] Dự báo Pro → xem explanation/confidence → chấp nhận hoặc sửa
[ ] Hết quota → gate hiển thị số còn lại/ngày reset/nâng cấp
[ ] Hạ cấp/hết hạn Pro → khóa tạo mới, giữ dữ liệu cũ để xem
[ ] AI timeout → fallback và nút thử lại/chuyển người hỗ trợ
[ ] Tài khoản chưa xác minh → không cho đặt đơn
```

## 15.3. Không có “màn hạng hai”

Đặc biệt chụp và review các màn Add/Edit, modal, bottom sheet, confirm delete, payment pending, QR, complaint form, settings sub-page và plan gate cạnh Home. Chúng phải trông như cùng một sản phẩm, cùng mức độ hoàn thiện, không rơi về component mặc định.

---

# 16. Thứ tự thực hiện

1. Audit repository, stack, routing, data flow và trạng thái API.
2. Chốt token màu, type, spacing, radius, elevation và icon.
3. Xây component primitives và state components.
4. Làm flow khách P0: Khám phá → Deal → Đặt → Thanh toán → Nhận.
5. Làm merchant P0: Hôm nay → Món/Suất → Đơn → QR.
6. Bổ sung loading/empty/error/offline cho từng flow.
7. Làm P1: khiếu nại, đánh giá, báo cáo, dự báo, ưu đãi.
8. Làm P2: AI, gói Pro, cài đặt, bảo mật và hỗ trợ.
9. Audit quyền gói/quota và các điểm Fail trong `Log_BE`.
10. Test responsive, accessibility, light/dark, keyboard và reduced motion.
11. Chạy nghiệm thu end-to-end và visual QA trên thiết bị nhỏ, mobile chuẩn, tablet/web rộng.

Một commit/PR chỉ nên phục vụ một mục đích rõ ràng, ví dụ `feat(customer): redesign reserve and checkout flow` hoặc `feat(merchant): add forecast confidence states`; không gom UI, payment, AI và theme vào một thay đổi không thể review.

---

# 17. Definition of Done — SURPLUSIQ QUALITY

```text
┌─────────────────────────────────────────────┐
│              SURPLUSIQ QUALITY               │
├─────────────────────────────────────────────┤
│ ✓ Deal flow rõ ràng       ✓ Merchant kiểm soát│
│ ✓ Pastel có ngữ nghĩa     ✓ Surface nổi vừa đủ│
│ ✓ Typography dễ đọc       ✓ Responsive         │
│ ✓ Loading/Empty/Error     ✓ Offline/Retry      │
│ ✓ Payment không mập mờ    ✓ QR dễ quét         │
│ ✓ AI có nguồn và fallback ✓ Quota minh bạch    │
│ ✓ Add/Edit = Home tier    ✓ Không fake success │
│ ✓ Light/Dark nhất quán    ✓ Accessible         │
│ ✓ Backend rule được giữ   ✓ E2E tested         │
└─────────────────────────────────────────────┘
```

Chỉ coi một feature hoàn tất khi cả hành vi thật, trạng thái lỗi, giới hạn quyền, màn phụ và chất lượng thị giác đều hoàn tất. SurplusIQ phải khiến việc cứu một phần đồ ăn trở nên dễ hiểu với khách, và khiến việc vận hành cuối ngày trở nên có thể quyết định với chủ cửa hàng — đẹp, nhưng trước hết là đáng tin và dùng được.

---

## Phụ lục A — Bản đồ màu theo ngữ cảnh

| Ngữ cảnh | Màu chính | Màu phụ | Cảnh báo |
|---|---|---|---|
| Khám phá deal | Coral | Butter | còn ít suất |
| Bản đồ/vị trí | Sky | Coral | permission |
| Checkout | Coral | Mint | payment pending |
| Nhận hàng/QR | Mint | Sky | quá hạn |
| Khiếu nại | Lilac | Coral | deadline |
| Tác động cá nhân | Mint | Butter | số liệu thiếu |
| Merchant hôm nay | Ink + Coral | Mint | việc cần xử lý |
| Dự báo/giá | Lilac | Butter | confidence thấp |
| Gói Pro | Lilac | Coral | hết hạn mức |
| Error/destructive | Error | Coral wash | không dùng đỏ toàn màn |

## Phụ lục B — Nguồn và phạm vi dữ liệu

Các mã use case, vai trò, hạn mức gói, vòng đời gói, luồng nghiệp vụ và điểm cần gắn cờ trong tài liệu này được chuyển hóa từ workbook `SurplusIQ_BRD_UC_Status.xlsx`. Các token và quy tắc thị giác được xây dựng mới dựa trên yêu cầu SurplusIQ và cấu trúc rule trong `CalAI_FINAL_Design_Code_Rules.md`.

Workbook có những ô trạng thái để trống và một số thống kê log cần đối chiếu lại; vì vậy “Sẵn sàng” không được tự động hiểu là đã đạt production. Các giá trị như hoa hồng 10% và chính sách hoàn tiền gói cần được xác nhận business/legal trước khi biến thành copy cố định trên UI.
