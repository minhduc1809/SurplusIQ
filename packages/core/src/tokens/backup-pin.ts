import * as crypto from 'crypto';
import { BACKUP_PIN_ALPHABET } from '../types/qr.types';

export class BackupPinEngine {
  /**
   * Sinh mã PIN dự phòng 6 ký tự không gây nhầm lẫn (Chuẩn BR-022)
   * Sử dụng bảng ký tự 32 ký tự: '23456789ABCDEFGHJKMNPQRSTUVWXYZ' (đã loại bỏ 0, O, 1, I, L).
   */
  public static generate(randomBytesFn: (size: number) => Buffer = crypto.randomBytes): string {
    const bytes = randomBytesFn(6);
    let pin = '';
    const alphabetLength = BACKUP_PIN_ALPHABET.length; // 32 ký tự

    for (let i = 0; i < 6; i++) {
      // Dùng modulo 32 để map byte sang ký tự ngẫu nhiên đều
      const index = bytes[i] % alphabetLength;
      pin += BACKUP_PIN_ALPHABET[index];
    }

    return pin;
  }

  /**
   * Kiểm tra định dạng mã PIN: bắt buộc đúng 6 ký tự và thuộc bảng ký tự cho phép
   */
  public static isValidFormat(pin: string): boolean {
    if (!pin || typeof pin !== 'string') {
      return false;
    }

    const normalized = pin.trim().toUpperCase();
    if (normalized.length !== 6) {
      return false;
    }

    // Kiểm tra từng ký tự thuộc bảng BACKUP_PIN_ALPHABET (loại bỏ 0, O, 1, I, L)
    for (let i = 0; i < 6; i++) {
      if (!BACKUP_PIN_ALPHABET.includes(normalized[i])) {
        return false;
      }
    }
    return true;
  }

  /**
   * Chuẩn hóa mã PIN nhập từ bàn phím (viết hoa, bỏ khoảng trắng)
   */
  public static normalize(pin: string): string {
    if (!pin || typeof pin !== 'string') {
      return '';
    }
    return pin.trim().toUpperCase();
  }
}
