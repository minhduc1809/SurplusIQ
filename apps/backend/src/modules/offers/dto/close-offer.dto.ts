import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloseOfferDto {
  @ApiProperty({
    description: 'Lý do đóng suất sớm (bắt buộc: Hết nguyên liệu, Đóng cửa, hoặc Khác)',
    example: 'Hết nguyên liệu',
  })
  @IsNotEmpty({ message: 'Lý do đóng suất sớm không được để trống (R2-032).' })
  @IsString({ message: 'Lý do phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Lý do không được vượt quá 100 ký tự.' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm',
    example: 'Quán có việc đột xuất đóng cửa sớm 30 phút',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự.' })
  note?: string;
}
