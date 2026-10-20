import { BadRequestException } from '@nestjs/common';
import { UploadService, UploadedMulterFile } from './upload.service';

const file = (
  buffer: Buffer,
  mimetype = 'image/png',
  originalname = 'a.png',
): UploadedMulterFile => ({
  fieldname: 'file',
  originalname,
  encoding: '7bit',
  mimetype,
  size: buffer.length,
  buffer,
});

describe('UploadService.saveImage', () => {
  const service = new UploadService();
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(16),
  ]);

  it('từ chối tệp có mimetype ảnh nhưng nội dung không phải ảnh', async () => {
    await expect(
      service.saveImage(file(Buffer.from('<script>alert(1)</script>'), 'image/png', 'x.html')),
    ).rejects.toThrow(BadRequestException);
  });

  it('đặt đuôi tệp theo loại thật, bỏ qua tên tệp client gửi', async () => {
    const res = await service.saveImage(file(png, 'image/png', 'evil.html'));
    expect(res.filename.endsWith('.png')).toBe(true);
    expect(res.mimetype).toBe('image/png');
  });
});
