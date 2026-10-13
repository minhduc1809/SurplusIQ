import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { QueryDealsDto } from './dto/query-deals.dto';
import { QueryMapDealsDto } from './dto/query-map-deals.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Deals Discovery')
@Controller('customer')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerDealsController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get('deals')
  @ApiOperation({
    summary:
      'Khám phá danh sách deal gần vị trí với PostGIS, tìm kiếm, lọc và phân trang (R1-020, R1-022..R1-025)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách các suất cứu món khả dụng' })
  async findNearbyDeals(@Query() query: QueryDealsDto) {
    return this.discoveryService.findNearbyDeals(query);
  }

  @Public()
  @Get('deals/map')
  @ApiOperation({
    summary:
      'Lấy danh sách các cửa hàng có deal đang mở để hiển thị điểm ghim trên bản đồ (R1-021)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách các điểm ghim bản đồ' })
  async findMapPins(@Query() query: QueryMapDealsDto) {
    return this.discoveryService.findMapPins(query);
  }

  @Public()
  @Get('deals/:id')
  @ApiOperation({
    summary: 'Xem chi tiết suất cứu món kèm thành phần, dị ứng và thông tin cửa hàng (R1-026)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết deal' })
  @ApiResponse({ status: 404, description: 'Deal không tồn tại hoặc đã hết hạn' })
  async getDealDetail(@Param('id') id: string) {
    return this.discoveryService.getDealDetail(id);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Post('deals/:id/save')
  @ApiOperation({
    summary: 'Lưu deal để xem sau (R1-034)',
  })
  @ApiResponse({ status: 200, description: 'Đã lưu deal vào danh sách xem sau' })
  async saveDeal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.saveDeal(user?.userId, id);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Delete('deals/:id/save')
  @ApiOperation({
    summary: 'Bỏ lưu deal xem sau (R1-034)',
  })
  @ApiResponse({ status: 200, description: 'Đã xóa deal khỏi danh sách xem sau' })
  async unsaveDeal(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.discoveryService.unsaveDeal(user?.userId, id);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Get('saved-deals')
  @ApiOperation({
    summary: 'Lấy danh sách deal đã lưu của khách hàng, tự động đánh dấu deal đã hết hạn (R1-034)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách deal đã lưu' })
  async getSavedDeals(@CurrentUser() user: RequestUser) {
    return this.discoveryService.getSavedDeals(user?.userId);
  }
}
