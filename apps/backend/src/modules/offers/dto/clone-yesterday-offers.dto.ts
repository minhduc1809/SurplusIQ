import { IsOptional, IsArray, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CloneYesterdayOffersDto {
  @ApiPropertyOptional({
    description:
      'Danh sách ID các suất nguồn hôm qua muốn nhân bản (nếu không truyền, nhân bản tất cả)',
    example: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
  })
  @IsOptional()
  @IsArray({ message: 'sourceOfferIds phải là danh sách mảng ID.' })
  @IsUUID('4', { each: true, message: 'Mỗi offerId phải là UUID v4 hợp lệ.' })
  sourceOfferIds?: string[];

  @ApiPropertyOptional({
    description: 'Ngày mục tiêu cần tạo suất mới (mặc định là hôm nay, định dạng YYYY-MM-DD)',
    example: '2026-10-13',
  })
  @IsOptional()
  @IsDateString({}, { message: 'targetDate phải là định dạng ngày hợp lệ (YYYY-MM-DD).' })
  targetDate?: string;
}
