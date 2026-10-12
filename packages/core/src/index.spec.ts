import { describe, it, expect } from 'vitest';
import { DynamicPricingEngine, QrTokenEngine, ForecastingEngine } from './index';

describe('SurplusIQ Core Package Suite', () => {
  it('should calculate dynamic price properly', () => {
    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later
    const closing = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const result = DynamicPricingEngine.calculateDynamicPrice({
      originalPrice: 100000,
      remainingStock: 5,
      initialStock: 10,
      expiryTime: expiry,
      closingTime: closing,
      currentTime: now,
      minimumPriceFloorRatio: 0.4,
    });

    expect(result).toBeDefined();
    expect(result.recommendedPrice).toBeGreaterThanOrEqual(40000);
    expect(result.recommendedDiscountPercent).toBeGreaterThan(0);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.urgencyLevel);
  });

  it('should calculate forecast properly', () => {
    const result = ForecastingEngine.calculateForecast(
      'product-123',
      [
        {
          date: '2026-10-10',
          dayOfWeek: 6,
          quantitySold: 25,
          quantitySurplus: 5,
          weather: 'SUNNY',
          hasEvent: false,
        },
      ],
      {
        date: '2026-10-11',
        dayOfWeek: 0,
        weather: 'SUNNY',
        hasEvent: false,
      },
    );

    expect(result).toBeDefined();
    expect(result.recommendedProduction).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0);
  });

  it('should generate and verify QrToken', () => {
    const secretKey = 'test-secret-key-123456';
    const expiresAt = Date.now() + 15 * 60 * 1000;

    const token = QrTokenEngine.generateToken(
      {
        orderId: 'order-test-uuid-1',
        storeId: 'store-test-uuid-1',
        buyerId: 'buyer-test-uuid-1',
        expiresAt,
      },
      secretKey,
    );

    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    const verification = QrTokenEngine.verifyToken(token, secretKey);
    expect(verification.isValid).toBe(true);
    expect(verification.payload?.orderId).toBe('order-test-uuid-1');
  });
});
