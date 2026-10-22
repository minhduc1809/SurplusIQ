import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RescuePoolStatus } from '../../../entities/rescue-pool/rescue-pool.entity';

/** Giới hạn số suất mỗi đăng ký = giới hạn mỗi đơn của luồng đặt hàng hiện tại (BR-019). */
export const POOL_MAX_QTY_PER_REGISTRATION = 5;

// ───────────────────────── Store side (CM-B02) ─────────────────────────

export class CreateRescuePoolDto {
  @ApiProperty({ example: 'Gom nhu cầu bánh mì tối thứ 6' })
  @IsString()
  @IsNotEmpty({ message: 'Tên đợt không được để trống.' })
  @MaxLength(150)
  poolTitle: string;

  @ApiProperty({ example: 'Bánh mì', description: 'Nhóm món mục tiêu (BR-B02-03)' })
  @IsString()
  @IsNotEmpty({ message: 'Nhóm món mục tiêu là bắt buộc (BR-B02-03).' })
  @MaxLength(100)
  targetCategory: string;

  @ApiPropertyOptional({ description: 'Món cụ thể (nếu đợt chỉ cho một món)' })
  @IsOptional()
  @IsUUID('all', { message: 'targetItemId phải là UUID hợp lệ.' })
  targetItemId?: string;

  @ApiProperty({ example: 'Quận 1, TP.HCM', description: 'Khu vực phục vụ (BR-B02-03)' })
  @IsString()
  @IsNotEmpty({ message: 'Khu vực phục vụ là bắt buộc (BR-B02-03).' })
  @MaxLength(150)
  serviceArea: string;

  @ApiProperty({ example: '2026-10-20T01:00:00.000Z' })
  @IsDateString({}, { message: 'registrationOpenAt phải là ISO 8601.' })
  registrationOpenAt: string;

  @ApiProperty({ example: '2026-10-21T05:00:00.000Z' })
  @IsDateString({}, { message: 'registrationCloseAt phải là ISO 8601.' })
  registrationCloseAt: string;

  @ApiProperty({
    example: '2026-10-21T08:00:00.000Z',
    description: 'Hạn cửa hàng quyết định cung ứng, công bố trước (BR-B02-04)',
  })
  @IsDateString({}, { message: 'confirmDeadlineAt phải là ISO 8601.' })
  confirmDeadlineAt: string;

  @ApiProperty({ example: 10, description: 'Ngưỡng tối thiểu (tổng suất quan tâm)' })
  @IsInt()
  @Min(1, { message: 'Ngưỡng tối thiểu phải từ 1 suất.' })
  minimumDemand: number;

  @ApiProperty({ example: 30, description: 'Nguồn cung tối đa (suất)' })
  @IsInt()
  @Min(1)
  maximumSupply: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetBudgetMin?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  targetBudgetMax?: number;

  @ApiProperty({ example: '2026-10-21T11:00:00.000Z' })
  @IsDateString({}, { message: 'pickupWindowStart phải là ISO 8601.' })
  pickupWindowStart: string;

  @ApiProperty({ example: '2026-10-21T13:00:00.000Z' })
  @IsDateString({}, { message: 'pickupWindowEnd phải là ISO 8601.' })
  pickupWindowEnd: string;

  @ApiPropertyOptional({
    example: 'Đóng khi hết suất cung ứng hoặc hết hạn đề nghị',
    description: 'Điều kiện kết thúc công bố cho khách (BR-B02-03)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  endCondition?: string;
}

export class QueryStoreRescuePoolsDto {
  @ApiPropertyOptional({ enum: RescuePoolStatus })
  @IsOptional()
  @IsIn(Object.values(RescuePoolStatus), { message: 'Trạng thái đợt không hợp lệ.' })
  status?: RescuePoolStatus;
}

export class PublishSupplyOfferDto {
  @ApiProperty({
    description: 'Suất bán (offer) đang mở của cửa hàng dùng làm nguồn cung/tồn thật',
  })
  @IsUUID('all', { message: 'offerId phải là UUID hợp lệ.' })
  offerId: string;

  @ApiProperty({ example: 20, description: 'Tổng số suất cung ứng cho đợt (≤ maximum_supply)' })
  @IsInt()
  @Min(1)
  offeredQuantity: number;

  @ApiProperty({ example: '2026-10-21T10:00:00.000Z', description: 'Hạn khách xác nhận mua' })
  @IsDateString({}, { message: 'offerExpiryAt phải là ISO 8601.' })
  offerExpiryAt: string;

  @ApiPropertyOptional({ description: 'Bắt buộc khi sửa đề nghị đã công bố (BR-B02-09)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeReason?: string;
}

export class ReasonDto {
  @ApiProperty({ example: 'Đã đủ thông tin nhu cầu, chốt sớm' })
  @IsString()
  @IsNotEmpty({ message: 'Lý do là bắt buộc (BR-B02-09).' })
  @MaxLength(500)
  reason: string;
}

export class ClosePoolDto extends ReasonDto {
  @ApiProperty({
    enum: [RescuePoolStatus.CANCELLED, RescuePoolStatus.INSUFFICIENT],
    description: 'CANCELLED = cửa hàng từ chối/hủy; INSUFFICIENT = không đủ nhu cầu',
  })
  @IsIn([RescuePoolStatus.CANCELLED, RescuePoolStatus.INSUFFICIENT], {
    message: 'outcome phải là CANCELLED hoặc INSUFFICIENT.',
  })
  outcome: RescuePoolStatus.CANCELLED | RescuePoolStatus.INSUFFICIENT;
}

// ───────────────────────── Customer side (CM-C02) ─────────────────────────

export class QueryCustomerRescuePoolsDto {
  @ApiPropertyOptional({ example: 'Quận 1' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  serviceArea?: string;
}

export class RegisterDemandDto {
  @ApiProperty({ example: 2, minimum: 1, maximum: POOL_MAX_QTY_PER_REGISTRATION })
  @IsInt({ message: 'Số lượng phải là số nguyên.' })
  @Min(1, { message: 'Số lượng quan tâm tối thiểu 1 suất.' })
  @Max(POOL_MAX_QTY_PER_REGISTRATION, {
    message: `Mỗi đăng ký tối đa ${POOL_MAX_QTY_PER_REGISTRATION} suất.`,
  })
  requestedQuantity: number;

  @ApiPropertyOptional({ example: 20000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetMin?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({ example: '2026-10-21T11:30:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'preferredPickupStart phải là ISO 8601.' })
  preferredPickupStart?: string;

  @ApiPropertyOptional({ example: '2026-10-21T12:30:00.000Z' })
  @IsOptional()
  @IsDateString({}, { message: 'preferredPickupEnd phải là ISO 8601.' })
  preferredPickupEnd?: string;
}

export class UpdateDemandDto extends RegisterDemandDto {}

export class ConfirmOfferDto {
  @ApiProperty({
    example: 1,
    description:
      'Phiên bản đề nghị khách đang xem; lệch với server => phải xem/xác nhận lại (BR-B02-06)',
  })
  @IsInt()
  @Min(1)
  offerVersion: number;

  @ApiPropertyOptional({ description: 'Mua ít hơn số đã đăng ký (mặc định = số đã đăng ký)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(POOL_MAX_QTY_PER_REGISTRATION)
  quantity?: number;
}
