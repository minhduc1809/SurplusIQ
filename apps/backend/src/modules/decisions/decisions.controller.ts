import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DecisionsService } from './decisions.service';
import { OverrideForecastDto, LogDailyActualDto, QueryForecastDto } from './dto/decisions.dto';
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
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xem dự báo sản xuất bánh/thực phẩm cho ngày mai (R2-036..R2-043)' })
  @ApiResponse({ status: 200, description: 'Danh sách dự báo theo từng món' })
  async getForecasts(@CurrentStore() storeId: string, @Query() query: QueryForecastDto) {
    return this.decisionsService.getForecasts(storeId, query.targetDate);
  }

  @Post('forecast/:id/override')
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
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Ghi nhận số lượng sản xuất và bán thực tế cuối ngày (R2-039)' })
  @ApiResponse({ status: 201, description: 'Đã ghi nhận số liệu thực tế' })
  async logDailyActual(@CurrentStore() storeId: string, @Body() dto: LogDailyActualDto) {
    return this.decisionsService.logDailyActual(storeId, dto);
  }

  @Get('decisions/pricing/proposals')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Danh sách đề xuất định giá động đang chờ duyệt (R2-047)' })
  @ApiResponse({ status: 200, description: 'Danh sách đề xuất giá' })
  async getPricingProposals(@CurrentStore() storeId: string) {
    return this.decisionsService.getPricingProposals(storeId);
  }

  @Post('decisions/pricing/propose/:offerId')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Khởi tạo đề xuất định giá động theo thời gian thực (R2-044..R2-048)' })
  @ApiResponse({ status: 200, description: 'Kết quả đề xuất giá' })
  async proposeDynamicPrice(@CurrentStore() storeId: string, @Param('offerId') offerId: string) {
    return this.decisionsService.proposeDynamicPrice(storeId, offerId);
  }

  @Post('decisions/pricing/proposals/:id/accept')
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
}
