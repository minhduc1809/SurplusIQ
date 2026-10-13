import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Payments (Direct)')
@ApiBearerAuth()
@Controller('orders/:orderId/payments')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OrdersPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo giao dịch thanh toán VietQR / Link giả lập cho đơn hàng (R1-041)',
  })
  @ApiResponse({ status: 201, description: 'Khởi tạo thanh toán thành công' })
  async createPayment(
    @CurrentUser() user: RequestUser,
    @Param('orderId') orderId: string,
    @Body() dto?: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(user?.userId, orderId, dto);
  }

  @Post('recheck')
  @ApiOperation({
    summary: 'Kiểm tra lại trạng thái thanh toán cổng (R1-056, VC-07)',
  })
  @ApiResponse({ status: 200, description: 'Trạng thái kiểm tra thanh toán cập nhật' })
  async recheckPayment(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.paymentsService.recheckPayment(user?.userId, orderId);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy thông tin và trạng thái thanh toán',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết giao dịch' })
  async getPaymentStatus(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentByOrderId(user?.userId, orderId);
  }
}
