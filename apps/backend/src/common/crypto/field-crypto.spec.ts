import { decryptField, encryptField, last4 } from './field-crypto';

describe('field-crypto', () => {
  beforeAll(() => {
    process.env.DATA_ENCRYPTION_KEY = 'test-key';
  });

  it('mã hóa rồi giải mã đúng, mỗi lần mã hóa cho kết quả khác nhau', () => {
    const a = encryptField('0388123456');
    expect(a).not.toContain('0388123456');
    expect(decryptField(a)).toBe('0388123456');
    expect(encryptField('0388123456')).not.toBe(a);
  });

  it('từ chối dữ liệu bị sửa', () => {
    const [iv, tag, data] = encryptField('0388123456').split(':');
    const tampered = [iv, tag, Buffer.from('xxxxxxxxxx').toString('base64')].join(':');
    expect(data).toBeDefined();
    expect(() => decryptField(tampered)).toThrow();
  });

  it('chỉ lộ 4 số cuối', () => {
    expect(last4('0388123456')).toBe('3456');
  });
});
