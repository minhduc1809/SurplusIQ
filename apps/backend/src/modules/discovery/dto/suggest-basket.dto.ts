import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Rescue Basket (CM-C01): giỏ món theo nhu cầu - chỉ tính toán, không giữ tồn/tạo đơn. */
export class SuggestBasketDto {
  @ApiProperty({ description: 'Ngân sách tối đa (VND)' })
  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  budgetMax: number;

  @ApiProperty({ description: 'Số người ăn' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  peopleCount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Danh sách dị ứng cần tránh (BR-C01-07: thiếu ≠ không có)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidAllergens?: string[];
}
