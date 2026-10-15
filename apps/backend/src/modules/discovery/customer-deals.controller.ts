import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { QueryDealsDto } from './dto/query-deals.dto';
import { QueryMapDealsDto } from './dto/query-map-deals.dto';
import { CreateDealAlertDto, UpdateDealAlertDto } from './dto/deal-alert.dto';
import { CreateSavedFilterDto } from './dto/saved-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Deals Discovery')
@Controller('customer')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerDealsController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get('deals')
  @ApiOperation({
    summary:
      'Khám phá danh sách deal gần vị trí với PostGIS, tìm kiếm, lọc và phân trang (R1-020, R1-022..R1-025)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách các suất cứu món khả dụng' })
  async findNearbyDeals(@Query() query: QueryDealsDto) {
    return this.discoveryService.findNearbyDeals(query);
  }

  @Public()
  @Get('deals/map')
  @ApiOperation({
    summary:
      'Lấy danh sách các cửa hàng có deal đang mở để hiển thị điểm ghim trên bản đồ (R1-021)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách các điểm ghim bản đồ' })
  async findMapPins(@Query() query: QueryMapDealsDto) {
    return this.discoveryService.findMapPins(query);
  }

  @Public()
  @Get('deals/compare')
  @ApiOperation({
    summary: 'So sánh 2 đến 3 suất bán theo giá, khoảng cách và dị ứng (R1-036)',
  })
  @ApiResponse({ status: 200, description: 'Bảng so sánh chi tiết giữa các suất bán' })
  @ApiResponse({ status: 400, description: 'Chỉ có thể so sánh từ 2 đến 3 suất' })
  async compareDeals(@Query('ids') ids: string) {
    const dealIds = (ids || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.discoveryService.compareDeals(dealIds);
  }

  @Public()
  @Get('deals/:id')
  @ApiOperation({
    summary: 'Xem chi tiết suất cứu món kèm thành phần, dị ứng và thông tin cửa hàng (R1-026)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết deal' })
  @ApiResponse({ status: 404, description: 'Deal không tồn tại hoặc đã hết hạn' })
  async getDealDetail(@Param('id') id: string) {
    return this.discoveryService.getDealDetail(id);
  }

  @Public()
  @Get('deals/:id/share')
  @ApiOperation({
    summary: 'Lấy thông tin chia sẻ liên kết suất bán an toàn không chứa PII (R1-037)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin liên kết chia sẻ an toàn' })
  async getShareableDeal(@Param('id') id: string) {
    return this.discoveryService.getShareableDeal(id);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Post('deals/:id/save')
  @ApiOperation({
    summary: 'Lưu deal để xem sau (R1-034)',
  })
  @ApiResponse({ status: 200, description: 'Đã lưu deal vào danh sách xem sau' })
  async saveDeal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.saveDeal(user?.userId, id);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Delete('deals/:id/save')
  @ApiOperation({
    summary: 'Bỏ lưu deal xem sau (R1-034)',
  })
  @ApiResponse({ status: 200, description: 'Đã xóa deal khỏi danh sách xem sau' })
  async unsaveDeal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.unsaveDeal(user?.userId, id);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Get('saved-deals')
  @ApiOperation({
    summary: 'Lấy danh sách deal đã lưu của khách hàng, tự động đánh dấu deal đã hết hạn (R1-034)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách deal đã lưu' })
  async getSavedDeals(@CurrentUser() user: RequestUser) {
    return this.discoveryService.getSavedDeals(user?.userId);
  }

  // -------------------------------------------------------------------------
  // CẢNH BÁO DEAL (DEAL ALERTS - R1-031, R1-032)
  // -------------------------------------------------------------------------

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Post('deal-alerts')
  @ApiOperation({
    summary: 'Tạo cảnh báo deal theo tiêu chí mong muốn (tối đa 10 cảnh báo đang bật) (R1-031)',
  })
  @ApiResponse({ status: 201, description: 'Tạo cảnh báo deal thành công' })
  @ApiResponse({ status: 400, description: 'Vượt quá 10 cảnh báo hoặc tiêu chí rỗng' })
  async createDealAlert(@CurrentUser() user: RequestUser, @Body() dto: CreateDealAlertDto) {
    return this.discoveryService.createDealAlert(user?.userId, dto);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Get('deal-alerts')
  @ApiOperation({
    summary: 'Xem danh sách các cảnh báo deal của tôi (R1-032)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách cảnh báo deal' })
  async getDealAlerts(@CurrentUser() user: RequestUser) {
    return this.discoveryService.getDealAlerts(user?.userId);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Put('deal-alerts/:id')
  @ApiOperation({
    summary: 'Chỉnh sửa hoặc bật/tắt cảnh báo deal (R1-032)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật cảnh báo thành công' })
  async updateDealAlert(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDealAlertDto,
  ) {
    return this.discoveryService.updateDealAlert(user?.userId, id, dto);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Delete('deal-alerts/:id')
  @ApiOperation({
    summary: 'Xóa cảnh báo deal (R1-032)',
  })
  @ApiResponse({ status: 200, description: 'Xóa cảnh báo thành công' })
  async deleteDealAlert(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.deleteDealAlert(user?.userId, id);
  }

  // -------------------------------------------------------------------------
  // BỘ LỌC TÌM KIẾM ĐÃ LƯU (SAVED FILTERS - R1-033)
  // -------------------------------------------------------------------------

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Post('saved-filters')
  @ApiOperation({
    summary: 'Lưu bộ lọc tìm kiếm thường dùng (tối đa 10 bộ lọc) (R1-033)',
  })
  @ApiResponse({ status: 201, description: 'Lưu bộ lọc thành công' })
  @ApiResponse({ status: 400, description: 'Trùng tên hoặc vượt quá 10 bộ lọc' })
  async createSavedFilter(@CurrentUser() user: RequestUser, @Body() dto: CreateSavedFilterDto) {
    return this.discoveryService.createSavedFilter(user?.userId, dto);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Get('saved-filters')
  @ApiOperation({
    summary: 'Danh sách các bộ lọc tìm kiếm đã lưu (R1-033)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách bộ lọc đã lưu' })
  async getSavedFilters(@CurrentUser() user: RequestUser) {
    return this.discoveryService.getSavedFilters(user?.userId);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Delete('saved-filters/:id')
  @ApiOperation({
    summary: 'Xóa bộ lọc tìm kiếm đã lưu (R1-033)',
  })
  @ApiResponse({ status: 200, description: 'Xóa bộ lọc thành công' })
  async deleteSavedFilter(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.deleteSavedFilter(user?.userId, id);
  }

  // -------------------------------------------------------------------------
  // LỊCH SỬ XEM DEAL (VIEW HISTORY - R1-035)
  // -------------------------------------------------------------------------

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Post('view-history/:offerId')
  @ApiOperation({
    summary: 'Ghi nhận lịch sử xem chi tiết deal (R1-035)',
  })
  @ApiResponse({ status: 201, description: 'Đã ghi nhận lượt xem' })
  async recordViewHistory(@CurrentUser() user: RequestUser, @Param('offerId') offerId: string) {
    return this.discoveryService.recordViewHistory(user?.userId, offerId);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Get('view-history')
  @ApiOperation({
    summary: 'Xem danh sách tối đa 20 deal đã xem gần nhất (R1-035)',
  })
  @ApiResponse({ status: 200, description: 'Lịch sử xem deal' })
  async getViewHistory(@CurrentUser() user: RequestUser) {
    return this.discoveryService.getViewHistory(user?.userId);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Delete('view-history')
  @ApiOperation({
    summary: 'Xóa toàn bộ lịch sử xem deal của tôi (R1-035)',
  })
  @ApiResponse({ status: 200, description: 'Xóa lịch sử xem thành công' })
  async clearViewHistory(@CurrentUser() user: RequestUser) {
    return this.discoveryService.clearViewHistory(user?.userId);
  }
}
