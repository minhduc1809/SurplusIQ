// Giữ dữ liệu test luôn "còn hạn" trong một khung giờ (mặc định chạy đến 20:00 giờ máy).
// Mỗi chu kỳ (mặc định 5 phút), chỉ trên DB dev local:
//   1. Gỡ khoá đặt hàng của khách test (job không-đến-nhận có thể khoá lại).
//   2. Kéo dài các suất đang mở của quán đang hoạt động đến (giờ kết thúc + 1 giờ).
//   3. Mở suất mới cho món chưa có suất còn hạn (tối đa 2 món/quán), giá 60% và không thấp hơn giá sàn 40%.
//   4. Bật lại backend (cổng 4000) nếu bị tắt.
// Dùng: node scripts/keep-test-data-fresh.mjs [--until 20:00] [--every 300]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: new URL('../.env', import.meta.url) });
const { Client } = require('pg');

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const [hh, mm] = arg('until', '20:00').split(':').map(Number);
const everyMs = Number(arg('every', '300')) * 1000;
const KHACH = 'kh.daydu@surplusiq.vn';

const DB = process.env.POSTGRES_DB || 'surplusiq_db';
if (
  process.env.NODE_ENV === 'production' ||
  /prod/i.test(DB) ||
  !/^(localhost|127\.0\.0\.1)$/.test(process.env.DB_HOST || 'localhost')
) {
  console.error('Từ chối chạy: chỉ dùng cho DB dev trên máy local.');
  process.exit(1);
}
const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'surplus_admin',
  password: process.env.POSTGRES_PASSWORD || 'surplus_secret_pass',
  database: DB,
});
await db.connect();

const deadline = () => {
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
};
const log = (...a) => console.log(new Date().toLocaleTimeString('vi-VN'), ...a);

async function backendUp() {
  try {
    const r = await fetch('http://localhost:4000/customer/deals', {
      signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function cycle() {
  const until = new Date(deadline().getTime() + 60 * 60 * 1000); // hết khung + 1 giờ đệm
  const unlocked = await db.query(
    `DELETE FROM order_locks WHERE customer_id = (SELECT id FROM users WHERE email = $1)`,
    [KHACH],
  );
  const extended = await db.query(
    `UPDATE offers o SET pickup_start = LEAST(o.pickup_start, now() - interval '10 minutes'),
            pickup_end = GREATEST(o.pickup_end, $1::timestamptz),
            expires_at = GREATEST(o.expires_at, $1::timestamptz), updated_at = now()
      FROM stores s
      WHERE s.id = o.store_id AND s.status = 'ACTIVE' AND o.status = 'OPEN'
        AND o.remaining_quantity > 0 AND o.pickup_end > now() AND o.pickup_end < $1::timestamptz`,
    [until],
  );
  const created = await db.query(
    `INSERT INTO offers (store_id, item_id, kind, total_quantity, remaining_quantity, sold_quantity,
        original_price, current_price, floor_price, pickup_start, pickup_end, expires_at, status, price_change_count)
     SELECT i.store_id, i.id, 'REGULAR', 8, 8, 0, i.original_price,
        GREATEST(round(i.original_price * 0.6 / 500) * 500, ceil(i.original_price * 0.4 / 500) * 500)::int,
        (ceil(i.original_price * 0.4 / 500) * 500)::int,
        now() - interval '10 minutes', $1::timestamptz, $1::timestamptz, 'OPEN', 0
       FROM (SELECT i.*, row_number() OVER (PARTITION BY i.store_id ORDER BY i.created_at) rn
               FROM items i JOIN stores s ON s.id = i.store_id
              WHERE s.status = 'ACTIVE' AND i.status = 'ACTIVE') i
      WHERE i.rn <= 2
        AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.item_id = i.id AND o.status = 'OPEN'
                          AND o.remaining_quantity > 0 AND o.pickup_end > now())`,
    [until],
  );
  const [{ n }] = (
    await db.query(
      `SELECT count(*)::int n FROM offers WHERE status = 'OPEN' AND remaining_quantity > 0 AND pickup_end > now()`,
    )
  ).rows;
  let be = await backendUp();
  if (!be) {
    const backendDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../apps/backend',
    );
    spawn('node', ['dist/main'], {
      cwd: backendDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref();
    log('Backend đang tắt -> đã bật lại, chờ khởi động...');
    for (let i = 0; i < 12 && !be; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      be = await backendUp();
    }
  }
  log(
    `gỡ khoá ${unlocked.rowCount}, kéo dài ${extended.rowCount} suất, mở mới ${created.rowCount}, đang mở ${n}, backend ${be ? 'OK' : 'TẮT'}`,
  );
}

log(`Giữ dữ liệu test đến ${hh}:${String(mm).padStart(2, '0')}, chu kỳ ${everyMs / 1000}s`);
while (Date.now() < deadline().getTime()) {
  try {
    await cycle();
  } catch (e) {
    log('Lỗi chu kỳ:', e.message);
  }
  await new Promise((r) => setTimeout(r, everyMs));
}
log('Đã hết khung giờ test, dừng.');
await db.end();
