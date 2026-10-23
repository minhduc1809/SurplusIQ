// Lấp các khoảng trống dữ liệu còn lại của quán chuthucan.hanoi@surplusiq.vn (UC 3.3.3, 3.4.3, 3.8.5, 3.10.6, 3.10.7, 3.11.2):
// lịch sử cài đặt vận hành, hóa đơn gói Pro, sự cố nhận hàng, sao kê tuần, và đủ 20 khách để có phân nhóm khách hàng.
// Chạy sau seed-test-accounts.mjs và seed-store-full.mjs. Chạy lại nhiều lần an toàn. Mật khẩu: Surplus@1.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const API = process.env.SEED_API_URL || 'http://localhost:4000';
const PASSWORD = process.env.SEED_PASSWORD || 'Surplus@1';
if (
  process.env.NODE_ENV === 'production' ||
  !/localhost|127\.0\.0\.1|192\.168\./.test(API) ||
  !/^(localhost|127\.0\.0\.1)$/.test(process.env.DB_HOST || 'localhost')
) {
  console.error('Từ chối chạy: chỉ dùng cho backend và DB dev trên máy local.');
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
    throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`);
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

const owner = must(
  await call('POST', '/auth/store/login', {
    body: { email: 'chuthucan.hanoi@surplusiq.vn', password: PASSWORD, deviceId: 'seed-gaps' },
  }),
  'đăng nhập quán',
).accessToken;
const admin = must(
  await call('POST', '/auth/admin/login', {
    body: {
      email: 'admin@surplusiq.vn',
      password: process.env.SEED_ADMIN_PASSWORD || PASSWORD,
      deviceId: 'seed-gaps',
    },
  }),
  'đăng nhập admin',
).accessToken;
const kh = must(
  await call('POST', '/auth/customer/login', {
    body: { identifier: 'kh.daydu@surplusiq.vn', password: PASSWORD, deviceId: 'seed-gaps' },
  }),
  'đăng nhập khách',
).accessToken;

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: +process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});
await db.connect();
const q = async (sql, params) => (await db.query(sql, params)).rows;

// 3.3.3 Lịch sử cài đặt vận hành: đổi rồi trả lại mức cho phép trễ để lịch sử có bản ghi thật
const settings = must(await call('GET', '/store/settings', { token: owner }), 'cài đặt');
if (
  list(must(await call('GET', '/store/settings/history', { token: owner }), 'lịch sử cài đặt'))
    .length === 0
) {
  await step('đổi thời gian cho phép trễ nhận hàng', async () =>
    must(
      await call('PUT', '/store/settings', { token: owner, body: { lateGraceMinutes: 20 } }),
      'cài đặt',
    ),
  );
  await step('đổi số suất tối đa mỗi đơn', async () =>
    must(
      await call('PUT', '/store/settings', {
        token: owner,
        body: { lateGraceMinutes: settings.lateGraceMinutes, maxQtyPerOrder: 4 },
      }),
      'cài đặt',
    ),
  );
}

// 3.4.3 Hóa đơn gói: gia hạn gói Pro để sinh hóa đơn
if (
  list(must(await call('GET', '/store/subscription/invoices', { token: owner }), 'hóa đơn'))
    .length === 0
) {
  await step('gia hạn gói Pro (sinh hóa đơn)', async () =>
    must(await call('POST', '/store/subscription/renew', { token: owner, body: {} }), 'gia hạn'),
  );
}

// 3.8.5 Sự cố nhận hàng: khách báo cho một đơn đã thanh toán của quán
const mine = list(must(await call('GET', '/customer/orders/active', { token: kh }), 'đơn đang mở'));
const paidA = mine.find((o) => o.storeId === STORE_A && o.status === 'PAID');
if (paidA) {
  const existing = list(
    (await call('GET', `/customer/orders/${paidA.id}/incidents`, { token: kh })).body,
  );
  if (existing.length === 0) {
    const inc = await step('khách báo sự cố món chưa sẵn sàng', async () =>
      must(
        await call('POST', `/customer/orders/${paidA.id}/incidents`, {
          token: kh,
          body: {
            type: 'NOT_READY',
            note: 'Mình đến đúng giờ hẹn nhưng quầy báo món chưa xong, phải chờ thêm.',
          },
        }),
        'sự cố',
      ),
    );
    const id = inc?.id ?? inc?.incident?.id;
    if (id)
      await step('cửa hàng phản hồi sự cố', async () =>
        must(
          await call('POST', `/store/incidents/${id}/respond`, {
            token: owner,
            body: {
              action: 'ACKNOWLEDGE',
              note: 'Quán xin lỗi, món sẽ xong trong 5 phút nữa, bạn vui lòng chờ giúp.',
            },
          }),
          'phản hồi',
        ),
      );
  }
}

// 3.11.2 Phân nhóm khách cần tối thiểu 20 khách: thêm khách mẫu có đơn đã nhận ở các suất đã đóng của quán
const [{ n: customers }] = await q(
  'select count(distinct o.customer_id)::int n from orders o join offers f on f.id=o.offer_id where f.store_id=$1',
  [STORE_A],
);
if (customers < 22) {
  const [{ password_hash: hash }] = await q(
    "select password_hash from users where email='kh.daydu@surplusiq.vn'",
  );
  const names = [
    'Nguyễn Văn An',
    'Trần Thị Bích',
    'Lê Quang Cường',
    'Phạm Thu Dung',
    'Hoàng Minh Đức',
    'Vũ Thanh Hà',
    'Đặng Quốc Huy',
    'Bùi Khánh Linh',
    'Ngô Anh Minh',
    'Dương Thùy Ngân',
    'Đỗ Hải Phong',
    'Lý Mai Quyên',
    'Phan Đức Thắng',
    'Võ Thị Uyên',
    'Đinh Gia Vinh',
    'Hồ Bảo Yến',
  ];
  const offers = await q(
    "select id, current_price from offers where store_id=$1 and status='CLOSED' order by pickup_start desc limit 40",
    [STORE_A],
  );
  for (let i = 0; i < names.length; i++) {
    const email = `kh.mau${String(i + 1).padStart(2, '0')}@surplusiq.vn`;
    let u = (await q('select id from users where email=$1', [email]))[0];
    if (!u) {
      [u] = await q(
        `insert into users (id, email, phone, role, status, password_hash, full_name) values ($1,$2,$3,'CUSTOMER','ACTIVE',$4,$5) returning id`,
        [randomUUID(), email, '09882' + String(10000 + i), hash, names[i]],
      );
    }
    // Mỗi khách 1 đến 5 đơn đã nhận, nhiều đơn hơn ở các khách đầu để có nhóm khách thân thiết
    const count = i < 6 ? 4 + (i % 2) : 1 + (i % 3);
    for (let k = 0; k < count; k++) {
      const offer = offers[(i * 3 + k * 2) % offers.length];
      if (!offer) continue;
      await q(
        `insert into orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status,
           hold_expires_at, paid_at, picked_up_at, created_at, updated_at)
         select $1,$2,$3,$4,f.id,1,f.current_price,0,f.current_price,'PICKED_UP',
           f.pickup_start - interval '50 minutes', f.pickup_start - interval '45 minutes', f.pickup_start + interval '30 minutes', f.pickup_start - interval '1 hour', f.pickup_start + interval '30 minutes'
         from offers f where f.id=$5`,
        [
          randomUUID(),
          'SQM' + randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase(),
          u.id,
          STORE_A,
          offer.id,
        ],
      );
    }
  }
  console.log('OK    đã thêm khách mẫu có đơn đã nhận ở quán');
}
const seg = await call('GET', '/store/marketing/segments', { token: owner });
console.log(
  'Phân nhóm khách:',
  seg.body?.isEligible ? JSON.stringify(seg.body.summary) : seg.body?.reason,
);

// 3.10.6, 3.10.7 Sao kê tuần: admin chốt sao kê tuần
await step('chốt sao kê tuần (admin)', async () =>
  must(
    await call('POST', '/jobs/statements-close-week', { token: admin, body: {} }),
    'chốt sao kê',
  ),
);
const recon = await call('GET', '/store/reports/reconciliation', { token: owner });
console.log('Đối soát hiện có:', JSON.stringify(recon.body).slice(0, 120));

// 3.15.3 Rescue Bridge: tạo bản nháp chuyển giao thực phẩm dư (gửi cho đơn vị tiếp nhận cần tổ chức đã được nền tảng duyệt)
const transfers = list(
  must(await call('GET', '/store/rescue-bridge/transfers', { token: owner }), 'chuyển giao'),
);
if (transfers.length === 0) {
  const eligible = list(
    must(
      await call('GET', '/store/rescue-bridge/eligible-offers', { token: owner }),
      'suất đủ điều kiện',
    ),
  );
  for (const o of eligible.slice(0, 2)) {
    await step('tạo bản nháp chuyển giao ' + o.itemName, async () =>
      must(
        await call('POST', '/store/rescue-bridge/transfers', {
          token: owner,
          body: {
            offerId: o.offerId,
            quantity: Math.max(1, Math.min(2, o.remainingQuantity)),
            availableAt: new Date(Date.now() + 15 * 60_000).toISOString(),
            handoverDeadline: new Date(
              Math.min(Date.now() + 5 * 3600_000, new Date(o.lotExpiresAt).getTime() - 30 * 60_000),
            ).toISOString(),
            storageNotes: 'Bảo quản mát, dùng trong 4 giờ kể từ lúc bàn giao',
            transportResponsibility: 'RECIPIENT_PICKUP',
            foodCategory: o.foodCategory,
          },
        }),
        'chuyển giao',
      ),
    );
  }
}

await db.end();
console.log(
  '\nXong. Rescue Bridge chưa có dữ liệu vì cần đơn vị tiếp nhận bên ngoài được nền tảng duyệt.',
);
