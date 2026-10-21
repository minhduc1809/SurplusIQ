import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ưu đãi do nền tảng tài trợ (voucher đổi điểm thưởng, CM-C04): không thuộc cửa hàng nào (store_id rỗng),
 * và đơn ghi lại phần nền tảng bù để cửa hàng vẫn nhận đủ giá trị đơn khi đối soát.
 */
export class AddPlatformFundedPromotions1792368011000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "promotions" ALTER COLUMN "store_id" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS "funded_by" varchar(10) NOT NULL DEFAULT 'STORE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "platform_subsidy" int NOT NULL DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "platform_subsidy"`);
    await queryRunner.query(`ALTER TABLE "promotions" DROP COLUMN IF EXISTS "funded_by"`);
    // Không khôi phục NOT NULL của store_id vì có thể đã có ưu đãi nền tảng.
  }
}
