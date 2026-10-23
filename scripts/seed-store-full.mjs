// Bổ sung dữ liệu còn thiếu cho tài khoản chủ quán chuthucan.hanoi@surplusiq.vn (quán gói PRO) để đủ dữ liệu trên mọi màn của app chủ cửa hàng.
// Nền đã có từ seed-test-accounts.mjs: món, suất, đơn 21 ngày, khiếu nại, đánh giá, đợt mua chung, ưu đãi, túi bất ngờ, thông báo.
// Script này thêm: yêu cầu hỗ trợ (có trả lời của nền tảng), chiến dịch, sự kiện đặc biệt, ngày đóng cửa, phản hồi đánh giá, hội thoại trợ lý AI.
// Chạy: node scripts/seed-store-full.mjs  (cần backend dev). Chạy lại nhiều lần an toàn. Mật khẩu: Surplus@1.
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
const day = (n) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

const owner = must(
  await call('POST', '/auth/store/login', {
    body: {
      email: 'chuthucan.hanoi@surplusiq.vn',
      password: PASSWORD,
      deviceId: 'seed-store-full',
    },
  }),
  'đăng nhập',
).accessToken;
const get = async (p) => list(must(await call('GET', p, { token: owner }), p));

// Yêu cầu hỗ trợ của cửa hàng
if ((await get('/store/support-tickets')).length < 2) {
  await step('gửi yêu cầu hỗ trợ về đối soát', async () =>
    must(
      await call('POST', '/store/support-tickets', {
        token: owner,
        body: {
          subject: 'Sao kê tuần chưa khớp số đơn đã nhận',
          message:
            'Số đơn đã nhận trong tuần trên báo cáo nhiều hơn sao kê đối soát 2 đơn, nhờ nền tảng kiểm tra giúp.',
          category: 'PAYMENT',
        },
      }),
      'tạo yêu cầu',
    ),
  );
  await step('gửi yêu cầu hỗ trợ về ứng dụng', async () =>
    must(
      await call('POST', '/store/support-tickets', {
        token: owner,
        body: {
          subject: 'Cần thêm bộ lọc theo khung giờ ở danh sách đơn',
          message:
            'Mong ứng dụng cho lọc đơn theo khung giờ nhận để quầy sắp xếp nhanh hơn vào giờ cao điểm.',
          category: 'OTHER',
        },
      }),
      'tạo yêu cầu',
    ),
  );
}

// Chiến dịch thông báo
if ((await get('/store/marketing/campaigns')).length < 2) {
  await step('tạo chiến dịch thông báo khách thân thiết', async () =>
    must(
      await call('POST', '/store/marketing/campaigns', {
        token: owner,
        body: {
          title: 'Phở nóng giờ vàng, giảm sâu từ 17h',
          content:
            'Quán vừa mở thêm suất phở bò nóng với giá cứu món, nhận trong khung 17h đến 21h ngày mai.',
          target: 'LOYAL',
          scheduledAt: day(1) + 'T03:00:00.000Z',
        },
      }),
      'chiến dịch',
    ),
  );
  await step('tạo chiến dịch gửi tất cả khách', async () =>
    must(
      await call('POST', '/store/marketing/campaigns', {
        token: owner,
        body: {
          title: 'Cuối tuần có đợt mua chung phở',
          content: 'Đăng ký nhu cầu trong ứng dụng, quán sẽ chốt giá tốt khi đủ số lượng.',
          target: 'ALL',
          scheduledAt: day(2) + 'T04:00:00.000Z',
        },
      }),
      'chiến dịch',
    ),
  );
}

// Sự kiện đặc biệt (làm dữ liệu cho dự báo) và ngày đóng cửa
if ((await get('/store/special-events')).length < 2) {
  await step('thêm sự kiện đặc biệt ngày mưa', async () =>
    must(
      await call('POST', '/store/special-events', {
        token: owner,
        body: { date: day(2), type: 'NGÀY MƯA', impactFactor: 0.8 },
      }),
      'sự kiện',
    ),
  );
  await step('thêm sự kiện đặc biệt lễ hội', async () =>
    must(
      await call('POST', '/store/special-events', {
        token: owner,
        body: { date: day(6), type: 'LỄ HỘI', impactFactor: 1.3 },
      }),
      'sự kiện',
    ),
  );
}
if ((await get('/store/closures')).length < 2) {
  await step('thêm ngày đóng cửa', async () =>
    must(
      await call('POST', '/store/closures', {
        token: owner,
        body: { date: day(12), type: 'CLOSED' },
      }),
      'đóng cửa',
    ),
  );
  await step('thêm ngày làm giờ đặc biệt', async () =>
    must(
      await call('POST', '/store/closures', {
        token: owner,
        body: { date: day(9), type: 'SPECIAL_HOURS', openHours: { open: '08:00', close: '12:00' } },
      }),
      'giờ đặc biệt',
    ),
  );
}

// Phản hồi các đánh giá chưa trả lời
for (const r of await get('/store/reviews')) {
  if (!r.reply && !r.storeReply) {
    await step('phản hồi đánh giá', async () =>
      must(
        await call('POST', `/store/reviews/${r.id}/reply`, {
          token: owner,
          body: {
            reply: 'Cảm ơn bạn đã ủng hộ quán! Quán sẽ tiếp tục giữ chất lượng và phục vụ tốt hơn.',
          },
        }),
        'phản hồi',
      ),
    );
  }
}

// Hội thoại với trợ lý AI (cần khóa Gemini; không có thì bỏ qua)
await step('hỏi trợ lý AI về doanh thu', async () =>
  must(
    await call('POST', '/store/ai/chat', {
      token: owner,
      body: { message: 'Tuần này món nào bán chậm nhất và nên giảm giá bao nhiêu?' },
    }),
    'trợ lý AI',
  ),
);

// Nền tảng trả lời yêu cầu hỗ trợ đầu tiên (chưa có API cho nhân viên nền tảng nên ghi thẳng vào DB dev)
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
  const open = (
    await db.query(
      "select t.id, t.subject from support_tickets t join users u on u.id=t.user_id where u.email='chuthucan.hanoi@surplusiq.vn' and t.status='OPEN' order by t.created_at limit 1",
    )
  ).rows;
  for (const t of open) {
    await db.query(
      'insert into support_messages (id, ticket_id, sender_id, message) values ($1,$2,$3,$4)',
      [
        randomUUID(),
        t.id,
        adminId,
        'Nền tảng đã nhận thông tin, bộ phận đối soát sẽ kiểm tra và phản hồi chi tiết trong 24 giờ làm việc.',
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
  '\nXong. Chưa có dữ liệu cho: chuyển giao Rescue Bridge, hóa đơn gói dịch vụ, sao kê đối soát tuần (do các tác vụ định kỳ hoặc đối tác bên ngoài tạo ra).',
);
