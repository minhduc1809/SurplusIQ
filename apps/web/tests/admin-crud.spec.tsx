import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminThemeProvider } from '../src/modules/platform-admin/theme/AdminThemeProvider';
import { AdminSnapshotProvider } from '../src/modules/platform-admin/snapshot/AdminSnapshotProvider';
import {
  SnapshotPage,
  type SnapshotModule,
} from '../src/modules/platform-admin/snapshot/SnapshotPage';
import { adminTokenStorage } from '../src/modules/platform-admin/api/admin-api.client';
import type { AdminSnapshot, SnapshotRow } from '../src/modules/platform-admin/snapshot/model';
import { snapshotFixture } from './fixtures/admin-snapshot';

let container: HTMLDivElement;
let root: Root;
let current: AdminSnapshot;
const fetchMock = vi.fn<typeof fetch>();
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
function button(label: string, scope: ParentNode = document): HTMLButtonElement {
  const match = Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find(
    (element) => element.textContent?.trim() === label,
  );
  if (!match) throw new Error(`Không tìm thấy nút ${label}`);
  return match;
}
async function input(label: string, value: string) {
  const match = Array.from(document.querySelectorAll<HTMLLabelElement>('label')).find(
    (element) => element.textContent?.replace(/\s*\*$/, '').trim() === label,
  );
  const control = document.getElementById(match?.htmlFor || '') as HTMLInputElement | null;
  if (!control) throw new Error(`Không tìm thấy trường ${label}`);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(control, value);
    control.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function rowAction(id: string, label: string) {
  const menu = container.querySelector<HTMLButtonElement>(`[aria-label="Thao tác dòng ${id}"]`);
  expect(menu).not.toBeNull();
  await act(async () => menu?.click());
  const item = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find(
    (element) => element.textContent?.trim() === label,
  );
  expect(item).toBeDefined();
  await act(async () => item?.click());
}
async function mount(module: SnapshotModule) {
  await act(async () =>
    root.render(
      <AdminThemeProvider>
        <AdminSnapshotProvider>
          <SnapshotPage module={module} liveContent={<div>API khác</div>} />
        </AdminSnapshotProvider>
      </AdminThemeProvider>,
    ),
  );
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  adminTokenStorage.set({ accessToken: 'admin-crud', refreshToken: 'refresh-crud' });
  current = snapshotFixture();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  adminTokenStorage.clear();
  vi.unstubAllGlobals();
});

describe('Snapshot page database write integration', () => {
  it('does not fall back to the static export after the authenticated snapshot denies access', async () => {
    fetchMock.mockImplementation(async () => json({ message: 'Không đủ quyền quản trị.' }, 403));
    await mount('users');
    expect(container.textContent).toContain('Không đủ quyền quản trị.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/admin\/snapshot$/);
    expect(container.querySelector('tbody')?.textContent).not.toContain('owner@example.test');
  });

  it('creates a user through the form and reloads canonical data with authenticated requests', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      const path = new URL(String(url)).pathname;
      expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer admin-crud');
      if (path === '/admin/snapshot') return json(current);
      if (path === '/admin/users' && options?.method === 'POST') {
        const body = JSON.parse(String(options.body)) as Record<string, string>;
        expect(body).toEqual({
          email: 'new@example.test',
          phone: null,
          password: 'Example@123',
          role: 'CUSTOMER',
          status: 'ACTIVE',
        });
        const created: SnapshotRow = {
          ...current.collections.users[0],
          id: 'user-new',
          email: body.email,
          phone: null,
          role: body.role,
          status: body.status,
        };
        current.collections.users.push(created);
        current.counts.users += 1;
        return json({ id: 'user-new' }, 201);
      }
      throw new Error(`Unexpected request ${options?.method} ${path}`);
    });
    await mount('users');
    await act(async () => button('Thêm mới', container).click());
    await input('Email', 'new@example.test');
    await input('Mật khẩu', 'Example@123');
    const saveButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).filter(
      (element) => element.textContent?.trim() === 'Thêm mới',
    );
    const save = saveButtons[saveButtons.length - 1];
    await act(async () => save.click());
    expect(container.textContent).toContain('Đã lưu thay đổi.');
    expect(container.querySelector('tbody')?.textContent).toContain('new@example.test');
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(
      1,
    );
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/admin/snapshot')),
    ).toHaveLength(2);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('snapshot.json'))).toBe(false);
  });

  it('edits a store and replaces both its row and linked labels from the fresh snapshot', async () => {
    fetchMock.mockImplementation(async (url, options) => {
      const path = new URL(String(url)).pathname;
      if (path === '/admin/snapshot') return json(current);
      if (path === '/admin/stores/store-1' && options?.method === 'PATCH') {
        const body = JSON.parse(String(options.body)) as Record<string, string>;
        expect(body).toEqual({
          name: 'Tiệm Bánh Mới',
          address: '12 Đường Mới',
          phone: '0901111222',
          logoUrl: null,
          status: 'ACTIVE',
        });
        Object.assign(current.collections.stores[0], {
          name: body.name,
          address: body.address,
          phone: body.phone,
        });
        for (const rows of Object.values(current.collections)) {
          for (const row of rows) if (row.store_id === 'store-1') row.store_name = body.name;
        }
        return json({ id: 'store-1' });
      }
      throw new Error(`Unexpected request ${options?.method} ${path}`);
    });
    await mount('merchants');
    await rowAction('store-1', 'Chỉnh sửa');
    await input('Tên cửa hàng', 'Tiệm Bánh Mới');
    await input('Địa chỉ', '12 Đường Mới');
    await input('Số điện thoại', '0901111222');
    await act(async () => button('Lưu thay đổi').click());
    expect(container.querySelector('tbody')?.textContent).toContain('Tiệm Bánh Mới');
    expect(container.querySelector('tbody')?.textContent).not.toContain('Tiệm Bánh Đỏ');
    await act(async () => container.querySelector<HTMLTableRowElement>('tbody tr')?.click());
    const linkedOrders = document.querySelector<HTMLTableElement>(
      'table[aria-label="Đơn hàng liên quan (25)"]',
    );
    expect(linkedOrders).not.toBeNull();
    expect(linkedOrders?.textContent).toContain('Tiệm Bánh Mới');
    expect(linkedOrders?.textContent).not.toContain('Tiệm Bánh Đỏ');
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'PATCH')).toHaveLength(
      1,
    );
  });

  it('confirms a soft lock once and retries only snapshot loading if refresh fails', async () => {
    let reads = 0;
    fetchMock.mockImplementation(async (url, options) => {
      const path = new URL(String(url)).pathname;
      if (path === '/admin/snapshot') {
        reads += 1;
        return reads === 2 ? json({ message: 'Không tải được dữ liệu mới.' }, 503) : json(current);
      }
      if (path === '/admin/users/user-1' && options?.method === 'DELETE') {
        current.collections.users[0].status = 'LOCKED';
        return json({ id: 'user-1', status: 'LOCKED' });
      }
      throw new Error(`Unexpected request ${options?.method} ${path}`);
    });
    await mount('users');
    await rowAction('user-1', 'Khóa tài khoản');
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(
      0,
    );
    const confirmation = button('Xác nhận');
    await act(async () => {
      confirmation.click();
      confirmation.click();
    });
    expect(document.body.textContent).toContain('Đã lưu, nhưng chưa tải lại được bảng.');
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(
      1,
    );
    const dialog = document.querySelector('[role="dialog"]')!;
    await act(async () => button('Tải lại dữ liệu', dialog).click());
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(
      1,
    );
    expect(reads).toBe(3);
    const ownerRow = Array.from(container.querySelectorAll('tbody tr')).find((row) =>
      row.textContent?.includes('owner@example.test'),
    );
    expect(ownerRow?.textContent).toContain('LOCKED');
    expect(container.textContent).toContain('Đã lưu thay đổi.');
  });
});
