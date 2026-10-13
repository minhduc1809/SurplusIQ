import { IsOptional, IsEnum, IsUUID, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus } from '../../../entities/catalog/offer.entity';

export class QueryOffersDto {
  @ApiPropertyOptional({
    description: 'Lọc suất theo ngày cụ thể (định dạng YYYY-MM-DD)',
    example: '2026-10-13',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date phải có định dạng YYYY-MM-DD hợp lệ.' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Từ ngày (định dạng YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString({}, { message: 'fromDate phải có định dạng YYYY-MM-DD hợp lệ.' })
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Đến ngày (định dạng YYYY-MM-DD, khoảng cách tối đa 90 ngày so với fromDate)',
    example: '2026-10-13',
  })
  @IsOptional()
  @IsDateString({}, { message: 'toDate phải có định dạng YYYY-MM-DD hợp lệ.' })
  toDate?: string;

  @ApiPropertyOptional({
    enum: OfferStatus,
    description: 'Lọc theo trạng thái suất (DRAFT, OPEN, SOLD_OUT, CLOSED, CANCELLED)',
  })
  @IsOptional()
  @IsEnum(OfferStatus, { message: 'Trạng thái suất không hợp lệ.' })
  status?: OfferStatus;

  @ApiPropertyOptional({
    description: 'Lọc theo món cụ thể (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsUUID('4', { message: 'itemId phải là UUID v4 hợp lệ.' })
  itemId?: string;

  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(1, { message: 'page tối thiểu là 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng phần tử mỗi trang (tối đa 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên.' })
  @Min(1, { message: 'limit tối thiểu là 1.' })
  @Max(100, { message: 'limit tối đa là 100.' })
  limit?: number = 20;
}
