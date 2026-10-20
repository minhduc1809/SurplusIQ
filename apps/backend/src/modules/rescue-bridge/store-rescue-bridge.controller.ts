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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RescueBridgeService } from './rescue-bridge.service';
import {
  ConfirmAgreementDto,
  CreateTransferDto,
  QueryReportDto,
  QueryTransfersDto,
  SendTransferDto,
  StoreConfirmHandoverDto,
  TransferReasonDto,
} from './dto/rescue-bridge.dto';
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

const { OWNER, MANAGER, COUNTER } = StorePermission;

/** Rescue Bridge (CM-B03) phía cửa hàng. Cửa hàng quyết định bàn giao, hệ thống chỉ điều phối (BR-B03-01). */
@ApiTags('Store - Rescue Bridge')
@ApiBearerAuth()
@Controller('store/rescue-bridge')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreRescueBridgeController {
  constructor(private readonly service: RescueBridgeService) {}

  @Get('eligible-offers')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({ summary: 'Lô còn khả dụng để bàn giao + gợi ý khi gần cuối khung nhận (R2-121)' })
  async eligibleOffers(@CurrentStore() storeId: string) {
    return this.service.eligibleOffers(storeId);
  }

  @Post('transfers')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({ summary: 'Tạo đề nghị (Nháp) - giữ ngay số lượng khỏi tồn bán (BR-B03-05/07)' })
  @ApiResponse({ status: 400, description: 'Vượt tồn khả dụng, lô hết hạn, hạn nhận sau hạn dùng' })
  async create(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateTransferDto,
  ) {
    return this.service.createTransfer(storeId, user.userId, dto);
  }

  @Get('transfers')
  @Permissions(OWNER, MANAGER, COUNTER)
  @ApiOperation({ summary: 'Danh sách đề nghị bàn giao của cửa hàng' })
  async list(@CurrentStore() storeId: string, @Query() query: QueryTransfersDto) {
    return this.service.listTransfers(storeId, query);
  }

  @Get('transfers/:id')
  @Permissions(OWNER, MANAGER, COUNTER)
  @ApiOperation({
    summary: 'Chi tiết + phản hồi của đơn vị + nhật ký (theo dõi từ gửi đến kết quả)',
  })
  async detail(@CurrentStore() storeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getTransfer(storeId, id);
  }

  @Get('transfers/:id/matches')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({
    summary: 'Đơn vị tiếp nhận hợp lệ theo loại/số lượng/thời gian/khu vực/năng lực (BR-B03-02/03)',
  })
  async matches(@CurrentStore() storeId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findMatches(storeId, id);
  }

  @Post('transfers/:id/send')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({
    summary: 'Gửi đề nghị cho đơn vị đã chọn: Nháp → Đã gửi; trả link phản hồi cho đơn vị',
  })
  async send(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendTransferDto,
  ) {
    return this.service.sendTransfer(storeId, user.userId, id, dto.recipientOrgId);
  }

  @Post('transfers/:id/response-link')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({ summary: 'Cấp lại link phản hồi cho đơn vị (link cũ mất hiệu lực)' })
  async rotateLink(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.rotateResponseLink(storeId, user.userId, id);
  }

  @Post('transfers/:id/confirm-agreement')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({
    summary: 'Đồng ý số lượng/thời gian đơn vị đã chấp nhận: Đã chấp nhận → Chờ bàn giao',
  })
  async confirmAgreement(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmAgreementDto,
  ) {
    return this.service.confirmAgreement(storeId, user.userId, id, dto);
  }

  @Post('transfers/:id/confirm-handover')
  @Permissions(OWNER, MANAGER, COUNTER)
  @ApiOperation({
    summary:
      'Cửa hàng xác nhận số lượng thực giao + bằng chứng. Hoàn tất chỉ khi đơn vị cũng xác nhận khớp (BR-B03-06)',
  })
  async confirmHandover(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StoreConfirmHandoverDto,
  ) {
    return this.service.storeConfirmHandover(storeId, user.userId, id, dto);
  }

  @Post('transfers/:id/fail')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({ summary: 'Báo thất bại (đơn vị không đến...) - bắt buộc lý do, trả suất về tồn' })
  async fail(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferReasonDto,
  ) {
    return this.service.failTransfer(storeId, user.userId, id, dto.reason);
  }

  @Post('transfers/:id/cancel')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({ summary: 'Hủy đề nghị - bắt buộc lý do (BR-B03-08), trả suất về tồn' })
  async cancel(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferReasonDto,
  ) {
    return this.service.cancelTransfer(storeId, user.userId, id, dto.reason);
  }

  @Get('report')
  @Permissions(OWNER, MANAGER)
  @ApiOperation({
    summary: 'Báo cáo: đề nghị vs chấp nhận vs thực tế bàn giao, lý do thất bại/hủy',
  })
  async report(@CurrentStore() storeId: string, @Query() query: QueryReportDto) {
    return this.service.getReport(storeId, query);
  }
}
