import { describe, expect, it } from 'vitest';
import { CustomerSegmentationEngine } from './engine';
import { CustomerOrderStats, CustomerSegmentationInput } from '../types/segmentation.types';

describe('CustomerSegmentationEngine', () => {
  const fixedNow = new Date('2026-10-12T12:00:00.000Z');

  const createDummyCustomers = (count: number): CustomerOrderStats[] => {
    return Array.from({ length: count }, (_, i) => ({
      customerId: `cust-${i + 1}`,
      totalOrders: 1,
      lastOrderDate: new Date('2026-10-01T10:00:00.000Z'),
      noShowCount: 0,
    }));
  };

  it('từ chối phân nhóm nếu cửa hàng có dưới 20 khách (12.19.1)', () => {
    const input: CustomerSegmentationInput = {
      storeId: 'store-01',
      customers: createDummyCustomers(19),
      now: fixedNow,
    };

    const result = CustomerSegmentationEngine.segment(input);

    expect(result.isEligible).toBe(false);
    expect(result.totalCustomers).toBe(19);
    expect(result.reason).toContain('dưới 20 khách hàng');
    expect(result.customers).toHaveLength(0);
  });

  it('kích hoạt phân nhóm khi cửa hàng có đủ 20 khách hàng', () => {
    const input: CustomerSegmentationInput = {
      storeId: 'store-01',
      customers: createDummyCustomers(20),
      now: fixedNow,
    };

    const result = CustomerSegmentationEngine.segment(input);

    expect(result.isEligible).toBe(true);
    expect(result.totalCustomers).toBe(20);
    expect(result.customers).toHaveLength(20);
  });

  it('nhận diện đúng khách Mới (NEW): đúng 1 đơn trong 30 ngày qua', () => {
    const customers: CustomerOrderStats[] = [
      ...createDummyCustomers(19),
      {
        customerId: 'target-new-cust',
        totalOrders: 1,
        lastOrderDate: new Date('2026-10-05T12:00:00.000Z'), // 7 ngày trước
        noShowCount: 0,
      },
    ];

    const result = CustomerSegmentationEngine.segment({
      storeId: 'store-01',
      customers,
      now: fixedNow,
    });

    const target = result.customers.find((c) => c.customerId === 'target-new-cust');
    expect(target).toBeDefined();
    expect(target?.primarySegment).toBe('NEW');
    expect(target?.segments).toContain('NEW');
  });

  it('nhận diện đúng khách Thân thiết (LOYAL): >= 3 đơn và lần mua gần nhất <= 14 ngày', () => {
    const customers: CustomerOrderStats[] = [
      ...createDummyCustomers(19),
      {
        customerId: 'loyal-cust-01',
        totalOrders: 4,
        lastOrderDate: new Date('2026-10-08T12:00:00.000Z'), // 4 ngày trước
        noShowCount: 0,
      },
    ];

    const result = CustomerSegmentationEngine.segment({
      storeId: 'store-01',
      customers,
      now: fixedNow,
    });

    const loyal = result.customers.find((c) => c.customerId === 'loyal-cust-01');
    expect(loyal?.primarySegment).toBe('LOYAL');
    expect(loyal?.segments).toContain('LOYAL');
  });

  it('nhận diện đúng khách Có nguy cơ rời bỏ (AT_RISK): >= 2 đơn nhưng > 30 ngày không mua lại', () => {
    const customers: CustomerOrderStats[] = [
      ...createDummyCustomers(19),
      {
        customerId: 'at-risk-cust-01',
        totalOrders: 3,
        lastOrderDate: new Date('2026-08-15T12:00:00.000Z'), // ~58 ngày trước (>30 ngày)
        noShowCount: 0,
      },
    ];

    const result = CustomerSegmentationEngine.segment({
      storeId: 'store-01',
      customers,
      now: fixedNow,
    });

    const atRisk = result.customers.find((c) => c.customerId === 'at-risk-cust-01');
    expect(atRisk?.primarySegment).toBe('AT_RISK');
    expect(atRisk?.segments).toContain('AT_RISK');
  });

  it('nhận diện đúng khách Hay không đến nhận (HIGH_NOSHOW): tỷ lệ no-show >= 20%', () => {
    const customers: CustomerOrderStats[] = [
      ...createDummyCustomers(19),
      {
        customerId: 'no-show-cust-01',
        totalOrders: 4,
        lastOrderDate: new Date('2026-10-10T12:00:00.000Z'),
        noShowCount: 1, // 1/4 = 25% >= 20%
      },
    ];

    const result = CustomerSegmentationEngine.segment({
      storeId: 'store-01',
      customers,
      now: fixedNow,
    });

    const noshow = result.customers.find((c) => c.customerId === 'no-show-cust-01');
    expect(noshow?.primarySegment).toBe('HIGH_NOSHOW');
    expect(noshow?.segments).toContain('HIGH_NOSHOW');
    expect(noshow?.metrics.noShowRatio).toBe(0.25);
  });

  it('ẩn danh hóa mã khách hàng tuân thủ quy định bảo mật dữ liệu BR-083', () => {
    expect(CustomerSegmentationEngine.anonymizeCustomerId('khach_hang_99')).toBe('KH-KH***99');
    expect(CustomerSegmentationEngine.anonymizeCustomerId('abc')).toBe('KH-***BC');
    expect(CustomerSegmentationEngine.anonymizeCustomerId('')).toBe('KH-***00');

    const result = CustomerSegmentationEngine.segment({
      storeId: 'store-01',
      customers: createDummyCustomers(20),
      now: fixedNow,
    });

    for (const cust of result.customers) {
      expect(cust.anonymizedId.startsWith('KH-')).toBe(true);
      expect(cust.anonymizedId).toContain('***');
    }
  });

  it('báo lỗi nếu thiếu storeId', () => {
    expect(() =>
      CustomerSegmentationEngine.segment({
        storeId: '',
        customers: [],
      }),
    ).toThrow('storeId không được để trống');
  });

  it('cho phép tùy chỉnh ngưỡng cấu hình qua config', () => {
    const customers = createDummyCustomers(10); // 10 khách
    const result = CustomerSegmentationEngine.segment({
      storeId: 'store-01',
      customers,
      config: { minCustomersThreshold: 10 },
      now: fixedNow,
    });

    expect(result.isEligible).toBe(true);
    expect(result.totalCustomers).toBe(10);
  });
});
