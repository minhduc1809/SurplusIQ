import { IsOptional, IsNumber, Min, Max, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMapDealsDto {
  @ApiPropertyOptional({
    description: 'Vĩ độ vị trí tâm bản đồ (-90 đến 90)',
    example: 10.7769,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'latitude phải là số thực.' })
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Kinh độ vị trí tâm bản đồ (-180 đến 180)',
    example: 106.7009,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'longitude phải là số thực.' })
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Bán kính tìm kiếm tính theo km (từ 0.5 đến 10km, mặc định 5km trên bản đồ)',
    example: 5,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'radiusKm phải là số thực.' })
  @Min(0.5)
  @Max(10)
  radiusKm?: number = 5;

  @ApiPropertyOptional({
    description: 'Lọc theo danh mục món ăn',
    example: 'Bánh mì',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
