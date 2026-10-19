import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminApp, { resolveAdminLoginRedirect } from '../src/modules/platform-admin/AdminApp';
import { ADMIN_NAV_ITEMS } from '../src/modules/platform-admin/config/admin-navigation';
import { adminTokenStorage } from '../src/modules/platform-admin/api/admin-api.client';
import { snapshotFixture } from './fixtures/admin-snapshot';

const realWindow = window;
const fetchMock = vi.fn<typeof fetch>();
const replaceMock = vi.fn();
const userId = '11111111-1111-4111-8111-111111111111';
const deviceId = '22222222-2222-4222-8222-222222222222';
const token = `header.${btoa(JSON.stringify({ sub: userId, role: 'ADMIN', deviceId, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
let root: Root;
let container: HTMLDivElement;

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function seedSession() {
  adminTokenStorage.set({ accessToken: token, refreshToken: 'test-refresh' });
  sessionStorage.setItem(
    'surplusiq.platform-admin.session.v1',
    JSON.stringify({
      user: { id: userId, role: 'ADMIN', email: 'admin@example.test', phone: null },
      deviceId,
    }),
  );
}

async function renderAt(path: string, authenticated = false) {
  realWindow.history.replaceState(null, '', path);
  if (authenticated) seedSession();
  await act(async () => {
    root.render(
      <StrictMode>
        <AdminApp />
      </StrictMode>,
    );
  });
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  sessionStorage.clear();
  localStorage.clear();
  adminTokenStorage.clear();
  replaceMock.mockReset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url) => {
    if (String(url).endsWith('/admin-data/snapshot.json')) return json(snapshotFixture());
    if (String(url).endsWith('/auth/refresh')) return json({ accessToken: token });
    if (String(url).includes('/customer/deals'))
      return json({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    if (String(url).endsWith('/platform-settings')) return json({});
    throw new Error(`Unexpected request in routing test: ${String(url)}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal(
    'window',
    new Proxy(realWindow, {
      get(target, property) {
        if (property === 'location')
          return {
            origin: realWindow.location.origin,
            pathname: realWindow.location.pathname,
            search: realWindow.location.search,
            hash: realWindow.location.hash,
            replace: replaceMock,
          };
        if (property === 'scrollTo') return () => undefined;
        return Reflect.get(target, property);
      },
    }),
  );
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('Admin routing in the DOM (isolated API fixtures)', () => {
  it('renders the login form without calling the backend when no session exists', async () => {
    await renderAt('/admin/login');
    expect(container.querySelector('input[type="password"]')).not.toBeNull();
    expect(container.querySelector('form')).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('submits the login form and redirects an accepted ADMIN to the dashboard', async () => {
    await renderAt('/admin/login');
    fetchMock.mockImplementation(async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      const accessToken = `header.${btoa(JSON.stringify({ sub: userId, role: 'ADMIN', deviceId: body.deviceId, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
      return json({
        accessToken,
        refreshToken: 'test-refresh',
        user: { id: userId, role: 'ADMIN', email: body.email },
      });
    });
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      for (const [selector, value] of [
        ['#admin-login-email', 'admin@example.test'],
        ['#admin-login-password', 'test-password'],
      ]) {
        const input = container.querySelector(selector);
        expect(input).not.toBeNull();
        setValue?.call(input, value);
        input?.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await act(async () => {
      container
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(replaceMock).toHaveBeenCalledWith('/admin/overview');
    expect(adminTokenStorage.get()).not.toBeNull();
  });

  it('finishes server logout before redirecting and clears the local session', async () => {
    await renderAt('/admin/orders', true);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="Mở menu tài khoản Admin"]')?.click();
    });
    const logoutItem = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
      (item) => item.textContent?.includes('Đăng xuất'),
    );
    expect(logoutItem).toBeDefined();
    let completeLogout: ((response: Response) => void) | undefined;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          completeLogout = resolve;
        }),
    );
    await act(async () => {
      logoutItem?.click();
    });
    expect(replaceMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Đang đăng xuất');
    await act(async () => {
      completeLogout?.(json({ success: true }));
    });
    expect(replaceMock).toHaveBeenCalledWith('/admin/login');
    expect(adminTokenStorage.get()).toBeNull();
  });

  it.each(ADMIN_NAV_ITEMS)('protects $href and preserves its return path', async ({ href }) => {
    await renderAt(href);
    expect(replaceMock).toHaveBeenCalledWith(`/admin/login?redirect=${encodeURIComponent(href)}`);
    expect(container.querySelector('[data-admin-layout]')).toBeNull();
  });

  it.each(ADMIN_NAV_ITEMS)(
    'restores the session and renders $href directly, including after refresh',
    async ({ href }) => {
      await renderAt(href, true);
      expect(container.querySelector('[data-admin-layout]')).not.toBeNull();
      expect(container.querySelector('#admin-main-content h1')).not.toBeNull();
      expect(container.querySelector(`nav a[href="${href}"][aria-current="page"]`)).not.toBeNull();
      expect(container.textContent).not.toContain('Không tìm thấy trang');
      expect(replaceMock).not.toHaveBeenCalled();
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh')),
      ).toHaveLength(1);
      for (const tab of Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'))) {
        await act(async () => {
          tab.click();
        });
        expect(container.querySelector('#admin-main-content h1')).not.toBeNull();
      }
    },
  );

  it('navigates through the sidebar and handles browser history', async () => {
    await renderAt('/admin/orders', true);
    const link = container.querySelector<HTMLAnchorElement>('nav a[href="/admin/disputes"]');
    expect(link).not.toBeNull();
    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(realWindow.location.pathname).toBe('/admin/disputes');
    expect(container.querySelector('nav a[aria-current="page"]')?.getAttribute('href')).toBe(
      '/admin/disputes',
    );
    await act(async () => {
      realWindow.history.replaceState(null, '', '/admin/orders');
      realWindow.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(container.querySelector('nav a[aria-current="page"]')?.getAttribute('href')).toBe(
      '/admin/orders',
    );
  });

  it('keeps the stored session and allows retry after a network failure', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await renderAt('/admin/orders', true);
    expect(adminTokenStorage.get()).not.toBeNull();
    expect(container.querySelector('[data-admin-layout]')).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
    const retry = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Thử kết nối lại'),
    );
    expect(retry).toBeDefined();
    await act(async () => {
      retry?.click();
    });
    expect(container.querySelector('[data-admin-layout]')).not.toBeNull();
  });

  it('clears a revoked session and returns to login', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'Revoked' }, 401));
    await renderAt('/admin/orders', true);
    expect(adminTokenStorage.get()).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/admin/login?redirect=%2Fadmin%2Forders');
  });

  it('uses the Admin 404 for an unknown route after authentication', async () => {
    await renderAt('/admin/unknown', true);
    expect(container.textContent).toContain('Không tìm thấy trang');
  });

  it.each([
    'https://outside.test/admin/orders',
    '//outside.test',
    '/admin/login',
    '/admin/../customer',
    '/admin/\\outside',
    '/admin/orders\u0000',
  ])('rejects unsafe login redirects: %s', (redirect) => {
    expect(resolveAdminLoginRedirect(`?redirect=${encodeURIComponent(redirect)}`)).toBe(
      '/admin/overview',
    );
  });

  it('preserves a safe return path, query and hash after login', () => {
    expect(resolveAdminLoginRedirect('?redirect=%2Fadmin%2Forders%3Fpage%3D2%23details')).toBe(
      '/admin/orders?page=2#details',
    );
  });
});
