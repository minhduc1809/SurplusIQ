// Nạp lại toàn bộ bộ dữ liệu kiểm thử sạch cho DB dev (Postgres local, backend dev đang chạy ở SEED_API_URL).
// Chạy:  node scripts/seed-all.mjs --reset   (xóa sạch dữ liệu rồi nạp lại từ đầu)
//        node scripts/seed-all.mjs           (chỉ bổ sung phần còn thiếu, không xóa gì)
// Thứ tự: seed:default (quản trị, quán Rincón, cấu hình nền tảng) -> seed:hanoi (50 quán Cầu Giấy)
//         -> seed-test-accounts (tài khoản kiểm thử, đơn, đánh giá, lịch sử bán và kịch bản Phòng mô phỏng).
// Mật khẩu mọi tài khoản: 123456. Chỉ chạy trên DB local; từ chối nếu là production.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const API = process.env.SEED_API_URL || 'http://localhost:4000';
const DB = process.env.POSTGRES_DB || 'surplusiq_db';
if (
  process.env.NODE_ENV === 'production' ||
  /prod/i.test(DB) ||
  !/^(localhost|127\.0\.0\.1)$/.test(process.env.DB_HOST || 'localhost')
) {
  console.error('Từ chối chạy: chỉ dùng cho DB dev trên máy local.');
  process.exit(1);
}

const reset = process.argv.includes('--reset');
const run = (label, command) => {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    cwd: fileURLToPath(new URL('..', import.meta.url)),
  });
  if (r.status !== 0) {
    console.error(`Bước "${label}" thất bại (mã ${r.status}).`);
    process.exit(r.status ?? 1);
  }
};

if (reset) {
  console.log(`=== Xóa sạch dữ liệu trong ${DB} (giữ bảng migrations) ===`);
  const db = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: +process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: DB,
  });
  await db.connect();
  const { rows } = await db.query(
    "select tablename from pg_tables where schemaname='public' and tablename not in ('migrations','spatial_ref_sys') ",
  );
  if (rows.length) {
    await db.query(
      `truncate table ${rows.map((r) => `"${r.tablename}"`).join(', ')} restart identity cascade`,
    );
  }
  await db.end();
  console.log(`Đã xóa ${rows.length} bảng dữ liệu.`);
}

run('Dữ liệu nền (quản trị, quán Rincón, cấu hình)', 'npm run seed:default');
run('50 quán khu Cầu Giấy', 'npm run seed:hanoi');

// Các bước sau gọi API nghiệp vụ nên backend dev phải đang chạy.
let ready = false;
for (let i = 0; i < 20 && !ready; i++) {
  try {
    ready = (await fetch(`${API}/platform-settings`)).ok;
  } catch {
    /* chưa lên */
  }
  if (!ready) await new Promise((r) => setTimeout(r, 3000));
}
if (!ready) {
  console.error(
    `Backend dev chưa chạy ở ${API}. Hãy khởi động backend rồi chạy lại (không dùng --reset).`,
  );
  process.exit(1);
}
run(
  'Tài khoản kiểm thử, đơn hàng, lịch sử bán, Phòng mô phỏng',
  'node scripts/seed-test-accounts.mjs',
);
run(
  'Tài khoản chủ quán kỳ cựu (1-2.5 tháng, lưu lượng cứu món cao, đối soát, khiếu nại, AI cards)',
  'node scripts/seed-veteran-stores.mjs',
);
console.log('\nHoàn tất. Đăng nhập lại trên app (phiên cũ đã mất nếu dùng --reset).');
