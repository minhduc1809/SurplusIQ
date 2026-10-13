import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CreateItemDto, UpdateItemDto, QueryItemsDto, ImportCsvItemsDto } from './dto';
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

@ApiTags('Store - Catalog')
@ApiBearerAuth()
@Controller('store/items')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Xem danh sách món ăn của cửa hàng có phân trang, tìm kiếm, lọc (R2-017, R2-018)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách món ăn phân trang (mặc định ẩn món lưu trữ)',
  })
  async getItems(@CurrentStore() storeId: string, @Query() query: QueryItemsDto) {
    return this.catalogService.getItems(storeId, query);
  }

  @Get(':id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Xem chi tiết món ăn kèm thống kê số suất đã tạo và số lượng bán (R2-019)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết món ăn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy món ăn trong cửa hàng' })
  async getItemById(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.catalogService.getItemById(storeId, id);
  }

  @Post()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Tạo món ăn mới với giá sàn bội 500đ và kiểm tra trùng tên (R2-020)',
  })
  @ApiResponse({ status: 201, description: 'Tạo món ăn thành công (trạng thái ACTIVE)' })
  @ApiResponse({ status: 400, description: 'Giá không chia hết cho 500đ hoặc giá vốn > giá gốc' })
  @ApiResponse({ status: 409, description: 'Tên món đã tồn tại trong cửa hàng' })
  async createItem(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateItemDto,
  ) {
    return this.catalogService.createItem(storeId, dto, user?.userId);
  }

  @Patch(':id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Chỉnh sửa thuộc tính món ăn (R2-022)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật món thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy món ăn' })
  @ApiResponse({ status: 409, description: 'Tên món mới bị trùng lặp' })
  async updateItem(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.catalogService.updateItem(storeId, id, dto, user?.userId);
  }

  @Post(':id/archive')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Lưu trữ món ăn (R2-023, BR-051 - Không xóa vật lý, chặn khi có suất OPEN)',
  })
  @ApiResponse({ status: 200, description: 'Lưu trữ món thành công (chuyển sang ARCHIVED)' })
  @ApiResponse({ status: 400, description: 'Món đang có suất bán OPEN, không thể lưu trữ' })
  async archiveItem(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.catalogService.archiveItem(storeId, id, user?.userId);
  }

  @Post(':id/restore')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Khôi phục món đã lưu trữ về trạng thái Đang dùng (R2-024)',
  })
  @ApiResponse({ status: 200, description: 'Khôi phục món thành công (chuyển sang ACTIVE)' })
  @ApiResponse({ status: 409, description: 'Đã tồn tại món đang hoạt động cùng tên' })
  async restoreItem(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.catalogService.restoreItem(storeId, id, user?.userId);
  }

  @Post('import-csv')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Nhập danh mục món hàng loạt từ CSV theo hạn mức gói dịch vụ (R2-025)',
  })
  @ApiResponse({ status: 200, description: 'Báo cáo kết quả nhập hàng loạt' })
  @ApiResponse({
    status: 400,
    description: 'Vượt quá hạn mức số dòng của gói (Cơ bản: 100, Pro: 500)',
  })
  async importCsv(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ImportCsvItemsDto,
  ) {
    return this.catalogService.importCsvItems(storeId, dto, user?.userId);
  }
}
