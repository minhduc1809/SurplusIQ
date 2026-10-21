// Tạo lại DB test sạch: dừng backend test, drop/create surplusiq_test, chạy migration và seed mặc định.
// Chạy: node apps/backend/test/audit/reset-test-db.mjs  (chỉ tác động DB tên surplusiq_test)
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const backend = fileURLToPath(new URL('../../', import.meta.url));
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const req = createRequire(new URL('../../package.json', import.meta.url));
const { Client } = req('pg');
req('dotenv').config({ path: `${root}.env` });
const DB = 'surplusiq_test';

for (const port of [4000, 4100, 4101]) {
  spawnSync('powershell', [
    '-NoProfile',
    '-Command',
    `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`,
  ]);
}
const c = new Client({
  host: 'localhost',
  port: +process.env.POSTGRES_PORT,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres',
});
await c.connect();
await c.query(
  `select pg_terminate_backend(pid) from pg_stat_activity where datname='${DB}' and pid<>pg_backend_pid()`,
);
await c.query(`drop database if exists ${DB}`);
await c.query(`create database ${DB}`);
await c.end();
const env = { ...process.env, POSTGRES_DB: DB };
const mig = spawnSync('npm', ['run', 'migration:run'], {
  cwd: backend,
  env,
  shell: true,
  encoding: 'utf8',
});
if (mig.status !== 0) {
  console.error(mig.stdout.slice(-800), mig.stderr.slice(-800));
  process.exit(1);
}
const seed = spawnSync('npx', ['ts-node', 'apps/backend/src/seed-runner.ts'], {
  cwd: root,
  env,
  shell: true,
  encoding: 'utf8',
});
if (seed.status !== 0) {
  console.error(seed.stdout.slice(-800), seed.stderr.slice(-800));
  process.exit(1);
}
console.log('DB test sạch đã sẵn sàng (migration + seed).');
