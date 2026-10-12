# 05 — KIỂM THỬ TẢI & BỘ MÔ PHỎNG BENCHMARK

> **Vị trí**: `apps/simulation`, các bộ kiểm thử tự động của Monorepo (`apps/backend`, `packages/core`).  
> **Căn cứ**: Tiêu chí nghiệm thu BRD Chương 12 (12.1..12.27), BR-014 (không bán vượt tồn), BR-090 (mô phỏng chính sách).  
> **Quy chuẩn**: Tuân thủ [rule.md](../../rule.md) — nhánh `feature/simulation-<ten>`, commit `feat(simulation): ...`.

---

## 1. Ma trận kiểm thử nghiệm thu (Dẫn xuất từ BRD Chương 12)

Mỗi kịch bản kiểm thử tương ứng với một test case tự động:

| Mã kiểm thử | Phân hệ | Kịch bản kiểm thử (Given - When - Then) | Tiêu chí đạt | Căn cứ BRD |
|---|---|---|---|---|
| `TEST-AUTH-01` | 5.1 Tài khoản | Khách mới đăng ký thông tin hợp lệ | User trạng thái `PENDING_VERIFY`, gửi OTP, chặn tạo đơn | 12.1.1 |
| `TEST-AUTH-02` | 5.1 Tài khoản | Nhập sai OTP liên tiếp 5 lần | Khóa xác minh 15 phút, hiển thị thời gian còn lại | 12.1.2 |
| `TEST-AUTH-03` | 5.1 Tài khoản | Khách đăng nhập trên Web quản trị tiệm | Bị từ chối với mã lỗi `AUTH_WRONG_CHANNEL` | 9.1, 12.27.2 |
| `TEST-DEAL-01` | 5.2 Khám phá | Suất OPEN trong bán kính 2km | Suất hiển thị đúng số tồn khả dụng (đã trừ đơn đang giữ) | 12.2.1 |
| `TEST-DEAL-02` | 5.2 Khám phá | Tạo cảnh báo deal thứ 11 | Bị từ chối do chạm trần hạn mức 10 cảnh báo | 12.2.2, BR-011 |
| `TEST-ORDER-01` | 5.3 Đặt hàng | 2 khách cùng giữ suất khi tồn chỉ còn 2 | Đúng 1 đơn thành công, người còn lại nhận báo hết, tồn = 0 | 12.3.1, BR-014 |
| `TEST-ORDER-02` | 5.3 Đặt hàng | Gửi lặp request giữ suất cùng `Idempotency-Key` | Trả về cùng kết quả đơn hàng cũ, tồn kho chỉ trừ 1 lần | 12.3.2, BR-015 |
| `TEST-ORDER-03` | 5.3 Đặt hàng | Đơn đã quá 10 phút chưa thanh toán | Chuyển `HOLD_EXPIRED`, cộng hoàn trả tồn kho nguyên tử | 12.3.3, BR-017 |
| `TEST-ORDER-04` | 5.3 Đặt hàng | Thanh toán đến muộn sau khi đã hết 10 phút | Đơn giữ `HOLD_EXPIRED`, tự động kích hoạt hoàn tiền 100% | 12.3.3, R1-047 |
| `TEST-ORDER-05` | 5.3 Đặt hàng | Khách hủy đơn khi còn 59 phút trước khung nhận | Bị từ chối (chỉ cho phép hủy khi còn $\ge 60$ phút) | 12.3.4, BR-018 |
| `TEST-PICKUP-01` | 5.4 Nhận hàng | Cửa hàng quét QR hợp lệ trong khung nhận | Đơn đổi sang `PICKED_UP`, phát sự kiện thông báo | 12.4.1 |
| `TEST-PICKUP-02` | 5.4 Nhận hàng | Quét lại mã QR đã từng nhận hàng | Bị từ chối với lỗi `PICKUP_TOKEN_USED` | 12.4.2, BR-023 |
| `TEST-PICKUP-03` | 5.4 Nhận hàng | Quá khung nhận + 15 phút trễ chưa đến | Đơn sang `PICKUP_EXPIRED`, cộng 1 lần vào bộ đếm noshow | 12.4.3, BR-020 |
| `TEST-COMPL-01` | 5.5 Hậu mãi | Gửi khiếu nại sau 24h kể từ lúc nhận hàng | Bị từ chối do quá thời hạn 24 giờ cho phép | 12.5.1, BR-026 |
| `TEST-COMPL-02` | 5.15 Hậu mãi | Tiệm không phản hồi khiếu nại quá 48h | Hệ thống tự động chấp nhận và hoàn tiền 100% | 12.15.1, R2-060 |
| `TEST-PRICE-01` | 5.13 Định giá | Đề xuất giá duyệt sau 16 phút | Bị từ chối do đề xuất đã hết hạn sau 15 phút | 12.13.1, BR-065 |
| `TEST-PRICE-02` | 5.13 Định giá | Suất đã đổi giá 3 lần trong ngày | Không tạo thêm đề xuất mới cho suất đó | 12.13.2, BR-064 |
| `TEST-PRICE-03` | 5.13 Định giá | Chủ đặt giá thủ công thấp hơn giá sàn | Bị từ chối lưu với lỗi `OFFER_PRICE_BELOW_FLOOR` | 12.13.3, BR-066 |
| `TEST-RECON-01` | 5.16 Đối soát | Job chốt tuần chạy lúc kết thúc tuần | Sinh bản sao kê `LOCKED`, chặn mọi thao tác sửa xóa | 12.16.1, BR-075 |
| `TEST-QUOTA-01` | 5.11 Suất bán | Cửa hàng gói Cơ bản mở suất thứ 21 trong ngày | Bị từ chối do chạm trần hạn mức 20 suất/ngày | 12.11.1, 8.3.1 |
| `TEST-AI-FALLBACK` | 12.27 Hệ thống | Dịch vụ AI Gemini bị gián đoạn hoặc timeout | Toàn bộ luồng đặt hàng, nhận hàng, đối soát vẫn chạy bình thường | 12.27.3 |

---

## 2. Kiểm thử tải đồng thời chống bán vượt tồn (Concurrency Stress Test)

### 2.1. Kịch bản mô phỏng tranh chấp điểm nóng
- **Trạng thái ban đầu**: Một suất bánh đặc biệt chỉ còn tồn 1 chiếc (`remaining_quantity = 1`).
- **Thực thi tải**: 100 khách hàng ảo gửi đồng thời 100 request `POST /api/v1/orders` trong khoảng thời gian $\le 15\text{ms}$.
- **Công cụ kiểm thử**: Jest test script sử dụng `Promise.all` hoặc kịch bản k6 / autocannon.

```typescript
describe('Concurrency Race Condition: Anti-Overselling Verification', () => {
  it('should allow exactly 1 order to succeed and reject 99 others when remainingQuantity is 1', async () => {
    const offer = await createTestOffer({ remainingQuantity: 1, currentPrice: 50000 });
    const buyers = await createTestBuyers(100);

    const requests = buyers.map((buyer) =>
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyer.token}`)
        .set('Idempotency-Key', crypto.randomUUID())
        .send({ offerId: offer.id, quantity: 1 })
    );

    const responses = await Promise.all(requests);

    const successes = responses.filter((res) => res.status === 201);
    const rejections = responses.filter((res) => res.status === 400);

    // Tiêu chí nghiệm thu bắt buộc (Pass Criteria)
    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(99);

    const updatedOffer = await offerRepository.findOneBy({ id: offer.id });
    expect(updatedOffer?.remainingQuantity).toBe(0); // Tuyệt đối không âm (-1, -2)
    expect(updatedOffer?.status).toBe('SOLD_OUT');

    const createdOrders = await orderRepository.findBy({ offerId: offer.id });
    expect(createdOrders).toHaveLength(1);
    expect(createdOrders[0].status).toBe('PENDING_PAYMENT');
  });
});
```

---

## 3. Khắc phục & Cải tiến bộ mô phỏng Benchmark (`apps/simulation`)

### 3.1. Các vấn đề của code hiện tại & Giải pháp
1. **Bỏ tính ngẫu nhiên không kiểm soát**: Thay thế `Math.random()` bằng **Pseudo-Random Number Generator (PRNG)** có Seed cố định (thuật toán Mulberry32 hoặc thư viện `seedrandom`). Mọi lượt chạy với cùng một seed sẽ tạo ra kết quả 100% tái lập được để phục vụ nghiên cứu và kiểm chứng khoa học.
2. **Khắc phục tính vòng lặp của Chế độ D**:
   - Hiện tại: Chế độ D tính số lượng bán bằng `surplusD * pricing.estimatedSellOutProbability` (dùng chính con số do engine tự sinh ra để tính doanh thu bán).
   - Khắc phục: Xây dựng **Hàm co giãn cầu của khách hàng (Price Elasticity Demand Curve)** độc lập ở môi trường mô phỏng. Khi mức giảm giá tăng từ 20% lên 50%, xác suất mua của khách hàng mô phỏng tăng theo phân phối thực tế độc lập với engine.
3. **Bổ sung Tuyên bố Giới hạn (Disclaimer)**:
   - Theo BR-090 và Chương 13 #8: Mọi kết quả xuất ra từ hệ thống mô phỏng bắt buộc in kèm dòng thông báo: *"Kết quả mô phỏng là ước lượng dựa trên các giả định phân phối, không phải cam kết doanh thu thực tế"*.

### 3.2. Cấu trúc 4 Chế độ vận hành mô phỏng

```text
apps/simulation/src/
├── index.ts                      # Điểm khởi chạy benchmark
├── prng/
│   └── seeded-random.ts          # Bộ sinh số ngẫu nhiên có Seed (Mulberry32)
├── models/
│   ├── bakery-store.mock.ts      # Mô hình 50-100 tiệm bánh ảo (Sức sản xuất, Giờ mở cửa)
│   └── customer-agent.mock.ts    # Mô hình khách hàng ảo (Độ nhạy giá, Vị trí địa lý)
├── modes/
│   ├── mode-a-baseline.ts        # Chế độ A: Không giảm giá cuối ngày
│   ├── mode-b-rule-based.ts      # Chế độ B: Giảm cố định 30% lúc 20:00
│   ├── mode-c-forecast-only.ts   # Chế độ C: Chỉ áp dụng Dự báo số lượng làm bánh
│   └── mode-d-full-surplusiq.ts  # Chế độ D: Dự báo + Định giá động trong giá sàn
└── reports/
    └── benchmark-reporter.ts     # Xuất bảng so sánh định lượng
```

### 3.3. Bảng chỉ số đánh giá đầu ra
Sau 30 ngày chạy mô phỏng trên 50–100 cửa hàng:
- **Tỷ lệ giảm lãng phí thực phẩm (Food Waste Reduction %)** so với Chế độ A.
- **Doanh thu thu hồi (Salvaged Revenue VND)** từ lượng hàng dư thừa.
- **Tỷ lệ sự cố hết hàng sớm (Stockout Incidents)** nhằm đo lường xem việc giảm làm bánh có làm mất khách quen không.
- **Biên lợi nhuận ròng ước tính** sau khi trừ chi phí nguyên vật liệu và hoa hồng nền tảng.
