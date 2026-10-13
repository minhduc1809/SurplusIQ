import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus, OfferKind } from '../../entities/catalog/offer.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateOrderDto, CancelOrderDto, QueryOrdersDto } from './dto';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockCustomerId = 'cust-uuid-101';
  const mockStoreId = 'store-uuid-202';
  const mockOfferId = 'offer-uuid-303';
  const mockOrderId = 'order-uuid-404';

  const mockOffer: OfferEntity = {
    id: mockOfferId,
    storeId: mockStoreId,
    itemId: 'item-1',
    kind: OfferKind.REGULAR,
    totalQuantity: 10,
    remainingQuantity: 5,
    soldQuantity: 5,
    originalPrice: 40000,
    currentPrice: 20000,
    floorPrice: 16000,
    pickupStart: new Date(),
    pickupEnd: new Date(Date.now() + 2 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    status: OfferStatus.OPEN,
    priceChangeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrder: OrderEntity = {
    id: mockOrderId,
    code: 'SQ261013A1B2',
    customerId: mockCustomerId,
    storeId: mockStoreId,
    offerId: mockOfferId,
    quantity: 2,
    unitPrice: 20000,
    promotionId: null,
    discountAmount: 0,
    totalAmount: 40000,
    status: OrderStatus.PENDING_PAYMENT,
    holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    pickupSlot: null,
    note: null,
    arrivingNotifiedAt: null,
    paidAt: null,
    pickedUpAt: null,
    pickedUpBy: null,
    cancelledAt: null,
    cancelReason: null,
    cancelledBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockQueryBuilder = (
    result: unknown = null,
    countResult: [unknown[], number] = [[mockOrder], 1],
  ) => ({
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
    getMany: jest.fn().mockResolvedValue(countResult[0]),
    getManyAndCount: jest.fn().mockResolvedValue(countResult),
  });

  const mockOrderRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOfferRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOrderLockRepo = {
    findOne: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  };

  let mockTransactionManager: any;
  const mockDataSource = {
    transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockTransactionManager);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockTransactionManager = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: mockOrderRepo,
        },
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: mockOfferRepo,
        },
        {
          provide: getRepositoryToken(OrderLockEntity),
          useValue: mockOrderLockRepo,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('holdOrder (R1-040, BR-017, BR-019, BR-020)', () => {
    const validDto: CreateOrderDto = {
      offerId: mockOfferId,
      quantity: 2,
    };

    it('phải giữ suất 10 phút, trừ tồn nguyên tử và khóa giá chốt thành công', async () => {
      mockOrderLockRepo.findOne.mockResolvedValue(null); // Không bị khóa

      const offerQb = createMockQueryBuilder({ ...mockOffer, remainingQuantity: 5 });
      mockTransactionManager.createQueryBuilder.mockReturnValue(offerQb);
      mockTransactionManager.create.mockImplementation((entityClass: any, dto: any) => ({
        ...dto,
        id: 'new-order-id',
      }));
      mockTransactionManager.save.mockImplementation(async (entity: any) => entity);

      const result = await service.holdOrder(mockCustomerId, validDto);

      expect(result.id).toBe('new-order-id');
      expect(result.quantity).toBe(2);
      expect(result.unitPrice).toBe(20000);
      expect(result.totalAmount).toBe(40000);
      expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
      expect(offerQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORDER_HELD',
          targetType: 'ORDER',
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu khách hàng đang bị khóa do phạt noshow (BR-020)', async () => {
      mockOrderLockRepo.findOne.mockResolvedValue({
        customerId: mockCustomerId,
        lockedUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Khóa 5 ngày nữa
      });

      await expect(service.holdOrder(mockCustomerId, validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi BadRequestException nếu số lượng vượt quá 5 suất/đơn (BR-019)', async () => {
      mockOrderLockRepo.findOne.mockResolvedValue(null);
      const invalidDto: CreateOrderDto = {
        offerId: mockOfferId,
        quantity: 6, // > 5
      };

      await expect(service.holdOrder(mockCustomerId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi BadRequestException nếu suất không còn đủ số lượng tồn', async () => {
      mockOrderLockRepo.findOne.mockResolvedValue(null);
      const offerQb = createMockQueryBuilder({ ...mockOffer, remainingQuantity: 1 }); // Chỉ còn 1 < 2
      mockTransactionManager.createQueryBuilder.mockReturnValue(offerQb);

      await expect(service.holdOrder(mockCustomerId, validDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelHoldByCustomer (R1-043)', () => {
    it('phải hủy giữ suất và trả lại số lượng tồn kho cho suất bán', async () => {
      const orderQb = createMockQueryBuilder({ ...mockOrder, status: OrderStatus.PENDING_PAYMENT });
      const offerQb = createMockQueryBuilder({
        ...mockOffer,
        remainingQuantity: 3,
        status: OfferStatus.OPEN,
      });

      mockTransactionManager.createQueryBuilder
        .mockReturnValueOnce(orderQb)
        .mockReturnValueOnce(offerQb);
      mockTransactionManager.save.mockImplementation(async (e: any) => e);

      const result = await service.cancelHoldByCustomer(mockCustomerId, mockOrderId);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.cancelledBy).toBe(CancelledBy.CUSTOMER);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORDER_HOLD_CANCELLED',
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu đơn không ở trạng thái PENDING_PAYMENT', async () => {
      const orderQb = createMockQueryBuilder({ ...mockOrder, status: OrderStatus.PAID });
      mockTransactionManager.createQueryBuilder.mockReturnValue(orderQb);

      await expect(service.cancelHoldByCustomer(mockCustomerId, mockOrderId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('releaseExpiredHolds (R1-044, BR-017)', () => {
    it('phải tự động nhả suất cho các đơn quá hạn 10 phút và trả tồn kho', async () => {
      const expiredOrder = {
        ...mockOrder,
        id: 'exp-order-1',
        holdExpiresAt: new Date(Date.now() - 5000), // Đã hết hạn
        status: OrderStatus.PENDING_PAYMENT,
      };
      mockOrderRepo.find.mockResolvedValue([expiredOrder]);

      const lockedOrderQb = createMockQueryBuilder({ ...expiredOrder });
      const offerQb = createMockQueryBuilder({
        ...mockOffer,
        remainingQuantity: 0,
        status: OfferStatus.SOLD_OUT,
      });

      mockTransactionManager.createQueryBuilder
        .mockReturnValueOnce(lockedOrderQb)
        .mockReturnValueOnce(offerQb);
      mockTransactionManager.save.mockResolvedValue({});

      const count = await service.releaseExpiredHolds();

      expect(count).toBe(1);
    });
  });

  describe('getCustomerOrders & getCustomerActiveOrders (R1-048, R1-055)', () => {
    it('phải trả về danh sách phân trang lịch sử đơn của khách', async () => {
      const qb = createMockQueryBuilder(null, [[mockOrder], 1]);
      mockOrderRepo.createQueryBuilder.mockReturnValue(qb);

      const query: QueryOrdersDto = { page: 1, limit: 10 };
      const result = await service.getCustomerOrders(mockCustomerId, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('phải trả về các đơn đang hoạt động của khách', async () => {
      mockOrderRepo.find.mockResolvedValue([mockOrder]);

      const result = await service.getCustomerActiveOrders(mockCustomerId);

      expect(result).toHaveLength(1);
      expect(mockOrderRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            customerId: mockCustomerId,
            status: expect.anything(),
          },
        }),
      );
    });
  });

  describe('notifyCustomerArriving', () => {
    it('phải cập nhật thời gian arrivingNotifiedAt khi đơn đã thanh toán', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.PAID });
      mockOrderRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.notifyCustomerArriving(mockCustomerId, mockOrderId);

      expect(result.arrivingNotifiedAt).toBeDefined();
    });

    it('phải ném lỗi BadRequestException nếu đơn chưa thanh toán', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING_PAYMENT,
      });

      await expect(service.notifyCustomerArriving(mockCustomerId, mockOrderId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelOrderByStore (R2-053)', () => {
    it('phải cho phép cửa hàng hủy đơn và chuyển trạng thái hoàn tiền', async () => {
      const orderQb = createMockQueryBuilder({ ...mockOrder, status: OrderStatus.PAID });
      mockTransactionManager.createQueryBuilder.mockReturnValue(orderQb);
      mockTransactionManager.save.mockImplementation(async (e: any) => e);

      const dto: CancelOrderDto = { reason: 'Quán bị hỏng tủ mát' };
      const result = await service.cancelOrderByStore(mockStoreId, mockOrderId, dto, 'owner-1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(result.cancelledBy).toBe(CancelledBy.STORE);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORDER_CANCELLED_BY_STORE',
        }),
      );
    });
  });
});
