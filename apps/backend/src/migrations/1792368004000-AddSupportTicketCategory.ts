import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Loại yêu cầu hỗ trợ: PAYMENT, BUG, DISPUTE, OTHER (R2-106). */
export class AddSupportTicketCategory1792368004000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "category" varchar(20) NOT NULL DEFAULT 'OTHER'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "category"`);
  }
}
