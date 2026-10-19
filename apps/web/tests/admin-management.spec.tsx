import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminThemeProvider } from '../src/modules/platform-admin/theme/AdminThemeProvider';
import { AdminMutationDialog } from '../src/modules/platform-admin/snapshot/AdminMutationDialog';
import {
  canEditRecord,
  deleteLabel,
  deleteRecord,
  saveAdminRecord,
  supportsCreate,
  supportsEdit,
} from '../src/modules/platform-admin/api/admin-management.api';
import { adminTokenStorage } from '../src/modules/platform-admin/api/admin-api.client';
import { snapshotFixture } from './fixtures/admin-snapshot';

const fetchMock = vi.fn<typeof fetch>();
let container: HTMLDivElement;
let root: Root;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockImplementation(async () => json({ success: true }));
  adminTokenStorage.set({ accessToken: 'admin-test', refreshToken: 'test-refresh' });
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

describe('Admin management operations', () => {
  it('keeps financial and historical datasets read only and exposes soft state changes', async () => {
    for (const key of ['orders', 'payments', 'statements', 'audit', 'settingsHistory']) {
      expect(supportsCreate(key)).toBe(false);
      expect(supportsEdit(key)).toBe(false);
      expect(deleteLabel(key, { id: 'id' })).toBeNull();
      await expect(deleteRecord(key, { id: 'id' })).rejects.toThrow('không khả dụng');
    }
    expect(canEditRecord('complaints', { status: 'ACCEPTED' })).toBe(false);
    expect(canEditRecord('complaints', { status: 'PENDING_STORE' })).toBe(true);
    expect(canEditRecord('users', { status: 'ANONYMIZED' })).toBe(false);
    expect(canEditRecord('quotas', { plan: 'TRIAL' })).toBe(false);
    expect(deleteLabel('quotas', { plan: 'TRIAL' })).toBeNull();
    expect(deleteLabel('users', { status: 'LOCKED' })).toBeNull();
    expect(deleteLabel('stores', { status: 'ACTIVE' })).toBe('Tạm ngưng');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('writes normalized user fields without sending passwords during edits', async () => {
    await saveAdminRecord(
      'users',
      { id: 'user-1' },
      {
        email: ' owner@example.test ',
        phone: '',
        password: 'must-not-be-sent',
        role: 'STORE_USER',
        status: 'LOCKED',
      },
    );
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/users\/user-1$/);
    expect(options?.method).toBe('PATCH');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer admin-test');
    expect(JSON.parse(String(options?.body))).toEqual({
      email: 'owner@example.test',
      phone: null,
      role: 'STORE_USER',
      status: 'LOCKED',
    });
  });

  it('derives quota period from its definition and uses the store primary key for settings', async () => {
    await saveAdminRecord('quotas', null, {
      plan: 'PRO',
      quotaKey: 'active_staff',
      quotaValue: '6',
      period: 'DAILY',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      plan: 'PRO',
      quotaKey: 'active_staff',
      quotaValue: 6,
      period: 'EXISTENCE',
    });
    await saveAdminRecord(
      'settings',
      { store_id: 'store-1' },
      {
        defaultPickupStart: '19:00',
        defaultPickupEnd: '21:00',
        floorRatio: '0.4',
        costPriceRatio: '',
        pricingMode: 'MANUAL',
        lateGraceMinutes: '15',
        maxQtyPerOrder: '5',
      },
    );
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/admin\/stores\/store-1\/settings$/);
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      costPriceRatio: null,
      floorRatio: 0.4,
      lateGraceMinutes: 15,
      maxQtyPerOrder: 5,
    });
  });

  it('omits a blank refund amount so the backend applies full order value', async () => {
    await saveAdminRecord(
      'complaints',
      { id: 'complaint-1' },
      {
        decision: 'ACCEPT',
        refundAmount: '',
        reason: '',
      },
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ decision: 'ACCEPT' });
    await saveAdminRecord(
      'complaints',
      { id: 'complaint-1' },
      {
        decision: 'REJECT',
        refundAmount: '300000',
        reason: '  Bằng chứng không hợp lệ  ',
      },
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
      decision: 'REJECT',
      reason: 'Bằng chứng không hợp lệ',
    });
  });

  it('keeps a saved form locked when refresh fails and retries only the read', async () => {
    const onClose = vi.fn();
    const onSaved = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('Mất kết nối.'))
      .mockResolvedValue(undefined);
    await act(async () =>
      root.render(
        <AdminThemeProvider>
          <AdminMutationDialog
            collection="reviews"
            row={{ id: 'review-1', status: 'VISIBLE' }}
            open
            onClose={onClose}
            onSaved={onSaved}
            snapshot={snapshotFixture()}
          />
        </AdminThemeProvider>,
      ),
    );
    const button = (label: string) =>
      Array.from(document.querySelectorAll('button')).find(
        (element) => element.textContent?.trim() === label,
      ) as HTMLButtonElement;
    await act(async () => button('Lưu thay đổi').click());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain(
      'Đã lưu vào database, nhưng chưa tải lại được bảng.',
    );
    expect(button('Lưu thay đổi').disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => button('Tải lại dữ liệu').click());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows backend errors without reporting success or refreshing', async () => {
    fetchMock.mockImplementation(async () =>
      json({ message: 'Không thể thay đổi trạng thái này.' }, 409),
    );
    const onSaved = vi.fn<() => Promise<void>>();
    await act(async () =>
      root.render(
        <AdminThemeProvider>
          <AdminMutationDialog
            collection="reviews"
            row={{ id: 'review-1', status: 'VISIBLE' }}
            open
            onClose={vi.fn()}
            onSaved={onSaved}
            snapshot={snapshotFixture()}
          />
        </AdminThemeProvider>,
      ),
    );
    const submit = Array.from(document.querySelectorAll('button')).find(
      (element) => element.textContent?.trim() === 'Lưu thay đổi',
    )!;
    await act(async () => submit.click());
    expect(document.body.textContent).toContain('Không thể thay đổi trạng thái này.');
    expect(onSaved).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain('Đã lưu thay đổi vào database.');
    expect(submit.disabled).toBe(false);
  });

  it.each([
    ['BASIC', 'upgrade', ['upgrade']],
    ['PRO', 'renew', ['renew', 'downgrade']],
    ['TRIAL', 'upgrade', ['upgrade', 'downgrade']],
  ] as const)(
    'offers only appropriate subscription actions for %s',
    async (plan, selected, actions) => {
      await act(async () =>
        root.render(
          <AdminThemeProvider>
            <AdminMutationDialog
              collection="subscriptions"
              row={{ store_id: 'store-1', plan }}
              open
              onClose={vi.fn()}
              onSaved={vi.fn()}
              snapshot={snapshotFixture()}
            />
          </AdminThemeProvider>,
        ),
      );
      const select = document.querySelector<HTMLSelectElement>('select')!;
      expect(select.value).toBe(selected);
      expect(
        Array.from(select.options)
          .map((option) => option.value)
          .filter(Boolean),
      ).toEqual(actions);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('reuses the POST idempotency key after a lost response and replaces it for changed values or a new dialog', async () => {
    fetchMock.mockRejectedValue(new TypeError('Connection lost'));
    const row = { store_id: 'store-1', plan: 'PRO' };
    const onSaved = vi.fn<() => Promise<void>>();
    const show = (open: boolean) =>
      root.render(
        <AdminThemeProvider>
          <AdminMutationDialog
            collection="subscriptions"
            row={row}
            open={open}
            onClose={vi.fn()}
            onSaved={onSaved}
            snapshot={snapshotFixture()}
          />
        </AdminThemeProvider>,
      );
    const submit = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
        (element) => element.textContent?.trim() === 'Lưu thay đổi',
      )!;
    const keyAt = (index: number) =>
      new Headers(fetchMock.mock.calls[index][1]?.headers).get('Idempotency-Key');
    await act(async () => show(true));
    await act(async () => submit().click());
    expect(keyAt(0)).toMatch(/^[\da-f-]{36}$/i);
    await act(async () => submit().click());
    expect(keyAt(1)).toBe(keyAt(0));
    const action = document.querySelector<HTMLSelectElement>('select')!;
    await act(async () => {
      action.value = 'downgrade';
      action.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => submit().click());
    expect(keyAt(2)).not.toBe(keyAt(1));
    await act(async () => show(false));
    await act(async () => show(true));
    await act(async () => submit().click());
    expect(keyAt(3)).not.toBe(keyAt(0));
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('sends numeric PostGIS coordinates when latitude and longitude are provided for a store', async () => {
    await saveAdminRecord(
      'stores',
      { id: 'store-1' },
      {
        name: 'Tiệm Bánh Quận 1',
        address: '100 Nguyễn Huệ',
        phone: '0909111222',
        logoUrl: '',
        status: 'ACTIVE',
        latitude: '10.7769',
        longitude: '106.7009',
      },
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: 'Tiệm Bánh Quận 1',
      address: '100 Nguyễn Huệ',
      phone: '0909111222',
      logoUrl: null,
      status: 'ACTIVE',
      latitude: 10.7769,
      longitude: 106.7009,
    });
  });
});
