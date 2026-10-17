import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPostgisSchema1700000000000 implements MigrationInterface {
  name = 'InitialPostgisSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "citext";`);

    // 2. Custom Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_role_enum" AS ENUM('CUSTOMER', 'STORE_USER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "user_status_enum" AS ENUM('PENDING_VERIFY', 'ACTIVE', 'PENDING_DELETE', 'ANONYMIZED', 'LOCKED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "consent_type_enum" AS ENUM('TERMS', 'LOCATION', 'PROMOTION', 'PERSONALIZATION', 'AI_MEMORY');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "otp_purpose_enum" AS ENUM('VERIFY', 'RESET', 'TWO_FA', 'CHANGE_ID');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "store_status_enum" AS ENUM('PENDING_VERIFY', 'ACTIVE', 'SUSPENDED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "pricing_mode_enum" AS ENUM('MANUAL', 'AUTO');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "store_permission_enum" AS ENUM('OWNER', 'MANAGER', 'COUNTER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "store_member_status_enum" AS ENUM('INVITED', 'ACTIVE', 'LOCKED', 'REMOVED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "store_closure_type_enum" AS ENUM('CLOSED', 'SPECIAL_HOURS');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "customer_segment_enum" AS ENUM('NEW', 'LOYAL', 'AT_RISK', 'FREQUENT_NOSHOW');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "subscription_plan_enum" AS ENUM('BASIC', 'TRIAL', 'PRO');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "subscription_status_enum" AS ENUM('ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "invoice_status_enum" AS ENUM('PAID', 'PENDING', 'FAILED', 'REFUNDED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "item_status_enum" AS ENUM('ACTIVE', 'ARCHIVED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "offer_kind_enum" AS ENUM('REGULAR', 'SURPRISE_BAG');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "offer_status_enum" AS ENUM('DRAFT', 'OPEN', 'SOLD_OUT', 'CLOSED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "offer_event_type_enum" AS ENUM('CREATED', 'OPENED', 'EDITED', 'STOCK_ADJUSTED', 'PRICE_CHANGED', 'CLOSED', 'CANCELLED', 'AUTO_CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "order_status_enum" AS ENUM('PENDING_PAYMENT', 'PAID', 'PICKED_UP', 'HOLD_EXPIRED', 'PICKUP_EXPIRED', 'CANCELLED', 'REFUNDED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "cancelled_by_enum" AS ENUM('CUSTOMER', 'STORE', 'SYSTEM');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "payment_kind_enum" AS ENUM('ORDER_PAYMENT', 'ORDER_REFUND', 'SUBSCRIPTION_PAYMENT', 'SUBSCRIPTION_REFUND');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "payment_method_enum" AS ENUM('VIETQR', 'SIMULATED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "payment_status_enum" AS ENUM('PENDING_CONFIRM', 'SUCCEEDED', 'FAILED', 'MANUAL_REVIEW');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "pickup_token_status_enum" AS ENUM('UNUSED', 'USED', 'REVOKED', 'EXPIRED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "proxy_pickup_code_status_enum" AS ENUM('UNUSED', 'USED', 'REVOKED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "complaint_status_enum" AS ENUM('PENDING_STORE', 'ACCEPTED', 'REJECTED', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "review_status_enum" AS ENUM('VISIBLE', 'HIDDEN', 'REPORTED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "violation_status_enum" AS ENUM('PENDING', 'REVIEWED', 'DISMISSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "ticket_status_enum" AS ENUM('OPEN', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "forecast_confidence_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "forecast_method_enum" AS ENUM('DOW_AVG', 'YESTERDAY_FALLBACK');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "proposal_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'AUTO_APPLIED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "statement_status_enum" AS ENUM('DRAFT', 'LOCKED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "promotion_type_enum" AS ENUM('PERCENT', 'FIXED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "promotion_target_enum" AS ENUM('ALL', 'FAVORITES', 'LOYAL', 'AT_RISK');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "promotion_status_enum" AS ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "campaign_status_enum" AS ENUM('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "anomaly_status_enum" AS ENUM('OPEN', 'RESOLVED', 'DISMISSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "action_card_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "result_evaluation_enum" AS ENUM('POSITIVE', 'INCONCLUSIVE', 'NEGATIVE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "ai_role_enum" AS ENUM('CUSTOMER', 'STORE');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "ai_conversation_status_enum" AS ENUM('ACTIVE', 'CLOSED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "ai_sender_enum" AS ENUM('USER', 'ASSISTANT');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE "ai_rating_enum" AS ENUM('HELPFUL', 'UNHELPFUL');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // 3. Section 2.1 — Danh tính & Phiên
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "email" citext UNIQUE,
        "phone" varchar(20) UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "status" "user_status_enum" NOT NULL DEFAULT 'PENDING_VERIFY',
        "failed_login_count" int NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "two_factor_enabled" boolean NOT NULL DEFAULT false,
        "delete_requested_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_users_email_or_phone" CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_profiles" (
        "user_id" uuid PRIMARY KEY,
        "full_name" varchar(100),
        "avatar_url" varchar(500),
        "search_radius_km" numeric(5,2) NOT NULL DEFAULT 5.0,
        "last_lat" numeric(9,6),
        "last_lng" numeric(9,6),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dietary_profiles" (
        "user_id" uuid PRIMARY KEY,
        "allergens" text[] NOT NULL DEFAULT '{}',
        "excluded_items" text[] NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consents" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" "consent_type_enum" NOT NULL,
        "version" varchar(20) NOT NULL,
        "granted" boolean NOT NULL,
        "granted_at" timestamptz NOT NULL DEFAULT now(),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_consents_user_id" ON "consents" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "device_id" varchar(100) NOT NULL,
        "device_name" varchar(150),
        "ip" varchar(45),
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "last_used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_revoked" ON "refresh_tokens" ("user_id", "revoked_at");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otp_codes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "target" varchar(100) NOT NULL,
        "device_id" varchar(100),
        "purpose" "otp_purpose_enum" NOT NULL,
        "code_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "wrong_count" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_otp_codes_target_purpose" ON "otp_codes" ("target", "purpose");
      CREATE INDEX IF NOT EXISTS "IDX_otp_codes_device_purpose" ON "otp_codes" ("device_id", "purpose", "created_at");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trusted_devices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "device_id" varchar(100) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_trusted_devices_user_id" ON "trusted_devices" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_places" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "label" varchar(30) NOT NULL,
        "location" geometry(Point, 4326),
        "radius_km" numeric(5,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_saved_places_user_id" ON "saved_places" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_saved_places_location" ON "saved_places" USING GIST ("location");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_filters" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" varchar(30) NOT NULL,
        "criteria" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_saved_filters_user_id" ON "saved_filters" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "deal_alerts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "criteria" jsonb NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "triggered_count" int NOT NULL DEFAULT 0,
        "last_triggered_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_deal_alerts_user_id" ON "deal_alerts" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_deals" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "offer_id" uuid NOT NULL,
        "saved_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_saved_deals_user_id" ON "saved_deals" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "view_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "offer_id" uuid NOT NULL,
        "viewed_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_view_history_user_id" ON "view_history" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fcm_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "device_id" varchar(100) NOT NULL,
        "token" varchar(255) NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_fcm_tokens_user_id" ON "fcm_tokens" ("user_id");
    `);

    // 4. Section 2.2 — Cửa hàng, Nhân sự, Gói
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_user_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "address" varchar(255) NOT NULL,
        "location" geometry(Point, 4326),
        "phone" varchar(20) NOT NULL,
        "logo_url" varchar(500),
        "open_hours" jsonb,
        "status" "store_status_enum" NOT NULL DEFAULT 'PENDING_VERIFY',
        "trial_used" boolean NOT NULL DEFAULT false,
        "is_demo" boolean NOT NULL DEFAULT false,
        "rating_avg" numeric(3,2) NOT NULL DEFAULT 0.0,
        "rating_count" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_stores_owner_user_id" ON "stores" ("owner_user_id");
      CREATE INDEX IF NOT EXISTS "IDX_stores_location" ON "stores" USING GIST ("location");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_settings" (
        "store_id" uuid PRIMARY KEY,
        "default_pickup_start" time NOT NULL DEFAULT '19:00:00',
        "default_pickup_end" time NOT NULL DEFAULT '21:00:00',
        "floor_ratio" numeric(3,2) NOT NULL DEFAULT 0.40,
        "cost_price_ratio" numeric(3,2),
        "pricing_mode" "pricing_mode_enum" NOT NULL DEFAULT 'MANUAL',
        "late_grace_minutes" int NOT NULL DEFAULT 15,
        "max_qty_per_order" int NOT NULL DEFAULT 5,
        "fixed_discount_schedule" jsonb,
        "task_reminders" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_settings_history" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "actor_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "old_value" text,
        "new_value" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_store_settings_history_store_id" ON "store_settings_history" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid,
        "actor_id" uuid NOT NULL,
        "actor_role" varchar(50) NOT NULL,
        "action" varchar(100) NOT NULL,
        "target_type" varchar(50) NOT NULL,
        "target_id" varchar(255),
        "old_value" jsonb,
        "new_value" jsonb,
        "ip" varchar(45),
        "user_agent" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_store_id_created_at" ON "audit_logs" ("store_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "user_id" uuid UNIQUE NOT NULL,
        "permission" "store_permission_enum" NOT NULL DEFAULT 'COUNTER',
        "status" "store_member_status_enum" NOT NULL DEFAULT 'INVITED',
        "last_active_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_store_members_store_id" ON "store_members" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_invites" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "email" varchar(255) NOT NULL,
        "permission" "store_permission_enum" NOT NULL DEFAULT 'COUNTER',
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_staff_invites_store_id" ON "staff_invites" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_staff_invites_token_hash" ON "staff_invites" ("token_hash");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "store_closures" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "date" date NOT NULL,
        "type" "store_closure_type_enum" NOT NULL DEFAULT 'CLOSED',
        "open_hours" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_store_closures_store_date" UNIQUE ("store_id", "date")
      );
      CREATE INDEX IF NOT EXISTS "IDX_store_closures_store_id" ON "store_closures" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_segments" (
        "store_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "segment" "customer_segment_enum" NOT NULL DEFAULT 'NEW',
        "computed_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("store_id", "customer_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_customer_segments_segment" ON "customer_segments" ("segment");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customer_notes" (
        "store_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "note" varchar(200) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("store_id", "customer_id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "store_id" uuid PRIMARY KEY,
        "plan" "subscription_plan_enum" NOT NULL DEFAULT 'BASIC',
        "period_start" timestamptz NOT NULL,
        "period_end" timestamptz NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "downgrade_at_period_end" boolean NOT NULL DEFAULT false,
        "trial_used" boolean NOT NULL DEFAULT false,
        "status" "subscription_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_invoices" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "period_start" timestamptz NOT NULL,
        "period_end" timestamptz NOT NULL,
        "amount" int NOT NULL,
        "payment_txn_id" varchar(100),
        "status" "invoice_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_subscription_invoices_store_id" ON "subscription_invoices" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_subscription_invoices_payment_txn" ON "subscription_invoices" ("payment_txn_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "plan_quotas" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "plan" "subscription_plan_enum" NOT NULL,
        "quota_key" varchar(100) NOT NULL,
        "quota_value" int NOT NULL,
        "period" varchar(50) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_plan_quotas_plan_key" UNIQUE ("plan", "quota_key")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "usage_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid,
        "user_id" uuid,
        "quota_key" varchar(100) NOT NULL,
        "units" int NOT NULL DEFAULT 1,
        "ref_id" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_usage_logs_store_quota_created" ON "usage_logs" ("store_id", "quota_key", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_usage_logs_user_id" ON "usage_logs" ("user_id");
    `);

    // 5. Section 2.3 — Danh mục & Suất
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "category" varchar(100) NOT NULL,
        "original_price" int NOT NULL,
        "cost_price" int,
        "standard_shelf_life_hours" int NOT NULL,
        "ingredients" text,
        "allergens" text[] NOT NULL DEFAULT '{}',
        "weight_grams" int,
        "image_url" varchar(500),
        "description" text,
        "nutrition_estimate" jsonb,
        "status" "item_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_items_store_id" ON "items" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "offers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "item_id" uuid,
        "kind" "offer_kind_enum" NOT NULL DEFAULT 'REGULAR',
        "total_quantity" int NOT NULL,
        "remaining_quantity" int NOT NULL,
        "sold_quantity" int NOT NULL DEFAULT 0,
        "original_price" int NOT NULL,
        "current_price" int NOT NULL,
        "floor_price" int NOT NULL,
        "pickup_start" timestamptz NOT NULL,
        "pickup_end" timestamptz NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "status" "offer_status_enum" NOT NULL DEFAULT 'DRAFT',
        "price_change_count" smallint NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_offers_remaining_qty" CHECK ("remaining_quantity" >= 0),
        CONSTRAINT "chk_offers_price_bounds" CHECK ("floor_price" <= "current_price" AND "current_price" <= "original_price"),
        CONSTRAINT "chk_offers_price_changes" CHECK ("price_change_count" <= 3)
      );
      CREATE INDEX IF NOT EXISTS "IDX_offers_status_pickup_end" ON "offers" ("status", "pickup_end");
      CREATE INDEX IF NOT EXISTS "IDX_offers_store_pickup_start" ON "offers" ("store_id", "pickup_start");
      CREATE INDEX IF NOT EXISTS "IDX_offers_item_id" ON "offers" ("item_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "offer_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "offer_id" uuid NOT NULL,
        "actor_id" uuid,
        "type" "offer_event_type_enum" NOT NULL,
        "payload" jsonb,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_offer_events_offer_id" ON "offer_events" ("offer_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "surprise_bag_items" (
        "offer_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "quantity" int NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("offer_id", "item_id")
      );
    `);

    // 6. Section 2.4 — Đơn, Thanh toán, Nhận hàng
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" varchar(12) UNIQUE NOT NULL,
        "customer_id" uuid NOT NULL,
        "store_id" uuid NOT NULL,
        "offer_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "unit_price" int NOT NULL,
        "promotion_id" uuid,
        "discount_amount" int NOT NULL DEFAULT 0,
        "total_amount" int NOT NULL,
        "status" "order_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT',
        "hold_expires_at" timestamptz NOT NULL,
        "pickup_slot" timestamptz,
        "note" varchar(200),
        "arriving_notified_at" timestamptz,
        "paid_at" timestamptz,
        "picked_up_at" timestamptz,
        "picked_up_by" varchar(100),
        "cancelled_at" timestamptz,
        "cancel_reason" text,
        "cancelled_by" "cancelled_by_enum",
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_orders_quantity_range" CHECK ("quantity" >= 1 AND "quantity" <= 5)
      );
      CREATE INDEX IF NOT EXISTS "IDX_orders_status_hold_expires" ON "orders" ("status", "hold_expires_at");
      CREATE INDEX IF NOT EXISTS "IDX_orders_status_offer_id" ON "orders" ("status", "offer_id");
      CREATE INDEX IF NOT EXISTS "IDX_orders_store_created" ON "orders" ("store_id", "created_at");
      CREATE INDEX IF NOT EXISTS "IDX_orders_customer_id" ON "orders" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "idempotency_keys" (
        "scope" varchar(50) NOT NULL,
        "user_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "request_hash" varchar(64) NOT NULL,
        "response" jsonb NOT NULL,
        "status_code" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("scope", "user_id", "key")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid,
        "store_id" uuid,
        "kind" "payment_kind_enum" NOT NULL,
        "amount" int NOT NULL,
        "method" "payment_method_enum" NOT NULL DEFAULT 'VIETQR',
        "gateway_txn_id" varchar(100) UNIQUE NOT NULL,
        "parent_txn_id" varchar(100),
        "status" "payment_status_enum" NOT NULL DEFAULT 'PENDING_CONFIRM',
        "retry_count" int NOT NULL DEFAULT 0,
        "last_checked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_order_id" ON "payment_transactions" ("order_id");
      CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_store_id" ON "payment_transactions" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_payment_transactions_parent_txn" ON "payment_transactions" ("parent_txn_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pickup_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "backup_code" varchar(6) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "status" "pickup_token_status_enum" NOT NULL DEFAULT 'UNUSED',
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_pickup_tokens_order_id" ON "pickup_tokens" ("order_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "proxy_pickup_codes" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "code" varchar(8) NOT NULL,
        "status" "proxy_pickup_code_status_enum" NOT NULL DEFAULT 'UNUSED',
        "expires_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_proxy_pickup_codes_order_id" ON "proxy_pickup_codes" ("order_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "noshow_records" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customer_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "occurred_at" timestamptz NOT NULL,
        "excluded" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_noshow_records_customer_id" ON "noshow_records" ("customer_id");
      CREATE INDEX IF NOT EXISTS "IDX_noshow_records_order_id" ON "noshow_records" ("order_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_locks" (
        "customer_id" uuid PRIMARY KEY,
        "locked_until" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // 7. Section 2.5 — Hậu mãi
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "complaints" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "store_id" uuid NOT NULL,
        "category" varchar(50) NOT NULL,
        "description" text NOT NULL,
        "status" "complaint_status_enum" NOT NULL DEFAULT 'PENDING_STORE',
        "response_due_at" timestamptz NOT NULL,
        "extended" boolean NOT NULL DEFAULT false,
        "refund_amount" int NOT NULL DEFAULT 0,
        "reject_reason" text,
        "auto_accepted" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_complaints_order_id" ON "complaints" ("order_id");
      CREATE INDEX IF NOT EXISTS "IDX_complaints_customer_id" ON "complaints" ("customer_id");
      CREATE INDEX IF NOT EXISTS "IDX_complaints_store_id" ON "complaints" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "complaint_attachments" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "complaint_id" uuid NOT NULL,
        "url" varchar(500) NOT NULL,
        "added_round" smallint NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_complaint_attachments_complaint_id" ON "complaint_attachments" ("complaint_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "order_id" uuid UNIQUE NOT NULL,
        "customer_id" uuid NOT NULL,
        "store_id" uuid NOT NULL,
        "rating" smallint NOT NULL,
        "comment" text,
        "status" "review_status_enum" NOT NULL DEFAULT 'VISIBLE',
        "store_reply" text,
        "store_reply_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_reviews_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
      );
      CREATE INDEX IF NOT EXISTS "IDX_reviews_customer_id" ON "reviews" ("customer_id");
      CREATE INDEX IF NOT EXISTS "IDX_reviews_store_id" ON "reviews" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "violation_reports" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reporter_id" uuid NOT NULL,
        "target_type" varchar(50) NOT NULL,
        "target_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "status" "violation_status_enum" NOT NULL DEFAULT 'PENDING',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_violation_reports_reporter_target" UNIQUE ("reporter_id", "target_type", "target_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_violation_reports_reporter_id" ON "violation_reports" ("reporter_id");
      CREATE INDEX IF NOT EXISTS "IDX_violation_reports_target_id" ON "violation_reports" ("target_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "subject" varchar(150) NOT NULL,
        "status" "ticket_status_enum" NOT NULL DEFAULT 'OPEN',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_support_tickets_user_id" ON "support_tickets" ("user_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "ticket_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "message" text NOT NULL,
        "is_internal" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_support_messages_ticket_id" ON "support_messages" ("ticket_id");
      CREATE INDEX IF NOT EXISTS "IDX_support_messages_sender_id" ON "support_messages" ("sender_id");
    `);

    // 8. Section 2.6 — Dự báo, Giá, Đối soát
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_actuals" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "date" date NOT NULL,
        "produced" int NOT NULL,
        "sold_offline" int NOT NULL,
        "sold_app" int NOT NULL,
        "stockout_at" timestamptz,
        "locked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_daily_actuals_store_item_date" UNIQUE ("store_id", "item_id", "date")
      );
      CREATE INDEX IF NOT EXISTS "IDX_daily_actuals_store_id" ON "daily_actuals" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_daily_actuals_item_id" ON "daily_actuals" ("item_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "special_events" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "date" date NOT NULL,
        "type" varchar(100) NOT NULL,
        "impact_factor" numeric(3,2) NOT NULL DEFAULT 1.0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_special_events_store_date_type" UNIQUE ("store_id", "date", "type")
      );
      CREATE INDEX IF NOT EXISTS "IDX_special_events_store_id" ON "special_events" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "forecasts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "item_id" uuid NOT NULL,
        "target_date" date NOT NULL,
        "recommended" int NOT NULL,
        "low" int NOT NULL,
        "high" int NOT NULL,
        "confidence" "forecast_confidence_enum" NOT NULL DEFAULT 'MEDIUM',
        "method" "forecast_method_enum" NOT NULL DEFAULT 'DOW_AVG',
        "components" jsonb NOT NULL,
        "chosen_quantity" int,
        "override_reason" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_forecasts_store_item_date" UNIQUE ("store_id", "item_id", "target_date")
      );
      CREATE INDEX IF NOT EXISTS "IDX_forecasts_store_id" ON "forecasts" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_forecasts_item_id" ON "forecasts" ("item_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "price_proposals" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "offer_id" uuid NOT NULL,
        "old_price" int NOT NULL,
        "proposed_price" int NOT NULL,
        "components" jsonb NOT NULL,
        "status" "proposal_status_enum" NOT NULL DEFAULT 'PENDING',
        "expires_at" timestamptz NOT NULL,
        "decided_by" uuid,
        "decided_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_price_proposals_offer_id" ON "price_proposals" ("offer_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "weekly_statements" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "week_start" date NOT NULL,
        "week_end" date NOT NULL,
        "gross" int NOT NULL,
        "commission" int NOT NULL,
        "refunds" int NOT NULL,
        "subscription_fee" int NOT NULL,
        "adjustments" int NOT NULL DEFAULT 0,
        "net_payable" int NOT NULL,
        "status" "statement_status_enum" NOT NULL DEFAULT 'DRAFT',
        "checksum" varchar(64),
        "flags" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_weekly_statements_store_week" UNIQUE ("store_id", "week_start")
      );
      CREATE INDEX IF NOT EXISTS "IDX_weekly_statements_store_id" ON "weekly_statements" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "statement_lines" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "statement_id" uuid NOT NULL,
        "order_id" uuid,
        "type" varchar(50) NOT NULL,
        "amount" int NOT NULL,
        "commission" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_statement_lines_statement_id" ON "statement_lines" ("statement_id");
      CREATE INDEX IF NOT EXISTS "IDX_statement_lines_order_id" ON "statement_lines" ("order_id");
    `);

    // 9. Section 2.7 — Tăng trưởng, Phát hiện bất thường, Trợ lý AI
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promotions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "name" varchar(150) NOT NULL,
        "type" "promotion_type_enum" NOT NULL DEFAULT 'PERCENT',
        "value" int NOT NULL,
        "target" "promotion_target_enum" NOT NULL DEFAULT 'ALL',
        "max_uses" int NOT NULL,
        "used_count" int NOT NULL DEFAULT 0,
        "start_at" timestamptz NOT NULL,
        "end_at" timestamptz NOT NULL,
        "min_order_amount" int NOT NULL DEFAULT 0,
        "status" "promotion_status_enum" NOT NULL DEFAULT 'DRAFT',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_promotions_store_id" ON "promotions" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promotion_wallet" (
        "customer_id" uuid NOT NULL,
        "promotion_id" uuid NOT NULL,
        "claimed_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "order_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("customer_id", "promotion_id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_promotion_wallet_order_id" ON "promotion_wallet" ("order_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaigns" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "title" varchar(150) NOT NULL,
        "content" text NOT NULL,
        "target" varchar(50) NOT NULL,
        "scheduled_at" timestamptz NOT NULL,
        "status" "campaign_status_enum" NOT NULL DEFAULT 'DRAFT',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_campaigns_store_id" ON "campaigns" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "campaign_deliveries" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "campaign_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "sent_at" timestamptz NOT NULL,
        "opened_at" timestamptz,
        "clicked_at" timestamptz,
        "converted_order_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_campaign_deliveries_campaign_id" ON "campaign_deliveries" ("campaign_id");
      CREATE INDEX IF NOT EXISTS "IDX_campaign_deliveries_customer_id" ON "campaign_deliveries" ("customer_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "anomalies" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "metric" varchar(100) NOT NULL,
        "date" date NOT NULL,
        "expected_value" numeric(10,2) NOT NULL,
        "actual_value" numeric(10,2) NOT NULL,
        "mad_score" numeric(5,2) NOT NULL,
        "status" "anomaly_status_enum" NOT NULL DEFAULT 'OPEN',
        "feedback" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_anomalies_store_id" ON "anomalies" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "action_cards" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "action_type" varchar(100) NOT NULL,
        "payload" jsonb NOT NULL,
        "reason_text" text NOT NULL,
        "expected_outcome" text NOT NULL,
        "status" "action_card_status_enum" NOT NULL DEFAULT 'PENDING',
        "expires_at" timestamptz NOT NULL,
        "result_evaluation" "result_evaluation_enum",
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_action_cards_store_id" ON "action_cards" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "donation_records" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "recipient_info" jsonb NOT NULL,
        "offer_id" uuid NOT NULL,
        "quantity" int NOT NULL,
        "donated_at" timestamptz NOT NULL,
        "note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_donation_records_store_id" ON "donation_records" ("store_id");
      CREATE INDEX IF NOT EXISTS "IDX_donation_records_offer_id" ON "donation_records" ("offer_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_conversations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "store_id" uuid,
        "role" "ai_role_enum" NOT NULL,
        "title" varchar(200) NOT NULL,
        "status" "ai_conversation_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_ai_conversations_user_id" ON "ai_conversations" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_ai_conversations_store_id" ON "ai_conversations" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_messages" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL,
        "sender" "ai_sender_enum" NOT NULL,
        "content" text NOT NULL,
        "tools_called" jsonb,
        "context_tokens" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_ai_messages_conversation_id" ON "ai_messages" ("conversation_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_logs" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "store_id" uuid,
        "feature_code" varchar(100) NOT NULL,
        "model" varchar(100) NOT NULL,
        "latency_ms" int NOT NULL,
        "input_summary" text NOT NULL,
        "output_summary" text NOT NULL,
        "error_code" varchar(100),
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_ai_logs_user_id" ON "ai_logs" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_ai_logs_store_id" ON "ai_logs" ("store_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_feedback" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "log_id" uuid NOT NULL,
        "rating" "ai_rating_enum" NOT NULL,
        "reason" varchar(100),
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_ai_feedback_log_id" ON "ai_feedback" ("log_id");
    `);

    // 10. Platform Settings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_settings" (
        "key" varchar(100) PRIMARY KEY,
        "value" text NOT NULL,
        "description" text,
        "data_type" varchar(50) NOT NULL DEFAULT 'STRING',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_settings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_feedback" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_messages" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_conversations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "donation_records" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "action_cards" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "anomalies" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaign_deliveries" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campaigns" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_wallet" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "statement_lines" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "weekly_statements" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "price_proposals" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "forecasts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "special_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_actuals" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_messages" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "violation_reports" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaint_attachments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "complaints" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_locks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "noshow_records" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "proxy_pickup_codes" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pickup_tokens" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_transactions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "surprise_bag_items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "offer_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "offers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usage_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "plan_quotas" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscription_invoices" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_notes" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_segments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_closures" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_invites" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_members" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_settings_history" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_settings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stores" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fcm_tokens" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "view_history" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_deals" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "deal_alerts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_filters" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_places" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trusted_devices" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_codes" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "consents" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "dietary_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customer_profiles" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
  }
}
