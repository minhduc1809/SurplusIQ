import {
  Controller,
  Get,
  Put,
  Body,
  Headers,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';

@ApiTags('Settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('platform-settings')
  @ApiOperation({ summary: 'Lấy toàn bộ tham số cấu hình nền tảng' })
  @ApiResponse({ status: 200, description: 'Danh sách tham số nền tảng' })
  async getPlatformSettings() {
    return this.settingsService.getAllPlatformSettings();
  }

  @Get('store/settings')
  @ApiOperation({ summary: 'Lấy cấu hình hiện tại của cửa hàng (R2-007)' })
  @ApiHeader({ name: 'x-store-id', description: 'Store ID (hoặc trích xuất từ JWT token)' })
  @ApiResponse({ status: 200, description: 'Cấu hình cửa hàng' })
  async getStoreSettings(
    @Headers('x-store-id') headerStoreId?: string,
    @Query('storeId') queryStoreId?: string,
  ) {
    const storeId = headerStoreId || queryStoreId;
    if (!storeId) {
      return this.settingsService.getAllPlatformSettings();
    }
    return this.settingsService.getStoreSettings(storeId);
  }

  @Put('store/settings')
  @ApiOperation({
    summary: 'Cập nhật cấu hình cửa hàng với kiểm tra biên và ghi vết (R2-008, R2-101, R2-102)',
  })
  @ApiHeader({ name: 'x-store-id', description: 'Store ID' })
  @ApiHeader({ name: 'x-user-id', description: 'Actor User ID' })
  @ApiHeader({ name: 'x-is-pro', description: 'Cờ gói Pro (true/false)' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateStoreSettings(
    @Body() dto: UpdateStoreSettingsDto,
    @Headers('x-store-id') headerStoreId?: string,
    @Headers('x-user-id') headerUserId?: string,
    @Headers('x-is-pro') headerIsPro?: string,
    @Query('storeId') queryStoreId?: string,
  ) {
    const storeId = headerStoreId || queryStoreId || '00000000-0000-0000-0000-000000000001';
    const actorId = headerUserId || '00000000-0000-0000-0000-000000000001';
    const isPro = headerIsPro === 'true';

    return this.settingsService.updateStoreSettings(storeId, actorId, dto, isPro);
  }

  @Get('store/settings/history')
  @ApiOperation({ summary: 'Lấy lịch sử thay đổi cấu hình của cửa hàng (R2-102)' })
  @ApiHeader({ name: 'x-store-id', description: 'Store ID' })
  async getStoreSettingsHistory(
    @Headers('x-store-id') headerStoreId?: string,
    @Query('storeId') queryStoreId?: string,
  ) {
    const storeId = headerStoreId || queryStoreId || '00000000-0000-0000-0000-000000000001';
    return this.settingsService.getStoreSettingsHistory(storeId);
  }
}
