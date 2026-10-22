// Nạp lịch sử đơn đã nhận cho kh.daydu@surplusiq.vn để thực hiện UC "Đặt lại món đã mua" (chỉ đặt lại được khi món còn suất đang mở).
// Chạy: node scripts/seed-reorder-history.mjs   (cần backend dev chạy và đã chạy seed-test-accounts.mjs). Chạy lại nhiều lần an toàn.
// Mọi bước đi qua API nghiệp vụ; bước nào lỗi (vd quá hạn mức giữ suất) chỉ in cảnh báo rồi chạy tiếp.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const API = process.env.SEED_API_URL || 'http://localhost:4000';
if (process.env.NODE_ENV === 'production' || !/localhost|127\.0\.0\.1|192\.168\./.test(API)) {
  console.error('Từ chối chạy: chỉ dùng cho backend dev trên máy local.');
  process.exit(1);
}

const call = async (method, path, { token, body } = {}) => {
  const r = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let j;
  try {
    j = JSON.parse(t);
  } catch {
    j = t;
  }
  return { status: r.status, body: j };
};
const must = (r, what) => {
  if (r.status >= 300)
    throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
  return r.body;
};
const step = async (what, fn) => {
  try {
    const v = await fn();
    console.log('OK   ', what);
    return v;
  } catch (e) {
    console.log('BỎ QUA', what, '-', e.message);
  }
};
const login = async (path, id) =>
  must(
    await call('POST', path, {
      body: path.includes('customer')
        ? { identifier: id, password: '123456', deviceId: 'seed-shot' }
        : { email: id, password: '123456', deviceId: 'seed-shot' },
    }),
    'đăng nhập ' + id,
  ).accessToken;

const kh = await login('/auth/customer/login', 'kh.daydu@surplusiq.vn');
const ownerA = await login('/auth/store/login', 'chuthucan.hanoi@surplusiq.vn');
const ownerB = await login('/auth/store/login', 'chuthucan2.hanoi@surplusiq.vn');

const deals = must(
  await call('GET', '/customer/deals?latitude=21.0458&longitude=105.795&radiusKm=5&limit=50', {
    token: kh,
  }),
  'danh sách deal',
).data;
const dealOf = (part) => deals.find((d) => d.storeName.includes(part) || d.title.includes(part));
console.log(`Có ${deals.length} deal đang mở.`);

// Mỗi món còn suất đang mở của quán A, B được mua và nhận xong một lần để có đơn PICKED_UP đặt lại được.
const plan = [
  { part: 'Phở Bò', by: ownerA },
  { part: 'Sinh Từ', by: ownerB },
];
for (const p of plan) {
  const d = dealOf(p.part);
  if (!d) {
    console.log('BỎ QUA không có suất đang mở cho', p.part);
    continue;
  }
  await step('mua và nhận ' + d.title, async () => {
    const o = must(
      await call('POST', '/customer/orders', { token: kh, body: { offerId: d.id, quantity: 1 } }),
      'giữ suất',
    );
    const pay = must(
      await call('POST', `/customer/orders/${o.id}/payments`, { token: kh, body: {} }),
      'tạo thanh toán',
    );
    must(
      await call('POST', `/dev/payments/${pay.transactionId || pay.id}/confirm`, { body: {} }),
      'xác nhận thanh toán',
    );
    const pass = must(
      await call('GET', `/customer/orders/${o.id}/pickup-pass`, { token: kh }),
      'vé nhận hàng',
    );
    must(
      await call('POST', '/store/pickups/verify', {
        token: p.by,
        body: { token: pass.qrToken || pass.token || pass.pickupToken },
      }),
      'quét nhận hàng',
    );
  });
}
console.log(
  'Xong. Mở Đơn hàng của tôi > Lịch sử, chọn đơn "Đã nhận hàng" rồi bấm "Đặt lại món này".',
);
