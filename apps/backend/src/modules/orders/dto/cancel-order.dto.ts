import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional({
    description: 'Lý do hủy đơn hàng',
    example: 'Khách có việc đột xuất không đến nhận được',
  })
  @IsOptional()
  @IsString({ message: 'Lý do hủy phải là chuỗi ký tự.' })
  @MaxLength(255, { message: 'Lý do hủy không được vượt quá 255 ký tự.' })
  reason?: string;
}
