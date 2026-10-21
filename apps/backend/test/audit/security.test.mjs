// Kiểm thử bảo mật và phân quyền theo BRD. Mỗi test ghi mã TC, mã rủi ro/yêu cầu và kết quả mong đợi nghiệp vụ.
// Chạy: npm --workspace=@surplusiq/backend run test:audit:security  (backend test cổng 4100, DB surplusiq_test)
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import {
  authzDenied,
  closeDb,
  q,
  createPaidOrder,
  endpoints,
  fill,
  http,
  loginAs,
  payOrderDev,
} from './helpers.mjs';

const tokens = {};
const all = endpoints();

// Endpoint cố ý công khai hoặc có tác dụng phụ phá dữ liệu nên không gọi trong ma trận chung.
const PUBLIC_OK = (e) =>
  e.pub === 'PUBLIC' ||
  e.path.startsWith('/auth/') ||
  e.path === '/payments/webhook' ||
  e.path.startsWith('/dev/') ||
  e.path.startsWith('/seed') ||
  e.path.startsWith('/realtime') ||
  e.path === '/platform-settings' ||
  e.path.startsWith('/rescue-bridge/respond/') ||
  e.path === '/store/staff/accept-invite';

async function violations(list, tok, expectDenied = authzDenied) {
  const bad = [];
  for (const e of list) {
    const r = await http(e.method, fill(e.path), {
      token: tok,
      body: e.method === 'GET' ? undefined : {},
    });
    if (r.status === 429) continue; // giới hạn tốc độ: không kết luận
    if (!expectDenied(r.status)) bad.push(`${e.method} ${e.path} → ${r.status}`);
  }
  return bad;
}

before(async () => {
  for (const n of ['customerA', 'customerB', 'storeA', 'storeB', 'admin'])
    tokens[n] = await loginAs(n);
});

after(closeDb);

describe('TC-SEC-AUTHN – chưa đăng nhập phải bị từ chối (BR bảo mật: mọi dữ liệu riêng cần JWT)', () => {
  it('TC-SEC-AUTHN-001 [API-*] không token: mọi endpoint không công khai trả 401/403', async () => {
    const bad = await violations(
      all.filter((e) => !PUBLIC_OK(e)),
      undefined,
    );
    assert.deepEqual(bad, [], `Endpoint truy cập được khi chưa đăng nhập:\n  ${bad.join('\n  ')}`);
  });
  it('TC-SEC-AUTHN-002 token rác bị từ chối ở endpoint khách/cửa hàng/admin', async () => {
    for (const p of ['/customer/orders', '/store/orders', '/admin/payment-proofs']) {
      const r = await http('GET', p, { token: 'abc.def.ghi' });
      assert.equal(r.status, 401, `${p} → ${r.status}`);
    }
  });
});

describe('TC-SEC-AUTHZ – sai vai trò (ROLE-* × API-*)', () => {
  it('TC-SEC-AUTHZ-001 khách hàng không gọi được endpoint cửa hàng/admin', async () => {
    const list = all.filter(
      (e) => (e.path.startsWith('/store') || e.path.startsWith('/admin')) && !PUBLIC_OK(e),
    );
    const bad = await violations(list, tokens.customerA);
    assert.deepEqual(bad, [], `Khách gọi được:\n  ${bad.join('\n  ')}`);
  });
  it('TC-SEC-AUTHZ-002 chủ cửa hàng không gọi được endpoint khách/admin', async () => {
    const list = all.filter(
      (e) => (e.path.startsWith('/customer') || e.path.startsWith('/admin')) && !PUBLIC_OK(e),
    );
    const bad = await violations(list, tokens.storeA);
    assert.deepEqual(bad, [], `Cửa hàng gọi được:\n  ${bad.join('\n  ')}`);
  });
  it('TC-SEC-AUTHZ-003 admin không gọi được endpoint khách', async () => {
    const list = all.filter((e) => e.path.startsWith('/customer') && !PUBLIC_OK(e));
    const bad = await violations(list, tokens.admin);
    assert.deepEqual(bad, [], `Admin gọi được:\n  ${bad.join('\n  ')}`);
  });
});

describe('TC-SEC-SETTINGS – RISK-07: cấu hình cửa hàng', () => {
  it('TC-SEC-SETTINGS-001 GET /store/settings không token phải bị từ chối', async () => {
    const r = await http('GET', '/store/settings?storeId=33333333-3333-4333-a333-333333333301');
    assert.ok(authzDenied(r.status), `trả ${r.status} (lộ cấu hình cửa hàng khi chưa đăng nhập)`);
  });
  it('TC-SEC-SETTINGS-002 GET /store/settings/history không token phải bị từ chối', async () => {
    const r = await http(
      'GET',
      '/store/settings/history?storeId=33333333-3333-4333-a333-333333333301',
    );
    assert.ok(authzDenied(r.status), `trả ${r.status}`);
  });
  it('TC-SEC-SETTINGS-003 PUT /store/settings không token không được sửa cấu hình', async () => {
    const before = await http('GET', '/store/profile', { token: tokens.storeA });
    const orig = before.body.settings.maxQtyPerOrder;
    const r = await http('PUT', '/store/settings?storeId=' + before.body.store.id, {
      body: { maxQtyPerOrder: orig === 4 ? 3 : 4 },
    });
    const after = await http('GET', '/store/profile', { token: tokens.storeA });
    if (after.body.settings.maxQtyPerOrder !== orig) {
      await http('PUT', '/store/settings?storeId=' + before.body.store.id, {
        body: { maxQtyPerOrder: orig },
      }); // dọn
    }
    assert.ok(
      authzDenied(r.status) && after.body.settings.maxQtyPerOrder === orig,
      `PUT không token trả ${r.status}; maxQtyPerOrder ${orig} → ${after.body.settings.maxQtyPerOrder}`,
    );
  });
  it('TC-SEC-SETTINGS-004 BR gói Pro: header x-is-pro do client gửi không được bật chế độ giá AUTO', async () => {
    const p = await http('GET', '/store/profile', { token: tokens.storeA });
    const sub = await http('GET', '/store/subscription/current', { token: tokens.storeA });
    const plan = sub.body?.plan ?? sub.body?.subscription?.plan;
    if (plan === 'PRO' || plan === 'TRIAL') return; // cửa hàng đã Pro: không có ý nghĩa
    const r = await http('PUT', '/store/settings?storeId=' + p.body.store.id, {
      headers: { 'x-is-pro': 'true' },
      body: { pricingMode: 'AUTO' },
    });
    const after = await http('GET', '/store/profile', { token: tokens.storeA });
    if (after.body.settings.pricingMode === 'AUTO')
      await http('PUT', '/store/settings?storeId=' + p.body.store.id, {
        body: { pricingMode: 'MANUAL' },
      });
    assert.notEqual(
      after.body.settings.pricingMode,
      'AUTO',
      `cửa hàng gói ${plan} tự bật AUTO bằng header (HTTP ${r.status})`,
    );
  });
});

describe('TC-SEC-PAY – RISK-01/02: thanh toán', () => {
  it('TC-SEC-PAY-001 [BR-015,BR-016] webhook giả mạo không xác thực không được chuyển đơn sang PAID', async () => {
    const { order } = await createPaidOrderPendingOnly();
    const r = await http('POST', '/payments/webhook', {
      body: {
        gatewayTxnId: 'FORGED_' + randomUUID().slice(0, 8),
        amount: order.totalAmount,
        orderCode: order.code,
        transferMessage: 'SUQ' + order.code,
      },
    });
    const o = await http('GET', `/customer/orders/${order.id}`, { token: tokens.customerA });
    assert.notEqual(
      o.body.status,
      'PAID',
      `webhook không chữ ký trả ${r.status} và đơn ${order.code} thành ${o.body.status} dù chưa chuyển tiền`,
    );
  });
  it('TC-SEC-PAY-002 [BR-016] webhook sai số tiền không làm đơn PAID', async () => {
    const { order } = await createPaidOrderPendingOnly();
    await http('POST', '/payments/webhook', {
      body: { gatewayTxnId: 'LOW_' + randomUUID().slice(0, 8), amount: 1, orderCode: order.code },
    });
    const o = await http('GET', `/customer/orders/${order.id}`, { token: tokens.customerA });
    assert.notEqual(o.body.status, 'PAID');
  });
  it('TC-SEC-PAY-003 webhook lặp cùng gatewayTxnId xử lý idempotent (không ghi nhận hai lần)', async () => {
    const { order } = await createPaidOrderPendingOnly();
    const pay = await http('POST', `/customer/orders/${order.id}/payments`, {
      token: tokens.customerA,
      body: {},
    });
    const txn = pay.body.transactionId || pay.body.id || pay.body.transactionCode;
    const a = await http('POST', `/dev/payments/${txn}/confirm`, { body: {} });
    const b = await http('POST', `/dev/payments/${txn}/confirm`, { body: {} });
    assert.equal(a.status, 200);
    assert.ok(b.status === 200 || b.status === 409, `lần 2 trả ${b.status}`);
    const o = await http('GET', `/customer/orders/${order.id}`, { token: tokens.customerA });
    assert.equal(o.body.status, 'PAID');
  });
  it(
    'TC-SEC-PAY-004 [RISK-02] /dev/payments/:txnId/confirm phải bị khóa khi NODE_ENV=production',
    { skip: 'BLOCKED – cần chạy backend với NODE_ENV=production (chưa có môi trường)' },
    () => {},
  );
  it(
    'TC-SEC-PAY-005 [RISK-03] /realtime/trigger-test phải 404 ở production',
    { skip: 'BLOCKED – cần chạy backend với NODE_ENV=production' },
    () => {},
  );
});

describe('TC-SEC-IDOR – truy cập dữ liệu của người khác', () => {
  let ctx;
  before(async () => {
    ctx = await createPaidOrder(tokens);
    await payOrderDev(tokens, ctx.order.id);
  });

  const customerRoutes = (id) => [
    ['GET', `/customer/orders/${id}`],
    ['GET', `/customer/orders/${id}/tracking`],
    ['GET', `/customer/orders/${id}/messages`],
    ['POST', `/customer/orders/${id}/messages`, { body: 'xin chào' }],
    ['GET', `/customer/orders/${id}/incidents`],
    ['POST', `/customer/orders/${id}/incidents`, { type: 'OTHER' }],
    ['GET', `/customer/orders/${id}/swap-options`],
    ['GET', `/customer/orders/${id}/receipt`],
    ['POST', `/customer/orders/${id}/cancel`, {}],
    ['POST', `/customer/orders/${id}/proxy-code`, {}],
    ['GET', `/customer/orders/${id}/proxy-code`],
    ['POST', `/customer/orders/${id}/payments`, {}],
    ['POST', `/customer/orders/${id}/payments/recheck`, {}],
    ['POST', `/customer/orders/${id}/gift`, { recipient: 'customer1@surplusiq.test' }],
    ['POST', `/customer/orders/${id}/arriving`, {}],
  ];

  it('TC-SEC-IDOR-001 khách B không đọc/ghi được đơn của khách A (mọi route /customer/orders/:id/*)', async () => {
    const bad = [];
    for (const [m, p, body] of customerRoutes(ctx.order.id)) {
      const r = await http(m, p, { token: tokens.customerB, body });
      if (r.status < 400) bad.push(`${m} ${p} → ${r.status}`);
    }
    assert.deepEqual(bad, [], `Khách B truy cập được đơn của khách A:\n  ${bad.join('\n  ')}`);
  });

  it('TC-SEC-IDOR-002 cửa hàng B không thấy/không sửa được đơn và suất của cửa hàng A', async () => {
    const id = ctx.order.id;
    const probes = [
      ['GET', `/store/orders/${id}`],
      ['GET', `/store/orders/${id}/messages`],
      ['POST', `/store/orders/${id}/messages`, { body: 'x' }],
      ['GET', `/store/orders/${id}/tracking`],
      ['GET', `/store/offers/${ctx.offer.id}`],
      ['PATCH', `/store/offers/${ctx.offer.id}`, { currentPrice: 1000 }],
      ['POST', `/store/offers/${ctx.offer.id}/cancel`, { reason: 'Sự cố quán' }],
      ['POST', `/store/offers/${ctx.offer.id}/close`, { reason: 'Đóng cửa' }],
      [
        'POST',
        `/store/offers/${ctx.offer.id}/adjust-stock`,
        { deltaQuantity: 1, reason: 'Làm thêm' },
      ],
    ];
    const bad = [];
    for (const [m, p, body] of probes) {
      const r = await http(m, p, { token: tokens.storeB, body });
      if (r.status < 400) bad.push(`${m} ${p} → ${r.status}`);
    }
    assert.deepEqual(
      bad,
      [],
      `Cửa hàng B truy cập được dữ liệu cửa hàng A:\n  ${bad.join('\n  ')}`,
    );
  });

  it('TC-SEC-IDOR-003 danh sách đơn của cửa hàng B không chứa đơn của cửa hàng A', async () => {
    const r = await http('GET', '/store/orders?limit=100', { token: tokens.storeB });
    assert.equal(r.status, 200);
    assert.ok(!r.body.data.some((o) => o.id === ctx.order.id));
  });

  it('TC-SEC-IDOR-004 danh sách đơn của khách B không chứa đơn của khách A', async () => {
    const r = await http('GET', '/customer/orders?limit=100', { token: tokens.customerB });
    assert.equal(r.status, 200);
    assert.ok(!r.body.data.some((o) => o.id === ctx.order.id));
  });

  it('TC-SEC-IDOR-005 cửa hàng B không quét được QR của đơn thuộc cửa hàng A', async () => {
    const pass = await http('GET', `/customer/orders/${ctx.order.id}`, { token: tokens.customerA });
    const t = await http('GET', `/customer/orders/${ctx.order.id}/pickup-pass`, {
      token: tokens.customerA,
    });
    const qr = t.body?.pickupToken;
    if (!qr)
      return assert.fail(
        `không lấy được QR của đơn (${t.status}); bước chuẩn bị lỗi, đơn ${pass.body.status}`,
      );
    const r = await http('POST', '/store/pickups/verify', {
      token: tokens.storeB,
      body: { token: qr },
    });
    assert.ok(
      [400, 403, 404].includes(r.status),
      `cửa hàng B quét QR của cửa hàng A → ${r.status}`,
    );
    const o = await http('GET', `/customer/orders/${ctx.order.id}`, { token: tokens.customerA });
    assert.notEqual(o.body.status, 'PICKED_UP');
  });

  it('TC-SEC-IDOR-006 khách B không đọc được lời tặng của khách A', async () => {
    await q("delete from order_gifts where created_at > now() - interval '1 day'"); // giới hạn 3 lần/ngày: xóa quà test cũ để không nhiễu
    const g = await http('POST', `/customer/orders/${ctx.order.id}/gift`, {
      token: tokens.customerA,
      body: { recipient: 'customer2@surplusiq.test' },
    });
    if (g.status >= 400) return assert.fail(`không tạo được lời tặng để thử: ${g.status}`);
    for (const a of ['accept', 'decline', 'cancel']) {
      const r = await http('POST', `/customer/gifts/${g.body.id}/${a}`, {
        token: tokens.customerB,
      });
      assert.ok(r.status >= 400, `khách B ${a} lời tặng của người khác → ${r.status}`);
    }
    await http('POST', `/customer/gifts/${g.body.id}/cancel`, { token: tokens.customerA });
  });
});

async function createPaidOrderPendingOnly() {
  const ctx = await createPaidOrder(tokens);
  return ctx;
}
