// Nạp lịch sử phục vụ các màn phân tích của chủ quán (DB dev local), chạy lại nhiều lần an toàn:
//   1. daily_actuals: 35 ngày số làm / bán tại quầy / bán qua app cho mọi món đang hoạt động của quán đang hoạt động
//      -> đủ ngưỡng 14 ngày để Dự báo dùng "trung bình cùng thứ" + MAPE, và 28 ngày cho phát hiện bất thường.
//   2. Xoá dự báo cũ ở trạng thái "cần nhập tay" (chưa ai chọn) để backend tính lại từ lịch sử vừa nạp.
//   3. offer_events PRICE_CHANGED cho các suất gần đây -> màn "Lịch sử quyết định giá" có dữ liệu.
// Số liệu tạo bằng hàm giả-ngẫu-nhiên xác định theo mã món/ngày (cùng một món luôn ra cùng một dãy), có mùa vụ theo thứ.
// Chạy: DATABASE_URL= node scripts/seed-analytics-history.mjs
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: new URL('../.env', import.meta.url) });
const { Client } = require('pg');

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
const q = async (sql, p = []) => (await db.query(sql, p)).rows;

// Số thực xác định trong [0,1) từ chuỗi khoá
const rnd = (key) =>
  parseInt(createHash('md5').update(key).digest('hex').slice(0, 8), 16) / 0x100000000;
const DAYS = 35;
// Hệ số theo thứ (0 = Chủ nhật): cuối tuần đông hơn
const DOW = [1.25, 0.85, 0.9, 0.95, 1.0, 1.2, 1.35];

const items = await q(
  `SELECT i.id, i.store_id FROM items i JOIN stores s ON s.id = i.store_id
    WHERE s.status = 'ACTIVE' AND i.status = 'ACTIVE'`,
);
console.log(`Món cần nạp lịch sử: ${items.length}`);

let inserted = 0;
await db.query('BEGIN');
for (const it of items) {
  const base = 10 + Math.floor(rnd('base' + it.id) * 30); // 10..39 suất/ngày
  const rows = [];
  for (let d = 1; d <= DAYS; d++) {
    const day = new Date(Date.now() - d * 86_400_000);
    const iso = day.toISOString().slice(0, 10);
    const dow = day.getUTCDay();
    const demand = Math.max(1, Math.round(base * DOW[dow] * (0.9 + rnd(`n${it.id}${iso}`) * 0.25)));
    const produced = Math.max(demand, Math.round(base * 1.15 + rnd(`p${it.id}${iso}`) * 4));
    const sold = Math.min(produced, demand);
    const app = Math.min(sold, Math.round(sold * (0.25 + rnd(`a${it.id}${iso}`) * 0.3)));
    // Bán hết thì ghi giờ hết hàng (19:30-21:00 giờ VN) để dự báo bù cầu +10%
    const stockout =
      sold >= produced
        ? `${iso}T${12 + Math.floor(rnd('s' + it.id + iso) * 2)}:${rnd('m' + it.id + iso) < 0.5 ? '30' : '00'}:00Z`
        : null;
    rows.push([it.store_id, it.id, iso, produced, sold - app, app, stockout]);
  }
  for (const r of rows) {
    const res = await db.query(
      `INSERT INTO daily_actuals (store_id, item_id, date, produced, sold_offline, sold_app, stockout_at, locked_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$3::date + interval '23 hours')
       ON CONFLICT (store_id, item_id, date) DO NOTHING`,
      r,
    );
    inserted += res.rowCount;
  }
}
console.log(`daily_actuals: thêm ${inserted} dòng (dòng đã có được giữ nguyên)`);

const del = await db.query(
  `DELETE FROM forecasts WHERE method = 'MANUAL_REQUIRED' AND chosen_quantity IS NULL AND target_date >= CURRENT_DATE - 1`,
);
console.log(`Dự báo "cần nhập tay" đã xoá để tính lại: ${del.rowCount}`);

// Lịch sử đổi giá: mỗi suất gần đây (7 ngày) chưa có sự kiện PRICE_CHANGED được 1-2 lần giảm giá, kết thúc ở giá hiện tại.
const offers = await q(
  `SELECT o.id, o.original_price, o.current_price, o.floor_price, o.pickup_start, o.pickup_end, o.price_change_count
     FROM offers o
    WHERE o.status <> 'DRAFT' AND o.pickup_start >= now() - interval '7 days'
      AND o.current_price < o.original_price
      AND NOT EXISTS (SELECT 1 FROM offer_events e WHERE e.offer_id = o.id AND e.type = 'PRICE_CHANGED')`,
);
let ev = 0;
for (const o of offers) {
  const start = new Date(o.pickup_start).getTime();
  // Chỉ đặt sự kiện trong quá khứ: với suất còn mở thì chia đều từ lúc bắt đầu đến hiện tại.
  const end = Math.min(new Date(o.pickup_end).getTime(), Date.now());
  const span = Math.max(end - start, 600_000);
  const steps = o.original_price - o.current_price >= 4000 ? 2 : 1;
  const step500 = (v) => Math.max(o.floor_price, Math.round(v / 500) * 500);
  const mid = step500(o.original_price - (o.original_price - o.current_price) / 2);
  const seq =
    steps === 2 ? [o.original_price, mid, o.current_price] : [o.original_price, o.current_price];
  for (let i = 0; i < seq.length - 1; i++) {
    if (seq[i] === seq[i + 1]) continue;
    const at = new Date(start + (span * (i + 1)) / (seq.length + 1));
    if (at.getTime() > Date.now()) continue; // không tạo sự kiện ở tương lai
    const auto = i === 0;
    await db.query(
      `INSERT INTO offer_events (offer_id, type, payload, reason, created_at)
       VALUES ($1, 'PRICE_CHANGED', $2, $3, $4)`,
      [
        o.id,
        JSON.stringify({ oldPrice: seq[i], newPrice: seq[i + 1] }),
        auto
          ? 'Áp dụng định giá động: gần hết khung nhận, tồn còn nhiều'
          : 'Chủ quán chỉnh giá thủ công để đẩy nhanh tồn',
        at,
      ],
    );
    ev++;
  }
  await db.query(
    'UPDATE offers SET price_change_count = GREATEST(price_change_count, $2) WHERE id = $1',
    [o.id, seq.length - 1],
  );
}
console.log(`offer_events PRICE_CHANGED: thêm ${ev} sự kiện cho ${offers.length} suất`);
await db.query('COMMIT');
await db.end();
console.log('Xong. Mở Dự báo, Độ chính xác và xu hướng, Lịch sử quyết định giá để xem.');
