import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CancelOrderDto, QueryOrdersDto } from './dto';
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

@ApiTags('Store - Orders')
@ApiBearerAuth()
@Controller('store/orders')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({
    summary: 'Danh sách đơn hàng thực tế của quán, có lọc theo ngày, trạng thái (R2-049)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng của quán' })
  async getStoreOrders(@CurrentStore() storeId: string, @Query() query: QueryOrdersDto) {
    return this.ordersService.getStoreOrders(storeId, query);
  }

  @Get(':id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({
    summary: 'Xem chi tiết đơn hàng phía cửa hàng (R2-051)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getStoreOrderById(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.ordersService.getStoreOrderById(storeId, id);
  }

  @Post(':id/cancel')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Cửa hàng hủy đơn do sự cố quán (Hoàn tiền 100%, ghi lý do) (R2-053)',
  })
  @ApiResponse({ status: 200, description: 'Hủy đơn thành công, chuyển sang hoàn tiền 100%' })
  async cancelOrderByStore(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ordersService.cancelOrderByStore(storeId, id, dto, user?.userId);
  }
}
