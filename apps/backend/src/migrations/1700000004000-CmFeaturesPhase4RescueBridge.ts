import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 của BBRD bổ sung: Rescue Bridge (CM-B03).
 * - recipient_organizations: hồ sơ đơn vị tiếp nhận do vận hành nền tảng duyệt (BR-B03-02).
 * - rescue_bridge_transfers: đề nghị bàn giao. reserved_quantity là phần đã trừ khỏi
 *   offers.remaining_quantity (cùng khóa dòng offer với luồng giữ suất) nên không bán trùng (BR-B03-07).
 * donation_records giữ nguyên, nay là sổ ghi các lần bàn giao đã hoàn tất.
 */
export class CmFeaturesPhase4RescueBridge1700000004000 implements MigrationInterface {
  name = 'CmFeaturesPhase4RescueBridge1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recipient_organizations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(150) NOT NULL,
        "contact_name" varchar(100) NOT NULL,
        "contact_phone" varchar(20) NOT NULL,
        "accepted_food_categories" text[] NOT NULL DEFAULT '{}',
        "service_areas" text[] NOT NULL DEFAULT '{}',
        "max_quantity_per_transfer" int NOT NULL,
        "receiving_window_start" time,
        "receiving_window_end" time,
        "capacity_note" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_approved" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_recipient_orgs_capacity" CHECK ("max_quantity_per_transfer" > 0),
        CONSTRAINT "CHK_recipient_orgs_window" CHECK (("receiving_window_start" IS NULL) = ("receiving_window_end" IS NULL))
      );
      CREATE INDEX IF NOT EXISTS "IDX_recipient_orgs_eligible" ON "recipient_organizations" ("is_active", "is_approved");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rescue_bridge_transfers" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
        "recipient_org_id" uuid REFERENCES "recipient_organizations"("id") ON DELETE RESTRICT,
        "offer_id" uuid NOT NULL REFERENCES "offers"("id") ON DELETE RESTRICT,
        "food_category" varchar(100) NOT NULL,
        "quantity_proposed" int NOT NULL,
        "quantity_accepted" int,
        "quantity_handed_over" int,
        "reserved_quantity" int NOT NULL,
        "available_at" timestamptz NOT NULL,
        "handover_deadline" timestamptz NOT NULL,
        "storage_notes" text NOT NULL,
        "transport_responsibility" varchar(20) NOT NULL,
        "transfer_status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "sent_at" timestamptz,
        "agreed_pickup_at" timestamptz,
        "recipient_responsible_name" varchar(100),
        "store_responsible_name" varchar(100),
        "recipient_note" text,
        "sender_confirmed_by" uuid,
        "sender_confirmed_at" timestamptz,
        "sender_confirmed_quantity" int,
        "recipient_confirmed_by" varchar(100),
        "recipient_confirmed_at" timestamptz,
        "recipient_confirmed_quantity" int,
        "evidence_reference" text,
        "is_disputed" boolean NOT NULL DEFAULT false,
        "dispute_note" text,
        "failure_reason" text,
        "response_token_hash" varchar(64) UNIQUE,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_rb_transfers_window" CHECK ("available_at" < "handover_deadline"),
        CONSTRAINT "CHK_rb_transfers_proposed" CHECK ("quantity_proposed" > 0),
        CONSTRAINT "CHK_rb_transfers_accepted" CHECK ("quantity_accepted" IS NULL OR ("quantity_accepted" > 0 AND "quantity_accepted" <= "quantity_proposed")),
        CONSTRAINT "CHK_rb_transfers_handed_over" CHECK ("quantity_handed_over" IS NULL OR ("quantity_handed_over" >= 0 AND "quantity_handed_over" <= "quantity_accepted")),
        CONSTRAINT "CHK_rb_transfers_reserved" CHECK ("reserved_quantity" >= 0 AND "reserved_quantity" <= "quantity_proposed"),
        CONSTRAINT "CHK_rb_transfers_transport" CHECK ("transport_responsibility" IN ('RECIPIENT_PICKUP', 'STORE_DELIVERY'))
      );
      CREATE INDEX IF NOT EXISTS "IDX_rb_transfers_store_status" ON "rescue_bridge_transfers" ("store_id", "transfer_status");
      CREATE INDEX IF NOT EXISTS "IDX_rb_transfers_status_deadline" ON "rescue_bridge_transfers" ("transfer_status", "handover_deadline");
      CREATE INDEX IF NOT EXISTS "IDX_rb_transfers_recipient_org" ON "rescue_bridge_transfers" ("recipient_org_id");
      CREATE INDEX IF NOT EXISTS "IDX_rb_transfers_offer" ON "rescue_bridge_transfers" ("offer_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rescue_bridge_transfers";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recipient_organizations";`);
  }
}
