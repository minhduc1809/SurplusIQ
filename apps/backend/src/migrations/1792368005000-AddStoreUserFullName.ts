import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Họ tên chủ cửa hàng và nhân viên (R2-001, R2-076). */
export class AddStoreUserFullName1792368005000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "full_name" varchar(60)`);
    await queryRunner.query(
      `ALTER TABLE "staff_invites" ADD COLUMN IF NOT EXISTS "full_name" varchar(60)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "staff_invites" DROP COLUMN IF EXISTS "full_name"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "full_name"`);
  }
}
