import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Chữ ký đầu tệp để chắc chắn đúng là ảnh, không tin mimetype do client gửi. */
export function detectImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  )
    return 'image/png';
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString() === 'RIFF' &&
    buf.subarray(8, 12).toString() === 'WEBP'
  )
    return 'image/webp';
  return null;
}

/** Chữ ký tải lên có ký: sha1 của các tham số theo thứ tự chữ cái, nối với API secret. */
export function signUploadParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  private get config() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('Chưa cấu hình dịch vụ lưu ảnh.');
    }
    return { cloudName, apiKey, apiSecret };
  }

  /** Địa chỉ ảnh hợp lệ của chính tài khoản Cloudinary này; chặn đường dẫn ảnh tùy ý từ client. */
  isOwnImageUrl(url: string): boolean {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    return !!cloudName && url.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`);
  }

  /** Tải ảnh lên thư mục [folder]; trả địa chỉ https công khai. */
  async uploadImage(
    file: UploadedImageFile,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    if (!file?.buffer?.length) throw new BadRequestException('Chưa chọn ảnh.');
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException('Ảnh tối đa 5 MB.');
    const detected = detectImageType(file.buffer);
    if (!detected || !ALLOWED_TYPES.includes(detected)) {
      throw new BadRequestException('Chỉ nhận ảnh JPEG, PNG hoặc WebP.');
    }

    const { cloudName, apiKey, apiSecret } = this.config;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = signUploadParams({ folder, timestamp }, apiSecret);

    const form = new FormData();
    form.append('file', `data:${detected};base64,${file.buffer.toString('base64')}`);
    form.append('folder', folder);
    form.append('timestamp', timestamp);
    form.append('api_key', apiKey);
    form.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const body = (await res.json().catch(() => ({}))) as {
      secure_url?: string;
      public_id?: string;
      error?: { message?: string };
    };
    if (!res.ok || !body.secure_url) {
      this.logger.error(`Cloudinary từ chối ảnh: ${body.error?.message ?? res.status}`);
      throw new ServiceUnavailableException('Không lưu được ảnh, vui lòng thử lại.');
    }
    return { url: body.secure_url, publicId: body.public_id ?? '' };
  }
}
