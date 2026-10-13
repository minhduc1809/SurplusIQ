import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobsService } from './jobs.service';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OfferEventEntity, OfferEventType } from '../../entities/catalog/offer-event.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { AuditLogService } from '../audit/audit-log.service';

describe('JobsService', () => {
  let service: JobsService;
  let orderRepo: jest.Mocked<Repository<OrderEntity>>;
  let offerRepo: jest.Mocked<Repository<OfferEntity>>;
  let offerEventRepo: jest.Mocked<Repository<OfferEventEntity>>;
  let noshowRecordRepo: jest.Mocked<Repository<NoshowRecordEntity>>;
  let orderLockRepo: jest.Mocked<Repository<OrderLockEntity>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockCustomerId = 'cust-111-uuid';
  const mockStoreId = 'store-222-uuid';
  const mockOrderId = 'order-333-uuid';
  const mockOfferId = 'offer-444-uuid';

  beforeEach(async () => {
    orderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    offerRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    offerEventRepo = {
      create: jest.fn((dto) => ({ id: 'event-uuid', ...dto }) as any),
      save: jest.fn(),
    } as any;

    noshowRecordRepo = {
      create: jest.fn((dto) => ({ id: 'noshow-uuid', ...dto }) as any),
      save: jest.fn(),
      count: jest.fn(),
    } as any;

    orderLockRepo = {
      create: jest.fn((dto) => ({ ...dto }) as any),
      save: jest.fn(),
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
        JobsService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: offerRepo,
        },
        {
          provide: getRepositoryToken(OfferEventEntity),
          useValue: offerEventRepo,
        },
        {
          provide: getRepositoryToken(NoshowRecordEntity),
          useValue: noshowRecordRepo,
        },
        {
          provide: getRepositoryToken(OrderLockEntity),
          useValue: orderLockRepo,
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

    service = module.get<JobsService>(JobsService);
  });

  describe('releaseExpiredHolds (R1-042, BR-017)', () => {
    it('tự động nhả suất khi quá 10 phút, đổi HOLD_EXPIRED và cộng hoàn tồn kho', async () => {
      const now = new Date('2026-10-13T12:00:00Z');
      const expiredHoldOrder = {
        id: mockOrderId,
        status: OrderStatus.PENDING_PAYMENT,
        offerId: mockOfferId,
        quantity: 3,
        holdExpiresAt: new Date('2026-10-13T11:55:00Z'), // 5 minutes past hold limit
        storeId: mockStoreId,
      } as OrderEntity;

      orderRepo.find.mockResolvedValueOnce([expiredHoldOrder]);

      const mockOffer = {
        id: mockOfferId,
        remainingQuantity: 0,
        status: OfferStatus.SOLD_OUT,
        pickupEnd: new Date('2026-10-13T18:00:00Z'),
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockImplementation((entityCls) => {
          if (entityCls === OrderEntity) {
            return {
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue({ ...expiredHoldOrder }),
            };
          }
          if (entityCls === OfferEntity) {
            return {
              setLock: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockOffer),
            };
          }
          return {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn(),
          };
        }),
        save: jest.fn((entity) => Promise.resolve(entity)),
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      const result = await service.releaseExpiredHolds(now);

      expect(result.count).toBe(1);
      expect(result.orderIds).toContain(mockOrderId);
      expect(mockOffer.remainingQuantity).toBe(3);
      expect(mockOffer.status).toBe(OfferStatus.OPEN);
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockOrderId,
          status: OrderStatus.HOLD_EXPIRED,
          cancelledBy: CancelledBy.SYSTEM,
        }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ORDER_HOLD_RELEASED' }),
      );
    });

    it('không nhả suất các đơn còn trong hạn 10 phút', async () => {
      const now = new Date('2026-10-13T12:00:00Z');
      const validOrder = {
        id: 'valid-order',
        status: OrderStatus.PENDING_PAYMENT,
        holdExpiresAt: new Date('2026-10-13T12:05:00Z'), // Still 5 mins remaining
      } as OrderEntity;

      orderRepo.find.mockResolvedValueOnce([validOrder]);

      const result = await service.releaseExpiredHolds(now);

      expect(result.count).toBe(0);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('expireUnclaimedPickups (R1-059, BR-020, BR-024)', () => {
    it('đánh dấu PICKUP_EXPIRED khi quá hạn nhận + 15 phút trễ, ghi nhận noshow', async () => {
      const now = new Date('2026-10-13T13:20:00Z');
      const unclaimedOrder = {
        id: mockOrderId,
        status: OrderStatus.PAID,
        customerId: mockCustomerId,
        storeId: mockStoreId,
        offerId: mockOfferId,
      } as OrderEntity;

      orderRepo.find.mockResolvedValueOnce([unclaimedOrder]);
      offerRepo.findOne.mockResolvedValueOnce({
        id: mockOfferId,
        pickupEnd: new Date('2026-10-13T13:00:00Z'), // 13:00 + 15m = 13:15 < 13:20
      } as OfferEntity);

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...unclaimedOrder }),
        }),
        create: jest.fn((cls, dto) => ({ id: 'mock-id', ...dto })),
        save: jest.fn((entity) => Promise.resolve(entity)),
        count: jest.fn().mockResolvedValue(1), // Mới 1 lần noshow (< 3 lần)
        findOne: jest.fn().mockResolvedValue(null),
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      const result = await service.expireUnclaimedPickups(now);

      expect(result.count).toBe(1);
      expect(result.lockedCustomersCount).toBe(0); // Chưa bị khóa vì mới 1 lần
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockOrderId,
          status: OrderStatus.PICKUP_EXPIRED,
        }),
      );
      expect(mockManager.create).toHaveBeenCalledWith(
        NoshowRecordEntity,
        expect.objectContaining({
          customerId: mockCustomerId,
          orderId: mockOrderId,
          excluded: false,
        }),
      );
    });

    it('tự động khóa quyền đặt 7 ngày khi khách đạt đủ 3 lần noshow trong 30 ngày (BR-020)', async () => {
      const now = new Date('2026-10-13T13:20:00Z');
      const unclaimedOrder = {
        id: mockOrderId,
        status: OrderStatus.PAID,
        customerId: mockCustomerId,
        storeId: mockStoreId,
        offerId: mockOfferId,
      } as OrderEntity;

      orderRepo.find.mockResolvedValueOnce([unclaimedOrder]);
      offerRepo.findOne.mockResolvedValueOnce({
        id: mockOfferId,
        pickupEnd: new Date('2026-10-13T13:00:00Z'),
      } as OfferEntity);

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...unclaimedOrder }),
        }),
        create: jest.fn((cls, dto) => ({ id: 'mock-id', ...dto })),
        save: jest.fn((entity) => Promise.resolve(entity)),
        count: jest.fn().mockResolvedValue(3), // Đã đủ 3 lần noshow trong 30 ngày
        findOne: jest.fn().mockResolvedValue(null), // Chưa có orderLock trước đó
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      const result = await service.expireUnclaimedPickups(now);

      expect(result.count).toBe(1);
      expect(result.lockedCustomersCount).toBe(1); // Đã khóa khách
      expect(mockManager.create).toHaveBeenCalledWith(
        OrderLockEntity,
        expect.objectContaining({
          customerId: mockCustomerId,
        }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CUSTOMER_ORDER_LOCKED_NOSHOW' }),
      );
    });
  });

  describe('autoCloseExpiredOffers (R2-034, BR-058)', () => {
    it('tự động chuyển trạng thái CLOSED khi suất hết khung nhận và chốt hao hụt', async () => {
      const now = new Date('2026-10-13T20:00:00Z');
      const expiredOffer = {
        id: mockOfferId,
        storeId: mockStoreId,
        status: OfferStatus.OPEN,
        remainingQuantity: 5,
        pickupEnd: new Date('2026-10-13T19:59:00Z'),
      } as OfferEntity;

      offerRepo.find.mockResolvedValueOnce([expiredOffer]);

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ ...expiredOffer }),
        }),
        create: jest.fn((cls, dto) => ({ id: 'event-id', ...dto })),
        save: jest.fn((entity) => Promise.resolve(entity)),
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      const result = await service.autoCloseExpiredOffers(now);

      expect(result.count).toBe(1);
      expect(result.offerIds).toContain(mockOfferId);
      expect(mockManager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OfferStatus.CLOSED,
        }),
      );
      expect(mockManager.create).toHaveBeenCalledWith(
        OfferEventEntity,
        expect.objectContaining({
          type: OfferEventType.AUTO_CLOSED,
          payload: expect.objectContaining({ wasteQuantity: 5 }),
        }),
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'OFFER_AUTO_CLOSED' }),
      );
    });
  });

  describe('processAllBackgroundJobs', () => {
    it('chạy tuần tự toàn bộ các tác vụ nền và trả về summary đầy đủ', async () => {
      orderRepo.find.mockResolvedValue([]);
      offerRepo.find.mockResolvedValue([]);

      const summary = await service.processAllBackgroundJobs();

      expect(summary.holdsReleased.count).toBe(0);
      expect(summary.pickupsExpired.count).toBe(0);
      expect(summary.offersClosed.count).toBe(0);
      expect(summary.timestamp).toBeInstanceOf(Date);
    });
  });
});
