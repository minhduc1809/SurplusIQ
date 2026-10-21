import {
  Controller,
  Get,
  Put,
  Body,
  Headers,
  Logger,
  Req,
  ForbiddenException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Channel } from '../../common/decorators/channel.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';
import { StorePermission } from '../../entities/stores/store-member.entity';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';
import { SettingsService } from './settings.service';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(
    private readonly settingsService: SettingsService,
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
  ) {}

  /** Cửa hàng luôn lấy từ token; x-store-id gửi lên mà khác token là dấu hiệu dò quét (BUG-002). */
  private resolveStoreId(user: RequestUser, headerStoreId?: string): string {
    if (headerStoreId && headerStoreId !== user.storeId) {
      this.logger.warn(
        `Từ chối x-store-id=${headerStoreId} khác cửa hàng của người dùng ${user.userId} (${user.storeId})`,
      );
      throw new ForbiddenException({
        code: 'FORBIDDEN_STORE',
        message: 'Bạn không có quyền truy cập cấu hình của cửa hàng khác',
      });
    }
    return user.storeId as string;
  }

  /** Gói Pro tính từ subscription thật, không tin header x-is-pro. */
  private async isProPlan(storeId: string): Promise<boolean> {
    const sub = await this.subRepo.findOne({ where: { storeId } });
    return (
      !!sub &&
      (sub.plan === SubscriptionPlan.PRO || sub.plan === SubscriptionPlan.TRIAL) &&
      !!sub.periodEnd &&
      new Date(sub.periodEnd).getTime() >= Date.now() &&
      sub.status !== SubscriptionStatus.EXPIRED
    );
  }

  @Get('platform-settings')
  @ApiOperation({ summary: 'Lấy toàn bộ tham số cấu hình nền tảng' })
  @ApiResponse({ status: 200, description: 'Danh sách tham số nền tảng' })
  async getPlatformSettings() {
    return this.settingsService.getAllPlatformSettings();
  }

  @Get('store/settings')
  @ApiBearerAuth()
  @Channel('STORE')
  @Roles(UserRole.STORE_USER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Lấy cấu hình cửa hàng của người dùng đăng nhập (R2-007)' })
  @ApiResponse({ status: 200, description: 'Cấu hình cửa hàng (COUNTER chỉ nhận trường vận hành)' })
  async getStoreSettings(
    @CurrentUser() user: RequestUser,
    @Req() req: { storeMember?: { permission: StorePermission } },
    @Headers('x-store-id') headerStoreId?: string,
  ) {
    const storeId = this.resolveStoreId(user, headerStoreId);
    const settings = await this.settingsService.getStoreSettings(storeId);
    if (req.storeMember?.permission === StorePermission.COUNTER) {
      const {
        storeId: id,
        defaultPickupStart,
        defaultPickupEnd,
        lateGraceMinutes,
        maxQtyPerOrder,
      } = settings;
      return {
        storeId: id,
        defaultPickupStart,
        defaultPickupEnd,
        lateGraceMinutes,
        maxQtyPerOrder,
      };
    }
    return settings;
  }

  @Put('store/settings')
  @ApiBearerAuth()
  @Channel('STORE')
  @Roles(UserRole.STORE_USER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
  @Permissions(StorePermission.OWNER)
  @ApiOperation({
    summary: 'Cập nhật cấu hình cửa hàng với kiểm tra biên và ghi vết (R2-008, R2-101, R2-102)',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateStoreSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateStoreSettingsDto,
    @Headers('x-store-id') headerStoreId?: string,
  ) {
    const storeId = this.resolveStoreId(user, headerStoreId);
    return this.settingsService.updateStoreSettings(
      storeId,
      user.userId,
      dto,
      await this.isProPlan(storeId),
    );
  }

  @Get('store/settings/history')
  @ApiBearerAuth()
  @Channel('STORE')
  @Roles(UserRole.STORE_USER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Lấy lịch sử thay đổi cấu hình của cửa hàng (R2-102)' })
  async getStoreSettingsHistory(
    @CurrentUser() user: RequestUser,
    @Headers('x-store-id') headerStoreId?: string,
  ) {
    return this.settingsService.getStoreSettingsHistory(this.resolveStoreId(user, headerStoreId));
  }
}
