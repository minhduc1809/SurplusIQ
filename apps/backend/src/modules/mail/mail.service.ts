import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const PURPOSE_TEXT: Record<string, string> = {
  CHANGE_ID: 'xác minh email của bạn',
  CHANGE_PASSWORD: 'đổi mật khẩu',
  RESET: 'đặt lại mật khẩu',
  VERIFY: 'xác minh tài khoản',
  TWO_FA: 'đăng nhập hai bước',
};

/** Gửi thư giao dịch qua SMTP (cấu hình SMTP_* trong .env). Không bao giờ ném lỗi: gửi hỏng thì trả false. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  /** Chỉ gửi thật khi đã cấu hình SMTP, không phải DB kiểm thử và không tắt bằng MAIL_DELIVERY=off. */
  isEnabled(): boolean {
    if (process.env.MAIL_DELIVERY === 'off') return false;
    if ((process.env.POSTGRES_DB ?? '').endsWith('_test')) return false;
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  }

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
    }
    return this.transporter;
  }

  /** Gửi mã OTP tới email; trả true nếu đã gửi thật. */
  async sendOtp(to: string, purpose: string, code: string, ttlMinutes = 5): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const action = PURPOSE_TEXT[purpose] ?? 'xác thực';
    try {
      await this.getTransporter().sendMail({
        from: `"SurplusIQ" <${process.env.SMTP_USER}>`,
        to,
        subject: `Mã xác thực SurplusIQ: ${code}`,
        text: `Mã OTP để ${action} của bạn là ${code}. Mã có hiệu lực ${ttlMinutes} phút. Không chia sẻ mã này cho bất kỳ ai.`,
        html:
          `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">` +
          `<h2 style="color:#F2762B">SurplusIQ</h2>` +
          `<p>Mã OTP để <b>${action}</b> của bạn:</p>` +
          `<p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:12px 0">${code}</p>` +
          `<p style="color:#666">Mã có hiệu lực ${ttlMinutes} phút. Không chia sẻ mã này cho bất kỳ ai. ` +
          `Nếu không phải bạn yêu cầu, hãy bỏ qua thư này.</p></div>`,
      });
      return true;
    } catch (err) {
      this.logger.error(`Gửi OTP tới ${to} thất bại: ${(err as Error).message}`);
      return false;
    }
  }
}
