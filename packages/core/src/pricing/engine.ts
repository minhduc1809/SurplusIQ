import {
  PricingEngineInput,
  PricingEngineOutput,
  PricingReasonCode,
  PricingUrgencyLevel,
  LegacyPricingInput,
} from '../types/pricing.types';
import { PricingInput, PricingResult } from '../types';
import { roundTo500, calculateFloorPrice } from '../validation/bounds.validator';

export class DynamicPricingEngine {
  /**
   * Đề xuất điều chỉnh giá động theo thời gian thực (Chuẩn BRD 5.13 R2-044..R2-048)
   * Pure Function: Không I/O, không gọi Date.now(), kết quả xác định 100% theo input.
   */
  public static proposeDynamicPrice(input: PricingEngineInput): PricingEngineOutput {
    const {
      originalPrice,
      currentPrice,
      floorPrice: customFloor,
      floorRatio = 0.4, // Mặc định 40% giá gốc theo BR-064
      initialQuantity,
      remainingQuantity,
      pickupStart,
      pickupEnd,
      now,
      priceChangeCount,
    } = input;

    // 1. Tính toán giá sàn (Hard Floor Price, bội 500đ)
    const floorPrice = calculateFloorPrice(originalPrice, customFloor, floorRatio);

    // 2. Kiểm tra điều kiện đầu vào hợp lệ
    if (initialQuantity <= 0 || originalPrice <= 0 || currentPrice <= 0) {
      return this.buildOutput({
        canPropose: false,
        proposedPrice: currentPrice,
        originalPrice,
        currentPrice,
        floorPrice,
        reasonCode: 'INVALID_INPUT',
        explanation: 'Thông số đầu vào của suất bán không hợp lệ.',
        now,
        timeElapsedRatio: 0,
        stockRemainingRatio: 0,
        priceChangeCount,
      });
    }

    // 3. Kiểm tra hết tồn kho
    if (remainingQuantity <= 0) {
      return this.buildOutput({
        canPropose: false,
        proposedPrice: currentPrice,
        originalPrice,
        currentPrice,
        floorPrice,
        reasonCode: 'OUT_OF_STOCK',
        explanation: 'Suất bán đã hết tồn kho, không thể áp dụng định giá động.',
        now,
        timeElapsedRatio: 0,
        stockRemainingRatio: 0,
        priceChangeCount,
      });
    }

    // 4. Kiểm tra giới hạn số lần đổi giá (BR-064: Tối đa 3 lần/ngày)
    if (priceChangeCount >= 3) {
      return this.buildOutput({
        canPropose: false,
        proposedPrice: currentPrice,
        originalPrice,
        currentPrice,
        floorPrice,
        reasonCode: 'MAX_CHANGES_REACHED',
        explanation:
          'Suất bán đã đạt tối đa 3 lần điều chỉnh giá trong ngày theo quy định (BR-064).',
        now,
        timeElapsedRatio: 0,
        stockRemainingRatio: remainingQuantity / initialQuantity,
        priceChangeCount,
      });
    }

    // 5. Kiểm tra khung giờ nhận hàng (BR-065)
    const nowMs = now.getTime();
    const startMs = pickupStart.getTime();
    const endMs = pickupEnd.getTime();
    const totalWindowMs = endMs - startMs;

    if (totalWindowMs <= 0 || nowMs < startMs || nowMs > endMs) {
      return this.buildOutput({
        canPropose: false,
        proposedPrice: currentPrice,
        originalPrice,
        currentPrice,
        floorPrice,
        reasonCode: 'OUTSIDE_WINDOW',
        explanation: 'Thời điểm hiện tại nằm ngoài khung giờ nhận hàng của suất bán.',
        now,
        timeElapsedRatio: nowMs > endMs ? 1.0 : 0.0,
        stockRemainingRatio: remainingQuantity / initialQuantity,
        priceChangeCount,
      });
    }

    // 6. Kiểm tra giá hiện tại đã chạm hoặc thấp hơn giá sàn
    if (currentPrice <= floorPrice) {
      return this.buildOutput({
        canPropose: false,
        proposedPrice: floorPrice,
        originalPrice,
        currentPrice,
        floorPrice,
        reasonCode: 'ALREADY_AT_FLOOR',
        explanation: `Giá hiện tại (${currentPrice.toLocaleString('vi-VN')}đ) đã chạm mức giá sàn an toàn (${floorPrice.toLocaleString('vi-VN')}đ), không thể giảm thêm.`,
        now,
        timeElapsedRatio: (nowMs - startMs) / totalWindowMs,
        stockRemainingRatio: remainingQuantity / initialQuantity,
        priceChangeCount,
      });
    }

    // 7. Tính tỷ lệ thời gian & tỷ lệ tồn kho
    const timeElapsedRatio = Math.min(1.0, Math.max(0.0, (nowMs - startMs) / totalWindowMs));
    const stockRemainingRatio = Math.min(1.0, Math.max(0.0, remainingQuantity / initialQuantity));

    // 8. Thuật toán định giá động (Đề xuất kỹ thuật minh bạch BRD 5.13)
    // Biên giảm tối đa khả dĩ
    const maxDiscountMargin = currentPrice - floorPrice;

    // Hệ số giảm giá dựa trên thời gian trôi qua lũy thừa 1.2 và áp lực tồn kho
    // Càng gần giờ đóng cửa, tốc độ đề xuất giảm càng nhanh
    const timeFactor = Math.pow(timeElapsedRatio, 1.2);
    const stockFactor = Math.min(1.0, 0.5 + 0.5 * stockRemainingRatio);
    const calculatedDiscount = maxDiscountMargin * timeFactor * stockFactor;

    // Giá đề xuất sơ bộ
    const rawProposed = currentPrice - calculatedDiscount;

    // Làm tròn về bội số 500 VND (BR-064, BR-066)
    let proposedPrice = roundTo500(rawProposed);

    // Nếu thời gian đã trôi qua >= 25% mà bước giảm tính ra < 500đ khiến giá không đổi,
    // chủ động giảm 1 bước 500đ để kích cầu thanh lý (nếu còn cao hơn giá sàn)
    if (proposedPrice >= currentPrice && timeElapsedRatio >= 0.25) {
      proposedPrice = Math.max(floorPrice, currentPrice - 500);
    }

    // Giới hạn tuyệt đối trong khoảng [floorPrice, currentPrice]
    proposedPrice = Math.max(floorPrice, Math.min(currentPrice, proposedPrice));

    // Nếu sau tất cả các bước mà giá đề xuất vẫn bằng giá hiện tại
    if (proposedPrice >= currentPrice) {
      return this.buildOutput({
        canPropose: false,
        proposedPrice: currentPrice,
        originalPrice,
        currentPrice,
        floorPrice,
        reasonCode: 'ALREADY_AT_FLOOR',
        explanation: 'Áp lực thời gian và tồn kho chưa đủ lớn để kích hoạt mức giảm giá mới.',
        now,
        timeElapsedRatio,
        stockRemainingRatio,
        priceChangeCount,
      });
    }

    // 9. Đề xuất thành công
    const discountFromCurrentPercent = Math.round(
      ((currentPrice - proposedPrice) / currentPrice) * 100,
    );
    const timePercent = Math.round(timeElapsedRatio * 100);
    const explanation = `Đề xuất giảm ${discountFromCurrentPercent}% (từ ${currentPrice.toLocaleString('vi-VN')}đ còn ${proposedPrice.toLocaleString('vi-VN')}đ, giá sàn ${floorPrice.toLocaleString('vi-VN')}đ). Lý do: Còn ${remainingQuantity}/${initialQuantity} suất, thời gian nhận đã trôi qua ${timePercent}%. Đề xuất có hiệu lực trong 15 phút.`;

    return this.buildOutput({
      canPropose: true,
      proposedPrice,
      originalPrice,
      currentPrice,
      floorPrice,
      reasonCode: 'SUCCESS',
      explanation,
      now,
      timeElapsedRatio,
      stockRemainingRatio,
      priceChangeCount,
    });
  }

  /**
   * Adapter tương thích ngược với API cũ và môi trường Simulation (apps/simulation)
   */
  public static calculateDynamicPrice(input: PricingInput | LegacyPricingInput): PricingResult {
    const originalPrice = input.originalPrice;
    const remainingStock = input.remainingStock;
    const initialStock = input.initialStock;
    const now = input.currentTime;
    const closingTime = input.closingTime;
    const expiryTime = input.expiryTime;
    const floorRatio = input.minimumPriceFloorRatio ?? 0.4;
    const effectiveEndTime = closingTime < expiryTime ? closingTime : expiryTime;

    // Giả lập pickupStart là 2 giờ trước closingTime nếu không có
    const pickupStart = new Date(effectiveEndTime.getTime() - 2 * 60 * 60 * 1000);
    const currentPrice = (input as LegacyPricingInput).currentPrice ?? originalPrice;

    const result = this.proposeDynamicPrice({
      offerId: (input as PricingInput).productId ?? 'legacy-item',
      originalPrice,
      currentPrice,
      floorPrice: (input as LegacyPricingInput).floorPrice,
      floorRatio,
      initialQuantity: initialStock,
      remainingQuantity: remainingStock,
      pickupStart: now < pickupStart ? now : pickupStart,
      pickupEnd: effectiveEndTime,
      now,
      priceChangeCount: (input as LegacyPricingInput).priceChangeCount ?? 0,
    });

    return {
      recommendedDiscountPercent: result.discountPercent,
      recommendedPrice: result.proposedPrice,
      urgencyLevel: result.urgencyLevel,
      estimatedSellOutProbability: result.estimatedSellOutProbability,
      explanation: result.explanation,
    };
  }

  /**
   * Helper xây dựng PricingEngineOutput đồng nhất
   */
  private static buildOutput(params: {
    canPropose: boolean;
    proposedPrice: number;
    originalPrice: number;
    currentPrice: number;
    floorPrice: number;
    reasonCode: PricingReasonCode;
    explanation: string;
    now: Date;
    timeElapsedRatio: number;
    stockRemainingRatio: number;
    priceChangeCount: number;
  }): PricingEngineOutput {
    const {
      canPropose,
      proposedPrice,
      originalPrice,
      currentPrice,
      floorPrice,
      reasonCode,
      explanation,
      now,
      timeElapsedRatio,
      stockRemainingRatio,
      priceChangeCount,
    } = params;

    const discountPercent =
      originalPrice > 0 ? Math.round(((originalPrice - proposedPrice) / originalPrice) * 100) : 0;
    const discountFromCurrentPercent =
      currentPrice > 0 ? Math.round(((currentPrice - proposedPrice) / currentPrice) * 100) : 0;

    // Xác định mức độ khẩn cấp (Urgency Level)
    let urgencyLevel: PricingUrgencyLevel = 'LOW';
    if (timeElapsedRatio >= 0.85) {
      urgencyLevel = 'CRITICAL';
    } else if (timeElapsedRatio >= 0.6) {
      urgencyLevel = 'HIGH';
    } else if (timeElapsedRatio >= 0.35) {
      urgencyLevel = 'MEDIUM';
    }

    // Ước tính xác suất thanh lý (Sell-out Probability)
    // Tỷ lệ thuận với mức giảm giá so với giá gốc và tỷ lệ thời gian
    const discountDepth = originalPrice > 0 ? (originalPrice - proposedPrice) / originalPrice : 0;
    const estimatedSellOutProbability = Math.min(
      0.98,
      Math.max(0.15, Number((0.35 + discountDepth * 0.65 - stockRemainingRatio * 0.1).toFixed(2))),
    );

    return {
      canPropose,
      proposedPrice,
      discountPercent,
      discountFromCurrentPercent,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000), // Hiệu lực 15 phút theo BR-065
      reasonCode,
      explanation,
      components: {
        timeElapsedRatio: Number(timeElapsedRatio.toFixed(4)),
        stockRemainingRatio: Number(stockRemainingRatio.toFixed(4)),
        floorPrice,
        priceChangeCount,
      },
      recommendedPrice: proposedPrice,
      estimatedSellOutProbability,
      urgencyLevel,
    };
  }
}
