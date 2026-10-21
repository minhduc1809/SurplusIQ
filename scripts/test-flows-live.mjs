// Kiểm thử luồng nghiệp vụ end-to-end qua API thật của backend LOCAL (khách, cửa hàng, admin).
// Không seed, không sửa dữ liệu có sẵn: tự tạo suất + đơn riêng rồi hủy/hoàn tất để dọn.
// Chạy: npm run test:flows:live   (cần backend chạy ở FLOWS_API_URL, mặc định http://localhost:4000)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.FLOWS_API_URL || 'http://localhost:4000');
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname),
  'Chỉ chạy trên backend local',
);
assert.notEqual(process.env.NODE_ENV, 'production', 'Không chạy trên production');

const ACCOUNTS = {
  customer: { identifier: 'customer@surplusiq.vn', password: '123456' },
  store: { email: 'owner@rincon.vn', password: '123456' },
  admin: {
    email: 'admin@surplusiq.vn',
    password: process.env.ADMIN_PASSWORD || 'Admin@SurplusIQ2026',
  },
};

let passed = 0;
const failures = [];

async function http(method, path, { token, body, headers } = {}) {
  const res = await fetch(new URL(path, base), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

async function step(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${String(e.message).split('\n')[0]}`);
  }
}

const expectOk = (res, ...codes) =>
  assert.ok(
    (codes.length ? codes : [200, 201]).includes(res.status),
    `HTTP ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`,
  );

async function login(path, creds) {
  const res = await http('POST', path, {
    body: { ...creds, deviceId: `flows-${randomUUID().slice(0, 8)}` },
  });
  expectOk(res);
  assert.ok(res.body.accessToken, 'thiếu accessToken');
  return res.body.accessToken;
}

const ctx = {};

console.log('Đăng nhập & phân quyền');
await step('khách đăng nhập', async () => {
  ctx.cust = await login('/auth/customer/login', ACCOUNTS.customer);
});
await step('cửa hàng đăng nhập', async () => {
  ctx.store = await login('/auth/store/login', ACCOUNTS.store);
});
await step('admin đăng nhập', async () => {
  ctx.admin = await login('/auth/admin/login', ACCOUNTS.admin);
});
await step('không token bị từ chối 401', async () =>
  assert.equal((await http('GET', '/store/orders')).status, 401),
);
await step('token khách không vào được cổng cửa hàng (403)', async () =>
  assert.equal((await http('GET', '/store/orders', { token: ctx.cust })).status, 403),
);
await step('token cửa hàng không vào được cổng admin (403)', async () =>
  assert.equal((await http('GET', '/admin/payment-proofs', { token: ctx.store })).status, 403),
);
if (!ctx.cust || !ctx.store || !ctx.admin) {
  console.log('Thiếu đăng nhập, dừng.');
  process.exit(1);
}

console.log('Khám phá & điểm thưởng (khách)');
await step('danh sách deal', async () => {
  const r = await http('GET', '/customer/deals', { token: ctx.cust });
  expectOk(r);
});
await step('gợi ý dành cho bạn', async () =>
  expectOk(await http('GET', '/customer/deals/for-you', { token: ctx.cust })),
);
await step('Radar', async () =>
  expectOk(await http('GET', '/customer/deals/radar', { token: ctx.cust })),
);
await step('số dư và lịch sử điểm', async () => {
  expectOk(await http('GET', '/customer/rewards/balance', { token: ctx.cust }));
  expectOk(await http('GET', '/customer/rewards/history', { token: ctx.cust }));
});
await step('danh mục đổi điểm có giá do máy chủ đặt', async () => {
  const r = await http('GET', '/customer/rewards/catalog', { token: ctx.cust });
  expectOk(r);
  assert.ok(JSON.stringify(r.body).length > 10);
});
await step('đổi điểm với mã lạ bị từ chối', async () => {
  const r = await http('POST', '/customer/rewards/redeem', {
    token: ctx.cust,
    body: { points: 1 },
  });
  assert.ok(r.status >= 400 && r.status < 500, `HTTP ${r.status}`);
});

console.log('Cửa hàng tạo suất');
await step('tổng quan hôm nay', async () =>
  expectOk(await http('GET', '/store/daily-overview', { token: ctx.store })),
);
await step('tạo suất mới', async () => {
  const items = await http('GET', '/store/items?limit=1', { token: ctx.store });
  expectOk(items);
  const item = items.body.data[0];
  assert.ok(item, 'cửa hàng demo chưa có món');
  const start = new Date(Date.now() - 5 * 60_000);
  const end = new Date(Date.now() + 3 * 3600_000);
  const r = await http('POST', '/store/offers', {
    token: ctx.store,
    headers: { 'Idempotency-Key': randomUUID() },
    body: {
      itemId: item.id,
      totalQuantity: 3,
      originalPrice: item.originalPrice,
      currentPrice: Math.max(1000, Math.round((item.originalPrice * 0.6) / 500) * 500),
      pickupStart: start.toISOString(),
      pickupEnd: end.toISOString(),
    },
  });
  expectOk(r);
  ctx.offer = r.body;
});
await step('suất xuất hiện trong danh sách của cửa hàng', async () => {
  const r = await http('GET', '/store/offers', { token: ctx.store });
  expectOk(r);
  assert.ok(r.body.data.some((o) => o.id === ctx.offer.id));
});

console.log('Khách đặt, thanh toán, hỗ trợ đơn');
await step('khách giữ chỗ suất vừa tạo', async () => {
  const r = await http('POST', '/customer/orders', {
    token: ctx.cust,
    headers: { 'Idempotency-Key': randomUUID() },
    body: { offerId: ctx.offer.id, quantity: 1 },
  });
  expectOk(r);
  assert.equal(r.body.status, 'PENDING_PAYMENT');
  ctx.order = r.body;
});
await step('tạo giao dịch và xác nhận thanh toán dev', async () => {
  const pay = await http('POST', `/customer/orders/${ctx.order.id}/payments`, {
    token: ctx.cust,
    body: {},
  });
  expectOk(pay);
  const txn = pay.body.transactionId || pay.body.id || pay.body.transactionCode;
  assert.ok(txn, `không có mã giao dịch: ${JSON.stringify(pay.body).slice(0, 160)}`);
  expectOk(await http('POST', `/dev/payments/${txn}/confirm`, { body: {} }));
  const o = await http('GET', `/customer/orders/${ctx.order.id}`, { token: ctx.cust });
  assert.equal(o.body.status, 'PAID');
});
await step('đơn hiện trong danh sách đơn đang mở của khách', async () => {
  const r = await http('GET', '/customer/orders/active', { token: ctx.cust });
  expectOk(r);
  assert.ok(r.body.some((o) => o.id === ctx.order.id));
});
await step('cửa hàng thấy đơn mới', async () => {
  const r = await http('GET', '/store/orders?limit=100', { token: ctx.store });
  expectOk(r);
  assert.ok(r.body.data.some((o) => o.id === ctx.order.id));
});
await step('theo dõi tiến trình đơn', async () => {
  const r = await http('GET', `/customer/orders/${ctx.order.id}/tracking`, { token: ctx.cust });
  expectOk(r);
});
await step('chat theo đơn: khách nhắn, cửa hàng thấy và trả lời', async () => {
  expectOk(
    await http('POST', `/customer/orders/${ctx.order.id}/messages`, {
      token: ctx.cust,
      body: { body: 'Quán còn mở không ạ?' },
    }),
  );
  const seen = await http('GET', `/store/orders/${ctx.order.id}/messages`, { token: ctx.store });
  expectOk(seen);
  assert.ok(JSON.stringify(seen.body).includes('Quán còn mở không'));
  expectOk(
    await http('POST', `/store/orders/${ctx.order.id}/messages`, {
      token: ctx.store,
      body: { body: 'Quán còn mở đến 21h ạ.' },
    }),
  );
  const back = await http('GET', `/customer/orders/${ctx.order.id}/messages`, { token: ctx.cust });
  assert.ok(JSON.stringify(back.body).includes('21h'));
});
await step('báo sự cố, cửa hàng thấy và phản hồi', async () => {
  const c = await http('POST', `/customer/orders/${ctx.order.id}/incidents`, {
    token: ctx.cust,
    body: { type: 'NOT_READY', note: 'Món chưa sẵn sàng' },
  });
  expectOk(c);
  const list = await http('GET', '/store/incidents', { token: ctx.store });
  expectOk(list);
  const inc = (list.body.data || list.body).find((i) => i.id === c.body.id);
  assert.ok(inc, 'cửa hàng không thấy sự cố');
  expectOk(
    await http('POST', `/store/incidents/${c.body.id}/respond`, {
      token: ctx.store,
      body: { action: 'ACKNOWLEDGE', note: 'Xin lỗi, 10 phút nữa xong ạ.' },
    }),
  );
});
await step('tặng suất cho SĐT không hợp lệ bị từ chối', async () => {
  const r = await http('POST', `/customer/orders/${ctx.order.id}/gift`, {
    token: ctx.cust,
    body: { recipient: 'abc' },
  });
  assert.ok(r.status >= 400 && r.status < 500, `HTTP ${r.status}`);
});

console.log('Dọn dẹp & admin');
await step('cửa hàng hủy suất, đơn được hoàn tiền', async () => {
  expectOk(
    await http('POST', `/store/offers/${ctx.offer.id}/cancel`, {
      token: ctx.store,
      body: { reason: 'Sự cố quán', note: 'kiểm thử tự động' },
    }),
  );
  const o = await http('GET', `/customer/orders/${ctx.order.id}`, { token: ctx.cust });
  assert.ok(['CANCELLED', 'REFUNDED'].includes(o.body.status), `status ${o.body.status}`);
});
await step('admin xem biên lai chờ duyệt và danh sách chi trả hoàn tiền', async () => {
  expectOk(await http('GET', '/admin/payment-proofs', { token: ctx.admin }));
  expectOk(await http('GET', '/admin/refund-payouts', { token: ctx.admin }));
});

console.log(`\n${passed} bước đạt, ${failures.length} bước lỗi`);
if (failures.length) {
  console.log('Lỗi:', failures.join(' | '));
  process.exit(1);
}
