import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Hồ sơ kinh doanh và hợp đồng scan của cửa hàng (BRD bổ sung: đăng ký cửa hàng với hợp đồng scan). */
export class CreateStoreLegalAndContracts1792368015000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "business_type_enum" AS ENUM('INDIVIDUAL','HOUSEHOLD','COMPANY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "contract_status_enum" AS ENUM('PENDING_REVIEW','APPROVED','REJECTED','NEED_MORE_INFO')`,
    );
    await queryRunner.query(`
      CREATE TABLE "store_legal_profiles" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "legal_name" varchar(150) NOT NULL,
        "business_type" "business_type_enum" NOT NULL,
        "tax_code" varchar(20),
        "business_license_no" varchar(50),
        "representative_name" varchar(100) NOT NULL,
        "representative_phone" varchar(20) NOT NULL,
        "legal_address" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_store_legal_profiles_store" ON "store_legal_profiles" ("store_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "store_contracts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "store_id" uuid NOT NULL,
        "status" "contract_status_enum" NOT NULL DEFAULT 'PENDING_REVIEW',
        "file_path" varchar(300) NOT NULL,
        "file_name" varchar(200) NOT NULL,
        "mime_type" varchar(50) NOT NULL,
        "size_bytes" int NOT NULL,
        "uploaded_by" uuid NOT NULL,
        "review_note" text,
        "reviewed_by" uuid,
        "reviewed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_store_contracts_store" ON "store_contracts" ("store_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "store_contracts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "store_legal_profiles"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "contract_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "business_type_enum"`);
  }
}
