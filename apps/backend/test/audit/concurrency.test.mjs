// Kiểm thử tải đồng thời. Chạy RIÊNG và CUỐI CÙNG vì lỗi đã biết (BUG-001) làm treo toàn bộ API cho tới khi khởi động lại backend.
// Chạy: npm --workspace=@surplusiq/backend run test:audit:concurrency
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { closeDb, createOffer, http, loginAs, q } from './helpers.mjs';

const tokens = {};
const hold = (token, offerId, quantity = 1) =>
  http('POST', '/customer/orders', {
    token,
    headers: { 'Idempotency-Key': randomUUID() },
    body: { offerId, quantity },
  });
before(async () => {
  for (const n of ['customerA', 'customerB', 'storeA']) tokens[n] = await loginAs(n);
});
after(closeDb);

describe('TC-CONC – giữ suất đồng thời (BR chống bán quá, độ sẵn sàng)', () => {
  it('TC-CONC-001 20 yêu cầu đồng thời trên suất 3: tổng số lượng giữ chỗ ≤ 3', async () => {
    const { offer } = await createOffer(tokens, { qty: 3 });
    const rs = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        hold(i % 2 ? tokens.customerA : tokens.customerB, offer.id),
      ),
    );
    const sold = await q(
      "select coalesce(sum(quantity),0)::int n from orders where offer_id=$1 and status in ('PENDING_PAYMENT','PAID')",
      [offer.id],
    );
    const [row] = await q('select remaining_quantity from offers where id=$1', [offer.id]);
    assert.ok(sold[0].n <= 3, `đã giữ ${sold[0].n} > 3`);
    assert.equal(row.remaining_quantity, 3 - sold[0].n);
    assert.ok(
      rs.every((r) => [201, 400, 409, 422, 429].includes(r.status)),
      rs.map((r) => r.status).join(),
    );
  });

  it('TC-CONC-002 sau tải đồng thời, API vẫn phản hồi trong 5 giây (không treo vì cạn kết nối/khóa)', async () => {
    const t0 = Date.now();
    const r = await http('GET', '/platform-settings', {});
    assert.equal(r.status, 200);
    const login = await http('POST', '/auth/store/login', {
      body: {
        email: 'owner@rincon.vn',
        password: '123456',
        deviceId: 'conc-' + randomUUID().slice(0, 5),
      },
    });
    assert.equal(login.status, 201, 'đăng nhập sau tải đồng thời không thành công');
    assert.ok(Date.now() - t0 < 5000, `phản hồi chậm ${Date.now() - t0}ms`);
  });
});
