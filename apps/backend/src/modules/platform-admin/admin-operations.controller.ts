import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/auth/user.entity';
import { UpdateStoreSettingsDto } from '../settings/dto/update-store-settings.dto';
import { AdminOperationsService } from './admin-operations.service';
import { PaymentsService } from '../payments/payments.service';
import {
  CreateAdminQuotaDto,
  ResolveAdminComplaintDto,
  UpdateAdminQuotaDto,
  UpdateAdminReviewDto,
  UpdateAdminViolationDto,
  RejectPaymentProofDto,
} from './dto/admin-operations.dto';

@ApiTags('Platform Admin - Operations')
@ApiBearerAuth()
@Controller('admin')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminOperationsController {
  constructor(
    private readonly service: AdminOperationsService,
    private readonly payments: PaymentsService,
  ) {}

  @Post('orders/:id/payment-proof/confirm')
  @ApiOperation({ summary: 'Xác nhận đã nhận tiền theo biên lai khách gửi (KX02)' })
  confirmPaymentProof(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.payments.confirmPaymentProof(id, actorId);
  }

  @Post('orders/:id/payment-proof/reject')
  @ApiOperation({ summary: 'Từ chối biên lai khách gửi (KX02)' })
  rejectPaymentProof(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: RejectPaymentProofDto,
  ) {
    return this.payments.rejectPaymentProof(id, actorId, dto.reason);
  }

  @Post('complaints/:id/resolve')
  @ApiOperation({
    summary: 'Chấp nhận hoặc từ chối khiếu nại; hoàn tiền mô phỏng nếu được chấp nhận',
  })
  resolveComplaint(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: ResolveAdminComplaintDto,
  ) {
    return this.service.resolveComplaint(id, actorId, dto);
  }

  @Patch('violations/:id')
  updateViolation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateAdminViolationDto,
  ) {
    return this.service.updateViolation(id, actorId, dto);
  }

  @Patch('reviews/:id')
  updateReview(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateAdminReviewDto,
  ) {
    return this.service.updateReview(id, actorId, dto);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Ẩn đánh giá; giữ nguyên nội dung và lịch sử' })
  hideReview(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') actorId: string) {
    return this.service.updateReview(id, actorId, { status: 'HIDDEN' });
  }

  @Put('stores/:id/settings')
  updateStoreSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateStoreSettingsDto,
  ) {
    return this.service.updateStoreSettings(id, actorId, dto);
  }

  @Post('stores/:id/subscription/:action')
  @ApiOperation({
    summary:
      'Đổi gói: upgrade, renew hoặc downgrade; nâng/gia hạn tạo hóa đơn mô phỏng 300.000 VND',
  })
  changeSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action') action: string,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.service.changeSubscription(id, actorId, action);
  }

  @Post('quotas')
  createQuota(@CurrentUser('userId') actorId: string, @Body() dto: CreateAdminQuotaDto) {
    return this.service.createQuota(actorId, dto);
  }

  @Patch('quotas/:id')
  updateQuota(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') actorId: string,
    @Body() dto: UpdateAdminQuotaDto,
  ) {
    return this.service.updateQuota(id, actorId, dto);
  }

  @Delete('quotas/:id')
  @ApiOperation({ summary: 'Xóa hạn mức ghi đè và dùng lại hạn mức mặc định' })
  deleteQuota(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('userId') actorId: string) {
    return this.service.deleteQuota(id, actorId);
  }
}
