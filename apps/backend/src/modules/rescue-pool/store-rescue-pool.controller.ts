import {
  Body,
  Controller,
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
  ClosePoolDto,
  CreateRescuePoolDto,
  PublishSupplyOfferDto,
  QueryStoreRescuePoolsDto,
  ReasonDto,
} from './dto/rescue-pool.dto';
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

/** Rescue Pool Manager (CM-B02). store_id luôn lấy từ token - cô lập dữ liệu theo cửa hàng. */
@ApiTags('Store - Rescue Pool')
@ApiBearerAuth()
@Controller('store/rescue-pools')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreRescuePoolController {
  constructor(private readonly rescuePoolService: RescuePoolService) {}

  @Post()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Tạo đợt gom nhu cầu ở trạng thái Nháp (BR-B02-03/04)' })
  @ApiResponse({ status: 201, description: 'Đợt đã tạo (DRAFT)' })
  async create(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRescuePoolDto,
  ) {
    return this.rescuePoolService.createPool(storeId, user.userId, dto);
  }

  @Get()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Danh sách đợt Rescue Pool của cửa hàng' })
  async list(@CurrentStore() storeId: string, @Query() query: QueryStoreRescuePoolsDto) {
    return this.rescuePoolService.listStorePools(storeId, query);
  }

  @Get(':id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Chi tiết đợt + nhu cầu tổng hợp (chỉ số liệu tổng hợp, không có dữ liệu cá nhân - BR-B02-08)',
  })
  async detail(@CurrentStore() storeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rescuePoolService.getStorePool(storeId, id);
  }

  @Patch(':id/open')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Mở đăng ký: Nháp → Mở đăng ký (chỉ khi đủ điều kiện bắt buộc)' })
  @ApiResponse({ status: 409, description: 'Chuyển trạng thái không hợp lệ' })
  async open(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rescuePoolService.openPool(storeId, user.userId, id);
  }

  @Post(':id/close-registration')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Chốt đăng ký sớm (bắt buộc lý do): tổng hợp nhu cầu → Chờ cửa hàng / Không đủ điều kiện',
  })
  async closeRegistration(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ) {
    return this.rescuePoolService.closeRegistration(storeId, user.userId, id, dto.reason);
  }

  @Patch(':id/supply-offer')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Công bố/sửa đề nghị cung ứng (kiểm tra tồn, giá, khung nhận, ngưỡng; tăng offer_version)',
  })
  @ApiResponse({
    status: 400,
    description: 'Vượt nguồn cung/tồn, thiếu lý do sửa, hạn không hợp lệ',
  })
  async publishSupplyOffer(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishSupplyOfferDto,
  ) {
    return this.rescuePoolService.publishSupplyOffer(storeId, user.userId, id, dto);
  }

  @Post(':id/close')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary:
      'Từ chối/hủy (CANCELLED) hoặc chốt Không đủ điều kiện (INSUFFICIENT) - bắt buộc lý do, thông báo khách',
  })
  async close(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClosePoolDto,
  ) {
    return this.rescuePoolService.closePool(storeId, user.userId, id, dto);
  }

  @Get(':id/report')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Báo cáo đợt: đăng ký, đơn tạo, đơn nhận, số lượng bán, lý do thất bại',
  })
  async report(@CurrentStore() storeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rescuePoolService.getReport(storeId, id);
  }
}
