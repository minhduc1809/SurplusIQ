import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Bổ sung phương pháp MANUAL_REQUIRED do ForecastingEngine emit khi chưa đủ dữ liệu lịch sử. */
export class AddManualRequiredForecastMethod1792368002000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."forecast_method_enum" ADD VALUE IF NOT EXISTS 'MANUAL_REQUIRED'`,
    );
  }

  async down(): Promise<void> {
    throw new Error(
      'PostgreSQL không hỗ trợ xóa riêng giá trị enum. Giữ MANUAL_REQUIRED để bảo toàn lịch sử dự báo đã tạo.',
    );
  }
}
