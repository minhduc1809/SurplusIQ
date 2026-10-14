import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
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

  @Post('renew')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Gia hạn gói Pro thêm 30 ngày (VC-03)' })
  @ApiResponse({ status: 200, description: 'Gia hạn thành công gói Pro' })
  async renewPro(@CurrentStore() storeId: string) {
    return this.subscriptionsService.renewPro(storeId);
  }

  @Post('downgrade')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({
    summary: 'Hạ cấp về gói Basic (VC-05 - hiệu lực cuối kỳ hoặc dừng ngay nếu dùng thử)',
  })
  @ApiResponse({ status: 200, description: 'Đã đăng ký hạ cấp về Basic' })
  async downgradeToBasic(@CurrentStore() storeId: string) {
    return this.subscriptionsService.downgradeToBasic(storeId);
  }

  @Get('invoices')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Lịch sử hóa đơn thuê bao gói dịch vụ (R2-015)' })
  @ApiResponse({ status: 200, description: 'Danh sách hóa đơn bất biến' })
  async getInvoices(@CurrentStore() storeId: string) {
    return this.subscriptionsService.getInvoices(storeId);
  }

  @Get('invoices/:id/pdf')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Tải hóa đơn thuê bao định dạng PDF (R2-015)' })
  @ApiResponse({ status: 200, description: 'Tệp hóa đơn PDF tải về' })
  async getInvoicePdf(@CurrentStore() storeId: string, @Param('id') invoiceId: string) {
    return this.subscriptionsService.getInvoicePdf(storeId, invoiceId);
  }
}
