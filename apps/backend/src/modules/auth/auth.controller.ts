import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Headers,
  Param,
  Ip,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  CustomerRegisterDto,
  CustomerLoginDto,
  StoreRegisterDto,
  StoreLoginDto,
  VerifyOtpDto,
  ResendOtpDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  Enable2faDto,
} from './dto';

@ApiTags('Authentication')
@Controller()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -------------------------------------------------------------------------
  // KHÁCH HÀNG (CUSTOMER)
  // -------------------------------------------------------------------------

  @Post('auth/customer/register')
  @ApiOperation({ summary: 'Đăng ký tài khoản khách hàng (R1-001)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, chờ xác thực OTP' })
  async registerCustomer(@Body() dto: CustomerRegisterDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post('auth/customer/verify-otp')
  @ApiOperation({ summary: 'Xác thực mã OTP kích hoạt tài khoản khách hàng (R1-002)' })
  async verifyCustomerOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('auth/customer/resend-otp')
  @ApiOperation({ summary: 'Gửi lại mã OTP (tối đa 3 lần/giờ) (R1-002, BR-002)' })
  async resendCustomerOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('auth/customer/login')
  @ApiOperation({ summary: 'Đăng nhập khách hàng trên App Android (tách kênh 9.1)' })
  async loginCustomer(@Body() dto: CustomerLoginDto, @Ip() ip: string) {
    return this.authService.loginCustomer(dto, ip);
  }

  // -------------------------------------------------------------------------
  // CỬA HÀNG (STORE)
  // -------------------------------------------------------------------------

  @Post('auth/store/register')
  @ApiOperation({ summary: 'Đăng ký cửa hàng đối tác (R2-001)' })
  async registerStore(@Body() dto: StoreRegisterDto) {
    return this.authService.registerStore(dto);
  }

  @Post('auth/store/verify-email')
  @ApiOperation({ summary: 'Xác minh email cửa hàng và kích hoạt Dùng thử 30 ngày Pro (VC-01)' })
  async verifyStoreEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyStoreEmail(dto);
  }

  @Post('auth/store/login')
  @ApiOperation({ summary: 'Đăng nhập cửa hàng trên cổng Web quản trị (tách kênh 9.1)' })
  async loginStore(@Body() dto: StoreLoginDto, @Ip() ip: string) {
    return this.authService.loginStore(dto, ip);
  }

  // -------------------------------------------------------------------------
  // TOKEN & ĐĂNG XUẤT
  // -------------------------------------------------------------------------

  @Post('auth/refresh')
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token (R1-004, R2-003)' })
  async refreshAccessToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto);
  }

  @Post('auth/logout')
  @ApiOperation({ summary: 'Đăng xuất và thu hồi Refresh Token trên thiết bị (R1-004)' })
  @ApiHeader({ name: 'x-user-id' })
  @ApiHeader({ name: 'x-device-id' })
  async logout(@Headers('x-user-id') userId: string, @Headers('x-device-id') deviceId: string) {
    return this.authService.logout(
      userId || '00000000-0000-0000-0000-000000000001',
      deviceId || 'default-device',
    );
  }

  // -------------------------------------------------------------------------
  // ĐỔI & ĐẶT LẠI MẬT KHẨU
  // -------------------------------------------------------------------------

  @Post('auth/password/change')
  @ApiOperation({ summary: 'Đổi mật khẩu và thu hồi các phiên đăng nhập khác (BR-003)' })
  @ApiHeader({ name: 'x-user-id' })
  async changePassword(@Headers('x-user-id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId || '00000000-0000-0000-0000-000000000001', dto);
  }

  @Post('auth/password/forgot')
  @ApiOperation({ summary: 'Yêu cầu mã OTP đặt lại mật khẩu quên (R1-008)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('auth/password/reset')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng mã OTP (R1-008, BR-003)' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // -------------------------------------------------------------------------
  // QUẢN LÝ PHIÊN & 2FA
  // -------------------------------------------------------------------------

  @Get('me/sessions')
  @ApiOperation({ summary: 'Danh sách các phiên đăng nhập đang hoạt động (R1-014)' })
  @ApiHeader({ name: 'x-user-id' })
  async getSessions(@Headers('x-user-id') userId: string) {
    return this.authService.getSessions(userId || '00000000-0000-0000-0000-000000000001');
  }

  @Delete('me/sessions/:id')
  @ApiOperation({ summary: 'Thu hồi phiên đăng nhập trên thiết bị cụ thể (R1-014)' })
  @ApiHeader({ name: 'x-user-id' })
  async revokeSession(@Headers('x-user-id') userId: string, @Param('id') sessionId: string) {
    return this.authService.revokeSession(
      userId || '00000000-0000-0000-0000-000000000001',
      sessionId,
    );
  }

  @Post('me/2fa/toggle')
  @ApiOperation({ summary: 'Bật / Tắt xác thực 2 bước (2FA) (R1-013)' })
  @ApiHeader({ name: 'x-user-id' })
  async toggle2fa(@Headers('x-user-id') userId: string, @Body() dto: Enable2faDto) {
    return this.authService.toggle2fa(userId || '00000000-0000-0000-0000-000000000001', dto);
  }
}
