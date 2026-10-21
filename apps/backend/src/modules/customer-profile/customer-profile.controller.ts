import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CustomerProfileService } from './customer-profile.service';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { RequestDeleteDto } from './dto/request-delete.dto';
import { RecordConsentDto } from './dto/record-consent.dto';
import { CreateSavedPlaceDto } from './dto/saved-place.dto';
import { UpdateDietaryProfileDto } from './dto/dietary-profile.dto';
import { RegisterFcmTokenDto } from './dto/fcm-token.dto';
import { UpdateNotificationSettingsDto } from './dto/notification-settings.dto';
import { UpdateRefundBankAccountDto } from './dto/refund-bank-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Profile & Settings')
@ApiBearerAuth()
@Controller('customer')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerProfileController {
  constructor(private readonly profileService: CustomerProfileService) {}

  @Get('profile')
  @ApiOperation({
    summary:
      'Xem hồ sơ cá nhân của khách hàng kèm thông tin bảo mật và trạng thái khóa đặt (R1-005, R1-048)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin hồ sơ khách hàng' })
  async getProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getProfile(user?.userId);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Chỉnh sửa thông tin hồ sơ cá nhân (R1-006)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateCustomerProfileDto) {
    return this.profileService.updateProfile(user?.userId, dto);
  }

  @Get('saved-places')
  @ApiOperation({
    summary: 'Xem danh sách địa điểm quen thuộc đã lưu (nhà, công ty...) (R1-015)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách địa điểm đã lưu' })
  async getSavedPlaces(@CurrentUser() user: RequestUser) {
    return this.profileService.getSavedPlaces(user?.userId);
  }

  @Post('saved-places')
  @ApiOperation({
    summary: 'Thêm địa điểm quen thuộc mới (tối đa 5 địa điểm) (R1-015)',
  })
  @ApiResponse({ status: 201, description: 'Tạo địa điểm thành công' })
  @ApiResponse({ status: 400, description: 'Vượt quá giới hạn 5 địa điểm' })
  async createSavedPlace(@CurrentUser() user: RequestUser, @Body() dto: CreateSavedPlaceDto) {
    return this.profileService.createSavedPlace(user?.userId, dto);
  }

  @Delete('saved-places/:id')
  @ApiOperation({
    summary: 'Xóa địa điểm quen thuộc (R1-015)',
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteSavedPlace(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.profileService.deleteSavedPlace(user?.userId, id);
  }

  @Get('dietary-profile')
  @ApiOperation({
    summary: 'Lấy hồ sơ ăn uống và dị ứng đã thiết lập của khách hàng (R1-016)',
  })
  @ApiResponse({ status: 200, description: 'Hồ sơ ăn uống' })
  async getDietaryProfile(@CurrentUser() user: RequestUser) {
    return this.profileService.getDietaryProfile(user?.userId);
  }

  @Put('dietary-profile')
  @ApiOperation({
    summary: 'Cập nhật hồ sơ ăn uống và dị ứng (R1-016)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateDietaryProfile(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateDietaryProfileDto,
  ) {
    return this.profileService.updateDietaryProfile(user?.userId, dto);
  }

  @Post('fcm-token')
  @ApiOperation({
    summary: 'Đăng ký hoặc cập nhật FCM Device Token để nhận Push Notification (R1-004, R1-073)',
  })
  @ApiResponse({ status: 201, description: 'Đăng ký FCM Token thành công' })
  async registerFcmToken(@CurrentUser() user: RequestUser, @Body() dto: RegisterFcmTokenDto) {
    return this.profileService.registerFcmToken(user?.userId, dto);
  }

  @Delete('fcm-token/:deviceId')
  @ApiOperation({
    summary: 'Hủy đăng ký FCM Token trên thiết bị khi đăng xuất (R1-004)',
  })
  @ApiResponse({ status: 200, description: 'Hủy đăng ký thành công' })
  async deleteFcmToken(@CurrentUser() user: RequestUser, @Param('deviceId') deviceId: string) {
    return this.profileService.deleteFcmToken(user?.userId, deviceId);
  }

  @Get('consents')
  @ApiOperation({ summary: 'Xem lịch sử chấp thuận điều khoản & chính sách (R1-012, R1-017)' })
  async getConsents(@CurrentUser() user: RequestUser) {
    return this.profileService.getConsents(user?.userId);
  }

  @Post('consents')
  @ApiOperation({ summary: 'Ghi nhận chấp thuận điều khoản (R1-012, R1-017, BR-005)' })
  async recordConsent(@CurrentUser() user: RequestUser, @Body() dto: RecordConsentDto) {
    return this.profileService.recordConsent(user?.userId, dto.type, dto.granted, dto.version);
  }

  @Get('notification-settings')
  @ApiOperation({ summary: 'Xem cài đặt nhận thông báo (R1-010)' })
  async getNotificationSettings(@CurrentUser() user: RequestUser) {
    return this.profileService.getNotificationSettings(user?.userId);
  }

  @Put('notification-settings')
  @ApiOperation({ summary: 'Cập nhật cài đặt nhận thông báo (R1-010, K57)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateNotificationSettings(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.profileService.updateNotificationSettings(user?.userId, dto);
  }

  @Post('delete-request')
  @ApiOperation({ summary: 'Yêu cầu xóa tài khoản cá nhân (R1-011, R1-019, BR-007)' })
  async requestAccountDelete(@CurrentUser() user: RequestUser, @Body() dto: RequestDeleteDto) {
    return this.profileService.requestAccountDelete(user?.userId, dto.password);
  }

  @Delete('delete-request')
  @ApiOperation({ summary: 'Hủy yêu cầu xóa tài khoản trong 7 ngày ân hạn (R1-019)' })
  async cancelAccountDelete(@CurrentUser() user: RequestUser) {
    return this.profileService.cancelAccountDelete(user?.userId);
  }

  @Post('data-export')
  @ApiOperation({ summary: 'Xuất toàn bộ dữ liệu cá nhân (R1-018 - link 24h)' })
  async exportUserData(@CurrentUser() user: RequestUser) {
    return this.profileService.exportUserData(user?.userId);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Danh sách cửa hàng yêu thích (R1-028)' })
  async getFavorites(@CurrentUser() user: RequestUser) {
    return this.profileService.getFavoriteStores(user?.userId);
  }

  @Post('favorites/:storeId')
  @ApiOperation({ summary: 'Thêm cửa hàng vào danh sách yêu thích (tối đa 50) (R1-028)' })
  async addFavorite(@CurrentUser() user: RequestUser, @Param('storeId') storeId: string) {
    return this.profileService.addFavoriteStore(user?.userId, storeId);
  }

  @Delete('favorites/:storeId')
  @ApiOperation({ summary: 'Xóa cửa hàng khỏi danh sách yêu thích (R1-029)' })
  async removeFavorite(@CurrentUser() user: RequestUser, @Param('storeId') storeId: string) {
    return this.profileService.removeFavoriteStore(user?.userId, storeId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Lịch sử giao dịch thanh toán và hoàn tiền (R1-077)' })
  async getTransactions(@CurrentUser() user: RequestUser) {
    return this.profileService.getCustomerTransactions(user?.userId);
  }

  @Get('order-lock')
  @ApiOperation({ summary: 'Xem trạng thái khóa đặt hàng và lịch sử noshow (R1-048, BR-020)' })
  async getOrderLock(@CurrentUser() user: RequestUser) {
    return this.profileService.getOrderLockStatus(user?.userId);
  }

  @Get('promotions/wallet')
  @ApiOperation({ summary: 'Xem danh sách ưu đãi trong ví cá nhân (R1-078)' })
  async getPromotionWallet(@CurrentUser() user: RequestUser) {
    return this.profileService.getPromotionWallet(user?.userId);
  }

  @Post('promotions/:id/claim')
  @ApiOperation({ summary: 'Thu thập mã ưu đãi vào ví (R1-079)' })
  async claimPromotion(@CurrentUser() user: RequestUser, @Param('id') promoId: string) {
    return this.profileService.claimPromotion(user?.userId, promoId);
  }

  @Get('refund-bank-account')
  @ApiOperation({
    summary: 'Lấy thông tin tài khoản ngân hàng nhận tiền hoàn VietQR (KX01)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin tài khoản nhận hoàn tiền' })
  async getRefundBankAccount(@CurrentUser() user: RequestUser) {
    return this.profileService.getRefundBankAccount(user?.userId);
  }

  @Put('refund-bank-account')
  @ApiOperation({
    summary: 'Cập nhật tài khoản ngân hàng nhận tiền hoàn VietQR (KX01)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateRefundBankAccount(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateRefundBankAccountDto,
  ) {
    return this.profileService.updateRefundBankAccount(user?.userId, dto);
  }
}
