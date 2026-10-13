import { IsNotEmpty, IsObject, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDealAlertDto {
  @ApiProperty({
    description:
      'Điều kiện cảnh báo deal (loại món, khoảng giá, % giảm tối thiểu, bán kính...) (R1-031)',
    example: { category: 'BAKERY', maxPrice: 50000, minDiscountPercent: 40, radiusKm: 5 },
  })
  @IsNotEmpty({ message: 'Tiêu chí cảnh báo không được để trống.' })
  @IsObject({ message: 'Tiêu chí cảnh báo phải là một đối tượng JSON.' })
  criteria: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Trạng thái kích hoạt cảnh báo',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là giá trị boolean.' })
  isActive?: boolean;
}

export class UpdateDealAlertDto {
  @ApiPropertyOptional({
    description: 'Tiêu chí cảnh báo cần cập nhật',
    example: { category: 'BAKERY', maxPrice: 40000 },
  })
  @IsOptional()
  @IsObject({ message: 'Tiêu chí cảnh báo phải là một đối tượng JSON.' })
  criteria?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Bật hoặc tắt cảnh báo',
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là boolean.' })
  isActive?: boolean;
}
