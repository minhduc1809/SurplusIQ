import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CustomerInteractionsService } from './customer-interactions.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - Complaints, Reviews & Impact')
@ApiBearerAuth()
@Controller('customer')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerInteractionsController {
  constructor(private readonly interactionsService: CustomerInteractionsService) {}

  @Post('orders/:orderId/complaints')
  @ApiOperation({
    summary: 'Gửi khiếu nại chất lượng đơn hàng trong vòng 24 giờ sau khi nhận hàng (R1-061)',
  })
  @ApiResponse({ status: 201, description: 'Khiếu nại được tạo thành công' })
  @ApiResponse({
    status: 400,
    description: 'Đơn chưa hoàn tất hoặc đã quá thời hạn 24 giờ kể từ khi nhận',
  })
  @ApiResponse({ status: 409, description: 'Đơn hàng đang có khiếu nại chờ xử lý' })
  async createComplaint(
    @CurrentUser() user: RequestUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.interactionsService.createComplaint(user?.userId, orderId, dto);
  }

  @Get('complaints')
  @ApiOperation({
    summary: 'Xem danh sách lịch sử khiếu nại của tôi (R1-067)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách khiếu nại' })
  async getCustomerComplaints(@CurrentUser() user: RequestUser) {
    return this.interactionsService.getCustomerComplaints(user?.userId);
  }

  @Get('complaints/:id')
  @ApiOperation({
    summary: 'Xem chi tiết trạng thái và phản hồi khiếu nại (R1-062)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết khiếu nại' })
  @ApiResponse({ status: 404, description: 'Khiếu nại không tồn tại' })
  async getComplaintDetail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.interactionsService.getComplaintDetail(user?.userId, id);
  }

  @Post('orders/:orderId/reviews')
  @ApiOperation({
    summary: 'Gửi đánh giá 1-5 sao và nhận xét cho đơn hàng đã hoàn tất (R1-064)',
  })
  @ApiResponse({ status: 201, description: 'Đánh giá thành công' })
  @ApiResponse({ status: 400, description: 'Đơn hàng chưa hoàn tất' })
  @ApiResponse({ status: 409, description: 'Đơn hàng đã được đánh giá' })
  async createReview(
    @CurrentUser() user: RequestUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.interactionsService.createReview(user?.userId, orderId, dto);
  }

  @Get('impact')
  @ApiOperation({
    summary:
      'Xem thống kê tác động cá nhân: số đơn đã cứu, tiền tiết kiệm và kg thực phẩm cứu được (R1-076)',
  })
  @ApiResponse({ status: 200, description: 'Thống kê tác động cá nhân' })
  async getCustomerImpact(@CurrentUser() user: RequestUser) {
    return this.interactionsService.getCustomerImpact(user?.userId);
  }
}
