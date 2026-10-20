import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentProofAndRefundAccount1792368003000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_proof_url" varchar(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_proof_uploaded_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "refund_bank_account" jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_proof_uploaded_at"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "payment_proof_url"`);
    await queryRunner.query(
      `ALTER TABLE "customer_profiles" DROP COLUMN IF EXISTS "refund_bank_account"`,
    );
  }
}
