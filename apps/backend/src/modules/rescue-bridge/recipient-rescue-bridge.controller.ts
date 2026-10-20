import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RescueBridgeService } from './rescue-bridge.service';
import {
  RecipientAcceptDto,
  RecipientConfirmHandoverDto,
  TransferReasonDto,
} from './dto/rescue-bridge.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Phản hồi của đơn vị tiếp nhận qua link riêng cho từng đề nghị. Đơn vị là bên ngoài, chưa có tài khoản:
 * token 256-bit ngẫu nhiên, chỉ lưu sha256, cửa hàng cấp lại được (link cũ mất hiệu lực), và chỉ dùng được
 * khi đề nghị còn ở trạng thái tương ứng.
 */
@ApiTags('Public - Rescue Bridge Recipient')
@Controller('rescue-bridge/respond/:token')
@Public()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class RecipientRescueBridgeController {
  constructor(private readonly service: RescueBridgeService) {}

  @Get()
  @ApiOperation({ summary: 'Xem đề nghị bàn giao (chỉ thông tin cần để phối hợp - BR-B03-09)' })
  @ApiResponse({ status: 404, description: 'Link không hợp lệ hoặc đã được cấp lại' })
  async view(@Param('token') token: string) {
    return this.service.recipientView(token);
  }

  @Post('accept')
  @ApiOperation({
    summary: 'Chấp nhận (có thể đề xuất số lượng/thời gian khác): Đã gửi → Đã chấp nhận',
  })
  async accept(@Param('token') token: string, @Body() dto: RecipientAcceptDto) {
    return this.service.recipientAccept(token, dto);
  }

  @Post('reject')
  @ApiOperation({ summary: 'Từ chối - bắt buộc lý do' })
  async reject(@Param('token') token: string, @Body() dto: TransferReasonDto) {
    return this.service.recipientReject(token, dto.reason);
  }

  @Post('confirm-handover')
  @ApiOperation({
    summary: 'Đơn vị xác nhận số lượng thực nhận (cần khớp xác nhận của cửa hàng để hoàn tất)',
  })
  async confirmHandover(@Param('token') token: string, @Body() dto: RecipientConfirmHandoverDto) {
    return this.service.recipientConfirmHandover(token, dto);
  }
}
