import { describe, it, expect } from 'vitest';
import { DynamicPricingEngine } from './engine';
import { roundTo500, calculateFloorPrice } from '../validation/bounds.validator';

describe('DynamicPricingEngine (BRD 5.13 R2-044..048 & BR-064..067)', () => {
  const pickupStart = new Date('2026-10-12T18:00:00Z');
  const pickupEnd = new Date('2026-10-12T21:00:00Z'); // 3-hour window
  const originalPrice = 50000; // Giá gốc 50.000đ
  const initialQuantity = 20;

  describe('1. Quy tắc làm tròn bội 500 VND (BR-064, BR-066)', () => {
    it('làm tròn đúng bội 500 VND cho các mốc giá', () => {
      expect(roundTo500(25200)).toBe(25000);
      expect(roundTo500(25250)).toBe(25500);
      expect(roundTo500(25300)).toBe(25500);
      expect(roundTo500(25750)).toBe(26000);
      expect(roundTo500(25000)).toBe(25000);
      expect(roundTo500(0)).toBe(0);
    });

    it('tính toán giá sàn mặc định 40% làm tròn bội 500', () => {
      // 50.000 * 0.4 = 20.000
      expect(calculateFloorPrice(50000)).toBe(20000);
      // 45.000 * 0.4 = 18.000
      expect(calculateFloorPrice(45000)).toBe(18000);
      // 33.000 * 0.4 = 13.200 -> làm tròn 13.000
      expect(calculateFloorPrice(33000)).toBe(13000);
    });
  });

  describe('2. Ràng buộc Giá Sàn (Hard Floor Price BR-064)', () => {
    it('không bao giờ đề xuất giá thấp hơn giá sàn 40% dù ở cuối khung giờ nhận và tồn 100%', () => {
      // Thời điểm 20:55 (gần hết giờ, 97% thời gian đã trôi qua)
      const nearEnd = new Date('2026-10-12T20:55:00Z');
      const result = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice: 25000,
        initialQuantity,
        remainingQuantity: 18, // Còn 90% tồn kho
        pickupStart,
        pickupEnd,
        now: nearEnd,
        priceChangeCount: 1,
      });

      const floorPrice = 20000; // 40% của 50.000đ
      expect(result.canPropose).toBe(true);
      expect(result.proposedPrice).toBeGreaterThanOrEqual(floorPrice);
      expect(result.proposedPrice % 500).toBe(0);
      expect(result.components.floorPrice).toBe(floorPrice);
    });

    it('từ chối đề xuất khi giá hiện tại đã chạm hoặc thấp hơn giá sàn', () => {
      const now = new Date('2026-10-12T20:00:00Z');
      const result = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice: 20000, // Đã ở đúng giá sàn 40%
        initialQuantity,
        remainingQuantity: 10,
        pickupStart,
        pickupEnd,
        now,
        priceChangeCount: 1,
      });

      expect(result.canPropose).toBe(false);
      expect(result.reasonCode).toBe('ALREADY_AT_FLOOR');
      expect(result.proposedPrice).toBe(20000);
    });
  });

  describe('3. Ràng buộc Giá đề xuất không vượt quá Giá hiện tại (BR-064)', () => {
    it('đề xuất giá luôn luôn nhỏ hơn hoặc bằng currentPrice', () => {
      const midTime = new Date('2026-10-12T19:30:00Z'); // 50% thời gian
      const currentPrice = 35000;

      const result = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice,
        initialQuantity,
        remainingQuantity: 15,
        pickupStart,
        pickupEnd,
        now: midTime,
        priceChangeCount: 0,
      });

      expect(result.proposedPrice).toBeLessThanOrEqual(currentPrice);
      expect(result.proposedPrice % 500).toBe(0);
    });
  });

  describe('4. Giới hạn số lần đổi giá tối đa 3 lần/ngày (BR-064, 12.13.2)', () => {
    it('cho phép đề xuất khi đã đổi giá 0, 1 hoặc 2 lần', () => {
      const midTime = new Date('2026-10-12T19:30:00Z');
      for (const count of [0, 1, 2]) {
        const result = DynamicPricingEngine.proposeDynamicPrice({
          offerId: 'offer-01',
          originalPrice,
          currentPrice: 40000,
          initialQuantity,
          remainingQuantity: 12,
          pickupStart,
          pickupEnd,
          now: midTime,
          priceChangeCount: count,
        });
        expect(result.canPropose).toBe(true);
        expect(result.reasonCode).toBe('SUCCESS');
      }
    });

    it('chặn đề xuất mới khi đã đổi giá đủ 3 lần', () => {
      const midTime = new Date('2026-10-12T19:30:00Z');
      const result = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice: 30000,
        initialQuantity,
        remainingQuantity: 10,
        pickupStart,
        pickupEnd,
        now: midTime,
        priceChangeCount: 3, // Đã đủ 3 lần
      });

      expect(result.canPropose).toBe(false);
      expect(result.reasonCode).toBe('MAX_CHANGES_REACHED');
      expect(result.explanation).toContain('tối đa 3 lần điều chỉnh giá');
    });
  });

  describe('5. Thời hạn hiệu lực đề xuất 15 phút (BR-065)', () => {
    it('đặt expiresAt đúng bằng now + 15 phút', () => {
      const now = new Date('2026-10-12T19:00:00Z');
      const result = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice: 45000,
        initialQuantity,
        remainingQuantity: 16,
        pickupStart,
        pickupEnd,
        now,
        priceChangeCount: 1,
      });

      const expectedExpiresAt = new Date(now.getTime() + 15 * 60 * 1000);
      expect(result.expiresAt.getTime()).toBe(expectedExpiresAt.getTime());
    });

    it('từ chối đề xuất khi thời điểm hiện tại nằm ngoài khung giờ nhận hàng', () => {
      const beforeStart = new Date('2026-10-12T17:30:00Z');
      const afterEnd = new Date('2026-10-12T21:15:00Z');

      const resBefore = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice: 45000,
        initialQuantity,
        remainingQuantity: 10,
        pickupStart,
        pickupEnd,
        now: beforeStart,
        priceChangeCount: 0,
      });
      expect(resBefore.canPropose).toBe(false);
      expect(resBefore.reasonCode).toBe('OUTSIDE_WINDOW');

      const resAfter = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice: 45000,
        initialQuantity,
        remainingQuantity: 10,
        pickupStart,
        pickupEnd,
        now: afterEnd,
        priceChangeCount: 0,
      });
      expect(resAfter.canPropose).toBe(false);
      expect(resAfter.reasonCode).toBe('OUTSIDE_WINDOW');
    });
  });

  describe('6. Kiểm tra các điều kiện biên (Hết hàng, input sai lệch)', () => {
    it('từ chối khi remainingQuantity = 0', () => {
      const now = new Date('2026-10-12T19:00:00Z');
      const result = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice,
        currentPrice: 40000,
        initialQuantity,
        remainingQuantity: 0,
        pickupStart,
        pickupEnd,
        now,
        priceChangeCount: 0,
      });

      expect(result.canPropose).toBe(false);
      expect(result.reasonCode).toBe('OUT_OF_STOCK');
    });

    it('từ chối khi input không hợp lệ', () => {
      const now = new Date('2026-10-12T19:00:00Z');
      const result = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-01',
        originalPrice: 0,
        currentPrice: 0,
        initialQuantity: 0,
        remainingQuantity: 0,
        pickupStart,
        pickupEnd,
        now,
        priceChangeCount: 0,
      });

      expect(result.canPropose).toBe(false);
      expect(result.reasonCode).toBe('INVALID_INPUT');
    });
  });

  describe('7. Adapter tương thích ngược (calculateDynamicPrice)', () => {
    it('chạy trơn tru với format input cũ của simulation và test suite', () => {
      const now = new Date('2026-10-12T19:00:00Z');
      const closing = new Date('2026-10-12T21:00:00Z');
      const expiry = new Date('2026-10-12T21:00:00Z');

      const legacyResult = DynamicPricingEngine.calculateDynamicPrice({
        productId: 'item-sim-01',
        originalPrice: 100000,
        remainingStock: 8,
        initialStock: 20,
        currentTime: now,
        closingTime: closing,
        expiryTime: expiry,
        minimumPriceFloorRatio: 0.4,
      });

      expect(legacyResult.recommendedPrice).toBeGreaterThanOrEqual(40000);
      expect(legacyResult.recommendedPrice % 500).toBe(0);
      expect(legacyResult.estimatedSellOutProbability).toBeGreaterThan(0);
      expect(legacyResult.explanation).toBeDefined();
    });

    it('chủ động giảm 500đ nếu timeElapsedRatio >= 0.25 mà mức giảm tự nhiên < 500đ', () => {
      const pStart = new Date('2026-10-12T18:00:00Z');
      const pEnd = new Date('2026-10-12T20:00:00Z');
      const pNow = new Date('2026-10-12T18:35:00Z'); // 35 / 120 = 29% >= 25%
      const res = DynamicPricingEngine.proposeDynamicPrice({
        offerId: 'offer-500step',
        originalPrice: 100000,
        currentPrice: 99500,
        floorPrice: 40000,
        initialQuantity: 100,
        remainingQuantity: 1,
        pickupStart: pStart,
        pickupEnd: pEnd,
        now: pNow,
        priceChangeCount: 0,
      });

      expect(res.canPropose).toBe(true);
      expect(res.proposedPrice).toBeLessThanOrEqual(99000);
    });
  });
});
