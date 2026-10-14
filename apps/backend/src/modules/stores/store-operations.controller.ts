import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { UpdateStoreProfileDto, StoreReportsQueryDto } from './dto/store-operations.dto';
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

@ApiTags('Store - Operations & Reports')
@ApiBearerAuth()
@Controller('store')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreOperationsController {
  constructor(private readonly storesService: StoresService) {}

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
    return this.storesService.getReportsOverview(storeId, query);
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
}
