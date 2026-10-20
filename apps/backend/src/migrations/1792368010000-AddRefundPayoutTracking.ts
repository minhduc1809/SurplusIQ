import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Theo dõi chi trả hoàn tiền: PENDING (chờ quản trị nền tảng chuyển khoản) rồi PAID kèm mã giao dịch ngân hàng.
 * Lệnh hoàn cũ (mô phỏng) để NULL, nghĩa là không cần chi trả.
 */
export class AddRefundPayoutTracking1792368010000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_transactions"
        ADD COLUMN IF NOT EXISTS "payout_status" varchar(10),
        ADD COLUMN IF NOT EXISTS "payout_reference" varchar(100),
        ADD COLUMN IF NOT EXISTS "paid_out_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "paid_out_by" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_payout_pending" ON "payment_transactions" ("payout_status") WHERE "payout_status" = 'PENDING'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_transactions_payout_pending"`);
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP COLUMN IF EXISTS "payout_status", DROP COLUMN IF EXISTS "payout_reference", DROP COLUMN IF EXISTS "paid_out_at", DROP COLUMN IF EXISTS "paid_out_by"`,
    );
  }
}
