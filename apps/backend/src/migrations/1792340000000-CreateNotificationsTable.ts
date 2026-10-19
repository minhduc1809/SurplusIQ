import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Restore the migration already recorded in the local database for clean installations. */
export class CreateNotificationsTable1792340000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE "notification_type_enum" AS ENUM ('ORDER', 'PICKUP_REMINDER', 'PROMOTION', 'COMPLAINT', 'REVIEW', 'SUBSCRIPTION', 'PRICE_PROPOSAL', 'SYSTEM');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "user_id" uuid, "store_id" uuid,
      "type" "notification_type_enum" NOT NULL DEFAULT 'SYSTEM',
      "title" varchar(255) NOT NULL, "body" text NOT NULL, "data" jsonb,
      "is_read" boolean NOT NULL DEFAULT false, "read_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_user" ON "notifications" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_store" ON "notifications" ("store_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_unread" ON "notifications" ("is_read")`,
    );
  }

  async down(): Promise<void> {
    throw new Error('Không tự xóa thông báo người dùng khi rollback migration bổ sung schema.');
  }
}
