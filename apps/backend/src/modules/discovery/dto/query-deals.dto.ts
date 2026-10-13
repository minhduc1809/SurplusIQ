import {
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
  IsInt,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DealSortBy {
  DISTANCE = 'distance',
  PRICE_ASC = 'price_asc',
  DISCOUNT_DESC = 'discount_desc',
  CLOSING_SOON = 'closing_soon',
}

export class QueryDealsDto {
  @ApiPropertyOptional({
    description: 'Vĩ độ vị trí hiện tại của khách hàng (-90 đến 90)',
    example: 10.7769,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude phải là số thực.' })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ vị trí hiện tại của khách hàng (-180 đến 180)',
    example: 106.7009,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude phải là số thực.' })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Bán kính tìm kiếm tính theo km (từ 0.5 đến 10km, mặc định 2km) (R1-009, R1-020)',
    example: 2,
    default: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'radiusKm phải là số thực.' })
  @Min(0.5, { message: 'Bán kính tối thiểu là 0.5 km.' })
  @Max(10, { message: 'Bán kính tối đa là 10 km.' })
  radiusKm?: number = 2;

  @ApiPropertyOptional({
    description: 'Lọc theo danh mục món ăn (R1-023)',
    example: 'Bánh ngọt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: 'Giá bán tối đa (VND) (R1-023)',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxPrice phải là số nguyên.' })
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Mức giảm giá tối thiểu (% từ 0 đến 90) (R1-023)',
    example: 40,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minDiscountPercent phải là số nguyên.' })
  @Min(0)
  @Max(90)
  minDiscountPercent?: number;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm món ăn hoặc tên quán (R1-022)',
    example: 'croissant',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;

  @ApiPropertyOptional({
    description:
      'Tiêu chí sắp xếp kết quả (distance, price_asc, discount_desc, closing_soon) (R1-024)',
    enum: DealSortBy,
    default: DealSortBy.DISTANCE,
  })
  @IsOptional()
  @IsEnum(DealSortBy)
  sortBy?: DealSortBy = DealSortBy.DISTANCE;

  @ApiPropertyOptional({
    description: 'Số thứ tự trang (bắt đầu từ 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng deal mỗi trang (mặc định 20) (R1-025)',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
