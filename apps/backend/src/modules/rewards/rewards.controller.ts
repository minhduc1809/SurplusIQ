import { Controller, Get, Post, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RewardsService } from './rewards.service';
import { RedeemRewardDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Rescue Rewards')
@ApiBearerAuth()
@Controller('customer/rewards')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Xem số dư điểm thưởng hiện tại (CM-C04)' })
  @ApiResponse({ status: 200, description: 'Số dư điểm' })
  async getBalance(@CurrentUser() user: RequestUser) {
    return this.rewardsService.getBalance(user?.userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Xem lịch sử cộng/trừ/đổi/điều chỉnh điểm thưởng (CM-C04, BR-C04-10)' })
  @ApiResponse({ status: 200, description: 'Lịch sử bút toán điểm thưởng' })
  async getHistory(@CurrentUser() user: RequestUser) {
    return this.rewardsService.getHistory(user?.userId);
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Danh mục đổi điểm kèm số dư và điều kiện (CM-C04, KC13)' })
  async getCatalog(@CurrentUser() user: RequestUser) {
    return this.rewardsService.getCatalog(user?.userId);
  }

  @Get('rules')
  @ApiOperation({
    summary: 'Quy tắc chương trình điểm: quy đổi, hạn dùng, giới hạn, hoàn tác (CM-C04, KC14)',
  })
  getRules() {
    return this.rewardsService.getRules();
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Đổi điểm thưởng lấy ưu đãi (CM-C04, BR-C04-04)' })
  @ApiResponse({ status: 200, description: 'Đổi điểm thành công, trả về số dư mới' })
  @ApiResponse({ status: 400, description: 'Số dư điểm không đủ' })
  async redeem(@CurrentUser() user: RequestUser, @Body() dto: RedeemRewardDto) {
    return this.rewardsService.redeem(user?.userId, dto);
  }
}
