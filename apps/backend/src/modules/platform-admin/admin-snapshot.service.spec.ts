import { DataSource } from 'typeorm';
import { AdminSnapshotService } from './admin-snapshot.service';

describe('AdminSnapshotService read model', () => {
  it('reads a consistent allowlisted projection and rebuilds dependent names', async () => {
    const queries: string[] = [];
    const manager = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        if (sql.includes('transaction_timestamp'))
          return [{ exported_at: '2026-10-19T09:00:00.000Z' }];
        if (sql.includes('FROM "users"')) return [{ id: 'user', email: 'owner@example.test' }];
        if (sql.includes('FROM "stores"'))
          return [{ id: 'store', name: 'Tên cửa hàng mới', owner_user_id: 'user' }];
        if (sql.includes('FROM "orders"'))
          return [{ id: 'order', code: 'DEMO1', store_id: 'store', customer_id: 'user' }];
        return [];
      }),
    };
    const transaction = jest.fn(
      async (_level: string, run: (value: typeof manager) => Promise<unknown>) => run(manager),
    );
    const service = new AdminSnapshotService({ transaction } as unknown as DataSource);
    const snapshot = await service.read();
    expect(transaction).toHaveBeenCalledWith('REPEATABLE READ', expect.any(Function));
    expect(queries[0]).toBe('SET TRANSACTION READ ONLY');
    expect(queries.some((sql) => /password_hash|token_hash|backup_code|SELECT \*/.test(sql))).toBe(
      false,
    );
    expect(snapshot.collections.orders[0]).toMatchObject({
      store_name: 'Tên cửa hàng mới',
      user_label: 'owner@example.test',
    });
    expect(snapshot.counts.users).toBe(1);
    expect(queries.some((sql) => sql.includes('"week_start"::text'))).toBe(true);

    const paginated = await service.readCollection('orders', {
      page: 1,
      limit: 10,
      search: 'DEMO1',
    });
    expect(paginated).toMatchObject({
      key: 'orders',
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(paginated.items).toHaveLength(1);
  });
});
