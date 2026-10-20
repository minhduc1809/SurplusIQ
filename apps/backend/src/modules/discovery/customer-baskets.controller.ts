import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { SuggestBasketDto } from './dto/suggest-basket.dto';
import { Public } from '../../common/decorators/public.decorator';

/** Rescue Basket (CM-C01): giỏ món theo nhu cầu - tính toán thuần, không giữ tồn/tạo đơn. */
@ApiTags('Customer - Rescue Basket')
@Controller('customer/baskets')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerBasketsController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Post('suggest')
  @ApiOperation({
    summary:
      'Gợi ý tổ hợp suất theo ngân sách/số người/khung nhận - không giữ tồn, không tạo đơn (CM-C01)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách giỏ gợi ý đã xếp hạng' })
  async suggestBasket(@Body() dto: SuggestBasketDto) {
    return this.discoveryService.suggestBasket(dto);
  }
}
