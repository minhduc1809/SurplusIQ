# 02 — THƯ VIỆN LÕI CHIA SẺ (`packages/core`)

> **Vị trí**: `packages/core` (TypeScript thuần, không phụ thuộc framework hay DB, import vào Backend, Simulation và Web).  
> **Quy chuẩn**: Tuân thủ [rule.md](../../rule.md) — nhánh `feature/core-<ten>`, commit `feat(core): ...`, kiểm thử Jest/Vitest 100% pure logic.  
> **Căn cứ nghiệp vụ**: BRD 5.12 (R2-036..043), 5.13 (R2-044..048), 5.4 (R1-057), BR-022, BR-060..067, Chương 13 #10.

---

## 1. Nguyên tắc thiết kế

1. **Pure Functions & Deterministic**: Mọi hàm tính toán là hàm thuần (không gọi `Date.now()`, không `Math.random()` không seed, không I/O). Tham số thời gian `now: Date` luôn được truyền từ ngoài vào để dễ test và hỗ trợ Time Machine.
2. **Không bịa đặt công thức**: Bám sát BRD. Chỗ nào BRD đưa nguyên tắc nhưng không chốt công thức toán chi tiết, tài liệu đánh dấu rõ nhãn **[Đề xuất kỹ thuật]** và cung cấp giải thuật giải thích được.
3. **Core độc lập hoàn toàn với AI**: Hoạt động bình thường 100% khi không có mạng, không có Gemini (BR-061, BR-067, 12.27.3).

---

## 2. Cấu trúc thư mục mã nguồn

```text
packages/core/src/
├── index.ts
├── types/
│   ├── index.ts                  # Export toàn bộ
│   ├── common.types.ts           # Money, TimeRange, LatLng
│   ├── enums.types.ts            # OrderStatus (7), OfferStatus (5), Plan (4)...
│   ├── forecast.types.ts         # ForecastInput, ForecastResult, Confidence
│   ├── pricing.types.ts          # PricingInput, PricingResult, Proposal
│   ├── qr.types.ts               # QrTokenPayload, VerifyResult
│   ├── reconciliation.types.ts   # StatementInput, StatementResult
│   └── segmentation.types.ts     # CustomerMetrics, SegmentType
├── engines/
│   ├── forecasting/
│   │   ├── forecasting.engine.ts # Dự báo ngày mai theo thứ + sự kiện
│   │   └── trend.engine.ts       # Dự báo xu hướng tuần (≥ 28 ngày)
│   ├── pricing/
│   │   ├── dynamic-pricing.ts    # Đề xuất giá giảm theo giờ trong giá sàn
│   │   └── fixed-schedule.ts     # Fallback lịch giảm cố định (BR-067)
│   ├── qr/
│   │   ├── qr-token.engine.ts    # HMAC-SHA256 không chứa PII (BR-022)
│   │   └── backup-pin.engine.ts  # Mã PIN 6 ký tự không nhầm lẫn
│   ├── reconciliation/
│   │   └── reconciliation.engine.ts # Tính toán đối soát tuần & hoa hồng 10%
│   ├── segmentation/
│   │   └── segmentation.engine.ts   # Phân nhóm khách quy tắc (≥ 20 khách)
│   └── anomaly/
│       └── anomaly.engine.ts        # Phát hiện bất thường (≥ 28 ngày)
└── validation/
    └── bounds.validator.ts       # Kiểm tra giá sàn, làm tròn 500, đếm lần đổi
```

---

## 3. Đặc tả chi tiết các Engine nghiệp vụ

### 3.1. Thuật toán dự báo số lượng (`ForecastingEngine`) — R2-036..R2-043

#### a. Ràng buộc & Căn cứ nghiệp vụ
- **Dưới 14 ngày dữ liệu**: Không chạy mô hình thứ. Dùng **số lượng của hôm qua**, gắn nhãn `Chưa đủ dữ liệu` và độ tin cậy `LOW` (BR-060, 12.12.1). Nếu hôm qua không có số: trả về yêu cầu chủ nhập tay (5.12.6 R2-042).
- **Từ 14 ngày trở lên**: Tính trung bình theo cùng thứ trong tuần (Day of Week).
- **Yếu tố thời tiết**: Theo quyết định chốt Chương 13 #10, **chưa áp dụng hệ số thời tiết** do chưa có nguồn dữ liệu chuẩn. Chỉ áp dụng hệ số sự kiện chủ khai báo.
- **Hệ số sự kiện đặc biệt (R2-040, BR-063)**: Chủ khai báo mức ảnh hưởng `LOW` (1.1), `MEDIUM` (1.25), `HIGH` (1.4) hoặc giảm đối với ngày nghỉ.
- **Độ tin cậy (R2-042)**: Trả về enum `LOW` | `MEDIUM` | `HIGH`. `LOW` khi < 14 ngày hoặc sai số MAPE 7 ngày gần nhất > 30%.
- **Khoảng tin cậy**: $[Low, Recommended, High]$ dựa trên độ lệch chuẩn $\sigma$ của các ngày cùng thứ: $[Recommended - 1.28\sigma, Recommended, Recommended + 1.28\sigma]$, chặn dưới $\ge 1$.

#### b. Chữ ký hàm & Interface
```typescript
export interface DailySalesRecord {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0..6
  produced: number;
  soldApp: number;
  soldOffline: number;
  stockoutEarly?: boolean;
}

export interface SpecialEventContext {
  type: 'HOLIDAY' | 'PROMOTION' | 'LOCAL_EVENT' | 'CLOSURE';
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ForecastInput {
  itemId: string;
  targetDate: string; // YYYY-MM-DD
  targetDayOfWeek: number;
  history: DailySalesRecord[]; // Sắp xếp theo ngày tăng dần
  specialEvent?: SpecialEventContext;
}

export interface ForecastOutput {
  itemId: string;
  recommended: number;
  low: number;
  high: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  method: 'DOW_AVERAGE' | 'YESTERDAY_FALLBACK' | 'MANUAL_REQUIRED';
  explanation: string; // Template tiếng Việt theo BRD 5.12.6 R2-037
  components: {
    historyDaysCount: number;
    baseDowAverage?: number;
    eventFactor?: number;
    mape7Days?: number;
  };
}
```

---

### 3.2. Thuật toán định giá động (`DynamicPricingEngine`) — R2-044..R2-048

#### a. Ràng buộc & Căn cứ nghiệp vụ
1. **Ràng buộc Giá Sàn (Hard Floor Price)**: Giá đề xuất tuyệt đối **không thấp hơn Giá sàn** và **không cao hơn Giá hiện tại** (BR-064).
   $$P_{floor} = \text{originalPrice} \times \text{floorRatio} \quad (\text{mặc định } 40\%)$$
2. **Làm tròn giá**: Bắt buộc làm tròn theo **bội 500 VND** (BR-064, BR-066). Ví dụ: 25.300đ $\to$ 25.500đ; 25.200đ $\to$ 25.000đ.
3. **Số lần đổi giá tối đa**: Không tạo đề xuất mới nếu suất đã đổi giá đủ **3 lần** (BR-064, 12.13.2).
4. **Hạn hiệu lực đề xuất**: Đề xuất có hiệu lực trong **15 phút** kể từ thời điểm tính (BR-065).
5. **Phương án dự phòng (Fallback)**: Khi không đủ dữ liệu hoặc thiếu thông số, áp dụng lịch giảm giá bậc thang cố định theo giờ do chủ cấu hình (BR-067).

#### b. Công thức tính toán [Đề xuất kỹ thuật minh bạch]
Gọi:
- $r_{time} = \frac{now - pickupStart}{pickupEnd - pickupStart} \in [0, 1]$ (Tỷ lệ thời gian khung nhận đã trôi qua).
- $r_{stock} = \frac{remainingQty}{initialQty} \in [0, 1]$ (Tỷ lệ hàng tồn còn lại).
- Biên giảm tối đa: $\Delta_{max} = currentPrice - floorPrice$.

Mức giảm đề xuất:
$$Discount = \Delta_{max} \times (r_{time})^{1.2} \times \min(1.0, 0.5 + 0.5 \times r_{stock})$$
$$ProposedPrice = \text{roundTo500}(currentPrice - Discount)$$
$$FinalPrice = \max(floorPrice, \min(currentPrice, ProposedPrice))$$

#### c. Chữ ký hàm & Interface
```typescript
export interface PricingEngineInput {
  offerId: string;
  originalPrice: number;
  currentPrice: number;
  floorPrice: number;
  initialQuantity: number;
  remainingQuantity: number;
  pickupStart: Date;
  pickupEnd: Date;
  now: Date;
  priceChangeCount: number;
}

export interface PricingEngineOutput {
  canPropose: boolean;
  proposedPrice: number;
  discountPercent: number;
  expiresAt: Date; // now + 15 phút
  reasonCode: 'SUCCESS' | 'MAX_CHANGES_REACHED' | 'OUTSIDE_WINDOW' | 'ALREADY_AT_FLOOR';
  explanation: string; // Template tiếng Việt theo R2-045
  components: {
    timeElapsedRatio: number;
    stockRemainingRatio: number;
    floorPrice: number;
  };
}
```

---

### 3.3. Thuật toán mã QR nhận hàng an toàn (`QrTokenEngine`) — R1-057, R2-052

#### a. Ràng buộc bảo mật & Quyền riêng tư (BR-022, 9.1)
- **Không chứa PII**: Payload của QR token **tuyệt đối không chứa ID khách hàng (buyerId), tên, số điện thoại hay email** (BR-022).
- **Thành phần Payload**:
  - `jti`: UUID v4 của phiên vé nhận hàng (dùng kiểm tra một lần duy nhất).
  - `orderId`: ID đơn hàng.
  - `storeId`: ID cửa hàng tiếp nhận.
  - `exp`: Timestamp hết hạn (bằng `pickupEnd + 15 phút gia hạn trễ` theo BR-023).
- **Chữ ký**: Ký bằng HMAC-SHA256 chuẩn (`timingSafeEqual` khi so sánh chữ ký).
- **Mã PIN dự phòng 6 ký tự (Backup PIN)**: Sinh ngẫu nhiên từ bảng ký tự loại trừ nhầm lẫn:
  `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (loại bỏ `0, O, 1, I, L`).

#### b. Chữ ký hàm & Interface
```typescript
export interface QrTokenPayload {
  jti: string;
  orderId: string;
  storeId: string;
  exp: number; // Unix timestamp seconds
}

export class QrTokenEngine {
  static sign(payload: QrTokenPayload, secret: string): string;
  static verify(token: string, secret: string, now: Date): {
    isValid: boolean;
    payload?: QrTokenPayload;
    errorCode?: 'INVALID_SIGNATURE' | 'EXPIRED' | 'MALFORMED';
  };
}

export class BackupPinEngine {
  static generate(): string; // Chuỗi 6 ký tự
  static isValidFormat(pin: string): boolean;
}
```

---

### 3.4. Thuật toán đối soát tuần (`ReconciliationEngine`) — R2-063, R2-066, BR-075

- **Chu kỳ tuần**: Từ Thứ Hai 00:00:00 đến Chủ Nhật 23:59:59.
- **Hoa hồng**: Cố định 10% tính trên giá sau ưu đãi của các đơn đã nhận (Chương 13 #2).
- **Công thức đối soát chốt sổ**:
  $$\text{GrossSales} = \sum \text{Orders}_{\text{PICKED\_UP}} + \sum \text{Orders}_{\text{PICKUP\_EXPIRED (trừ lỗi quán)}}$$
  $$\text{Commission} = \text{round}(\text{GrossSales} \times 0.10)$$
  $$\text{NetPayout} = \text{GrossSales} - \text{Commission} - \text{RefundsDeduction} - \text{SubscriptionFee} \pm \text{Adjustments}$$

---

### 3.5. Thuật toán phân nhóm khách hàng (`CustomerSegmentationEngine`) — R2-084

Chỉ kích hoạt khi cửa hàng có $\ge 20$ khách hàng mua (12.19.1). Chạy theo quy tắc thống kê xác định:
- **Khách Mới (NEW)**: Khách có 1 đơn trong 30 ngày qua.
- **Khách Thân Thiết (LOYAL)**: Khách có $\ge 3$ đơn và lần mua gần nhất $\le 14$ ngày.
- **Có Nguy Cơ Rời Bỏ (AT_RISK)**: Khách từng có $\ge 2$ đơn nhưng không mua lại trong $> 30$ ngày.
- **Hay Không Đến Nhận (HIGH_NOSHOW)**: Khách có tỷ lệ đơn `PICKUP_EXPIRED` $\ge 20\%$ trên tổng số đơn tại quán.

---

### 3.6. Thuật toán phát hiện bất thường (`AnomalyDetectionEngine`) — R2-112, BR-096

Chỉ kích hoạt khi cửa hàng có $\ge 28$ ngày dữ liệu. Loại bỏ các ngày nghỉ và ngày có sự kiện đặc biệt ra khỏi đường cơ sở:
- Tính trung vị và độ lệch bền vững (Median & MAD) theo từng thứ trong tuần.
- Gắn cờ cảnh báo bất thường nếu doanh thu hoặc lượng hao hụt lệch $> 2.5 \times \text{MAD}$ so với kỳ vọng ngày thứ đó.
- Giới hạn tối đa 1 cảnh báo cho mỗi chỉ số trong ngày (BR-096).
