// Chạy MỘT LƯỢT toàn bộ bộ test audit và ghi log từng lớp vào docs/audit/logs/.
// Chạy: node apps/backend/test/audit/run-audit-all.mjs   (cần Postgres + Redis; tự khởi động backend test 4100 và 4101)
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const backend = fileURLToPath(new URL('../../', import.meta.url));
const logs = fileURLToPath(new URL('../../../../docs/audit/logs/', import.meta.url));
mkdirSync(logs, { recursive: true });
const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: backend, encoding: 'utf8', shell: true, timeout: 900_000, ...opts });
const restart = (port = 4100, env = 'development') =>
  run('powershell', [
    '-NoProfile',
    '-File',
    `"${dir}restart-test-backend.ps1"`,
    '-Port',
    port,
    '-NodeEnv',
    env,
  ]);
const suites = [
  ['contract', 4100, 'test:audit:contract'],
  ['security', 4100, 'test:audit:security'],
  ['matrix', 4100, 'test:audit:matrix'],
  ['account', 4100, 'test:audit:account'],
  ['bridge', 4100, 'test:audit:bridge'],
  ['flows', 4100, 'test:audit:flows'],
  ['production', 4101, 'test:audit:production'],
  ['concurrency', 4100, 'test:audit:concurrency'],
];
const summary = [];
// Mỗi lượt chạy đầy đủ bắt đầu từ DB test sạch (tránh nhiễu: hạn mức 100 suất/ngày BR-054, phạt không-đến-nhận BR-020).
const reset = run('node', [`"${dir}reset-test-db.mjs"`]);
console.log(
  String(reset.stdout || reset.stderr || '')
    .trim()
    .split(/\r?\n/)
    .pop(),
);
if (reset.status !== 0) process.exit(1);

for (const [name, port, script] of suites) {
  if (name === 'production') restart(4101, 'production');
  else restart(4100); // backend sạch cho mỗi lớp (concurrency làm treo backend)
  const env = {
    ...process.env,
    AUDIT_API_URL: `http://localhost:${port}`,
    ...(name === 'concurrency' ? { AUDIT_HTTP_TIMEOUT_MS: '40000' } : {}),
  };
  const r = run('npm', ['--silent', 'run', script, '--workspace=@surplusiq/backend'], {
    env,
    cwd: fileURLToPath(new URL('../../../../', import.meta.url)),
  });
  const out = (r.stdout || '') + (r.stderr || '');
  writeFileSync(`${logs}${name}.log`, out);
  const get = (k) => Number((new RegExp(`^# ${k} ([0-9]+)`, 'm').exec(out) ?? [])[1] ?? 0);
  summary.push({
    name,
    tests: get('tests'),
    pass: get('pass'),
    fail: get('fail'),
    skipped: get('skipped'),
  });
  console.log(
    `${name}: ${get('pass')}/${get('tests')} đạt, ${get('fail')} lỗi, ${get('skipped')} bỏ qua`,
  );
}
writeFileSync(`${logs}summary.json`, JSON.stringify(summary, null, 1));
