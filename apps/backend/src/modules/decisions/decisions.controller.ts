import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';
import {
  OverrideForecastDto,
  LogDailyActualDto,
  QueryForecastDto,
  CreateSpecialEventDto,
  QueryAnomalyDto,
} from './dto/decisions.dto';
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
import { PlanGuard } from '../../common/guards/plan.guard';
import { RequiresPlan } from '../../common/decorators/requires-plan.decorator';

@ApiTags('Store - Decisions & Forecasts')
@ApiBearerAuth()
@Controller('store')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get('forecast')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xem dự báo sản xuất bánh/thực phẩm cho ngày mai (R2-036..R2-043)' })
  @ApiResponse({ status: 200, description: 'Danh sách dự báo theo từng món' })
  async getForecasts(@CurrentStore() storeId: string, @Query() query: QueryForecastDto) {
    return this.decisionsService.getForecasts(storeId, query.targetDate);
  }

  @Post('forecast/:id/override')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Chủ quán ghi đè số lượng kế hoạch sản xuất (R2-041)' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật số lượng ghi đè' })
  async overrideForecast(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: OverrideForecastDto,
  ) {
    return this.decisionsService.overrideForecast(storeId, id, dto);
  }

  @Post('forecast/actuals')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Ghi nhận số lượng sản xuất và bán thực tế cuối ngày (R2-039)' })
  @ApiResponse({ status: 201, description: 'Đã ghi nhận số liệu thực tế' })
  async logDailyActual(@CurrentStore() storeId: string, @Body() dto: LogDailyActualDto) {
    return this.decisionsService.logDailyActual(storeId, dto);
  }

  @Get('decisions/pricing/proposals')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Danh sách đề xuất định giá động đang chờ duyệt (R2-047)' })
  @ApiResponse({ status: 200, description: 'Danh sách đề xuất giá' })
  async getPricingProposals(@CurrentStore() storeId: string) {
    return this.decisionsService.getPricingProposals(storeId);
  }

  @Post('decisions/pricing/propose/:offerId')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Khởi tạo đề xuất định giá động theo thời gian thực (R2-044..R2-048)' })
  @ApiResponse({ status: 200, description: 'Kết quả đề xuất giá' })
  async proposeDynamicPrice(@CurrentStore() storeId: string, @Param('offerId') offerId: string) {
    return this.decisionsService.proposeDynamicPrice(storeId, offerId);
  }

  @Post('decisions/pricing/proposals/:id/accept')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Chấp nhận đề xuất giá và cập nhật giá bán mới (R2-047)' })
  @ApiResponse({ status: 200, description: 'Áp dụng giá mới thành công' })
  async acceptPriceProposal(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.decisionsService.acceptPriceProposal(storeId, id, user.userId);
  }

  @Post('decisions/pricing/proposals/:id/reject')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Từ chối đề xuất giá (R2-047)' })
  @ApiResponse({ status: 200, description: 'Đã từ chối đề xuất giá' })
  async rejectPriceProposal(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.decisionsService.rejectPriceProposal(storeId, id, user.userId);
  }

  @Get('special-events')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Danh sách sự kiện đặc biệt tác động dự báo (R2-040)' })
  @ApiResponse({ status: 200, description: 'Danh sách sự kiện' })
  async getSpecialEvents(@CurrentStore() storeId: string) {
    return this.decisionsService.getSpecialEvents(storeId);
  }

  @Post('special-events')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Tạo mới sự kiện đặc biệt (R2-040)' })
  @ApiResponse({ status: 201, description: 'Đã tạo sự kiện đặc biệt' })
  async createSpecialEvent(@CurrentStore() storeId: string, @Body() dto: CreateSpecialEventDto) {
    return this.decisionsService.createSpecialEvent(storeId, dto);
  }

  @Delete('special-events/:id')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xóa sự kiện đặc biệt (R2-040)' })
  @ApiResponse({ status: 200, description: 'Đã xóa sự kiện thành công' })
  async deleteSpecialEvent(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.decisionsService.deleteSpecialEvent(storeId, id);
  }

  @Get('anomalies')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Phát hiện bất thường doanh thu/hao hụt bằng thuật toán MAD > 2.5 không dùng LLM (R2-112)',
  })
  @ApiResponse({ status: 200, description: 'Kết quả phát hiện bất thường' })
  async getAnomalies(@CurrentStore() storeId: string, @Query() query: QueryAnomalyDto) {
    return this.decisionsService.detectAnomalies(storeId, query.sensitivity);
  }

  @Get('anomalies/why')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Các yếu tố liên quan đến một ngày bất thường (R2-113)' })
  async explainAnomaly(@CurrentStore() storeId: string, @Query('date') date: string) {
    return this.decisionsService.explainAnomaly(storeId, date);
  }

  @Get('action-cards')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xem các thẻ hành động AI thông minh gợi ý cho quán (R2-114, R2-115)' })
  @ApiResponse({ status: 200, description: 'Danh sách thẻ hành động' })
  async getActionCards(@CurrentStore() storeId: string) {
    return this.decisionsService.getActionCards(storeId);
  }

  @Post('action-cards/:id/apply')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Chấp nhận và áp dụng thẻ hành động (R2-114)' })
  @ApiResponse({ status: 200, description: 'Đã áp dụng thẻ hành động' })
  async applyActionCard(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.decisionsService.applyActionCard(storeId, id);
  }

  @Post('action-cards/:id/dismiss')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Bỏ qua thẻ hành động (R2-114)' })
  @ApiResponse({ status: 200, description: 'Đã bỏ qua thẻ hành động' })
  async dismissActionCard(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.decisionsService.dismissActionCard(storeId, id);
  }

  @Get('donations/suggestions')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Gợi ý quyên góp từ thiện cho món surplus sắp hết hạn (R2-121)' })
  @ApiResponse({ status: 200, description: 'Danh sách món và tổ chức từ thiện' })
  async getDonationSuggestions(@CurrentStore() storeId: string) {
    return this.decisionsService.getDonationSuggestions(storeId);
  }

  // Ghi nhận quyên góp thủ công (POST donations) đã bỏ: nó không trừ tồn nên có thể tính trùng với lượng đã bán.
  // Bàn giao đi qua Rescue Bridge (/store/rescue-bridge), lần hoàn tất được ghi vào donation_records (BR-B03-07).
  @Get('donations')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Sổ các lần bàn giao từ thiện đã hoàn tất qua Rescue Bridge (R2-121, CM-B03)',
  })
  @ApiResponse({ status: 200, description: 'Lịch sử quyên góp' })
  async getDonationRecords(@CurrentStore() storeId: string) {
    return this.decisionsService.getDonationRecords(storeId);
  }
}
