import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { ProxyPickupCodeEntity } from '../../entities/orders/proxy-pickup-code.entity';
import { PickupTokenEntity } from '../../entities/orders/pickup-token.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { AuditLogService } from '../audit/audit-log.service';

/**
 * Concurrency Race Condition & Anti-Overselling Verification (TEST-CONCURRENCY-01)
 * Căn cứ: BRD 5.3 (R1-040), BR-017, BR-019, BR-020, Kế hoạch kiểm thử tải 05_KIEM_THU_VA_BENCHMARK.md mục 2.
 */
describe('Concurrency Race Condition: Anti-Overselling Verification', () => {
  let service: OrdersService;
  let orderRepo: jest.Mocked<Repository<OrderEntity>>;
  let offerRepo: jest.Mocked<Repository<OfferEntity>>;
  let orderLockRepo: jest.Mocked<Repository<OrderLockEntity>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockStoreId = 'store-concurrency-uuid';
  const mockOfferId = 'offer-hot-deal-uuid';

  beforeEach(async () => {
    orderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: `order-${Math.random()}`, ...dto }) as any),
      save: jest.fn((order) => Promise.resolve(order as any)),
    } as any;

    offerRepo = {
      findOne: jest.fn(),
      save: jest.fn((offer) => Promise.resolve(offer as any)),
    } as any;

    orderLockRepo = {
      findOne: jest.fn().mockResolvedValue(null), // Khách không bị khóa đặt
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
        OrdersService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: offerRepo,
        },
        {
          provide: getRepositoryToken(OrderLockEntity),
          useValue: orderLockRepo,
        },
        {
          provide: getRepositoryToken(ProxyPickupCodeEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PickupTokenEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PaymentTransactionEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(StoreEntity),
          useValue: {},
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

    service = module.get<OrdersService>(OrdersService);
  });

  it('100 request gửi đồng thời tranh 1 suất tồn: đúng 1 đơn thành công, 99 đơn bị từ chối 400, tồn kho về 0 không âm', async () => {
    // 1. Trạng thái ban đầu: 1 suất bánh duy nhất (remainingQuantity = 1)
    const initialOffer: Partial<OfferEntity> = {
      id: mockOfferId,
      storeId: mockStoreId,
      itemId: 'item-uuid',
      currentPrice: 35000,
      originalPrice: 70000,
      floorPrice: 28000,
      totalQuantity: 10,
      remainingQuantity: 1, // Điểm nóng: Chỉ còn đúng 1 suất
      status: OfferStatus.OPEN,
      priceChangeCount: 0,
      pickupStart: new Date(),
      pickupEnd: new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mô phỏng hàng đợi hàng rào khóa bi quan FOR UPDATE (pessimistic_write) của PostgreSQL
    let currentOfferState = { ...initialOffer };
    const createdOrders: OrderEntity[] = [];
    let lockQueue: Promise<void> = Promise.resolve();

    dataSource.transaction.mockImplementation((callback: any) => {
      const executeTransaction = async () => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockImplementation(async () => {
              // Trả về bản sao trạng thái hiện tại dưới khóa FOR UPDATE
              return { ...currentOfferState };
            }),
          }),
          create: jest.fn((entityClass, dto) => {
            const newEntity = {
              id: `order-txn-${Math.random().toString(36).substring(2, 9)}`,
              ...dto,
            };
            return newEntity;
          }),
          save: jest.fn(async (entity: any) => {
            if (entity.id === mockOfferId) {
              currentOfferState = { ...entity };
              return currentOfferState;
            }
            if (entity.status === OrderStatus.PENDING_PAYMENT) {
              createdOrders.push(entity);
              return entity;
            }
            return entity;
          }),
        };

        return callback(mockManager);
      };

      // Đảm bảo các giao dịch chạy tuần tự theo cơ chế khóa hàng nguyên tử của PostgreSQL
      const resultPromise = lockQueue.then(executeTransaction);
      lockQueue = resultPromise.then(
        () => {},
        () => {},
      );
      return resultPromise;
    });

    // 2. Tạo 100 khách hàng ảo gửi đồng thời 100 yêu cầu giữ suất trong cùng một thời điểm
    const buyerCount = 100;
    const buyerIds = Array.from({ length: buyerCount }, (_, i) => `customer-virtual-${i + 1}`);

    const requests = buyerIds.map((buyerId) =>
      service
        .holdOrder(buyerId, {
          offerId: mockOfferId,
          quantity: 1,
        })
        .then((order) => ({ status: 201, order, buyerId }))
        .catch((error) => ({
          status: error instanceof BadRequestException ? 400 : 500,
          error: error.message,
          buyerId,
        })),
    );

    // Kích hoạt toàn bộ 100 request song song
    const responses = await Promise.all(requests);

    const successes = responses.filter((res) => res.status === 201);
    const rejections = responses.filter((res) => res.status === 400);

    // 3. Tiêu chí nghiệm thu bắt buộc (Pass Criteria theo 05_KIEM_THU_VA_BENCHMARK.md):
    // - Đúng 1 request thành công
    expect(successes).toHaveLength(1);
    // - Đúng 99 request bị từ chối 400 Bad Request
    expect(rejections).toHaveLength(99);

    // - Tồn kho sau cuộc đua phải chính xác bằng 0 (Tuyệt đối không bị âm -1, -2 per BR-017)
    expect(currentOfferState.remainingQuantity).toBe(0);
    // - Trạng thái suất tự động chuyển SOLD_OUT
    expect(currentOfferState.status).toBe(OfferStatus.SOLD_OUT);

    // - Số lượng đơn hàng thực tế tạo ra chỉ đúng 1 đơn duy nhất
    expect(createdOrders).toHaveLength(1);
    expect(createdOrders[0].status).toBe(OrderStatus.PENDING_PAYMENT);
    expect(createdOrders[0].quantity).toBe(1);
    expect(createdOrders[0].totalAmount).toBe(35000);

    // - Các đơn bị từ chối nhận thông báo hết suất hợp lệ
    const rejectionMessages = rejections.map((r: any) => r.error);
    expect(
      rejectionMessages.every(
        (msg) =>
          msg.includes('đã hết suất') ||
          msg.includes('không còn đủ số lượng yêu cầu') ||
          msg.includes('không mở để đặt hàng'),
      ),
    ).toBe(true);
  });

  it('50 request tranh chấp khi tồn kho là 3 suất: đúng 3 đơn thành công, 47 đơn bị từ chối, tồn kho chốt bằng 0', async () => {
    const initialOffer: Partial<OfferEntity> = {
      id: mockOfferId,
      storeId: mockStoreId,
      itemId: 'item-uuid',
      currentPrice: 40000,
      originalPrice: 80000,
      floorPrice: 32000,
      totalQuantity: 10,
      remainingQuantity: 3, // Có 3 suất
      status: OfferStatus.OPEN,
      priceChangeCount: 0,
      pickupStart: new Date(),
      pickupEnd: new Date(Date.now() + 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let currentOfferState = { ...initialOffer };
    const createdOrders: OrderEntity[] = [];
    let lockQueue: Promise<void> = Promise.resolve();

    dataSource.transaction.mockImplementation((callback: any) => {
      const executeTransaction = async () => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockImplementation(async () => ({ ...currentOfferState })),
          }),
          create: jest.fn((entityClass, dto) => ({
            id: `order-txn-${Math.random().toString(36).substring(2, 9)}`,
            ...dto,
          })),
          save: jest.fn(async (entity: any) => {
            if (entity.id === mockOfferId) {
              currentOfferState = { ...entity };
              return currentOfferState;
            }
            if (entity.status === OrderStatus.PENDING_PAYMENT) {
              createdOrders.push(entity);
              return entity;
            }
            return entity;
          }),
        };

        return callback(mockManager);
      };

      const resultPromise = lockQueue.then(executeTransaction);
      lockQueue = resultPromise.then(
        () => {},
        () => {},
      );
      return resultPromise;
    });

    const buyerCount = 50;
    const buyerIds = Array.from(
      { length: buyerCount },
      (_, i) => `customer-virtual-batch2-${i + 1}`,
    );

    const requests = buyerIds.map((buyerId) =>
      service
        .holdOrder(buyerId, {
          offerId: mockOfferId,
          quantity: 1,
        })
        .then((order) => ({ status: 201, order, buyerId }))
        .catch((error) => ({
          status: error instanceof BadRequestException ? 400 : 500,
          error: error.message,
          buyerId,
        })),
    );

    const responses = await Promise.all(requests);

    const successes = responses.filter((res) => res.status === 201);
    const rejections = responses.filter((res) => res.status === 400);

    expect(successes).toHaveLength(3);
    expect(rejections).toHaveLength(47);
    expect(currentOfferState.remainingQuantity).toBe(0);
    expect(currentOfferState.status).toBe(OfferStatus.SOLD_OUT);
    expect(createdOrders).toHaveLength(3);
  });
});
