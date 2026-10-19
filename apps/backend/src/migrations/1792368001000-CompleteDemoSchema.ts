import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Bring missing schema objects in line with the existing customer entities. */
export class CompleteDemoSchema1792368001000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customer_profiles" ADD COLUMN IF NOT EXISTS "notification_preferences" jsonb`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorite_stores" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "store_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_favorite_stores_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_favorite_stores_user_store" UNIQUE ("user_id", "store_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_favorite_stores_user" ON "favorite_stores" ("user_id")`,
    );
  }

  async down(): Promise<void> {
    throw new Error(
      'Không tự xóa bảng/cột có dữ liệu khách hàng khi rollback migration bổ sung schema.',
    );
  }
}
