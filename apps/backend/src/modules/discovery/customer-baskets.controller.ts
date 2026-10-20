import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { SuggestBasketDto } from './dto/suggest-basket.dto';
import { BasketSubstitutesQueryDto, BasketCheckoutDto } from './dto/basket-checkout.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { UserRole } from '../../entities/auth/user.entity';

/** Rescue Basket (CM-C01, KC03, KC04): giỏ món theo nhu cầu, thay món và đặt giữ giỏ. */
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

  @Public()
  @Post('substitutes')
  @ApiOperation({
    summary: 'Tìm suất cứu thay thế cùng cửa hàng trong giỏ hàng (KC03)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách các món thay thế cùng cửa hàng' })
  async getBasketSubstitutes(@Body() dto: BasketSubstitutesQueryDto) {
    return this.discoveryService.getBasketSubstitutes(dto);
  }

  @ApiBearerAuth()
  @Channel('CUSTOMER')
  @Roles(UserRole.CUSTOMER)
  @UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard)
  @Idempotent({ scope: 'baskets.checkout', required: true })
  @Post('checkout')
  @ApiOperation({
    summary: 'Đặt giữ toàn bộ giỏ cứu món 10 phút, kiểm tra tồn kho nguyên tử (KC04)',
  })
  @ApiResponse({ status: 201, description: 'Đặt giữ cả giỏ thành công' })
  @ApiResponse({ status: 409, description: 'Có món trong giỏ đã hết suất hoặc đổi giá' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async checkoutBasket(@CurrentUser() user: RequestUser, @Body() dto: BasketCheckoutDto) {
    return this.discoveryService.checkoutBasket(user?.userId, dto);
  }
}
