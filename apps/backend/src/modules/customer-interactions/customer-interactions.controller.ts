import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import {
  UpdateReviewDto,
  AddComplaintAttachmentsDto,
  CreateViolationReportDto,
  CreateSupportTicketDto,
  SendSupportMessageDto,
} from './dto/interaction-extras.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
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

  @Post('complaints/:id/withdraw')
  @ApiOperation({
    summary: 'Rút lại khiếu nại nếu đã giải quyết ổn thỏa với cửa hàng (R1-063)',
  })
  @ApiResponse({ status: 200, description: 'Rút khiếu nại thành công' })
  @ApiResponse({ status: 400, description: 'Khiếu nại không ở trạng thái chờ xử lý' })
  @ApiResponse({ status: 404, description: 'Khiếu nại không tồn tại' })
  async withdrawComplaint(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.interactionsService.withdrawComplaint(user?.userId, id);
  }

  @Post('complaints/:id/attachments')
  @ApiOperation({
    summary: 'Bổ sung ảnh bằng chứng cho khiếu nại (tối đa 5 ảnh) (R1-068)',
  })
  @ApiResponse({ status: 200, description: 'Bổ sung ảnh thành công' })
  @ApiResponse({ status: 400, description: 'Vượt quá số lượng ảnh tối đa (5 ảnh)' })
  @ApiResponse({ status: 404, description: 'Khiếu nại không tồn tại' })
  async addComplaintAttachments(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddComplaintAttachmentsDto,
  ) {
    return this.interactionsService.addComplaintAttachments(user?.userId, id, dto);
  }

  @Put('reviews/:id')
  @ApiOperation({
    summary: 'Chỉnh sửa đánh giá trong vòng 24 giờ sau khi gửi (R1-065)',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật đánh giá thành công' })
  @ApiResponse({ status: 400, description: 'Đã quá 24 giờ kể từ khi đánh giá' })
  @ApiResponse({ status: 404, description: 'Đánh giá không tồn tại' })
  async updateReview(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.interactionsService.updateReview(user?.userId, id, dto);
  }

  @Delete('reviews/:id')
  @ApiOperation({
    summary: 'Ẩn đánh giá của tôi (R1-066)',
  })
  @ApiResponse({ status: 200, description: 'Ẩn đánh giá thành công' })
  @ApiResponse({ status: 404, description: 'Đánh giá không tồn tại' })
  async hideReview(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.interactionsService.hideReview(user?.userId, id);
  }

  @Get('reviews')
  @ApiOperation({
    summary: 'Xem danh sách các đánh giá của tôi (K38)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá của tôi' })
  async getCustomerReviews(@CurrentUser() user: RequestUser) {
    return this.interactionsService.getCustomerReviews(user?.userId);
  }

  @Post('reports')
  @ApiOperation({
    summary: 'Báo cáo vi phạm cửa hàng / người dùng / sản phẩm (R1-069)',
  })
  @ApiResponse({ status: 201, description: 'Báo cáo vi phạm đã được ghi nhận' })
  @ApiResponse({ status: 409, description: 'Bạn đã gửi báo cáo đối tượng này đang chờ xử lý' })
  async createViolationReport(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateViolationReportDto,
  ) {
    return this.interactionsService.createViolationReport(user?.userId, dto);
  }

  @Post('support-tickets')
  @ApiOperation({
    summary: 'Mở yêu cầu hỗ trợ người thật CSKH (tối đa 5 yêu cầu đang mở) (R1-070)',
  })
  @ApiResponse({ status: 201, description: 'Mở ticket hỗ trợ thành công' })
  @ApiResponse({ status: 429, description: 'Bạn đã đạt giới hạn 5 yêu cầu hỗ trợ đang mở' })
  async createSupportTicket(@CurrentUser() user: RequestUser, @Body() dto: CreateSupportTicketDto) {
    return this.interactionsService.createSupportTicket(user?.userId, dto);
  }

  @Get('support-tickets')
  @ApiOperation({
    summary: 'Xem danh sách yêu cầu hỗ trợ của tôi (R1-070)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách ticket hỗ trợ' })
  async getCustomerSupportTickets(@CurrentUser() user: RequestUser) {
    return this.interactionsService.getCustomerSupportTickets(user?.userId);
  }

  @Get('support-tickets/:id')
  @ApiOperation({
    summary: 'Xem chi tiết yêu cầu hỗ trợ và các tin nhắn trao đổi (R1-071)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết ticket hỗ trợ kèm tin nhắn' })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  async getSupportTicketDetail(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.interactionsService.getSupportTicketDetail(user?.userId, id);
  }

  @Post('support-tickets/:id/messages')
  @ApiOperation({
    summary: 'Gửi thêm tin nhắn trong luồng yêu cầu hỗ trợ (R1-071)',
  })
  @ApiResponse({ status: 201, description: 'Tin nhắn đã gửi thành công' })
  @ApiResponse({ status: 400, description: 'Yêu cầu hỗ trợ đã đóng hoặc giải quyết' })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  async sendSupportMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SendSupportMessageDto,
  ) {
    return this.interactionsService.sendSupportMessage(user?.userId, id, dto);
  }

  @Post('support-tickets/:id/close')
  @ApiOperation({
    summary: 'Đóng yêu cầu hỗ trợ khi đã giải quyết xong',
  })
  @ApiResponse({ status: 200, description: 'Ticket đã được đóng' })
  @ApiResponse({ status: 404, description: 'Ticket không tồn tại' })
  async closeSupportTicket(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.interactionsService.closeSupportTicket(user?.userId, id);
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

  @Get('impact/badges')
  @ApiOperation({
    summary: 'Xem danh hiệu & huy hiệu cứu thực phẩm, thẻ chia sẻ mạng xã hội (R1-081)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách huy hiệu và tiến trình mở khóa' })
  async getCustomerImpactBadges(@CurrentUser() user: RequestUser) {
    return this.interactionsService.getCustomerImpactBadges(user?.userId);
  }

  @Public()
  @Get('help-center/faq')
  @ApiOperation({
    summary: 'Danh mục câu hỏi thường gặp FAQ và hướng dẫn nhận hàng, khiếu nại (R1-072)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách các câu hỏi thường gặp theo phân loại' })
  async getHelpCenterFaq() {
    return this.interactionsService.getHelpCenterFaq();
  }
}
