import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import {
  UpdateStoreProfileDto,
  StoreReportsQueryDto,
  CustomerNoteDto,
  VirtualClockDto,
  ExportDataQueryDto,
  CreateStoreClosureDto,
  UpdateTaskRemindersDto,
  ComparePeriodsDto,
} from './dto/store-operations.dto';
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
import { PlanGuard } from '../../common/guards/plan.guard';
import { RequiresPlan } from '../../common/decorators/requires-plan.decorator';
import { QuotaService } from '../subscriptions/quota.service';
import { REPORT_HISTORY_DAYS } from '../subscriptions/plan-catalog.constants';

@ApiTags('Store - Operations & Reports')
@ApiBearerAuth()
@Controller('store')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreOperationsController {
  constructor(
    private readonly storesService: StoresService,
    private readonly quotaService: QuotaService,
  ) {}

  /** BRD 3.3: Cơ bản xem lịch sử báo cáo 7 ngày, Pro 365 ngày. */
  private async assertReportRange(storeId: string, startDate?: string) {
    if (!startDate) return;
    const plan = await this.quotaService.getEffectivePlan(storeId);
    const limit = REPORT_HISTORY_DAYS[plan];
    const oldest = Date.now() - (limit + 1) * 24 * 60 * 60 * 1000;
    if (new Date(startDate).getTime() < oldest) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_PLAN',
        message: `Gói hiện tại chỉ xem được báo cáo ${limit} ngày gần nhất. Nâng cấp Chuyên nghiệp để xem đến 365 ngày.`,
      });
    }
  }

  @Get('profile')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Xem thông tin hồ sơ và trạng thái cửa hàng (R2-004)' })
  @ApiResponse({ status: 200, description: 'Hồ sơ cửa hàng' })
  async getStoreProfile(@CurrentStore() storeId: string) {
    return this.storesService.getStoreProfile(storeId);
  }

  @Put('profile')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin hồ sơ cửa hàng (R2-005)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateStoreProfile(@CurrentStore() storeId: string, @Body() dto: UpdateStoreProfileDto) {
    return this.storesService.updateStoreProfile(storeId, dto);
  }

  @Post('pause-today')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Tạm dừng nhận đơn trong ngày hôm nay (R2-006, BR-006)' })
  @ApiResponse({ status: 200, description: 'Đã tạm dừng nhận đơn hôm nay' })
  async pauseToday(@CurrentStore() storeId: string) {
    return this.storesService.pauseToday(storeId);
  }

  @Post('resume-today')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Mở lại hoạt động nhận đơn hôm nay (R2-006)' })
  @ApiResponse({ status: 200, description: 'Đã mở lại hoạt động hôm nay' })
  async resumeToday(@CurrentStore() storeId: string) {
    return this.storesService.resumeToday(storeId);
  }

  @Get('daily-overview')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Tổng quan vận hành và kinh doanh trong ngày (R2-050)' })
  @ApiResponse({ status: 200, description: 'Số liệu tổng quan ngày' })
  async getDailyOverview(@CurrentStore() storeId: string) {
    return this.storesService.getDailyOverview(storeId);
  }

  @Get('pickup-schedule')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Lịch nhận hàng hôm nay phân theo các khung 15 phút (R2-050)' })
  @ApiResponse({ status: 200, description: 'Lịch nhận hàng' })
  async getPickupSchedule(@CurrentStore() storeId: string) {
    return this.storesService.getPickupSchedule(storeId);
  }

  @Get('reports/overview')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Báo cáo hiệu quả kinh doanh & cứu thực phẩm theo khoảng ngày (R2-061..R2-064)',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu báo cáo' })
  async getReportsOverview(@CurrentStore() storeId: string, @Query() query: StoreReportsQueryDto) {
    await this.assertReportRange(storeId, query.startDate);
    return this.storesService.getReportsOverview(storeId, query);
  }

  @Get('reports/finance')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({
    summary:
      'Thống kê tài chính theo khoảng ngày: doanh thu gộp, hoa hồng, hoàn tiền, thực nhận ước tính',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu tài chính và doanh thu theo ngày' })
  async getFinanceSummary(@CurrentStore() storeId: string, @Query() query: StoreReportsQueryDto) {
    await this.assertReportRange(storeId, query.startDate);
    return this.storesService.getFinanceSummary(storeId, query);
  }

  @Get('reports/reconciliation')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({
    summary: 'Báo cáo đối soát tài chính tuần và lịch sử sao kê bất biến (R2-068..R2-075)',
  })
  @ApiResponse({ status: 200, description: 'Dữ liệu đối soát' })
  async getReconciliation(@CurrentStore() storeId: string, @Query('cycleId') cycleId?: string) {
    return this.storesService.getReconciliation(storeId, cycleId);
  }

  @Get('statements')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Xem danh sách các bản sao kê đối soát tuần (R2-067)' })
  @ApiResponse({ status: 200, description: 'Danh sách sao kê tuần' })
  async getStatements(@CurrentStore() storeId: string) {
    return this.storesService.getStatements(storeId);
  }

  @Get('statements/:id')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({
    summary: 'Xem chi tiết sao kê đối soát tuần kèm danh sách dòng bút toán (R2-067)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết sao kê' })
  async getStatementDetail(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.storesService.getStatementById(storeId, id);
  }

  @Get('statements/:id/pdf')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Tải bản sao kê tuần định dạng PDF (R2-067)' })
  @ApiResponse({ status: 200, description: 'Dữ liệu PDF base64' })
  async getStatementPdf(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.storesService.getStatementPdf(storeId, id);
  }

  @Get('statements/:id/csv')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Tải bản sao kê tuần định dạng CSV (R2-067)' })
  @ApiResponse({ status: 200, description: 'Dữ liệu CSV' })
  async getStatementCsv(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.storesService.getStatementCsv(storeId, id);
  }

  @Get('export/orders')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xuất toàn bộ dữ liệu đơn hàng định dạng CSV (R2-103)' })
  @ApiResponse({ status: 200, description: 'Dữ liệu đơn hàng xuất file' })
  async exportOrders(@CurrentStore() storeId: string, @Query() query: ExportDataQueryDto) {
    return this.storesService.exportOrders(storeId, query);
  }

  @Get('export/accounting')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Xuất dữ liệu đối soát kế toán (R2-104..105)' })
  @ApiResponse({ status: 200, description: 'Dữ liệu kế toán xuất file' })
  async exportAccounting(@CurrentStore() storeId: string, @Query() query: ExportDataQueryDto) {
    return this.storesService.exportAccounting(storeId, query);
  }

  @Get('demo/virtual-clock')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xem trạng thái bộ điều khiển VirtualClock Time Machine (R2-065)' })
  @ApiResponse({ status: 200, description: 'Trạng thái demo' })
  async getVirtualClock(@CurrentStore() storeId: string) {
    return this.storesService.getVirtualClock(storeId);
  }

  @Post('demo/virtual-clock')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Bật/tắt chế độ demo tua nhanh 120s/ngày trên dữ liệu mẫu (R2-065)' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái demo' })
  async toggleVirtualClock(@CurrentStore() storeId: string, @Body() dto: VirtualClockDto) {
    return this.storesService.toggleVirtualClock(storeId, dto);
  }

  @Get('customers')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Danh sách khách hàng của quán kèm lịch sử mua (R2-082, R2-083)' })
  @ApiResponse({ status: 200, description: 'Danh sách khách hàng' })
  async getStoreCustomers(@CurrentStore() storeId: string) {
    return this.storesService.getStoreCustomers(storeId);
  }

  @Get('customers/:customerId/detail')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Chi tiết một khách ẩn danh: đơn, món hay mua, khiếu nại, đánh giá (R2-083)',
  })
  async getCustomerDetail(
    @CurrentStore() storeId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.storesService.getCustomerDetail(storeId, customerId);
  }

  @Get('customers/:customerId/notes')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Xem ghi chú nội bộ về khách hàng (R2-085)' })
  @ApiResponse({ status: 200, description: 'Ghi chú nội bộ' })
  async getCustomerNotes(@CurrentStore() storeId: string, @Param('customerId') customerId: string) {
    return this.storesService.getCustomerNotes(storeId, customerId);
  }

  @Post('customers/:customerId/notes')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Thêm/cập nhật ghi chú nội bộ về khách hàng (tối đa 200 ký tự) (R2-085)',
  })
  @ApiResponse({ status: 200, description: 'Đã lưu ghi chú nội bộ' })
  async saveCustomerNote(
    @CurrentStore() storeId: string,
    @Param('customerId') customerId: string,
    @Body() dto: CustomerNoteDto,
  ) {
    return this.storesService.saveCustomerNote(storeId, customerId, dto);
  }

  @Get('closures')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xem danh sách lịch nghỉ / giờ đặc biệt của quán (R2-097)' })
  @ApiResponse({ status: 200, description: 'Danh sách ngày đóng cửa' })
  async getClosures(@CurrentStore() storeId: string) {
    return this.storesService.getClosures(storeId);
  }

  @Post('closures')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Thêm hoặc cập nhật ngày đóng cửa / giờ đặc biệt (R2-097)' })
  @ApiResponse({ status: 201, description: 'Đã tạo/cập nhật ngày đóng cửa' })
  async createClosure(@CurrentStore() storeId: string, @Body() dto: CreateStoreClosureDto) {
    return this.storesService.createClosure(storeId, dto);
  }

  @Delete('closures/:id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xóa ngày đóng cửa đã thiết lập (R2-097)' })
  @ApiResponse({ status: 200, description: 'Đã xóa ngày đóng cửa' })
  async deleteClosure(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.storesService.deleteClosure(storeId, id);
  }

  @Get('tasks/today')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Hàng đợi danh sách công việc cần làm hôm nay (R2-095)' })
  @ApiResponse({ status: 200, description: 'Danh sách việc cần làm' })
  async getTodayTasks(@CurrentStore() storeId: string) {
    return this.storesService.getTodayTasks(storeId);
  }

  @Put('tasks/reminders')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Cập nhật cài đặt nhắc nhở công việc (R2-096)' })
  @ApiResponse({ status: 200, description: 'Đã lưu cấu hình nhắc nhở' })
  async updateTaskReminders(@CurrentStore() storeId: string, @Body() dto: UpdateTaskRemindersDto) {
    return this.storesService.updateTaskReminders(storeId, dto);
  }

  @Get('reports/items')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Báo cáo hiệu quả kinh doanh theo từng món ăn (R2-069)' })
  @ApiResponse({ status: 200, description: 'Báo cáo chi tiết từng món ăn' })
  async getItemReports(
    @CurrentStore() storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    await this.assertReportRange(storeId, startDate);
    return this.storesService.getItemReports(storeId, startDate, endDate);
  }

  @Get('reports/hourly-distribution')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Biểu đồ phân bổ lượng khách theo khung giờ trong ngày (R2-070)' })
  @ApiResponse({ status: 200, description: 'Phân bổ đơn hàng và khách hàng theo 24 giờ' })
  async getHourlyDistribution(
    @CurrentStore() storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.storesService.getHourlyDistribution(storeId, startDate, endDate);
  }

  @Get('reports/pricing-efficacy')
  @UseGuards(PlanGuard)
  @RequiresPlan()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Đánh giá hiệu quả chiến lược định giá động AI (R2-071)' })
  @ApiResponse({
    status: 200,
    description: 'Báo cáo tỷ lệ chấp thuận đề xuất giá và doanh thu cộng thêm',
  })
  async getPricingEfficacy(@CurrentStore() storeId: string) {
    return this.storesService.getPricingEfficacy(storeId);
  }

  @Post('reports/compare-periods')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'So sánh hiệu quả kinh doanh giữa 2 chu kỳ thời gian A vs B (R2-072)' })
  @ApiResponse({
    status: 200,
    description: 'Tăng trưởng doanh thu, số đơn và khách hàng mới giữa 2 chu kỳ',
  })
  async comparePeriods(@CurrentStore() storeId: string, @Body() dto: ComparePeriodsDto) {
    return this.storesService.comparePeriods(storeId, dto);
  }

  @Post('reports/public-impact-link')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Tạo liên kết chia sẻ chứng chỉ tác động môi trường công khai (R2-073)',
  })
  @ApiResponse({ status: 200, description: 'Liên kết công khai và nội dung chia sẻ mạng xã hội' })
  async generatePublicImpactLink(@CurrentStore() storeId: string) {
    return this.storesService.generatePublicImpactLink(storeId);
  }

  @Get('favorites-count')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Thống kê số lượng khách hàng theo dõi / yêu thích quán (R2-086)' })
  @ApiResponse({ status: 200, description: 'Số lượng người theo dõi quán' })
  async getFavoritesCount(@CurrentStore() storeId: string) {
    return this.storesService.getFavoritesCount(storeId);
  }
}
