import type { MigrationInterface, QueryRunner } from 'typeorm';
import { normalizeFoodCategory } from '../modules/catalog/food-category';

/** Đưa items.category (lẫn "Meals", "Groceries", tên tự nhập...) về 10 mã nhóm món chuẩn. */
export class NormalizeItemCategories1792368013000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: string; name: string; category: string | null }> =
      await queryRunner.query(`SELECT id, name, category FROM items`);
    for (const r of rows) {
      const code = normalizeFoodCategory(r.category, r.name);
      if (code !== r.category) {
        await queryRunner.query(`UPDATE items SET category = $1 WHERE id = $2`, [code, r.id]);
      }
    }
  }

  async down(): Promise<void> {
    // Không khôi phục được giá trị cũ (đã gộp nhiều tên về một mã).
  }
}
