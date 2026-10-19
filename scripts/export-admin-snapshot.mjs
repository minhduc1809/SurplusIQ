import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';

const root = fileURLToPath(new URL('../', import.meta.url));
const requireBackend = createRequire(path.join(root, 'apps/backend/package.json'));
const { Client, types } = requireBackend('pg');
const schemaPath = path.join(root, 'apps/backend/src/modules/platform-admin/data-collections.json');
const output = path.join(root, 'apps/web/public/admin-data/snapshot.json');

export async function exportAdminSnapshot() {
  // Read configuration without starting Nest, migrations, seeds or background jobs.
  const config = {
    ...dotenv.parse(await readFile(path.join(root, '.env'), 'utf8')),
    ...process.env,
  };
  if (config.NODE_ENV === 'production')
    throw new Error('Snapshot chỉ dành cho dữ liệu demo cục bộ.');
  const definitions = JSON.parse(await readFile(schemaPath, 'utf8'));
  const client = new Client({
    host: config.DB_HOST || 'localhost',
    port: Number(config.POSTGRES_PORT || 5432),
    user: config.POSTGRES_USER || 'surplus_admin',
    password: config.POSTGRES_PASSWORD,
    database: config.POSTGRES_DB || 'surplusiq_db',
    connectionTimeoutMillis: 5000,
    // Preserve calendar DATE columns, rather than converting local midnight to UTC.
    types: {
      getTypeParser: (oid, format) =>
        oid === 1082 ? (value) => value : types.getTypeParser(oid, format),
    },
  });
  const quote = (identifier) => {
    if (!/^[a-z_]+$/.test(identifier)) throw new Error('Tên trường snapshot không hợp lệ.');
    if (
      /password|token|secret|otp|backup_code|gateway|payment_txn|payload|old_value|new_value/i.test(
        identifier,
      )
    ) {
      throw new Error('Không được xuất trường xác thực hoặc payload chưa kiểm soát.');
    }
    return `"${identifier}"`;
  };
  let temporary;
  try {
    await client.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL statement_timeout = '15s'");
    const timestamp = await client.query('SELECT transaction_timestamp() AS exported_at');
    const collections = {};
    for (const [key, definition] of Object.entries(definitions)) {
      const fields = Object.keys(definition.fields).map(quote).join(', ');
      const query = `SELECT ${fields} FROM ${quote(definition.table)} ORDER BY ${quote(definition.primaryKey)}`;
      const result = await client.query(query);
      collections[key] = result.rows;
    }
    await client.query('COMMIT');
    const byId = (key, field = 'id') => new Map(collections[key].map((row) => [row[field], row]));
    const stores = byId('stores');
    const users = byId('users');
    const orders = byId('orders');
    const items = byId('items');
    for (const rows of Object.values(collections)) {
      for (const row of rows) {
        if (row.store_id) row.store_name = stores.get(row.store_id)?.name || row.store_id;
        const userId =
          row.customer_id || row.user_id || row.owner_user_id || row.actor_id || row.reporter_id;
        if (userId) row.user_label = users.get(userId)?.email || users.get(userId)?.phone || userId;
        if (row.order_id) row.order_code = orders.get(row.order_id)?.code || row.order_id;
        if (row.item_id) row.item_name = items.get(row.item_id)?.name || row.item_id;
      }
    }
    const snapshot = {
      version: 1,
      exportedAt: timestamp.rows[0].exported_at.toISOString(),
      source: 'PostgreSQL snapshot',
      counts: Object.fromEntries(
        Object.entries(collections).map(([key, rows]) => [key, rows.length]),
      ),
      collections,
    };
    await mkdir(path.dirname(output), { recursive: true });
    temporary = `${output}.${process.pid}.tmp`;
    await writeFile(temporary, JSON.stringify(snapshot), { encoding: 'utf8', mode: 0o600 });
    await rename(temporary, output);
    console.log(
      `Đã xuất snapshot ${snapshot.exportedAt}: ${Object.values(snapshot.counts).reduce((a, b) => a + b, 0)} bản ghi / ${Object.keys(collections).length} tập dữ liệu.`,
    );
    console.log('Tệp: apps/web/public/admin-data/snapshot.json');
    return snapshot;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (temporary) await rm(temporary, { force: true }).catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  exportAdminSnapshot().catch((error) => {
    console.error(`Không thể xuất snapshot: ${error.message}`);
    process.exitCode = 1;
  });
}
