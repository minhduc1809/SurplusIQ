import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './jobs.service';

@ApiTags('Jobs - Background Tasks')
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
