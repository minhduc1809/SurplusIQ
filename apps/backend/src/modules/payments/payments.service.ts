import { getJwtSecret } from '../../common/config/jwt-secret';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notifications/notification.entity';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  PaymentTransactionEntity,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../entities/orders/payment-transaction.entity';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { PickupTokenEntity, PickupTokenStatus } from '../../entities/orders/pickup-token.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { QrTokenEngine, BackupPinEngine } from '@surplusiq/core';
import { CreatePaymentDto, PaymentWebhookDto, ConfirmPaymentDto } from './dto';
import { PAYMENTS_CONSTANTS } from './payments.constants';

export interface PaymentInitiationResult {
  transactionId: string;
  gatewayTxnId: string;
  orderId: string;
  orderCode: string;
  amount: number;
  transferSyntax: string;
  bankAccount: string;
  bankBin: string;
  bankName: string;
  accountName: string;
  qrUrl: string;
  holdExpiresAt: Date;
  status: PaymentStatus;
}

export interface PaymentConfirmationResult {
  success: boolean;
  orderId: string;
  orderCode: string;
  orderStatus: OrderStatus;
  transactionId?: string;
  gatewayTxnId?: string;
  amount?: number;
  paidAt?: Date;
  pickupToken?: string;
  backupCode?: string;
  latePaymentRefunded?: boolean;
  refundTxnId?: string;
  idempotent?: boolean;
  message: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly jwtSecret = getJwtSecret();

  constructor(
    @InjectRepository(PaymentTransactionEntity)
    private readonly paymentTxnRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(PickupTokenEntity)
    private readonly pickupTokenRepo: Repository<PickupTokenEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /**
   * Khởi tạo giao dịch thanh toán VietQR / Giả lập cho đơn hàng (R1-041, BR-016)
   */
  async createPayment(
    customerId: string,
    orderId: string,
    dto?: CreatePaymentDto,
  ): Promise<PaymentInitiationResult> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Chỉ có thể tạo thanh toán cho đơn đang chờ thanh toán (Trạng thái hiện tại: ${order.status}).`,
      );
    }

    const now = new Date();
    if (new Date(order.holdExpiresAt) <= now) {
      throw new BadRequestException(
        'Đơn hàng đã hết thời gian giữ suất 10 phút (BR-017). Vui lòng đặt lại đơn mới.',
      );
    }

    // Kiểm tra xem đã có giao dịch chờ thanh toán cho đơn này chưa (Idempotency)
    let paymentTxn = await this.paymentTxnRepo.findOne({
      where: {
        orderId: order.id,
        kind: PaymentKind.ORDER_PAYMENT,
        status: PaymentStatus.PENDING_CONFIRM,
      },
    });

    if (!paymentTxn) {
      const gatewayTxnId = `TXN_SUQ_${order.code}_${Date.now()}`;
      paymentTxn = this.paymentTxnRepo.create({
        orderId: order.id,
        storeId: order.storeId,
        kind: PaymentKind.ORDER_PAYMENT,
        amount: order.totalAmount, // Giá chốt vào đơn tại thời điểm giữ suất (BR-016)
        method: dto?.method || PaymentMethod.VIETQR,
        gatewayTxnId,
        status: PaymentStatus.PENDING_CONFIRM,
        retryCount: 0,
      });
      paymentTxn = await this.paymentTxnRepo.save(paymentTxn);

      await this.auditLogService.log({
        storeId: order.storeId,
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action: 'PAYMENT_INITIATED',
        targetType: 'PAYMENT_TRANSACTION',
        targetId: paymentTxn.id,
        newValue: {
          gatewayTxnId,
          amount: paymentTxn.amount,
          method: paymentTxn.method,
        },
      });
    }

    const transferSyntax = `${PAYMENTS_CONSTANTS.VIETQR.SYNTAX_PREFIX}${order.code}`;
    const qrUrl = `https://img.vietqr.io/image/${PAYMENTS_CONSTANTS.VIETQR.BANK_BIN}-${
      PAYMENTS_CONSTANTS.VIETQR.ACCOUNT_NO
    }-${PAYMENTS_CONSTANTS.VIETQR.TEMPLATE}.png?amount=${order.totalAmount}&addInfo=${transferSyntax}&accountName=${encodeURIComponent(
      PAYMENTS_CONSTANTS.VIETQR.ACCOUNT_NAME,
    )}`;

    return {
      transactionId: paymentTxn.id,
      gatewayTxnId: paymentTxn.gatewayTxnId,
      orderId: order.id,
      orderCode: order.code,
      amount: paymentTxn.amount,
      transferSyntax,
      bankAccount: PAYMENTS_CONSTANTS.VIETQR.ACCOUNT_NO,
      bankBin: PAYMENTS_CONSTANTS.VIETQR.BANK_BIN,
      bankName: PAYMENTS_CONSTANTS.VIETQR.BANK_NAME,
      accountName: PAYMENTS_CONSTANTS.VIETQR.ACCOUNT_NAME,
      qrUrl,
      holdExpiresAt: order.holdExpiresAt,
      status: paymentTxn.status,
    };
  }

  /**
   * Xử lý xác nhận thanh toán / Webhook từ cổng thanh toán (R1-041, R1-047, BR-015, BR-016, VC-10)
   * Đảm bảo Idempotent theo gateway_txn_id, khớp số tiền, hoàn tiền nếu đến muộn.
   */
  async processPaymentWebhook(dto: PaymentWebhookDto): Promise<PaymentConfirmationResult> {
    // 1. Kiểm tra tính Idempotency theo gateway_txn_id (BR-015, VC-10)
    const existingTxn = await this.paymentTxnRepo.findOne({
      where: { gatewayTxnId: dto.gatewayTxnId },
    });

    if (existingTxn && existingTxn.status === PaymentStatus.SUCCEEDED) {
      this.logger.log(
        `[IDEMPOTENT_PAYMENT] Giao dịch ${dto.gatewayTxnId} đã được xử lý trước đó. Bỏ qua ghi nhận lặp.`,
      );
      const existingOrder = await this.orderRepo.findOne({
        where: { id: existingTxn.orderId || '' },
      });

      return {
        success: true,
        idempotent: true,
        orderId: existingOrder ? existingOrder.id : '',
        orderCode: existingOrder ? existingOrder.code : '',
        orderStatus: existingOrder ? existingOrder.status : OrderStatus.PAID,
        transactionId: existingTxn.id,
        gatewayTxnId: existingTxn.gatewayTxnId,
        amount: existingTxn.amount,
        message: 'Giao dịch đã được ghi nhận trước đó (Idempotent - BR-015, VC-10).',
      };
    }

    // 2. Tìm đơn hàng tương ứng
    let order: OrderEntity | null = null;

    if (existingTxn?.orderId) {
      order = await this.orderRepo.findOne({ where: { id: existingTxn.orderId } });
    } else if (dto.orderId) {
      order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    } else if (dto.orderCode) {
      order = await this.orderRepo.findOne({ where: { code: dto.orderCode } });
    } else if (dto.transferMessage) {
      // Bóc tách cú pháp SUQ<ORDER_CODE>
      const match = dto.transferMessage.match(/SUQ([A-Za-z0-9]+)/i);
      if (match && match[1]) {
        order = await this.orderRepo.findOne({ where: { code: match[1].toUpperCase() } });
      }
    }

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng tương ứng với thông tin thanh toán được cung cấp.',
      );
    }

    // 3. Thực hiện Transaction khóa bi quan (pessimistic_write) trên OrderEntity
    // Sai số tiền: ghi nhận đối soát thủ công TRONG transaction rồi mới báo lỗi SAU khi commit (tránh rollback mất dấu vết).
    let mismatch: { expected: number; received: number } | null = null;
    const result = await this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager
        .createQueryBuilder(OrderEntity, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: order.id })
        .getOne();

      if (!lockedOrder) {
        throw new NotFoundException(`Không tìm thấy đơn hàng [${order.id}].`);
      }

      // Khởi tạo hoặc cập nhật bản ghi giao dịch
      let txn = await manager.findOne(PaymentTransactionEntity, {
        where: { gatewayTxnId: dto.gatewayTxnId },
      });

      if (!txn) {
        txn = manager.create(PaymentTransactionEntity, {
          orderId: lockedOrder.id,
          storeId: lockedOrder.storeId,
          kind: PaymentKind.ORDER_PAYMENT,
          amount: dto.amount,
          method: PaymentMethod.VIETQR,
          gatewayTxnId: dto.gatewayTxnId,
          status: PaymentStatus.PENDING_CONFIRM,
          retryCount: 0,
        });
      } else {
        txn.orderId = lockedOrder.id;
        txn.storeId = lockedOrder.storeId;
        txn.amount = dto.amount;
      }

      // 4. Kiểm tra khớp số tiền chính xác (BR-016)
      if (dto.amount !== lockedOrder.totalAmount) {
        txn.status = PaymentStatus.MANUAL_REVIEW;
        await manager.save(txn);

        await this.auditLogService.log({
          storeId: lockedOrder.storeId,
          actorId: '00000000-0000-0000-0000-000000000000',
          actorRole: 'SYSTEM',
          action: 'PAYMENT_AMOUNT_MISMATCH',
          targetType: 'PAYMENT_TRANSACTION',
          targetId: txn.id,
          newValue: {
            expected: lockedOrder.totalAmount,
            received: dto.amount,
            status: PaymentStatus.MANUAL_REVIEW,
          },
        });

        mismatch = { expected: lockedOrder.totalAmount, received: dto.amount };
        return undefined as unknown as PaymentConfirmationResult;
      }

      const now = new Date();
      // Đơn không còn chờ thanh toán (đã PAID, đã hủy, đã nhận...) cũng không được nhận thêm tiền: hoàn 100% thay vì
      // làm sống lại đơn hoặc cấp thêm vé nhận hàng (BR-015).
      const notAwaitingPayment = lockedOrder.status !== OrderStatus.PENDING_PAYMENT;
      const isHoldExpired = notAwaitingPayment || new Date(lockedOrder.holdExpiresAt) < now;

      // 5. TRƯỜNG HỢP THANH TOÁN ĐẾN MUỘN (R1-047, BR-015, TEST-ORDER-04)
      if (isHoldExpired) {
        this.logger.warn(
          `[LATE_PAYMENT] Đơn ${lockedOrder.code} đã hết hạn giữ suất (${lockedOrder.holdExpiresAt.toISOString()}). Tự động kích hoạt hoàn tiền 100% (R1-047).`,
        );

        // Đơn quá hạn giữ nhưng job chưa kịp nhả: chuyển HOLD_EXPIRED và trả tồn kho tại đây, vì job chỉ quét
        // đơn PENDING_PAYMENT (R1-047 BR 3). Đơn ở trạng thái khác giữ nguyên trạng thái.
        if (lockedOrder.status === OrderStatus.PENDING_PAYMENT) {
          lockedOrder.status = OrderStatus.HOLD_EXPIRED;
          lockedOrder.cancelledBy = CancelledBy.SYSTEM;
          lockedOrder.cancelReason = 'Hết hạn giữ suất 10 phút (BR-017)';
          lockedOrder.cancelledAt = new Date();
          await manager.save(lockedOrder);
          const heldOffer = await manager
            .createQueryBuilder(OfferEntity, 'offer')
            .setLock('pessimistic_write')
            .where('offer.id = :id', { id: lockedOrder.offerId })
            .getOne();
          if (heldOffer) {
            heldOffer.remainingQuantity += lockedOrder.quantity;
            if (heldOffer.status === OfferStatus.SOLD_OUT && new Date(heldOffer.pickupEnd) > now) {
              heldOffer.status = OfferStatus.OPEN;
            }
            await manager.save(heldOffer);
          }
        }

        // Đánh dấu giao dịch thu tiền thành công
        txn.status = PaymentStatus.SUCCEEDED;
        await manager.save(txn);

        // Tạo lệnh hoàn tiền 100% tự động, chống hoàn trùng (R1-047 BR 1, BR 2)
        // shortcut: gateway hoàn tiền được giả lập nên luôn SUCCEEDED ngay, không có lỗi mạng để retry;
        // nếu đổi sang cổng thanh toán thật, thêm retryCount + chuyển MANUAL_REVIEW sau 3 lần lỗi tại đây.
        const refundTxnId = `REFUND_${txn.gatewayTxnId}`;
        let refundTxn = await manager.findOne(PaymentTransactionEntity, {
          where: { gatewayTxnId: refundTxnId },
        });

        if (!refundTxn) {
          refundTxn = manager.create(PaymentTransactionEntity, {
            orderId: lockedOrder.id,
            storeId: lockedOrder.storeId,
            kind: PaymentKind.ORDER_REFUND,
            amount: txn.amount, // Hoàn 100% số tiền đã nhận, không trừ hoa hồng (R1-047)
            method: txn.method,
            gatewayTxnId: refundTxnId,
            parentTxnId: txn.gatewayTxnId,
            status: PaymentStatus.SUCCEEDED,
            retryCount: 0,
          });
          await manager.save(refundTxn);
        }

        await this.auditLogService.log({
          storeId: lockedOrder.storeId,
          actorId: '00000000-0000-0000-0000-000000000000',
          actorRole: 'SYSTEM',
          action: 'ORDER_LATE_PAYMENT_REFUNDED',
          targetType: 'ORDER',
          targetId: lockedOrder.id,
          newValue: {
            orderCode: lockedOrder.code,
            amount: txn.amount,
            parentTxnId: txn.gatewayTxnId,
            refundTxnId: refundTxn.gatewayTxnId,
          },
        });

        return {
          success: true,
          latePaymentRefunded: true,
          orderId: lockedOrder.id,
          orderCode: lockedOrder.code,
          orderStatus: lockedOrder.status,
          transactionId: txn.id,
          gatewayTxnId: txn.gatewayTxnId,
          amount: txn.amount,
          refundTxnId: refundTxn.gatewayTxnId,
          message:
            'Đơn hàng đã hết hạn giữ suất 10 phút. Tiền đã được tự động hoàn 100% về tài khoản của bạn (R1-047).',
        };
      }

      // 6. TRƯỜNG HỢP THANH TOÁN ĐÚNG HẠN BÌNH THƯỜNG (R1-041, BR-022)
      txn.status = PaymentStatus.SUCCEEDED;
      await manager.save(txn);

      lockedOrder.status = OrderStatus.PAID;
      lockedOrder.paidAt = new Date();
      await manager.save(lockedOrder);

      // 7. Sinh mã QR nhận hàng HMAC-SHA256 & Mã dự phòng 6 số (R1-041, R1-057, BR-022)
      const backupCode = BackupPinEngine.generate();

      // Hạn của vé nhận hàng lấy theo khung giờ nhận của món hoặc 24 giờ
      const offer = await manager.findOne(OfferEntity, { where: { id: lockedOrder.offerId } });
      const expiryHours = PAYMENTS_CONSTANTS.DEFAULT_PICKUP_TOKEN_EXPIRY_HOURS;
      let expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

      if (offer && offer.pickupEnd) {
        // Tối thiểu là thời điểm kết thúc khung nhận hàng
        expiresAt = new Date(offer.pickupEnd);
      } else if (lockedOrder.pickupSlot) {
        expiresAt = new Date(new Date(lockedOrder.pickupSlot).getTime() + 2 * 60 * 60 * 1000);
      }

      const pickupTokenRecord = manager.create(PickupTokenEntity, {
        orderId: lockedOrder.id,
        backupCode,
        expiresAt,
        status: PickupTokenStatus.UNUSED,
      });
      const savedToken = await manager.save(pickupTokenRecord);

      // Ký token QR an toàn HMAC-SHA256 không chứa PII (BR-022)
      const signedQrToken = QrTokenEngine.sign(
        {
          jti: savedToken.id,
          orderId: lockedOrder.id,
          storeId: lockedOrder.storeId,
          exp: expiresAt.getTime(),
        },
        this.jwtSecret,
      );

      await this.auditLogService.log({
        storeId: lockedOrder.storeId,
        actorId: '00000000-0000-0000-0000-000000000000',
        actorRole: 'SYSTEM',
        action: 'ORDER_PAYMENT_CONFIRMED',
        targetType: 'ORDER',
        targetId: lockedOrder.id,
        newValue: {
          status: OrderStatus.PAID,
          paidAt: lockedOrder.paidAt,
          gatewayTxnId: txn.gatewayTxnId,
          amount: txn.amount,
          backupCode,
        },
      });

      return {
        success: true,
        orderId: lockedOrder.id,
        orderCode: lockedOrder.code,
        orderStatus: OrderStatus.PAID,
        transactionId: txn.id,
        gatewayTxnId: txn.gatewayTxnId,
        amount: txn.amount,
        paidAt: lockedOrder.paidAt,
        pickupToken: signedQrToken,
        backupCode,
        message: 'Thanh toán thành công! Mã QR nhận hàng đã được kích hoạt.',
      };
    });
    if (mismatch !== null) {
      const m: { expected: number; received: number } = mismatch;
      throw new BadRequestException(
        `Số tiền thanh toán [${m.received}] không khớp chính xác đơn giá chốt [${m.expected}] (BR-016). Đã đưa vào đối soát thủ công.`,
      );
    }
    await this.notifyPaymentResult(result);
    return result;
  }

  /** Báo cho khách và cửa hàng sau khi thanh toán được ghi nhận (hoặc hoàn tiền do đến muộn). */
  private async notifyPaymentResult(result: PaymentConfirmationResult) {
    if (!this.notifications || result.idempotent || !result.orderId) return;
    const order = await this.orderRepo.findOne({ where: { id: result.orderId } });
    if (!order) return;
    if (result.latePaymentRefunded) {
      await this.notifications.notifyQuietly({
        userId: order.customerId,
        type: NotificationType.ORDER,
        title: 'Đã hoàn tiền thanh toán muộn',
        body: `Đơn ${order.code} đã hết hạn giữ suất nên tiền được hoàn 100%.`,
        data: { orderId: order.id, kind: 'PAYMENT_LATE_REFUNDED' },
      });
    } else if (result.orderStatus === OrderStatus.PAID) {
      await this.notifications.notifyQuietly({
        userId: order.customerId,
        type: NotificationType.ORDER,
        title: 'Thanh toán thành công',
        body: `Đơn ${order.code} đã thanh toán. Mở vé nhận hàng để đến lấy đúng khung giờ.`,
        data: { orderId: order.id, kind: 'PAYMENT_CONFIRMED' },
      });
      await this.notifications.notifyQuietly({
        storeId: order.storeId,
        type: NotificationType.ORDER,
        title: 'Đơn mới đã thanh toán',
        body: `Đơn ${order.code} (${order.quantity} suất) đã thanh toán. Hãy chuẩn bị hàng.`,
        data: { orderId: order.id, kind: 'ORDER_PAID' },
      });
    }
  }

  /**
   * Quản trị nền tảng xác nhận đã nhận tiền theo biên lai khi webhook ngân hàng chưa về (KX02).
   * Dùng lại luồng webhook nên giữ nguyên kiểm tra số tiền, hạn giữ suất, hoàn tiền trễ và sinh vé nhận hàng;
   * không trả vé QR hay mã dự phòng cho người gọi.
   */
  async confirmPaymentProof(orderId: string, actorId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.status !== OrderStatus.PENDING_PAYMENT || !order.paymentProofUrl) {
      throw new BadRequestException('Chỉ xác nhận được đơn đang chờ thanh toán và đã có biên lai.');
    }
    const txn = await this.paymentTxnRepo.findOne({
      where: { orderId, kind: PaymentKind.ORDER_PAYMENT, status: PaymentStatus.PENDING_CONFIRM },
      order: { createdAt: 'DESC' },
    });
    if (!txn) throw new BadRequestException('Đơn chưa có giao dịch thanh toán đang chờ xác nhận.');

    const result = await this.processPaymentWebhook({
      gatewayTxnId: txn.gatewayTxnId,
      amount: txn.amount,
      orderId: order.id,
      orderCode: order.code,
      transferMessage: `SUQ${order.code}`,
    });
    await this.auditLogService.log({
      storeId: order.storeId,
      actorId,
      actorRole: 'ADMIN',
      action: 'PAYMENT_PROOF_CONFIRMED',
      targetType: 'ORDER',
      targetId: order.id,
      newValue: { proofUrl: order.paymentProofUrl, orderStatus: result.orderStatus },
    });
    return {
      orderId: order.id,
      orderCode: order.code,
      orderStatus: result.orderStatus,
      latePaymentRefunded: Boolean(result.latePaymentRefunded),
    };
  }

  /** Quản trị nền tảng từ chối biên lai (không thấy tiền về): xóa biên lai để khách gửi lại, ghi nhật ký kèm lý do. */
  async rejectPaymentProof(orderId: string, actorId: string, reason: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.status !== OrderStatus.PENDING_PAYMENT || !order.paymentProofUrl) {
      throw new BadRequestException('Đơn không có biên lai đang chờ xem xét.');
    }
    const proofUrl = order.paymentProofUrl;
    order.paymentProofUrl = null;
    order.paymentProofUploadedAt = null;
    await this.orderRepo.save(order);
    await this.auditLogService.log({
      storeId: order.storeId,
      actorId,
      actorRole: 'ADMIN',
      action: 'PAYMENT_PROOF_REJECTED',
      targetType: 'ORDER',
      targetId: order.id,
      newValue: { proofUrl, reason },
    });
    return { orderId: order.id, orderCode: order.code, reason };
  }

  /**
   * Khách yêu cầu kiểm tra lại trạng thái thanh toán cổng (R1-056, VC-07)
   * Tần suất: tối đa 1 lần / phút (≥ 60s). Quá 24h đánh dấu FAILED.
   */
  async recheckPayment(customerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    const txn = await this.paymentTxnRepo.findOne({
      where: { orderId, kind: PaymentKind.ORDER_PAYMENT },
      order: { createdAt: 'DESC' },
    });

    if (!txn) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán cho đơn hàng này.');
    }

    const now = new Date();

    // 1. Kiểm tra giới hạn tần suất gọi: tối đa 1 lần / 60 giây (R1-056)
    if (txn.lastCheckedAt) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - new Date(txn.lastCheckedAt).getTime()) / 1000,
      );
      if (elapsedSeconds < PAYMENTS_CONSTANTS.RECHECK_RATE_LIMIT_SECONDS) {
        const waitSeconds = PAYMENTS_CONSTANTS.RECHECK_RATE_LIMIT_SECONDS - elapsedSeconds;
        throw new BadRequestException(
          `Mỗi đơn kiểm tra tối đa 1 lần/phút (R1-056). Vui lòng đợi thêm ${waitSeconds} giây trước khi thử lại.`,
        );
      }
    }

    // 2. Cập nhật lượt kiểm tra
    txn.lastCheckedAt = now;
    txn.retryCount += 1;

    // 3. Quá 24 giờ chưa xác nhận -> Đánh dấu FAILED (VC-07, R1-056).
    // Nếu tiền thực tế đến muộn sau mốc này, webhook thanh toán (processPaymentWebhook)
    // vẫn xử lý độc lập và tự hoàn tiền 100% vì hold đã hết hạn từ lâu (R1-047).
    const hoursElapsed = (now.getTime() - new Date(txn.createdAt).getTime()) / (1000 * 60 * 60);
    if (
      txn.status === PaymentStatus.PENDING_CONFIRM &&
      hoursElapsed >= PAYMENTS_CONSTANTS.PENDING_MAX_HOURS
    ) {
      txn.status = PaymentStatus.FAILED;
    }

    const savedTxn = await this.paymentTxnRepo.save(txn);

    return {
      orderId: order.id,
      orderCode: order.code,
      orderStatus: order.status,
      paymentStatus: savedTxn.status,
      lastCheckedAt: savedTxn.lastCheckedAt,
      retryCount: savedTxn.retryCount,
      message:
        savedTxn.status === PaymentStatus.SUCCEEDED
          ? 'Đơn hàng đã thanh toán thành công.'
          : savedTxn.status === PaymentStatus.FAILED
            ? 'Giao dịch đã quá hạn 24 giờ và bị hủy.'
            : 'Giao dịch đang chờ xác nhận từ ngân hàng.',
    };
  }

  /**
   * Endpoint thử nghiệm môi trường phát triển (Chỉ NODE_ENV !== 'production')
   */
  async confirmPaymentDev(transactionId: string, dto?: ConfirmPaymentDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Endpoint xác nhận thanh toán thử nghiệm không khả dụng trên môi trường Production.',
      );
    }

    const txn = await this.paymentTxnRepo.findOne({
      where: [{ id: transactionId }, { gatewayTxnId: transactionId }],
    });

    if (!txn) {
      throw new NotFoundException(`Không tìm thấy giao dịch với mã [${transactionId}].`);
    }

    const order = await this.orderRepo.findOne({ where: { id: txn.orderId || '' } });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng với giao dịch.');
    }

    return this.processPaymentWebhook({
      gatewayTxnId: txn.gatewayTxnId,
      amount: dto?.amount ?? txn.amount,
      orderCode: order.code,
      orderId: order.id,
      transferMessage: `SUQ${order.code}`,
    });
  }

  /**
   * Lấy lịch sử / trạng thái thanh toán của đơn hàng
   */
  async getPaymentByOrderId(customerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    const transactions = await this.paymentTxnRepo.find({
      where: { orderId },
      order: { createdAt: 'DESC' },
    });

    let pickupToken: string | null = null;
    let backupCode: string | null = null;

    if (order.status === OrderStatus.PAID) {
      const tokenRecord = await this.pickupTokenRepo.findOne({
        where: { orderId, status: PickupTokenStatus.UNUSED },
        order: { createdAt: 'DESC' },
      });

      if (tokenRecord) {
        backupCode = tokenRecord.backupCode;
        pickupToken = QrTokenEngine.sign(
          {
            jti: tokenRecord.id,
            orderId: order.id,
            storeId: order.storeId,
            exp: new Date(tokenRecord.expiresAt).getTime(),
          },
          this.jwtSecret,
        );
      }
    }

    return {
      orderId: order.id,
      orderCode: order.code,
      orderStatus: order.status,
      transactions,
      pickupToken,
      backupCode,
    };
  }
}
