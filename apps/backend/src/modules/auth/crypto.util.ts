import * as crypto from 'crypto';

export class CryptoUtil {
  /**
   * Băm mật khẩu an toàn chuẩn OWASP bằng thuật toán Scrypt và Salt 16 bytes ngẫu nhiên
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `scrypt:${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * So khớp mật khẩu với hàm so sánh timing-safe chống tấn công kênh kề (side-channel timing attack)
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.startsWith('scrypt:')) {
      return false;
    }

    const parts = storedHash.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [, salt, originalKeyHex] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const originalKeyBuffer = Buffer.from(originalKeyHex, 'hex');

    if (derivedKey.length !== originalKeyBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, originalKeyBuffer);
  }

  /**
   * Băm SHA-256 dùng cho Token Hash, OTP Hash
   */
  static sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Sinh mã OTP ngẫu nhiên an toàn bằng CSPRNG
   */
  static generateOtp(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(crypto.randomInt(min, max + 1));
  }

  /**
   * Sinh chuỗi token ngẫu nhiên độ dài 64 hex
   */
  static generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
