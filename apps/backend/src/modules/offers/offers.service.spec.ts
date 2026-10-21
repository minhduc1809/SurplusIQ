import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OfferEntity, OfferKind, OfferStatus } from '../../entities/catalog/offer.entity';
import { OfferEventEntity, OfferEventType } from '../../entities/catalog/offer-event.entity';
import {
  ItemEntity,
  ItemStatus,
  TrustpassInformationSource,
  TrustpassVerificationStatus,
  TrustpassReviewStatus,
} from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { QuotaService } from '../subscriptions/quota.service';
import { QuotaKey } from '../subscriptions/quota.constants';
import {
  CreateOfferDto,
  UpdateOfferDto,
  AdjustStockDto,
  CloseOfferDto,
  CancelOfferDto,
  CloneYesterdayOffersDto,
  QueryOffersDto,
} from './dto';
import { StockAdjustmentReason, OfferCloseReason, OfferCancelReason } from './offers.constants';

describe('OffersService', () => {
  let service: OffersService;

  const mockStoreId = 'store-uuid-001';
  const mockOfferId = 'offer-uuid-001';
  const mockItemId = 'item-uuid-001';

  const mockOffer: OfferEntity = {
    id: mockOfferId,
    storeId: mockStoreId,
    itemId: mockItemId,
    kind: OfferKind.REGULAR,
    totalQuantity: 10,
    remainingQuantity: 10,
    soldQuantity: 0,
    originalPrice: 50000,
    currentPrice: 25000,
    floorPrice: 20000,
    pickupStart: new Date('2026-10-13T19:00:00.000Z'),
    pickupEnd: new Date('2026-10-13T21:00:00.000Z'),
    expiresAt: new Date('2026-10-13T22:00:00.000Z'),
    status: OfferStatus.OPEN,
    priceChangeCount: 0,
    createdAt: new Date('2026-10-13T08:00:00.000Z'),
    updatedAt: new Date('2026-10-13T08:00:00.000Z'),
  };

  const mockItem: ItemEntity = {
    id: mockItemId,
    storeId: mockStoreId,
    name: 'Bánh Mì Hoa Cúc',
    category: 'Bánh ngọt',
    originalPrice: 50000,
    costPrice: 20000,
    standardShelfLifeHours: 24,
    ingredients: 'Bột mì, bơ',
    allergens: ['Gluten'],
    weightGrams: 300,
    imageUrl: 'https://example.com/item.jpg',
    description: 'Bánh mì thơm ngon',
    nutritionEstimate: null,
    status: ItemStatus.ACTIVE,
    preparedAt: null,
    expiryAt: null,
    storageInstructions: null,
    informationSource: TrustpassInformationSource.STORE,
    verificationStatus: TrustpassVerificationStatus.DECLARED,
    trustpassVersion: 1,
    trustpassPublishedAt: null,
    trustpassUpdatedBy: null,
    reviewStatus: TrustpassReviewStatus.NONE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockQueryBuilder = (
    result: unknown = null,
    countResult: [unknown[], number] = [[mockOffer], 1],
  ) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
    getMany: jest.fn().mockResolvedValue(countResult[0]),
    getManyAndCount: jest.fn().mockResolvedValue(countResult),
  });

  const mockOfferRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOfferEventRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockItemRepo = {
    findOne: jest.fn(),
  };

  // cancelOffer chạy trong giao dịch: manager giả định tuyến find/save/update/create về các mock bên dưới.
  const mockManager = {
    find: jest.fn(),
    save: jest.fn(async (e: unknown) => e),
    update: jest.fn(),
    create: jest.fn((_: unknown, v: unknown) => v),
    findOne: jest.fn().mockResolvedValue(null),
  };
  const mockOrderRepo = {
    find: jest.fn(),
    save: jest.fn(),
    manager: {
      transaction: jest.fn(async (cb: (m: typeof mockManager) => unknown) => cb(mockManager)),
    },
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
  };

  const mockQuotaService = {
    getQuotaLimit: jest.fn().mockResolvedValue(20),
    consume: jest.fn().mockResolvedValue({ isExceeded: false }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: mockOfferRepo,
        },
        {
          provide: getRepositoryToken(OfferEventEntity),
          useValue: mockOfferEventRepo,
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: mockItemRepo,
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: mockOrderRepo,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: QuotaService,
          useValue: mockQuotaService,
        },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  describe('getOffers (R2-026, R2-027)', () => {
    it('phải trả về danh sách phân trang các suất bán của cửa hàng', async () => {
      const qb = createMockQueryBuilder(null, [[mockOffer], 1]);
      mockOfferRepo.createQueryBuilder.mockReturnValue(qb);

      const query: QueryOffersDto = { page: 1, limit: 10 };
      const result = await service.getOffers(mockStoreId, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(qb.where).toHaveBeenCalledWith('offer.store_id = :storeId', { storeId: mockStoreId });
    });

    it('phải ném lỗi BadRequestException nếu fromDate lớn hơn toDate (R2-027 Validation)', async () => {
      const query: QueryOffersDto = {
        fromDate: '2026-10-20',
        toDate: '2026-10-10',
      };

      await expect(service.getOffers(mockStoreId, query)).rejects.toThrow(BadRequestException);
    });

    it('phải ném lỗi BadRequestException nếu khoảng ngày vượt quá 90 ngày (R2-027 BR1)', async () => {
      const query: QueryOffersDto = {
        fromDate: '2026-01-01',
        toDate: '2026-05-01', // ~120 ngày > 90
      };

      await expect(service.getOffers(mockStoreId, query)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOfferById', () => {
    it('phải trả về chi tiết suất kèm thông tin món ăn', async () => {
      mockOfferRepo.findOne.mockResolvedValue(mockOffer);
      mockItemRepo.findOne.mockResolvedValue(mockItem);

      const result = await service.getOfferById(mockStoreId, mockOfferId);

      expect(result.id).toBe(mockOfferId);
      expect(result.item?.name).toBe('Bánh Mì Hoa Cúc');
    });

    it('phải ném NotFoundException nếu suất không tồn tại trong cửa hàng', async () => {
      mockOfferRepo.findOne.mockResolvedValue(null);

      await expect(service.getOfferById(mockStoreId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createOffer (R2-028, BR-054)', () => {
    const validDto: CreateOfferDto = {
      itemId: mockItemId,
      totalQuantity: 10,
      originalPrice: 50000,
      currentPrice: 25000,
      pickupStart: '2026-10-13T19:00:00.000Z',
      pickupEnd: '2026-10-13T21:00:00.000Z',
      expiresAt: '2026-10-13T22:00:00.000Z',
      status: OfferStatus.OPEN,
    };

    it('phải tạo suất mới thành công khi dữ liệu hợp lệ và ghi nhận sự kiện + kiểm toán', async () => {
      mockItemRepo.findOne.mockResolvedValue(mockItem);
      mockOfferRepo.count.mockResolvedValue(5); // 5/20 suất hôm nay
      mockOfferRepo.create.mockImplementation(
        (dto: Partial<OfferEntity>) => ({ ...dto, id: 'new-offer-id' }) as OfferEntity,
      );
      mockOfferRepo.save.mockImplementation(async (entity: OfferEntity) => entity);
      mockOfferEventRepo.create.mockImplementation(
        (evt: Partial<OfferEventEntity>) => evt as OfferEventEntity,
      );
      mockOfferEventRepo.save.mockResolvedValue({ id: 'evt-1' });

      const result = await service.createOffer(mockStoreId, validDto, 'user-1');

      expect(result.id).toBe('new-offer-id');
      expect(result.currentPrice).toBe(25000);
      expect(result.floorPrice).toBe(20000); // 40% của 50.000
      expect(mockQuotaService.consume).toHaveBeenCalledWith({
        storeId: mockStoreId,
        quotaKey: QuotaKey.DAILY_OFFERS,
        units: 1,
      });
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFER_CREATED',
          targetType: 'OFFER',
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu món ăn đã bị lưu trữ (R2-028, BR3)', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItem, status: ItemStatus.ARCHIVED });

      await expect(service.createOffer(mockStoreId, validDto)).rejects.toThrow(BadRequestException);
    });

    it('phải ném lỗi BadRequestException nếu giá không chia hết cho 500đ (BR-064)', async () => {
      mockItemRepo.findOne.mockResolvedValue(mockItem);
      const invalidDto = { ...validDto, currentPrice: 25200 };

      await expect(service.createOffer(mockStoreId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi BadRequestException nếu giá bán thấp hơn giá sàn 40% (BR-054)', async () => {
      mockItemRepo.findOne.mockResolvedValue(mockItem);
      // Giá sàn 40% của 50k là 20k -> đặt 18k phải bị từ chối
      const invalidDto = { ...validDto, currentPrice: 18000 };

      await expect(service.createOffer(mockStoreId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi BadRequestException nếu giờ kết thúc nhận hàng trước giờ bắt đầu', async () => {
      mockItemRepo.findOne.mockResolvedValue(mockItem);
      const invalidDto = {
        ...validDto,
        pickupStart: '2026-10-13T21:00:00.000Z',
        pickupEnd: '2026-10-13T19:00:00.000Z',
      };

      await expect(service.createOffer(mockStoreId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi BadRequestException nếu số suất mở hôm nay đã đạt hạn mức gói (BR-054, VC-01)', async () => {
      mockItemRepo.findOne.mockResolvedValue(mockItem);
      mockQuotaService.getQuotaLimit.mockResolvedValue(20);
      mockOfferRepo.count.mockResolvedValue(20); // Đã chạm mốc 20

      await expect(service.createOffer(mockStoreId, validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cloneYesterdayOffers (R2-029)', () => {
    it('phải nhân bản các suất hôm qua sang hôm nay ở trạng thái DRAFT và bỏ qua món lưu trữ', async () => {
      const qb = createMockQueryBuilder(null, [
        [
          { ...mockOffer, id: 'yesterday-1', itemId: 'item-active' },
          { ...mockOffer, id: 'yesterday-2', itemId: 'item-archived' },
        ],
        2,
      ]);
      mockOfferRepo.createQueryBuilder.mockReturnValue(qb);

      mockItemRepo.findOne.mockImplementation(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'item-active')
          return { ...mockItem, id: 'item-active', status: ItemStatus.ACTIVE };
        return { ...mockItem, id: 'item-archived', status: ItemStatus.ARCHIVED };
      });

      mockOfferRepo.create.mockImplementation(
        (dto: Partial<OfferEntity>) => ({ ...dto, id: 'new-cloned-id' }) as OfferEntity,
      );
      mockOfferRepo.save.mockImplementation(async (e: OfferEntity) => e);
      mockOfferEventRepo.create.mockReturnValue({});
      mockOfferEventRepo.save.mockResolvedValue({});

      const dto: CloneYesterdayOffersDto = {};
      const result = await service.cloneYesterdayOffers(mockStoreId, dto, 'user-1');

      expect(result.clonedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.clonedOffers[0].status).toBe(OfferStatus.DRAFT);
    });
  });

  describe('updateOffer (R2-030)', () => {
    it('phải cập nhật số lượng và giá mới nếu hợp lệ', async () => {
      mockOfferRepo.findOne.mockResolvedValue({ ...mockOffer, soldQuantity: 2 });
      mockOfferRepo.save.mockImplementation(async (e: OfferEntity) => e);
      mockOfferEventRepo.create.mockReturnValue({});
      mockOfferEventRepo.save.mockResolvedValue({});

      const updateDto: UpdateOfferDto = {
        totalQuantity: 15,
        currentPrice: 22000,
      };

      const result = await service.updateOffer(mockStoreId, mockOfferId, updateDto, 'user-1');

      expect(result.totalQuantity).toBe(15);
      expect(result.currentPrice).toBe(22000);
      expect(result.priceChangeCount).toBe(1);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFER_PRICE_CHANGED',
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu tổng số lượng nhỏ hơn số lượng đã bán (R2-030, BR1)', async () => {
      mockOfferRepo.findOne.mockResolvedValue({ ...mockOffer, soldQuantity: 8 });

      const updateDto: UpdateOfferDto = { totalQuantity: 5 }; // 5 < 8
      await expect(service.updateOffer(mockStoreId, mockOfferId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi BadRequestException nếu đã đổi giá quá 3 lần cho phép', async () => {
      mockOfferRepo.findOne.mockResolvedValue({ ...mockOffer, priceChangeCount: 3 });

      const updateDto: UpdateOfferDto = { currentPrice: 24000 };
      await expect(service.updateOffer(mockStoreId, mockOfferId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('adjustStock (R2-031)', () => {
    it('phải điều chỉnh tăng/giảm tồn kho hợp lệ và ghi nhận lý do bắt buộc', async () => {
      mockOfferRepo.findOne.mockResolvedValue({
        ...mockOffer,
        remainingQuantity: 5,
        totalQuantity: 10,
        soldQuantity: 3,
      });
      mockOfferRepo.save.mockImplementation(async (e: OfferEntity) => e);
      mockOfferEventRepo.create.mockReturnValue({});
      mockOfferEventRepo.save.mockResolvedValue({});

      const dto: AdjustStockDto = {
        deltaQuantity: -2,
        reason: StockAdjustmentReason.COUNTER_SALE,
      };

      const result = await service.adjustStock(mockStoreId, mockOfferId, dto, 'user-1');

      expect(result.remainingQuantity).toBe(3);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STOCK_ADJUSTED',
          newValue: expect.objectContaining({
            delta: -2,
            reason: StockAdjustmentReason.COUNTER_SALE,
          }),
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu giảm làm tồn kho bị âm (R2-031, BR1)', async () => {
      mockOfferRepo.findOne.mockResolvedValue({
        ...mockOffer,
        remainingQuantity: 2,
        totalQuantity: 10,
      });

      const dto: AdjustStockDto = {
        deltaQuantity: -5, // 2 - 5 = -3 < 0
        reason: StockAdjustmentReason.DAMAGED,
      };

      await expect(service.adjustStock(mockStoreId, mockOfferId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('closeOffer (R2-032)', () => {
    it('phải chuyển trạng thái sang CLOSED và ghi nhận số lượng hao hụt', async () => {
      mockOfferRepo.findOne.mockResolvedValue({
        ...mockOffer,
        status: OfferStatus.OPEN,
        remainingQuantity: 4,
      });
      mockOfferRepo.save.mockImplementation(async (e: OfferEntity) => e);
      mockOfferEventRepo.create.mockReturnValue({});
      mockOfferEventRepo.save.mockResolvedValue({});

      const dto: CloseOfferDto = { reason: OfferCloseReason.OUT_OF_INGREDIENTS };
      const result = await service.closeOffer(mockStoreId, mockOfferId, dto, 'user-1');

      expect(result.status).toBe(OfferStatus.CLOSED);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFER_CLOSED',
          newValue: expect.objectContaining({ wasteQuantity: 4 }),
        }),
      );
    });
  });

  describe('cancelOffer (R2-033)', () => {
    it('phải hủy suất và tự động đánh dấu hủy/hoàn tiền 100% cho các đơn liên quan', async () => {
      mockOfferRepo.findOne.mockResolvedValue({ ...mockOffer, status: OfferStatus.OPEN });
      mockOfferRepo.save.mockImplementation(async (e: OfferEntity) => e);

      const mockOrder: Partial<OrderEntity> = {
        id: 'order-1',
        offerId: mockOfferId,
        status: OrderStatus.PAID,
      };
      mockManager.find.mockResolvedValue([
        { ...mockOrder, code: 'SQ1', totalAmount: 30000, storeId: mockStoreId, customerId: 'c1' },
      ]);
      mockOfferEventRepo.create.mockReturnValue({});
      mockOfferEventRepo.save.mockResolvedValue({});

      const dto: CancelOfferDto = { reason: OfferCancelReason.STORE_INCIDENT };
      const result = await service.cancelOffer(mockStoreId, mockOfferId, dto, 'user-1');

      expect(result.status).toBe(OfferStatus.CANCELLED);
      const cancelled = mockManager.save.mock.calls
        .map((c) => c[0] as Partial<OrderEntity>)
        .find((o) => o.code === 'SQ1');
      expect(cancelled?.status).toBe(OrderStatus.CANCELLED);
      expect(cancelled?.cancelledBy).toBe(CancelledBy.STORE);
      // BUG-005: phải có đúng một lệnh hoàn tiền bằng tổng tiền đơn
      const refunds = mockManager.create.mock.calls.filter(
        (c) => (c[1] as { kind?: string }).kind === 'ORDER_REFUND',
      );
      expect(refunds).toHaveLength(1);
      expect((refunds[0][1] as { amount: number }).amount).toBe(30000);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'OFFER_CANCELLED',
        }),
      );
    });
  });

  describe('autoCloseExpiredOffers (R2-034)', () => {
    it('phải tự động đóng các suất đã hết khung nhận hàng', async () => {
      mockOfferRepo.find.mockResolvedValue([
        { ...mockOffer, id: 'expired-1', status: OfferStatus.OPEN },
        { ...mockOffer, id: 'expired-2', status: OfferStatus.OPEN },
      ]);
      mockOfferRepo.save.mockResolvedValue({});
      mockOfferEventRepo.create.mockReturnValue({});
      mockOfferEventRepo.save.mockResolvedValue({});

      const count = await service.autoCloseExpiredOffers();

      expect(count).toBe(2);
      expect(mockOfferEventRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getOfferHistory (R2-035)', () => {
    it('phải trả về dòng thời gian lịch sử sự kiện của suất bán', async () => {
      mockOfferRepo.findOne.mockResolvedValue(mockOffer);
      const mockEvents: Partial<OfferEventEntity>[] = [
        { id: 'evt-1', offerId: mockOfferId, type: OfferEventType.CREATED, createdAt: new Date() },
        { id: 'evt-2', offerId: mockOfferId, type: OfferEventType.OPENED, createdAt: new Date() },
      ];
      mockOfferEventRepo.find.mockResolvedValue(mockEvents);

      const history = await service.getOfferHistory(mockStoreId, mockOfferId);

      expect(history).toHaveLength(2);
      expect(history[0].type).toBe(OfferEventType.CREATED);
    });
  });
});
