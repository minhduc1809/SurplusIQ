// Nạp lịch sử đơn mua đủ trạng thái cho kh.daydu@surplusiq.vn tại quán của chuthucan.hanoi@surplusiq.vn,
// kèm tin nhắn, để test cả hai trường hợp: ĐƯỢC nhắn tin và BỊ CHẶN nhắn tin (quy tắc ở order-support.service.ts):
//   - đơn chờ thanh toán / hết hạn giữ: chặn;  - đơn đã thanh toán: mở;
//   - đơn đã kết thúc (nhận, quá hạn nhận, huỷ, hoàn): mở trong 24 giờ kể từ lúc kết thúc, sau đó chặn.
// Đơn có mã SQ-H01.. nên chạy lại là xoá làm lại đúng bộ này, không đụng các đơn khác. Chỉ chạy trên DB dev local.
// Chạy: DATABASE_URL= node scripts/seed-order-history-chat.mjs
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

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

const [kh] = await q("SELECT id FROM users WHERE email = 'kh.daydu@surplusiq.vn'");
const [owner] = await q("SELECT id FROM users WHERE email = 'chuthucan.hanoi@surplusiq.vn'");
if (!kh || !owner)
  throw new Error(
    'Thiếu tài khoản kh.daydu hoặc chuthucan.hanoi (chạy seed-test-accounts.mjs trước).',
  );
const [member] = await q(
  'SELECT store_id FROM store_members WHERE user_id = $1 AND status = $2 LIMIT 1',
  [owner.id, 'ACTIVE'],
);
const storeId = member.store_id;
const offers = await q(
  'SELECT id, current_price FROM offers WHERE store_id = $1 ORDER BY created_at DESC LIMIT 4',
  [storeId],
);
if (offers.length === 0) throw new Error('Quán chưa có suất nào để gắn đơn.');

// Dọn bộ cũ (chỉ các đơn SQ-H*)
await db.query('BEGIN');
const old = (
  await q("SELECT id FROM orders WHERE code LIKE 'SQ-H%' AND customer_id = $1", [kh.id])
).map((r) => r.id);
if (old.length) {
  await db.query('DELETE FROM order_messages WHERE order_id = ANY($1)', [old]);
  await db.query('DELETE FROM pickup_tokens WHERE order_id = ANY($1)', [old]);
  await db.query('DELETE FROM orders WHERE id = ANY($1)', [old]);
}

const H = 3600_000;
const ago = (ms) => new Date(Date.now() - ms);
// [mã, trạng thái, mô tả, thời điểm kết thúc (null = chưa), hướng tin nhắn]
const SCENARIOS = [
  ['SQ-H01', 'PENDING_PAYMENT', 'Chờ thanh toán (chat chặn)', null, false],
  ['SQ-H02', 'PAID', 'Đã thanh toán, chờ nhận (chat mở)', null, true],
  ['SQ-H03', 'PAID', 'Đã thanh toán, có giờ hẹn (chat mở)', null, true],
  ['SQ-H04', 'PICKED_UP', 'Đã nhận 2 giờ trước (chat mở)', 2 * H, true],
  ['SQ-H05', 'PICKED_UP', 'Đã nhận 30 giờ trước (chat đã đóng)', 30 * H, true],
  ['SQ-H06', 'PICKUP_EXPIRED', 'Quá hạn nhận 5 giờ trước (chat mở)', 5 * H, true],
  ['SQ-H07', 'PICKUP_EXPIRED', 'Quá hạn nhận 3 ngày trước (chat đã đóng)', 72 * H, true],
  ['SQ-H08', 'CANCELLED', 'Đã huỷ 1 giờ trước (chat mở)', 1 * H, true],
  ['SQ-H09', 'CANCELLED', 'Đã huỷ 2 ngày trước (chat đã đóng)', 48 * H, true],
  ['SQ-H10', 'REFUNDED', 'Đã hoàn tiền 4 giờ trước (chat mở)', 4 * H, true],
  ['SQ-H11', 'REFUNDED', 'Đã hoàn tiền 4 ngày trước (chat đã đóng)', 96 * H, true],
  ['SQ-H12', 'HOLD_EXPIRED', 'Hết hạn giữ suất (chat chặn)', 20 * 60_000, false],
];

const MSG = [
  ['CUSTOMER', 'Chào quán, mình đặt suất này, khoảng mấy giờ mình ghé lấy được ạ?'],
  ['STORE', 'Chào bạn, bạn ghé trong khung giờ nhận nhé, quán để sẵn phần cho bạn.'],
  ['CUSTOMER', 'Cảm ơn quán, cho mình hỏi món có cay không ạ?'],
  ['STORE', 'Món không cay, bạn yên tâm nhé.'],
];

let i = 0;
for (const [code, status, note, endedAgo, withChat] of SCENARIOS) {
  const offer = offers[i % offers.length];
  i++;
  const created = endedAgo ? ago(endedAgo + 90 * 60_000) : ago(5 * 60_000);
  const ended = endedAgo ? ago(endedAgo) : null;
  const paid =
    ['PAID', 'PICKED_UP', 'PICKUP_EXPIRED', 'REFUNDED'].includes(status) ||
    (status === 'CANCELLED' && endedAgo);
  const total = offer.current_price;
  const [o] = await q(
    `INSERT INTO orders (code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount,
        status, hold_expires_at, pickup_slot, note, paid_at, picked_up_at, picked_up_by, cancelled_at, cancel_reason,
        cancelled_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,1,$5,0,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
    [
      code,
      kh.id,
      storeId,
      offer.id,
      total,
      status,
      status === 'PENDING_PAYMENT'
        ? new Date(Date.now() + 6 * H)
        : new Date(created.getTime() + 10 * 60_000),
      code === 'SQ-H03' ? new Date(Date.now() + 60 * 60_000) : null,
      note,
      paid ? new Date(created.getTime() + 3 * 60_000) : null,
      status === 'PICKED_UP' || status === 'REFUNDED' ? ended : null,
      status === 'PICKED_UP' || status === 'REFUNDED' ? owner.id : null,
      status === 'CANCELLED' ? ended : null,
      status === 'CANCELLED' ? 'Khách đổi ý' : null,
      status === 'CANCELLED' ? 'CUSTOMER' : null,
      created,
      ended ?? new Date(),
    ],
  );
  if (status === 'PAID') {
    const pin = randomBytes(4)
      .toString('hex')
      .slice(0, 6)
      .toUpperCase()
      .replace(/[0OIL1]/g, 'X')
      .padEnd(6, 'X');
    await db.query(
      'INSERT INTO pickup_tokens (order_id, backup_code, expires_at, status) VALUES ($1,$2,$3,$4)',
      [o.id, pin, new Date(Date.now() + 6 * H), 'UNUSED'],
    );
    console.log(`  ${code}: PIN ${pin}`);
  }
  if (withChat) {
    const base = (ended ?? new Date()).getTime() - (endedAgo ? 60 * 60_000 : 20 * 60_000);
    for (let m = 0; m < MSG.length; m++) {
      const [role, body] = MSG[m];
      await db.query(
        'INSERT INTO order_messages (order_id, store_id, sender_role, sender_id, body, read_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [
          o.id,
          storeId,
          role,
          role === 'CUSTOMER' ? kh.id : owner.id,
          body,
          role === 'STORE' || m < 3 ? new Date(base + (m + 1) * 120_000) : null,
          new Date(base + m * 120_000),
        ],
      );
    }
  }
  console.log(`OK ${code} ${status.padEnd(15)} ${note}`);
}
await db.query('COMMIT');
console.log(
  '\nXong. Mở app khách > Đơn hàng của tôi > Lịch sử, vào từng đơn rồi bấm biểu tượng nhắn tin.',
);
await db.end();
