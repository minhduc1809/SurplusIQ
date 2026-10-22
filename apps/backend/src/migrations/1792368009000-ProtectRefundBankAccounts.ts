import type { MigrationInterface, QueryRunner } from 'typeorm';
import { encryptField } from '../common/crypto/field-crypto';

/**
 * Mã hóa số tài khoản hoàn tiền đang lưu rõ và thêm nơi lưu ảnh chụp tài khoản nhận hoàn trên giao dịch hoàn tiền.
 * Không hoàn tác được phần mã hóa: down chỉ gỡ cột mới, dữ liệu đã mã hóa vẫn đọc được qua ứng dụng.
 */
export class ProtectRefundBankAccounts1792368009000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD COLUMN IF NOT EXISTS "refund_destination" jsonb`,
    );
    const rows: { user_id: string; acc: Record<string, string> }[] = await queryRunner.query(
      `SELECT user_id, refund_bank_account AS acc FROM customer_profiles WHERE refund_bank_account->>'accountNumber' IS NOT NULL`,
    );
    for (const { user_id, acc } of rows) {
      const { accountNumber, ...rest } = acc;
      await queryRunner.query(
        `UPDATE customer_profiles SET refund_bank_account = $1 WHERE user_id = $2`,
        [JSON.stringify({ ...rest, accountNumberEnc: encryptField(accountNumber) }), user_id],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP COLUMN IF EXISTS "refund_destination"`,
    );
  }
}
