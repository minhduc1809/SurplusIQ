// FL-012 Rescue Bridge: cửa hàng → đơn vị tiếp nhận (liên kết token công khai) → bàn giao; kiểm tra bảo mật token.
// Chạy: npm --workspace=@surplusiq/backend run test:audit:bridge
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { closeDb, createOffer, http, loginAs, q } from './helpers.mjs';

const tokens = {};
let org, transfer, link;
const iso = (ms) => new Date(Date.now() + ms).toISOString();

before(async () => {
  for (const n of ['storeA', 'storeB', 'admin']) tokens[n] = await loginAs(n);
});
after(closeDb);

const tokenOf = (body) => {
  const s = JSON.stringify(body ?? {});
  const m =
    s.match(/respond\/([A-Za-z0-9_-]{16,})/) ||
    s.match(/"(?:token|responseToken|rawToken)":"([A-Za-z0-9_-]{16,})"/);
  return m?.[1];
};

describe('TC-BRIDGE – FL-012 luồng bàn giao thực phẩm dư', () => {
  it('TC-BRIDGE-001 [ST-BRIDGE] admin tạo & duyệt đơn vị tiếp nhận; cửa hàng không tự tạo được', async () => {
    const body = {
      name: 'Bếp ăn từ thiện audit',
      contactName: 'Nguyễn Audit',
      contactPhone: '0900000099',
      acceptedFoodCategories: ['Bánh ngọt'],
      serviceAreas: ['Quận 1'],
      maxQuantityPerTransfer: 50,
    };
    const denied = await http('POST', '/admin/rescue-bridge/recipient-orgs', {
      token: tokens.storeA,
      body,
    });
    assert.equal(denied.status, 403);
    const r = await http('POST', '/admin/rescue-bridge/recipient-orgs', {
      token: tokens.admin,
      body,
    });
    assert.equal(r.status, 201, JSON.stringify(r.body).slice(0, 150));
    org = r.body;
    if (!org.isApproved) {
      const p = await http('PATCH', `/admin/rescue-bridge/recipient-orgs/${org.id}`, {
        token: tokens.admin,
        body: { isApproved: true },
      });
      assert.ok(p.status < 300, `duyệt: ${p.status} ${JSON.stringify(p.body).slice(0, 100)}`);
    }
  });

  it('TC-BRIDGE-002 cửa hàng tạo đề nghị DRAFT rồi gửi cho đơn vị: trạng thái SENT và có liên kết phản hồi', async () => {
    const { offer } = await createOffer(tokens, { qty: 6 });
    const c = await http('POST', '/store/rescue-bridge/transfers', {
      token: tokens.storeA,
      body: {
        offerId: offer.id,
        quantity: 4,
        availableAt: iso(10 * 60_000),
        handoverDeadline: iso(2 * 3600_000),
        storageNotes: 'Bảo quản mát',
        transportResponsibility: 'RECIPIENT_PICKUP',
        foodCategory: 'Bánh ngọt',
      },
    });
    assert.equal(c.status, 201, `tạo đề nghị: ${c.status} ${JSON.stringify(c.body).slice(0, 200)}`);
    transfer = c.body;
    const s = await http('POST', `/store/rescue-bridge/transfers/${transfer.id}/send`, {
      token: tokens.storeA,
      body: { recipientOrgId: org.id },
    });
    assert.equal(s.status, 201, `gửi: ${s.status} ${JSON.stringify(s.body).slice(0, 200)}`);
    link = tokenOf(s.body);
    if (!link) {
      const rot = await http(
        'POST',
        `/store/rescue-bridge/transfers/${transfer.id}/response-link`,
        { token: tokens.storeA },
      );
      link = tokenOf(rot.body);
    }
    assert.ok(link, 'không nhận được liên kết/token phản hồi để đơn vị tiếp nhận dùng');
    const [t] = await q('select transfer_status from rescue_bridge_transfers where id=$1', [
      transfer.id,
    ]);
    assert.equal(t.transfer_status, 'SENT');
  });

  it('TC-BRIDGE-003 token sai hoặc đoán mò không mở được đề nghị', async () => {
    const r = await http('GET', '/rescue-bridge/respond/not-a-real-token-1234567890abcdef');
    assert.ok(r.status === 404 || r.status === 400 || r.status === 410, `trả ${r.status}`);
  });

  it('TC-BRIDGE-004 đơn vị tiếp nhận mở bằng token: xem được đề nghị, KHÔNG lộ dữ liệu khách/nhạy cảm', async () => {
    const r = await http('GET', `/rescue-bridge/respond/${link}`);
    assert.equal(r.status, 200, `trả ${r.status}`);
    const s = JSON.stringify(r.body);
    assert.ok(
      !/customer|email|passwordHash|response_token_hash|ownerUserId/i.test(s),
      'phản hồi công khai chứa trường nhạy cảm: ' + s.slice(0, 160),
    );
  });

  it('TC-BRIDGE-005 chấp nhận với số lượng vượt đề nghị bị từ chối; số hợp lệ → ACCEPTED', async () => {
    const bad = await http('POST', `/rescue-bridge/respond/${link}/accept`, {
      body: { quantityAccepted: 999, pickupAt: iso(30 * 60_000), responsibleName: 'Trần Audit' },
    });
    assert.ok(bad.status >= 400, `vượt số lượng trả ${bad.status}`);
    const ok = await http('POST', `/rescue-bridge/respond/${link}/accept`, {
      body: { quantityAccepted: 4, pickupAt: iso(30 * 60_000), responsibleName: 'Trần Audit' },
    });
    assert.ok(ok.status < 300, `chấp nhận: ${ok.status} ${JSON.stringify(ok.body).slice(0, 150)}`);
    const [t] = await q(
      'select transfer_status, quantity_accepted from rescue_bridge_transfers where id=$1',
      [transfer.id],
    );
    assert.equal(t.transfer_status, 'ACCEPTED');
    assert.equal(t.quantity_accepted, 4);
  });

  it('TC-BRIDGE-006 cửa hàng B không xem/hủy được đề nghị của cửa hàng A (IDOR)', async () => {
    const g = await http('GET', `/store/rescue-bridge/transfers/${transfer.id}`, {
      token: tokens.storeB,
    });
    const c = await http('POST', `/store/rescue-bridge/transfers/${transfer.id}/cancel`, {
      token: tokens.storeB,
      body: { reason: 'x' },
    });
    assert.ok(g.status >= 400 && c.status >= 400, `GET ${g.status}, cancel ${c.status}`);
  });

  it('TC-BRIDGE-007 bàn giao: hai bên xác nhận số lượng → HANDED_OVER; xác nhận lặp bị từ chối', async () => {
    const a = await http(
      'POST',
      `/store/rescue-bridge/transfers/${transfer.id}/confirm-agreement`,
      { token: tokens.storeA, body: { storeResponsibleName: 'Cửa hàng Audit' } },
    );
    assert.ok(a.status < 300, `thỏa thuận: ${a.status} ${JSON.stringify(a.body).slice(0, 120)}`);
    // Đến thời điểm bàn giao: lùi mốc sẵn sàng/hẹn lấy trong DB test (không chờ thời gian thật).
    await q(
      "update rescue_bridge_transfers set available_at = now() - interval '2 minutes', agreed_pickup_at = now() - interval '1 minute' where id=$1",
      [transfer.id],
    );
    const sh = await http(
      'POST',
      `/store/rescue-bridge/transfers/${transfer.id}/confirm-handover`,
      { token: tokens.storeA, body: { quantityHandedOver: 4, evidenceReference: 'BB-AUDIT-1' } },
    );
    assert.ok(
      sh.status < 300,
      `cửa hàng xác nhận: ${sh.status} ${JSON.stringify(sh.body).slice(0, 120)}`,
    );
    const rh = await http('POST', `/rescue-bridge/respond/${link}/confirm-handover`, {
      body: { quantityReceived: 4, confirmedByName: 'Trần Audit' },
    });
    assert.ok(
      rh.status < 300,
      `đơn vị xác nhận: ${rh.status} ${JSON.stringify(rh.body).slice(0, 120)}`,
    );
    const [t] = await q('select transfer_status from rescue_bridge_transfers where id=$1', [
      transfer.id,
    ]);
    assert.ok(['HANDED_OVER', 'PARTIAL'].includes(t.transfer_status), t.transfer_status);
    const again = await http('POST', `/rescue-bridge/respond/${link}/confirm-handover`, {
      body: { quantityReceived: 4, confirmedByName: 'Trần Audit' },
    });
    assert.ok(again.status >= 400, `xác nhận lặp trả ${again.status}`);
  });

  it('TC-BRIDGE-008 token cũ mất hiệu lực sau khi cấp lại liên kết', async () => {
    const { offer } = await createOffer(tokens, { qty: 3 });
    const c = await http('POST', '/store/rescue-bridge/transfers', {
      token: tokens.storeA,
      body: {
        offerId: offer.id,
        quantity: 2,
        availableAt: iso(10 * 60_000),
        handoverDeadline: iso(2 * 3600_000),
        storageNotes: 'Mát',
        transportResponsibility: 'RECIPIENT_PICKUP',
      },
    });
    assert.equal(c.status, 201);
    const s = await http('POST', `/store/rescue-bridge/transfers/${c.body.id}/send`, {
      token: tokens.storeA,
      body: { recipientOrgId: org.id },
    });
    const old = tokenOf(s.body);
    const rot = await http('POST', `/store/rescue-bridge/transfers/${c.body.id}/response-link`, {
      token: tokens.storeA,
    });
    assert.notEqual(tokenOf(rot.body), old, 'liên kết mới trùng liên kết cũ');
    const r = await http('GET', `/rescue-bridge/respond/${old}`);
    assert.ok(r.status >= 400, `liên kết cũ vẫn dùng được (${r.status})`);
  });
});
