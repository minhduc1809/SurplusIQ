import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Ảnh đính kèm tin nhắn hỗ trợ: mảng địa chỉ ảnh, tối đa 3 (R2-106). */
export class AddSupportMessageAttachments1792368006000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "support_messages" ADD COLUMN IF NOT EXISTS "attachment_urls" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "support_messages" DROP COLUMN IF EXISTS "attachment_urls"`,
    );
  }
}
