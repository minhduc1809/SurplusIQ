import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Channel } from '../../common/decorators/channel.decorator';
import {
  CurrentStore,
  CurrentUser,
  RequestUser,
} from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { UserRole } from '../../entities/auth/user.entity';
import { IncidentStatus } from '../../entities/order-support/pickup-incident.entity';
import { StorePermission } from '../../entities/stores/store-member.entity';
import {
  CreateGiftDto,
  CreateIncidentDto,
  RespondIncidentDto,
  SendOrderMessageDto,
  SwapOrderDto,
} from './order-support.dto';
import { OrderSupportService } from './order-support.service';
import { OrderTransferService } from './order-transfer.service';

@ApiTags('Customer - Hỗ trợ đơn hàng (KX03, KX05, KX11, KX12, KX18)')
@ApiBearerAuth()
@Controller('customer')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class CustomerOrderSupportController {
  constructor(
    private readonly support: OrderSupportService,
    private readonly transfer: OrderTransferService,
  ) {}

  @Get('orders/:orderId/tracking')
  @ApiOperation({
    summary: 'Theo dõi đơn: mốc thời gian, hạn giữ, khung nhận, vị trí cửa hàng (KX12)',
  })
  tracking(@CurrentUser() u: RequestUser, @Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.support.getTracking(u.userId, orderId);
  }

  @Post('orders/:orderId/incidents')
  @ApiOperation({ summary: 'Báo sự cố khi đến nhận hàng (KX03)' })
  createIncident(
    @CurrentUser() u: RequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.support.createIncident(u.userId, orderId, dto);
  }

  @Get('orders/:orderId/incidents')
  @ApiOperation({ summary: 'Các sự cố đã báo của đơn (KX03)' })
  listIncidents(@CurrentUser() u: RequestUser, @Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.support.listCustomerIncidents(u.userId, orderId);
  }

  @Get('orders/:orderId/messages')
  @ApiOperation({ summary: 'Đọc trò chuyện với cửa hàng, đánh dấu đã đọc (KX11)' })
  @ApiQuery({
    name: 'since',
    required: false,
    description: 'Chỉ lấy tin sau mốc thời gian ISO để làm mới nhanh',
  })
  messages(
    @CurrentUser() u: RequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Query('since') since?: string,
  ) {
    return this.support.customerThread(u.userId, orderId, since);
  }

  @Post('orders/:orderId/messages')
  @ApiOperation({ summary: 'Gửi tin nhắn cho cửa hàng (KX11)' })
  sendMessage(
    @CurrentUser() u: RequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: SendOrderMessageDto,
  ) {
    return this.support.customerSend(u.userId, orderId, dto);
  }

  @Get('orders/:orderId/swap-options')
  @ApiOperation({ summary: 'Các suất cùng cửa hàng có thể đổi sang (KX05)' })
  swapOptions(@CurrentUser() u: RequestUser, @Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.transfer.getSwapOptions(u.userId, orderId);
  }

  @Post('orders/:orderId/swap')
  @ApiOperation({ summary: 'Đổi sang suất khác của cùng cửa hàng, một lần cho mỗi đơn (KX05)' })
  swap(
    @CurrentUser() u: RequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: SwapOrderDto,
  ) {
    return this.transfer.swap(u.userId, orderId, dto.newOfferId);
  }

  @Post('orders/:orderId/gift')
  @ApiOperation({ summary: 'Tặng suất đã thanh toán cho người dùng khác (KX18)' })
  gift(
    @CurrentUser() u: RequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateGiftDto,
  ) {
    return this.transfer.createGift(u.userId, orderId, dto);
  }

  @Get('gifts')
  @ApiOperation({ summary: 'Lời tặng đã nhận và đã gửi (KX18)' })
  gifts(@CurrentUser() u: RequestUser) {
    return this.transfer.listGifts(u.userId);
  }

  @Post('gifts/:id/accept')
  @ApiOperation({ summary: 'Chấp nhận suất được tặng (KX18)' })
  accept(@CurrentUser() u: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfer.respondGift(u.userId, id, 'ACCEPT');
  }

  @Post('gifts/:id/decline')
  @ApiOperation({ summary: 'Từ chối suất được tặng (KX18)' })
  decline(@CurrentUser() u: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfer.respondGift(u.userId, id, 'DECLINE');
  }

  @Post('gifts/:id/cancel')
  @ApiOperation({ summary: 'Thu hồi lời tặng chưa được chấp nhận (KX18)' })
  cancel(@CurrentUser() u: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfer.respondGift(u.userId, id, 'CANCEL');
  }
}

@ApiTags('Store - Hỗ trợ đơn hàng (KX03, KX11)')
@ApiBearerAuth()
@Controller('store')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class StoreOrderSupportController {
  constructor(private readonly support: OrderSupportService) {}

  @Get('incidents')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Sự cố nhận hàng khách báo cho cửa hàng (KX03)' })
  @ApiQuery({ name: 'status', required: false, enum: IncidentStatus })
  incidents(@CurrentStore() storeId: string, @Query('status') status?: IncidentStatus) {
    return this.support.listStoreIncidents(storeId, status);
  }

  @Post('incidents/:id/respond')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({
    summary: 'Phản hồi sự cố: đã nhận, đã khắc phục, hoàn tiền hoặc không công nhận (KX03)',
  })
  respond(
    @CurrentStore() storeId: string,
    @CurrentUser() u: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondIncidentDto,
  ) {
    return this.support.respondIncident(storeId, u.userId, id, dto);
  }

  @Get('orders/:orderId/messages')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Đọc trò chuyện với khách của một đơn (KX11)' })
  messages(
    @CurrentStore() storeId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Query('since') since?: string,
  ) {
    return this.support.storeThread(storeId, orderId, since);
  }

  @Post('orders/:orderId/messages')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({ summary: 'Gửi tin nhắn cho khách (KX11)' })
  send(
    @CurrentStore() storeId: string,
    @CurrentUser() u: RequestUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: SendOrderMessageDto,
  ) {
    return this.support.storeSend(storeId, u.userId, orderId, dto);
  }
}
