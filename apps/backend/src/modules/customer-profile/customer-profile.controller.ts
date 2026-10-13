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
import { CreateSavedPlaceDto } from './dto/saved-place.dto';
import { UpdateDietaryProfileDto } from './dto/dietary-profile.dto';
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
}
