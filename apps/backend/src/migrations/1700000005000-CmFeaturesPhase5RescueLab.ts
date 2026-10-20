import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5 của BBRD bổ sung: Rescue Lab (CM-B04) - kịch bản mô phỏng có phiên bản + đối chiếu thực tế.
 * Bất biến chính được khóa ở tầng DB (không chỉ service):
 *  - Tham số phiên bản không bao giờ đổi sau khi tạo; sửa kịch bản = phiên bản mới (BR-B04-01).
 *  - Kết quả không đổi sau Hoàn tất/Thất bại; chỉ COMPLETED mới có simulated_metrics (không lưu kết quả dở dang).
 *  - Bản ghi áp dụng và kết quả đối chiếu chỉ ghi một lần.
 * Bảng này KHÔNG có liên kết ghi sang offers/giá/tồn (BR-B04-04).
 */
export class CmFeaturesPhase5RescueLab1700000005000 implements MigrationInterface {
  name = 'CmFeaturesPhase5RescueLab1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rescue_lab_scenarios" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
        "title" varchar(150) NOT NULL,
        "objective" varchar(40) NOT NULL,
        "current_version" int NOT NULL DEFAULT 1,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_rescue_lab_objective" CHECK ("objective" IN ('REDUCE_SURPLUS', 'INCREASE_RECOVERY_REVENUE', 'INCREASE_SELLTHROUGH', 'COMPARE_STRATEGIES')),
        CONSTRAINT "CHK_rescue_lab_current_version" CHECK ("current_version" >= 1)
      );
      CREATE INDEX IF NOT EXISTS "IDX_rescue_lab_scenarios_store_updated" ON "rescue_lab_scenarios" ("store_id", "updated_at");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rescue_lab_scenario_versions" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "scenario_id" uuid NOT NULL REFERENCES "rescue_lab_scenarios"("id") ON DELETE CASCADE,
        "store_id" uuid NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
        "version_no" int NOT NULL,
        "date_range_start" date NOT NULL,
        "date_range_end" date NOT NULL,
        "item_scope" jsonb NOT NULL DEFAULT '{}',
        "assumptions" jsonb NOT NULL,
        "simulation_status" varchar(20) NOT NULL DEFAULT 'DRAFT',
        "input_snapshot" jsonb,
        "input_snapshot_hash" varchar(64),
        "engine_version" varchar(20),
        "simulated_metrics" jsonb,
        "data_quality_warnings" jsonb NOT NULL DEFAULT '[]',
        "failed_reason" text,
        "run_started_at" timestamptz,
        "run_completed_at" timestamptz,
        "applied_at" timestamptz,
        "applied_by" uuid,
        "applied_scope" jsonb,
        "observation_window_start" date,
        "observation_window_end" date,
        "actual_metrics" jsonb,
        "comparison_result" jsonb,
        "limitation_notes" text,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_rescue_lab_versions_scenario_version" UNIQUE ("scenario_id", "version_no"),
        CONSTRAINT "CHK_rescue_lab_version_no" CHECK ("version_no" >= 1),
        CONSTRAINT "CHK_rescue_lab_date_range" CHECK ("date_range_start" <= "date_range_end"),
        CONSTRAINT "CHK_rescue_lab_status" CHECK ("simulation_status" IN ('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED')),
        -- Ngoại lệ "lỗi tính toán": chỉ COMPLETED mới có kết quả, kèm dữ liệu nguồn + phiên bản lõi tính (BR-B04-01)
        CONSTRAINT "CHK_rescue_lab_completed_has_result" CHECK (
          ("simulation_status" = 'COMPLETED') = ("simulated_metrics" IS NOT NULL)
          AND ("simulation_status" <> 'COMPLETED' OR ("input_snapshot" IS NOT NULL AND "input_snapshot_hash" IS NOT NULL AND "engine_version" IS NOT NULL))
        ),
        -- Chỉ phiên bản hoàn tất mới được ghi nhận áp dụng; áp dụng phải đủ người/thời điểm/phạm vi/cửa sổ
        CONSTRAINT "CHK_rescue_lab_applied_complete" CHECK (
          "applied_at" IS NULL OR (
            "simulation_status" = 'COMPLETED' AND "applied_by" IS NOT NULL AND "applied_scope" IS NOT NULL
            AND "observation_window_start" IS NOT NULL AND "observation_window_end" IS NOT NULL
            AND "observation_window_start" <= "observation_window_end"
          )
        ),
        -- BR-B04-03: không có số liệu thực tế nếu chưa áp dụng thật
        CONSTRAINT "CHK_rescue_lab_actual_requires_applied" CHECK ("actual_metrics" IS NULL OR "applied_at" IS NOT NULL)
      );
      CREATE INDEX IF NOT EXISTS "IDX_rescue_lab_versions_scenario" ON "rescue_lab_scenario_versions" ("scenario_id");
      CREATE INDEX IF NOT EXISTS "IDX_rescue_lab_versions_store_status" ON "rescue_lab_scenario_versions" ("store_id", "simulation_status");
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "rescue_lab_versions_guard"() RETURNS trigger AS $$
      BEGIN
        IF NEW."scenario_id" IS DISTINCT FROM OLD."scenario_id"
          OR NEW."store_id" IS DISTINCT FROM OLD."store_id"
          OR NEW."version_no" IS DISTINCT FROM OLD."version_no"
          OR NEW."date_range_start" IS DISTINCT FROM OLD."date_range_start"
          OR NEW."date_range_end" IS DISTINCT FROM OLD."date_range_end"
          OR NEW."item_scope" IS DISTINCT FROM OLD."item_scope"
          OR NEW."assumptions" IS DISTINCT FROM OLD."assumptions"
          OR NEW."created_by" IS DISTINCT FROM OLD."created_by"
          OR NEW."created_at" IS DISTINCT FROM OLD."created_at" THEN
          RAISE EXCEPTION 'rescue_lab_scenario_versions: tham số phiên bản là bất biến - hãy tạo phiên bản mới (BR-B04-01)';
        END IF;
        IF OLD."simulation_status" IN ('COMPLETED', 'FAILED') AND (
          NEW."simulation_status" IS DISTINCT FROM OLD."simulation_status"
          OR NEW."simulated_metrics" IS DISTINCT FROM OLD."simulated_metrics"
          OR NEW."input_snapshot" IS DISTINCT FROM OLD."input_snapshot"
          OR NEW."input_snapshot_hash" IS DISTINCT FROM OLD."input_snapshot_hash"
          OR NEW."engine_version" IS DISTINCT FROM OLD."engine_version"
          OR NEW."data_quality_warnings" IS DISTINCT FROM OLD."data_quality_warnings"
          OR NEW."failed_reason" IS DISTINCT FROM OLD."failed_reason"
          OR NEW."run_started_at" IS DISTINCT FROM OLD."run_started_at"
          OR NEW."run_completed_at" IS DISTINCT FROM OLD."run_completed_at") THEN
          RAISE EXCEPTION 'rescue_lab_scenario_versions: kết quả của lần chạy đã kết thúc là bất biến';
        END IF;
        IF OLD."applied_at" IS NOT NULL AND (
          NEW."applied_at" IS DISTINCT FROM OLD."applied_at"
          OR NEW."applied_by" IS DISTINCT FROM OLD."applied_by"
          OR NEW."applied_scope" IS DISTINCT FROM OLD."applied_scope"
          OR NEW."observation_window_start" IS DISTINCT FROM OLD."observation_window_start"
          OR NEW."observation_window_end" IS DISTINCT FROM OLD."observation_window_end") THEN
          RAISE EXCEPTION 'rescue_lab_scenario_versions: bản ghi áp dụng thực tế là bất biến';
        END IF;
        IF OLD."comparison_result" IS NOT NULL AND (
          NEW."comparison_result" IS DISTINCT FROM OLD."comparison_result"
          OR NEW."actual_metrics" IS DISTINCT FROM OLD."actual_metrics"
          OR NEW."limitation_notes" IS DISTINCT FROM OLD."limitation_notes") THEN
          RAISE EXCEPTION 'rescue_lab_scenario_versions: kết quả đối chiếu thực tế là bất biến';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS "trg_rescue_lab_versions_guard" ON "rescue_lab_scenario_versions";
      CREATE TRIGGER "trg_rescue_lab_versions_guard"
        BEFORE UPDATE ON "rescue_lab_scenario_versions"
        FOR EACH ROW EXECUTE FUNCTION "rescue_lab_versions_guard"();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "rescue_lab_scenario_versions";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS "rescue_lab_versions_guard"();`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rescue_lab_scenarios";`);
  }
}
