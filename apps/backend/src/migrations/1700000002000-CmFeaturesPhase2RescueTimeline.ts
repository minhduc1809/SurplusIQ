import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 của BBRD bổ sung (CM-*): Rescue Timeline (CM-B01).
 * Lớp điều phối trên dữ liệu offers/items/orders có sẵn - chỉ lưu snapshot mức nguy cơ đã tính
 * cho mỗi lô (lot = offer) cùng hành động/kết quả gần nhất. Lịch sử đầy đủ nằm ở audit_logs.
 */
export class CmFeaturesPhase2RescueTimeline1700000002000 implements MigrationInterface {
  name = 'CmFeaturesPhase2RescueTimeline1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rescue_risk_snapshots" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "lot_id" uuid NOT NULL REFERENCES "offers" ("id") ON DELETE CASCADE,
        "store_id" uuid NOT NULL,
        "item_id" uuid,
        "quantity_available" int NOT NULL,
        "pickup_end_at" timestamptz NOT NULL,
        "expiry_at" timestamptz,
        "lot_status" varchar(20) NOT NULL DEFAULT 'ACTIVE',
        "risk_level" varchar(10),
        "risk_factors" jsonb NOT NULL DEFAULT '[]',
        "data_quality_status" varchar(20) NOT NULL,
        "recommended_actions" jsonb NOT NULL DEFAULT '[]',
        "calculated_at" timestamptz NOT NULL,
        "action_taken" varchar(30),
        "outcome" varchar(30),
        "action_taken_by" uuid,
        "action_taken_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_rescue_risk_level" CHECK ("risk_level" IS NULL OR "risk_level" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        CONSTRAINT "CHK_rescue_data_quality" CHECK ("data_quality_status" IN ('OK', 'STALE', 'INSUFFICIENT')),
        -- BR-B01-02: không có mức nguy cơ chắc chắn khi chưa đủ dữ liệu
        CONSTRAINT "CHK_rescue_insufficient_no_level" CHECK ("data_quality_status" <> 'INSUFFICIENT' OR "risk_level" IS NULL)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_rescue_risk_snapshots_lot_id" ON "rescue_risk_snapshots" ("lot_id");
      CREATE INDEX IF NOT EXISTS "IDX_rescue_risk_snapshots_store_status" ON "rescue_risk_snapshots" ("store_id", "lot_status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rescue_risk_snapshots";`);
  }
}
