import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import {
  CreateOfferDto,
  UpdateOfferDto,
  AdjustStockDto,
  CloseOfferDto,
  CancelOfferDto,
  CloneYesterdayOffersDto,
  QueryOffersDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import {
  CurrentStore,
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';
import { StorePermission } from '../../entities/stores/store-member.entity';

@ApiTags('Store - Offers')
@ApiBearerAuth()
@Controller('store/offers')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Xem danh sách suất hôm nay và các ngày, có lọc trạng thái, ngày, món (R2-026, R2-027)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách suất theo ngày hoặc khoảng ngày' })
  async getOffers(@CurrentStore() storeId: string, @Query() query: QueryOffersDto) {
    return this.offersService.getOffers(storeId, query);
  }

  @Post()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Tạo suất bán mới kiểm tra giá sàn, bội 500đ, hạn mức suất theo gói (R2-028, BR-054)',
  })
  @ApiResponse({ status: 201, description: 'Suất bán đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc vượt hạn mức gói' })
  async createOffer(
    @CurrentStore() storeId: string,
    @Body() dto: CreateOfferDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.offersService.createOffer(storeId, dto, user?.userId);
  }

  @Post('clone-yesterday')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Nhân bản các suất hôm qua sang hôm nay (R2-029)',
  })
  @ApiResponse({ status: 201, description: 'Tạo các suất nháp thành công từ ngày hôm qua' })
  async cloneYesterday(
    @CurrentStore() storeId: string,
    @Body() dto: CloneYesterdayOffersDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.offersService.cloneYesterdayOffers(storeId, dto, user?.userId);
  }

  @Get(':id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Xem chi tiết suất bán kèm thông tin món ăn liên quan',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết suất bán' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy suất bán' })
  async getOfferById(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.offersService.getOfferById(storeId, id);
  }

  @Patch(':id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Chỉnh sửa suất chưa bán hết (số lượng, giá bán, khung giờ, mở bản nháp) (R2-030)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật suất thành công' })
  @ApiResponse({
    status: 400,
    description: 'Vi phạm ràng buộc giá/số lượng hoặc vượt quá 3 lần đổi giá',
  })
  async updateOffer(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.offersService.updateOffer(storeId, id, dto, user?.userId);
  }

  @Post(':id/adjust-stock')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Điều chỉnh tồn kho có lý do bắt buộc (Làm thêm, Hỏng, Bán tại quầy, Khác) (R2-031)',
  })
  @ApiResponse({ status: 200, description: 'Điều chỉnh tồn kho thành công, ghi nhận lịch sử' })
  @ApiResponse({ status: 400, description: 'Số lượng điều chỉnh làm âm tồn kho hoặc thiếu lý do' })
  async adjustStock(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.offersService.adjustStock(storeId, id, dto, user?.userId);
  }

  @Post(':id/close')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Đóng suất sớm không bán thêm (hết nguyên liệu, đóng cửa) (R2-032)',
  })
  @ApiResponse({ status: 200, description: 'Đóng suất thành công, tồn chuyển sang hao hụt' })
  async closeOffer(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: CloseOfferDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.offersService.closeOffer(storeId, id, dto, user?.userId);
  }

  @Post(':id/cancel')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Hủy suất và hoàn tiền 100% các đơn đã đặt (R2-033)',
  })
  @ApiResponse({ status: 200, description: 'Hủy suất thành công, các đơn chuyển hoàn tiền' })
  async cancelOffer(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: CancelOfferDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.offersService.cancelOffer(storeId, id, dto, user?.userId);
  }

  @Get(':id/history')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Xem lịch sử thay đổi của suất (ai đổi gì, giá, tồn, lý do) (R2-035)',
  })
  @ApiResponse({ status: 200, description: 'Dòng thời gian sự kiện của suất bán' })
  async getOfferHistory(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.offersService.getOfferHistory(storeId, id);
  }

  @Get(':id/pricing-recommendation')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Lấy đề xuất định giá động tối ưu từ DynamicPricingEngine (@surplusiq/core)',
  })
  @ApiResponse({ status: 200, description: 'Gợi ý giá và lý do tính toán' })
  async getPricingRecommendation(@Param('id') id: string) {
    return this.offersService.getPricingRecommendation(id);
  }

  @Post(':id/apply-pricing')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Áp dụng mức giá đề xuất động tự động cho suất bán',
  })
  @ApiResponse({ status: 200, description: 'Áp dụng giá mới thành công' })
  async applyPricing(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.offersService.applyPricingRecommendation(storeId, id, user?.userId);
  }
}
