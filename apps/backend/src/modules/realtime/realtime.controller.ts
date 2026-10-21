import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Controller, Post, Body, Get, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RealtimeService } from './realtime.service';

export class TriggerTestRealtimeDto {
  @IsOptional()
  @IsIn(['deal.stock_updated', 'deal.flash_rescue', 'order.hold_reserved'])
  type: 'deal.stock_updated' | 'deal.flash_rescue' | 'order.hold_reserved';

  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() storeId?: string;
  @IsOptional() @IsNumber() remainingQuantity?: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() storeName?: string;
  @IsOptional() @IsNumber() discountPercent?: number;
  @IsOptional() @IsNumber() discountedPrice?: number;
  @IsOptional() @IsNumber() originalPrice?: number;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

@ApiTags('Realtime WebSocket')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get('status')
  @ApiOperation({ summary: 'Kiểm tra trạng thái WebSocket Gateway' })
  getStatus() {
    return {
      status: 'active',
      path: '/ws',
      protocols: ['ws', 'wss'],
      supportedEvents: ['deal.stock_updated', 'deal.flash_rescue', 'order.hold_reserved'],
    };
  }

  @Post('trigger-test')
  @ApiOperation({ summary: 'Kích hoạt sự kiện giả lập realtime cho Android và Web' })
  @ApiResponse({ status: 200, description: 'Đã phát broadcast sự kiện thành công' })
  triggerTestEvent(@Body() dto: TriggerTestRealtimeDto) {
    // Khách nào cũng có token nên không để phát sự kiện giả tới mọi thiết bị ở môi trường thật.
    if (process.env.NODE_ENV === 'production') throw new NotFoundException();
    if (dto.type === 'deal.stock_updated') {
      this.realtimeService.notifyStockUpdated({
        dealId: dto.dealId || 'deal-test-1',
        storeId: dto.storeId || 'store-test-1',
        remainingQuantity: dto.remainingQuantity ?? 2,
        status: (dto.remainingQuantity ?? 2) < 3 ? 'LOW_STOCK' : 'AVAILABLE',
      });
    } else if (dto.type === 'deal.flash_rescue') {
      this.realtimeService.notifyFlashRescue({
        dealId: dto.dealId || 'deal-flash-1',
        storeId: dto.storeId || 'store-test-1',
        title: dto.title || 'Combo Cứu Món Giờ Vàng 70%',
        storeName: dto.storeName || 'Tiệm Bánh Ngon 365',
        discountPercent: dto.discountPercent || 70,
        discountedPrice: dto.discountedPrice || 25000,
        originalPrice: dto.originalPrice || 85000,
        latitude: dto.latitude || 10.7769,
        longitude: dto.longitude || 106.7009,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    } else if (dto.type === 'order.hold_reserved') {
      this.realtimeService.notifyOrderHoldReserved({
        orderId: 'order-test-1',
        dealId: dto.dealId || 'deal-test-1',
        storeId: dto.storeId || 'store-test-1',
        reservedQuantity: 1,
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
    }

    return { success: true, message: `Event ${dto.type} broadcasted` };
  }
}
