import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import {
  CreatePromotionDto,
  UpdatePromotionStatusDto,
  CreateCampaignDto,
  CreateSurpriseBagDto,
  UpdateCampaignDto,
} from './dto/marketing.dto';
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

@ApiTags('Store - Marketing & Campaigns')
@ApiBearerAuth()
@Controller('store/marketing')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('promotions')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Danh sách các chương trình ưu đãi của quán (R2-088)' })
  @ApiResponse({ status: 200, description: 'Danh sách ưu đãi' })
  async getPromotions(@CurrentStore() storeId: string) {
    return this.marketingService.getPromotions(storeId);
  }

  @Post('promotions')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Tạo mã voucher / chương trình ưu đãi mới (kiểm tra hạn mức quota) (R2-088)',
  })
  @ApiResponse({ status: 201, description: 'Tạo ưu đãi thành công' })
  async createPromotion(@CurrentStore() storeId: string, @Body() dto: CreatePromotionDto) {
    return this.marketingService.createPromotion(storeId, dto);
  }

  @Patch('promotions/:id/status')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Bật/tắt/kết thúc chương trình ưu đãi (R2-088)' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  async togglePromotionStatus(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionStatusDto,
  ) {
    return this.marketingService.togglePromotionStatus(storeId, id, dto.status);
  }

  @Get('campaigns')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Danh sách các chiến dịch thông báo push (R2-086)' })
  @ApiResponse({ status: 200, description: 'Danh sách chiến dịch' })
  async getCampaigns(@CurrentStore() storeId: string) {
    return this.marketingService.getCampaigns(storeId);
  }

  @Post('campaigns')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Lên lịch chiến dịch thông báo push (chặn giới nghiêm 22:00 - 07:00) (BR-086)',
  })
  @ApiResponse({ status: 201, description: 'Đã lên lịch chiến dịch thành công' })
  async createCampaign(@CurrentStore() storeId: string, @Body() dto: CreateCampaignDto) {
    return this.marketingService.createCampaign(storeId, dto);
  }

  @Patch('campaigns/:id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Chỉnh sửa lịch hoặc hủy chiến dịch thông báo (chỉ cho phép trước giờ gửi >= 15 phút) (R2-093)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật chiến dịch thành công' })
  @ApiResponse({
    status: 400,
    description: 'Không thể sửa/hủy khi còn ít hơn 15 phút trước giờ gửi',
  })
  async updateCampaign(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.marketingService.updateCampaign(storeId, id, dto);
  }

  @Get('campaigns/:id/analytics')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Xem phân tích hiệu quả chiến dịch (người nhận, tỷ lệ mở, đơn hàng trong 24h) (R2-094)',
  })
  @ApiResponse({ status: 200, description: 'Thống kê kết quả chiến dịch' })
  async getCampaignAnalytics(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.marketingService.getCampaignAnalytics(storeId, id);
  }

  @Get('segments')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Phân nhóm khách hàng thông minh (ngưỡng tối thiểu 20 khách) (R2-082..R2-085)',
  })
  @ApiResponse({ status: 200, description: 'Kết quả phân nhóm khách hàng' })
  async getCustomerSegments(@CurrentStore() storeId: string) {
    return this.marketingService.calculateCustomerSegments(storeId);
  }

  @Post('surprise-bags')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Tạo túi bất ngờ (Surprise Bag) kèm cảnh báo dị ứng bắt buộc (R1-026, R2-091, BR-085)',
  })
  @ApiResponse({ status: 201, description: 'Đã tạo túi bất ngờ thành công' })
  async createSurpriseBag(@CurrentStore() storeId: string, @Body() dto: CreateSurpriseBagDto) {
    return this.marketingService.createSurpriseBag(storeId, dto);
  }

  @Get('surprise-bags')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Danh sách các túi bất ngờ của quán (R2-091)' })
  @ApiResponse({ status: 200, description: 'Danh sách túi bất ngờ' })
  async getSurpriseBags(@CurrentStore() storeId: string) {
    return this.marketingService.getSurpriseBags(storeId);
  }
}
