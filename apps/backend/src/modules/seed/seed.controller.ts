import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Seed Data & Testing')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @Get('demo-data')
  @ApiOperation({ summary: 'Kiểm tra và khởi tạo dữ liệu mẫu (Stores, Items, Offers)' })
  async getDemoData() {
    return this.seedService.seedDemoData();
  }

  @Public()
  @Post('demo-data')
  @ApiOperation({ summary: 'Kích hoạt khởi tạo dữ liệu mẫu cho ứng dụng' })
  async postDemoData() {
    return this.seedService.seedDemoData();
  }
}
