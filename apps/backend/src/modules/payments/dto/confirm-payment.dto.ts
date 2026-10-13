import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiPropertyOptional({
    description: 'Số tiền xác nhận (mặc định lấy theo đúng đơn giá chốt của đơn)',
    example: 60000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú xác nhận giao dịch môi trường dev',
    example: 'Xác nhận thử nghiệm dev',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
