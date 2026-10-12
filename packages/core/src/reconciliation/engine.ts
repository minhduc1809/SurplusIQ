import * as crypto from 'crypto';
import {
  ReconciliationAdjustment,
  ReconciliationInput,
  ReconciliationOrder,
  ReconciliationOrderSummary,
  ReconciliationPeriod,
  ReconciliationStatement,
} from '../types/reconciliation.types';

export class ReconciliationEngine {
  /** Tỷ lệ hoa hồng mặc định 10% theo BRD Chương 13 #2 và VC-10 */
  public static readonly DEFAULT_COMMISSION_RATE = 0.10;

  /**
   * Tính toán sao kê đối soát tuần bất biến cho cửa hàng
   * Tuân thủ BR-075, R2-063, R2-066, R2-067
   */
  public static calculate(input: ReconciliationInput): ReconciliationStatement {
    if (!input.storeId || input.storeId.trim() === '') {
      throw new Error('storeId không được để trống khi tính đối soát');
    }
    if (!input.period || !input.period.cycleId) {
      throw new Error('Thông tin kỳ đối soát (period.cycleId) không hợp lệ');
    }

    const commissionRate =
      typeof input.commissionRate === 'number' && input.commissionRate >= 0
        ? input.commissionRate
        : this.DEFAULT_COMMISSION_RATE;

    const summary: ReconciliationOrderSummary = {
      pickedUpCount: 0,
      pickedUpAmount: 0,
      noShowCount: 0,
      noShowAmount: 0,
      refundedCount: 0,
      refundedAmount: 0,
      cancelledCount: 0,
      cancelledAmount: 0,
      totalProcessedOrders: 0,
    };

    let eligibleGrossSales = 0;

    for (const order of input.orders || []) {
      summary.totalProcessedOrders++;
      const orderAmount = Math.max(0, order.amount || 0);

      switch (order.status) {
        case 'PICKED_UP':
          summary.pickedUpCount++;
          summary.pickedUpAmount += orderAmount;
          eligibleGrossSales += orderAmount;
          break;

        case 'PICKUP_EXPIRED':
          summary.noShowCount++;
          summary.noShowAmount += orderAmount;
          // Nếu đơn hết hạn nhận không phải do lỗi của cửa hàng (khách không đến),
          // cửa hàng vẫn được ghi nhận doanh thu và tính phí hoa hồng theo BR-075 / R2-063
          if (!order.storeFault) {
            eligibleGrossSales += orderAmount;
          }
          break;

        case 'REFUNDED':
          summary.refundedCount++;
          summary.refundedAmount += orderAmount;
          // Đơn hoàn không tính vào doanh thu gộp và không tính hoa hồng
          break;

        case 'CANCELLED':
          summary.cancelledCount++;
          summary.cancelledAmount += orderAmount;
          // Đơn hủy không tính vào doanh thu gộp
          break;
      }
    }

    const commissionAmount = Math.round(eligibleGrossSales * commissionRate);
    const refundsDeduction = Math.max(0, input.refundsDeduction || 0);
    const subscriptionFee = Math.max(0, input.subscriptionFee || 0);

    let totalAdjustments = 0;
    if (Array.isArray(input.adjustments)) {
      for (const adj of input.adjustments) {
        const adjAmount = Math.max(0, adj.amount || 0);
        if (adj.type === 'CREDIT') {
          totalAdjustments += adjAmount;
        } else if (adj.type === 'DEBIT') {
          totalAdjustments -= adjAmount;
        }
      }
    }

    const netPayout =
      eligibleGrossSales -
      commissionAmount -
      refundsDeduction -
      subscriptionFee +
      totalAdjustments;

    const periodStart = new Date(input.period.startDate);
    const periodEnd = new Date(input.period.endDate);
    const generatedAt = input.generatedAt ? new Date(input.generatedAt) : new Date();
    const statementId = `STMT-${input.storeId}-${input.period.cycleId}`;
    const status = input.lockStatus || 'DRAFT';

    const checksum = this.computeChecksum({
      statementId,
      storeId: input.storeId,
      cycleId: input.period.cycleId,
      grossSales: eligibleGrossSales,
      commissionAmount,
      refundsDeduction,
      subscriptionFee,
      totalAdjustments,
      netPayout,
      generatedAt,
    });

    const explanation =
      `Kỳ đối soát ${input.period.cycleId}: Tổng doanh thu gộp ${eligibleGrossSales.toLocaleString('vi-VN')} đ ` +
      `(${summary.pickedUpCount} đơn đã nhận, ${summary.noShowCount} đơn hết hạn nhận). ` +
      `Khấu trừ hoa hồng 10%: ${commissionAmount.toLocaleString('vi-VN')} đ. ` +
      (refundsDeduction > 0
        ? `Khấu trừ hoàn tiền khiếu nại: ${refundsDeduction.toLocaleString('vi-VN')} đ. `
        : '') +
      (subscriptionFee > 0
        ? `Phí thuê bao: ${subscriptionFee.toLocaleString('vi-VN')} đ. `
        : '') +
      (totalAdjustments !== 0
        ? `Điều chỉnh sổ kỳ trước: ${(totalAdjustments > 0 ? '+' : '')}${totalAdjustments.toLocaleString('vi-VN')} đ. `
        : '') +
      `Thực nhận chuyển khoản (Net Payout): ${netPayout.toLocaleString('vi-VN')} đ.`;

    return {
      statementId,
      storeId: input.storeId,
      cycleId: input.period.cycleId,
      periodStart,
      periodEnd,
      grossSales: eligibleGrossSales,
      commissionRate,
      commissionAmount,
      refundsDeduction,
      subscriptionFee,
      totalAdjustments,
      netPayout,
      orderSummary: summary,
      status,
      generatedAt,
      checksum,
      explanation,
    };
  }

  /**
   * Tạo chữ ký băm SHA-256 xác thực tính bất biến của sao kê
   */
  public static computeChecksum(params: {
    statementId: string;
    storeId: string;
    cycleId: string;
    grossSales: number;
    commissionAmount: number;
    refundsDeduction: number;
    subscriptionFee: number;
    totalAdjustments: number;
    netPayout: number;
    generatedAt: Date;
  }): string {
    const rawPayload = [
      params.statementId,
      params.storeId,
      params.cycleId,
      params.grossSales,
      params.commissionAmount,
      params.refundsDeduction,
      params.subscriptionFee,
      params.totalAdjustments,
      params.netPayout,
      params.generatedAt.toISOString(),
    ].join('|');

    return crypto.createHash('sha256').update(rawPayload).digest('hex');
  }

  /**
   * Kiểm tra tính toàn vẹn (bất biến) của bản sao kê
   */
  public static verifyChecksum(statement: ReconciliationStatement): boolean {
    const expectedChecksum = this.computeChecksum({
      statementId: statement.statementId,
      storeId: statement.storeId,
      cycleId: statement.cycleId,
      grossSales: statement.grossSales,
      commissionAmount: statement.commissionAmount,
      refundsDeduction: statement.refundsDeduction,
      subscriptionFee: statement.subscriptionFee,
      totalAdjustments: statement.totalAdjustments,
      netPayout: statement.netPayout,
      generatedAt: statement.generatedAt,
    });

    return statement.checksum === expectedChecksum;
  }

  /**
   * Tiện ích xác định chu kỳ tuần ISO (Thứ Hai 00:00:00 đến Chủ Nhật 23:59:59)
   */
  public static getIsoWeekPeriod(date: Date): ReconciliationPeriod {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // Chuyển Chủ Nhật (0) thành 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

    // Tính ngày Thứ Hai đầu tuần
    const monday = new Date(date);
    const currentDay = monday.getDay() === 0 ? 7 : monday.getDay();
    monday.setDate(monday.getDate() - (currentDay - 1));
    monday.setHours(0, 0, 0, 0);

    // Tính ngày Chủ Nhật cuối tuần
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const padWeek = weekNo < 10 ? `0${weekNo}` : `${weekNo}`;
    const cycleId = `${d.getUTCFullYear()}-W${padWeek}`;

    return {
      cycleId,
      startDate: monday,
      endDate: sunday,
    };
  }
}
