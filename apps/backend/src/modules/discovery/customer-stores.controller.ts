import { Controller, Get, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { Public } from '../../common/decorators/public.decorator';

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
}
