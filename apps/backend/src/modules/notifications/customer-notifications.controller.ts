import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto, UpdateNotificationSettingsDto } from './dto/notifications.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Notifications')
@ApiBearerAuth()
@Controller('customer')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({
    summary: 'Xem danh sách thông báo của khách hàng có phân trang (R1-073, R1-074)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo và số lượng chưa đọc' })
  async getNotifications(@CurrentUser() user: RequestUser, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.getCustomerNotifications(user.userId, query);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc một thông báo (R1-074)' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái đã đọc' })
  async markAsRead(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.notificationsService.markCustomerNotificationAsRead(user.userId, id);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Đánh dấu đã đọc toàn bộ thông báo (R1-074)' })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu đã đọc tất cả' })
  async markAllAsRead(@CurrentUser() user: RequestUser) {
    return this.notificationsService.markAllCustomerNotificationsAsRead(user.userId);
  }

  @Put('notification-settings')
  @ApiOperation({ summary: 'Cập nhật cài đặt nhận thông báo push (R1-010)' })
  @ApiResponse({ status: 200, description: 'Cập nhật cài đặt thông báo thành công' })
  async updateNotificationSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateNotificationSettings(user.userId, dto);
  }
}
