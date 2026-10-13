import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { QuotaService } from './quota.service';
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

@ApiTags('Store - Subscriptions & Quotas')
@ApiBearerAuth()
@Controller('store/subscription')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly quotaService: QuotaService,
  ) {}

  @Get('current')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xem thông tin gói dịch vụ hiện tại của quán (R2-011)' })
  @ApiResponse({ status: 200, description: 'Chi tiết gói và thời hạn' })
  async getCurrentSubscription(@CurrentStore() storeId: string) {
    return this.subscriptionsService.getCurrentSubscription(storeId);
  }

  @Get('quotas')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Xem hạn mức sử dụng theo thời gian thực của gói dịch vụ (R2-016)',
  })
  @ApiResponse({ status: 200, description: 'Bảng theo dõi hạn mức sử dụng' })
  async getStoreQuotas(@CurrentStore() storeId: string) {
    return this.quotaService.getStoreQuotaSummary(storeId);
  }

  @Post('upgrade')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Nâng cấp lên gói Pro (VC-02 - 30 ngày)' })
  @ApiResponse({ status: 200, description: 'Kích hoạt thành công gói Pro' })
  async upgradeToPro(@CurrentStore() storeId: string) {
    return this.subscriptionsService.upgradeToPro(storeId);
  }

  @Post('cancel')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({
    summary: 'Hủy gói Pro (VC-08 - giữ quyền lợi tới cuối kỳ hoặc hủy ngay nếu dùng thử)',
  })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái hủy gói' })
  async cancelPro(@CurrentStore() storeId: string) {
    return this.subscriptionsService.cancelPro(storeId);
  }
}
