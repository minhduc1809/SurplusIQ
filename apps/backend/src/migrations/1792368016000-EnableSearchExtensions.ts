import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Bật tìm kiếm không dấu (unaccent) và gần đúng (pg_trgm) cho ô tìm món và cửa hàng. */
export class EnableSearchExtensions1792368016000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  }

  async down(): Promise<void> {
    // Giữ nguyên extension vì nơi khác có thể đã dùng.
  }
}
