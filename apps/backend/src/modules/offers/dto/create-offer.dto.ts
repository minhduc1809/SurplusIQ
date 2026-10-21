import {
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OfferKind, OfferStatus } from '../../../entities/catalog/offer.entity';
import { OFFERS_CONSTANTS } from '../offers.constants';

export class CreateOfferDto {
  @ApiPropertyOptional({
    description: 'ID món ăn trong danh mục (bắt buộc đối với suất thông thường REGULAR)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('all', { message: 'itemId phải là định dạng UUID v4 hợp lệ.' })
  itemId?: string;

  @ApiPropertyOptional({
    enum: OfferKind,
    default: OfferKind.REGULAR,
    description: 'Loại suất (REGULAR: Suất thông thường, SURPRISE_BAG: Túi bất ngờ)',
  })
  @IsOptional()
  @IsEnum(OfferKind, { message: 'Loại suất không hợp lệ (REGULAR hoặc SURPRISE_BAG).' })
  kind?: OfferKind;

  @ApiProperty({
    description: 'Tổng số lượng suất mở bán (1 - 500)',
    example: 10,
    minimum: OFFERS_CONSTANTS.MIN_OFFER_QUANTITY,
    maximum: OFFERS_CONSTANTS.MAX_OFFER_QUANTITY,
  })
  @IsInt({ message: 'Số lượng suất phải là số nguyên.' })
  @Min(OFFERS_CONSTANTS.MIN_OFFER_QUANTITY, {
    message: `Số lượng suất tối thiểu là ${OFFERS_CONSTANTS.MIN_OFFER_QUANTITY}.`,
  })
  @Max(OFFERS_CONSTANTS.MAX_OFFER_QUANTITY, {
    message: `Số lượng suất tối đa là ${OFFERS_CONSTANTS.MAX_OFFER_QUANTITY}.`,
  })
  totalQuantity: number;

  @ApiProperty({
    description: 'Giá niêm yết ban đầu (VND, bội số 500đ)',
    example: 50000,
    minimum: 1000,
  })
  @IsInt({ message: 'Giá gốc phải là số nguyên (VND).' })
  @Min(1000, { message: 'Giá gốc tối thiểu là 1.000 VND.' })
  originalPrice: number;

  @ApiProperty({
    description: 'Giá bán suất ưu đãi (VND, bội số 500đ, >= giá sàn, <= giá gốc)',
    example: 25000,
    minimum: 500,
  })
  @IsInt({ message: 'Giá bán phải là số nguyên (VND).' })
  @Min(500, { message: 'Giá bán tối thiểu là 500 VND.' })
  currentPrice: number;

  @ApiPropertyOptional({
    description: 'Giá sàn tối thiểu cho phép (VND, mặc định 40% giá gốc)',
    example: 20000,
  })
  @IsOptional()
  @IsInt({ message: 'Giá sàn phải là số nguyên (VND).' })
  @Min(500, { message: 'Giá sàn tối thiểu là 500 VND.' })
  floorPrice?: number;

  @ApiProperty({
    description: 'Thời điểm bắt đầu khung nhận hàng (ISO 8601)',
    example: '2026-10-13T19:00:00.000Z',
  })
  @IsDateString({}, { message: 'pickupStart phải là chuỗi ngày giờ ISO 8601 hợp lệ.' })
  pickupStart: string;

  @ApiProperty({
    description: 'Thời điểm kết thúc khung nhận hàng (ISO 8601, sau pickupStart)',
    example: '2026-10-13T21:00:00.000Z',
  })
  @IsDateString({}, { message: 'pickupEnd phải là chuỗi ngày giờ ISO 8601 hợp lệ.' })
  pickupEnd: string;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn tiêu thụ món (ISO 8601, sau pickupEnd)',
    example: '2026-10-13T22:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt phải là chuỗi ngày giờ ISO 8601 hợp lệ.' })
  expiresAt?: string;

  @ApiPropertyOptional({
    enum: [OfferStatus.DRAFT, OfferStatus.OPEN],
    default: OfferStatus.OPEN,
    description: 'Trạng thái ban đầu của suất (DRAFT: Nháp, OPEN: Đang mở)',
  })
  @IsOptional()
  @IsEnum([OfferStatus.DRAFT, OfferStatus.OPEN], {
    message: 'Trạng thái ban đầu chỉ có thể là DRAFT hoặc OPEN.',
  })
  status?: OfferStatus;

  @ApiPropertyOptional({
    description: 'Ghi chú cho suất (tối đa 200 ký tự)',
    example: 'Bánh vừa ra lò chiều nay, mang hộp riêng được giảm thêm 2k',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự.' })
  @MaxLength(OFFERS_CONSTANTS.MAX_NOTE_LENGTH, {
    message: `Ghi chú không được vượt quá ${OFFERS_CONSTANTS.MAX_NOTE_LENGTH} ký tự.`,
  })
  note?: string;
}
