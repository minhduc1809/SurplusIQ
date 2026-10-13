import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DiscoveryService } from './discovery.service';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity, StoreStatus } from '../../entities/stores/store.entity';
import { SavedDealEntity } from '../../entities/auth/saved-deal.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let offerRepo: any;
  let itemRepo: any;
  let storeRepo: any;
  let savedDealRepo: any;
  let reviewRepo: any;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
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
    reviewRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
        { provide: getRepositoryToken(SavedDealEntity), useValue: savedDealRepo },
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: DataSource, useValue: {} },
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
        pickupStart: new Date('2026-10-13T10:00:00Z'),
        pickupEnd: new Date('2026-10-13T23:59:59Z'),
        expiresAt: new Date('2026-10-14T02:00:00Z'),
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
});
