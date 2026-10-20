import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 của BBRD bổ sung (CM-*): TrustPass (CM-B05/CM-C03) và Rescue Rewards (CM-C04).
 * Rescue Radar/Basket (CM-C05/CM-C01) không cần schema mới - tính toán thuần trên dữ liệu offer có sẵn.
 */
export class CmFeaturesPhase11700000001000 implements MigrationInterface {
  name = 'CmFeaturesPhase11700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. TrustPass: mở rộng bảng items (tái sử dụng ingredients/allergens có sẵn)
    await queryRunner.query(`
      ALTER TABLE "items"
        ADD COLUMN IF NOT EXISTS "prepared_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "expiry_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "storage_instructions" text,
        ADD COLUMN IF NOT EXISTS "information_source" varchar(20) NOT NULL DEFAULT 'STORE',
        ADD COLUMN IF NOT EXISTS "verification_status" varchar(20) NOT NULL DEFAULT 'DECLARED',
        ADD COLUMN IF NOT EXISTS "trustpass_version" int NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "trustpass_published_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "trustpass_updated_by" uuid,
        ADD COLUMN IF NOT EXISTS "review_status" varchar(20) NOT NULL DEFAULT 'NONE';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trustpass_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "item_id" uuid NOT NULL,
        "version_no" int NOT NULL,
        "changed_by" uuid NOT NULL,
        "field_name" varchar(50) NOT NULL,
        "old_value" jsonb,
        "new_value" jsonb,
        "source" varchar(20) NOT NULL DEFAULT 'STORE',
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_trustpass_history_item_id" ON "trustpass_history" ("item_id", "created_at");
    `);

    // 2. Rescue Rewards (CM-C04): ledger điểm thưởng
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reward_accounts" (
        "customer_id" uuid PRIMARY KEY,
        "points_balance" int NOT NULL DEFAULT 0,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_reward_accounts_balance_nonneg" CHECK ("points_balance" >= 0)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reward_ledger_entries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "source_order_id" uuid,
        "entry_type" varchar(20) NOT NULL,
        "points_delta" int NOT NULL,
        "rule_version" varchar(20) NOT NULL DEFAULT 'v1',
        "expiry_at" timestamptz,
        "redemption_id" varchar(100),
        "reversal_of_entry_id" uuid,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_reward_ledger_customer_id" ON "reward_ledger_entries" ("customer_id", "created_at");
      -- BR-C04-02: mỗi đơn nguồn chỉ cộng điểm (EARN) một lần
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_reward_ledger_earn_per_order"
        ON "reward_ledger_entries" ("source_order_id")
        WHERE "entry_type" = 'EARN' AND "source_order_id" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reward_ledger_entries";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reward_accounts";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trustpass_history";`);
    await queryRunner.query(`
      ALTER TABLE "items"
        DROP COLUMN IF EXISTS "prepared_at",
        DROP COLUMN IF EXISTS "expiry_at",
        DROP COLUMN IF EXISTS "storage_instructions",
        DROP COLUMN IF EXISTS "information_source",
        DROP COLUMN IF EXISTS "verification_status",
        DROP COLUMN IF EXISTS "trustpass_version",
        DROP COLUMN IF EXISTS "trustpass_published_at",
        DROP COLUMN IF EXISTS "trustpass_updated_by",
        DROP COLUMN IF EXISTS "review_status";
    `);
  }
}
