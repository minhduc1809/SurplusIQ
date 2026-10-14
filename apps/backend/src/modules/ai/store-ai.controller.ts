import { Controller, Post, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AiGatewayService } from './ai-gateway.service';
import { StoreAiChatDto, DescribeItemDto, AiFeedbackDto } from './dto/ai.dto';
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

  @Post('feedback')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Gửi đánh giá chất lượng câu trả lời AI (R2-126)' })
  @ApiResponse({ status: 200, description: 'Đã ghi nhận đánh giá' })
  async recordStoreFeedback(@CurrentUser() user: RequestUser, @Body() dto: AiFeedbackDto) {
    return this.aiService.recordFeedback(user.userId, dto);
  }
}
