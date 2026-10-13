import {
  Controller,
  Post,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PickupsService } from './pickups.service';
import { VerifyPickupDto, VerifyProxyCodeDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Store - Pickups')
@ApiBearerAuth()
@Controller('store/pickups')
@Channel('STORE')
@Roles(UserRole.STORE_USER, UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StorePickupsController {
  constructor(private readonly pickupsService: PickupsService) {}

  @Post('verify')
  @ApiOperation({
    summary:
      'Cửa hàng quét mã QR hoặc nhập PIN 6 số xác nhận giao nhận món (R1-058, R2-052, BR-022, BR-069)',
  })
  @ApiResponse({
    status: 200,
    description: 'Xác nhận nhận hàng thành công, hiển thị chi tiết món để đối chiếu tại quầy',
  })
  @ApiResponse({
    status: 400,
    description: 'Mã QR không hợp lệ, đã nhận rồi, sai cửa hàng hoặc quá khung giờ + 15 phút trễ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng hoặc mã PIN dự phòng' })
  async verifyPickup(@CurrentUser() user: RequestUser, @Body() dto: VerifyPickupDto) {
    if (!user?.storeId) {
      throw new BadRequestException('Tài khoản nhân viên chưa được liên kết với cửa hàng.');
    }
    return this.pickupsService.verifyPickup(user.storeId, user.userId, dto);
  }

  @Post('verify-proxy-code')
  @ApiOperation({
    summary:
      'Cửa hàng nhập mã nhận hộ 8 ký tự xác nhận giao nhận món cho người thân khách (R1-052)',
  })
  @ApiResponse({
    status: 200,
    description: 'Xác nhận nhận hàng qua mã nhận hộ thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Mã nhận hộ không hợp lệ, đã dùng, hết hạn hoặc sai cửa hàng',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy mã nhận hộ hoặc đơn hàng' })
  async verifyProxyCode(@CurrentUser() user: RequestUser, @Body() dto: VerifyProxyCodeDto) {
    if (!user?.storeId) {
      throw new BadRequestException('Tài khoản nhân viên chưa được liên kết với cửa hàng.');
    }
    return this.pickupsService.verifyProxyPickup(user.storeId, user.userId, dto);
  }
}
