import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RescuePoolService } from './rescue-pool.service';
import {
  ConfirmOfferDto,
  QueryCustomerRescuePoolsDto,
  ReasonDto,
  RegisterDemandDto,
  UpdateDemandDto,
} from './dto/rescue-pool.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

/**
 * Rescue Pool phía khách (CM-C02). Đăng ký nhu cầu KHÔNG phải đơn hàng: register/update/withdraw
 * không giữ tồn, không tạo đơn, không thu tiền. Chỉ confirm-offer tạo đơn qua luồng đặt hàng hiện tại.
 */
@ApiTags('Customer - Rescue Pool')
@ApiBearerAuth()
@Controller('customer/rescue-pools')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerRescuePoolController {
  constructor(private readonly rescuePoolService: RescuePoolService) {}

  @Get()
  @ApiOperation({
    summary:
      'Danh sách đợt đang mở + đợt mình đã tham gia (ngưỡng, thời hạn công bố trước - BR-C02-04)',
  })
  async list(@CurrentUser() user: RequestUser, @Query() query: QueryCustomerRescuePoolsDto) {
    return this.rescuePoolService.listForCustomer(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đợt, đăng ký của tôi và đề nghị cung ứng (nếu đủ điều kiện)' })
  async detail(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.rescuePoolService.getCustomerPool(user.userId, id);
  }

  @Post(':id/register')
  @ApiOperation({
    summary: 'Đăng ký nhu cầu - không tạo đơn, không giữ tồn, không thu tiền (BR-C02-01)',
  })
  @ApiResponse({ status: 409, description: 'Đợt đã đóng hoặc đã đăng ký (BR-C02-07)' })
  async register(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterDemandDto,
  ) {
    return this.rescuePoolService.register(user.userId, id, dto);
  }

  @Patch(':id/registration')
  @ApiOperation({ summary: 'Sửa nhu cầu khi đợt còn mở đăng ký' })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDemandDto,
  ) {
    return this.rescuePoolService.updateRegistration(user.userId, id, dto);
  }

  @Delete(':id/registration')
  @ApiOperation({
    summary:
      'Rút nhu cầu (bắt buộc lý do). Không hủy đơn đã có - đơn đi luồng hủy hiện tại (BR-C02-10)',
  })
  @ApiResponse({ status: 409, description: 'Đã có đơn chính thức từ đợt' })
  async withdraw(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.rescuePoolService.withdraw(user.userId, id, dto.reason);
  }

  @Post(':id/confirm-offer')
  @ApiOperation({
    summary:
      'Khách chủ động xác nhận mua theo đề nghị: server kiểm tra lại hạn/phiên bản/nguồn cung rồi tạo đơn qua luồng giữ suất hiện tại (idempotent)',
  })
  @ApiResponse({ status: 409, description: 'Đề nghị hết hạn, đã thay đổi, hoặc hết suất' })
  async confirmOffer(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmOfferDto,
  ) {
    return this.rescuePoolService.confirmOffer(user.userId, id, dto);
  }
}
