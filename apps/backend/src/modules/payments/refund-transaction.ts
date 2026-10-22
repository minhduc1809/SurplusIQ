import { EntityManager } from 'typeorm';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { decryptField, encryptField, last4 } from '../../common/crypto/field-crypto';
import { OrderEntity } from '../../entities/orders/order.entity';
import {
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionEntity,
} from '../../entities/orders/payment-transaction.entity';

/**
 * Tạo lệnh hoàn tiền chờ chuyển khoản: chụp tài khoản nhận hoàn của khách tại thời điểm quyết định
 * (số tài khoản mã hóa), để khách đổi tài khoản sau đó không ảnh hưởng lệnh đã tạo.
 */
export async function createRefundTransaction(
  manager: EntityManager,
  order: OrderEntity,
  amount: number,
  gatewayTxnId: string,
): Promise<PaymentTransactionEntity> {
  const refund = manager.create(PaymentTransactionEntity, {
    orderId: order.id,
    storeId: order.storeId,
    kind: PaymentKind.ORDER_REFUND,
    amount,
    method: PaymentMethod.SIMULATED,
    status: PaymentStatus.SUCCEEDED,
    payoutStatus: 'PENDING',
    gatewayTxnId,
  });
  const bank = (
    await manager.findOne(CustomerProfileEntity, { where: { userId: order.customerId } })
  )?.refundBankAccount;
  if (bank) {
    const enc = bank.accountNumberEnc ?? encryptField(bank.accountNumber ?? '');
    refund.refundDestination = {
      bankBin: bank.bankBin,
      bankName: bank.bankName,
      accountHolder: bank.accountHolder,
      accountLast4: last4(bank.accountNumber ?? decryptField(enc)),
      accountNumberEnc: enc,
      snapshotAt: new Date().toISOString(),
    };
  }
  return manager.save(refund);
}
