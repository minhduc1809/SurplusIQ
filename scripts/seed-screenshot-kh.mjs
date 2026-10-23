// Nạp dữ liệu để chụp màn hình các tính năng 2.3.12 đến 2.4.17 trên tài khoản kh.daydu@surplusiq.vn (DB dev).
// Chạy: node scripts/seed-screenshot-kh.mjs   (cần backend dev chạy và đã chạy seed-test-accounts.mjs). Chạy lại nhiều lần an toàn.
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
        ? { identifier: id, password: 'Surplus@1', deviceId: 'seed-shot' }
        : { email: id, password: 'Surplus@1', deviceId: 'seed-shot' },
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

// 2.3.12 Cảnh báo deal
const alerts = must(await call('GET', '/customer/deal-alerts', { token: kh }), 'đọc cảnh báo');
if (alerts.length < 3) {
  for (const criteria of [
    { category: 'NOODLE', maxPrice: 45000, minDiscountPercent: 40, radiusKm: 3 },
    { category: 'BREAD', maxPrice: 30000, minDiscountPercent: 50, radiusKm: 5 },
    { category: 'DRINK', maxPrice: 30000, radiusKm: 2 },
  ]) {
    await step('cảnh báo ' + criteria.category, async () =>
      must(
        await call('POST', '/customer/deal-alerts', {
          token: kh,
          body: { criteria, isActive: true },
        }),
        'tạo cảnh báo',
      ),
    );
  }
}

// 2.3.13 Gợi ý "Dành cho bạn": cần lịch sử xem và deal đã lưu
for (const d of deals.slice(0, 6))
  await call('POST', `/customer/view-history/${d.id}`, { token: kh });
for (const d of deals.slice(0, 3))
  await call('POST', `/customer/deals/${d.id}/save`, { token: kh });
console.log('OK    đã ghi lịch sử xem và lưu 3 deal');

// Đơn hiện có
const res = must(await call('GET', '/customer/orders?limit=50', { token: kh }), 'đơn của tôi');
const orders = Array.isArray(res) ? res : res.data;
const has = (status) => orders.some((o) => o.status === status);

const hold = async (deal, what) =>
  step(what, async () =>
    must(
      await call('POST', '/customer/orders', {
        token: kh,
        body: { offerId: deal.id, quantity: 1 },
      }),
      'giữ suất',
    ),
  );
const pay = async (order) =>
  step('thanh toán đơn ' + order.id.slice(0, 8), async () => {
    const p = must(
      await call('POST', `/customer/orders/${order.id}/payments`, { token: kh, body: {} }),
      'tạo thanh toán',
    );
    must(
      await call('POST', `/dev/payments/${p.transactionId || p.id}/confirm`, { body: {} }),
      'xác nhận thanh toán',
    );
  });

// 2.4.1, 2.4.2, 2.4.11: một đơn đang giữ suất chưa thanh toán (có đồng hồ đếm ngược, mã VietQR, nút hủy)
if (!has('HELD') && !has('PENDING_PAYMENT')) {
  const d = dealOf('Trà') || dealOf('Cafe') || deals[deals.length - 1];
  const o = d && (await hold(d, 'giữ suất ' + d.storeName));
  if (o)
    await step('tạo mã VietQR cho đơn đang giữ', async () =>
      must(
        await call('POST', `/customer/orders/${o.id}/payments`, { token: kh, body: {} }),
        'VietQR',
      ),
    );
}

// 2.4.3, 2.4.6, 2.4.7, 2.4.8, 2.4.16, 2.4.17: đơn đã thanh toán của quán Phở (chủ quán A trả lời tin nhắn)
const dA = dealOf('Phở Bò');
if (dA && orders.filter((o) => o.status === 'PAID').length < 3) {
  const o = await hold(dA, 'giữ suất ' + dA.storeName);
  if (o) {
    await pay(o);
    await step('đổi giờ hẹn nhận', async () => {
      const s = new Date(dA.pickupStart).getTime();
      const e = new Date(dA.pickupEnd).getTime();
      const slot = new Date(Math.max(Date.now() + 10 * 60000, s + (e - s) / 2)).toISOString();
      return must(
        await call('PATCH', `/customer/orders/${o.id}/pickup-slot`, {
          token: kh,
          body: { pickupSlot: slot },
        }),
        'đổi giờ',
      );
    });
    await step('báo "Tôi sắp đến"', async () =>
      must(await call('POST', `/customer/orders/${o.id}/arriving`, { token: kh }), 'sắp đến'),
    );
    await step('nhắn tin với cửa hàng', async () => {
      must(
        await call('POST', `/customer/orders/${o.id}/messages`, {
          token: kh,
          body: { body: 'Chào quán, mình sẽ đến nhận lúc 19h, quán giữ giúp mình nhé.' },
        }),
        'khách nhắn',
      );
      must(
        await call('POST', `/store/orders/${o.id}/messages`, {
          token: ownerA,
          body: { body: 'Quán đã chuẩn bị xong, bạn đến báo mã đơn là nhận được ngay ạ.' },
        }),
        'quán trả lời',
      );
      must(
        await call('POST', `/customer/orders/${o.id}/messages`, {
          token: kh,
          body: { body: 'Cảm ơn quán!' },
        }),
        'khách nhắn',
      );
    });
  }
}

// 2.4.9: đơn đã thanh toán của quán bún chả, tạo mã nhờ người khác nhận hộ
const dB = dealOf('Sinh Từ');
if (dB && orders.filter((o) => o.status === 'PAID').length < 4) {
  const o = await hold(dB, 'giữ suất ' + dB.storeName);
  if (o) {
    await pay(o);
    await step('tạo mã nhận hộ', async () =>
      must(
        await call('POST', `/customer/orders/${o.id}/proxy-code`, { token: kh, body: {} }),
        'mã nhận hộ',
      ),
    );
  }
}

console.log('\nXong. Mở app khách bằng kh.daydu@surplusiq.vn rồi chụp theo mục 2.3.12 đến 2.4.17.');
console.log(
  'Đơn đã nhận hàng (xem biên nhận, đặt lại, báo sự cố) và đơn bị hủy đã có sẵn từ seed-test-accounts.mjs.',
);
void ownerB;
