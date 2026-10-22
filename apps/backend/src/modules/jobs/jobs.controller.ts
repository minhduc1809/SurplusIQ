import { Controller, Post, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/auth/user.entity';

// Các tác vụ nền chỉ ADMIN kích hoạt thủ công (BUG-004): scheduler nội bộ gọi thẳng JobsService nên không đi qua đây.
@ApiTags('Jobs - Background Tasks')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('release-holds')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Kích hoạt thủ công tác vụ nhả suất hết hạn giữ 10 phút và hoàn tồn kho (R1-042, BR-017)',
  })
  @ApiResponse({ status: 200, description: 'Đã hoàn tất nhả suất' })
  async releaseHolds() {
    return this.jobsService.releaseExpiredHolds();
  }

  @Post('pickup-expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Kích hoạt thủ công tác vụ đơn quá hạn nhận hàng + 15 phút trễ -> noshow & khóa đặt (R1-059, BR-020, BR-024)',
  })
  @ApiResponse({ status: 200, description: 'Đã xử lý quá hạn nhận hàng' })
  async pickupExpire() {
    return this.jobsService.expireUnclaimedPickups();
  }

  @Post('auto-close-offers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Kích hoạt thủ công tác vụ tự động đóng suất bán hết khung nhận và chốt hao hụt (R2-034, BR-058)',
  })
  @ApiResponse({ status: 200, description: 'Đã tự động đóng các suất hết giờ' })
  async autoCloseOffers() {
    return this.jobsService.autoCloseExpiredOffers();
  }

  @Post('complaints-auto-accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tự động chấp thuận khiếu nại quá hạn 48h và hoàn tiền 100% (BR-071, R2-060)',
  })
  @ApiResponse({ status: 200, description: 'Đã xử lý khiếu nại quá hạn' })
  async complaintsAutoAccept() {
    return this.jobsService.autoAcceptExpiredComplaints();
  }

  @Post('statements-close-week')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chốt sao kê tuần và khóa bất biến (R2-066, BR-075)',
  })
  @ApiResponse({ status: 200, description: 'Đã chốt sao kê tuần' })
  async statementsCloseWeek() {
    return this.jobsService.closeWeeklyStatements();
  }

  @Post('subscription-lifecycle')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quét và xử lý hết hạn gói dịch vụ (VC-03, VC-06, VC-11)',
  })
  @ApiResponse({ status: 200, description: 'Đã xử lý chu kỳ gói dịch vụ' })
  async subscriptionLifecycle() {
    return this.jobsService.processSubscriptionLifecycles();
  }

  @Post('payments-recheck')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kiểm tra giao dịch treo quá 24h và hoàn tiền trễ (VC-07, R1-047)',
  })
  @ApiResponse({ status: 200, description: 'Đã kiểm tra giao dịch treo' })
  async paymentsRecheck() {
    return this.jobsService.recheckPendingPayments();
  }

  @Post('forecast-daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tính toán dự báo ngày mai cho cửa hàng Pro (R2-036..R2-043, BR-060)',
  })
  @ApiResponse({ status: 200, description: 'Đã chạy dự báo' })
  async forecastDaily() {
    return this.jobsService.generateDailyForecasts();
  }

  @Post('price-proposals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sinh đề xuất giá động và tự động đổi giá nếu bật AUTO (R2-044..048, BR-064/065)',
  })
  @ApiResponse({ status: 200, description: 'Đã xử lý đề xuất giá' })
  async priceProposals() {
    return this.jobsService.generateHourlyPriceProposals();
  }

  @Post('notify-pickup-reminder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gửi nhắc nhở lấy hàng trước 30 phút (R1-075)',
  })
  @ApiResponse({ status: 200, description: 'Đã gửi nhắc nhở lấy hàng' })
  async notifyPickupReminder() {
    return this.jobsService.sendPickupReminders();
  }

  @Post('retention-cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dọn dẹp dữ liệu lưu trữ quá hạn 30/90 ngày (§7.4)',
  })
  @ApiResponse({ status: 200, description: 'Đã dọn dẹp dữ liệu quá hạn' })
  async retentionCleanup() {
    return this.jobsService.cleanupExpiredRetentionData();
  }

  @Post('account-anonymize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ẩn danh tài khoản yêu cầu xóa quá 7 ngày (BR-007, R1-019)',
  })
  @ApiResponse({ status: 200, description: 'Đã ẩn danh tài khoản' })
  async accountAnonymize() {
    return this.jobsService.anonymizePendingDeleteAccounts();
  }

  @Post('rescue-timeline-recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tính lại mức nguy cơ Rescue Timeline cho mọi cửa hàng có lô đang hoạt động (CM-B01)',
  })
  @ApiResponse({
    status: 200,
    description: 'Đã tính lại Rescue Timeline (kèm danh sách cửa hàng lỗi để xử lý lại)',
  })
  async rescueTimelineRecalculate() {
    return this.jobsService.recalculateRescueTimelines();
  }

  @Post('rescue-pool-deadlines')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xử lý hạn Rescue Pool: đóng đăng ký, hết hạn chờ cửa hàng, hết hạn đề nghị (CM-B02)',
  })
  @ApiResponse({ status: 200, description: 'Số đợt đã chuyển trạng thái' })
  async rescuePoolDeadlines() {
    return this.jobsService.processRescuePoolDeadlines();
  }

  @Post('rescue-bridge-deadlines')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xử lý hạn nhận Rescue Bridge: quá hạn → Hủy/Thất bại hoặc chuyển vận hành (CM-B03)',
  })
  @ApiResponse({ status: 200, description: 'Số đề nghị đã xử lý' })
  async rescueBridgeDeadlines() {
    return this.jobsService.processRescueBridgeDeadlines();
  }

  @Post('run-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kích hoạt đồng thời toàn bộ tác vụ nền định kỳ',
  })
  @ApiResponse({ status: 200, description: 'Toàn bộ tác vụ đã hoàn thành' })
  async runAll() {
    return this.jobsService.processAllBackgroundJobs();
  }
}
