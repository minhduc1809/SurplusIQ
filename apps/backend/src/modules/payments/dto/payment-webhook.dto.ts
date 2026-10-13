import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @ApiProperty({
    description:
      'Mã giao dịch duy nhất từ cổng thanh toán (gateway_txn_id) chống trùng lặp (BR-015, VC-10)',
    example: 'MB_FT261013890123',
  })
  @IsNotEmpty({ message: 'Mã giao dịch cổng gatewayTxnId không được để trống.' })
  @IsString()
  gatewayTxnId: string;

  @ApiProperty({
    description:
      'Số tiền thực tế nhận được (VNĐ), phải khớp chính xác đơn giá chốt x số lượng (BR-016)',
    example: 60000,
  })
  @IsNotEmpty({ message: 'Số tiền không được để trống.' })
  @IsNumber({}, { message: 'Số tiền phải là số hợp lệ.' })
  @IsPositive({ message: 'Số tiền phải lớn hơn 0.' })
  amount: number;

  @ApiPropertyOptional({
    description: 'Nội dung chuyển khoản chứa cú pháp SUQ<ORDER_CODE>',
    example: 'SUQSQ261013A1B2',
  })
  @IsOptional()
  @IsString()
  transferMessage?: string;

  @ApiPropertyOptional({
    description: 'Mã đơn hàng SurplusIQ nếu cổng bóc tách sẵn',
    example: 'SQ261013A1B2',
  })
  @IsOptional()
  @IsString()
  orderCode?: string;

  @ApiPropertyOptional({
    description: 'Mã đơn hàng UUID',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Tài khoản ngân hàng gửi tiền',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  senderAccount?: string;

  @ApiPropertyOptional({
    description: 'Chữ ký HMAC-SHA256 của payload từ cổng để bảo mật',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}
