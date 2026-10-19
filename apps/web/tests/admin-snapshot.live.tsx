import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminThemeProvider } from '../src/modules/platform-admin/theme/AdminThemeProvider';
import { AdminSnapshotProvider } from '../src/modules/platform-admin/snapshot/AdminSnapshotProvider';
import {
  SnapshotPage,
  type SnapshotModule,
} from '../src/modules/platform-admin/snapshot/SnapshotPage';
import {
  parseSnapshot,
  text,
  type AdminSnapshot,
} from '../src/modules/platform-admin/snapshot/model';

// Opt-in: npm run snapshot:export + web on localhost:3000. Uses native fetch, no API mocks.
let data: AdminSnapshot;
let root: Root;
let container: HTMLDivElement;
beforeAll(async () => {
  const response = await fetch('http://localhost:3000/admin-data/snapshot.json', {
    cache: 'no-store',
  });
  expect(response.status).toBe(200);
  data = parseSnapshot(await response.json());
});
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function mount(module: SnapshotModule) {
  await act(async () =>
    root.render(
      <AdminThemeProvider>
        <AdminSnapshotProvider>
          <SnapshotPage module={module} liveContent={null} />
        </AdminSnapshotProvider>
      </AdminThemeProvider>,
    ),
  );
  const deadline = Date.now() + 10000;
  while (
    !container.querySelector('[role="tab"]')?.textContent?.includes('(') &&
    Date.now() < deadline
  ) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  }
  expect(container.querySelector('[role="tab"]')?.textContent).toContain('(');
}
describe('Real PostgreSQL snapshot served by Vite', () => {
  it('contains the exported collections without credential columns and preserves calendar dates', () => {
    expect(Object.keys(data.collections)).toHaveLength(31);
    expect(data.counts.users).toBeGreaterThan(0);
    expect(data.counts.orders).toBeGreaterThan(0);
    for (const rows of Object.values(data.collections))
      for (const row of rows) {
        expect(
          Object.keys(row).some((key) =>
            /password|token|secret|otp|backup_code|gateway|payload|old_value|new_value/i.test(key),
          ),
        ).toBe(false);
      }
    for (const statement of data.collections.statements)
      expect(statement.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('renders actual exported order rows and counts over HTTP', async () => {
    await mount('orders');
    expect(container.textContent).toContain(text(data.collections.orders[0].code));
    expect(container.textContent).toContain(`Đơn hàng (${data.counts.orders})`);
    expect(container.querySelectorAll('tbody tr').length).toBeLessThanOrEqual(10);
  });
  it('reads stored statement lines in the detail drawer without a Store API', async () => {
    await mount('settlement');
    await act(async () => container.querySelector<HTMLTableRowElement>('tbody tr')?.click());
    const statement = data.collections.statements[0];
    const lines = data.collections.statementLines.filter(
      (line) => line.statement_id === statement.id,
    );
    expect(document.body.textContent).toContain(`Bút toán liên quan (${lines.length})`);
    expect(document.body.textContent).toContain(text(statement.checksum));
  });
});
