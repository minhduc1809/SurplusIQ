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
import { AiGatewayService } from './ai-gateway.service';
import {
  CustomerAiSearchDto,
  AiFeedbackDto,
  CustomerAllergyCheckDto,
  CustomerAiChatDto,
  MemorySettingDto,
} from './dto/ai.dto';
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

  @Get('deals/:id/summary')
  @ApiOperation({ summary: 'Tóm tắt deal nhanh dưới 3 gạch đầu dòng (R1-084)' })
  @ApiResponse({ status: 200, description: '3 điểm nhấn tóm tắt của suất bán' })
  async summarizeDeal(@Param('id') id: string) {
    return this.aiService.summarizeDeal(id);
  }

  @Post('allergy-check')
  @ApiOperation({ summary: 'Kiểm tra và giải thích thành phần gây dị ứng an toàn (R1-085)' })
  @ApiResponse({ status: 200, description: 'Mức độ rủi ro và các thành phần gây dị ứng khớp' })
  async checkAllergies(@CurrentUser() user: RequestUser, @Body() dto: CustomerAllergyCheckDto) {
    return this.aiService.checkAllergies(user.userId, dto);
  }

  @Get('deals/:id/recipe-ideas')
  @ApiOperation({ summary: 'Gợi ý cách hâm nóng và công thức tái chế món giải cứu (R1-087)' })
  @ApiResponse({ status: 200, description: 'Hướng dẫn hâm nóng và ý tưởng món ăn sáng tạo' })
  async getRecipeIdeas(@Param('id') id: string) {
    return this.aiService.getRecipeIdeas(id);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Trò chuyện hỏi đáp tự nhiên với trợ lý SaveBite AI (R1-088)' })
  @ApiResponse({ status: 200, description: 'Câu trả lời hỗ trợ từ SaveBite AI' })
  async chatWithCustomer(@CurrentUser() user: RequestUser, @Body() dto: CustomerAiChatDto) {
    return this.aiService.chatWithCustomer(user.userId, dto);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Đánh giá câu trả lời của trợ lý tìm kiếm AI (R1-094)' })
  @ApiResponse({ status: 200, description: 'Đã ghi nhận đánh giá' })
  async recordCustomerFeedback(@CurrentUser() user: RequestUser, @Body() dto: AiFeedbackDto) {
    return this.aiService.recordFeedback(user.userId, dto);
  }

  // --- Quản lý lịch sử hội thoại AI & Ghi nhớ ngữ cảnh (K51, R1-091) ---

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách các phiên hội thoại AI của khách hàng (K51)' })
  @ApiResponse({ status: 200, description: 'Danh sách các phiên hội thoại' })
  async listConversations(@CurrentUser() user: RequestUser) {
    return this.aiService.listCustomerConversations(user.userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lấy chi tiết tin nhắn của một phiên hội thoại AI (K51)' })
  @ApiResponse({ status: 200, description: 'Chi tiết tin nhắn của phiên' })
  async getConversationMessages(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.aiService.getConversationMessages(user.userId, id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Xóa một phiên hội thoại AI (K51)' })
  @ApiResponse({ status: 200, description: 'Đã xóa phiên hội thoại' })
  async deleteConversation(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.aiService.deleteCustomerConversation(user.userId, id);
  }

  @Delete('conversations')
  @ApiOperation({ summary: 'Xóa toàn bộ lịch sử hội thoại AI (K51)' })
  @ApiResponse({ status: 200, description: 'Đã xóa toàn bộ lịch sử' })
  async clearAllConversations(@CurrentUser() user: RequestUser) {
    return this.aiService.clearAllCustomerConversations(user.userId);
  }

  @Get('memory-setting')
  @ApiOperation({ summary: 'Lấy cấu hình ghi nhớ ngữ cảnh hội thoại AI (R1-091, K51)' })
  @ApiResponse({ status: 200, description: 'Trạng thái ghi nhớ ngữ cảnh' })
  async getMemorySetting(@CurrentUser() user: RequestUser) {
    return this.aiService.getMemorySetting(user.userId);
  }

  @Put('memory-setting')
  @ApiOperation({ summary: 'Cập nhật cấu hình ghi nhớ ngữ cảnh hội thoại AI (R1-091, K51)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateMemorySetting(@CurrentUser() user: RequestUser, @Body() dto: MemorySettingDto) {
    return this.aiService.updateMemorySetting(user.userId, dto.rememberContext);
  }
}
