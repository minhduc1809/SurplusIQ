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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CustomerInteractionsService } from './customer-interactions.service';
import {
  ResolveComplaintDto,
  RejectComplaintDto,
  ReplyReviewDto,
} from './dto/interaction-extras.dto';
import { ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { ReviewStatus } from '../../entities/complaints/review.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentStore } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';
import { StorePermission } from '../../entities/stores/store-member.entity';

@ApiTags('Store - Interactions')
@ApiBearerAuth()
@Controller('store')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreInteractionsController {
  constructor(private readonly service: CustomerInteractionsService) {}

  @Get('complaints')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Lấy danh sách khiếu nại của cửa hàng (R2-054)' })
  @ApiQuery({ name: 'status', enum: ComplaintStatus, required: false })
  @ApiResponse({ status: 200, description: 'Danh sách khiếu nại của cửa hàng' })
  async getStoreComplaints(
    @CurrentStore() storeId: string,
    @Query('status') status?: ComplaintStatus,
  ) {
    return this.service.getStoreComplaints(storeId, status);
  }

  @Get('complaints/:id')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Xem chi tiết khiếu nại kèm ảnh bằng chứng và thông tin đơn (R2-054)' })
  @ApiResponse({ status: 200, description: 'Chi tiết khiếu nại' })
  @ApiResponse({ status: 404, description: 'Khiếu nại không tồn tại' })
  async getStoreComplaintDetail(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.service.getStoreComplaintDetail(storeId, id);
  }

  @Post('complaints/:id/resolve')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Chấp nhận khiếu nại và hoàn tiền cho khách (R2-055, BR-054)' })
  @ApiResponse({ status: 200, description: 'Khiếu nại đã được giải quyết' })
  async resolveComplaint(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: ResolveComplaintDto,
  ) {
    return this.service.resolveComplaint(storeId, id, dto);
  }

  @Post('complaints/:id/reject')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Từ chối khiếu nại với lý do bắt buộc (R2-056, BR-056)' })
  @ApiResponse({ status: 200, description: 'Đã từ chối khiếu nại' })
  async rejectComplaint(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: RejectComplaintDto,
  ) {
    return this.service.rejectComplaint(storeId, id, dto);
  }

  @Post('complaints/:id/extend')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Gia hạn thời gian xử lý khiếu nại thêm 24 giờ (tối đa 1 lần) (R2-055, BR-055)',
  })
  @ApiResponse({ status: 200, description: 'Đã gia hạn thành công' })
  async extendComplaint(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.service.extendComplaint(storeId, id);
  }

  @Get('reviews')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER, StorePermission.COUNTER)
  @ApiOperation({
    summary: 'Danh sách đánh giá của quán, có lọc theo rating, status, reply (R2-057, R2-058)',
  })
  @ApiQuery({ name: 'rating', type: Number, required: false })
  @ApiQuery({ name: 'status', enum: ReviewStatus, required: false })
  @ApiQuery({ name: 'hasReply', type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá' })
  async getStoreReviews(
    @CurrentStore() storeId: string,
    @Query('rating') rating?: number,
    @Query('status') status?: ReviewStatus,
    @Query('hasReply') hasReply?: boolean,
  ) {
    return this.service.getStoreReviews(storeId, {
      rating: rating ? Number(rating) : undefined,
      status,
      hasReply: hasReply !== undefined ? String(hasReply) === 'true' : undefined,
    });
  }

  @Post('reviews/:id/reply')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Phản hồi công khai đánh giá của khách hàng (1 lần duy nhất) (R2-057, BR-057)',
  })
  @ApiResponse({ status: 200, description: 'Phản hồi đánh giá thành công' })
  async replyReview(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.service.replyReview(storeId, id, dto);
  }
}
