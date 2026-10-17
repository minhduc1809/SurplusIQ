import { Controller, Post, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AiGatewayService } from './ai-gateway.service';
import {
  StoreAiChatDto,
  DescribeItemDto,
  AiFeedbackDto,
  DraftReviewReplyDto,
  DraftMarketingCampaignDto,
  DraftComplaintReplyDto,
  SentimentAnalysisDto,
  SuggestCombosDto,
} from './dto/ai.dto';
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

@ApiTags('Store - AI Assistant Gateway')
@ApiBearerAuth()
@Controller('store/ai')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreAiController {
  constructor(private readonly aiService: AiGatewayService) {}

  @Post('chat')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Hỏi đáp trợ lý AI về định giá, vận hành và giảm lãng phí thực phẩm (R2-108..R2-110)',
  })
  @ApiResponse({ status: 200, description: 'Câu trả lời từ trợ lý AI' })
  async chatWithStore(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: StoreAiChatDto,
  ) {
    return this.aiService.chatWithStore(storeId, user.userId, dto);
  }

  @Post('describe-item')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'AI soạn thảo mô tả món bánh/thực phẩm hấp dẫn (R2-021)' })
  @ApiResponse({ status: 200, description: 'Nội dung mô tả sản phẩm' })
  async describeItem(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DescribeItemDto,
  ) {
    return this.aiService.describeItem(storeId, user.userId, dto);
  }

  @Post('weekly-summary')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Tạo báo cáo tóm tắt tuần và tác động môi trường dưới dạng câu chuyện (R2-111)',
  })
  @ApiResponse({ status: 200, description: 'Báo cáo tuần AI' })
  async generateWeeklySummary(@CurrentStore() storeId: string, @CurrentUser() user: RequestUser) {
    return this.aiService.generateWeeklySummary(storeId, user.userId);
  }

  @Post('draft-review-reply')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'AI soạn thảo phản hồi đánh giá khách hàng lịch sự và thông minh (R2-116)',
  })
  @ApiResponse({ status: 200, description: 'Bản nháp phản hồi đánh giá khách hàng' })
  async draftReviewReply(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DraftReviewReplyDto,
  ) {
    return this.aiService.draftReviewReply(storeId, user.userId, dto);
  }

  @Post('draft-complaint-reply')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'AI gợi ý soạn phản hồi giải quyết khiếu nại của khách hàng (R2-118, BR-054, BR-056)',
  })
  @ApiResponse({ status: 200, description: 'Gợi ý phản hồi khiếu nại chuyên nghiệp' })
  async draftComplaintReply(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DraftComplaintReplyDto,
  ) {
    return this.aiService.draftComplaintReply(storeId, user.userId, dto);
  }

  @Post('draft-marketing-campaign')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'AI đề xuất tiêu đề và nội dung thông báo push marketing kích cầu (R2-122)',
  })
  @ApiResponse({ status: 200, description: 'Gợi ý chiến dịch thông báo push' })
  async draftMarketingCampaign(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DraftMarketingCampaignDto,
  ) {
    return this.aiService.draftMarketingCampaign(storeId, user.userId, dto);
  }

  @Post('draft-notification')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'AI soạn tiêu đề và nội dung thông báo gửi khách hàng (R2-117, R2-122)',
  })
  @ApiResponse({ status: 200, description: 'Gợi ý tiêu đề và nội dung thông báo' })
  async draftNotification(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: DraftMarketingCampaignDto,
  ) {
    return this.aiService.draftMarketingCampaign(storeId, user.userId, dto);
  }

  @Post('sentiment-analysis')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Phân tích cảm xúc và trích xuất điểm mạnh, điểm cần cải thiện từ đánh giá (R2-119)',
  })
  @ApiResponse({ status: 200, description: 'Báo cáo phân tích sắc thái ý kiến khách hàng' })
  async analyzeSentiment(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: SentimentAnalysisDto,
  ) {
    return this.aiService.analyzeSentiment(storeId, user.userId, dto);
  }

  @Post('suggest-combos')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({
    summary: 'Đề xuất ghép combo hoặc tạo túi bất ngờ từ các món còn tồn kho (R2-124)',
  })
  @ApiResponse({ status: 200, description: 'Gợi ý combo và túi bất ngờ tối ưu doanh thu' })
  async suggestCombos(
    @CurrentStore() storeId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: SuggestCombosDto,
  ) {
    return this.aiService.suggestCombos(storeId, user.userId, dto);
  }

  @Post('feedback')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Gửi đánh giá chất lượng câu trả lời AI (R2-126)' })
  @ApiResponse({ status: 200, description: 'Đã ghi nhận đánh giá' })
  async recordStoreFeedback(@CurrentUser() user: RequestUser, @Body() dto: AiFeedbackDto) {
    return this.aiService.recordFeedback(user.userId, dto);
  }
}
