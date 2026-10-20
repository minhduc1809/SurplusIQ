import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus, OfferKind } from '../../entities/catalog/offer.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { PromotionEntity } from '../../entities/marketing/promotion.entity';
import {
  ProxyPickupCodeEntity,
  ProxyPickupCodeStatus,
} from '../../entities/orders/proxy-pickup-code.entity';
import { PickupTokenEntity } from '../../entities/orders/pickup-token.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
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
    leftJoin: jest.fn().mockReturnThis(),
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

  const mockProxyCodeRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockPickupTokenRepo = {
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPaymentTxnRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockItemRepo = {
    findOne: jest.fn(),
  };

  const mockStoreRepo = {
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
      findOne: jest.fn().mockResolvedValue({ status: 'ACTIVE' }),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      exists: jest.fn(),
      decrement: jest.fn(),
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
          provide: getRepositoryToken(ProxyPickupCodeEntity),
          useValue: mockProxyCodeRepo,
        },
        {
          provide: getRepositoryToken(PickupTokenEntity),
          useValue: mockPickupTokenRepo,
        },
        {
          provide: getRepositoryToken(PaymentTransactionEntity),
          useValue: mockPaymentTxnRepo,
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: mockItemRepo,
        },
        {
          provide: getRepositoryToken(StoreEntity),
          useValue: mockStoreRepo,
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

    describe('ưu đãi (BR-019)', () => {
      const promo = (extra: object = {}) => ({
        id: 'promo-1',
        storeId: mockStoreId,
        status: 'ACTIVE',
        type: 'PERCENT',
        value: 50,
        target: 'ALL',
        maxUses: 10,
        usedCount: 0,
        minOrderAmount: 0,
        startAt: new Date(Date.now() - 1000),
        endAt: new Date(Date.now() + 3600 * 1000),
        ...extra,
      });
      const hold = (p: object) => {
        mockOrderLockRepo.findOne.mockResolvedValue(null);
        mockTransactionManager.createQueryBuilder.mockReturnValue(
          createMockQueryBuilder({ ...mockOffer, remainingQuantity: 5 }),
        );
        mockTransactionManager.findOne.mockImplementation(async (cls: any) =>
          cls === PromotionEntity ? p : { status: 'ACTIVE' },
        );
        mockTransactionManager.create.mockImplementation((_c: any, dto: any) => ({
          ...dto,
          id: 'o',
        }));
        mockTransactionManager.save.mockImplementation(async (e: any) => e);
        return service.holdOrder(mockCustomerId, { ...validDto, promotionId: 'promo-1' });
      };

      it('không cho ưu đãi đưa giá xuống dưới giá sàn', async () => {
        // 2 suất x 20.000 = 40.000, giá sàn 16.000/suất = 32.000 -> giảm tối đa 8.000 dù ưu đãi 50%
        const result = await hold(promo());
        expect(result.discountAmount).toBe(8000);
        expect(result.totalAmount).toBe(32000);
      });

      it('từ chối khi khách không thuộc nhóm của ưu đãi', async () => {
        mockTransactionManager.exists.mockResolvedValue(false);
        await expect(hold(promo({ target: 'FAVORITES' }))).rejects.toThrow('không dành cho');
      });

      it('cho dùng khi khách thuộc nhóm của ưu đãi', async () => {
        mockTransactionManager.exists.mockResolvedValue(true);
        const result = await hold(promo({ target: 'FAVORITES', type: 'FIXED', value: 4000 }));
        expect(result.discountAmount).toBe(4000);
      });
    });

    it('từ chối đơn mới khi Admin đã tạm ngưng cửa hàng, không trừ tồn kho', async () => {
      mockOrderLockRepo.findOne.mockResolvedValue(null);
      mockTransactionManager.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ ...mockOffer }),
      );
      mockTransactionManager.findOne.mockResolvedValue({ status: 'SUSPENDED' });
      await expect(service.holdOrder(mockCustomerId, validDto)).rejects.toThrow(
        'không nhận đơn mới',
      );
      expect(mockTransactionManager.save).not.toHaveBeenCalled();
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

    it('phải ném lỗi BadRequestException nếu đơn đã ở trạng thái hoàn tất (PICKED_UP)', async () => {
      const orderQb = createMockQueryBuilder({ ...mockOrder, status: OrderStatus.PICKED_UP });
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
      // Joined pagination resolves sort fields through entity metadata, not raw SQL names.
      expect(qb.orderBy).toHaveBeenCalledWith('order.createdAt', 'DESC');
    });

    it('phải lọc theo mã đơn hoặc tên cửa hàng khi có search (R1-045)', async () => {
      const qb = createMockQueryBuilder(null, [[mockOrder], 1]);
      mockOrderRepo.createQueryBuilder.mockReturnValue(qb);

      const query: QueryOrdersDto = { page: 1, limit: 10, search: 'ORD-001' };
      await service.getCustomerOrders(mockCustomerId, query);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(order.code ILIKE :search OR store.name ILIKE :search)',
        { search: '%ORD-001%' },
      );
    });

    it('phải giới hạn khoảng lọc ngày tối đa 12 tháng (R1-045)', async () => {
      const qb = createMockQueryBuilder(null, [[mockOrder], 1]);
      mockOrderRepo.createQueryBuilder.mockReturnValue(qb);

      const query: QueryOrdersDto = {
        page: 1,
        limit: 10,
        fromDate: '2020-01-01',
        toDate: '2026-01-01',
      };
      await service.getCustomerOrders(mockCustomerId, query);

      const [, params] = qb.andWhere.mock.calls.find(([sql]: [string]) =>
        sql.includes(':from AND'),
      );
      const rangeMs = params.to.getTime() - params.from.getTime();
      expect(rangeMs).toBeLessThanOrEqual(12 * 31 * 24 * 60 * 60 * 1000);
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

  it('uses the mapped creation date for the store order pagination', async () => {
    const qb = createMockQueryBuilder(null, [[mockOrder], 1]);
    mockOrderRepo.createQueryBuilder.mockReturnValue(qb);
    const result = await service.getStoreOrders(mockStoreId, { page: 2, limit: 10 });
    expect(result.total).toBe(1);
    expect(qb.orderBy).toHaveBeenCalledWith('order.createdAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(10);
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

    it('phải ném lỗi BadRequestException nếu đã báo "đang tới" trước đó (R1-060)', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
        arrivingNotifiedAt: new Date(),
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

  describe('Proxy Pickup Code (R1-052)', () => {
    it('phải tạo mã nhận hộ 6 ký tự thành công cho đơn đã thanh toán', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.PAID });
      mockOfferRepo.findOne.mockResolvedValue(mockOffer);
      mockProxyCodeRepo.update.mockResolvedValue({ affected: 0 });
      mockProxyCodeRepo.create.mockImplementation((dto: any) => ({
        id: 'proxy-1',
        ...dto,
      }));
      mockProxyCodeRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.createProxyPickupCode(mockCustomerId, mockOrderId);

      expect(result.code).toBeDefined();
      expect(result.code.length).toBe(8);
      expect(result.status).toBe(ProxyPickupCodeStatus.UNUSED);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PROXY_PICKUP_CODE_CREATED',
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu đơn chưa thanh toán', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING_PAYMENT,
      });

      await expect(service.createProxyPickupCode(mockCustomerId, mockOrderId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải thu hồi mã nhận hộ thành công', async () => {
      mockOrderRepo.findOne.mockResolvedValue({ ...mockOrder, status: OrderStatus.PAID });
      mockProxyCodeRepo.findOne.mockResolvedValue({
        id: 'proxy-1',
        orderId: mockOrderId,
        status: ProxyPickupCodeStatus.UNUSED,
      });
      mockProxyCodeRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.revokeProxyPickupCode(mockCustomerId, mockOrderId);

      expect(result.success).toBe(true);
    });
  });

  describe('updatePickupSlot (R1-049)', () => {
    it('phải cập nhật giờ hẹn nhận hàng thành công khi nằm trong khung giờ của quán', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 60 * 60 * 1000);
      const pickupEnd = new Date(now.getTime() + 180 * 60 * 1000);
      const targetSlot = new Date(now.getTime() + 90 * 60 * 1000);

      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
        pickupSlot: null,
      });
      mockOfferRepo.findOne.mockResolvedValue({
        ...mockOffer,
        pickupStart,
        pickupEnd,
      });
      mockOrderRepo.save.mockImplementation(async (e: any) => e);

      const result = await service.updatePickupSlot(
        mockCustomerId,
        mockOrderId,
        targetSlot.toISOString(),
      );

      expect(result.pickupSlot).toEqual(targetSlot);
    });

    it('phải ném lỗi nếu giờ hẹn nằm ngoài khung giờ nhận của quán', async () => {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 60 * 60 * 1000);
      const pickupEnd = new Date(now.getTime() + 180 * 60 * 1000);
      const targetSlot = new Date(now.getTime() + 300 * 60 * 1000); // Ngoài khung giờ

      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });
      mockOfferRepo.findOne.mockResolvedValue({
        ...mockOffer,
        pickupStart,
        pickupEnd,
      });

      await expect(
        service.updatePickupSlot(mockCustomerId, mockOrderId, targetSlot.toISOString()),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrderReceipt (R1-054)', () => {
    it('phải trả về hóa đơn điện tử đầy đủ', async () => {
      mockOrderRepo.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PICKED_UP,
        paidAt: new Date(),
        pickupSlot: new Date(),
      });
      mockOfferRepo.findOne.mockResolvedValue(mockOffer);
      mockItemRepo.findOne.mockResolvedValue({ id: 'item-1', name: 'Bánh Mì Pate' });
      mockStoreRepo.findOne.mockResolvedValue({
        id: mockStoreId,
        name: 'Tiệm Bánh Ngon',
        address: '123 Cầu Giấy, Hà Nội',
        phone: '0901234567',
      });

      const receipt = await service.getOrderReceipt(mockCustomerId, mockOrderId);

      expect(receipt.orderId).toBe(mockOrderId);
      expect(receipt.storeName).toBe('Tiệm Bánh Ngon');
      expect(receipt.itemName).toBe('Bánh Mì Pate');
      expect(receipt.totalAmount).toBe(40000);
    });
  });

  describe('reorderShortcut (R1-051)', () => {
    it('đặt lại nhanh từ đơn hàng cũ nếu món còn mở suất hôm nay', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce({
        id: 'old-order-1',
        customerId: mockCustomerId,
        offerId: 'old-offer-1',
      });
      mockOfferRepo.findOne
        .mockResolvedValueOnce({ id: 'old-offer-1', itemId: 'item-10' }) // oldOffer
        .mockResolvedValueOnce({
          id: 'new-offer-today',
          storeId: mockStoreId,
          itemId: 'item-10',
          status: OfferStatus.OPEN,
          remainingQuantity: 3,
          currentPrice: 22000,
          originalPrice: 45000,
          pickupStart: new Date(),
          pickupEnd: new Date(),
        }); // currentOffer

      const res = await service.reorderShortcut(mockCustomerId, 'old-order-1');
      expect(res.offerId).toBe('new-offer-today');
      expect(res.remainingQuantity).toBe(3);
    });

    it('báo lỗi nếu món cũ không còn suất mở hôm nay', async () => {
      mockOrderRepo.findOne.mockResolvedValueOnce({
        id: 'old-order-1',
        customerId: mockCustomerId,
        offerId: 'old-offer-1',
      });
      mockOfferRepo.findOne
        .mockResolvedValueOnce({ id: 'old-offer-1', itemId: 'item-10' })
        .mockResolvedValueOnce(null); // Không có suất mở

      await expect(service.reorderShortcut(mockCustomerId, 'old-order-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
