import { Controller, Get, Param, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { Public } from '../../common/decorators/public.decorator';
import { QueryStoreReviewsDto } from './dto/query-store-reviews.dto';

@ApiTags('Customer - Store Profile')
@Controller('customer/stores')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerStoresController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết cửa hàng và các deal đang mở bán của quán (R1-027)',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết cửa hàng và các suất đang mở' })
  @ApiResponse({ status: 404, description: 'Cửa hàng không tồn tại hoặc đang tạm ngưng' })
  async getStoreDetail(@Param('id') id: string) {
    return this.discoveryService.getStoreDetail(id);
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Xem danh sách đánh giá công khai và phân bổ sao của cửa hàng (K15, R1-027)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách đánh giá và phân bổ sao của quán' })
  @ApiResponse({ status: 404, description: 'Cửa hàng không tồn tại' })
  async getStoreReviews(@Param('id') storeId: string, @Query() query: QueryStoreReviewsDto) {
    return this.discoveryService.getStoreReviews(storeId, query);
  }
}
