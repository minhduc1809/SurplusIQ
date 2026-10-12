import * as crypto from 'crypto';
import { QrTokenPayload, QrVerifyResult } from '../types/qr.types';

export interface LegacyTokenPayload {
  orderId: string;
  storeId: string;
  buyerId?: string;
  expiresAt: number; // Timestamp ms
}

export class QrTokenEngine {
  /**
   * Ký token QR an toàn HMAC-SHA256 (Chuẩn BR-022, 9.1)
   * Tuyệt đối KHÔNG chứa thông tin định danh cá nhân (PII như buyerId, số điện thoại, tên, email)
   */
  public static sign(payload: QrTokenPayload, secretKey: string): string {
    const dataString = `${payload.jti}:${payload.orderId}:${payload.storeId}:${payload.exp}`;
    const signature = crypto.createHmac('sha256', secretKey).update(dataString).digest('hex');

    const combined = JSON.stringify({
      jti: payload.jti,
      orderId: payload.orderId,
      storeId: payload.storeId,
      exp: payload.exp,
      sig: signature,
    });

    return Buffer.from(combined, 'utf-8').toString('base64url');
  }

  /**
   * Xác thực token QR với thời điểm `now: Date` truyền vào (Pure function, Timing-safe)
   */
  public static verify(tokenString: string, secretKey: string, now: Date): QrVerifyResult {
    try {
      if (!tokenString || typeof tokenString !== 'string') {
        return {
          isValid: false,
          errorCode: 'MALFORMED',
          errorMessage: 'Token rỗng hoặc không đúng định dạng chuỗi.',
        };
      }

      const decodedJson = Buffer.from(tokenString, 'base64url').toString('utf-8');
      const data = JSON.parse(decodedJson);

      const { jti, orderId, storeId, exp, sig } = data;
      if (!jti || !orderId || !storeId || typeof exp !== 'number' || !sig) {
        return {
          isValid: false,
          errorCode: 'MALFORMED',
          errorMessage: 'Cấu trúc dữ liệu mã QR bị thiếu trường bắt buộc.',
        };
      }

      // 1. Kiểm tra hết hạn (exp tính bằng milliseconds)
      if (now.getTime() > exp) {
        return {
          isValid: false,
          errorCode: 'EXPIRED',
          errorMessage: 'Vé nhận hàng QR đã hết hạn lấy hàng.',
          payload: { jti, orderId, storeId, exp },
        };
      }

      // 2. Xác thực chữ ký an toàn timingSafeEqual chống tấn công dò thời gian
      const dataString = `${jti}:${orderId}:${storeId}:${exp}`;
      const expectedSig = crypto.createHmac('sha256', secretKey).update(dataString).digest('hex');

      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');

      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return {
          isValid: false,
          errorCode: 'INVALID_SIGNATURE',
          errorMessage: 'Chữ ký số của mã QR không hợp lệ hoặc đã bị can thiệp.',
        };
      }

      return {
        isValid: true,
        payload: { jti, orderId, storeId, exp },
      };
    } catch {
      return {
        isValid: false,
        errorCode: 'MALFORMED',
        errorMessage: 'Giải mã token QR thất bại (dữ liệu hỏng hoặc sai mã hóa).',
      };
    }
  }

  /**
   * Adapter tương thích ngược với API cũ
   */
  public static generateToken(payload: LegacyTokenPayload, secretKey: string): string {
    return this.sign(
      {
        jti: `legacy-${payload.orderId}`,
        orderId: payload.orderId,
        storeId: payload.storeId,
        exp: payload.expiresAt,
      },
      secretKey,
    );
  }

  /**
   * Adapter xác thực tương thích ngược với API cũ
   */
  public static verifyToken(
    tokenString: string,
    secretKey: string,
    now: Date = new Date(),
  ): { isValid: boolean; payload?: LegacyTokenPayload; error?: string } {
    const res = this.verify(tokenString, secretKey, now);
    if (!res.isValid) {
      return {
        isValid: false,
        error: res.errorMessage,
      };
    }
    return {
      isValid: true,
      payload: {
        orderId: res.payload!.orderId,
        storeId: res.payload!.storeId,
        expiresAt: res.payload!.exp,
      },
    };
  }
}
