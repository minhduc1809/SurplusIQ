import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import {
  PromotionEntity,
  PromotionStatus,
  PromotionType,
} from '../../entities/marketing/promotion.entity';
import { CampaignEntity, CampaignStatus } from '../../entities/marketing/campaign.entity';
import { CustomerSegmentEntity } from '../../entities/stores/customer-segment.entity';
import { SurpriseBagItemEntity } from '../../entities/catalog/surprise-bag-item.entity';
import { OfferEntity, OfferKind, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { QuotaService } from '../subscriptions/quota.service';

describe('MarketingService Unit Tests (R2-082..R2-094, R1-026, R2-091, BR-085, BR-086)', () => {
  let service: MarketingService;
  let promoRepo: any;
  let campaignRepo: any;
  let segmentRepo: any;
  let surpriseBagRepo: any;
  let offerRepo: any;
  let itemRepo: any;
  let orderRepo: any;
  let quotaService: any;

  beforeEach(async () => {
    promoRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'pro-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'pro-1', ...d })),
    };
    campaignRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => ({ id: 'cam-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'cam-1', ...d })),
    };
    segmentRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    surpriseBagRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    offerRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => ({ id: 'off-bag', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'off-bag', ...d })),
    };
    itemRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    quotaService = {
      checkQuota: jest.fn().mockResolvedValue({
        isExceeded: false,
        limit: 5,
        used: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        { provide: getRepositoryToken(PromotionEntity), useValue: promoRepo },
        { provide: getRepositoryToken(CampaignEntity), useValue: campaignRepo },
        { provide: getRepositoryToken(CustomerSegmentEntity), useValue: segmentRepo },
        { provide: getRepositoryToken(SurpriseBagItemEntity), useValue: surpriseBagRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: QuotaService, useValue: quotaService },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
  });

  describe('createPromotion (R2-088)', () => {
    it('tạo chương trình ưu đãi thành công khi hợp lệ', async () => {
      const res = await service.createPromotion('store-1', {
        name: 'Giảm 20% sinh nhật',
        type: PromotionType.PERCENT,
        value: 20,
        maxUses: 100,
        startAt: '2026-10-15T00:00:00Z',
        endAt: '2026-10-20T23:59:59Z',
      });

      expect(res.id).toBe('pro-1');
      expect(promoRepo.save).toHaveBeenCalled();
    });

    it('ném lỗi nếu vượt hạn mức ACTIVE_PROMOTIONS', async () => {
      quotaService.checkQuota.mockResolvedValue({
        isExceeded: true,
        limit: 1,
        used: 1,
      });

      await expect(
        service.createPromotion('store-1', {
          name: 'Voucher quá hạn mức',
          type: PromotionType.FIXED,
          value: 10000,
          maxUses: 10,
          startAt: '2026-10-15T00:00:00Z',
          endAt: '2026-10-20T23:59:59Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi nếu endAt nhỏ hơn hoặc bằng startAt', async () => {
      await expect(
        service.createPromotion('store-1', {
          name: 'Voucher lỗi ngày',
          type: PromotionType.FIXED,
          value: 10000,
          maxUses: 10,
          startAt: '2026-10-20T00:00:00Z',
          endAt: '2026-10-15T23:59:59Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCampaign (BR-086 Giới nghiêm ban đêm 22h-7h)', () => {
    it('tạo chiến dịch thành công vào ban ngày (10:00 giờ VN = 03:00 UTC)', async () => {
      const res = await service.createCampaign('store-1', {
        title: 'Bánh tươi giờ vàng',
        content: 'Bánh nướng mới ra lò giảm 50%!',
        target: 'LOYAL',
        scheduledAt: '2026-10-15T03:00:00Z', // 10:00 VN
      });

      expect(res.id).toBe('cam-1');
      expect(campaignRepo.save).toHaveBeenCalled();
    });

    it('chặn gửi thông báo vào khung giờ giới nghiêm ban đêm (23:00 giờ VN = 16:00 UTC) (BR-086)', async () => {
      await expect(
        service.createCampaign('store-1', {
          title: 'Thông báo ban đêm',
          content: 'Quấy rầy giấc ngủ',
          target: 'ALL',
          scheduledAt: '2026-10-15T16:00:00Z', // 23:00 VN -> thuộc 22h-7h
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('calculateCustomerSegments (R2-082..R2-085)', () => {
    it('thực hiện phân nhóm khách hàng theo lịch sử đơn', async () => {
      orderRepo.find.mockResolvedValue([
        {
          customerId: 'cust-1',
          status: OrderStatus.PICKED_UP,
          totalAmount: 50000,
          createdAt: new Date(),
        },
        {
          customerId: 'cust-1',
          status: OrderStatus.PICKED_UP,
          totalAmount: 40000,
          createdAt: new Date(),
        },
        {
          customerId: 'cust-1',
          status: OrderStatus.PICKED_UP,
          totalAmount: 60000,
          createdAt: new Date(),
        },
      ]);

      const result = await service.calculateCustomerSegments('store-1');
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });
  });

  describe('createSurpriseBag (R1-026, R2-091, BR-085)', () => {
    it('tạo túi bất ngờ thành công kèm cảnh báo chất dị ứng bắt buộc', async () => {
      itemRepo.find.mockResolvedValue([
        { id: 'item-1', name: 'Bánh mì phô mai', allergens: ['Sữa', 'Gluten'] },
        { id: 'item-2', name: 'Bánh quy bơ', allergens: ['Bơ', 'Trứng'] },
      ]);

      const res = await service.createSurpriseBag('store-1', {
        title: 'Túi Bất Ngờ Chiều Nay',
        originalPrice: 100000,
        currentPrice: 45000,
        totalQuantity: 5,
        pickupStart: '2026-10-15T18:00:00Z',
        pickupEnd: '2026-10-15T21:00:00Z',
        items: [
          { itemId: 'item-1', quantity: 1 },
          { itemId: 'item-2', quantity: 2 },
        ],
      });

      expect(res.offer.id).toBe('off-bag');
      expect(res.allergenNotice).toContain('Sữa');
      expect(res.allergenNotice).toContain('Gluten');
      expect(offerRepo.save).toHaveBeenCalled();
      expect(surpriseBagRepo.save).toHaveBeenCalled();
    });

    it('ném lỗi NotFoundException nếu có item không thuộc quán', async () => {
      itemRepo.find.mockResolvedValue([{ id: 'item-1' }]);

      await expect(
        service.createSurpriseBag('store-1', {
          title: 'Túi lỗi',
          originalPrice: 80000,
          currentPrice: 40000,
          totalQuantity: 2,
          pickupStart: '2026-10-15T18:00:00Z',
          pickupEnd: '2026-10-15T21:00:00Z',
          items: [
            { itemId: 'item-1', quantity: 1 },
            { itemId: 'item-99', quantity: 1 },
          ],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCampaign & getCampaignAnalytics (R2-093, R2-094)', () => {
    it('cho phép hủy hoặc sửa chiến dịch nếu còn hơn 15 phút trước giờ gửi (R2-093)', async () => {
      const futureTime = new Date(Date.now() + 60 * 60 * 1000); // 60 phút nữa
      campaignRepo.findOne = jest.fn().mockResolvedValue({
        id: 'cam-1',
        storeId: 'store-1',
        title: 'Tiêu đề cũ',
        status: CampaignStatus.SCHEDULED,
        scheduledAt: futureTime,
      });

      const updated = await service.updateCampaign('store-1', 'cam-1', {
        title: 'Tiêu đề mới',
        status: CampaignStatus.CANCELLED,
      });

      expect(updated.title).toBe('Tiêu đề mới');
      expect(updated.status).toBe(CampaignStatus.CANCELLED);
    });

    it('từ chối sửa chiến dịch nếu còn ít hơn 15 phút trước giờ gửi (R2-093)', async () => {
      const soonTime = new Date(Date.now() + 5 * 60 * 1000); // chỉ còn 5 phút
      campaignRepo.findOne = jest.fn().mockResolvedValue({
        id: 'cam-1',
        storeId: 'store-1',
        status: CampaignStatus.SCHEDULED,
        scheduledAt: soonTime,
      });

      await expect(
        service.updateCampaign('store-1', 'cam-1', { title: 'Sửa gấp' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('thống kê phân tích hiệu quả chiến dịch (R2-094)', async () => {
      const scheduledDate = new Date('2026-10-15T14:00:00Z');
      campaignRepo.findOne = jest.fn().mockResolvedValue({
        id: 'cam-1',
        storeId: 'store-1',
        title: 'Khuyến mãi chiều',
        target: 'ALL',
        scheduledAt: scheduledDate,
        status: CampaignStatus.SENT,
      });

      orderRepo.find.mockResolvedValueOnce([
        { id: 'ord-1', unitPrice: 30000, quantity: 2, status: OrderStatus.PICKED_UP },
        { id: 'ord-2', unitPrice: 20000, quantity: 1, status: OrderStatus.PAID },
      ]);

      const analytics = await service.getCampaignAnalytics('store-1', 'cam-1');
      expect(analytics.campaignId).toBe('cam-1');
      expect(analytics.metrics.ordersWithin24h).toBe(2);
      expect(analytics.metrics.revenueGeneratedVnd).toBe(80000);
      expect(analytics.metrics.recipientsCount).toBe(120);
    });
  });
});
