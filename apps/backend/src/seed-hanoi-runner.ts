import { AppDataSource } from './data-source';
import { seedHanoiStoresAndOffers } from './modules/seed/hanoi-demo-seed';

async function runHanoiSeed() {
  console.log('🚀 [Hanoi Seed Runner] Đang kết nối tới PostgreSQL database...');
  await AppDataSource.initialize();
  console.log(
    '✅ [Hanoi Seed Runner] Kết nối thành công! Bắt đầu nạp 50 quán ăn ẩm thực Việt quanh 122 Hoàng Quốc Việt...',
  );

  try {
    const result = await seedHanoiStoresAndOffers(AppDataSource);
    console.log('🎉 [Hanoi Seed Runner] Nạp dữ liệu hoàn tất thành công:', result);
  } finally {
    await AppDataSource.destroy();
  }
  console.log('👋 [Hanoi Seed Runner] Đã ngắt kết nối database an toàn.');
}

runHanoiSeed().catch((err) => {
  console.error(
    '❌ [Hanoi Seed Runner] Lỗi khi nạp seed Hà Nội:',
    err instanceof Error ? err.stack || err.message : String(err),
  );
  process.exitCode = 1;
});
