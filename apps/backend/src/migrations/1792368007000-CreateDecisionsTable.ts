import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Bảng nhật ký quyết định gợi ý (dự báo, định giá, tặng thực phẩm); thiếu bảng này khiến sinh dự báo mới trả 500. */
export class CreateDecisionsTable1792368007000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "decisions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "storeId" uuid NOT NULL,
        "decisionType" varchar(50) NOT NULL,
        "inputSnapshot" jsonb NOT NULL,
        "outputRecommendation" jsonb NOT NULL,
        "rationale" text NOT NULL,
        "wasAcceptedByStore" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_decisions_id" PRIMARY KEY ("id")
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "decisions"`);
  }
}
