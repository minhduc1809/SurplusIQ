// Kiểm thử logic nghiệp vụ (rà soát mã nguồn): đơn hàng, thanh toán, giới hạn số lượng, khung giờ nhận.
// Chạy: npm --workspace=@surplusiq/backend run test:audit:business  (backend test cổng 4100, cần PAYMENT_WEBHOOK_SECRET)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import {
  closeDb,
  createOffer,
  createPaidOrder,
  http,
  loginAs,
  q,
  resetPenalties,
} from './helpers.mjs';

const tokens = {};
const secret = process.env.PAYMENT_WEBHOOK_SECRET;
before(async () => {
  await resetPenalties();
  for (const n of ['customerA', 'storeA']) tokens[n] = await loginAs(n);
});
after(closeDb);

const hold = async (offerId, quantity = 1, extra = {}) =>
  http('POST', '/customer/orders', {
    token: tokens.customerA,
    headers: { 'Idempotency-Key': randomUUID() },
    body: { offerId, quantity, ...extra },
  });
const webhook = (order, txn, amount = order.totalAmount) =>
  http('POST', '/payments/webhook', {
    headers: { 'x-webhook-secret': secret },
    body: { gatewayTxnId: txn, amount, orderCode: order.code },
  });
const status = async (id) =>
  (await http('GET', `/customer/orders/${id}`, { token: tokens.customerA })).body.status;

describe(
  'TC-BIZ – logic nghiệp vụ đơn hàng và thanh toán',
  { skip: !secret && 'BLOCKED – thiếu PAYMENT_WEBHOOK_SECRET' },
  () => {
    it('TC-BIZ-001 [BR-015] chuyển khoản đến sau khi đơn đã HỦY không được làm đơn sống lại thành PAID', async () => {
      const { offer } = await createOffer(tokens, { qty: 3 });
      const o = await hold(offer.id);
      assert.equal(o.status, 201);
      const c = await http('POST', `/customer/orders/${o.body.id}/cancel`, {
        token: tokens.customerA,
        body: {},
      });
      assert.equal(c.status, 201, JSON.stringify(c.body).slice(0, 100));
      await webhook(o.body, 'LATE_' + randomUUID().slice(0, 8));
      const s = await status(o.body.id);
      assert.notEqual(
        s,
        'PAID',
        `đơn đã hủy thành ${s} sau webhook (tồn kho đã trả lại, khách có vé nhận hàng)`,
      );
    });

    it('TC-BIZ-002 [BR-015] hai khoản chuyển khoản khác mã cho cùng đơn không sinh hai vé nhận hàng', async () => {
      const { order } = await createPaidOrder(tokens);
      const a = await webhook(order, 'DUP_A_' + randomUUID().slice(0, 6));
      const b = await webhook(order, 'DUP_B_' + randomUUID().slice(0, 6));
      assert.equal(a.status, 200);
      const [t] = await q('select count(*)::int n from pickup_tokens where order_id=$1', [
        order.id,
      ]);
      const [r] = await q(
        "select count(*)::int n from payment_transactions where order_id=$1 and kind='ORDER_REFUND'",
        [order.id],
      );
      assert.ok(
        t.n === 1 && (b.status !== 200 || r.n >= 1),
        `vé=${t.n}, hoàn=${r.n}, lần 2 trả ${b.status}: thu tiền hai lần mà không hoàn`,
      );
    });

    it('TC-BIZ-003 [BR-016] sai số tiền phải được lưu vào hàng đối soát thủ công (MANUAL_REVIEW)', async () => {
      const { order } = await createPaidOrder(tokens);
      const r = await webhook(order, 'MIS_' + randomUUID().slice(0, 8), 1);
      assert.equal(r.status, 400);
      const [m] = await q(
        "select count(*)::int n from payment_transactions where order_id=$1 and status='MANUAL_REVIEW'",
        [order.id],
      );
      assert.equal(m.n, 1, 'không có bản ghi đối soát: lỗi 400 làm rollback toàn bộ giao dịch');
    });

    it('TC-BIZ-004 [R2-007] số lượng tối đa mỗi đơn theo cấu hình cửa hàng được áp dụng', async () => {
      const put = await http('PUT', '/store/settings', {
        token: tokens.storeA,
        body: { maxQtyPerOrder: 2 },
      });
      assert.equal(put.status, 200);
      try {
        const { offer } = await createOffer(tokens, { qty: 5 });
        const o = await hold(offer.id, 3);
        assert.equal(o.status, 400, `đặt 3 suất khi cửa hàng giới hạn 2 trả ${o.status}`);
      } finally {
        await http('PUT', '/store/settings', { token: tokens.storeA, body: { maxQtyPerOrder: 5 } });
      }
    });

    it('TC-BIZ-005 suất đã quá giờ kết thúc nhận hàng không đặt được dù chưa bị job đóng', async () => {
      const { offer } = await createOffer(tokens, { qty: 3 });
      await q("update offers set pickup_end = now() - interval '5 minutes' where id=$1", [
        offer.id,
      ]);
      const o = await hold(offer.id);
      assert.equal(o.status, 400, `đặt suất quá giờ nhận trả ${o.status}`);
    });

    it('TC-BIZ-006 [R1-049] giờ hẹn nhận ngoài khung giờ của suất bị từ chối ngay khi giữ chỗ', async () => {
      const { offer } = await createOffer(tokens, { qty: 3 });
      const o = await hold(offer.id, 1, {
        pickupSlot: new Date(Date.now() + 48 * 3600_000).toISOString(),
      });
      assert.equal(o.status, 400, `hẹn nhận sau 48 giờ trả ${o.status}`);
    });

    it('TC-BIZ-007 [R1-043] hủy giữ chỗ trả lại đúng tồn kho và không trả quá tổng số', async () => {
      const { offer } = await createOffer(tokens, { qty: 3 });
      const o = await hold(offer.id, 2);
      await http('POST', `/customer/orders/${o.body.id}/cancel`, {
        token: tokens.customerA,
        body: {},
      });
      await http('POST', `/customer/orders/${o.body.id}/cancel`, {
        token: tokens.customerA,
        body: {},
      });
      const [r] = await q('select remaining_quantity, total_quantity from offers where id=$1', [
        offer.id,
      ]);
      assert.equal(r.remaining_quantity, 3, `tồn còn ${r.remaining_quantity}/${r.total_quantity}`);
    });

    it('TC-BIZ-008 [R2-030] chủ quán không giảm tổng suất xuống dưới số đã được giữ/bán', async () => {
      const { offer } = await createOffer(tokens, { qty: 3 });
      const o = await hold(offer.id, 2);
      assert.equal(o.status, 201);
      const r = await http('PATCH', `/store/offers/${offer.id}`, {
        token: tokens.storeA,
        body: { totalQuantity: 1 },
      });
      assert.equal(r.status, 400, `giảm tổng còn 1 khi đã giữ 2 trả ${r.status}`);
    });
  },
);
