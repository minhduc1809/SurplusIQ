import { describe, it, expect } from 'vitest';
import { QrTokenEngine } from './qr-token';
import { BackupPinEngine } from './backup-pin';
import { BACKUP_PIN_ALPHABET, QrTokenPayload } from '../types/qr.types';

describe('QrTokenEngine & BackupPinEngine (BR-022, 9.1, R1-057, R2-052)', () => {
  const secretKey = 'super-secret-store-hmac-key-2026';
  const orderId = 'order-uuid-12345';
  const storeId = 'store-uuid-67890';
  const jti = 'jti-uuid-abcde';
  const exp = new Date('2026-10-12T21:15:00Z').getTime(); // Expired at 21:15

  describe('1. Bảo mật & Quyền riêng tư (Không chứa PII theo BR-022, 9.1)', () => {
    it('ký token hợp lệ và giải mã payload tuyệt đối không chứa buyerId, phone, name', () => {
      const payload: QrTokenPayload = { jti, orderId, storeId, exp };
      const token = QrTokenEngine.sign(payload, secretKey);

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      // Giải mã xem nội dung JSON thô
      const decodedJson = Buffer.from(token, 'base64url').toString('utf-8');
      const parsed = JSON.parse(decodedJson);

      // Kiểm tra các trường hợp lệ
      expect(parsed.jti).toBe(jti);
      expect(parsed.orderId).toBe(orderId);
      expect(parsed.storeId).toBe(storeId);
      expect(parsed.exp).toBe(exp);
      expect(parsed.sig).toBeDefined();

      // Kiểm tra BẢO MẬT: Tuyệt đối không chứa PII
      expect(parsed.buyerId).toBeUndefined();
      expect(parsed.phone).toBeUndefined();
      expect(parsed.email).toBeUndefined();
      expect(parsed.name).toBeUndefined();
    });

    it('xác thực thành công token hợp lệ khi còn trong hạn lấy hàng', () => {
      const payload: QrTokenPayload = { jti, orderId, storeId, exp };
      const token = QrTokenEngine.sign(payload, secretKey);

      // now = 20:30 (trước 21:15)
      const now = new Date('2026-10-12T20:30:00Z');
      const result = QrTokenEngine.verify(token, secretKey, now);

      expect(result.isValid).toBe(true);
      expect(result.payload?.orderId).toBe(orderId);
      expect(result.payload?.jti).toBe(jti);
      expect(result.payload?.storeId).toBe(storeId);
    });
  });

  describe('2. Kháng tấn công & Kiểm tra hết hạn (Pure Function & Timing-Safe)', () => {
    it('từ chối khi token đã hết hạn (now > exp)', () => {
      const payload: QrTokenPayload = { jti, orderId, storeId, exp };
      const token = QrTokenEngine.sign(payload, secretKey);

      // now = 21:16 (sau 21:15 đúng 1 phút)
      const afterExp = new Date('2026-10-12T21:16:00Z');
      const result = QrTokenEngine.verify(token, secretKey, afterExp);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('EXPIRED');
      expect(result.errorMessage).toContain('hết hạn');
    });

    it('từ chối chữ ký số không hợp lệ khi bị chỉnh sửa (INVALID_SIGNATURE)', () => {
      const payload: QrTokenPayload = { jti, orderId, storeId, exp };
      const token = QrTokenEngine.sign(payload, secretKey);

      // Giải mã, sửa orderId rồi đóng gói lại với chữ ký cũ
      const raw = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'));
      raw.orderId = 'hacked-order-id';
      const tamperedToken = Buffer.from(JSON.stringify(raw)).toString('base64url');

      const now = new Date('2026-10-12T20:00:00Z');
      const result = QrTokenEngine.verify(tamperedToken, secretKey, now);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('từ chối token với sai secret key', () => {
      const payload: QrTokenPayload = { jti, orderId, storeId, exp };
      const token = QrTokenEngine.sign(payload, secretKey);

      const now = new Date('2026-10-12T20:00:00Z');
      const result = QrTokenEngine.verify(token, 'wrong-secret-key', now);

      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('từ chối token bị biến dạng hoặc rác (MALFORMED)', () => {
      const now = new Date('2026-10-12T20:00:00Z');
      expect(QrTokenEngine.verify('invalid-garbage-token', secretKey, now).errorCode).toBe(
        'MALFORMED',
      );
      expect(QrTokenEngine.verify('', secretKey, now).errorCode).toBe('MALFORMED');
    });
  });

  describe('3. BackupPinEngine: Mã PIN 6 ký tự không gây nhầm lẫn (BR-022)', () => {
    it('sinh mã PIN đúng 6 ký tự và thuộc bảng ký tự an toàn', () => {
      for (let i = 0; i < 50; i++) {
        const pin = BackupPinEngine.generate();
        expect(pin.length).toBe(6);
        expect(BackupPinEngine.isValidFormat(pin)).toBe(true);

        // Kiểm tra từng ký tự
        for (const char of pin) {
          expect(BACKUP_PIN_ALPHABET.includes(char)).toBe(true);
          // Không bao giờ chứa các ký tự dễ nhầm lẫn
          expect(['0', 'O', '1', 'I', 'L'].includes(char)).toBe(false);
        }
      }
    });

    it('hàm isValidFormat phát hiện chính xác ký tự không hợp lệ và độ dài sai', () => {
      // Hợp lệ
      expect(BackupPinEngine.isValidFormat('234567')).toBe(true);
      expect(BackupPinEngine.isValidFormat('ABCDEF')).toBe(true);
      expect(BackupPinEngine.isValidFormat('abcdef')).toBe(true); // case-insensitive

      // Chứa ký tự cấm dễ nhầm lẫn: 0, O, 1, I, L
      expect(BackupPinEngine.isValidFormat('234560')).toBe(false); // chứa 0
      expect(BackupPinEngine.isValidFormat('ABCDEO')).toBe(false); // chứa O
      expect(BackupPinEngine.isValidFormat('123456')).toBe(false); // chứa 1
      expect(BackupPinEngine.isValidFormat('ABCDEI')).toBe(false); // chứa I
      expect(BackupPinEngine.isValidFormat('ABCDEL')).toBe(false); // chứa L

      // Sai độ dài
      expect(BackupPinEngine.isValidFormat('12345')).toBe(false); // 5 ký tự
      expect(BackupPinEngine.isValidFormat('1234567')).toBe(false); // 7 ký tự
      expect(BackupPinEngine.isValidFormat('')).toBe(false);
    });

    it('hàm normalize chuẩn hóa đúng (viết hoa và bỏ khoảng trắng thừa)', () => {
      expect(BackupPinEngine.normalize('  234abc  ')).toBe('234ABC');
    });
  });
});
