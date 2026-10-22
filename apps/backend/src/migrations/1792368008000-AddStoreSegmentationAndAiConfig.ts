import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Lưu ngưỡng phân nhóm khách (R2-087) và cấu hình AI (R2-122) theo từng cửa hàng. */
export class AddStoreSegmentationAndAiConfig1792368008000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "store_settings" ADD COLUMN IF NOT EXISTS "segmentation_config" jsonb, ADD COLUMN IF NOT EXISTS "ai_config" jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "store_settings" DROP COLUMN IF EXISTS "segmentation_config", DROP COLUMN IF EXISTS "ai_config"`,
    );
  }
}
