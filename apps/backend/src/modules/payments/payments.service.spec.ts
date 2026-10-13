import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  PaymentTransactionEntity,
  PaymentKind,
  PaymentStatus,
} from '../../entities/orders/payment-transaction.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { PickupTokenEntity } from '../../entities/orders/pickup-token.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { AuditLogService } from '../audit/audit-log.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentTxnRepo: jest.Mocked<Repository<PaymentTransactionEntity>>;
  let orderRepo: jest.Mocked<Repository<OrderEntity>>;
  let pickupTokenRepo: jest.Mocked<Repository<PickupTokenEntity>>;
  let offerRepo: jest.Mocked<Repository<OfferEntity>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockCustomerId = 'cust-111-uuid';
  const mockStoreId = 'store-222-uuid';
  const mockOrderId = 'order-333-uuid';
  const mockOfferId = 'offer-444-uuid';

  const baseOrder: Partial<OrderEntity> = {
    id: mockOrderId,
    code: 'SQ261013A1B2',
    customerId: mockCustomerId,
    storeId: mockStoreId,
    offerId: mockOfferId,
    quantity: 2,
    unitPrice: 30000,
    totalAmount: 60000,
    status: OrderStatus.PENDING_PAYMENT,
    holdExpiresAt: new Date(Date.now() + 8 * 60 * 1000), // 8 mins remaining
    pickupSlot: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    paymentTxnRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'txn-uuid', ...dto }) as any),
      save: jest.fn((entity) => Promise.resolve({ id: 'txn-uuid', ...entity } as any)),
    } as any;

    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn((order) => Promise.resolve(order as any)),
    } as any;

    pickupTokenRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'token-uuid', ...dto }) as any),
      save: jest.fn((entity) => Promise.resolve({ id: 'token-uuid', ...entity } as any)),
    } as any;

    offerRepo = {
      findOne: jest.fn(),
    } as any;

    auditLogService = {
      log: jest.fn().mockResolvedValue({} as any),
      getStoreAuditLogs: jest.fn(),
    } as any;

    dataSource = {
      transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(PaymentTransactionEntity),
          useValue: paymentTxnRepo,
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(PickupTokenEntity),
          useValue: pickupTokenRepo,
        },
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: offerRepo,
        },
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createPayment (R1-041, BR-016)', () => {
    it('khởi tạo thành công giao dịch VietQR khi đơn hợp lệ và còn trong thời gian giữ 10 phút', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);
      paymentTxnRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.createPayment(mockCustomerId, mockOrderId);

      expect(result.orderId).toBe(mockOrderId);
      expect(result.orderCode).toBe('SQ261013A1B2');
      expect(result.amount).toBe(60000);
      expect(result.transferSyntax).toBe('SUQSQ261013A1B2');
      expect(result.bankAccount).toBe('1900888999');
      expect(result.qrUrl).toContain('img.vietqr.io');
      expect(result.qrUrl).toContain('SUQSQ261013A1B2');
      expect(paymentTxnRepo.save).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PAYMENT_INITIATED' }),
      );
    });

    it('tái sử dụng giao dịch PENDING_CONFIRM nếu đã tạo trước đó (Idempotency)', async () => {
      const existingTxn = {
        id: 'existing-txn-id',
        gatewayTxnId: 'TXN_EXISTING_123',
        amount: 60000,
        status: PaymentStatus.PENDING_CONFIRM,
      } as PaymentTransactionEntity;

      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);
      paymentTxnRepo.findOne.mockResolvedValueOnce(existingTxn);

      const result = await service.createPayment(mockCustomerId, mockOrderId);

      expect(result.transactionId).toBe('existing-txn-id');
      expect(result.gatewayTxnId).toBe('TXN_EXISTING_123');
      expect(paymentTxnRepo.save).not.toHaveBeenCalled();
    });

    it('báo lỗi NotFoundException nếu đơn hàng không tồn tại hoặc không thuộc khách hàng', async () => {
      orderRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.createPayment(mockCustomerId, 'unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('báo lỗi BadRequestException nếu đơn không ở trạng thái PENDING_PAYMENT', async () => {
      orderRepo.findOne.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.PAID,
      } as OrderEntity);

      await expect(service.createPayment(mockCustomerId, mockOrderId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('báo lỗi BadRequestException nếu đơn đã quá hạn giữ suất 10 phút (BR-017)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({
        ...baseOrder,
        holdExpiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      } as OrderEntity);

      await expect(service.createPayment(mockCustomerId, mockOrderId)).rejects.toThrow(
        /hết thời gian giữ suất 10 phút/,
      );
    });
  });

  describe('processPaymentWebhook (R1-041, R1-047, BR-015, BR-016, VC-10)', () => {
    it('trả về kết quả idempotent nếu gatewayTxnId đã hoàn thành trước đó (BR-015, VC-10)', async () => {
      const succeededTxn = {
        id: 'txn-succeeded',
        gatewayTxnId: 'MB_FT12345',
        orderId: mockOrderId,
        amount: 60000,
        status: PaymentStatus.SUCCEEDED,
      } as PaymentTransactionEntity;

      paymentTxnRepo.findOne.mockResolvedValueOnce(succeededTxn);
      orderRepo.findOne.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.PAID,
      } as OrderEntity);

      const result = await service.processPaymentWebhook({
        gatewayTxnId: 'MB_FT12345',
        amount: 60000,
      });

      expect(result.success).toBe(true);
      expect(result.idempotent).toBe(true);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('xác nhận thanh toán thành công đúng hạn: chuyển PAID, sinh QR HMAC và mã PIN 6 số (R1-041, BR-022)', async () => {
      paymentTxnRepo.findOne.mockResolvedValueOnce(null);
      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...baseOrder }),
        }),
        findOne: jest.fn().mockImplementation((entityClass) => {
          if (entityClass === OfferEntity) {
            return Promise.resolve({
              id: mockOfferId,
              pickupEnd: new Date(Date.now() + 10 * 3600 * 1000),
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn((cls, dto) => ({ id: 'mock-id', ...dto })),
        save: jest.fn((entity) => Promise.resolve(entity)),
      };

      dataSource.transaction.mockImplementationOnce((callback: any) => callback(mockManager));

      const result = await service.processPaymentWebhook({
        gatewayTxnId: 'MB_NEW_TXN_999',
        amount: 60000,
        orderCode: 'SQ261013A1B2',
      });

      expect(result.success).toBe(true);
      expect(result.orderStatus).toBe(OrderStatus.PAID);
      expect(result.pickupToken).toBeDefined();
      expect(result.backupCode).toBeDefined();
      expect(result.backupCode).toHaveLength(6);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ORDER_PAYMENT_CONFIRMED' }),
      );
    });

    it('báo lỗi và đánh dấu MANUAL_REVIEW khi số tiền nhận không khớp đơn giá chốt (BR-016)', async () => {
      paymentTxnRepo.findOne.mockResolvedValueOnce(null);
      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...baseOrder }),
        }),
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((cls, dto) => ({ id: 'txn-id', ...dto })),
        save: jest.fn((entity) => Promise.resolve(entity)),
      };

      dataSource.transaction.mockImplementationOnce((callback: any) => callback(mockManager));

      await expect(
        service.processPaymentWebhook({
          gatewayTxnId: 'MB_WRONG_AMOUNT',
          amount: 50000, // Sai số tiền: 50k thay vì 60k
          orderCode: 'SQ261013A1B2',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.MANUAL_REVIEW }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PAYMENT_AMOUNT_MISMATCH' }),
      );
    });

    it('tự động hoàn tiền 100% khi thanh toán đến muộn sau khi đã hết hạn giữ suất (R1-047, TEST-ORDER-04)', async () => {
      paymentTxnRepo.findOne.mockResolvedValueOnce(null);
      // Đơn hàng đã hết hạn giữ
      const expiredOrder = {
        ...baseOrder,
        status: OrderStatus.HOLD_EXPIRED,
        holdExpiresAt: new Date(Date.now() - 10000),
      };
      orderRepo.findOne.mockResolvedValueOnce(expiredOrder as OrderEntity);

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(expiredOrder),
        }),
        findOne: jest.fn().mockResolvedValue(null), // Chưa có refund trước đó
        create: jest.fn((cls, dto) => ({ id: 'refund-uuid', ...dto })),
        save: jest.fn((entity) => Promise.resolve(entity)),
      };

      dataSource.transaction.mockImplementationOnce((callback: any) => callback(mockManager));

      const result = await service.processPaymentWebhook({
        gatewayTxnId: 'MB_LATE_PAYMENT_1',
        amount: 60000,
        orderCode: 'SQ261013A1B2',
      });

      expect(result.success).toBe(true);
      expect(result.latePaymentRefunded).toBe(true);
      expect(result.orderStatus).toBe(OrderStatus.HOLD_EXPIRED);
      expect(result.refundTxnId).toBe('REFUND_MB_LATE_PAYMENT_1');
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: PaymentKind.ORDER_REFUND,
          amount: 60000,
          status: PaymentStatus.SUCCEEDED,
        }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ORDER_LATE_PAYMENT_REFUNDED' }),
      );
    });
  });

  describe('recheckPayment (R1-056, VC-07)', () => {
    it('chặn gọi lại quá nhanh nếu chưa đủ 60 giây (R1-056)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);
      paymentTxnRepo.findOne.mockResolvedValueOnce({
        id: 'txn-recheck',
        orderId: mockOrderId,
        status: PaymentStatus.PENDING_CONFIRM,
        lastCheckedAt: new Date(Date.now() - 20 * 1000), // Chỉ mới 20 giây trước
        createdAt: new Date(),
        retryCount: 1,
      } as PaymentTransactionEntity);

      await expect(service.recheckPayment(mockCustomerId, mockOrderId)).rejects.toThrow(
        /Mỗi đơn kiểm tra tối đa 1 lần\/phút/,
      );
    });

    it('cho phép kiểm tra lại sau 60 giây và tăng retryCount (R1-056)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);
      const mockTxn = {
        id: 'txn-recheck',
        orderId: mockOrderId,
        status: PaymentStatus.PENDING_CONFIRM,
        lastCheckedAt: new Date(Date.now() - 70 * 1000), // Đã 70 giây trước (> 60s)
        createdAt: new Date(),
        retryCount: 1,
      } as PaymentTransactionEntity;

      paymentTxnRepo.findOne.mockResolvedValueOnce(mockTxn);
      paymentTxnRepo.save.mockImplementationOnce((t) => Promise.resolve(t as any));

      const result = await service.recheckPayment(mockCustomerId, mockOrderId);

      expect(result.orderId).toBe(mockOrderId);
      expect(result.retryCount).toBe(2);
      expect(paymentTxnRepo.save).toHaveBeenCalled();
    });

    it('đánh dấu FAILED nếu giao dịch PENDING_CONFIRM quá 24 giờ (VC-07)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);
      const mockTxn = {
        id: 'txn-recheck',
        orderId: mockOrderId,
        status: PaymentStatus.PENDING_CONFIRM,
        lastCheckedAt: null,
        createdAt: new Date(Date.now() - 25 * 3600 * 1000), // Đã 25 giờ trước (> 24h)
        retryCount: 0,
      } as PaymentTransactionEntity;

      paymentTxnRepo.findOne.mockResolvedValueOnce(mockTxn);
      paymentTxnRepo.save.mockImplementationOnce((t) => Promise.resolve(t as any));

      const result = await service.recheckPayment(mockCustomerId, mockOrderId);

      expect(result.paymentStatus).toBe(PaymentStatus.FAILED);
      expect(paymentTxnRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      );
    });
  });
});
