import {
  Controller,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaymentWebhookDto, ConfirmPaymentDto } from './dto';

@ApiTags('Payments - Webhook & Simulator')
@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payments/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Webhook xác nhận thanh toán từ cổng VietQR / ngân hàng (R1-041, R1-047, BR-015, BR-016, VC-10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Xử lý webhook thành công (Idempotent theo gateway_txn_id)',
  })
  @ApiResponse({ status: 400, description: 'Sai số tiền chốt hoặc payload không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng tương ứng' })
  async handleWebhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.processPaymentWebhook(dto);
  }

  @Post('dev/payments/:txnId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Giả lập xác nhận thanh toán môi trường phát triển (Chỉ NODE_ENV !== "production") (Q5)',
  })
  @ApiResponse({ status: 200, description: 'Xác nhận thanh toán giả lập thành công' })
  @ApiResponse({ status: 400, description: 'Không khả dụng trên môi trường Production' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy giao dịch hoặc đơn hàng' })
  async confirmPaymentDev(@Param('txnId') txnId: string, @Body() dto?: ConfirmPaymentDto) {
    return this.paymentsService.confirmPaymentDev(txnId, dto);
  }
}
