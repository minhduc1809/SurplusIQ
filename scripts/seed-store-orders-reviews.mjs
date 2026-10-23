// Bổ sung dữ liệu cho UC 3.8 và 3.9 của quán chuthucan.hanoi@surplusiq.vn: đơn ở đủ trạng thái (thêm đơn chờ thanh toán),
// nhiều đánh giá nhiều mức sao từ các khách mẫu, một phần có phản hồi của quán và một phần chưa.
// Chạy sau seed-store-uc-gaps.mjs (đã có khách mẫu kh.mau01..16). Chạy lại nhiều lần an toàn. Mật khẩu: Surplus@1.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const API = process.env.SEED_API_URL || 'http://localhost:4000';
const PASSWORD = process.env.SEED_PASSWORD || 'Surplus@1';
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
    throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 140)}`);
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
const list = (r) => (Array.isArray(r) ? r : (r?.data ?? r?.items ?? []));
const STORE_A = 'a1000000-0000-4000-8000-000000000001';
const login = async (path, id) =>
  must(
    await call('POST', path, {
      body: path.includes('customer')
        ? { identifier: id, password: PASSWORD, deviceId: 'seed-orders' }
        : { email: id, password: PASSWORD, deviceId: 'seed-orders' },
    }),
    'đăng nhập ' + id,
  ).accessToken;

const owner = await login('/auth/store/login', 'chuthucan.hanoi@surplusiq.vn');
const kh = await login('/auth/customer/login', 'kh.daydu@surplusiq.vn');

// 3.8.1, 3.8.2: một đơn đang chờ thanh toán của quán (để có đủ trạng thái đơn)
const active = list(
  must(await call('GET', '/customer/orders/active', { token: kh }), 'đơn đang mở'),
);
if (!active.some((o) => o.storeId === STORE_A && o.status === 'PENDING_PAYMENT')) {
  const deals = list(
    must(
      await call('GET', '/customer/deals?latitude=21.0458&longitude=105.795&radiusKm=5&limit=50', {
        token: kh,
      }),
      'deal',
    ),
  );
  const d = deals.find(
    (x) => x.storeId === STORE_A && (x.remainingQuantity ?? x.remainingStock ?? 1) > 0,
  );
  if (d)
    await step('khách giữ suất chưa thanh toán', async () =>
      must(
        await call('POST', '/customer/orders', { token: kh, body: { offerId: d.id, quantity: 1 } }),
        'giữ suất',
      ),
    );
}

// Bảo đảm quán có suất đang mở để khách đặt trong hôm nay (suất cũ có thể đã hết hàng hoặc hết khung nhận)
{
  const openNow = list(must(await call('GET', '/store/offers', { token: owner }), 'suất')).filter(
    (o) =>
      o.status === 'OPEN' &&
      o.remainingQuantity > 0 &&
      new Date(o.pickupEnd) > new Date(Date.now() + 90 * 60_000),
  );
  if (openNow.length === 0) {
    const items = list(
      must(await call('GET', '/store/items?status=ACTIVE&limit=5', { token: owner }), 'món'),
    );
    for (const it of items.slice(0, 2)) {
      await step('mở suất mới cho ' + it.name, async () =>
        must(
          await call('POST', '/store/offers', {
            token: owner,
            body: {
              itemId: it.id,
              totalQuantity: 6,
              originalPrice: it.originalPrice,
              currentPrice: Math.max(Math.round((it.originalPrice * 0.6) / 500) * 500, 500),
              pickupStart: new Date(Date.now() - 10 * 60_000).toISOString(),
              pickupEnd: new Date(Date.now() + 170 * 60_000).toISOString(),
              status: 'OPEN',
            },
          }),
          'tạo suất',
        ),
      );
    }
  }
}

// 3.8.4 Lịch hẹn nhận hàng: hai đơn đã thanh toán có giờ hẹn nhận trong hôm nay
const sched = list(must(await call('GET', '/store/pickup-schedule', { token: owner }), 'lịch hẹn'));
if (sched.length === 0) {
  const deals2 = list(
    must(
      await call('GET', '/customer/deals?latitude=21.0458&longitude=105.795&radiusKm=5&limit=50', {
        token: kh,
      }),
      'deal',
    ),
  );
  for (const d of deals2
    .filter((x) => x.storeId === STORE_A && (x.remainingQuantity ?? x.remainingStock ?? 1) > 0)
    .slice(0, 2)) {
    const o = await step('đặt và thanh toán đơn có giờ hẹn', async () => {
      const ord = must(
        await call('POST', '/customer/orders', { token: kh, body: { offerId: d.id, quantity: 1 } }),
        'giữ suất',
      );
      const pay = must(
        await call('POST', `/customer/orders/${ord.id}/payments`, { token: kh, body: {} }),
        'thanh toán',
      );
      must(
        await call('POST', `/dev/payments/${pay.transactionId || pay.id}/confirm`, { body: {} }),
        'xác nhận',
      );
      return ord;
    });
    if (o)
      await step('đặt giờ hẹn nhận', async () => {
        const start = Math.max(
          Date.now() + 20 * 60_000,
          new Date(d.pickupStart ?? Date.now()).getTime(),
        );
        return must(
          await call('PATCH', `/customer/orders/${o.id}/pickup-slot`, {
            token: kh,
            body: { pickupSlot: new Date(start).toISOString() },
          }),
          'giờ hẹn',
        );
      });
  }
}

// 3.9.3: đánh giá nhiều mức sao từ khách mẫu, quán trả lời một nửa
const COMMENTS = {
  5: [
    'Phở đậm đà, nhận hàng nhanh, quán nhiệt tình.',
    'Suất cứu món rất đáng tiền, sẽ ủng hộ tiếp.',
    'Đóng gói gọn gàng, món còn nóng khi về tới nhà.',
  ],
  4: ['Món ngon, chỉ hơi chờ lâu một chút lúc nhận.', 'Ổn áp, phần ăn đủ no, giá hợp lý.'],
  3: ['Món bình thường, giống mô tả nhưng nước hơi nhạt.'],
  2: ['Thịt hơi ít so với mong đợi, mong quán cân đủ phần hơn.'],
  1: ['Đến nhận bị chờ khá lâu, món nguội khi nhận.'],
};
const ratings = [5, 5, 4, 5, 3, 4, 2, 5, 1, 4, 5, 3];
let made = 0;
for (let i = 0; i < ratings.length; i++) {
  const email = `kh.mau${String(i + 1).padStart(2, '0')}@surplusiq.vn`;
  const tok = await login('/auth/customer/login', email).catch(() => null);
  if (!tok) continue;
  const hist = list((await call('GET', '/customer/orders/history', { token: tok })).body).filter(
    (o) => o.status === 'PICKED_UP' && o.storeId === STORE_A,
  );
  const reviewed = new Set(
    list((await call('GET', '/customer/reviews', { token: tok })).body).map((r) => r.orderId),
  );
  const o = hist.find((x) => !reviewed.has(x.id));
  if (!o) continue;
  const pool = COMMENTS[ratings[i]];
  const r = await call('POST', `/customer/orders/${o.id}/reviews`, {
    token: tok,
    body: { rating: ratings[i], comment: pool[i % pool.length] },
  });
  if (r.status < 300) made++;
  else if (i === 0) console.log('BỎ QUA đánh giá đầu tiên -', JSON.stringify(r.body).slice(0, 160));
}
console.log(`OK    đã gửi ${made} đánh giá mới từ khách mẫu`);

const reviews = list(
  must(await call('GET', '/store/reviews', { token: owner }), 'đánh giá của quán'),
);
let replied = 0;
// Giữ lại 5 đánh giá mới nhất chưa phản hồi để còn thao tác trả lời trên app
const unreplied = reviews.filter((x) => !x.storeReply);
for (const r of unreplied.slice(5)) {
  const text =
    r.rating >= 4
      ? 'Cảm ơn bạn đã ủng hộ quán! Quán sẽ tiếp tục giữ chất lượng.'
      : 'Quán xin lỗi vì trải nghiệm chưa tốt và sẽ rút kinh nghiệm để phục vụ bạn tốt hơn.';
  const ok = await step(`phản hồi đánh giá ${r.rating} sao`, async () =>
    must(
      await call('POST', `/store/reviews/${r.id}/reply`, { token: owner, body: { reply: text } }),
      'phản hồi',
    ),
  );
  if (ok) replied++;
}
console.log(
  `Tổng đánh giá: ${reviews.length}, chưa phản hồi: ${reviews.filter((x) => !x.storeReply).length - replied}`,
);
