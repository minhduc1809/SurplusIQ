import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import {
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionEntity,
} from '../../entities/orders/payment-transaction.entity';

export interface ComplaintDecision {
  decision: 'ACCEPT' | 'REJECT';
  refundAmount?: number;
  reason?: string;
}

/** Must run inside a transaction; all interactive writers share these row locks. */
export async function decideComplaint(
  manager: EntityManager,
  id: string,
  dto: ComplaintDecision,
  storeId?: string,
  refundPrefix = 'ADMIN_REFUND',
) {
  if (!['ACCEPT', 'REJECT'].includes(dto.decision))
    throw new BadRequestException('Quyết định không hợp lệ.');
  if (dto.decision === 'REJECT' && !dto.reason?.trim())
    throw new BadRequestException('Vui lòng nhập lý do từ chối.');
  if (
    dto.refundAmount !== undefined &&
    (!Number.isInteger(dto.refundAmount) || dto.refundAmount < 0 || dto.refundAmount > 2147483647)
  )
    throw new BadRequestException('Số tiền hoàn phải là số nguyên không âm hợp lệ.');
  if (dto.decision === 'REJECT' && dto.refundAmount)
    throw new BadRequestException('Từ chối khiếu nại không tạo khoản hoàn tiền.');

  const complaint = await manager.findOne(ComplaintEntity, {
    where: { id, ...(storeId ? { storeId } : {}) },
    lock: { mode: 'pessimistic_write' },
  });
  if (!complaint) throw new NotFoundException('Khiếu nại không tồn tại hoặc không thuộc cửa hàng.');
  if (complaint.status !== ComplaintStatus.PENDING_STORE)
    throw new ConflictException('Khiếu nại đã được xử lý. Vui lòng tải lại dữ liệu.');
  const oldValue = { ...complaint };
  let refundTransaction: PaymentTransactionEntity | null = null;
  if (dto.decision === 'ACCEPT') {
    const order = await manager.findOne(OrderEntity, {
      where: { id: complaint.orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng liên quan.');
    if (order.storeId !== complaint.storeId)
      throw new ConflictException('Cửa hàng trên khiếu nại không khớp đơn hàng.');
    const refunds = await manager.find(PaymentTransactionEntity, {
      where: { orderId: order.id, kind: PaymentKind.ORDER_REFUND, status: PaymentStatus.SUCCEEDED },
    });
    const alreadyRefunded = refunds.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, order.totalAmount - alreadyRefunded);
    const refundAmount = dto.refundAmount ?? remaining;
    if (refundAmount > remaining)
      throw new BadRequestException(
        `Số tiền hoàn không được vượt quá phần chưa hoàn (${remaining} VND).`,
      );
    complaint.status = ComplaintStatus.ACCEPTED;
    complaint.refundAmount = refundAmount;
    complaint.rejectReason = null;
    complaint.autoAccepted = false;
    if (refundAmount > 0) {
      refundTransaction = manager.create(PaymentTransactionEntity, {
        orderId: order.id,
        storeId: order.storeId,
        kind: PaymentKind.ORDER_REFUND,
        amount: refundAmount,
        method: PaymentMethod.SIMULATED,
        status: PaymentStatus.SUCCEEDED,
        gatewayTxnId: `${refundPrefix}_${complaint.id}`,
      });
      await manager.save(refundTransaction);
    }
    if (
      alreadyRefunded + refundAmount >= order.totalAmount &&
      order.status === OrderStatus.PICKED_UP
    ) {
      order.status = OrderStatus.REFUNDED;
      await manager.save(order);
    }
  } else {
    complaint.status = ComplaintStatus.REJECTED;
    complaint.rejectReason = dto.reason!.trim();
    complaint.refundAmount = 0;
    complaint.autoAccepted = false;
  }
  await manager.save(complaint);
  return { complaint, oldValue, refundTransaction };
}
