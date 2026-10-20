import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

/** Rescue Radar (CM-C05): xếp hạng deal theo khả năng nhận, không chỉ khoảng cách/giảm giá. */
export class QueryRadarDto {
  @ApiPropertyOptional({ description: 'Vĩ độ khách hàng (bỏ trống nếu nhập tay địa điểm)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Kinh độ khách hàng' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ default: 5, description: 'Bán kính tìm kiếm (km)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Ngân sách tối đa (VND)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional({ description: 'Nguồn thời gian di chuyển nếu có (ví dụ: GOOGLE_MAPS)' })
  @IsOptional()
  @IsString()
  travelTimeSource?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
