import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchUpdateItemsDto {
  @ApiProperty({
    description: 'Danh sách ID món cần cập nhật hàng loạt (tối đa 100 món theo R2-100)',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  itemIds: string[];

  @ApiPropertyOptional({ description: 'Danh mục mới của món' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Hạn dùng chuẩn mới (1-168 giờ)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  standardShelfLifeHours?: number;

  @ApiPropertyOptional({ description: 'Trọng lượng ước tính một suất (gram: 10-5000)' })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(5000)
  estimatedWeightGrams?: number;
}
