import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/** Khóa lấy từ DATA_ENCRYPTION_KEY (ưu tiên) hoặc JWT_SECRET; không có khóa thì từ chối chứ không dùng mặc định. */
function key(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret)
    throw new Error('Thiếu DATA_ENCRYPTION_KEY hoặc JWT_SECRET để mã hóa dữ liệu nhạy cảm.');
  return createHash('sha256').update(secret).digest();
}

/** AES-256-GCM; kết quả dạng iv:tag:dữ liệu (base64). */
export function encryptField(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join(':');
}

export function decryptField(payload: string): string {
  const [iv, tag, data] = payload.split(':').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export const last4 = (accountNumber: string) => accountNumber.slice(-4);
