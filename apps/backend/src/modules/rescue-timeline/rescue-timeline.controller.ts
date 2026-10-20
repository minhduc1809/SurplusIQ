import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RescueTimelineService } from './rescue-timeline.service';
import { RescueLotActionDto } from './dto/rescue-timeline.dto';
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
import { StoreMemberEntity, StorePermission } from '../../entities/stores/store-member.entity';

/** StorePermissionGuard gắn thành viên cửa hàng vào request - dùng để lọc hành động theo vai trò. */
type StoreRequest = { storeMember?: StoreMemberEntity };

@ApiTags('Store - Rescue Timeline (CM-B01)')
@ApiBearerAuth()
@Controller('store/rescue-timeline')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
export class RescueTimelineController {
  constructor(private readonly rescueTimelineService: RescueTimelineService) {}

  @Get()
  @ApiOperation({
    summary:
      'Danh sách lô/suất ưu tiên cứu theo mức nguy cơ, kèm yếu tố giải thích và thời điểm tính (CM-B01)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách ưu tiên (snapshot gần nhất, đánh dấu cần tính lại nếu cũ)',
  })
  async getTimeline(@CurrentStore() storeId: string) {
    return this.rescueTimelineService.getTimeline(storeId);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tính lại mức nguy cơ cho toàn bộ lô của cửa hàng ngay (BR-B01-05)' })
  @ApiResponse({ status: 200, description: 'Danh sách ưu tiên sau khi tính lại' })
  async refresh(@CurrentStore() storeId: string) {
    await this.rescueTimelineService.recalculateStore(storeId);
    return this.rescueTimelineService.getTimeline(storeId);
  }

  @Get(':lotId')
  @ApiOperation({
    summary: 'Chi tiết lô, yếu tố nguy cơ, hành động khả dụng theo quyền và lịch sử hành động',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết lô (đã tính lại tại thời điểm mở)' })
  @ApiResponse({ status: 404, description: 'Lô không tồn tại hoặc không thuộc cửa hàng' })
  async getLotDetail(
    @CurrentStore() storeId: string,
    @Param('lotId', ParseUUIDPipe) lotId: string,
    @Req() req: StoreRequest,
  ) {
    return this.rescueTimelineService.getLotDetail(storeId, lotId, req.storeMember?.permission);
  }

  @Post(':lotId/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Thực hiện/ghi nhận hành động cứu lô sau khi kiểm tra lại quyền, trạng thái và tồn dưới khóa dòng (BR-B01-06, BR-B01-07)',
  })
  @ApiResponse({ status: 200, description: 'Đã ghi hành động, kết quả và trạng thái lô mới' })
  @ApiResponse({ status: 403, description: 'Vai trò không đủ quyền - chỉ xem hoặc chuyển yêu cầu' })
  @ApiResponse({
    status: 409,
    description: 'Lô đã hết/đóng hoặc tồn đã thay đổi - trả trạng thái mới để tải lại',
  })
  async performAction(
    @CurrentStore() storeId: string,
    @Param('lotId', ParseUUIDPipe) lotId: string,
    @Body() dto: RescueLotActionDto,
    @CurrentUser() user: RequestUser,
    @Req() req: StoreRequest,
  ) {
    return this.rescueTimelineService.performAction(
      storeId,
      lotId,
      { userId: user.userId, permission: req.storeMember?.permission },
      dto,
    );
  }
}
