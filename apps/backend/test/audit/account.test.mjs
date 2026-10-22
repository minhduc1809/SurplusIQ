// Kiểm thử tài khoản khách: xóa tài khoản, đồng ý dữ liệu, khóa đăng nhập (R1-011, R1-019, R1-012, BR-007).
// Dùng riêng các khách phụ customer3/4 để không làm hỏng tài khoản test chính. Chạy: npm --workspace=@surplusiq/backend run test:audit:account
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { closeDb, http, q } from './helpers.mjs';

after(async () => {
  await q(
    "update users set status='ACTIVE', delete_requested_at=null, failed_login_count=0, locked_until=null where email in ('customer3@surplusiq.test','customer4@surplusiq.test')",
  );
  await closeDb();
});

const login = (email, password = '123456') =>
  http('POST', '/auth/customer/login', {
    body: { identifier: email, password, deviceId: 'acct-' + email.slice(0, 9) },
  });

describe('TC-ACCT – tài khoản khách', () => {
  it('TC-ACCT-001 [R1-011] yêu cầu xóa tài khoản phải xác nhận lại (mật khẩu/OTP), body rỗng bị từ chối', async () => {
    const l = await login('customer3@surplusiq.test');
    assert.equal(l.status, 201);
    const r = await http('POST', '/customer/delete-request', {
      token: l.body.accessToken,
      body: {},
    });
    const [u] = await q("select status from users where email='customer3@surplusiq.test'");
    assert.notEqual(
      u.status,
      'PENDING_DELETE',
      `POST /customer/delete-request body rỗng trả ${r.status} và tài khoản thành ${u.status} (không yêu cầu xác nhận lại)`,
    );
  });

  it('TC-ACCT-002 [R1-019] trong 7 ngày ân hạn người dùng vẫn đăng nhập được để HỦY yêu cầu xóa', async () => {
    await q(
      "update users set status='PENDING_DELETE', delete_requested_at=now() where email='customer4@surplusiq.test'",
    );
    const l = await login('customer4@surplusiq.test');
    assert.equal(
      l.status,
      201,
      `đăng nhập khi đang chờ xóa trả ${l.status} ${JSON.stringify(l.body)?.slice(0, 90)} nên không thể hủy yêu cầu xóa`,
    );
    assert.equal(l.body.accountStatus, 'PENDING_DELETE');
    assert.ok(l.body.deleteScheduledAt, 'phải trả ngày xóa dự kiến');
    const token = l.body.accessToken;
    // Phiên bị giới hạn: API khác bị 403 ACCOUNT_PENDING_DELETE, trạng thái và hủy xóa vẫn dùng được.
    const other = await http('GET', '/customer/profile', { token });
    assert.equal(other.status, 403);
    assert.equal(other.body?.code ?? other.body?.message?.code, 'ACCOUNT_PENDING_DELETE');
    const order = await http('POST', '/customer/orders', { token, body: {} });
    assert.equal(order.status, 403, 'không được đặt đơn khi chờ xóa');
    const st = await http('GET', '/customer/account-status', { token });
    assert.equal(st.status, 200);
    assert.equal(st.body.status, 'PENDING_DELETE');
    const c1 = await http('DELETE', '/customer/delete-request', { token });
    assert.equal(c1.status, 200);
    const c2 = await http('DELETE', '/customer/delete-request', { token });
    assert.ok(c2.status < 500, 'hủy lần hai không được lỗi 5xx');
    const full = await http('GET', '/customer/profile', { token });
    assert.equal(full.status, 200, 'sau khi hủy xóa, phiên dùng đầy đủ lại');
    const [u] = await q("select status from users where email='customer4@surplusiq.test'");
    assert.equal(u.status, 'ACTIVE');
  });

  it('TC-ACCT-003 [R1-012] POST /customer/consents với body rỗng trả 400 (không phải 500)', async () => {
    const l = await login('customer3@surplusiq.test');
    await q(
      "update users set status='ACTIVE', delete_requested_at=null where email='customer3@surplusiq.test'",
    );
    const l2 = await login('customer3@surplusiq.test');
    const r = await http('POST', '/customer/consents', {
      token: l2.body.accessToken || l.body.accessToken,
      body: {},
    });
    assert.equal(r.status, 400, `trả ${r.status}`);
  });

  it('TC-ACCT-004 [BR đăng nhập] sai mật khẩu nhiều lần thì khóa tạm, kể cả khi sau đó nhập đúng', async () => {
    const email = 'customer4@surplusiq.test';
    await q(
      "update users set status='ACTIVE', delete_requested_at=null, failed_login_count=0, locked_until=null where email=$1",
      [email],
    );
    let last;
    for (let i = 0; i < 8; i++) last = await login(email, 'sai-mat-khau-' + i);
    assert.ok([401, 403, 429].includes(last.status), `lần sai cuối trả ${last.status}`);
    const ok = await login(email);
    assert.ok(
      ok.status === 403 || ok.status === 429,
      `đúng mật khẩu sau khi bị khóa vẫn trả ${ok.status}`,
    );
  });

  it('TC-ACCT-005 [bảo mật] thông báo đăng nhập sai không tiết lộ tài khoản tồn tại', async () => {
    const a = await login('khong-ton-tai-xyz@surplusiq.test', 'x');
    const b = await login('customer3@surplusiq.test', 'sai-mat-khau');
    assert.equal(a.status, b.status, `${a.status} vs ${b.status}`);
    assert.equal(
      String(b.body?.message).replace(/\d+/g, '#'),
      String(a.body?.message).replace(/\d+/g, '#'),
      'thông báo khác nhau giữa tài khoản có/không tồn tại',
    );
  });
});
