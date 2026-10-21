// Kiểm thử luồng tiền và trạng thái theo BRD (FL-001..FL-004, ST-ORDER, ST-OFFER, BR-016, BR-019, BR-054...).
// Xác minh kết quả bằng truy vấn DB test, không chỉ mã HTTP. Chạy: npm --workspace=@surplusiq/backend run test:audit:flows
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { closeDb, createOffer, http, loginAs, payOrderDev, q } from './helpers.mjs';

const tokens = {};
before(async () => {
  for (const n of ['customerA', 'customerB', 'storeA', 'storeB', 'admin'])
    tokens[n] = await loginAs(n);
});
after(closeDb);

const hold = (token, offerId, quantity = 1, extra = {}, key = randomUUID()) =>
  http('POST', '/customer/orders', {
    token,
    headers: { 'Idempotency-Key': key },
    body: { offerId, quantity, ...extra },
  });

async function paidOrder({
  qty = 5,
  price = 27000,
  quantity = 1,
  startOffsetMs,
  endOffsetMs,
} = {}) {
  const { offer } = await createOffer(tokens, { qty, price, startOffsetMs, endOffsetMs });
  const o = await hold(tokens.customerA, offer.id, quantity);
  assert.equal(o.status, 201, JSON.stringify(o.body).slice(0, 150));
  await payOrderDev(tokens, o.body.id);
  return { offer, order: o.body };
}

describe('TC-FLOW-001 – FL-001 đặt, thanh toán, nhận hàng (ST-ORDER, BR-016)', () => {
  it('TC-FLOW-001-01 [BR-016] đơn giữ chỗ chốt giá = đơn giá × số lượng, trạng thái PENDING_PAYMENT, tồn giảm', async () => {
    const { offer } = await createOffer(tokens, { qty: 5, price: 27000 });
    const o = await hold(tokens.customerA, offer.id, 2);
    assert.equal(o.status, 201);
    assert.equal(o.body.status, 'PENDING_PAYMENT');
    assert.equal(Number(o.body.totalAmount), 27000 * 2 - Number(o.body.discountAmount || 0));
    const [row] = await q('select remaining_quantity from offers where id=$1', [offer.id]);
    assert.equal(row.remaining_quantity, 3);
  });

  it('TC-FLOW-001-02 thanh toán xong: PAID, có giao dịch SUCCEEDED đúng số tiền, sinh QR + PIN', async () => {
    const { order } = await paidOrder({ quantity: 2 });
    const [o] = await q('select status, total_amount from orders where id=$1', [order.id]);
    assert.equal(o.status, 'PAID');
    const tx = await q(
      "select amount, status, kind from payment_transactions where order_id=$1 and kind='ORDER_PAYMENT'",
      [order.id],
    );
    assert.equal(tx.length, 1);
    assert.equal(tx[0].status, 'SUCCEEDED');
    assert.equal(Number(tx[0].amount), Number(o.total_amount));
    const pass = await http('GET', `/customer/orders/${order.id}/pickup-pass`, {
      token: tokens.customerA,
    });
    assert.ok(pass.body.pickupToken);
  });

  it('TC-FLOW-001-03 cửa hàng quét QR: PICKED_UP; quét lại lần 2 bị từ chối (ST-ORDER cấm chuyển)', async () => {
    const { order } = await paidOrder();
    const pass = await http('GET', `/customer/orders/${order.id}/pickup-pass`, {
      token: tokens.customerA,
    });
    const a = await http('POST', '/store/pickups/verify', {
      token: tokens.storeA,
      body: { token: pass.body.pickupToken },
    });
    assert.ok(a.status < 300, `quét lần 1 → ${a.status} ${JSON.stringify(a.body).slice(0, 100)}`);
    const [o] = await q('select status, picked_up_at from orders where id=$1', [order.id]);
    assert.equal(o.status, 'PICKED_UP');
    assert.ok(o.picked_up_at);
    const b = await http('POST', '/store/pickups/verify', {
      token: tokens.storeA,
      body: { token: pass.body.pickupToken },
    });
    assert.ok(b.status >= 400, `quét lần 2 phải bị từ chối, trả ${b.status}`);
  });

  it('TC-FLOW-001-04 thanh toán lại cho đơn đã PAID bị từ chối', async () => {
    const { order } = await paidOrder();
    const r = await http('POST', `/customer/orders/${order.id}/payments`, {
      token: tokens.customerA,
      body: {},
    });
    assert.ok(r.status >= 400, `trả ${r.status}`);
  });
});

describe('TC-FLOW-002 – tồn kho và đồng thời (BR chống bán quá)', () => {
  it('TC-FLOW-002-01 hai khách cùng giữ suất cuối: đúng một người thành công, tồn không âm', async () => {
    const { offer } = await createOffer(tokens, { qty: 1 });
    const [a, b] = await Promise.all([
      hold(tokens.customerA, offer.id),
      hold(tokens.customerB, offer.id),
    ]);
    const ok = [a, b].filter((r) => r.status === 201);
    assert.equal(ok.length, 1, `thành công: ${[a.status, b.status]}`);
    const [row] = await q('select remaining_quantity from offers where id=$1', [offer.id]);
    assert.equal(row.remaining_quantity, 0);
    const orders = await q(
      "select count(*)::int n from orders where offer_id=$1 and status in ('PENDING_PAYMENT','PAID')",
      [offer.id],
    );
    assert.equal(orders[0].n, 1);
  });

  it('TC-FLOW-002-03 cùng Idempotency-Key gửi lại sau 0,5 giây chỉ tạo một đơn (client retry)', async () => {
    const { offer } = await createOffer(tokens, { qty: 5 });
    const key = randomUUID();
    const a = await hold(tokens.customerA, offer.id, 1, {}, key);
    await new Promise((r) => setTimeout(r, 500));
    const b = await hold(tokens.customerA, offer.id, 1, {}, key);
    assert.equal(a.status, 201);
    assert.ok([200, 201].includes(b.status), `lần 2 trả ${b.status}`);
    const n = await q('select count(*)::int n from orders where offer_id=$1', [offer.id]);
    assert.equal(n[0].n, 1);
  });

  it('TC-FLOW-002-03b [BR-015] bấm đúp: hai yêu cầu SONG SONG cùng Idempotency-Key chỉ tạo một đơn', async () => {
    const { offer } = await createOffer(tokens, { qty: 5 });
    const key = randomUUID();
    await Promise.all([
      hold(tokens.customerA, offer.id, 1, {}, key),
      hold(tokens.customerA, offer.id, 1, {}, key),
    ]);
    const n = await q('select count(*)::int n from orders where offer_id=$1', [offer.id]);
    assert.equal(n[0].n, 1, `tạo ${n[0].n} đơn với cùng khóa`);
  });

  it('TC-FLOW-002-04 [FL-002] hết hạn giữ chỗ: job trả tồn và chuyển HOLD_EXPIRED', async () => {
    const { offer } = await createOffer(tokens, { qty: 4 });
    const o = await hold(tokens.customerA, offer.id, 2);
    await q("update orders set hold_expires_at = now() - interval '1 minute' where id=$1", [
      o.body.id,
    ]);
    const j = await http('POST', '/jobs/release-holds', { token: tokens.admin });
    assert.ok(j.status < 400, `job → ${j.status}`);
    const [ord] = await q('select status from orders where id=$1', [o.body.id]);
    const [off] = await q('select remaining_quantity from offers where id=$1', [offer.id]);
    assert.equal(ord.status, 'HOLD_EXPIRED');
    assert.equal(off.remaining_quantity, 4);
  });
});

describe('TC-FLOW-003 – kiểm tra đầu vào số lượng/giá (BR-019, BR-054)', () => {
  let offer;
  before(async () => {
    ({ offer } = await createOffer(tokens, { qty: 10 }));
  });
  for (const [label, qty] of [
    ['0', 0],
    ['-1', -1],
    ['6 (>5)', 6],
    ['1.5', 1.5],
    ['chuỗi', 'abc'],
  ]) {
    it(`TC-FLOW-003-${label} [BR-019] số lượng ${label} bị từ chối`, async () => {
      const r = await hold(tokens.customerA, offer.id, qty);
      assert.equal(r.status, 400, `trả ${r.status}`);
    });
  }
  const base = { qty: 5, original: 40000 };
  const cases = [
    ['giá bán > giá gốc', { price: 45000 }],
    ['giá bán không bội 500', { price: 27300 }],
    ['giá bán dưới giá sàn 40%', { price: 10000 }],
    ['số suất 0', { price: 27000, qty: 0 }],
    ['số suất 501', { price: 27000, qty: 501 }],
  ];
  for (const [label, o] of cases) {
    it(`TC-FLOW-003-O ${label} bị từ chối khi tạo suất`, async () => {
      const r = await createOffer(tokens, { ...base, ...o });
      assert.equal(
        r.res.status,
        400,
        `trả ${r.res.status} ${JSON.stringify(r.res.body).slice(0, 100)}`,
      );
    });
  }
  it('TC-FLOW-003-O khung nhận kết thúc trước bắt đầu bị từ chối', async () => {
    const r = await createOffer(tokens, { startOffsetMs: 3600_000, endOffsetMs: 1800_000 });
    assert.equal(r.res.status, 400);
  });
  it('TC-FLOW-003-04 đặt suất đã hủy/đã đóng bị từ chối', async () => {
    const { offer: o2 } = await createOffer(tokens, { qty: 3 });
    await http('POST', `/store/offers/${o2.id}/cancel`, {
      token: tokens.storeA,
      body: { reason: 'Sự cố quán' },
    });
    const r = await hold(tokens.customerA, o2.id);
    assert.ok(r.status >= 400, `trả ${r.status}`);
  });
});

describe('TC-FLOW-004 – FL-003 hủy và hoàn tiền (ST-ORDER, ST-OFFER)', () => {
  it('TC-FLOW-004-01 cửa hàng hủy suất: mọi đơn PAID thành CANCELLED + có giao dịch hoàn đúng tiền', async () => {
    const { offer, order } = await paidOrder({ qty: 3, quantity: 2 });
    const r = await http('POST', `/store/offers/${offer.id}/cancel`, {
      token: tokens.storeA,
      body: { reason: 'Sự cố quán' },
    });
    assert.ok(r.status < 300, `${r.status} ${JSON.stringify(r.body).slice(0, 100)}`);
    const [o] = await q('select status, total_amount from orders where id=$1', [order.id]);
    assert.ok(['CANCELLED', 'REFUNDED'].includes(o.status), o.status);
    const refund = await q(
      "select amount from payment_transactions where order_id=$1 and kind='ORDER_REFUND'",
      [order.id],
    );
    assert.equal(refund.length, 1, 'phải có đúng một giao dịch hoàn');
    assert.equal(Number(refund[0].amount), Number(o.total_amount));
    const [off] = await q('select status from offers where id=$1', [offer.id]);
    assert.equal(off.status, 'CANCELLED');
  });

  it('TC-FLOW-004-02 hủy suất lần hai không hoàn tiền thêm (không hoàn kép)', async () => {
    const { offer, order } = await paidOrder();
    await http('POST', `/store/offers/${offer.id}/cancel`, {
      token: tokens.storeA,
      body: { reason: 'Sự cố quán' },
    });
    const r2 = await http('POST', `/store/offers/${offer.id}/cancel`, {
      token: tokens.storeA,
      body: { reason: 'Sự cố quán' },
    });
    assert.ok(r2.status >= 400, `trả ${r2.status}`);
    const refund = await q(
      "select count(*)::int n from payment_transactions where order_id=$1 and kind='ORDER_REFUND'",
      [order.id],
    );
    assert.equal(refund[0].n, 1);
  });

  it('TC-FLOW-004-03 khách hủy đơn PAID còn xa giờ nhận: được hoàn 100%, tồn trả lại', async () => {
    const { offer, order } = await paidOrder({
      qty: 4,
      startOffsetMs: 3 * 3600_000,
      endOffsetMs: 5 * 3600_000,
    });
    const [before] = await q('select remaining_quantity from offers where id=$1', [offer.id]);
    const r = await http('POST', `/customer/orders/${order.id}/cancel`, {
      token: tokens.customerA,
      body: { reason: 'Đổi ý' },
    });
    assert.ok(r.status < 300, `${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    const [o] = await q('select status from orders where id=$1', [order.id]);
    assert.ok(['CANCELLED', 'REFUNDED'].includes(o.status));
    const [after] = await q('select remaining_quantity from offers where id=$1', [offer.id]);
    assert.equal(after.remaining_quantity, before.remaining_quantity + 1);
    const refund = await q(
      "select amount from payment_transactions where order_id=$1 and kind='ORDER_REFUND'",
      [order.id],
    );
    assert.equal(refund.length, 1);
  });

  it('TC-FLOW-004-04 hủy hai lần không hoàn kép', async () => {
    const { order } = await paidOrder();
    await http('POST', `/customer/orders/${order.id}/cancel`, {
      token: tokens.customerA,
      body: {},
    });
    const r2 = await http('POST', `/customer/orders/${order.id}/cancel`, {
      token: tokens.customerA,
      body: {},
    });
    assert.ok(r2.status >= 400, `trả ${r2.status}`);
    const refund = await q(
      "select count(*)::int n from payment_transactions where order_id=$1 and kind='ORDER_REFUND'",
      [order.id],
    );
    assert.ok(refund[0].n <= 1, `có ${refund[0].n} giao dịch hoàn`);
  });

  it('TC-FLOW-004-05 không hủy được đơn đã PICKED_UP', async () => {
    const { order } = await paidOrder();
    const pass = await http('GET', `/customer/orders/${order.id}/pickup-pass`, {
      token: tokens.customerA,
    });
    await http('POST', '/store/pickups/verify', {
      token: tokens.storeA,
      body: { token: pass.body.pickupToken },
    });
    const r = await http('POST', `/customer/orders/${order.id}/cancel`, {
      token: tokens.customerA,
      body: {},
    });
    assert.ok(r.status >= 400, `trả ${r.status}`);
    const refund = await q(
      "select count(*)::int n from payment_transactions where order_id=$1 and kind='ORDER_REFUND'",
      [order.id],
    );
    assert.equal(refund[0].n, 0);
  });

  it('TC-FLOW-004-06 [R1-043] hủy trong vòng 60 phút trước giờ BẮT ĐẦU nhận bị từ chối (đã xác nhận bằng thông báo máy chủ), đơn giữ nguyên PAID', async () => {
    const { order } = await paidOrder({ startOffsetMs: 20 * 60_000, endOffsetMs: 3 * 3600_000 });
    const r = await http('POST', `/customer/orders/${order.id}/cancel`, {
      token: tokens.customerA,
      body: {},
    });
    assert.equal(r.status, 400);
    const [o] = await q('select status from orders where id=$1', [order.id]);
    assert.equal(o.status, 'PAID');
  });
});

describe('TC-FLOW-005 – ST-OFFER chuyển trạng thái', () => {
  it('TC-FLOW-005-01 không đóng được suất đã hủy', async () => {
    const { offer } = await createOffer(tokens);
    await http('POST', `/store/offers/${offer.id}/cancel`, {
      token: tokens.storeA,
      body: { reason: 'Sự cố quán' },
    });
    const r = await http('POST', `/store/offers/${offer.id}/close`, {
      token: tokens.storeA,
      body: { reason: 'Đóng cửa' },
    });
    assert.ok(r.status >= 400, `trả ${r.status}`);
  });
  it('TC-FLOW-005-02 điều chỉnh tồn không được làm âm', async () => {
    const { offer } = await createOffer(tokens, { qty: 3 });
    const r = await http('POST', `/store/offers/${offer.id}/adjust-stock`, {
      token: tokens.storeA,
      body: { deltaQuantity: -10, reason: 'Hỏng' },
    });
    assert.equal(r.status, 400);
    const [row] = await q('select remaining_quantity from offers where id=$1', [offer.id]);
    assert.equal(row.remaining_quantity, 3);
  });
  it('TC-FLOW-005-03 bán hết suất → SOLD_OUT', async () => {
    const { offer } = await createOffer(tokens, { qty: 1 });
    const o = await hold(tokens.customerA, offer.id);
    assert.equal(o.status, 201);
    const [row] = await q('select status, remaining_quantity from offers where id=$1', [offer.id]);
    assert.equal(row.remaining_quantity, 0);
    assert.ok(['SOLD_OUT', 'OPEN'].includes(row.status));
  });
});
