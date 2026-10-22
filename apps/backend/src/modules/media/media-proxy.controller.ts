import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

/** Chỉ cho phép lấy ảnh từ các kho ảnh đã dùng trong dữ liệu (chặn SSRF tới địa chỉ nội bộ). */
const ALLOWED_HOSTS = new Set(['images.unsplash.com', 'res.cloudinary.com']);
const MAX_BYTES = 5 * 1024 * 1024;
const CACHE_LIMIT = 300;

interface CachedImage {
  body: Buffer;
  type: string;
}

/**
 * Chuyển tiếp ảnh từ kho ảnh bên ngoài qua backend. App trên điện thoại chỉ cần nói chuyện với backend,
 * không phụ thuộc mạng nhà/di động có chặn kho ảnh hay không; ảnh được lưu đệm trong bộ nhớ.
 */
@ApiTags('Media')
@Controller('media')
export class MediaProxyController {
  private readonly cache = new Map<string, CachedImage>();

  @Get('proxy')
  @ApiOperation({ summary: 'Lấy ảnh từ kho ảnh cho phép qua backend (có lưu đệm)' })
  async proxy(@Query('url') raw: string, @Res() res: Response) {
    let target: URL;
    try {
      target = new URL(raw);
    } catch {
      throw new BadRequestException('Địa chỉ ảnh không hợp lệ.');
    }
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
      throw new BadRequestException('Chỉ hỗ trợ ảnh từ kho ảnh đã cấu hình.');
    }

    const key = target.toString();
    let image = this.cache.get(key);
    if (!image) {
      const upstream = await fetch(key, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
      const type = upstream?.headers.get('content-type') ?? '';
      if (!upstream?.ok || !type.startsWith('image/'))
        throw new NotFoundException('Không tải được ảnh.');
      const body = Buffer.from(await upstream.arrayBuffer());
      if (body.length > MAX_BYTES) throw new BadRequestException('Ảnh quá lớn.');
      image = { body, type };
      if (this.cache.size >= CACHE_LIMIT)
        this.cache.delete(this.cache.keys().next().value as string);
      this.cache.set(key, image);
    }
    res.setHeader('Content-Type', image.type);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(image.body);
  }
}
