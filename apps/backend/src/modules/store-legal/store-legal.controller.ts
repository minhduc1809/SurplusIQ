import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ChannelGuard } from '../../common/guards/channel.guard';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';
import { Channel } from '../../common/decorators/channel.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentStore, CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../entities/auth/user.entity';
import { StorePermission } from '../../entities/stores/store-member.entity';
import { ContractStatus } from '../../entities/stores/store-contract.entity';
import { MAX_CONTRACT_BYTES, StoreLegalService } from './store-legal.service';
import { ReviewContractDto, UpsertLegalProfileDto } from './dto/store-legal.dto';

function sendFile(res: Response, f: { buffer: Buffer; mimeType: string; fileName: string }) {
  res.setHeader('Content-Type', f.mimeType);
  res.setHeader(
    'Content-Disposition',
    "inline; filename*=UTF-8''" + encodeURIComponent(f.fileName),
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(f.buffer);
}

@ApiTags('Store - Hồ sơ kinh doanh & hợp đồng')
@ApiBearerAuth()
@Controller('store')
@Channel('STORE')
@Roles(UserRole.STORE_USER)
@UseGuards(JwtAuthGuard, RolesGuard, ChannelGuard, StorePermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class StoreLegalController {
  constructor(private readonly legal: StoreLegalService) {}

  @Get('legal-profile')
  @Permissions(StorePermission.OWNER, StorePermission.MANAGER)
  @ApiOperation({ summary: 'Hồ sơ kinh doanh và trạng thái hợp đồng của cửa hàng' })
  overview(@CurrentStore() storeId: string) {
    return this.legal.getOverview(storeId);
  }

  @Put('legal-profile')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Lưu hồ sơ kinh doanh (chỉ chủ cửa hàng)' })
  upsert(@CurrentStore() storeId: string, @Body() dto: UpsertLegalProfileDto) {
    return this.legal.upsertProfile(storeId, dto);
  }

  @Post('contract')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Tải bản scan hợp đồng đã ký (PDF/JPG/PNG, tối đa 10 MB)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CONTRACT_BYTES } }))
  upload(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') userId: string,
    @UploadedFile() file?: { buffer: Buffer; size: number; originalname: string },
  ) {
    return this.legal.uploadContract(storeId, userId, file);
  }

  @Get('contract/file')
  @Permissions(StorePermission.OWNER)
  @ApiOperation({ summary: 'Xem tệp hợp đồng của chính cửa hàng' })
  async file(@CurrentStore() storeId: string, @Res() res: Response) {
    sendFile(res, await this.legal.getLatestContractFile(storeId));
  }
}

@ApiTags('Admin - Duyệt hợp đồng cửa hàng')
@ApiBearerAuth()
@Controller('admin/store-contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminStoreContractsController {
  constructor(private readonly legal: StoreLegalService) {}

  @Get()
  list(@Query('status') status?: ContractStatus) {
    return this.legal.listForAdmin(status);
  }

  @Get(':id/file')
  async file(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    sendFile(res, await this.legal.getContractFileById(id));
  }

  @Patch(':id/review')
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: ReviewContractDto,
  ) {
    return this.legal.review(id, adminId, dto);
  }
}
