/**
 * SurplusIQ Dynamic Pricing Engine Types
 * Tuân thủ BRD 5.13 (R2-044..R2-048), BR-064..BR-067
 */

export interface PricingEngineInput {
  offerId: string;
  originalPrice: number;
  currentPrice: number;
  floorPrice?: number; // Giá sàn cụ thể (nếu không truyền, tính theo floorRatio)
  floorRatio?: number; // Tỷ lệ giá sàn (mặc định 0.40 = 40% giá gốc theo BR-064)
  initialQuantity: number;
  remainingQuantity: number;
  pickupStart: Date;
  pickupEnd: Date;
  now: Date;
  priceChangeCount: number; // Số lần đã đổi giá trong ngày (tối đa 3 lần)
}

export type PricingReasonCode =
  | 'SUCCESS'
  | 'MAX_CHANGES_REACHED'
  | 'OUTSIDE_WINDOW'
  | 'ALREADY_AT_FLOOR'
  | 'OUT_OF_STOCK'
  | 'INVALID_INPUT';

export type PricingUrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PricingEngineOutput {
  canPropose: boolean;
  proposedPrice: number;
  discountPercent: number; // % giảm so với giá gốc
  discountFromCurrentPercent: number; // % giảm so với giá hiện tại
  expiresAt: Date; // now + 15 phút
  reasonCode: PricingReasonCode;
  explanation: string; // Template tiếng Việt theo BRD 5.13 R2-045
  components: {
    timeElapsedRatio: number;
    stockRemainingRatio: number;
    floorPrice: number;
    priceChangeCount: number;
  };
  // Tương thích ngược / simulation
  recommendedPrice: number;
  estimatedSellOutProbability: number;
  urgencyLevel: PricingUrgencyLevel;
}

/**
 * Interface cho hàm tính toán tương thích ngược / simulation
 */
export interface LegacyPricingInput {
  productId?: string;
  originalPrice: number;
  remainingStock: number;
  initialStock: number;
  currentTime: Date;
  closingTime: Date;
  expiryTime: Date;
  currentPrice?: number;
  floorPrice?: number;
  minimumPriceFloorRatio?: number; // Mặc định 0.4
  priceChangeCount?: number;
}
