// Nạp bộ tài khoản kiểm thử có dữ liệu đầy đủ cho app khách hàng và app cửa hàng (DB dev, khu Cầu Giấy - Hà Nội).
// Chạy: node scripts/seed-test-accounts.mjs   (cần Postgres + backend dev chạy; đã chạy `npm run seed:hanoi`)
// Tạo dữ liệu qua đúng API nghiệp vụ (đặt đơn, thanh toán, quét nhận hàng, đánh giá, khiếu nại), không ghi tắt trạng thái đơn.
// Chạy lại nhiều lần an toàn: chỉ tạo phần còn thiếu. Mật khẩu mọi tài khoản: Surplus@1.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

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
const PASSWORD = 'Surplus@1';

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
  [
    'chuthucan2.hanoi@surplusiq.vn',
    '0988300004',
    'STORE_USER',
    'ACTIVE',
    'Chủ quán Bún chả Sinh Từ',
  ],
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
// Quán Bún chả Sinh Từ thuộc chủ quán thứ hai (gói Cơ bản); seed:hanoi mặc định gán cả 50 quán cho một chủ.
await q('update stores set owner_user_id=$1 where id=$2', [
  await uid('chuthucan2.hanoi@surplusiq.vn'),
  STORE_B,
]);
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
await sub('33333333-3333-3333-3333-333333333301', 'BASIC'); // Rincón Pasteur: gói Cơ bản

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
// Món tạo qua API chưa có ảnh: dùng ảnh của một món tương tự đã có trong dữ liệu 50 quán (cùng nguồn ảnh thật)
for (const [name, like] of [
  ['Phở gà ta', '%phở%'],
  ['Quẩy giòn (10 cái)', '%bánh%'],
  ['Nem rán Hà Nội (5 cái)', '%nem%'],
]) {
  await q(
    `update items set image_url = (select image_url from items where store_id <> $1 and name ilike $3 and image_url is not null order by name limit 1)
     where store_id = $1 and name = $2 and image_url is null`,
    [STORE_A, name, like],
  );
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
      body: { label: 'Công ty', latitude: 21.04732, longitude: 105.79216, radiusKm: 1 },
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

// 3c. Quản lý của quán Rincón (có sẵn từ seed:default)
const STORE_RINCON = '33333333-3333-3333-3333-333333333301';
await q(
  `insert into users (id, email, phone, role, status, password_hash, full_name)
   values ($1,'demo.quanly@surplusiq.vn','0988300010','STORE_USER','ACTIVE',$2,'Quản lý Rincón Pasteur')
   on conflict do nothing`,
  [randomUUID(), hash],
);
if ((await q('select 1 from stores where id=$1', [STORE_RINCON])).length) {
  await member(STORE_RINCON, 'demo.quanly@surplusiq.vn', 'MANAGER');
}

// 3d. Lịch sử bán 21 ngày của quán A (đã đóng nhận, có đơn đã nhận) làm nền cho Phòng mô phỏng và báo cáo.
// Mỗi ngày mỗi món một suất; số suất bán lệch nhau theo ngày và món để số liệu không phẳng.
const [{ past }] = await q(
  "select count(*)::int past from offers where store_id=$1 and pickup_start < now() - interval '1 day'",
  [STORE_A],
);
if (past < 20) {
  // Dọn phần lịch sử dở dang của lần chạy trước (nếu có) để nạp lại trọn vẹn
  await q(
    "delete from orders where offer_id in (select id from offers where store_id=$1 and pickup_start < now() - interval '1 day')",
    [STORE_A],
  );
  await q("delete from offers where store_id=$1 and pickup_start < now() - interval '1 day'", [
    STORE_A,
  ]);
  const items = await q(
    "select id, original_price from items where store_id=$1 and status='ACTIVE' order by name",
    [STORE_A],
  );
  const buyers = await q(
    "select id from users where role='CUSTOMER' and email not like 'kh.%' and status='ACTIVE' order by email limit 6",
  );
  if (items.length && buyers.length) {
    for (let day = 21; day >= 1; day--) {
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const total = 8;
        const sold = ((day * 5 + k * 3) % 7) + 1; // 1..7
        const price = Math.round((it.original_price * 0.55) / 500) * 500;
        const offerId = randomUUID();
        await q(
          `insert into offers (id, store_id, item_id, kind, total_quantity, remaining_quantity, sold_quantity,
             original_price, current_price, floor_price, pickup_start, pickup_end, expires_at, status, created_at, updated_at)
           values ($1,$2,$3,'REGULAR',$4,$5,$6,$7,$8,$9,
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '17 hours',
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '21 hours',
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '21 hours',
             'CLOSED',
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '10 hours',
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '22 hours')`,
          [
            offerId,
            STORE_A,
            it.id,
            total,
            total - sold,
            sold,
            it.original_price,
            price,
            Math.round((it.original_price * 0.4) / 500) * 500,
            String(day),
          ],
        );
        // Mỗi đơn tối đa 5 suất (ràng buộc chk_orders_quantity_range) nên tách đơn khi bán nhiều hơn
        const parts = sold > 5 ? [5, sold - 5] : [sold];
        for (let n = 0; n < parts.length; n++) {
          const buyer = buyers[(day + k + n) % buyers.length].id;
          await q(
            `insert into orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount,
               status, hold_expires_at, paid_at, picked_up_at, created_at, updated_at)
             values ($1,$2,$3,$4,$5,$6,$7,0,$8,'PICKED_UP',
               date_trunc('day', now() - ($9 || ' days')::interval) + interval '17 hours 10 minutes',
               date_trunc('day', now() - ($9 || ' days')::interval) + interval '17 hours 5 minutes',
               date_trunc('day', now() - ($9 || ' days')::interval) + interval '18 hours',
               date_trunc('day', now() - ($9 || ' days')::interval) + interval '17 hours',
               date_trunc('day', now() - ($9 || ' days')::interval) + interval '18 hours')`,
            [
              randomUUID(),
              'SQH' + randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase(),
              buyer,
              STORE_A,
              offerId,
              parts[n],
              price,
              price * parts[n],
              String(day),
            ],
          );
        }
      }
    }
  }
}

// 3e. Kịch bản Phòng mô phỏng của quán A (gói PRO): giảm 30% trên dữ liệu bán 21 ngày ở trên
const scenarios = await call('GET', '/store/rescue-lab/scenarios', { token: owner });
const scenarioList = Array.isArray(scenarios.body) ? scenarios.body : (scenarios.body?.data ?? []);
if (scenarios.status < 300 && scenarioList.length === 0) {
  const day = (d) => new Date(Date.now() - d * 86400_000).toISOString().slice(0, 10);
  const created = must(
    await call('POST', '/store/rescue-lab/scenarios', {
      token: owner,
      body: {
        title: 'Giảm 30% cho suất cuối ngày',
        objective: 'REDUCE_SURPLUS',
        dateRangeStart: day(21),
        dateRangeEnd: day(1),
        discountRatio: 0.3,
        note: 'Thử hạ giá thêm 30% cho các suất còn dư sau 19h',
      },
    }),
    'tạo kịch bản mô phỏng',
  );
  // Tạo kịch bản đã tự chạy mô phỏng trên dữ liệu bán ở trên (trạng thái COMPLETED).
  if (created.latestVersion?.simulationStatus !== 'COMPLETED')
    console.warn('Kịch bản mô phỏng chưa hoàn tất:', created.latestVersion?.simulationStatus);
}

// Làm mới các suất đang mở hôm nay theo khung giờ cứu món chuẩn 21:30 - 23:30
await q(
  `update offers 
   set pickup_start = (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '21 hours 30 minutes') at time zone 'Asia/Bangkok',
       pickup_end = (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '23 hours 30 minutes') at time zone 'Asia/Bangkok',
       expires_at = (date_trunc('day', now() at time zone 'Asia/Bangkok') + interval '23 hours 30 minutes') at time zone 'Asia/Bangkok'
   where status = 'OPEN'`,
);

// Nạp dữ liệu hồ sơ pháp lý và hợp đồng scan KYC cho Admin duyệt
spawnSync('node scripts/seed-kyc-contracts.mjs', { stdio: 'inherit', shell: true });

// ---------- 4. Tóm tắt ----------

const rows = await q(
  `select u.email, u.role, coalesce(m.permission::text,'-') perm, coalesce(s.name,'-') store, coalesce(sub.plan::text,'-') plan,
          (select count(*) from orders o where o.customer_id=u.id)::int orders
   from users u left join store_members m on m.user_id=u.id left join stores s on s.id=m.store_id left join subscriptions sub on sub.store_id=s.id
   where u.email like 'kh.%@surplusiq.vn' or u.email like '%hanoi@surplusiq.vn' or u.email like 'chuthucan.choduyet%'
      or u.email in ('customer@surplusiq.vn','owner@rincon.vn','demo.quanly@surplusiq.vn')
   order by u.role, u.email`,
);
console.table(rows);
console.log(`Mật khẩu chung: ${PASSWORD}`);
await db.end();
