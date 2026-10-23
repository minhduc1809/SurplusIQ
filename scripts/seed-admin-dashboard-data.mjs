import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const client = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USERNAME || 'surplusiq'}:${process.env.DB_PASSWORD || 'surplusiq_dev_2026'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_DATABASE || 'surplusiq_dev'}?schema=public`,
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL database for Admin data seed.');

  // 1. Lấy danh sách store, customer, offer để tạo đơn hàng hợp lệ
  const stores = (await client.query(`SELECT id, name FROM stores LIMIT 10`)).rows;
  const customers = (
    await client.query(`SELECT id, email FROM users WHERE role = 'CUSTOMER' LIMIT 10`)
  ).rows;
  const offers = (await client.query(`SELECT id, store_id, current_price FROM offers LIMIT 20`))
    .rows;

  if (stores.length === 0 || customers.length === 0) {
    console.log('Cần có ít nhất 1 store và 1 customer để seed.');
    await client.end();
    return;
  }

  // 2. Thêm đơn hàng PENDING_PAYMENT và PAID
  console.log('--- 1. Seed thêm đơn hàng PENDING_PAYMENT và PAID ---');
  const sampleOrders = [
    {
      code: 'SQPEND0001',
      status: 'PENDING_PAYMENT',
      qty: 2,
      price: 45000,
      total: 90000,
      hold_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      code: 'SQPEND0002',
      status: 'PENDING_PAYMENT',
      qty: 1,
      price: 55000,
      total: 55000,
      hold_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 8 * 60 * 1000),
    },
    {
      code: 'SQPEND0003',
      status: 'PENDING_PAYMENT',
      qty: 3,
      price: 35000,
      total: 105000,
      hold_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 2 * 60 * 1000),
    },
    {
      code: 'SQPAID0001',
      status: 'PAID',
      qty: 2,
      price: 60000,
      total: 120000,
      hold_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paid_at: new Date(Date.now() - 30 * 60 * 1000),
      created_at: new Date(Date.now() - 35 * 60 * 1000),
    },
    {
      code: 'SQPAID0002',
      status: 'PAID',
      qty: 1,
      price: 40000,
      total: 40000,
      hold_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paid_at: new Date(Date.now() - 45 * 60 * 1000),
      created_at: new Date(Date.now() - 50 * 60 * 1000),
    },
  ];

  for (let i = 0; i < sampleOrders.length; i++) {
    const o = sampleOrders[i];
    const store = stores[i % stores.length];
    const customer = customers[i % customers.length];
    const offer = offers.find((of) => of.store_id === store.id) || offers[0];

    const exist = await client.query(`SELECT id FROM orders WHERE code = $1`, [o.code]);
    if (exist.rows.length === 0) {
      await client.query(
        `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status, hold_expires_at, paid_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          randomUUID(),
          o.code,
          customer.id,
          store.id,
          offer?.id || null,
          o.qty,
          o.price,
          0,
          o.total,
          o.status,
          o.hold_expires_at || null,
          o.paid_at || null,
          o.created_at,
          o.created_at,
        ],
      );
      console.log(`Đã tạo đơn ${o.code} (${o.status}) cho store ${store.name}`);
    } else {
      await client.query(
        `UPDATE orders SET status = $1, hold_expires_at = $2, paid_at = $3, updated_at = NOW() WHERE code = $4`,
        [o.status, o.hold_expires_at || null, o.paid_at || null, o.code],
      );
      console.log(`Đã cập nhật đơn ${o.code} về (${o.status})`);
    }
  }

  // 3. Thêm các báo cáo vi phạm mẫu (violation_reports)
  console.log('--- 2. Seed thêm báo cáo vi phạm ---');
  const sampleViolations = [
    {
      target_type: 'STORE',
      reason: 'Cửa hàng không bàn giao đúng món suất ăn cứu trợ và thái độ không chuẩn mực.',
      status: 'PENDING',
    },
    {
      target_type: 'DEAL',
      reason:
        'Hình ảnh suất ăn khác xa thực tế nhận được tại quầy, có dấu hiệu thổi phồng chất lượng.',
      status: 'PENDING',
    },
    {
      target_type: 'STORE',
      reason: 'Cửa hàng đóng cửa trước giờ nhận quy định mà không thông báo trên ứng dụng.',
      status: 'REVIEWED',
    },
    {
      target_type: 'REVIEW',
      reason: 'Đánh giá có từ ngữ thô tục xúc phạm uy tín người bán.',
      status: 'DISMISSED',
    },
  ];

  for (let i = 0; i < sampleViolations.length; i++) {
    const v = sampleViolations[i];
    const reporter = customers[i % customers.length];
    const targetStore = stores[(i + 1) % stores.length];

    const exist = await client.query(`SELECT id FROM violation_reports WHERE reason = $1 LIMIT 1`, [
      v.reason,
    ]);
    if (exist.rows.length === 0) {
      await client.query(
        `INSERT INTO violation_reports (id, reporter_id, target_type, target_id, reason, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${i * 2 + 1} hours', NOW())`,
        [randomUUID(), reporter.id, v.target_type, targetStore.id, v.reason, v.status],
      );
      console.log(`Đã tạo vi phạm: ${v.target_type} - ${v.status}`);
    }
  }

  // 4. Kiểm tra tài khoản bị khóa
  console.log('--- 3. Kiểm tra tài khoản bị khóa ---');
  const lockedUsers = await client.query(
    `SELECT count(*) FROM users WHERE status = 'LOCKED' OR locked_until > NOW()`,
  );
  if (Number(lockedUsers.rows[0].count) === 0) {
    // Khóa thử 1 user test
    const userToLock = await client.query(
      `SELECT id, email FROM users WHERE role = 'CUSTOMER' AND email LIKE 'test%' LIMIT 1`,
    );
    if (userToLock.rows.length > 0) {
      await client.query(
        `UPDATE users SET status = 'LOCKED', locked_until = NOW() + INTERVAL '30 days' WHERE id = $1`,
        [userToLock.rows[0].id],
      );
      console.log(`Đã khóa tài khoản test: ${userToLock.rows[0].email}`);
    }
  } else {
    console.log(`Đã có ${lockedUsers.rows[0].count} tài khoản bị khóa.`);
  }

  // 5. Cập nhật checksum cho các weekly_statements nếu chưa có
  console.log('--- 4. Kiểm tra checksum sao kê đối soát ---');
  const unchecksummed = await client.query(
    `SELECT id, store_id, week_start, gross, commission, net_payable FROM weekly_statements WHERE checksum IS NULL OR checksum = ''`,
  );
  for (const st of unchecksummed.rows) {
    const pseudoHash = `sha256:${Buffer.from(`${st.id}:${st.store_id}:${st.gross}:${st.commission}:${st.net_payable}`).toString('hex').slice(0, 32)}`;
    await client.query(`UPDATE weekly_statements SET checksum = $1 WHERE id = $2`, [
      pseudoHash,
      st.id,
    ]);
  }
  if (unchecksummed.rows.length > 0) {
    console.log(`Đã bổ sung checksum cho ${unchecksummed.rows.length} sao kê tuần.`);
  } else {
    console.log('Tất cả sao kê tuần đã có checksum.');
  }

  console.log('Admin data seed hoàn tất thành công!');
  await client.end();
}

run().catch((err) => {
  console.error('Lỗi seed data:', err);
  process.exit(1);
});
