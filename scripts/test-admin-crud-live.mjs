import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Opt-in integration check against a running LOCAL demo backend. It never seeds,
// migrates, calls a payment gateway or edits pre-existing business records.
const root = fileURLToPath(new URL('../', import.meta.url));
const config = {
  ...dotenv.parse(await readFile(path.join(root, '.env'), 'utf8')),
  ...process.env,
};
const requireBackend = createRequire(path.join(root, 'apps/backend/package.json'));
const { Client } = requireBackend('pg');
const cleanupOnly = process.argv[2] === '--cleanup';
const run = cleanupOnly ? process.argv[3] : `admin-crud-${Date.now()}-${randomUUID().slice(0, 8)}`;
assert.match(run || '', /^admin-crud-\d{13}-[a-f0-9]{8}$/, 'Invalid isolated test run identifier');
const base = new URL(config.ADMIN_TEST_API_URL || 'http://localhost:4000/');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Use a local demo backend');
assert.notEqual(config.NODE_ENV, 'production', 'Live CRUD checks must not run in production');
assert.ok(
  ['localhost', '127.0.0.1', '::1'].includes(config.DB_HOST || 'localhost'),
  'Use a local demo database',
);
if (!base.pathname.endsWith('/')) base.pathname += '/';
const db = new Client({
  host: config.DB_HOST || 'localhost',
  port: Number(config.POSTGRES_PORT || 5432),
  user: config.POSTGRES_USER || 'surplus_admin',
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB || 'surplusiq_db',
  connectionTimeoutMillis: 5000,
});
const password = `Test-${randomUUID()}`;
const ids = new Set();
let adminToken;
let requests = 0;
let checks = 0;
const interrupted = new AbortController();
const stop = () => {
  process.exitCode = 130;
  interrupted.abort();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const remember = (row) => {
  if (row?.id) ids.add(row.id);
  return row;
};
const quote = (name) => {
  assert.match(name, /^[a-z_]+$/, 'Unsafe database identifier');
  return `"${name}"`;
};
async function api(method, pathname, body, status = 200, token = adminToken, headers = {}) {
  requests++;
  const response = await fetch(new URL(pathname.replace(/^\//, ''), base), {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.any([AbortSignal.timeout(15000), interrupted.signal]),
  });
  const data = await response.json();
  // Do not include response payloads in assertions: auth responses contain tokens.
  if (status !== null)
    assert.equal(response.status, status, `${method} ${pathname}: unexpected HTTP status`);
  return { status: response.status, data };
}
async function check(name, work) {
  await work();
  checks++;
  console.log(`PASS ${name}`);
}
async function login(role, email, secret = password) {
  const pathname = role === 'CUSTOMER' ? '/auth/customer/login' : '/auth/store/login';
  const credentials = role === 'CUSTOMER' ? { identifier: email } : { email };
  return (
    await api(
      'POST',
      pathname,
      {
        ...credentials,
        password: secret,
        deviceId: `${run}-${role.toLowerCase()}`,
        deviceName: 'Isolated Admin CRUD integration check',
      },
      201,
      null,
    )
  ).data;
}

async function cleanup() {
  // Recover IDs even if an HTTP response was lost after the server committed.
  const users = await db.query('SELECT id FROM users WHERE email LIKE $1', [`${run}-%`]);
  users.rows.forEach(remember);
  const stores = await db.query('SELECT id FROM stores WHERE name LIKE $1', [`${run}%`]);
  stores.rows.forEach(remember);
  const metadata = await db.query(`
    SELECT c.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t USING (table_schema, table_name)
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  `);
  const tables = new Map();
  for (const row of metadata.rows) {
    if (!tables.has(row.table_name)) tables.set(row.table_name, new Map());
    tables.get(row.table_name).set(row.column_name, row.data_type);
  }
  const scopeColumns = new Set([
    'id',
    'store_id',
    'user_id',
    'customer_id',
    'owner_user_id',
    'reporter_id',
    'sender_id',
    'actor_id',
    'target_id',
    'order_id',
    'offer_id',
    'item_id',
    'complaint_id',
    'statement_id',
    'ticket_id',
    'campaign_id',
    'payment_id',
  ]);
  const where = (columns) => {
    const filters = [...columns.keys()]
      .filter((column) => scopeColumns.has(column))
      .map((column) => `${quote(column)}::text = ANY($1::text[])`);
    if (columns.has('device_id')) filters.push('"device_id" LIKE $2');
    if (columns.has('email')) filters.push('"email" LIKE $2');
    return filters.length ? `(${filters.join(' OR ')}) AND $2::text <> ''` : '';
  };
  const parameters = () => [[...ids], `${run}-%`];
  // Include children whose only link is another temporary row's generated UUID.
  for (let iteration = 0; iteration < tables.size; iteration++) {
    const size = ids.size;
    for (const [table, columns] of tables) {
      const condition = where(columns);
      if (!condition || columns.get('id') !== 'uuid') continue;
      const rows = await db.query(
        `SELECT id FROM ${quote(table)} WHERE ${condition}`,
        parameters(),
      );
      rows.rows.forEach(remember);
    }
    if (ids.size === size) break;
  }
  const foreignKeys = await db.query(`
    SELECT child.relname AS child, parent.relname AS parent
    FROM pg_constraint fk
    JOIN pg_class child ON child.oid = fk.conrelid
    JOIN pg_class parent ON parent.oid = fk.confrelid
    JOIN pg_namespace ns ON ns.oid = child.relnamespace
    WHERE fk.contype = 'f' AND ns.nspname = 'public'
  `);
  const children = new Map([...tables.keys()].map((table) => [table, []]));
  for (const edge of foreignKeys.rows) {
    if (edge.parent !== edge.child) children.get(edge.parent)?.push(edge.child);
  }
  const visited = new Set();
  const ordered = [];
  const visit = (table) => {
    if (visited.has(table)) return;
    visited.add(table);
    for (const child of children.get(table) || []) visit(child);
    ordered.push(table);
  };
  tables.forEach((_, table) => visit(table));
  let deleted = 0;
  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL lock_timeout = '5s'");
    for (const table of ordered) {
      const condition = where(tables.get(table));
      if (!condition) continue;
      deleted += (await db.query(`DELETE FROM ${quote(table)} WHERE ${condition}`, parameters()))
        .rowCount;
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
  let remaining = 0;
  for (const [table, columns] of tables) {
    const condition = where(columns);
    if (!condition) continue;
    remaining += Number(
      (await db.query(`SELECT COUNT(*) AS n FROM ${quote(table)} WHERE ${condition}`, parameters()))
        .rows[0].n,
    );
  }
  assert.equal(remaining, 0, 'Temporary fixture cleanup must leave zero matching rows');
  console.log(`Cleanup verified: ${deleted} temporary records removed; 0 remain.`);
}

async function test() {
  await check('anonymous callers cannot read or write Admin data', async () => {
    await api('GET', '/admin/snapshot', undefined, 401, null);
    await api('POST', '/admin/users', {}, 401, null);
  });
  const admin = await login(
    'ADMIN',
    config.ADMIN_TEST_EMAIL || config.SEED_ADMIN_EMAIL || 'admin@surplusiq.vn',
    config.ADMIN_TEST_PASSWORD || config.SEED_ADMIN_PASSWORD || 'Admin@SurplusIQ2026',
  );
  assert.equal(admin.user.role, 'ADMIN', 'Integration login requires ADMIN');
  adminToken = admin.accessToken;
  assert.equal(
    (await db.query('SELECT role FROM users WHERE id=$1', [admin.user.id])).rows[0]?.role,
    'ADMIN',
    'Backend and SQL must use the same demo database',
  );
  let customer;
  let owner;
  let temporaryAdmin;
  await check('ADMIN creates safe customer, owner and temporary ADMIN accounts', async () => {
    for (const role of ['CUSTOMER', 'STORE_USER', 'ADMIN']) {
      const result = await api(
        'POST',
        '/admin/users',
        {
          email: `${run}-${role.toLowerCase()}@example.test`,
          password,
          role,
        },
        201,
      );
      remember(result.data);
      assert.equal(result.data.role, role);
      assert.equal(result.data.status, 'ACTIVE');
      assert.ok(!JSON.stringify(result.data).includes('password'));
      if (role === 'CUSTOMER') customer = result.data;
      if (role === 'STORE_USER') owner = result.data;
      if (role === 'ADMIN') temporaryAdmin = result.data;
    }
  });
  await check(
    'user edit persists; duplicates, empty identity and self-lock are rejected',
    async () => {
      const updated = (
        await api('PATCH', `/admin/users/${customer.id}`, {
          email: `${run}-edited@example.test`,
          phone: null,
        })
      ).data;
      assert.equal(updated.email, `${run}-edited@example.test`);
      customer = updated;
      await api(
        'POST',
        '/admin/users',
        { email: customer.email.toUpperCase(), password, role: 'CUSTOMER' },
        409,
      );
      await api('PATCH', `/admin/users/${customer.id}`, { email: null, phone: null }, 400);
      await api('PATCH', `/admin/users/${admin.user.id}`, { status: 'LOCKED' }, 400);
      await api(
        'POST',
        '/admin/users',
        { email: `${run}-invalid@example.test`, password: 'short', role: 'CUSTOMER' },
        400,
      );
    },
  );
  const customerSession = await login('CUSTOMER', customer.email);
  await check('CUSTOMER and STORE_USER cannot invoke ADMIN writes', async () => {
    await api('GET', '/customer/orders', undefined, 200, customerSession.accessToken);
    await api('GET', '/admin/snapshot', undefined, 403, customerSession.accessToken);
    await api(
      'PATCH',
      `/admin/users/${customer.id}`,
      { status: 'LOCKED' },
      403,
      customerSession.accessToken,
    );
  });
  const adminSession = await login('ADMIN', temporaryAdmin.email);
  await check('role demotion invalidates old access and refresh tokens immediately', async () => {
    await api('PATCH', `/admin/users/${temporaryAdmin.id}`, { role: 'CUSTOMER' });
    await api('GET', '/admin/snapshot', undefined, 401, adminSession.accessToken);
    await api('POST', '/auth/refresh', { refreshToken: adminSession.refreshToken }, 401, null);
  });
  let store;
  await check(
    'store create provisions OWNER, settings and BASIC subscription atomically',
    async () => {
      store = remember(
        (
          await api(
            'POST',
            '/admin/stores',
            {
              ownerUserId: owner.id,
              name: `${run} store`,
              address: 'Temporary integration fixture',
              phone: '0900000000',
              status: 'ACTIVE',
            },
            201,
          )
        ).data,
      );
      const rows = await db.query(
        `SELECT
      (SELECT COUNT(*) FROM store_members WHERE store_id=$1 AND user_id=$2 AND permission='OWNER') AS members,
      (SELECT COUNT(*) FROM store_settings WHERE store_id=$1) AS settings,
      (SELECT plan FROM subscriptions WHERE store_id=$1) AS plan`,
        [store.id, owner.id],
      );
      assert.equal(Number(rows.rows[0].members), 1);
      assert.equal(Number(rows.rows[0].settings), 1);
      assert.equal(rows.rows[0].plan, 'BASIC');
      await api(
        'POST',
        '/admin/stores',
        {
          ownerUserId: owner.id,
          name: `${run} duplicate`,
          address: 'Temporary',
          phone: '0900000000',
        },
        409,
      );
    },
  );
  const ownerSession = await login('STORE_USER', owner.email);
  await check('STORE_USER role guard and store editing enforce expected boundaries', async () => {
    await api('POST', '/admin/stores', {}, 403, ownerSession.accessToken);
    const updated = (
      await api('PATCH', `/admin/stores/${store.id}`, {
        name: `${run} edited store`,
        address: 'Updated temporary address',
        logoUrl: null,
      })
    ).data;
    assert.equal(updated.name, `${run} edited store`);
    assert.equal(updated.logoUrl, null);
    await api('PATCH', `/admin/stores/${store.id}`, { name: null }, 400);
  });
  await check(
    'store settings validate null, integers, time and BASIC plan restrictions',
    async () => {
      const updated = (
        await api('PUT', `/admin/stores/${store.id}/settings`, {
          defaultPickupStart: '18:30',
          defaultPickupEnd: '21:00',
          floorRatio: 0.4,
          maxQtyPerOrder: 4,
          lateGraceMinutes: 10,
        })
      ).data;
      assert.equal(updated.maxQtyPerOrder, 4);
      await api('PUT', `/admin/stores/${store.id}/settings`, { pricingMode: null }, 400);
      await api(
        'PUT',
        `/admin/stores/${store.id}/settings`,
        { floorRatio: null, costPriceRatio: 0.3 },
        400,
      );
      await api('PUT', `/admin/stores/${store.id}/settings`, { lateGraceMinutes: 1.5 }, 400);
      await api('PUT', `/admin/stores/${store.id}/settings`, { defaultPickupStart: '25:00' }, 400);
      await api('PUT', `/admin/stores/${store.id}/settings`, { pricingMode: 'AUTO' }, 400);
    },
  );
  await check(
    'concurrent upgrades activate PRO and create exactly one simulated invoice',
    async () => {
      const results = await Promise.all(
        [0, 1].map(() =>
          api('POST', `/admin/stores/${store.id}/subscription/upgrade`, undefined, null),
        ),
      );
      assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
      const invoices = await db.query(
        'SELECT COUNT(*) AS n FROM subscription_invoices WHERE store_id=$1',
        [store.id],
      );
      assert.equal(Number(invoices.rows[0].n), 1);
      const updated = (
        await api('PUT', `/admin/stores/${store.id}/settings`, { pricingMode: 'AUTO' })
      ).data;
      assert.equal(updated.pricingMode, 'AUTO');
    },
  );
  await check(
    'two concurrent renewals extend PRO by 60 days and preserve both invoices',
    async () => {
      const previous = (
        await db.query('SELECT period_end FROM subscriptions WHERE store_id=$1', [store.id])
      ).rows[0].period_end;
      const results = await Promise.all(
        [0, 1].map(() =>
          api('POST', `/admin/stores/${store.id}/subscription/renew`, undefined, 201),
        ),
      );
      assert.equal(results.length, 2);
      const current = (
        await db.query('SELECT period_end FROM subscriptions WHERE store_id=$1', [store.id])
      ).rows[0].period_end;
      assert.equal(current.getTime() - previous.getTime(), 60 * 86400000);
      assert.equal(
        Number(
          (
            await db.query('SELECT COUNT(*) AS n FROM subscription_invoices WHERE store_id=$1', [
              store.id,
            ])
          ).rows[0].n,
        ),
        3,
      );
    },
  );
  await check(
    'concurrent downgrade requests schedule BASIC once without deleting invoices',
    async () => {
      await Promise.all(
        [0, 1].map(() =>
          api('POST', `/admin/stores/${store.id}/subscription/downgrade`, undefined, 201),
        ),
      );
      const current = (
        await db.query(
          'SELECT plan, downgrade_at_period_end FROM subscriptions WHERE store_id=$1',
          [store.id],
        )
      ).rows[0];
      assert.equal(current.plan, 'PRO');
      assert.equal(current.downgrade_at_period_end, true);
      await api('POST', `/admin/stores/${store.id}/subscription/invalid`, undefined, 400);
    },
  );
  await check(
    'quota validation rejects invalid periods, values and ignored TRIAL edits',
    async () => {
      await api(
        'POST',
        '/admin/quotas',
        { plan: 'TRIAL', quotaKey: 'daily_offers', quotaValue: 50, period: 'DAILY' },
        400,
      );
      await api(
        'POST',
        '/admin/quotas',
        { plan: 'BASIC', quotaKey: 'daily_offers', quotaValue: 50, period: 'MONTHLY' },
        400,
      );
      await api(
        'POST',
        '/admin/quotas',
        { plan: 'PRO', quotaKey: 'daily_offers', quotaValue: 2147483648, period: 'DAILY' },
        400,
      );
      const trial = (await db.query("SELECT id FROM plan_quotas WHERE plan='TRIAL' LIMIT 1"))
        .rows[0];
      if (trial) await api('PATCH', `/admin/quotas/${trial.id}`, { quotaValue: 1 }, 400);
    },
  );
  const itemId = randomUUID();
  const offerId = randomUUID();
  ids.add(itemId);
  ids.add(offerId);
  await db.query(
    `INSERT INTO items (id, store_id, name, category, original_price, standard_shelf_life_hours)
    VALUES ($1,$2,$3,'Integration',24000,24)`,
    [itemId, store.id, `${run} item`],
  );
  await db.query(
    `INSERT INTO offers (id,store_id,item_id,total_quantity,remaining_quantity,original_price,current_price,floor_price,pickup_start,pickup_end,expires_at,status)
    VALUES ($1,$2,$3,20,20,24000,12000,10000,now()+interval '1 hour',now()+interval '3 hours',now()+interval '4 hours','OPEN')`,
    [offerId, store.id, itemId],
  );
  const complaints = [];
  for (let i = 0; i < 3; i++) {
    const orderId = randomUUID();
    const complaintId = randomUUID();
    ids.add(orderId);
    ids.add(complaintId);
    await db.query(
      `INSERT INTO orders (id,code,customer_id,store_id,offer_id,quantity,unit_price,total_amount,status,hold_expires_at,paid_at,picked_up_at)
      VALUES ($1,$2,$3,$4,$5,1,12000,12000,'PICKED_UP',now()+interval '1 hour',now(),now())`,
      [
        orderId,
        `T${randomUUID().replaceAll('-', '').slice(0, 11)}`,
        customer.id,
        store.id,
        offerId,
      ],
    );
    await db.query(
      `INSERT INTO payment_transactions (order_id,store_id,kind,amount,method,gateway_txn_id,status)
      VALUES ($1,$2,'ORDER_PAYMENT',12000,'SIMULATED',$3,'SUCCEEDED')`,
      [orderId, store.id, `${run}-payment-${i}`],
    );
    await db.query(
      `INSERT INTO complaints (id,order_id,customer_id,store_id,category,description,status,response_due_at)
      VALUES ($1,$2,$3,$4,'QUALITY',$5,'PENDING_STORE',now()+interval '2 days')`,
      [complaintId, orderId, customer.id, store.id, `${run} complaint`],
    );
    complaints.push({ id: complaintId, orderId });
  }
  await check(
    'concurrent Admin decisions refund exactly once and retain consistent complaint/order states',
    async () => {
      await api(
        'POST',
        `/admin/complaints/${complaints[0].id}/resolve`,
        { decision: 'ACCEPT', refundAmount: 12001 },
        400,
      );
      const results = await Promise.all(
        [0, 1].map(() =>
          api(
            'POST',
            `/admin/complaints/${complaints[0].id}/resolve`,
            { decision: 'ACCEPT' },
            null,
          ),
        ),
      );
      assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
      const refunds = await db.query(
        "SELECT COUNT(*) AS n,SUM(amount) AS amount FROM payment_transactions WHERE order_id=$1 AND kind='ORDER_REFUND'",
        [complaints[0].orderId],
      );
      assert.equal(Number(refunds.rows[0].n), 1);
      assert.equal(Number(refunds.rows[0].amount), 12000);
      assert.equal(
        (await db.query('SELECT status FROM orders WHERE id=$1', [complaints[0].orderId])).rows[0]
          .status,
        'REFUNDED',
      );
    },
  );
  await check(
    'Admin and Store decisions share locks and cannot refund the same complaint twice',
    async () => {
      const results = await Promise.all([
        api('POST', `/admin/complaints/${complaints[1].id}/resolve`, { decision: 'ACCEPT' }, null),
        api(
          'POST',
          `/store/complaints/${complaints[1].id}/resolve`,
          { refundAmount: 12000 },
          null,
          ownerSession.accessToken,
        ),
      ]);
      assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT COUNT(*) AS n FROM payment_transactions WHERE order_id=$1 AND kind='ORDER_REFUND'",
              [complaints[1].orderId],
            )
          ).rows[0].n,
        ),
        1,
      );
    },
  );
  await check('rejecting a complaint requires a reason and does not create a refund', async () => {
    await api(
      'POST',
      `/admin/complaints/${complaints[2].id}/resolve`,
      { decision: 'REJECT', reason: '  ' },
      400,
    );
    const result = (
      await api(
        'POST',
        `/admin/complaints/${complaints[2].id}/resolve`,
        { decision: 'REJECT', reason: 'Temporary test decision' },
        201,
      )
    ).data;
    assert.equal(result.complaint.status, 'REJECTED');
    assert.equal(
      Number(
        (
          await db.query(
            "SELECT COUNT(*) AS n FROM payment_transactions WHERE order_id=$1 AND kind='ORDER_REFUND'",
            [complaints[2].orderId],
          )
        ).rows[0].n,
      ),
      0,
    );
  });
  const reviewId = randomUUID();
  const violationId = randomUUID();
  ids.add(reviewId);
  ids.add(violationId);
  await db.query(
    `INSERT INTO reviews (id,order_id,customer_id,store_id,rating,comment)
    VALUES ($1,$2,$3,$4,4,$5)`,
    [reviewId, complaints[2].orderId, customer.id, store.id, `${run} review`],
  );
  await db.query(
    `INSERT INTO violation_reports (id,reporter_id,target_type,target_id,reason)
    VALUES ($1,$2,'REVIEW',$3,$4)`,
    [violationId, customer.id, reviewId, `${run} violation`],
  );
  await check('review hide/unhide preserves text; violation moderation persists', async () => {
    const hidden = (await api('DELETE', `/admin/reviews/${reviewId}`)).data;
    assert.equal(hidden.status, 'HIDDEN');
    assert.equal(hidden.comment, `${run} review`);
    await api('PATCH', `/admin/reviews/${reviewId}`, { status: 'VISIBLE' });
    assert.equal(
      (await api('PATCH', `/admin/violations/${violationId}`, { status: 'REVIEWED' })).data.status,
      'REVIEWED',
    );
    await api('PATCH', `/admin/violations/${violationId}`, { status: 'INVALID' }, 400);
  });
  await check(
    'ACTIVE stores accept holds and suspended stores reject new holds without inventory changes',
    async () => {
      remember(
        (
          await api(
            'POST',
            '/customer/orders',
            { offerId, quantity: 1 },
            201,
            customerSession.accessToken,
            { 'Idempotency-Key': `${run}-hold-open` },
          )
        ).data,
      );
      assert.equal((await api('DELETE', `/admin/stores/${store.id}`)).data.status, 'SUSPENDED');
      const before = Number(
        (await db.query('SELECT remaining_quantity FROM offers WHERE id=$1', [offerId])).rows[0]
          .remaining_quantity,
      );
      await api(
        'POST',
        '/customer/orders',
        { offerId, quantity: 1 },
        400,
        customerSession.accessToken,
        { 'Idempotency-Key': `${run}-hold-closed` },
      );
      const after = Number(
        (await db.query('SELECT remaining_quantity FROM offers WHERE id=$1', [offerId])).rows[0]
          .remaining_quantity,
      );
      assert.equal(after, before);
      await api('PATCH', `/admin/stores/${store.id}`, { status: 'ACTIVE' });
    },
  );
  await check(
    'customer joined pagination and store pagination read the committed fixture orders',
    async () => {
      for (const [pathname, token] of [
        ['/customer/orders?page=2&limit=2', customerSession.accessToken],
        ['/store/orders?page=2&limit=2', ownerSession.accessToken],
      ]) {
        const result = (await api('GET', pathname, undefined, 200, token)).data;
        assert.equal(result.total, 4);
        assert.equal(result.page, 2);
        assert.equal(result.data.length, 2);
        assert.ok(result.data.every((order) => order.storeId === store.id));
      }
    },
  );
  await check(
    'locking a user invalidates JWT, refresh and login while preserving business history',
    async () => {
      assert.equal((await api('DELETE', `/admin/users/${customer.id}`)).data.status, 'LOCKED');
      await api('GET', '/customer/orders/active', undefined, 401, customerSession.accessToken);
      await api('POST', '/auth/refresh', { refreshToken: customerSession.refreshToken }, 401, null);
      await api(
        'POST',
        '/auth/customer/login',
        { identifier: customer.email, password, deviceId: `${run}-locked` },
        403,
        null,
      );
      assert.equal(
        Number(
          (await db.query('SELECT COUNT(*) AS n FROM orders WHERE customer_id=$1', [customer.id]))
            .rows[0].n,
        ),
        4,
      );
      await api('PATCH', `/admin/users/${customer.id}`, { status: 'ACTIVE' });
    },
  );
  await check(
    'live Admin snapshot includes committed changes and excludes credential/audit payload fields',
    async () => {
      const snapshot = (await api('GET', '/admin/snapshot')).data;
      assert.equal(
        snapshot.collections.stores.find((row) => row.id === store.id)?.name,
        `${run} edited store`,
      );
      assert.equal(
        snapshot.collections.complaints.find((row) => row.id === complaints[0].id)?.status,
        'ACCEPTED',
      );
      assert.ok(snapshot.collections.audit.some((row) => row.target_id === customer.id));
      for (const rows of Object.values(snapshot.collections)) {
        for (const row of rows) {
          assert.ok(
            !Object.keys(row).some((key) =>
              /password|token|secret|otp|backup_code|gateway|old_value|new_value/i.test(key),
            ),
            'Snapshot must not include sensitive field names',
          );
        }
      }
    },
  );
}

console.log(`Isolated local CRUD run: ${run}`);
let connected = false;
try {
  await db.connect();
  connected = true;
  if (!cleanupOnly) await test();
} catch (error) {
  // Deliberately omit assertion values, response bodies and connection objects.
  console.error(`FAIL ${error.message}`);
  process.exitCode ||= 1;
} finally {
  if (connected) {
    try {
      await cleanup();
    } catch (error) {
      console.error(
        `Cleanup failed (${error.code || error.name}). Retry: node scripts/test-admin-crud-live.mjs --cleanup ${run}`,
      );
      process.exitCode ||= 1;
    }
    await db.end();
  }
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
if (!process.exitCode && !cleanupOnly)
  console.log(`Live Admin CRUD passed: ${checks} scenarios / ${requests} real HTTP requests.`);
