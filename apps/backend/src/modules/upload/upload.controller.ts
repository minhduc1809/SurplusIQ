import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadService, UploadedMulterFile } from './upload.service';

@ApiTags('Upload - Media & Attachments')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({
    summary:
      'Tải lên hình ảnh (Avatar, bằng chứng khiếu nại, ảnh quán) tối đa 5MB (R1-068, R1-006)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tập tin ảnh (JPG, PNG, WEBP)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tải lên ảnh thành công' })
  @ApiResponse({ status: 400, description: 'Định dạng hoặc dung lượng không hợp lệ' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadImage(@UploadedFile() file: UploadedMulterFile, @Req() req: Request) {
    const protocol = req.protocol;
    const host = req.get('host');
    const reqBaseUrl = host ? `${protocol}://${host}` : undefined;
    return this.uploadService.saveImage(file, reqBaseUrl);
  }
}
