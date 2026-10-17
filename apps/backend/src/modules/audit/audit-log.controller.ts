import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AuditLogService, GetStoreAuditLogsQuery } from './audit-log.service';
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

@ApiTags('Store - Audit Logs (R2-075)')
@ApiBearerAuth()
@Controller('store/audit-logs')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions(StorePermission.OWNER)
  @ApiOperation({
    summary: 'Xem nhật ký hoạt động cửa hàng (R2-075 - Giữ 12 tháng, chỉ Chủ quán có quyền xem)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách nhật ký hoạt động kiểm toán' })
  @ApiQuery({
    name: 'action',
    required: false,
    description: 'Lọc theo hành động (ví dụ: PRICE_CHANGED)',
  })
  @ApiQuery({
    name: 'targetType',
    required: false,
    description: 'Lọc theo đối tượng (ví dụ: OFFER, ITEM)',
  })
  @ApiQuery({
    name: 'actorId',
    required: false,
    description: 'Lọc theo nhân viên cụ thể (R2-081)',
  })
  @ApiQuery({
    name: 'employeeId',
    required: false,
    description: 'Alias của actorId để lọc theo nhân viên cụ thể',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Thời gian bắt đầu (tối đa 12 tháng trước)',
  })
  @ApiQuery({ name: 'to', required: false, description: 'Thời gian kết thúc' })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang (mặc định 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số bản ghi / trang (mặc định 20, tối đa 100)',
  })
  async getStoreAuditLogs(@CurrentStore() storeId: string, @Query() query: GetStoreAuditLogsQuery) {
    return this.auditLogService.getStoreAuditLogs(storeId, query);
  }
}
