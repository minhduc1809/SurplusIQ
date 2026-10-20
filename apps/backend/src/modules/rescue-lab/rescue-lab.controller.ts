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
import { RescueLabService } from './rescue-lab.service';
import {
  ApplyRescueLabVersionDto,
  CompareRescueLabVersionsDto,
  CreateRescueLabScenarioDto,
  RescueLabVersionParamsDto,
} from './dto/rescue-lab.dto';
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
import { PlanGuard } from '../../common/guards/plan.guard';
import { RequiresPlan } from '../../common/decorators/requires-plan.decorator';

type StoreRequest = { storeMember?: StoreMemberEntity };

/**
 * CM-B04 Rescue Lab. Cùng phạm vi quyền với mô phỏng giá hiện có (R2-104/105): OWNER, MANAGER.
 * store_id luôn lấy từ token (@CurrentStore) và mọi truy vấn lọc theo nó (BR-B04-07).
 * Không có endpoint sửa/xóa phiên bản: sửa kịch bản = POST phiên bản mới (BR-B04-01).
 */
@ApiTags('Store - Rescue Lab (CM-B04)')
@ApiBearerAuth()
@Controller('store/rescue-lab')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard, PlanGuard)
@RequiresPlan()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Permissions(StorePermission.OWNER, StorePermission.MANAGER)
export class RescueLabController {
  constructor(private readonly rescueLabService: RescueLabService) {}

  @Get('metric-definitions')
  @ApiOperation({
    summary: 'Định nghĩa/công thức/nguồn của chỉ số và mô hình mô phỏng (BR-B04-08)',
  })
  getMetricDefinitions() {
    return this.rescueLabService.getMetricDefinitions();
  }

  @Get('scenarios')
  @ApiOperation({ summary: 'Danh sách kịch bản kèm phiên bản mới nhất' })
  listScenarios(@CurrentStore() storeId: string) {
    return this.rescueLabService.listScenarios(storeId);
  }

  @Post('scenarios')
  @ApiOperation({
    summary: 'Tạo kịch bản + phiên bản 1 và chạy ngay (Nháp → Đang chạy → Hoàn tất/Thất bại)',
  })
  @ApiResponse({
    status: 201,
    description: 'Phiên bản sau khi chạy; giữ Nháp kèm cảnh báo nếu thiếu dữ liệu',
  })
  createScenario(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateRescueLabScenarioDto,
  ) {
    return this.rescueLabService.createScenario(storeId, user.userId, dto);
  }

  @Get('scenarios/:id')
  @ApiOperation({
    summary: 'Chi tiết kịch bản và toàn bộ lịch sử phiên bản (không bao giờ bị ghi đè)',
  })
  getScenario(@CurrentStore() storeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rescueLabService.getScenario(storeId, id);
  }

  @Post('scenarios/:id/versions')
  @ApiOperation({
    summary: 'Sửa kịch bản = tạo phiên bản N+1 và chạy; phiên bản cũ giữ nguyên kết quả',
  })
  createVersion(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescueLabVersionParamsDto,
  ) {
    return this.rescueLabService.createVersion(storeId, id, user.userId, dto);
  }

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Chi tiết phiên bản kèm ảnh chụp dữ liệu nguồn đã dùng để tính' })
  getVersion(
    @CurrentStore() storeId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.rescueLabService.getVersion(storeId, versionId);
  }

  @Post('versions/:versionId/run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chạy lại phiên bản đang Nháp (ví dụ sau khi bổ sung dữ liệu còn thiếu)',
  })
  @ApiResponse({
    status: 409,
    description: 'Phiên bản đã có kết quả/đang chạy - tạo phiên bản mới',
  })
  runVersion(
    @CurrentStore() storeId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.rescueLabService.runVersion(storeId, versionId);
  }

  @Post('versions/:versionId/apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ghi nhận đã áp dụng thực tế (người, thời điểm, phạm vi, cửa sổ quan sát). KHÔNG tự đổi giá/tồn (BR-B04-04/05)',
  })
  @ApiResponse({ status: 409, description: 'Đã ghi nhận áp dụng trước đó' })
  applyVersion(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: StoreRequest,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: ApplyRescueLabVersionDto,
  ) {
    return this.rescueLabService.applyVersion(
      storeId,
      versionId,
      { userId: user.userId, role: req.storeMember?.permission ?? 'UNKNOWN' },
      dto,
    );
  }

  @Get('versions/:versionId/observation')
  @ApiOperation({
    summary:
      'Số liệu thực tế trong cửa sổ quan sát và chênh lệch so với mô phỏng, kèm giới hạn diễn giải',
  })
  getObservation(
    @CurrentStore() storeId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    return this.rescueLabService.getObservation(storeId, versionId);
  }

  @Post('compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'So sánh các phiên bản tương thích (cùng mục tiêu, dữ liệu, phạm vi) - BR-B04-02',
  })
  @ApiResponse({ status: 400, description: 'Không tương thích - trả lý do cụ thể' })
  compare(@CurrentStore() storeId: string, @Body() dto: CompareRescueLabVersionsDto) {
    return this.rescueLabService.compareVersions(storeId, dto.versionIds);
  }
}
