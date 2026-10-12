import { describe, expect, it } from 'vitest';
import { ReconciliationEngine } from './engine';
import { ReconciliationInput, ReconciliationOrder } from '../types/reconciliation.types';

describe('ReconciliationEngine', () => {
  const mockPeriod = {
    cycleId: '2026-W42',
    startDate: new Date('2026-10-12T00:00:00.000Z'),
    endDate: new Date('2026-10-18T23:59:59.999Z'),
  };

  it('tính toán chính xác doanh thu gộp và 10% hoa hồng cho các đơn đã nhận (PICKED_UP)', () => {
    const orders: ReconciliationOrder[] = [
      { orderId: 'ord-1', amount: 50000, status: 'PICKED_UP', completedAt: '2026-10-12' },
      { orderId: 'ord-2', amount: 30000, status: 'PICKED_UP', completedAt: '2026-10-13' },
      { orderId: 'ord-3', amount: 20000, status: 'PICKED_UP', completedAt: '2026-10-14' },
    ];

    const input: ReconciliationInput = {
      storeId: 'store-101',
      period: mockPeriod,
      orders,
    };

    const statement = ReconciliationEngine.calculate(input);

    expect(statement.grossSales).toBe(100000);
    expect(statement.commissionRate).toBe(0.1);
    expect(statement.commissionAmount).toBe(10000); // 10% of 100,000
    expect(statement.netPayout).toBe(90000); // 100,000 - 10,000
    expect(statement.orderSummary.pickedUpCount).toBe(3);
    expect(statement.orderSummary.totalProcessedOrders).toBe(3);
    expect(statement.status).toBe('DRAFT');
  });

  it('tính cả đơn khách không đến nhận (PICKUP_EXPIRED) vào doanh thu gộp và thu hoa hồng', () => {
    const orders: ReconciliationOrder[] = [
      { orderId: 'ord-1', amount: 40000, status: 'PICKED_UP', completedAt: '2026-10-12' },
      {
        orderId: 'ord-2',
        amount: 60000,
        status: 'PICKUP_EXPIRED',
        completedAt: '2026-10-13',
        noShowByBuyer: true,
      },
    ];

    const input: ReconciliationInput = {
      storeId: 'store-101',
      period: mockPeriod,
      orders,
    };

    const statement = ReconciliationEngine.calculate(input);

    expect(statement.grossSales).toBe(100000);
    expect(statement.commissionAmount).toBe(10000);
    expect(statement.netPayout).toBe(90000);
    expect(statement.orderSummary.pickedUpCount).toBe(1);
    expect(statement.orderSummary.noShowCount).toBe(1);
  });

  it('loại trừ đơn PICKUP_EXPIRED do lỗi của quán (storeFault = true) khỏi doanh thu gộp', () => {
    const orders: ReconciliationOrder[] = [
      { orderId: 'ord-1', amount: 50000, status: 'PICKED_UP', completedAt: '2026-10-12' },
      {
        orderId: 'ord-2',
        amount: 30000,
        status: 'PICKUP_EXPIRED',
        completedAt: '2026-10-13',
        storeFault: true,
      },
    ];

    const input: ReconciliationInput = {
      storeId: 'store-101',
      period: mockPeriod,
      orders,
    };

    const statement = ReconciliationEngine.calculate(input);

    expect(statement.grossSales).toBe(50000); // Không cộng 30,000 do lỗi quán
    expect(statement.commissionAmount).toBe(5000);
    expect(statement.netPayout).toBe(45000);
    expect(statement.orderSummary.noShowCount).toBe(1);
    expect(statement.orderSummary.noShowAmount).toBe(30000);
  });

  it('không tính hoa hồng và không cộng vào doanh thu gộp đối với đơn hoàn (REFUNDED) và đơn hủy (CANCELLED)', () => {
    const orders: ReconciliationOrder[] = [
      { orderId: 'ord-1', amount: 70000, status: 'PICKED_UP', completedAt: '2026-10-12' },
      { orderId: 'ord-2', amount: 20000, status: 'REFUNDED', completedAt: '2026-10-13' },
      { orderId: 'ord-3', amount: 15000, status: 'CANCELLED', completedAt: '2026-10-14' },
    ];

    const input: ReconciliationInput = {
      storeId: 'store-101',
      period: mockPeriod,
      orders,
    };

    const statement = ReconciliationEngine.calculate(input);

    expect(statement.grossSales).toBe(70000);
    expect(statement.commissionAmount).toBe(7000);
    expect(statement.orderSummary.refundedCount).toBe(1);
    expect(statement.orderSummary.refundedAmount).toBe(20000);
    expect(statement.orderSummary.cancelledCount).toBe(1);
    expect(statement.orderSummary.cancelledAmount).toBe(15000);
    expect(statement.netPayout).toBe(63000);
  });

  it('khấu trừ chính xác tiền hoàn khiếu nại (refundsDeduction) và phí gói thuê bao (subscriptionFee)', () => {
    const orders: ReconciliationOrder[] = [
      { orderId: 'ord-1', amount: 500000, status: 'PICKED_UP', completedAt: '2026-10-12' },
    ];

    const input: ReconciliationInput = {
      storeId: 'store-101',
      period: mockPeriod,
      orders,
      refundsDeduction: 50000,
      subscriptionFee: 300000, // Phí Pro 300k
    };

    const statement = ReconciliationEngine.calculate(input);

    expect(statement.grossSales).toBe(500000);
    expect(statement.commissionAmount).toBe(50000); // 10%
    expect(statement.refundsDeduction).toBe(50000);
    expect(statement.subscriptionFee).toBe(300000);
    // Net: 500k - 50k (comm) - 50k (refund) - 300k (sub) = 100k
    expect(statement.netPayout).toBe(100000);
  });

  it('áp dụng các bút toán điều chỉnh CREDIT và DEBIT chính xác', () => {
    const orders: ReconciliationOrder[] = [
      { orderId: 'ord-1', amount: 200000, status: 'PICKED_UP', completedAt: '2026-10-12' },
    ];

    const input: ReconciliationInput = {
      storeId: 'store-101',
      period: mockPeriod,
      orders,
      adjustments: [
        { id: 'adj-1', amount: 15000, type: 'CREDIT', reason: 'Hoàn tiền bồi thường tuần trước' },
        { id: 'adj-2', amount: 5000, type: 'DEBIT', reason: 'Trừ phạt giao thiếu hàng' },
      ],
    };

    const statement = ReconciliationEngine.calculate(input);

    expect(statement.grossSales).toBe(200000);
    expect(statement.commissionAmount).toBe(20000);
    expect(statement.totalAdjustments).toBe(10000); // +15k - 5k = +10k
    // Net: 200k - 20k + 10k = 190k
    expect(statement.netPayout).toBe(190000);
  });

  it('sinh mã checksum SHA-256 hợp lệ và kiểm tra tính bất biến (immutable integrity)', () => {
    const orders: ReconciliationOrder[] = [
      { orderId: 'ord-1', amount: 100000, status: 'PICKED_UP', completedAt: '2026-10-12' },
    ];

    const input: ReconciliationInput = {
      storeId: 'store-101',
      period: mockPeriod,
      orders,
      generatedAt: new Date('2026-10-19T00:05:00.000Z'),
      lockStatus: 'LOCKED',
    };

    const statement = ReconciliationEngine.calculate(input);

    expect(statement.checksum).toBeDefined();
    expect(statement.checksum.length).toBe(64); // SHA-256 hex string
    expect(ReconciliationEngine.verifyChecksum(statement)).toBe(true);

    // Thử làm sai lệch số tiền để kiểm tra verifyChecksum phát hiện
    const tamperedStatement = { ...statement, netPayout: 999999 };
    expect(ReconciliationEngine.verifyChecksum(tamperedStatement)).toBe(false);
  });

  it('báo lỗi nếu thiếu storeId hoặc period', () => {
    expect(() =>
      ReconciliationEngine.calculate({
        storeId: '',
        period: mockPeriod,
        orders: [],
      }),
    ).toThrow('storeId không được để trống');

    expect(() =>
      ReconciliationEngine.calculate({
        storeId: 'store-101',
        period: null as unknown as ReconciliationPeriod,
        orders: [],
      }),
    ).toThrow('Thông tin kỳ đối soát');
  });

  it('hàm getIsoWeekPeriod tính đúng kỳ tuần ISO (Thứ Hai 00:00:00 đến Chủ Nhật 23:59:59)', () => {
    // Thứ Tư, ngày 14 tháng 10 năm 2026
    const testDate = new Date('2026-10-14T10:00:00.000Z');
    const period = ReconciliationEngine.getIsoWeekPeriod(testDate);

    expect(period.cycleId).toContain('2026-W');
    expect(new Date(period.startDate).getDay()).toBe(1); // Thứ Hai
    expect(new Date(period.endDate).getDay()).toBe(0); // Chủ Nhật
  });
});
