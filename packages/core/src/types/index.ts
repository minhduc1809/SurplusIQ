export type UserRole = 'BUYER' | 'STORE_OWNER' | 'ADMIN';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Store {
  id: string;
  name: string;
  description: string;
  category: 'BAKERY' | 'CAFE' | 'RESTAURANT' | 'GROCERY';
  location: Location;
  openingTime: string; // HH:mm
  closingTime: string; // HH:mm
  phone: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  category: string;
  originalPrice: number;
  shelfLifeHours: number;
  imageUrl?: string;
}

export type OfferStatus = 'ACTIVE' | 'SOLD_OUT' | 'EXPIRED' | 'DONATED';

export interface Offer {
  id: string;
  storeId: string;
  productId: string;
  originalPrice: number;
  discountPrice: number;
  discountPercentage: number;
  initialQuantity: number;
  remainingQuantity: number;
  pickupStartTime: Date;
  pickupEndTime: Date;
  status: OfferStatus;
  createdAt: Date;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CLAIMED' | 'CANCELLED';

export interface Order {
  id: string;
  offerId: string;
  buyerId: string;
  storeId: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  qrToken: string;
  qrTokenExpiresAt: Date;
  claimedAt?: Date;
  createdAt: Date;
}

export type WeatherType = 'SUNNY' | 'RAINY' | 'CLOUDY' | 'STORMY';

export interface DayContext {
  dayOfWeek: number; // 0: Sunday, 1: Monday, ... 6: Saturday
  weather: WeatherType;
  isHoliday: boolean;
  isSpecialEvent: boolean;
}

export interface HistoricalSalesRecord {
  date: string;
  dayOfWeek: number;
  weather: WeatherType;
  isHoliday: boolean;
  quantityProduced: number;
  quantitySold: number;
  quantityWasted: number;
}

export interface ForecastResult {
  productId: string;
  recommendedProduction: number;
  confidenceScore: number;
  breakdown: {
    baseAverage: number;
    dayOfWeekFactor: number;
    weatherFactor: number;
    eventFactor: number;
  };
  explanation: string;
}

export interface PricingInput {
  productId: string;
  originalPrice: number;
  remainingStock: number;
  initialStock: number;
  currentTime: Date;
  closingTime: Date;
  expiryTime: Date;
  minimumPriceFloorRatio?: number; // Default 0.4 (không giảm quá 60%)
}

export interface PricingResult {
  recommendedDiscountPercent: number;
  recommendedPrice: number;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedSellOutProbability: number;
  explanation: string;
}
