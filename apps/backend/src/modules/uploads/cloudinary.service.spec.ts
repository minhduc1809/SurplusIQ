import { createHash } from 'crypto';
import { detectImageType, signUploadParams } from './cloudinary.service';

describe('CloudinaryService helpers', () => {
  it('nhận đúng định dạng ảnh theo chữ ký đầu tệp, từ chối tệp khác', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe(
      'image/png',
    );
    expect(detectImageType(Buffer.from('RIFF1234WEBPxxxx'))).toBe('image/webp');
    expect(detectImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull();
  });

  it('ký tham số theo thứ tự chữ cái rồi nối secret (ví dụ trong tài liệu Cloudinary)', () => {
    // timestamp trước folder theo thứ tự chữ cái: folder=...&timestamp=...
    const sig = signUploadParams({ timestamp: '1315060510', folder: 'f' }, 'abcd');
    expect(sig).toBe(createHash('sha1').update('folder=f&timestamp=1315060510abcd').digest('hex'));
  });
});
