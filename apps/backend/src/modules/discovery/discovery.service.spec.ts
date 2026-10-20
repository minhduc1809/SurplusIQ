import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DiscoveryService } from './discovery.service';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity, StoreStatus } from '../../entities/stores/store.entity';
import { SavedDealEntity } from '../../entities/auth/saved-deal.entity';
import { DealAlertEntity } from '../../entities/auth/deal-alert.entity';
import { SavedFilterEntity } from '../../entities/auth/saved-filter.entity';
import { ViewHistoryEntity } from '../../entities/auth/view-history.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { OrdersService } from '../orders/orders.service';
import { RealtimeService } from '../realtime/realtime.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let offerRepo: any;
  let itemRepo: any;
  let storeRepo: any;
  let savedDealRepo: any;
  let dealAlertRepo: any;
  let savedFilterRepo: any;
  let viewHistoryRepo: any;
  let reviewRepo: any;
  let ordersService: any;
  let realtimeService: any;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    getRawMany: jest.fn().mockResolvedValue([
      {
        offer_id: 'off-1',
        store_id: 'store-1',
        item_id: 'item-1',
        original_price: '50000',
        current_price: '25000',
        remaining_quantity: '5',
        pickup_start: '2026-10-13T10:00:00Z',
        pickup_end: '2026-10-13T12:00:00Z',
        expires_at: '2026-10-13T14:00:00Z',
        item_name: 'Bánh Mì Pate',
        item_category: 'Bánh mì',
        item_image_url: 'https://example.com/item.jpg',
        store_name: 'Tiệm Bánh A',
        store_address: '123 Nguyễn Huệ',
        store_logo_url: null,
        distance_meters: '450',
      },
    ]),
    getRawOne: jest.fn().mockResolvedValue({
      avg_rating: '4.8',
      review_count: '15',
    }),
  };

  beforeEach(async () => {
    offerRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
    };
    itemRepo = {
      findOne: jest.fn(),
    };
    storeRepo = {
      findOne: jest.fn(),
    };
    savedDealRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'saved-1', ...d })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    dealAlertRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'alert-1', ...d })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    savedFilterRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'filter-1', ...d })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    viewHistoryRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'view-1', ...d })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    reviewRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };
    ordersService = {
      createHoldOrder: jest.fn(),
    };
    realtimeService = {
      broadcast: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
        { provide: getRepositoryToken(SavedDealEntity), useValue: savedDealRepo },
        { provide: getRepositoryToken(DealAlertEntity), useValue: dealAlertRepo },
        { provide: getRepositoryToken(SavedFilterEntity), useValue: savedFilterRepo },
        { provide: getRepositoryToken(ViewHistoryEntity), useValue: viewHistoryRepo },
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: DataSource, useValue: {} },
        { provide: OrdersService, useValue: ordersService },
        { provide: RealtimeService, useValue: realtimeService },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  describe('findNearbyDeals', () => {
    it('nên trả về danh sách deals phân trang kèm khoảng cách khi có tọa độ (R1-020, R1-025)', async () => {
      const result = await service.findNearbyDeals({
        latitude: 10.7769,
        longitude: 106.7009,
        radiusKm: 2,
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('off-1');
      expect(result.data[0].discountPercent).toBe(50);
      expect(result.data[0].distanceMeters).toBe(450);
      expect(result.data[0].distanceKm).toBe(0.45);
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('o.id', 'ASC');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getDealDetail', () => {
    it('nên trả về chi tiết deal kèm thông tin quán và điểm đánh giá (R1-026)', async () => {
      offerRepo.findOne.mockResolvedValue({
        id: 'off-1',
        storeId: 'store-1',
        itemId: 'item-1',
        kind: 'REGULAR',
        status: OfferStatus.OPEN,
        originalPrice: 50000,
        currentPrice: 25000,
        floorPrice: 20000,
        remainingQuantity: 5,
        totalQuantity: 10,
        pickupStart: new Date(Date.now() - 3600000),
        pickupEnd: new Date(Date.now() + 7200000),
        expiresAt: new Date(Date.now() + 7200000),
      });
      itemRepo.findOne.mockResolvedValue({
        id: 'item-1',
        name: 'Bánh Mì',
        category: 'Bánh mì',
        allergens: ['gluten'],
      });
      storeRepo.findOne.mockResolvedValue({
        id: 'store-1',
        name: 'Tiệm Bánh A',
        address: '123 Nguyễn Huệ',
        phone: '0901234567',
        status: StoreStatus.ACTIVE,
      });

      const detail = await service.getDealDetail('off-1');
      expect(detail.id).toBe('off-1');
      expect(detail.discountPercent).toBe(50);
      expect(detail.isAvailable).toBe(true);
      expect(detail.item?.name).toBe('Bánh Mì');
      expect(detail.store.averageRating).toBe(4.8);
    });

    it('nên ném lỗi NotFoundException khi offer không tồn tại', async () => {
      offerRepo.findOne.mockResolvedValue(null);
      await expect(service.getDealDetail('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveDeal & getSavedDeals', () => {
    it('nên lưu deal và tự động phát hiện deal hết hạn (R1-034)', async () => {
      offerRepo.findOne.mockResolvedValue({ id: 'off-1' });
      savedDealRepo.findOne.mockResolvedValue(null);

      const saveRes = await service.saveDeal('user-1', 'off-1');
      expect(saveRes.success).toBe(true);

      // getSavedDeals
      savedDealRepo.find.mockResolvedValue([
        { id: 'saved-1', userId: 'user-1', offerId: 'off-1', savedAt: new Date() },
      ]);
      mockQueryBuilder.getRawMany.mockResolvedValueOnce([
        {
          offer_id: 'off-1',
          offer_status: OfferStatus.OPEN,
          original_price: '50000',
          current_price: '25000',
          remaining_quantity: '0', // hết tồn kho -> expired
          pickup_end: '2026-10-13T23:59:59Z',
          item_name: 'Bánh Mì',
        },
      ]);

      const savedList = await service.getSavedDeals('user-1');
      expect(savedList).toHaveLength(1);
      expect(savedList[0].isExpired).toBe(true);
    });
  });

  describe('dealAlerts (R1-031, R1-032)', () => {
    it('tạo cảnh báo deal thành công và từ chối nếu quá 10 cảnh báo', async () => {
      dealAlertRepo.count.mockResolvedValueOnce(2);
      const res = await service.createDealAlert('user-1', {
        criteria: { category: 'Bánh mì', maxPrice: 30000 },
        isActive: true,
      });

      expect(res.id).toBe('alert-1');
      expect(dealAlertRepo.create).toHaveBeenCalled();

      // Quá 10 cảnh báo
      dealAlertRepo.count.mockResolvedValueOnce(10);
      await expect(
        service.createDealAlert('user-1', { criteria: { keyword: 'trà sữa' } }),
      ).rejects.toThrow();
    });

    it('lấy danh sách cảnh báo của người dùng', async () => {
      dealAlertRepo.find.mockResolvedValueOnce([
        { id: 'alert-1', criteria: { category: 'bánh ngọt' } },
      ]);
      const alerts = await service.getDealAlerts('user-1');
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toBe('alert-1');
    });
  });

  describe('savedFilters (R1-033)', () => {
    it('lưu bộ lọc thành công và từ chối nếu trùng tên', async () => {
      savedFilterRepo.count.mockResolvedValueOnce(1);
      savedFilterRepo.findOne.mockResolvedValueOnce(null);

      const res = await service.createSavedFilter('user-1', {
        name: 'Gần tôi giá rẻ',
        criteria: { maxPrice: 25000, radiusKm: 3 },
      });

      expect(res.id).toBe('filter-1');

      // Trùng tên
      savedFilterRepo.count.mockResolvedValueOnce(1);
      savedFilterRepo.findOne.mockResolvedValueOnce({ id: 'existing' });
      await expect(
        service.createSavedFilter('user-1', {
          name: 'Gần tôi giá rẻ',
          criteria: {},
        }),
      ).rejects.toThrow();
    });
  });

  describe('viewHistory (R1-035)', () => {
    it('ghi nhận lịch sử xem và trả về danh sách kèm thông tin deal', async () => {
      offerRepo.findOne.mockResolvedValueOnce({ id: 'off-1', status: OfferStatus.OPEN });
      viewHistoryRepo.findOne.mockResolvedValueOnce(null);
      viewHistoryRepo.count = jest.fn().mockResolvedValue(5);

      const res = await service.recordViewHistory('user-1', 'off-1');
      expect(res.id).toBe('view-1');

      viewHistoryRepo.find.mockResolvedValueOnce([
        { id: 'view-1', userId: 'user-1', offerId: 'off-1', viewedAt: new Date() },
      ]);
      offerRepo.find = jest.fn().mockResolvedValueOnce([
        {
          id: 'off-1',
          itemId: 'item-1',
          storeId: 'store-1',
          currentPrice: 20000,
          originalPrice: 40000,
          status: OfferStatus.OPEN,
          remainingQuantity: 3,
        },
      ]);
      itemRepo.find = jest.fn().mockResolvedValueOnce([{ id: 'item-1', name: 'Bánh Mì Pate' }]);
      storeRepo.find = jest.fn().mockResolvedValueOnce([{ id: 'store-1', name: 'Tiệm Bánh A' }]);

      const history = await service.getViewHistory('user-1');
      expect(history).toHaveLength(1);
      expect(history[0].title).toBe('Bánh Mì Pate');
    });
  });

  describe('compareDeals & getShareableDeal (R1-036, R1-037)', () => {
    it('so sánh từ 2 đến 3 suất bán thành công', async () => {
      jest.spyOn(service, 'getDealDetail').mockImplementation(async (id: string) => {
        return {
          id,
          originalPrice: 50000,
          currentPrice: 25000,
          discountPercent: 50,
          item: { name: `Món ${id}` },
          store: { name: `Quán ${id}` },
        } as any;
      });

      const res = await service.compareDeals(['off-1', 'off-2']);
      expect(res.count).toBe(2);
      expect(res.deals).toHaveLength(2);

      // Từ chối nếu dưới 2 hoặc quá 3
      await expect(service.compareDeals(['off-1'])).rejects.toThrow();
      await expect(service.compareDeals(['1', '2', '3', '4'])).rejects.toThrow();
    });

    it('tạo link chia sẻ không chứa PII (R1-037)', async () => {
      jest.spyOn(service, 'getDealDetail').mockResolvedValueOnce({
        id: 'off-share-1',
        originalPrice: 60000,
        currentPrice: 30000,
        discountPercent: 50,
        item: { name: 'Cơm tấm sườn' },
        store: { name: 'Cơm Tấm Ba Ghiền' },
      } as any);

      const res = await service.getShareableDeal('off-share-1');
      expect(res.dealId).toBe('off-share-1');
      expect(res.shareUrl).toContain('off-share-1');
      expect(res.shareText).toContain('Cơm tấm sườn');
    });
  });
});
