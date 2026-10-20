import { validate } from 'class-validator';
import { AttachPaymentProofDto } from './attach-payment-proof.dto';

const check = async (proofUrl: string) => {
  const dto = Object.assign(new AttachPaymentProofDto(), { proofUrl });
  return (await validate(dto)).length;
};

describe('AttachPaymentProofDto', () => {
  it('nhận ảnh đã tải lên kho của hệ thống', async () => {
    expect(await check('http://10.0.2.2:4000/uploads/img_1700000000000_ab12cd.jpg')).toBe(0);
    expect(await check('/uploads/img_1700000000000_ab12cd.png')).toBe(0);
  });

  it('từ chối đường dẫn ngoài hệ thống hoặc không phải ảnh', async () => {
    expect(await check('https://evil.example.com/phish.jpg')).toBe(1);
    expect(await check('/uploads/../../etc/passwd')).toBe(1);
    expect(await check('/uploads/img_1_a.html')).toBe(1);
  });
});
