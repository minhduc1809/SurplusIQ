import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus } from '../../../entities/catalog/offer.entity';
import { OFFERS_CONSTANTS } from '../offers.constants';

export class UpdateOfferDto {
  @ApiPropertyOptional({
    description: 'Tổng số lượng suất (không được nhỏ hơn số đã bán + đang giữ)',
    example: 15,
    minimum: OFFERS_CONSTANTS.MIN_OFFER_QUANTITY,
    maximum: OFFERS_CONSTANTS.MAX_OFFER_QUANTITY,
  })
  @IsOptional()
  @IsInt({ message: 'Số lượng suất phải là số nguyên.' })
  @Min(OFFERS_CONSTANTS.MIN_OFFER_QUANTITY, {
    message: `Số lượng suất tối thiểu là ${OFFERS_CONSTANTS.MIN_OFFER_QUANTITY}.`,
  })
  @Max(OFFERS_CONSTANTS.MAX_OFFER_QUANTITY, {
    message: `Số lượng suất tối đa là ${OFFERS_CONSTANTS.MAX_OFFER_QUANTITY}.`,
  })
  totalQuantity?: number;

  @ApiPropertyOptional({
    description: 'Giá bán suất ưu đãi mới (VND, bội số 500đ, >= giá sàn, <= giá gốc)',
    example: 22000,
  })
  @IsOptional()
  @IsInt({ message: 'Giá bán phải là số nguyên (VND).' })
  @Min(500, { message: 'Giá bán tối thiểu là 500 VND.' })
  currentPrice?: number;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu khung nhận hàng (ISO 8601)',
    example: '2026-10-13T19:30:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'pickupStart phải là chuỗi ngày giờ ISO 8601 hợp lệ.' })
  pickupStart?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm kết thúc khung nhận hàng (ISO 8601)',
    example: '2026-10-13T21:30:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'pickupEnd phải là chuỗi ngày giờ ISO 8601 hợp lệ.' })
  pickupEnd?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn tiêu thụ món (ISO 8601)',
    example: '2026-10-13T22:30:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt phải là chuỗi ngày giờ ISO 8601 hợp lệ.' })
  expiresAt?: string;

  @ApiPropertyOptional({
    enum: [OfferStatus.DRAFT, OfferStatus.OPEN],
    description: 'Chuyển trạng thái từ DRAFT sang OPEN khi mở bán',
  })
  @IsOptional()
  @IsEnum([OfferStatus.DRAFT, OfferStatus.OPEN], {
    message: 'Chỉ có thể cập nhật trạng thái sang DRAFT hoặc OPEN.',
  })
  status?: OfferStatus;

  @ApiPropertyOptional({
    description: 'Ghi chú cho suất',
    example: 'Cập nhật thêm 5 suất do mẻ bánh mới làm xong',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự.' })
  @MaxLength(OFFERS_CONSTANTS.MAX_NOTE_LENGTH, {
    message: `Ghi chú không được vượt quá ${OFFERS_CONSTANTS.MAX_NOTE_LENGTH} ký tự.`,
  })
  note?: string;
}
