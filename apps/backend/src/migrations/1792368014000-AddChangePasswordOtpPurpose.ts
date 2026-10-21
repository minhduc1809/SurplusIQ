import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Thêm mục đích OTP đổi mật khẩu (mã gửi về email của khách trước khi đổi). */
export class AddChangePasswordOtpPurpose1792368014000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "otp_purpose_enum" ADD VALUE IF NOT EXISTS 'CHANGE_PASSWORD'`,
    );
  }

  async down(): Promise<void> {
    // PostgreSQL không hỗ trợ xóa giá trị khỏi enum; giữ nguyên.
  }
}
