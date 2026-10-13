import { IsOptional, IsNumber, IsEnum, IsString, Min, Max, IsObject } from 'class-validator';
import { PricingMode } from '../../../entities/stores/store-settings.entity';

export class UpdateStoreSettingsDto {
  @IsOptional()
  @IsString()
  defaultPickupStart?: string;

  @IsOptional()
  @IsString()
  defaultPickupEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  floorRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  costPriceRatio?: number | null;

  @IsOptional()
  @IsEnum(PricingMode)
  pricingMode?: PricingMode;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  lateGraceMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5) // BR-017, R2-101: Tối đa 5 suất mỗi đơn
  maxQtyPerOrder?: number;

  @IsOptional()
  @IsObject()
  fixedDiscountSchedule?: Record<string, unknown> | null;
}
