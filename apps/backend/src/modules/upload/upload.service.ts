import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');
  private readonly allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxSizeBytes = 5 * 1024 * 1024; // 5MB

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Tạo thư mục lưu trữ tải lên tại: ${this.uploadDir}`);
    }
  }

  async saveImage(file: UploadedMulterFile, reqBaseUrl?: string): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn một tập tin ảnh để tải lên.');
    }

    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, PNG hoặc WEBP.',
      );
    }

    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException('Kích thước ảnh vượt quá dung lượng tối đa 5MB.');
    }

    const ext =
      path.extname(file.originalname) || (file.mimetype === 'image/png' ? '.png' : '.jpg');
    const safeFilename = `img_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext.toLowerCase()}`;
    const destinationPath = path.join(this.uploadDir, safeFilename);

    await fs.promises.writeFile(destinationPath, file.buffer);

    const relativeUrl = `/uploads/${safeFilename}`;
    const fullUrl = reqBaseUrl ? `${reqBaseUrl}${relativeUrl}` : relativeUrl;

    return {
      url: fullUrl,
      filename: safeFilename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
