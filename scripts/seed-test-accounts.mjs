// Nạp bộ tài khoản kiểm thử có dữ liệu đầy đủ cho app khách hàng và app cửa hàng (DB dev, khu Cầu Giấy - Hà Nội).
// Chạy: node scripts/seed-test-accounts.mjs   (cần Postgres + backend dev chạy; đã chạy `npm run seed:hanoi`)
// Tạo dữ liệu qua đúng API nghiệp vụ (đặt đơn, thanh toán, quét nhận hàng, đánh giá, khiếu nại), không ghi tắt trạng thái đơn.
// Chạy lại nhiều lần an toàn: chỉ tạo phần còn thiếu. Mật khẩu mọi tài khoản: 123456.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

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
const PASSWORD = '123456';

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: +process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: DB,
});
await db.connect();
const q = async (sql, params) => (await db.query(sql, params)).rows;

const STORE_A = 'a1000000-0000-4000-8000-000000000001'; // Phở Bò Gia Truyền Cụ Chiêu
const STORE_B = 'a1000000-0000-4000-8000-000000000002'; // Bún Chả Sinh Từ
const STORE_PENDING = 'a1000000-0000-4000-8000-0000000000e1';

// ---------- 1. Tài khoản ----------
const [{ password_hash: hash }] = await q(
  "select password_hash from users where email='chuthucan.hanoi@surplusiq.vn'",
);
const USERS = [
  // email, phone, role, status, họ tên
  ['kh.daydu@surplusiq.vn', '0988200001', 'CUSTOMER', 'ACTIVE', 'Nguyễn Hà My'],
  ['kh.moi@surplusiq.vn', '0988200002', 'CUSTOMER', 'ACTIVE', 'Trần Quốc Bảo'],
  ['kh.bikhoa@surplusiq.vn', '0988200003', 'CUSTOMER', 'ACTIVE', 'Lê Thu Trang'],
  ['kh.choxoa@surplusiq.vn', '0988200004', 'CUSTOMER', 'PENDING_DELETE', 'Phạm Minh Khôi'],
  ['kh.2fa@surplusiq.vn', '0988200005', 'CUSTOMER', 'ACTIVE', 'Đỗ Gia Hân'],
  ['quanly.hanoi@surplusiq.vn', '0988300001', 'STORE_USER', 'ACTIVE', 'Vũ Thanh Tùng'],
  ['quay.hanoi@surplusiq.vn', '0988300002', 'STORE_USER', 'ACTIVE', 'Ngô Bích Ngọc'],
  ['chuthucan.choduyet@surplusiq.vn', '0988300003', 'STORE_USER', 'ACTIVE', 'Hoàng Đức Anh'],
];
for (const [email, phone, role, status, fullName] of USERS) {
  await q(
    `insert into users (id, email, phone, role, status, password_hash, full_name)
     values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing`,
    [randomUUID(), email, phone, role, status, hash, fullName],
  );
}
await q(
  "update users set full_name='Chủ quán Phở Cụ Chiêu' where email='chuthucan.hanoi@surplusiq.vn' and full_name is null",
);
await q(
  "update users set full_name='Chủ quán Bún chả Sinh Từ' where email='chuthucan2.hanoi@surplusiq.vn' and full_name is null",
);
await q(
  "update users set status='PENDING_DELETE', delete_requested_at=coalesce(delete_requested_at, now()) where email='kh.choxoa@surplusiq.vn'",
);
await q("update users set two_factor_enabled=true where email='kh.2fa@surplusiq.vn'");
await q(
  `insert into order_locks (customer_id, locked_until)
   select id, now() + interval '5 days' from users where email='kh.bikhoa@surplusiq.vn'
   on conflict (customer_id) do update set locked_until = excluded.locked_until`,
);

// ---------- 2. Cửa hàng, nhân sự, gói dịch vụ ----------
const uid = async (email) => (await q('select id from users where email=$1', [email]))[0].id;
await q(
  `insert into stores (id, owner_user_id, name, address, location, phone, status, is_demo, trial_used)
   values ($1,$2,'Quán Chờ Duyệt (tài khoản thử)','Số 1 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', ST_SetSRID(ST_MakePoint(105.7826, 21.0333),4326),'0988300003','PENDING_VERIFY',true,false)
   on conflict (id) do nothing`,
  [STORE_PENDING, await uid('chuthucan.choduyet@surplusiq.vn')],
);
const member = (store, email, permission) =>
  uid(email).then((u) =>
    q(
      `insert into store_members (store_id, user_id, permission, status)
       values ($1,$2,$3,'ACTIVE') on conflict do nothing`,
      [store, u, permission],
    ),
  );
await member(STORE_A, 'chuthucan.hanoi@surplusiq.vn', 'OWNER');
await member(STORE_A, 'quanly.hanoi@surplusiq.vn', 'MANAGER');
await member(STORE_A, 'quay.hanoi@surplusiq.vn', 'COUNTER');
await member(STORE_B, 'chuthucan2.hanoi@surplusiq.vn', 'OWNER');
await member(STORE_PENDING, 'chuthucan.choduyet@surplusiq.vn', 'OWNER');
const sub = (store, plan) =>
  q(
    `insert into subscriptions (store_id, plan, status, period_start, period_end)
     values ($1,$2,'ACTIVE', now(), now() + interval '30 days')
     on conflict (store_id) do update set plan=excluded.plan, status='ACTIVE', period_end = now() + interval '30 days'`,
    [store, plan],
  );
await sub(STORE_A, 'PRO');
await sub(STORE_B, 'BASIC');

// ---------- 3. Dữ liệu qua API ----------
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
    throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body;
};
const login = async (path, id, device) =>
  must(
    await call('POST', path, {
      body: path.includes('customer')
        ? { identifier: id, password: PASSWORD, deviceId: device }
        : { email: id, password: PASSWORD, deviceId: device },
    }),
    'đăng nhập ' + id,
  ).accessToken;
const owner = await login('/auth/store/login', 'chuthucan.hanoi@surplusiq.vn', 'seed-A');
const owner2 = await login('/auth/store/login', 'chuthucan2.hanoi@surplusiq.vn', 'seed-B');
const kh = await login('/auth/customer/login', 'kh.daydu@surplusiq.vn', 'seed-kh');

// 3a. Món và suất của quán A (gói PRO) để app cửa hàng có dữ liệu đa dạng
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const MENU_A = [
  ['Phở gà ta', 'Món chính', 60000, 36000, 'Suất Phở gà ta chan nước dùng, ăn trong ngày'],
  ['Quẩy giòn (10 cái)', 'Khác', 30000, 15000, 'Quẩy chiên giòn ăn kèm phở'],
  ['Nem rán Hà Nội (5 cái)', 'Món chính', 50000, 27500, 'Nem rán nhân thịt, miến, mộc nhĩ'],
];
const offersA =
  must(await call('GET', '/store/offers?limit=100', { token: owner }), 'danh sách suất').data ?? [];
const openA = offersA.filter((o) => o.status === 'OPEN').length;
const byTitle = {};
if (openA < 4) {
  for (const [name, category, original, price] of MENU_A) {
    const item = must(
      await call('POST', '/store/items', {
        token: owner,
        body: { name, category, originalPrice: original, standardShelfLifeHours: 12 },
      }),
      'tạo món ' + name,
    );
    const offer = must(
      await call('POST', '/store/offers', {
        token: owner,
        body: {
          itemId: item.id,
          totalQuantity: 6,
          originalPrice: original,
          currentPrice: price,
          pickupStart: iso(-10 * 60_000),
          pickupEnd: iso(8 * 3600_000),
        },
      }),
      'tạo suất ' + name,
    );
    byTitle[name] = offer;
  }
}
const deals = must(
  await call('GET', '/customer/deals?latitude=21.0458&longitude=105.795&radiusKm=2&limit=50'),
  'danh sách deal',
).data;
const dealOf = (part) => deals.find((d) => d.storeName.includes(part) || d.title.includes(part));

// 3b. Khách đầy đủ dữ liệu: yêu thích, địa điểm, dị ứng, đơn đủ trạng thái, đánh giá, khiếu nại
await call('PUT', '/customer/profile', { token: kh, body: { fullName: 'Nguyễn Hà My' } });
for (const s of [
  STORE_A,
  STORE_B,
  'a1000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000004',
]) {
  await call('POST', `/customer/favorites/${s}`, { token: kh });
}
const places = await call('GET', '/customer/saved-places', { token: kh });
if ((Array.isArray(places.body) ? places.body : (places.body?.data ?? [])).length === 0) {
  must(
    await call('POST', '/customer/saved-places', {
      token: kh,
      body: { label: 'Nhà riêng', latitude: 21.0713, longitude: 105.7935, radiusKm: 2 },
    }),
    'địa điểm Nhà riêng',
  );
  must(
    await call('POST', '/customer/saved-places', {
      token: kh,
      body: { label: 'Công ty', latitude: 21.0458, longitude: 105.795, radiusKm: 1 },
    }),
    'địa điểm Công ty',
  );
}
must(
  await call('PUT', '/customer/dietary-profile', {
    token: kh,
    body: { allergens: ['đậu phộng'], excludedItems: [] },
  }),
  'hồ sơ dị ứng',
);

const [{ n }] = await q(
  "select count(*)::int n from orders o join users u on u.id=o.customer_id where u.email='kh.daydu@surplusiq.vn'",
);
if (n < 5) {
  const plan = [
    {
      deal: dealOf('Phở Bò'),
      by: owner,
      finish: 'pickup',
      stars: 5,
      comment: 'Nước dùng đậm đà, nhận hàng nhanh.',
    },
    { deal: dealOf('Phở gà'), by: owner, finish: 'pickup', stars: 4, complaint: true },
    {
      deal: dealOf('Sinh Từ'),
      by: owner2,
      finish: 'pickup',
      stars: 5,
      comment: 'Bún chả thơm, thịt nướng vừa.',
    },
    { deal: dealOf('Quẩy'), finish: 'paid' },
    { deal: dealOf('Nem rán'), by: owner, finish: 'store-cancel' },
    { deal: dealOf('Trà'), finish: 'paid' },
  ].filter((p) => p.deal);
  for (const p of plan) {
    const o = must(
      await call('POST', '/customer/orders', {
        token: kh,
        body: { offerId: p.deal.id, quantity: 1 },
      }),
      'giữ chỗ ' + p.deal.storeName,
    );
    const pay = must(
      await call('POST', `/customer/orders/${o.id}/payments`, { token: kh, body: {} }),
      'tạo thanh toán',
    );
    must(
      await call('POST', `/dev/payments/${pay.transactionId || pay.id}/confirm`, { body: {} }),
      'xác nhận thanh toán',
    );
    if (p.finish === 'pickup') {
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
      must(
        await call('POST', `/customer/orders/${o.id}/reviews`, {
          token: kh,
          body: { rating: p.stars, ...(p.comment ? { comment: p.comment } : {}) },
        }),
        'đánh giá',
      );
      if (p.complaint) {
        must(
          await call('POST', `/customer/orders/${o.id}/complaints`, {
            token: kh,
            body: {
              category: 'Khác',
              description: 'Suất phở ít thịt hơn mô tả trên ứng dụng, mong quán xem lại.',
            },
          }),
          'khiếu nại',
        );
      }
    }
    if (p.finish === 'store-cancel') {
      must(
        await call('POST', `/store/orders/${o.id}/cancel`, {
          token: p.by,
          body: { reason: 'Quán hết nguyên liệu' },
        }),
        'cửa hàng hủy đơn',
      );
    }
  }
}

// ---------- 4. Tóm tắt ----------
const rows = await q(
  `select u.email, u.role, coalesce(m.permission::text,'-') perm, coalesce(s.name,'-') store, coalesce(sub.plan::text,'-') plan,
          (select count(*) from orders o where o.customer_id=u.id)::int orders
   from users u left join store_members m on m.user_id=u.id left join stores s on s.id=m.store_id left join subscriptions sub on sub.store_id=s.id
   where u.email like 'kh.%@surplusiq.vn' or u.email like '%hanoi@surplusiq.vn' or u.email like 'chuthucan.choduyet%'
   order by u.role, u.email`,
);
console.table(rows);
console.log(`Mật khẩu chung: ${PASSWORD}`);
await db.end();
