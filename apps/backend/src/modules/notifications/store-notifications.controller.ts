import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from './dto/notifications.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentStore } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';
import { StorePermission } from '../../entities/stores/store-member.entity';

@ApiTags('Store - Notifications')
@ApiBearerAuth()
@Controller('store')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Xem danh sách thông báo của cửa hàng (R2-074)' })
  @ApiResponse({ status: 200, description: 'Danh sách thông báo và số lượng chưa đọc' })
  async getNotifications(@CurrentStore() storeId: string, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.getStoreNotifications(storeId, query);
  }

  @Patch('notifications/:id/read')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Đánh dấu đã đọc một thông báo cửa hàng (R2-074)' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái đã đọc' })
  async markAsRead(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.notificationsService.markStoreNotificationAsRead(storeId, id);
  }

  @Patch('notifications/read-all')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Đánh dấu đã đọc toàn bộ thông báo của cửa hàng' })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu đã đọc tất cả' })
  async markAllAsRead(@CurrentStore() storeId: string) {
    return this.notificationsService.markAllStoreNotificationsAsRead(storeId);
  }
}
