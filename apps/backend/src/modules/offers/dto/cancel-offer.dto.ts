import { IsNotEmpty, IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOfferDto {
  @ApiProperty({
    description:
      'Lý do hủy suất (bắt buộc: Sự cố quán, Sự cố chất lượng, Bất khả kháng, hoặc Khác)',
    example: 'Sự cố quán',
  })
  @IsNotEmpty({ message: 'Lý do hủy suất không được để trống (R2-033).' })
  @IsString({ message: 'Lý do phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'Lý do không được vượt quá 100 ký tự.' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Ghi chú thêm về lý do hủy suất',
    example: 'Lò nướng bị hỏng đột xuất, không đảm bảo chất lượng bánh giao cho khách',
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự.' })
  note?: string;
}
