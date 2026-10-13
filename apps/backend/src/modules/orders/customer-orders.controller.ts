import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, CancelOrderDto, QueryOrdersDto, UpdatePickupSlotDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Orders')
@ApiBearerAuth()
@Controller('customer/orders')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary:
      'Đặt giữ suất cứu món 10 phút, khóa giá chốt, trừ tồn nguyên tử (R1-040, BR-017, BR-020)',
  })
  @ApiResponse({ status: 201, description: 'Giữ suất thành công, trạng thái PENDING_PAYMENT' })
  @ApiResponse({
    status: 400,
    description: 'Hết suất, vi phạm giới hạn số lượng hoặc bị phạt khóa đặt',
  })
  async holdOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.holdOrder(user?.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Xem lịch sử đơn hàng của khách hàng có phân trang và lọc (R1-048)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng của khách' })
  async getCustomerOrders(@CurrentUser() user: RequestUser, @Query() query: QueryOrdersDto) {
    return this.ordersService.getCustomerOrders(user?.userId, query);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Danh sách đơn hàng đang chờ thanh toán hoặc chờ nhận hàng của khách (R1-055)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng đang mở' })
  async getActiveOrders(@CurrentUser() user: RequestUser) {
    return this.ordersService.getCustomerActiveOrders(user?.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết đơn hàng phía khách hàng (R1-046)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getOrderById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.getOrderById(user?.userId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Khách hàng hủy giữ suất chủ động trong vòng 10 phút (R1-043)',
  })
  @ApiResponse({
    status: 200,
    description: 'Hủy giữ suất thành công, hoàn trả tồn kho ngay lập tức',
  })
  @ApiResponse({ status: 400, description: 'Đơn không ở trạng thái chờ thanh toán' })
  async cancelHold(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto?: CancelOrderDto,
  ) {
    return this.ordersService.cancelHoldByCustomer(user?.userId, id, dto);
  }

  @Post(':id/arriving')
  @ApiOperation({
    summary: 'Khách báo đã đến gần quán nhận hàng để nhân viên chuẩn bị sẵn (R1-060)',
  })
  @ApiResponse({ status: 200, description: 'Ghi nhận thông báo sắp đến' })
  async notifyArriving(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.notifyCustomerArriving(user?.userId, id);
  }

  @Post(':id/proxy-code')
  @ApiOperation({
    summary: 'Tạo mã nhận hộ 8 ký tự cho người thân nhận thay (R1-052)',
  })
  @ApiResponse({ status: 201, description: 'Tạo mã nhận hộ thành công' })
  @ApiResponse({ status: 400, description: 'Đơn chưa ở trạng thái Đã thanh toán' })
  async createProxyPickupCode(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.createProxyPickupCode(user?.userId, id);
  }

  @Get(':id/proxy-code')
  @ApiOperation({
    summary: 'Lấy mã nhận hộ đang có hiệu lực của đơn hàng (R1-052)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin mã nhận hộ' })
  async getProxyPickupCode(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.getProxyPickupCode(user?.userId, id);
  }

  @Delete(':id/proxy-code')
  @ApiOperation({
    summary: 'Thu hồi mã nhận hộ khi chưa sử dụng (R1-052)',
  })
  @ApiResponse({ status: 200, description: 'Thu hồi mã nhận hộ thành công' })
  async revokeProxyPickupCode(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.revokeProxyPickupCode(user?.userId, id);
  }

  @Patch(':id/pickup-slot')
  @ApiOperation({
    summary: 'Cập nhật giờ hẹn nhận hàng trong khung nhận của quán (R1-049)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật giờ hẹn nhận thành công' })
  @ApiResponse({ status: 400, description: 'Giờ hẹn ngoài khung nhận hoặc quá hạn sửa' })
  async updatePickupSlot(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePickupSlotDto,
  ) {
    return this.ordersService.updatePickupSlot(user?.userId, id, dto.pickupSlot);
  }

  @Get(':id/receipt')
  @ApiOperation({
    summary: 'Xem và lấy biên nhận của đơn hàng đã thanh toán (R1-054)',
  })
  @ApiResponse({ status: 200, description: 'Thông tin biên nhận đơn hàng' })
  @ApiResponse({ status: 400, description: 'Đơn chưa thanh toán' })
  async getOrderReceipt(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.ordersService.getOrderReceipt(user?.userId, id);
  }
}
