// Nạp dữ liệu hậu mãi cho kh.daydu@surplusiq.vn (mục 2.6.1 đến 2.6.8): khiếu nại ở các trạng thái chờ xử lý, đã hoàn tiền, bị từ chối,
// ảnh bổ sung bằng chứng, đánh giá (sửa, ẩn), báo cáo vi phạm, yêu cầu hỗ trợ có trả lời của nền tảng.
// Chạy: node scripts/seed-complaints-kh.mjs  (cần backend dev chạy, đã chạy seed-test-accounts.mjs và seed-reorder-history.mjs). Chạy lại an toàn.
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
const login = async (path, id) =>
  must(
    await call('POST', path, {
      body: path.includes('customer')
        ? { identifier: id, password: PASSWORD, deviceId: 'seed-after' }
        : { email: id, password: PASSWORD, deviceId: 'seed-after' },
    }),
    'đăng nhập ' + id,
  ).accessToken;
const list = (r) => (Array.isArray(r) ? r : (r?.data ?? r?.items ?? []));

const kh = await login('/auth/customer/login', 'kh.daydu@surplusiq.vn');
const ownerA = await login('/auth/store/login', 'chuthucan.hanoi@surplusiq.vn');
const ownerB = await login('/auth/store/login', 'chuthucan2.hanoi@surplusiq.vn');
const STORE_B = 'a1000000-0000-4000-8000-000000000002';
const ownerOf = (storeId) => (storeId === STORE_B ? ownerB : ownerA);

const history = list(
  must(await call('GET', '/customer/orders/history', { token: kh }), 'lịch sử đơn'),
);
const picked = history.filter((o) => o.status === 'PICKED_UP');
const complaints = list(
  must(await call('GET', '/customer/complaints', { token: kh }), 'khiếu nại'),
);
const reviews = list(must(await call('GET', '/customer/reviews', { token: kh }), 'đánh giá'));
const complained = new Set(complaints.map((c) => c.orderId));
const free = picked.filter((o) => !complained.has(o.id));
console.log(
  `Đơn đã nhận: ${picked.length}, đơn chưa khiếu nại: ${free.length}, khiếu nại hiện có: ${complaints.length}`,
);

// 2.6.1 Gửi khiếu nại: ba khiếu nại với ba kết cục khác nhau
const plan = [
  {
    category: 'Thức ăn ôi thiu / biến chất (An toàn thực phẩm)',
    description:
      'Nước dùng có mùi chua và hơi nhớt khi mở túi, mình không dám dùng nên chụp lại làm bằng chứng.',
    outcome: 'ACCEPT',
  },
  {
    category: 'Thiếu số lượng / trọng lượng',
    description:
      'Suất nhận được chỉ có một nửa phần thịt so với mô tả trên ứng dụng, thiếu cả nước chấm đi kèm.',
    outcome: 'REJECT',
  },
  {
    category: 'Không đúng loại món như mô tả',
    description: 'Mình đặt suất bún chả nhưng quán đưa phần bún riêu, khác hẳn món trong mô tả.',
    outcome: 'PENDING',
  },
];
const created = [];
for (let i = 0; i < plan.length && i < free.length; i++) {
  const o = free[i];
  const c = await step(`gửi khiếu nại đơn ${o.code}`, async () =>
    must(
      await call('POST', `/customer/orders/${o.id}/complaints`, {
        token: kh,
        body: {
          category: plan[i].category,
          description: plan[i].description,
          imageUrls: o.imageUrl ? [o.imageUrl] : [],
        },
      }),
      'khiếu nại',
    ),
  );
  if (c) created.push({ c, o, outcome: plan[i].outcome });
}

// 2.6.2 Theo dõi và bổ sung bằng chứng; cửa hàng xử lý hai khiếu nại đầu
for (const { c, o, outcome } of created) {
  const id = c.id ?? c.complaint?.id;
  if (!id) continue;
  if (outcome === 'ACCEPT') {
    await step('cửa hàng chấp nhận hoàn tiền', async () =>
      must(
        await call('POST', `/store/complaints/${id}/resolve`, {
          token: ownerOf(o.storeId),
          body: { note: 'Quán xin lỗi bạn và đồng ý hoàn tiền đơn này.' },
        }),
        'chấp nhận',
      ),
    );
  } else if (outcome === 'REJECT') {
    await step('cửa hàng từ chối khiếu nại', async () =>
      must(
        await call('POST', `/store/complaints/${id}/reject`, {
          token: ownerOf(o.storeId),
          body: {
            reason:
              'Suất đã được cân đủ định lượng và bàn giao trước mặt khách tại quầy theo đúng mô tả.',
          },
        }),
        'từ chối',
      ),
    );
  } else {
    await step('bổ sung ảnh bằng chứng cho khiếu nại đang chờ', async () =>
      must(
        await call('POST', `/customer/complaints/${id}/attachments`, {
          token: kh,
          body: { photoUrls: o.imageUrl ? [o.imageUrl] : [] },
        }),
        'bổ sung',
      ),
    );
  }
}

// 2.6.3, 2.6.4 Đánh giá: sửa một đánh giá, gửi thêm cho đơn chưa có, ẩn một đánh giá cũ
const reviewed = new Set(reviews.map((r) => r.orderId));
const toReview = picked.find((o) => !reviewed.has(o.id));
if (toReview) {
  await step('gửi đánh giá cho đơn chưa đánh giá', async () =>
    must(
      await call('POST', `/customer/orders/${toReview.id}/reviews`, {
        token: kh,
        body: { rating: 4, comment: 'Món nóng, đóng gói gọn, nhận hàng nhanh. Sẽ ủng hộ tiếp.' },
      }),
      'đánh giá',
    ),
  );
}
if (reviews[0]) {
  await step('sửa một đánh giá', async () =>
    must(
      await call('PUT', `/customer/reviews/${reviews[0].id}`, {
        token: kh,
        body: { rating: 5, comment: 'Đã ăn lại lần hai, quán giữ chất lượng rất ổn định.' },
      }),
      'sửa đánh giá',
    ),
  );
}

// 2.6.5 Báo cáo vi phạm: thêm một báo cáo cho suất ăn
const deal = list(
  must(
    await call('GET', '/customer/deals?latitude=21.0458&longitude=105.795&radiusKm=5&limit=5', {
      token: kh,
    }),
    'deal',
  ),
)[0];
if (deal) {
  await step('báo cáo vi phạm một suất ăn', async () =>
    must(
      await call('POST', '/customer/reports', {
        token: kh,
        body: {
          targetType: 'DEAL',
          targetId: deal.id,
          reason: 'Mô tả suất ghi còn nóng nhưng ảnh minh họa không đúng với món thực tế.',
        },
      }),
      'báo cáo suất',
    ),
  );
}

// 2.6.7 Nền tảng trả lời yêu cầu hỗ trợ (chưa có API cho nhân viên nền tảng nên ghi tin trả lời trực tiếp vào DB dev)
const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: +process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});
await db.connect();
try {
  const [{ id: adminId }] = (await db.query("select id from users where role='ADMIN' limit 1"))
    .rows;
  const tickets = (
    await db.query(
      "select t.id, t.subject from support_tickets t join users u on u.id=t.user_id where u.email='kh.daydu@surplusiq.vn' and t.status='OPEN' order by t.created_at limit 1",
    )
  ).rows;
  for (const t of tickets) {
    await db.query(
      'insert into support_messages (id, ticket_id, sender_id, message) values ($1,$2,$3,$4)',
      [
        randomUUID(),
        t.id,
        adminId,
        'Cảm ơn bạn đã liên hệ. Bên mình đã kiểm tra giao dịch và cập nhật lại trạng thái đơn, bạn vui lòng tải lại màn hình đơn hàng nhé.',
      ],
    );
    await db.query("update support_tickets set status='ANSWERED', updated_at=now() where id=$1", [
      t.id,
    ]);
    console.log('OK    nền tảng trả lời yêu cầu hỗ trợ:', t.subject);
  }
} finally {
  await db.end();
}

console.log(
  '\nXong. Mở Hồ sơ > Khiếu nại của tôi, Đánh giá của tôi, Yêu cầu hỗ trợ để xem dữ liệu.',
);
