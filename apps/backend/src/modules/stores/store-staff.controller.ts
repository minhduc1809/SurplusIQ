import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { StoreStaffService } from './store-staff.service';
import { InviteStaffDto, UpdateStaffDto, AcceptStaffInviteDto } from './dto/store-operations.dto';
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

@ApiTags('Store - Staff Management')
@ApiBearerAuth()
@Controller('store/staff')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreStaffController {
  constructor(private readonly staffService: StoreStaffService) {}

  @Get()
  @Channel('STORE')
  @Roles(UserRole.STORE_USER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Danh sách nhân viên cửa hàng và thư mời đang chờ (R2-076)' })
  @ApiResponse({ status: 200, description: 'Danh sách nhân viên' })
  async getStaffList(@CurrentStore() storeId: string) {
    return this.staffService.getStaffList(storeId);
  }

  @Post('invitations')
  @Channel('STORE')
  @Roles(UserRole.STORE_USER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Mời nhân viên mới qua Email (kiểm tra quota gói) (R2-076, BR-076)' })
  @ApiResponse({ status: 201, description: 'Đã gửi lời mời thành công' })
  async inviteStaff(@CurrentStore() storeId: string, @Body() dto: InviteStaffDto) {
    return this.staffService.inviteStaff(storeId, dto);
  }

  @Patch(':id')
  @Channel('STORE')
  @Roles(UserRole.STORE_USER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Cập nhật phân quyền hoặc trạng thái nhân viên (R2-077)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateStaffRole(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.staffService.updateStaffRole(storeId, id, dto, user.userId);
  }

  @Delete(':id')
  @Channel('STORE')
  @Roles(UserRole.STORE_USER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Xóa nhân viên khỏi cửa hàng (R2-078)' })
  @ApiResponse({ status: 200, description: 'Đã xóa nhân viên' })
  async removeStaff(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.staffService.removeStaff(storeId, id);
  }

  @Post('accept-invite')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Chấp nhận lời mời tham gia quản lý cửa hàng (R2-079)' })
  @ApiResponse({ status: 200, description: 'Đã tham gia cửa hàng thành công' })
  async acceptInvite(@CurrentUser() user: RequestUser, @Body() dto: AcceptStaffInviteDto) {
    return this.staffService.acceptInvite(dto.token, user.userId);
  }
}
