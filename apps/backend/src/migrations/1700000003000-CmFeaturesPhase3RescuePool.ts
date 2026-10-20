import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 của BBRD bổ sung: Rescue Pool (CM-B02 phía cửa hàng / CM-C02 phía khách).
 * Đăng ký nhu cầu KHÔNG phải đơn hàng: bảng đăng ký không có liên kết tồn kho/thanh toán,
 * chỉ `linked_order_id` được gắn khi khách chủ động xác nhận đề nghị và đơn tạo qua luồng hiện tại.
 */
export class CmFeaturesPhase3RescuePool1700000003000 implements MigrationInterface {
  name = 'CmFeaturesPhase3RescuePool1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rescue_pools" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
        "pool_title" varchar(150) NOT NULL,
        "target_category" varchar(100) NOT NULL,
        "target_item_id" uuid REFERENCES "items"("id") ON DELETE SET NULL,
        "service_area" varchar(150) NOT NULL,
        "registration_open_at" timestamptz NOT NULL,
        "registration_close_at" timestamptz NOT NULL,
        "confirm_deadline_at" timestamptz NOT NULL,
        "minimum_demand" int NOT NULL,
        "maximum_supply" int NOT NULL,
        "target_budget_min" int,
        "target_budget_max" int,
        "pickup_window_start" timestamptz NOT NULL,
        "pickup_window_end" timestamptz NOT NULL,
        "end_condition" varchar(255) NOT NULL,
        "linked_offer_id" uuid REFERENCES "offers"("id") ON DELETE SET NULL,
        "offered_quantity" int,
        "proposed_price" int,
        "offer_pickup_start" timestamptz,
        "offer_pickup_end" timestamptz,
        "offer_version" int NOT NULL DEFAULT 0,
        "offer_expiry_at" timestamptz,
        "pool_status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "registration_count" int NOT NULL DEFAULT 0,
        "confirmed_order_count" int NOT NULL DEFAULT 0,
        "cancellation_reason" text,
        "created_by" uuid NOT NULL,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_rescue_pools_registration_window" CHECK ("registration_open_at" < "registration_close_at"),
        CONSTRAINT "CHK_rescue_pools_pickup_window" CHECK ("pickup_window_start" < "pickup_window_end"),
        CONSTRAINT "CHK_rescue_pools_thresholds" CHECK ("minimum_demand" > 0 AND "maximum_supply" >= "minimum_demand"),
        CONSTRAINT "CHK_rescue_pools_budget" CHECK ("target_budget_min" IS NULL OR "target_budget_max" IS NULL OR "target_budget_min" <= "target_budget_max"),
        CONSTRAINT "CHK_rescue_pools_offered_qty" CHECK ("offered_quantity" IS NULL OR ("offered_quantity" > 0 AND "offered_quantity" <= "maximum_supply")),
        CONSTRAINT "CHK_rescue_pools_counts_nonneg" CHECK ("registration_count" >= 0 AND "confirmed_order_count" >= 0)
      );
      CREATE INDEX IF NOT EXISTS "IDX_rescue_pools_store_status" ON "rescue_pools" ("store_id", "pool_status");
      CREATE INDEX IF NOT EXISTS "IDX_rescue_pools_status_close" ON "rescue_pools" ("pool_status", "registration_close_at");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rescue_pool_registrations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "pool_id" uuid NOT NULL REFERENCES "rescue_pools"("id") ON DELETE CASCADE,
        "customer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "selected_category" varchar(100) NOT NULL,
        "selected_item_id" uuid,
        "requested_quantity" int NOT NULL,
        "budget_min" int,
        "budget_max" int,
        "preferred_pickup_start" timestamptz,
        "preferred_pickup_end" timestamptz,
        "registration_status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "registered_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "offer_version_acknowledged" int,
        "linked_order_id" uuid UNIQUE REFERENCES "orders"("id") ON DELETE SET NULL,
        "withdrawn_at" timestamptz,
        "withdrawal_reason" text,
        CONSTRAINT "CHK_rescue_pool_reg_quantity" CHECK ("requested_quantity" BETWEEN 1 AND 5),
        CONSTRAINT "CHK_rescue_pool_reg_budget" CHECK ("budget_min" IS NULL OR "budget_max" IS NULL OR "budget_min" <= "budget_max")
      );
      CREATE INDEX IF NOT EXISTS "IDX_rescue_pool_reg_pool_status" ON "rescue_pool_registrations" ("pool_id", "registration_status");
      CREATE INDEX IF NOT EXISTS "IDX_rescue_pool_reg_customer" ON "rescue_pool_registrations" ("customer_id");
      -- BR-B02-02 / BR-C02-07: tối đa một đăng ký hiệu lực cho cùng lựa chọn trong một đợt (đã rút thì được đăng ký lại)
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rescue_pool_reg_active_choice"
        ON "rescue_pool_registrations" (
          "pool_id", "customer_id", "selected_category",
          COALESCE("selected_item_id", '00000000-0000-0000-0000-000000000000'::uuid)
        )
        WHERE "registration_status" <> 'WITHDRAWN';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rescue_pool_registrations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rescue_pools";`);
  }
}
