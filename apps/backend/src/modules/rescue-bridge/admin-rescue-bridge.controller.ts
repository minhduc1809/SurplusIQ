import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RescueBridgeService } from './rescue-bridge.service';
import {
  CreateRecipientOrgDto,
  ResolveDisputeDto,
  UpdateRecipientOrgDto,
} from './dto/rescue-bridge.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

/** Vận hành nền tảng: sổ đơn vị tiếp nhận (duyệt hồ sơ - BR-B03-02) và xử lý tranh chấp bàn giao. */
@ApiTags('Admin - Rescue Bridge')
@ApiBearerAuth()
@Controller('admin/rescue-bridge')
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminRescueBridgeController {
  constructor(private readonly service: RescueBridgeService) {}

  @Post('recipient-orgs')
  @ApiOperation({ summary: 'Thêm đơn vị tiếp nhận (mặc định chưa duyệt)' })
  async createOrg(@CurrentUser() user: RequestUser, @Body() dto: CreateRecipientOrgDto) {
    return this.service.createOrg(user.userId, dto);
  }

  @Get('recipient-orgs')
  @ApiOperation({ summary: 'Danh sách đơn vị tiếp nhận' })
  async listOrgs() {
    return this.service.listOrgs();
  }

  @Patch('recipient-orgs/:id')
  @ApiOperation({ summary: 'Sửa hồ sơ / duyệt (isApproved) / ngừng hoạt động (isActive)' })
  async updateOrg(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecipientOrgDto,
  ) {
    return this.service.updateOrg(user.userId, id, dto);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'Đề nghị đang tranh chấp chờ vận hành xử lý' })
  async disputes() {
    return this.service.listDisputes();
  }

  @Post('transfers/:id/resolve-dispute')
  @ApiOperation({ summary: 'Ghi nhận kết luận xử lý tranh chấp (0 = thất bại)' })
  async resolve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.service.resolveDispute(user.userId, id, dto);
  }
}
