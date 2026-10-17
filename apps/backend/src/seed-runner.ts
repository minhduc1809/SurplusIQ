import { AppDataSource } from './data-source';
import { SeedService } from './modules/seed/seed.service';

async function runSeed() {
  console.log('🚀 [Seed Runner] Đang kết nối tới PostgreSQL database...');
  await AppDataSource.initialize();
  console.log('✅ [Seed Runner] Kết nối thành công! Bắt đầu nạp seed data...');

  const seedService = new SeedService(AppDataSource);
  const result = await seedService.seedDemoData();

  console.log('🎉 [Seed Runner] Kết quả:', result);
  await AppDataSource.destroy();
  console.log('👋 [Seed Runner] Hoàn tất và ngắt kết nối database.');
}

runSeed().catch((err) => {
  console.error('❌ [Seed Runner] Lỗi nạp seed:', err);
  process.exit(1);
});
