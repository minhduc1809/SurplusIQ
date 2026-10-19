import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Add the role already declared in UserRole without changing any existing user. */
export class AddAdminUserRole1792368000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."user_role_enum" ADD VALUE IF NOT EXISTS 'ADMIN'`);
  }

  async down(): Promise<void> {
    throw new Error(
      'PostgreSQL không hỗ trợ xóa riêng giá trị enum. Giữ ADMIN để bảo toàn vai trò tài khoản đã tạo.',
    );
  }
}
