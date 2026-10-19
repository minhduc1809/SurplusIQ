import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi, adminTokenStorage } from '../src/modules/platform-admin/api/admin-api.client';
import { adminAuthApi } from '../src/modules/platform-admin/api/admin-auth.api';

const fetchMock = vi.fn<typeof fetch>();
const userId = '11111111-1111-4111-8111-111111111111';

function token(deviceId: string, role = 'ADMIN') {
  return `header.${btoa(JSON.stringify({ sub: userId, role, deviceId, exp: Math.floor(Date.now() / 1000) + 3600 }))}.signature`;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  sessionStorage.clear();
  adminTokenStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('Admin API contract and failures', () => {
  it('serializes pagination and filters without leaking authorization to public endpoints', async () => {
    adminTokenStorage.set({ accessToken: 'private-token', refreshToken: 'refresh' });
    fetchMock.mockResolvedValue(json({ data: [] }));
    await adminApi.get('/customer/deals', {
      auth: false,
      params: { page: 2, search: 'bread & milk', category: undefined },
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).searchParams.get('search')).toBe('bread & milk');
    expect(new URL(String(url)).searchParams.has('category')).toBe(false);
    expect(new Headers(options?.headers).has('Authorization')).toBe(false);
  });

  it.each([403, 404, 500])('preserves HTTP %i and server validation messages', async (status) => {
    fetchMock.mockResolvedValue(json({ message: ['First error', 'Second error'] }, status));
    await expect(adminApi.get('/resource')).rejects.toMatchObject({
      status,
      message: 'First error. Second error',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes once for concurrent 401 responses and retries with the new Bearer token', async () => {
    adminTokenStorage.set({ accessToken: 'old', refreshToken: 'refresh' });
    fetchMock.mockImplementation(async (url, options) => {
      if (String(url).endsWith('/auth/refresh')) {
        expect(JSON.parse(String(options?.body))).toEqual({ refreshToken: 'refresh' });
        return json({ accessToken: 'new' });
      }
      return new Headers(options?.headers).get('Authorization') === 'Bearer new'
        ? json({ success: true })
        : json({ message: 'Expired' }, 401);
    });
    await expect(Promise.all([adminApi.get('/first'), adminApi.get('/second')])).resolves.toEqual([
      { success: true },
      { success: true },
    ]);
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh')),
    ).toHaveLength(1);
    expect(adminTokenStorage.get()?.refreshToken).toBe('refresh');
  });

  it('clears the session when the refresh token is revoked', async () => {
    adminTokenStorage.set({ accessToken: 'old', refreshToken: 'revoked' });
    fetchMock.mockImplementation(async () => json({ message: 'Revoked' }, 401));
    await expect(adminApi.get('/resource')).rejects.toMatchObject({ status: 401 });
    expect(adminTokenStorage.get()).toBeNull();
  });

  it('keeps stored tokens on a network failure', async () => {
    adminTokenStorage.set({ accessToken: 'old', refreshToken: 'refresh' });
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(adminApi.get('/resource')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(adminTokenStorage.get()?.refreshToken).toBe('refresh');
  });

  it('reports aborted requests separately from a network failure', async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    await expect(adminApi.get('/resource', { signal: controller.signal })).rejects.toMatchObject({
      code: 'REQUEST_ABORTED',
    });
  });

  it('uses the existing store login contract and persists only ADMIN sessions', async () => {
    fetchMock.mockImplementation(async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      expect(body).toMatchObject({ email: 'admin@example.test', password: 'test-password' });
      return json({
        accessToken: token(body.deviceId),
        refreshToken: 'test-refresh',
        user: { id: userId, role: 'ADMIN', email: body.email },
      });
    });
    const session = await adminAuthApi.login({
      email: ' admin@example.test ',
      password: 'test-password',
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/store/login');
    expect(session.user.role).toBe('ADMIN');
    expect(adminAuthApi.getSession()).toEqual(session);
    expect(JSON.stringify(sessionStorage)).not.toContain('test-password');
  });

  it('rejects a STORE_USER without promoting the account', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      if (String(url).endsWith('/auth/logout')) return json({ success: true });
      const body = JSON.parse(String(options?.body));
      return json({
        accessToken: token(body.deviceId, 'STORE_USER'),
        refreshToken: 'test-refresh',
        user: { id: userId, role: 'STORE_USER', email: body.email },
      });
    });
    await expect(
      adminAuthApi.login({ email: 'store@example.test', password: 'test-password' }),
    ).rejects.toMatchObject({ code: 'ADMIN_ROLE_REQUIRED' });
    expect(adminTokenStorage.get()).toBeNull();
  });

  it('clears local state even when server logout fails', async () => {
    sessionStorage.setItem(
      'surplusiq.platform-admin.session.v1',
      JSON.stringify({
        user: { id: userId, role: 'ADMIN', email: null, phone: null },
        deviceId: 'test-device',
      }),
    );
    adminTokenStorage.set({ accessToken: token('test-device'), refreshToken: 'test-refresh' });
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(adminAuthApi.logout()).resolves.toMatchObject({
      localSessionCleared: true,
      serverAcknowledged: false,
    });
    expect(adminTokenStorage.get()).toBeNull();
    expect(adminAuthApi.getSession()).toBeNull();
  });
});
