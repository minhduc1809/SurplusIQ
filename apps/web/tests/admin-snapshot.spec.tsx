import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminThemeProvider } from '../src/modules/platform-admin/theme/AdminThemeProvider';
import { AdminSnapshotProvider } from '../src/modules/platform-admin/snapshot/AdminSnapshotProvider';
import {
  SnapshotPage,
  rowsToCsv,
  type SnapshotModule,
} from '../src/modules/platform-admin/snapshot/SnapshotPage';
import { filterRows, parseSnapshot } from '../src/modules/platform-admin/snapshot/model';
import { snapshotFixture } from './fixtures/admin-snapshot';

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn<typeof fetch>();
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
async function mount(module: SnapshotModule) {
  await act(async () =>
    root.render(
      <AdminThemeProvider>
        <AdminSnapshotProvider>
          <SnapshotPage module={module} liveContent={<div>API hiện có</div>} />
        </AdminSnapshotProvider>
      </AdminThemeProvider>,
    ),
  );
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset().mockResolvedValue(json(snapshotFixture()));
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('Admin snapshot contracts', () => {
  it('rejects incomplete exports and unknown credential fields', () => {
    const data = snapshotFixture();
    expect(parseSnapshot(data).counts.orders).toBe(25);
    data.collections.users[0].password_hash = 'must-never-be-served';
    expect(() => parseSnapshot(data)).toThrow('Người dùng');
    delete data.collections.users[0].password_hash;
    data.counts.orders = 24;
    expect(() => parseSnapshot(data)).toThrow('Đơn hàng');
    data.counts.orders = 25;
    delete data.collections.orders[0].status;
    expect(() => parseSnapshot(data)).toThrow('Đơn hàng');
  });
  it('combines accent-insensitive search, store/status filters and dates in Vietnam time', () => {
    const data = snapshotFixture();
    const matches = filterRows(
      data.collections.orders,
      'tiem banh do',
      { status: 'PICKED_UP', store_name: 'Tiệm Bánh Đỏ' },
      '2026-10-19',
      '2026-10-19',
      'created_at',
    );
    expect(matches).toHaveLength(13);
    expect(
      filterRows(data.collections.orders, '', {}, '2026-10-18', '2026-10-18', 'created_at'),
    ).toHaveLength(0);
    expect(
      filterRows(data.collections.statements, '', {}, '2026-10-12', '2026-10-12', 'week_start'),
    ).toHaveLength(1);
  });
  it('escapes CSV quotes, preserves Vietnamese and neutralizes spreadsheet formulas', () => {
    const rows = [
      {
        id: 'x',
        email: '=HYPERLINK("evil")',
        phone: '+84901234567',
        role: 'ADMIN',
        status: 'ACTIVE',
        two_factor_enabled: false,
      },
    ];
    const csv = rowsToCsv(rows, 'users');
    expect(csv).toContain('Email');
    expect(csv).toContain('"\'=HYPERLINK(""evil"")"');
    expect(csv).toContain('"\'+84901234567"');
  });
});

describe('Admin snapshot UI', () => {
  it.each([
    'overview',
    'merchants',
    'users',
    'orders',
    'disputes',
    'settlement',
    'subscriptions',
    'settings',
  ] as SnapshotModule[])(
    'renders %s and all its data tabs without calling business APIs',
    async (module) => {
      await mount(module);
      expect(container.querySelector(`[data-snapshot-module="${module}"]`)).not.toBeNull();
      expect(container.textContent).not.toContain('Dữ liệu được xuất lúc');
      expect(container.textContent).not.toContain('Dữ liệu toàn sàn từ bản xuất PostgreSQL');
      const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
      for (const tab of tabs) {
        await act(async () => tab.click());
        expect(container.querySelector('h1')).not.toBeNull();
      }
      expect(container.textContent).toContain('API hiện có');
      expect(
        fetchMock.mock.calls.every(([url]) => String(url).endsWith('/admin-data/snapshot.json')),
      ).toBe(true);
    },
  );
  it('paginates the full export and searches locally without more network requests', async () => {
    await mount('orders');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    const next = container.querySelector<HTMLButtonElement>('[aria-label="Go to next page"]');
    expect(next).not.toBeNull();
    await act(async () => next?.click());
    expect(container.querySelector('tbody tr')?.textContent).toContain('DEMO011');
    const input = container.querySelector<HTMLInputElement>('input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(input, 'DEMO025');
      input?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.querySelector('tbody tr')?.textContent).toContain('DEMO025');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('opens complaint evidence and the associated order in a read-only drawer', async () => {
    await mount('disputes');
    await act(async () => container.querySelector<HTMLTableRowElement>('tbody tr')?.click());
    expect(document.querySelector('a[href="https://example.test/evidence.jpg"]')?.textContent).toBe(
      'Mở bằng chứng',
    );
    expect(document.body.textContent).toContain('Đơn hàng liên quan (1)');
    expect(document.body.textContent).toContain('Thiếu một sản phẩm');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('shows missing/invalid files as errors, then reloads the newly exported data', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404));
    await mount('orders');
    expect(container.textContent).toContain('npm run snapshot:export');
    const reload = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Tải lại dữ liệu',
    );
    await act(async () => reload?.click());
    expect(container.textContent).toContain('DEMO001');
    expect(container.textContent).not.toContain('npm run snapshot:export');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
