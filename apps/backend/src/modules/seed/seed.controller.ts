import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../entities/auth/user.entity';

@ApiTags('Seed Data & Testing')
@Controller('seed')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get('demo-data')
  @ApiOperation({ summary: 'Admin bổ sung dữ liệu demo còn thiếu (chỉ ngoài production)' })
  async getDemoData() {
    return this.seedService.seedDemoData();
  }

  @Post('demo-data')
  @ApiOperation({ summary: 'Kích hoạt khởi tạo dữ liệu mẫu cho ứng dụng' })
  async postDemoData() {
    return this.seedService.seedDemoData();
  }
}
