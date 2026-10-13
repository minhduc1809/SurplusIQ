import { IsInt, IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({
    description: 'Số lượng suất thay đổi (+ tăng hoặc - giảm, không được làm tồn âm)',
    example: -2,
  })
  @IsInt({ message: 'Số lượng thay đổi phải là số nguyên (dương để tăng, âm để giảm).' })
  deltaQuantity: number;

  @ApiProperty({
    description: 'Lý do điều chỉnh (bắt buộc: Làm thêm, Hỏng, Bán tại quầy, hoặc Khác)',
    example: 'Bán tại quầy',
  })
  @IsNotEmpty({ message: 'Lý do điều chỉnh không được để trống (R2-031).' })
  @IsString({ message: 'Lý do điều chỉnh phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Lý do không được vượt quá 100 ký tự.' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Ghi chú chi tiết cho lần điều chỉnh tồn kho',
    example: 'Khách vãng lai mua trực tiếp 2 cái lúc 18h30',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự.' })
  note?: string;
}
