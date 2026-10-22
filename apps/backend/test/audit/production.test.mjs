// Kiểm thử hành vi khi backend chạy NODE_ENV=production (DB test riêng, cổng 4101).
// Khởi động: POSTGRES_DB=surplusiq_test PORT=4101 NODE_ENV=production npm --workspace=@surplusiq/backend run start
// Chạy: AUDIT_API_URL=http://localhost:4101 npm --workspace=@surplusiq/backend run test:audit:production
import assert from 'node:assert/strict';
import { before, describe, it, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { authzDenied, closeDb, createOffer, http, loginAs } from './helpers.mjs';

const tokens = {};
before(async () => {
  assert.equal(
    new URL(process.env.AUDIT_API_URL || 'http://x').port,
    '4101',
    'Chạy với AUDIT_API_URL=http://localhost:4101 (backend NODE_ENV=production)',
  );
  for (const n of ['customerA', 'storeA']) tokens[n] = await loginAs(n);
});
after(closeDb);

describe('TC-PROD – khóa tính năng phát triển ở production (RISK-02/03)', () => {
  it('TC-PROD-001 [RISK-02] /dev/payments/:txnId/confirm bị khóa (4xx) ở production', async () => {
    const r = await http('POST', `/dev/payments/${randomUUID()}/confirm`, { body: {} });
    assert.ok(r.status >= 400 && r.status < 500, `trả ${r.status}`);
  });
  it('TC-PROD-002 [RISK-03] /realtime/trigger-test trả 404 ở production', async () => {
    const r = await http('POST', '/realtime/trigger-test', { body: {} });
    assert.equal(r.status, 404, `trả ${r.status}`);
  });
  it('TC-PROD-003 Swagger không công khai ở production', async () => {
    const r = await fetch(new URL('/api', process.env.AUDIT_API_URL));
    assert.ok(
      r.status === 404 || r.status === 401 || r.status === 403,
      `GET /api → ${r.status} (tài liệu API công khai)`,
    );
  });
  it('TC-PROD-004 [RISK-01] webhook giả mạo không làm đơn PAID ở production', async () => {
    const { offer } = await createOffer(tokens, { qty: 3 });
    const o = await http('POST', '/customer/orders', {
      token: tokens.customerA,
      headers: { 'Idempotency-Key': randomUUID() },
      body: { offerId: offer.id, quantity: 1 },
    });
    assert.equal(o.status, 201, JSON.stringify(o.body).slice(0, 120));
    await http('POST', '/payments/webhook', {
      body: {
        gatewayTxnId: 'PROD_FORGED_' + randomUUID().slice(0, 6),
        amount: o.body.totalAmount,
        orderCode: o.body.code,
      },
    });
    const s = await http('GET', `/customer/orders/${o.body.id}`, { token: tokens.customerA });
    assert.notEqual(s.body.status, 'PAID', 'webhook không chữ ký làm đơn PAID ở production');
  });
  it('TC-PROD-005 [BUG-002] /store/settings yêu cầu đăng nhập ở production', async () => {
    const r = await http('GET', '/store/settings?storeId=33333333-3333-3333-3333-333333333301');
    assert.ok(authzDenied(r.status), `trả ${r.status}`);
  });
  it('TC-PROD-006 [BUG-004] /jobs/* yêu cầu xác thực ở production', async () => {
    const r = await http('POST', '/jobs/release-holds');
    assert.ok(authzDenied(r.status), `trả ${r.status}`);
  });
  it('TC-PROD-007 [BUG-004] /seed/* không công khai ở production', async () => {
    const r = await http('GET', '/seed/demo-data');
    assert.ok(authzDenied(r.status) || r.status === 404, `GET /seed/demo-data → ${r.status}`);
  });
});
