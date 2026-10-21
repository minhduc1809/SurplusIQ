// Ma trận quyền Chủ/Quản lý/Quầy, giới hạn gói Cơ bản/Pro, và quét lỗi 5xx toàn bộ API theo vai trò đúng.
// Chạy: npm --workspace=@surplusiq/backend run test:audit:matrix  (backend test cổng 4100)
import assert from 'node:assert/strict';
import { before, describe, it, after } from 'node:test';
import { closeDb, endpoints, fill, http, loginAs, q, ACCOUNTS } from './helpers.mjs';

const all = endpoints();
const tokens = {};
const SKIP = (e) =>
  e.path.startsWith('/auth/') ||
  e.path.startsWith('/seed') ||
  e.path.startsWith('/dev/') ||
  e.path.startsWith('/jobs') ||
  e.path === '/payments/webhook' ||
  e.path.startsWith('/realtime') ||
  e.path.startsWith('/rescue-bridge/respond/') ||
  e.path === '/store/staff/accept-invite' ||
  e.path === '/me/2fa/toggle' ||
  e.path.startsWith('/me/2fa') ||
  e.path === '/auth/refresh';

async function provisionStaff() {
  // Seed không có Quản lý/Quầy: tạo trực tiếp trong DB test, dùng lại hash mật khẩu của chủ cửa hàng A.
  const [owner] = await q(
    "select u.password_hash h, sm.store_id from users u join store_members sm on sm.user_id=u.id where u.email='owner@rincon.vn'",
  );
  for (const [email, perm] of [
    ['audit.manager@surplusiq.test', 'MANAGER'],
    ['audit.counter@surplusiq.test', 'COUNTER'],
  ]) {
    const ex = await q('select id from users where email=$1', [email]);
    let id = ex[0]?.id;
    if (!id) {
      id = (
        await q(
          "insert into users(email,password_hash,role,status,full_name) values($1,$2,'STORE_USER','ACTIVE',$3) returning id",
          [email, owner.h, 'Audit ' + perm],
        )
      )[0].id;
      await q(
        "insert into store_members(store_id,user_id,permission,status) values($1,$2,$3,'ACTIVE')",
        [owner.store_id, id, perm],
      );
    }
    ACCOUNTS[perm.toLowerCase()] = {
      path: '/auth/store/login',
      body: { email, password: '123456' },
    };
  }
}

before(async () => {
  await provisionStaff();
  for (const n of ['customerA', 'storeA', 'admin', 'manager', 'counter'])
    tokens[n] = await loginAs(n);
});
after(async () => {
  // Quét 5xx gọi POST /customer/delete-request nên khách A bị chuyển PENDING_DELETE: khôi phục dữ liệu test.
  await q(
    "update users set status='ACTIVE', delete_requested_at=null where email in ('customer@surplusiq.vn')",
  );
  await closeDb();
});

const body = (e) => (e.method === 'GET' || e.method === 'DELETE' ? undefined : {});

describe('TC-ROLE – ma trận quyền Chủ/Quản lý/Quầy theo @Permissions (ROLE-OWNER/MANAGER/COUNTER)', () => {
  const storeEps = all.filter((e) => e.path.startsWith('/store') && !SKIP(e) && e.perm);
  for (const role of ['owner', 'manager', 'counter']) {
    it(`TC-ROLE-${role.toUpperCase()}-001 vai trò ${role}: bị chặn (403) đúng ở endpoint không được cấp quyền`, async () => {
      const tok = role === 'owner' ? tokens.storeA : tokens[role];
      const perm = role.toUpperCase();
      const bad = [];
      for (const e of storeEps) {
        const allowed = e.perm.includes(perm);
        const r = await http(e.method, fill(e.path), { token: tok, body: body(e) });
        if (r.status === 429) continue;
        const denied = r.status === 403 && r.body?.code !== 'FORBIDDEN_PLAN';
        if (!allowed && !denied) bad.push(`${e.method} ${e.path} (cần ${e.perm}) → ${r.status}`);
      }
      assert.deepEqual(
        bad,
        [],
        `${perm} gọi được endpoint không thuộc quyền:\n  ${bad.join('\n  ')}`,
      );
    });
    it(`TC-ROLE-${role.toUpperCase()}-002 vai trò ${role}: KHÔNG bị chặn oan ở endpoint được cấp quyền`, async () => {
      const tok = role === 'owner' ? tokens.storeA : tokens[role];
      const perm = role.toUpperCase();
      const bad = [];
      for (const e of storeEps.filter((x) => x.perm.includes(perm))) {
        const r = await http(e.method, fill(e.path), { token: tok, body: body(e) });
        if (r.status === 403 && r.body?.code !== 'FORBIDDEN_PLAN')
          bad.push(`${e.method} ${e.path} → 403 ${JSON.stringify(r.body)?.slice(0, 60)}`);
      }
      assert.deepEqual(bad, [], `${perm} bị chặn oan:\n  ${bad.join('\n  ')}`);
    });
  }
  it('TC-ROLE-COUNTER-003 [mô tả vai trò] Quầy quét được QR nhưng không tạo/hủy suất', async () => {
    const r1 = await http('POST', '/store/offers', { token: tokens.counter, body: {} });
    const r2 = await http('GET', '/store/orders', { token: tokens.counter });
    const r3 = await http('POST', '/store/pickups/verify', {
      token: tokens.counter,
      body: { token: 'x' },
    });
    assert.equal(r1.status, 403, `Quầy tạo suất → ${r1.status}`);
    assert.equal(r2.status, 200, `Quầy xem đơn → ${r2.status}`);
    assert.notEqual(r3.status, 403, `Quầy quét QR → ${r3.status}`);
  });
  it('TC-ROLE-MANAGER-003 [mô tả vai trò] Quản lý không đổi gói/nhân viên/cấu hình thanh toán', async () => {
    const probes = [
      ['POST', '/store/staff/invite'],
      ['POST', '/store/subscription/upgrade'],
      ['PUT', '/store/marketing/segment-config'],
    ];
    const bad = [];
    for (const [m, p] of probes) {
      const ep = all.find((e) => e.method === m && e.path === p);
      if (!ep) continue;
      const r = await http(m, p, { token: tokens.manager, body: {} });
      if (r.status !== 403) bad.push(`${m} ${p} → ${r.status}`);
    }
    assert.deepEqual(bad, [], bad.join('; '));
  });
});

describe('TC-PLAN – giới hạn gói Cơ bản/Pro (FL-011, @RequiresPlan)', () => {
  let basic, pro;
  before(async () => {
    for (let i = 2; i <= 8; i++) {
      const email = `owner${i}@surplusiq.test`;
      const l = await http('POST', '/auth/store/login', {
        body: { email, password: '123456', deviceId: 'plan-' + i },
      });
      if (l.status !== 201) continue;
      const s = await http('GET', '/store/subscription/current', { token: l.body.accessToken });
      const plan = s.body?.plan ?? s.body?.subscription?.plan;
      if (plan === 'BASIC' && !basic) basic = l.body.accessToken;
      if (plan === 'PRO' && !pro) pro = l.body.accessToken;
    }
  });
  const proEps = () =>
    all.filter((e) => e.plan === 'PRO' && e.path.startsWith('/store') && !SKIP(e));
  it('TC-PLAN-001 cửa hàng gói BASIC bị chặn FORBIDDEN_PLAN ở mọi endpoint @RequiresPlan', async () => {
    if (!basic) return assert.fail('không có cửa hàng BASIC trong seed (BLOCKED dữ liệu)');
    const bad = [];
    for (const e of proEps()) {
      const r = await http(e.method, fill(e.path), { token: basic, body: body(e) });
      if (!(r.status === 403 && r.body?.code === 'FORBIDDEN_PLAN'))
        bad.push(`${e.method} ${e.path} → ${r.status} ${r.body?.code ?? ''}`);
    }
    assert.deepEqual(bad, [], `BASIC dùng được tính năng Pro:\n  ${bad.join('\n  ')}`);
  });
  it('TC-PLAN-002 cửa hàng gói PRO không bị chặn gói ở endpoint @RequiresPlan', async () => {
    if (!pro) return assert.fail('không có cửa hàng PRO trong seed (BLOCKED dữ liệu)');
    const bad = [];
    for (const e of proEps()) {
      const r = await http(e.method, fill(e.path), { token: pro, body: body(e) });
      if (r.body?.code === 'FORBIDDEN_PLAN') bad.push(`${e.method} ${e.path}`);
    }
    assert.deepEqual(bad, [], `PRO bị chặn gói:\n  ${bad.join('\n  ')}`);
  });
});

describe('TC-5XX – không endpoint nào trả lỗi máy chủ 5xx với dữ liệu rỗng/ID lạ (mọi vai trò đúng)', () => {
  const run = async (list, tok) => {
    const bad = [];
    for (const e of list) {
      const r = await http(e.method, fill(e.path), { token: tok, body: body(e) });
      if (r.status >= 500)
        bad.push(
          `${e.method} ${e.path} → ${r.status} ${String(r.body?.message ?? r.body).slice(0, 70)}`,
        );
    }
    return bad;
  };
  it('TC-5XX-001 endpoint /customer/*', async () => {
    const bad = await run(
      all.filter((e) => e.path.startsWith('/customer') && !SKIP(e)),
      tokens.customerA,
    );
    assert.deepEqual(bad, [], `${bad.length} lỗi 5xx:\n  ${bad.join('\n  ')}`);
  });
  it('TC-5XX-002 endpoint /store/*', async () => {
    const bad = await run(
      all.filter((e) => e.path.startsWith('/store') && !SKIP(e)),
      tokens.storeA,
    );
    assert.deepEqual(bad, [], `${bad.length} lỗi 5xx:\n  ${bad.join('\n  ')}`);
  });
  it('TC-5XX-003 endpoint /admin/*', async () => {
    const bad = await run(
      all.filter((e) => e.path.startsWith('/admin') && !SKIP(e)),
      tokens.admin,
    );
    assert.deepEqual(bad, [], `${bad.length} lỗi 5xx:\n  ${bad.join('\n  ')}`);
  });
  it('TC-5XX-004 endpoint /me/*, /orders/*, /payments/*, /upload/*', async () => {
    const list = all.filter((e) => /^\/(me|orders|payments|upload)/.test(e.path) && !SKIP(e));
    const bad = await run(list, tokens.customerA);
    assert.deepEqual(bad, [], `${bad.length} lỗi 5xx:\n  ${bad.join('\n  ')}`);
  });
});
