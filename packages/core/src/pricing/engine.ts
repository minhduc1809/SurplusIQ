import { PricingInput, PricingResult } from '../types';

export class DynamicPricingEngine {
  /**
   * Tính toán mức giảm giá đề xuất theo thời gian thực
   * Thuật toán: Time-decay & Inventory pressure kết hợp giá sàn an toàn
   */
  public static calculateDynamicPrice(input: PricingInput): PricingResult {
    const {
      originalPrice,
      remainingStock,
      initialStock,
      currentTime,
      closingTime,
      expiryTime,
      minimumPriceFloorRatio = 0.35, // Không giảm quá 65% để giữ giá trị thương hiệu
    } = input;

    if (remainingStock <= 0) {
      return {
        recommendedDiscountPercent: 0,
        recommendedPrice: originalPrice,
        urgencyLevel: 'LOW',
        estimatedSellOutProbability: 1.0,
        explanation: 'Đã hết tồn kho, không cần giảm giá.',
      };
    }

    // 1. Tính thời gian còn lại đến khi đóng cửa (phút)
    const minutesToClose = Math.max(0, (closingTime.getTime() - currentTime.getTime()) / (1000 * 60));
    const minutesToExpiry = Math.max(0, (expiryTime.getTime() - currentTime.getTime()) / (1000 * 60));
    const effectiveMinutesLeft = Math.min(minutesToClose, minutesToExpiry);

    // 2. Tính tỷ lệ tồn kho còn lại
    const stockRatio = remainingStock / Math.max(1, initialStock);

    // 3. Phân định mức độ khẩn cấp (Urgency)
    let urgencyLevel: PricingResult['urgencyLevel'] = 'LOW';
    let baseDiscount = 0.2; // Giảm tối thiểu 20% cho suất cứu món

    if (effectiveMinutesLeft <= 60) {
      urgencyLevel = 'CRITICAL';
      baseDiscount = 0.55;
    } else if (effectiveMinutesLeft <= 120) {
      urgencyLevel = 'HIGH';
      baseDiscount = 0.45;
    } else if (effectiveMinutesLeft <= 240) {
      urgencyLevel = 'MEDIUM';
      baseDiscount = 0.30;
    } else {
      urgencyLevel = 'LOW';
      baseDiscount = 0.20;
    }

    // 4. Áp lực tồn kho (Inventory pressure)
    // Nếu còn nhiều bánh mà thời gian còn ít -> tăng chiết khấu
    const stockPressure = stockRatio > 0.5 ? 0.05 : 0;
    let finalDiscountRate = baseDiscount + stockPressure;

    // Giới hạn trong mức giá sàn (Floor Price)
    const maxDiscountAllowed = 1 - minimumPriceFloorRatio;
    finalDiscountRate = Math.min(finalDiscountRate, maxDiscountAllowed);

    const recommendedDiscountPercent = Math.round(finalDiscountRate * 100);
    const recommendedPrice = Math.round((originalPrice * (1 - finalDiscountRate)) / 1000) * 1000; // Làm tròn nghìn đồng

    // 5. Ước tính xác suất bán hết
    const estimatedSellOutProbability = Math.min(
      0.98,
      0.6 + (recommendedDiscountPercent / 100) * 0.35 - (stockRatio * 0.1)
    );

    // 6. Câu giải thích quyết định (Rationale)
    const hoursLeft = Math.round((effectiveMinutesLeft / 60) * 10) / 10;
    const explanation = `Còn ${hoursLeft}h trước khi đóng cửa và còn ${remainingStock} suất tồn (${Math.round(
      stockRatio * 100
    )}%). Đề xuất giảm ${recommendedDiscountPercent}% để đạt tỉ lệ thanh lý ~${Math.round(
      estimatedSellOutProbability * 100
    )}% trước giờ đóng cửa.`;

    return {
      recommendedDiscountPercent,
      recommendedPrice,
      urgencyLevel,
      estimatedSellOutProbability: Math.round(estimatedSellOutProbability * 100) / 100,
      explanation,
    };
  }
}
