// Tiện ích dùng chung cho bộ kiểm thử audit. Chỉ chạy trên backend LOCAL dùng DB test riêng (surplusiq_test).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BASE = new URL(process.env.AUDIT_API_URL || 'http://localhost:4100');
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(BASE.hostname),
  'Chỉ chạy trên backend local',
);
assert.notEqual(
  BASE.port,
  '4000',
  'Cổng 4000 là backend dev (DB demo). Dùng backend test ở cổng 4100 với POSTGRES_DB=surplusiq_test',
);
assert.notEqual(process.env.NODE_ENV, 'production', 'Không chạy trên production');

export const ACCOUNTS = {
  customerA: {
    path: '/auth/customer/login',
    body: { identifier: 'customer@surplusiq.vn', password: '123456' },
  },
  customerB: {
    path: '/auth/customer/login',
    body: { identifier: 'customer1@surplusiq.test', password: '123456' },
  },
  storeA: { path: '/auth/store/login', body: { email: 'owner@rincon.vn', password: '123456' } },
  storeB: {
    path: '/auth/store/login',
    body: { email: 'owner2@surplusiq.test', password: '123456' },
  },
  admin: {
    path: '/auth/admin/login',
    body: {
      email: 'admin@surplusiq.vn',
      password: process.env.ADMIN_PASSWORD || 'Admin@SurplusIQ2026',
    },
  },
};

export async function http(method, path, { token, body, headers } = {}) {
  const res = await fetch(new URL(path, BASE), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.AUDIT_HTTP_TIMEOUT_MS || 30000)),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

let penaltiesReset = false;
/** Các job mở công khai (BUG-004) hoặc test trước có thể ghi "không đến nhận" → khóa đặt hàng khách (BR-020): dọn trong DB test. */
export async function resetPenalties() {
  await q('delete from noshow_records');
  // BR-054 giới hạn 100 suất mở/ngày/cửa hàng: đóng các suất do test tạo từ lượt chạy trước để không chạm hạn mức.
  await q(
    "update offers o set status='CLOSED' from items i where i.id=o.item_id and i.name like 'Món kiểm thử%' and o.status in ('OPEN','DRAFT','SOLD_OUT')",
  );
  await q(
    "update users set status='ACTIVE', delete_requested_at=null, failed_login_count=0, locked_until=null where role='CUSTOMER' and status in ('PENDING_DELETE','LOCKED') and email in ('customer@surplusiq.vn','customer1@surplusiq.test','customer2@surplusiq.test')",
  );
  penaltiesReset = true;
}

export async function loginAs(name) {
  if (!penaltiesReset) await resetPenalties();
  const a = ACCOUNTS[name];
  const r = await http('POST', a.path, {
    body: { ...a.body, deviceId: `audit-${name}-${randomUUID().slice(0, 6)}` },
  });
  assert.equal(
    r.status,
    201,
    `đăng nhập ${name} thất bại: ${r.status} ${JSON.stringify(r.body)?.slice(0, 120)}`,
  );
  return r.body.accessToken;
}

export function endpoints() {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL('./endpoints.json', import.meta.url)), 'utf8'),
  );
}

/** Thay tham số :id bằng UUID giả (hoặc giá trị cho trước). */
export function fill(path, values = {}) {
  return path.replace(/:(\w+)/g, (_, n) => values[n] || randomUUID());
}

export const authzDenied = (status) => status === 401 || status === 403;

/** Tạo suất + giữ chỗ + thanh toán dev để có đơn PAID thuộc khách A / cửa hàng A. */
export async function createPaidOrder(tokens, { price = 27000 } = {}) {
  // Item seed có id không phải UUID v4 nên validator suất từ chối; tạo món mới qua API (xem BUG seed trong báo cáo).
  const created = await http('POST', '/store/items', {
    token: tokens.storeA,
    body: {
      name: 'Món kiểm thử ' + randomUUID().slice(0, 6),
      category: 'Bánh ngọt',
      originalPrice: 40000,
      standardShelfLifeHours: 24,
    },
  });
  assert.equal(created.status, 201, `tạo món: ${JSON.stringify(created.body).slice(0, 150)}`);
  const item = created.body;
  const offer = await http('POST', '/store/offers', {
    token: tokens.storeA,
    headers: { 'Idempotency-Key': randomUUID() },
    body: {
      itemId: item.id,
      totalQuantity: 5,
      originalPrice: item.originalPrice,
      currentPrice: price,
      pickupStart: new Date(Date.now() - 300_000).toISOString(),
      pickupEnd: new Date(Date.now() + 3 * 3600_000).toISOString(),
    },
  });
  assert.equal(offer.status, 201, `tạo suất: ${JSON.stringify(offer.body).slice(0, 150)}`);
  const order = await http('POST', '/customer/orders', {
    token: tokens.customerA,
    headers: { 'Idempotency-Key': randomUUID() },
    body: { offerId: offer.body.id, quantity: 1 },
  });
  assert.equal(order.status, 201, `giữ chỗ: ${JSON.stringify(order.body).slice(0, 150)}`);
  return { offer: offer.body, order: order.body };
}

export async function payOrderDev(tokens, orderId) {
  const pay = await http('POST', `/customer/orders/${orderId}/payments`, {
    token: tokens.customerA,
    body: {},
  });
  assert.equal(pay.status, 201, `tạo thanh toán: ${JSON.stringify(pay.body).slice(0, 150)}`);
  const txn = pay.body.transactionId || pay.body.id || pay.body.transactionCode;
  const c = await http('POST', `/dev/payments/${txn}/confirm`, { body: {} });
  assert.equal(c.status, 200, `xác nhận dev: ${JSON.stringify(c.body).slice(0, 150)}`);
  return pay.body;
}

// ---- Truy vấn DB test để xác minh kết quả nghiệp vụ (nguyên tắc: không chỉ tin mã HTTP) ----
import { createRequire } from 'node:module';
let dbClient;
export async function db() {
  if (dbClient) return dbClient;
  const req = createRequire(new URL('../../package.json', import.meta.url));
  const { Client } = req('pg');
  req('dotenv').config({ path: fileURLToPath(new URL('../../../../.env', import.meta.url)) });
  dbClient = new Client({
    host: 'localhost',
    port: +process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'surplusiq_test',
  });
  await dbClient.connect();
  return dbClient;
}
export async function q(sql, params) {
  return (await (await db()).query(sql, params)).rows;
}
export async function closeDb() {
  if (dbClient) {
    await dbClient.end();
    dbClient = undefined;
  }
}

export async function createOffer(
  tokens,
  {
    qty = 5,
    price = 27000,
    original = 40000,
    startOffsetMs = -300_000,
    endOffsetMs = 3 * 3600_000,
  } = {},
) {
  const created = await http('POST', '/store/items', {
    token: tokens.storeA,
    body: {
      name: 'Món kiểm thử ' + randomUUID().slice(0, 6),
      category: 'Bánh ngọt',
      originalPrice: original,
      standardShelfLifeHours: 24,
    },
  });
  assert.equal(created.status, 201);
  const r = await http('POST', '/store/offers', {
    token: tokens.storeA,
    headers: { 'Idempotency-Key': randomUUID() },
    body: {
      itemId: created.body.id,
      totalQuantity: qty,
      originalPrice: original,
      currentPrice: price,
      pickupStart: new Date(Date.now() + startOffsetMs).toISOString(),
      pickupEnd: new Date(Date.now() + endOffsetMs).toISOString(),
    },
  });
  return { item: created.body, res: r, offer: r.body };
}
