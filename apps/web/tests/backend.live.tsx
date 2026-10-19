import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi, adminTokenStorage } from '../src/modules/platform-admin/api/admin-api.client';
import { adminAuthApi } from '../src/modules/platform-admin/api/admin-auth.api';
import { AdminThemeProvider } from '../src/modules/platform-admin/theme/AdminThemeProvider';
import { OverviewPage } from '../src/modules/platform-admin/pages/overview/OverviewPage';
import { MerchantsPage } from '../src/modules/platform-admin/pages/merchants/MerchantsPage';
import { SettingsPage } from '../src/modules/platform-admin/pages/settings/SettingsPage';
import AdminApp from '../src/modules/platform-admin/AdminApp';
import { ADMIN_NAV_ITEMS } from '../src/modules/platform-admin/config/admin-navigation';

// Opt-in integration tests: real local HTTP/database, no fetch mocks and no seed/reset calls.
// Authentication uses only the demo STORE_USER explicitly defined in SeedService.
const base = 'http://localhost:4000';
interface Deal {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  category: string;
  currentPrice: number;
  discountPercent: number;
  pickupEnd: string;
}
interface Deals {
  data: Deal[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
let baseline: Deals;
let root: Root | undefined;
let container: HTMLDivElement;

beforeAll(async () => {
  baseline = await adminApi.get<Deals>('/customer/deals', { auth: false, params: { limit: 50 } });
  expect(
    baseline.data.length,
    'Live dataset must contain a public deal for UI/store lookup tests',
  ).toBeGreaterThan(0);
});

beforeEach(() => {
  sessionStorage.clear();
  adminTokenStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container.remove();
  adminAuthApi.clearSession();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mount(page: ReactNode) {
  root = createRoot(container);
  await act(async () => {
    root?.render(<AdminThemeProvider>{page}</AdminThemeProvider>);
  });
}

async function waitForDom(check: () => void) {
  const deadline = Date.now() + 12000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    try {
      check();
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('DOM did not settle after the live request.');
}

async function post(path: string, body: unknown, headers?: HeadersInit) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
}

describe('Live backend HTTP contracts at localhost:4000', () => {
  it('protects the seed endpoint against unauthenticated requests', async () => {
    expect((await fetch(`${base}/seed/demo-data`)).status).toBe(401);
  });
  it('returns platform settings through the actual frontend API client', async () => {
    const settings = await adminApi.get<Record<string, unknown>>('/platform-settings', {
      auth: false,
    });
    expect(Object.keys(settings).length).toBeGreaterThan(0);
    expect(settings).toHaveProperty('order.hold_minutes');
    expect(settings).toHaveProperty('commission.rate');
  });

  it('paginates public deals without repeating rows between pages', async () => {
    const first = await adminApi.get<Deals>('/customer/deals', {
      auth: false,
      params: { page: 1, limit: 2 },
    });
    const second = await adminApi.get<Deals>('/customer/deals', {
      auth: false,
      params: { page: 2, limit: 2 },
    });
    expect(first.meta).toMatchObject({ page: 1, limit: 2 });
    expect(second.meta).toMatchObject({ page: 2, limit: 2 });
    expect(first.data.length).toBeLessThanOrEqual(2);
    expect(second.data.every((item) => !first.data.some((other) => other.id === item.id))).toBe(
      true,
    );
  });

  it.each(['price_asc', 'discount_desc', 'closing_soon'] as const)(
    'supports actual sorting: %s',
    async (sortBy) => {
      const result = await adminApi.get<Deals>('/customer/deals', {
        auth: false,
        params: { sortBy, limit: 50 },
      });
      const values = result.data.map((item) =>
        sortBy === 'price_asc'
          ? item.currentPrice
          : sortBy === 'discount_desc'
            ? item.discountPercent
            : Date.parse(item.pickupEnd),
      );
      expect(
        values.every(
          (value, index) =>
            index === 0 ||
            (sortBy === 'discount_desc' ? values[index - 1] >= value : values[index - 1] <= value),
        ),
      ).toBe(true);
    },
  );

  it('applies search and category filters accepted by the DTO', async () => {
    const sample = baseline.data[0];
    const result = await adminApi.get<Deals>('/customer/deals', {
      auth: false,
      params: { search: sample.storeName.slice(0, 30), category: sample.category, limit: 50 },
    });
    expect(result.data.some((item) => item.id === sample.id)).toBe(true);
    expect(
      result.data.every((item) =>
        item.category.toLowerCase().includes(sample.category.toLowerCase()),
      ),
    ).toBe(true);
  });

  it('returns the real store profile and active deals used by Merchants', async () => {
    const profile = await adminApi.get<{
      store: { id: string; name: string };
      activeDeals: unknown[];
    }>(`/customer/stores/${baseline.data[0].storeId}`, { auth: false });
    expect(profile.store.id).toBe(baseline.data[0].storeId);
    expect(profile.store.name).toBe(baseline.data[0].storeName);
    expect(Array.isArray(profile.activeDeals)).toBe(true);
  });

  it('preserves actual 404 and 400 errors in the frontend client', async () => {
    await expect(
      adminApi.get('/customer/stores/00000000-0000-4000-8000-000000000000', { auth: false }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      adminApi.get('/customer/deals', { auth: false, params: { page: 0, limit: 51 } }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('blocks protected store data when Bearer authentication is missing or invalid', async () => {
    await expect(adminApi.get('/store/orders', { auth: false })).rejects.toMatchObject({
      status: 401,
    });
    const invalid = await fetch(`${base}/store/orders`, {
      headers: { Authorization: 'Bearer intentionally-invalid-test-token' },
    });
    expect(invalid.status).toBe(401);
  });

  it('rejects invalid login input and an unknown refresh token without creating an account', async () => {
    expect((await post('/auth/store/login', {})).status).toBe(400);
    expect(
      (await post('/auth/refresh', { refreshToken: 'intentionally-invalid-test-refresh-token' }))
        .status,
    ).toBe(401);
  });

  it('accepts CORS preflight from the actual Vite origin', async () => {
    const response = await fetch(`${base}/auth/store/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization',
      },
    });
    expect(response.status).toBe(204);
    expect(['*', 'http://localhost:3000']).toContain(
      response.headers.get('access-control-allow-origin'),
    );
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
    expect(response.headers.get('access-control-allow-headers')?.toLowerCase()).toContain(
      'authorization',
    );
  });

  it('logs in the existing demo STORE_USER, refreshes, enforces 403, logs out and revokes refresh', async () => {
    const deviceId = crypto.randomUUID();
    const otherDeviceId = crypto.randomUUID();
    let userId: string | undefined;
    let otherUserId: string | undefined;
    try {
      const response = await post('/auth/store/login', {
        email: 'owner@rincon.vn',
        password: '123456',
        deviceId,
        deviceName: 'SurplusIQ live regression test',
      });
      expect(response.ok).toBe(true);
      const session: {
        accessToken: string;
        refreshToken: string;
        user: { id: string; role: string };
      } = await response.json();
      userId = session.user.id;
      expect(session.user.role).toBe('STORE_USER');
      const otherResponse = await post('/auth/store/login', {
        email: 'owner@rincon.vn',
        password: '123456',
        deviceId: otherDeviceId,
        deviceName: 'SurplusIQ live regression test',
      });
      expect(otherResponse.ok).toBe(true);
      const otherSession: { refreshToken: string; user: { id: string } } =
        await otherResponse.json();
      otherUserId = otherSession.user.id;
      const refresh = await post('/auth/refresh', { refreshToken: session.refreshToken });
      expect(refresh.ok).toBe(true);
      const protectedResponse = await fetch(`${base}/customer/profile`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      expect(protectedResponse.status).toBe(403);
      expect(
        (
          await fetch(`${base}/seed/demo-data`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          })
        ).status,
      ).toBe(403);
      expect(
        (await post('/auth/logout', {}, { 'x-user-id': userId, 'x-device-id': deviceId })).ok,
      ).toBe(true);
      expect((await post('/auth/refresh', { refreshToken: session.refreshToken })).status).toBe(
        401,
      );
      expect((await post('/auth/refresh', { refreshToken: otherSession.refreshToken })).ok).toBe(
        true,
      );
    } finally {
      if (userId) await post('/auth/logout', {}, { 'x-user-id': userId, 'x-device-id': deviceId });
      if (otherUserId)
        await post('/auth/logout', {}, { 'x-user-id': otherUserId, 'x-device-id': otherDeviceId });
    }
  });

  it('rejects the real STORE_USER at the Admin frontend boundary', async () => {
    await expect(
      adminAuthApi.login({ email: 'owner@rincon.vn', password: '123456' }),
    ).rejects.toMatchObject({ status: 403, code: 'ADMIN_ROLE_REQUIRED' });
    expect(adminTokenStorage.get()).toBeNull();
  });
});

describe('Admin pages rendered with real backend responses (jsdom)', () => {
  it('logs in the seeded ADMIN, restores its real session, visits all Admin modules and logs out', async () => {
    window.history.replaceState(null, '', '/admin/overview');
    try {
      const session = await adminAuthApi.login({
        email: process.env.SEED_ADMIN_EMAIL || 'admin@surplusiq.vn',
        password: process.env.SEED_ADMIN_PASSWORD || 'Admin@SurplusIQ2026',
      });
      expect(session.user.role).toBe('ADMIN');
      await mount(<AdminApp />);
      await waitForDom(() => {
        expect(container.querySelector('[data-admin-layout]')).not.toBeNull();
      });
      for (const item of ADMIN_NAV_ITEMS) {
        await act(async () => {
          container
            .querySelector<HTMLAnchorElement>(`nav a[href="${item.href}"]`)
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        expect(container.querySelector('#admin-main-content h1')).not.toBeNull();
        expect(
          container.querySelector(`nav a[href="${item.href}"][aria-current="page"]`),
        ).not.toBeNull();
      }
      const seeded = await adminApi.post<{
        success: boolean;
        insertedCounts: Record<string, number>;
      }>('/seed/demo-data');
      expect(seeded.success).toBe(true);
      expect(Object.values(seeded.insertedCounts).every((count) => count === 0)).toBe(true);
    } finally {
      if (root) {
        await act(async () => root?.unmount());
        root = undefined;
      }
      const tokens = adminTokenStorage.get();
      await adminAuthApi.logout();
      expect(adminTokenStorage.get()).toBeNull();
      if (tokens)
        expect((await post('/auth/refresh', { refreshToken: tokens.refreshToken })).status).toBe(
          401,
        );
    }
  });
  it('renders Overview deal rows from the real API', async () => {
    await mount(<OverviewPage />);
    await waitForDom(() => {
      expect(container.textContent).toContain(baseline.data[0].storeName);
      expect(container.textContent).not.toContain('Cấu trúc danh sách deal không đúng hợp đồng');
    });
  });

  it('looks up a real store in Merchants and renders its detail Drawer', async () => {
    await mount(<MerchantsPage />);
    const lookupTab = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ).find((tab) => tab.textContent?.includes('Tra cứu cửa hàng'));
    expect(lookupTab).toBeDefined();
    await act(async () => {
      lookupTab?.click();
    });
    const input = container.querySelector(
      'input[placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"]',
    );
    expect(input).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
        input,
        baseline.data[0].storeId,
      );
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      container
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await waitForDom(() => {
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        baseline.data[0].storeName,
      );
    });
  });

  it('renders platform settings received from the running backend', async () => {
    await mount(<SettingsPage />);
    await waitForDom(() => {
      expect(container.textContent).toContain('Tải lúc');
      expect(container.textContent).toContain('order.hold_minutes');
      expect(container.textContent).not.toContain('Không thể tải cấu hình nền tảng');
    });
  });
});
