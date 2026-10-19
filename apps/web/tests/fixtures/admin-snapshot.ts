import {
  collections,
  type AdminSnapshot,
  type SnapshotRow,
} from '../../src/modules/platform-admin/snapshot/model';

export function snapshotFixture(): AdminSnapshot {
  const data: Record<string, SnapshotRow[]> = Object.fromEntries(
    Object.keys(collections).map((key) => [key, []]),
  );
  const add = (key: string, values: SnapshotRow) =>
    data[key].push({
      ...Object.fromEntries(Object.keys(collections[key].fields).map((field) => [field, null])),
      ...values,
    });
  add('stores', {
    id: 'store-1',
    name: 'Tiệm Bánh Đỏ',
    status: 'ACTIVE',
    owner_user_id: 'user-1',
    user_label: 'owner@example.test',
  });
  add('stores', { id: 'store-2', name: 'Cửa hàng chờ', status: 'PENDING_VERIFY' });
  add('stores', { id: 'store-3', name: 'Cửa hàng tạm ngưng', status: 'SUSPENDED' });
  add('users', { id: 'user-1', email: 'owner@example.test', role: 'STORE_USER', status: 'ACTIVE' });
  add('users', {
    id: 'user-2',
    email: 'customer@example.test',
    role: 'CUSTOMER',
    status: 'LOCKED',
  });
  for (let i = 1; i <= 25; i++)
    add('orders', {
      id: `order-${i}`,
      code: `DEMO${String(i).padStart(3, '0')}`,
      store_id: 'store-1',
      store_name: 'Tiệm Bánh Đỏ',
      customer_id: 'user-2',
      user_label: 'customer@example.test',
      status: i % 2 ? 'PICKED_UP' : 'CANCELLED',
      total_amount: 10000,
      quantity: 2,
      created_at: '2026-10-18T20:00:00.000Z',
    });
  add('complaints', {
    id: 'complaint-1',
    order_id: 'order-1',
    order_code: 'DEMO001',
    store_id: 'store-1',
    store_name: 'Tiệm Bánh Đỏ',
    status: 'PENDING_STORE',
    description: 'Thiếu một sản phẩm',
  });
  add('attachments', {
    id: 'proof-1',
    complaint_id: 'complaint-1',
    url: 'https://example.test/evidence.jpg',
    added_round: 1,
  });
  add('statements', {
    id: 'statement-1',
    store_id: 'store-1',
    store_name: 'Tiệm Bánh Đỏ',
    gross: 50000,
    commission: 5000,
    net_payable: 45000,
    status: 'LOCKED',
    week_start: '2026-10-12',
  });
  add('statementLines', {
    id: 'line-1',
    statement_id: 'statement-1',
    order_id: 'order-1',
    order_code: 'DEMO001',
    amount: 10000,
    commission: 1000,
  });
  add('subscriptions', {
    store_id: 'store-1',
    store_name: 'Tiệm Bánh Đỏ',
    plan: 'PRO',
    status: 'ACTIVE',
  });
  add('invoices', { id: 'invoice-1', store_id: 'store-1', amount: 300000, status: 'PAID' });
  add('audit', {
    id: 'audit-1',
    action: 'SETTINGS_UPDATED',
    actor_role: 'ADMIN',
    created_at: '2026-10-19T09:00:00.000Z',
  });
  add('aiLogs', {
    id: 'ai-log-1',
    store_id: 'store-1',
    store_name: 'Tiệm Bánh Đỏ',
    user_id: 'user-1',
    feature_code: 'STORE_AI_CHAT',
    model: 'gemini-2.0-flash',
    input_summary: 'Phân tích doanh thu và tồn kho cuối ngày cho Tiệm Bánh Đỏ',
    output_summary: 'Khuyến nghị giảm giá 35% cho bánh mì bơ tỏi từ 18:30 để tối ưu tỷ lệ cứu món.',
    latency_ms: 640,
    error_code: null,
    created_at: '2026-10-19T08:30:00.000Z',
  });
  add('aiLogs', {
    id: 'ai-log-2',
    store_id: 'store-1',
    store_name: 'Tiệm Bánh Đỏ',
    user_id: 'user-1',
    feature_code: 'DESCRIBE_ITEM',
    model: 'gemini-1.5-flash',
    input_summary: 'Combo bánh ngọt Pháp cuối ngày',
    output_summary: 'Combo 4 bánh croissant bơ Pháp nướng trong ngày, thơm giòn tiết kiệm 40%.',
    latency_ms: 480,
    error_code: null,
    created_at: '2026-10-19T08:45:00.000Z',
  });
  return {
    version: 1,
    exportedAt: '2026-10-19T09:00:00.000Z',
    source: 'PostgreSQL snapshot',
    counts: Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length])),
    collections: data,
  };
}
