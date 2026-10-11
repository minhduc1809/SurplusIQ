import * as crypto from 'crypto';

export interface TokenPayload {
  orderId: string;
  storeId: string;
  buyerId: string;
  expiresAt: number; // Timestamp ms
}

export class QrTokenEngine {
  /**
   * Tạo token QR dùng một lần với chữ ký HMAC-SHA256
   */
  public static generateToken(payload: TokenPayload, secretKey: string): string {
    const dataString = `${payload.orderId}:${payload.storeId}:${payload.buyerId}:${payload.expiresAt}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(dataString)
      .digest('hex');

    const combined = JSON.stringify({ ...payload, sig: signature });
    return Buffer.from(combined).toString('base64url');
  }

  /**
   * Xác thực token QR và kiểm tra hạn sử dụng
   */
  public static verifyToken(
    tokenString: string,
    secretKey: string
  ): { isValid: boolean; payload?: TokenPayload; error?: string } {
    try {
      const decodedJson = Buffer.from(tokenString, 'base64url').toString('utf-8');
      const data = JSON.parse(decodedJson);

      const { orderId, storeId, buyerId, expiresAt, sig } = data;
      if (!orderId || !storeId || !buyerId || !expiresAt || !sig) {
        return { isValid: false, error: 'Mã QR không đúng định dạng.' };
      }

      // Kiểm tra hết hạn
      if (Date.now() > expiresAt) {
        return { isValid: false, error: 'Mã QR đã hết hạn lấy hàng.' };
      }

      // Xác thực chữ ký
      const dataString = `${orderId}:${storeId}:${buyerId}:${expiresAt}`;
      const expectedSig = crypto
        .createHmac('sha256', secretKey)
        .update(dataString)
        .digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
        return { isValid: false, error: 'Chữ ký mã QR không hợp lệ hoặc đã bị chỉnh sửa.' };
      }

      return {
        isValid: true,
        payload: { orderId, storeId, buyerId, expiresAt },
      };
    } catch {
      return { isValid: false, error: 'Giải mã token QR thất bại.' };
    }
  }
}
