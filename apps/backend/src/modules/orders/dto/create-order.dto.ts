import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ORDERS_CONSTANTS } from '../orders.constants';

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID suất bán muốn đặt giữ (UUID v4)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('all', { message: 'offerId phải là định dạng UUID v4 hợp lệ.' })
  offerId: string;

  @ApiProperty({
    description: 'Số lượng suất muốn đặt (1 đến 5)',
    example: 2,
    minimum: ORDERS_CONSTANTS.MIN_QUANTITY_PER_ORDER,
    maximum: ORDERS_CONSTANTS.MAX_QUANTITY_PER_ORDER,
  })
  @IsInt({ message: 'Số lượng phải là số nguyên.' })
  @Min(ORDERS_CONSTANTS.MIN_QUANTITY_PER_ORDER, {
    message: `Số lượng đặt tối thiểu là ${ORDERS_CONSTANTS.MIN_QUANTITY_PER_ORDER} suất (BR-019).`,
  })
  @Max(ORDERS_CONSTANTS.MAX_QUANTITY_PER_ORDER, {
    message: `Mỗi đơn chỉ được đặt tối đa ${ORDERS_CONSTANTS.MAX_QUANTITY_PER_ORDER} suất (BR-019).`,
  })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Khung giờ hẹn nhận hàng mong muốn (ISO 8601)',
    example: '2026-10-13T20:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'pickupSlot phải là chuỗi ngày giờ ISO 8601 hợp lệ.' })
  pickupSlot?: string;

  @ApiPropertyOptional({
    description: 'Mã khuyến mãi áp dụng (UUID v4)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID('all', { message: 'promotionId phải là UUID v4 hợp lệ.' })
  promotionId?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú cho đơn hàng (tối đa 200 ký tự)',
    example: 'Khách tự mang túi đựng riêng',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự.' })
  @MaxLength(200, { message: 'Ghi chú không được vượt quá 200 ký tự.' })
  note?: string;
}
