// Kiểm thử hợp đồng API tĩnh: mọi endpoint mà app Android (khách + cửa hàng) và web gọi phải tồn tại trên backend (method + đường dẫn).
// Không cần backend chạy. Dùng endpoints.json do scan-endpoints.py sinh ra từ decorator controller.
// Chạy: npm --workspace=@surplusiq/backend run test:audit:contract
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { endpoints } from './helpers.mjs';

const ROOT = new URL('../../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const norm = (p) =>
  '/' +
  p
    .replace(/^\/+/, '')
    .replace(/\?.*$/, '')
    .replace(/\{[^}]+\}|:[A-Za-z_]+|\$\{[^}]+\}/g, ':p')
    .replace(/\/+$/, '');
const routes = endpoints().map((e) => `${e.method} ${norm(e.path)}`);
const routeSet = new Set(routes);
// Một số route backend có tham số nối với literal nên so khớp thêm theo regex.
const routeRegex = endpoints().map((e) => ({
  m: e.method,
  re: new RegExp('^' + norm(e.path).replace(/:p/g, '[^/]+') + '$'),
}));
const exists = (m, p) =>
  routeSet.has(`${m} ${p}`) || routeRegex.some((r) => r.m === m && r.re.test(p));

function walk(dir, exts, out = []) {
  for (const n of readdirSync(dir)) {
    if (['node_modules', 'build', '.gradle', 'dist'].includes(n)) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walk(f, exts, out);
    else if (exts.some((x) => f.endsWith(x))) out.push(f);
  }
  return out;
}

function kotlinCalls(dir) {
  const calls = [];
  for (const f of walk(dir, ['.kt'])) {
    const t = readFileSync(f, 'utf8').split('\n');
    t.forEach((l, i) => {
      const m = l.match(/@(GET|POST|PUT|PATCH|DELETE)\("([^"]+)"/);
      if (m)
        calls.push({
          file: relative(ROOT, f).replace(/\\/g, '/'),
          line: i + 1,
          method: m[1],
          path: norm(m[2]),
        });
    });
  }
  return calls;
}

function webCalls(dir, adminOnly) {
  const calls = [];
  for (const f of walk(dir, ['.ts', '.tsx'])) {
    if (f.includes('/tests/') || f.includes('.spec.') || adminOnly !== f.includes('platform-admin'))
      continue;
    readFileSync(f, 'utf8')
      .split('\n')
      .forEach((l, i) => {
        for (const m of l.matchAll(
          /api\.(get|post|patch|put|del)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g,
        )) {
          const method = { get: 'GET', post: 'POST', patch: 'PATCH', put: 'PUT', del: 'DELETE' }[
            m[1]
          ];
          calls.push({
            file: relative(ROOT, f).replace(/\\/g, '/'),
            line: i + 1,
            method,
            path: norm(m[2]),
          });
        }
      });
  }
  return calls;
}

// Đường dẫn dựng động bằng biến (ví dụ `/${action}` hoặc `/store/orders${query}`) không kiểm tĩnh được: bỏ qua có chủ đích.
const verifiable = (c) =>
  !c.path.startsWith('/:p') && !c.path.includes('${') && !/transfers\/:p\/:p$/.test(c.path);
const missing = (calls) =>
  calls
    .filter(verifiable)
    .filter((c) => !exists(c.method, c.path))
    .map((c) => `${c.method} ${c.path}  (${c.file}:${c.line})`);

describe('TC-CONTRACT – app/web gọi endpoint phải tồn tại trên backend (API-*)', () => {
  it('TC-CONTRACT-001 APP-CUSTOMER: mọi Retrofit endpoint có route backend', () => {
    const calls = kotlinCalls(join(ROOT, 'apps/android/app/src/main'));
    assert.ok(calls.length > 100, `chỉ quét được ${calls.length} lời gọi`);
    const bad = missing(calls);
    assert.deepEqual(
      bad,
      [],
      `${bad.length}/${calls.length} lời gọi không có route:\n  ${bad.join('\n  ')}`,
    );
  });
  it('TC-CONTRACT-002 APP-OWNER: mọi Retrofit endpoint có route backend', () => {
    const calls = kotlinCalls(join(ROOT, 'apps/android-merchant/app/src/main'));
    assert.ok(calls.length > 50, `chỉ quét được ${calls.length} lời gọi`);
    const bad = missing(calls);
    assert.deepEqual(
      bad,
      [],
      `${bad.length}/${calls.length} lời gọi không có route:\n  ${bad.join('\n  ')}`,
    );
  });
  it('TC-CONTRACT-003 WEB-OWNER: mọi lời gọi api.* có route backend', () => {
    const calls = webCalls(join(ROOT, 'apps/web/src'), false);
    assert.ok(calls.length > 20, `chỉ quét được ${calls.length} lời gọi`);
    const bad = missing(calls);
    assert.deepEqual(
      bad,
      [],
      `${bad.length}/${calls.length} lời gọi không có route:\n  ${bad.join('\n  ')}`,
    );
  });
});
