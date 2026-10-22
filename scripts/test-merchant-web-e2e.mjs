// E2E trình duyệt cho cổng cửa hàng V2 (/merchant-v2) trên backend LOCAL.
// Cần: backend (4000) và web dev (npm run dev:web, mặc định 5174) đang chạy; Chrome/Edge cài sẵn.
// Chạy: npm run test:web:e2e
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const WEB = process.env.E2E_WEB_URL || 'http://localhost:5174';
const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].find((p) => p && existsSync(p));
assert.ok(CHROME, 'Không tìm thấy Chrome/Edge, đặt CHROME_PATH');

const PAGES = [
  ['today', 'Tổng quan hôm nay'],
  ['sales/offers', 'Suất & tồn kho'],
  ['sales/orders', 'Đơn hàng'],
  ['growth/reports', 'Báo cáo & tác động'],
  ['growth/marketing', 'Ưu đãi & chiến dịch'],
  ['growth/customers', 'Khách hàng'],
  ['growth/staff', 'Nhân viên'],
  ['settings', 'Cài đặt cửa hàng'],
];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('401'))
    errors.push(`console: ${m.text().slice(0, 140)}`);
});

let passed = 0;
const failed = [];
async function step(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed.push(name);
    console.log(`  FAIL ${name}\n       ${String(e.message).split('\n')[0]}`);
  }
}

await step('chưa đăng nhập bị chuyển về trang đăng nhập và giữ đường dẫn quay lại', async () => {
  await page.goto(`${WEB}/merchant-v2/sales/orders`);
  await page.waitForURL(/merchant-v2\/login\?redirect=/);
});
await step('sai mật khẩu hiện lỗi, không vào được', async () => {
  await page.fill('input[type=email]', 'owner@rincon.vn');
  await page.fill('input[type=password]', 'sai-mat-khau');
  await page.click('button[type=submit]');
  await page.waitForSelector('[role=alert]');
  assert.match(page.url(), /login/);
});
await step('đăng nhập đúng quay về trang đã định', async () => {
  await page.fill('input[type=password]', 'Surplus@1');
  await page.click('button[type=submit]');
  await page.waitForURL(/merchant-v2\/sales\/orders/, { timeout: 15000 });
});
await step('không cho chuyển hướng ra ngoài qua tham số redirect', async () => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`${WEB}/merchant-v2/login?redirect=//evil.example`);
  await p.fill('input[type=email]', 'owner@rincon.vn');
  await p.fill('input[type=password]', 'Surplus@1');
  await p.click('button[type=submit]');
  await p.waitForURL(/merchant-v2\/today/, { timeout: 15000 });
  await ctx.close();
});

for (const [path, heading] of PAGES) {
  await step(`trang ${path} hiển thị dữ liệu thật`, async () => {
    await page.goto(`${WEB}/merchant-v2/${path}`);
    await page
      .getByRole('heading', { name: heading, exact: false })
      .first()
      .waitFor({ timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('.MuiCircularProgress-root'), null, {
      timeout: 10000,
    });
    assert.equal(await page.locator('[role=alert]').count(), 0, 'trang đang hiện cảnh báo lỗi');
  });
}

await step('lọc đơn theo trạng thái gọi lại API', async () => {
  await page.goto(`${WEB}/merchant-v2/sales/orders`);
  await page.getByText('Đã nhận', { exact: true }).first().waitFor();
  const [req] = await Promise.all([
    page.waitForRequest(
      (r) => r.url().includes('/store/orders') && r.url().includes('status=PICKED_UP'),
    ),
    page.getByRole('button', { name: 'Đã nhận' }).click(),
  ]);
  assert.ok(req);
});

await step('tạo suất qua giao diện rồi hủy suất, danh sách cập nhật', async () => {
  await page.goto(`${WEB}/merchant-v2/sales/offers`);
  await page.getByRole('button', { name: 'Tạo suất' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Số suất').fill('2');
  await dialog.getByLabel('Giá bán (bội số 500đ)').fill('27500');
  const end = new Date(Date.now() + 3 * 3600_000);
  const p2 = (n) => String(n).padStart(2, '0');
  const local = (d) =>
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
  await dialog.getByLabel('Bắt đầu nhận').fill(local(new Date(Date.now() - 5 * 60_000)));
  await dialog.getByLabel('Kết thúc nhận').fill(local(end));
  await dialog.getByRole('button', { name: 'Tạo suất' }).click();
  await dialog.waitFor({ state: 'detached', timeout: 10000 });
  const row = page.getByRole('row').filter({ hasText: '27.500đ' }).first();
  await row.waitFor({ timeout: 10000 });
  await row.getByRole('button').nth(2).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 10000 });
  await page
    .getByRole('row')
    .filter({ hasText: '27.500đ' })
    .filter({ hasText: 'Đang mở' })
    .first()
    .waitFor({ state: 'detached', timeout: 10000 });
});

await step('đăng xuất quay về trang đăng nhập', async () => {
  await page.goto(`${WEB}/merchant-v2/today`);
  await page.getByRole('button').last().click();
  await page.getByText('Đăng xuất').click();
  await page.waitForURL(/merchant-v2\/login/);
});

await browser.close();
await step('không có lỗi console/pageerror trong cả phiên', async () =>
  assert.deepEqual(errors, [], errors.join(' // ')),
);

console.log(`\n${passed} bước đạt, ${failed.length} bước lỗi`);
if (failed.length) process.exit(1);
