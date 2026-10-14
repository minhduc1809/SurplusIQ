import { Controller, Post, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AiGatewayService } from './ai-gateway.service';
import { CustomerAiSearchDto, AiFeedbackDto } from './dto/ai.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Customer - AI Assistant & Search')
@ApiBearerAuth()
@Controller('customer/ai')
@Channel('CUSTOMER')
@Roles(UserRole.CUSTOMER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerAiController {
  constructor(private readonly aiService: AiGatewayService) {}

  @Post('search')
  @ApiOperation({ summary: 'Tìm kiếm món ngon và ưu đãi bằng ngôn ngữ tự nhiên (R1-082..R1-094)' })
  @ApiResponse({ status: 200, description: 'Danh sách món ngon và lời giải thích phù hợp' })
  async searchDeals(@CurrentUser() user: RequestUser, @Body() dto: CustomerAiSearchDto) {
    return this.aiService.searchDeals(user.userId, dto);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Đánh giá câu trả lời của trợ lý tìm kiếm AI (R1-094)' })
  @ApiResponse({ status: 200, description: 'Đã ghi nhận đánh giá' })
  async recordCustomerFeedback(@CurrentUser() user: RequestUser, @Body() dto: AiFeedbackDto) {
    return this.aiService.recordFeedback(user.userId, dto);
  }
}
