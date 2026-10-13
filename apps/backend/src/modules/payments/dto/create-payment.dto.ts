import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from '../../../entities/orders/payment-transaction.entity';

export class CreatePaymentDto {
  @ApiPropertyOptional({
    description: 'Phương thức thanh toán (VIETQR hoặc SIMULATED)',
    enum: PaymentMethod,
    default: PaymentMethod.VIETQR,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod = PaymentMethod.VIETQR;
}
