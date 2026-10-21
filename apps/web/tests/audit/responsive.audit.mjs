// Kiểm thử responsive WEB-OWNER (merchant-v2) và WEB-ADMIN theo 8 viewport. Ghi kết quả JSON + ảnh chụp vào docs/audit/.
// Cần: backend test (cổng 4100) và web dev trỏ vào nó: VITE_API_URL=http://localhost:4100 npx vite --port 5180
// Chạy: node apps/web/tests/audit/responsive.audit.mjs   (E2E_WEB_URL mặc định http://localhost:5180)
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const WEB = process.env.E2E_WEB_URL || 'http://localhost:5180';
const OUT = new URL('../../../../docs/audit/', import.meta.url);
const SHOTS = new URL('screenshots/', OUT);
mkdirSync(SHOTS, { recursive: true });
const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p));
assert.ok(CHROME, 'Không tìm thấy Chrome/Edge');

const VIEWPORTS = [
  [320, 640],
  [360, 740],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [844, 390],
  [1024, 600],
];
const MERCHANT = [
  ['FR-WEBOWN-today', '/merchant-v2/today'],
  ['FR-WEBOWN-offers', '/merchant-v2/sales/offers'],
  ['FR-WEBOWN-orders', '/merchant-v2/sales/orders'],
  ['FR-WEBOWN-reports', '/merchant-v2/growth/reports'],
  ['FR-WEBOWN-marketing', '/merchant-v2/growth/marketing'],
  ['FR-WEBOWN-customers', '/merchant-v2/growth/customers'],
  ['FR-WEBOWN-staff', '/merchant-v2/growth/staff'],
  ['FR-WEBOWN-settings', '/merchant-v2/settings'],
];
const ADMIN = [
  ['FR-WEBADM-overview', '/admin/overview'],
  ['FR-WEBADM-merchants', '/admin/merchants'],
  ['FR-WEBADM-users', '/admin/users'],
  ['FR-WEBADM-orders', '/admin/orders'],
  ['FR-WEBADM-disputes', '/admin/disputes'],
  ['FR-WEBADM-settlement', '/admin/settlement'],
  ['FR-WEBADM-subscriptions', '/admin/subscriptions'],
  ['FR-WEBADM-settings', '/admin/settings'],
];

const MEASURE = () => {
  const vw = window.innerWidth;
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const offenders = [...document.body.querySelectorAll('*')]
    .filter(
      (el) =>
        vis(el) &&
        el.getBoundingClientRect().right > vw + 1 &&
        !el.closest('[data-scroll-x], .MuiTableContainer-root, pre'),
    )
    .slice(0, 3)
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`);
  const targets = [
    ...document.querySelectorAll(
      'button, a[href], input, select, [role=button], [role=tab], [role=menuitem]',
    ),
  ].filter(vis);
  const small = targets.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width < 44 || r.height < 44;
  });
  const texts = [...document.querySelectorAll('body *')].filter(
    (el) => vis(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
  );
  const tiny = texts.filter((el) => parseFloat(getComputedStyle(el).fontSize) < 14);
  return {
    hScroll: document.documentElement.scrollWidth > vw + 1,
    scrollWidth: document.documentElement.scrollWidth,
    vw,
    offenders,
    targets: targets.length,
    smallTargets: small.length,
    smallTargetSamples: small
      .slice(0, 3)
      .map((el) =>
        (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24),
      ),
    textNodes: texts.length,
    tinyText: tiny.length,
  };
};

const browser = await chromium.launch({ executablePath: CHROME });
const results = [];

async function sweep(context, pages, group, existing) {
  const page = existing || (await context.newPage());
  for (const [fr, path] of pages) {
    for (const [w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(WEB + path, { waitUntil: 'load' });
      await page.waitForTimeout(1400);
      const m = await page.evaluate(MEASURE);
      const file = `${fr}_${w}x${h}.png`;
      if (w === 320 || w === 390 || w === 768 || w === 1440)
        await page.screenshot({
          path: new URL(file, SHOTS).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
          fullPage: false,
        });
      results.push({ group, fr, path, viewport: `${w}x${h}`, ...m, shot: file });
    }
  }
  await page.close();
}

// ---- Merchant
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(WEB + '/merchant-v2/login');
  await p.fill('input[type=email]', 'owner@rincon.vn');
  await p.fill('input[type=password]', '123456');
  await p.click('button[type=submit]');
  await p.waitForURL(/merchant-v2\/today/, { timeout: 20000 });
  await p.close();
  await sweep(ctx, MERCHANT, 'WEB-OWNER');
  // trang đăng nhập (chưa đăng nhập)
  const anon = await browser.newContext();
  await sweep(anon, [['FR-WEBOWN-login', '/merchant-v2/login']], 'WEB-OWNER');
}
// ---- Admin
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(WEB + '/admin/login');
  await p.fill('input[name=email]', 'admin@surplusiq.vn');
  await p.fill('input[name=password]', process.env.ADMIN_PASSWORD || 'Admin@SurplusIQ2026');
  await p.click('button[type=submit]');
  await p.waitForURL(/admin\/(overview|merchants)/, { timeout: 20000 }).catch(() => {});
  // phiên admin lưu theo tab (sessionStorage) nên dùng lại đúng tab đã đăng nhập
  await sweep(ctx, ADMIN, 'WEB-ADMIN', p);
  const anon = await browser.newContext();
  await sweep(anon, [['FR-WEBADM-login', '/admin/login']], 'WEB-ADMIN');
}
await browser.close();

writeFileSync(new URL('responsive-results.json', OUT), JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.hScroll);
console.log(`${results.length} phép đo; cuộn ngang ngoài ý muốn: ${bad.length}`);
for (const r of bad.slice(0, 40))
  console.log(`  H-SCROLL ${r.fr} @${r.viewport} sw=${r.scrollWidth} ${r.offenders.join(' | ')}`);
const t = results.filter((r) => r.smallTargets > 0 && Number(r.viewport.split('x')[0]) <= 768);
console.log(
  `vùng chạm <44px ở viewport ≤768: ${t.length}/${results.filter((r) => Number(r.viewport.split('x')[0]) <= 768).length} phép đo`,
);
