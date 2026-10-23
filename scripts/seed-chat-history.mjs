// Nạp lịch sử mua và các cuộc trò chuyện với chủ quán chuthucan.hanoi@surplusiq.vn cho kh.daydu@surplusiq.vn. Tin nhắn đi qua API nên backend tạo thông báo thật cho bên nhận.
// Chạy: node scripts/seed-chat-history.mjs   (cần backend dev chạy và đã chạy seed-test-accounts.mjs). Chạy lại nhiều lần an toàn.
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

const res = must(await call('GET', '/customer/orders?limit=50', { token: kh }), 'đơn của tôi');
const orders = (Array.isArray(res) ? res : res.data).filter(
  (o) => o.storeId === 'a1000000-0000-4000-8000-000000000001',
);
console.log(`Có ${orders.length} đơn của quán Phở Bò Gia Truyền.`);

const SCRIPT = [
  ['C', 'Chào quán, mình đặt suất phở lúc nãy, khoảng 19h mình đến nhận được không ạ?'],
  ['S', 'Chào bạn, được ạ. Quán mở đến 21h, bạn đến báo mã đơn là nhận ngay nhé.'],
  ['C', 'Quán cho mình xin thêm hành và ít bánh phở được không?'],
  ['S', 'Được bạn nhé, quán sẽ cho thêm.'],
  ['C', 'Cảm ơn quán nhiều!'],
];
for (const o of orders.slice(0, 4)) {
  const thread = await call('GET', `/customer/orders/${o.id}/messages`, { token: kh });
  if (thread.status < 300 && thread.body.messages?.length >= 4) {
    console.log('ĐÃ CÓ  trò chuyện đơn', o.code);
    continue;
  }
  for (const [who, body] of SCRIPT) {
    const path =
      who === 'C' ? `/customer/orders/${o.id}/messages` : `/store/orders/${o.id}/messages`;
    await step(`${who === 'C' ? 'khách' : 'quán'} nhắn đơn ${o.code}`, async () =>
      must(
        await call('POST', path, { token: who === 'C' ? kh : ownerA, body: { body } }),
        'gửi tin',
      ),
    );
  }
}
console.log(
  'Xong. Mở Đơn hàng của tôi, vào chi tiết đơn của quán Phở Bò, bấm biểu tượng nhắn tin để xem. Thông báo tin nhắn mới nằm ở chuông thông báo của khách và của chủ quán.',
);
