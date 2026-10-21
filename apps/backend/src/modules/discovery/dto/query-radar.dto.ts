import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @ApiPropertyOptional({
    description: 'Chỉ lấy suất có khung nhận giao với [pickupFrom, pickupTo] (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  pickupFrom?: string;

  @ApiPropertyOptional({ description: 'Kết thúc khung giờ nhận mong muốn (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  pickupTo?: string;

  @ApiPropertyOptional({
    description: 'Loại các suất chứa chất gây dị ứng này, cách nhau bằng dấu phẩy',
  })
  @IsOptional()
  @IsString()
  excludeAllergens?: string;

  @ApiPropertyOptional({
    description: 'Ưu tiên deal còn đủ thời gian để nhận kịp, ẩn suất sắp hết giờ',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  prioritizeInTime?: boolean;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
