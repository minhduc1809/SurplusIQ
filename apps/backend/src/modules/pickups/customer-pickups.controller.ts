import { Controller, Get, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PickupsService } from './pickups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Pickups')
@ApiBearerAuth()
@Controller('customer/orders/:orderId/pickup-pass')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerPickupsController {
  constructor(private readonly pickupsService: PickupsService) {}

  @Get()
  @ApiOperation({
    summary: 'Khách xem vé nhận hàng QR Token HMAC và mã PIN dự phòng 6 số (R1-057, BR-022)',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin vé nhận hàng gồm token ký số HMAC và PIN 6 số',
  })
  @ApiResponse({ status: 400, description: 'Đơn chưa ở trạng thái Đã thanh toán (PAID)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getPickupPass(@CurrentUser() user: RequestUser, @Param('orderId') orderId: string) {
    return this.pickupsService.getPickupPass(user?.userId, orderId);
  }
}
