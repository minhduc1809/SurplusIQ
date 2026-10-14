import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { AiConversationEntity } from '../../entities/ai/ai-conversation.entity';
import { AiMessageEntity } from '../../entities/ai/ai-message.entity';
import { AiLogEntity } from '../../entities/ai/ai-log.entity';
import { AiFeedbackEntity, AiRating } from '../../entities/ai/ai-feedback.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { QuotaService } from '../subscriptions/quota.service';

describe('AiGatewayService Unit Tests (R2-108..R2-126, R1-082..R1-094)', () => {
  let service: AiGatewayService;
  let conversationRepo: any;
  let messageRepo: any;
  let logRepo: any;
  let feedbackRepo: any;
  let offerRepo: any;
  let itemRepo: any;
  let orderRepo: any;
  let quotaService: any;

  beforeEach(async () => {
    conversationRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'conv-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'conv-1', ...d })),
    };
    messageRepo = {
      create: jest.fn().mockImplementation((d) => ({ id: 'msg-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'msg-1', ...d })),
    };
    logRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'log-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'log-1', ...d })),
    };
    feedbackRepo = {
      create: jest.fn().mockImplementation((d) => ({ id: 'fb-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'fb-1', ...d })),
    };
    offerRepo = {
      find: jest.fn().mockResolvedValue([]),
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
        limit: 10,
        used: 1,
      }),
      consume: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiGatewayService,
        { provide: getRepositoryToken(AiConversationEntity), useValue: conversationRepo },
        { provide: getRepositoryToken(AiMessageEntity), useValue: messageRepo },
        { provide: getRepositoryToken(AiLogEntity), useValue: logRepo },
        { provide: getRepositoryToken(AiFeedbackEntity), useValue: feedbackRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: QuotaService, useValue: quotaService },
      ],
    }).compile();

    service = module.get<AiGatewayService>(AiGatewayService);
  });

  describe('chatWithStore (R2-108..R2-110)', () => {
    it('gửi câu hỏi và nhận câu trả lời trợ lý AI thành công', async () => {
      const res = await service.chatWithStore('store-1', 'user-1', {
        message: 'Hôm nay bánh mì còn thừa nhiều, tôi nên giảm giá bao nhiêu %?',
      });

      expect(res.conversationId).toBe('conv-1');
      expect(res.reply).toContain('SurplusIQ');
      expect(logRepo.save).toHaveBeenCalled();
      expect(quotaService.consume).toHaveBeenCalled();
    });

    it('chặn hỏi đáp nếu đã dùng hết hạn mức quota trong tháng', async () => {
      quotaService.checkQuota.mockResolvedValue({
        isExceeded: true,
        limit: 10,
        used: 10,
      });

      await expect(
        service.chatWithStore('store-1', 'user-1', {
          message: 'Hỏi vượt quota',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('describeItem (R2-021)', () => {
    it('sinh mô tả sản phẩm hấp dẫn kèm gợi ý tags', async () => {
      const res = await service.describeItem('store-1', 'user-1', {
        name: 'Bánh Mì Hoa Cúc',
        category: 'Bánh Mì Ngọt',
        ingredients: 'Bơ Pháp, hoa cúc tự nhiên',
      });

      expect(res.description).toContain('Bánh Mì Hoa Cúc');
      expect(res.suggestedTags).toHaveLength(4);
      expect(logRepo.save).toHaveBeenCalled();
      expect(quotaService.consume).toHaveBeenCalled();
    });
  });

  describe('generateWeeklySummary (R2-111)', () => {
    it('tổng hợp số liệu tuần và sinh câu chuyện tác động môi trường', async () => {
      orderRepo.find.mockResolvedValue([
        { quantity: 5, totalAmount: 150000, status: OrderStatus.PICKED_UP },
        { quantity: 3, totalAmount: 90000, status: OrderStatus.PICKED_UP },
      ]);

      const res = await service.generateWeeklySummary('store-1', 'user-1');
      expect(res.foodSavedKg).toBe(3.2); // (5+3) * 0.4
      expect(res.co2SavedKg).toBe(8.0); // 3.2 * 2.5
      expect(res.totalRevenue).toBe(240000);
      expect(res.summary).toBeDefined();
    });
  });

  describe('searchDeals (R1-082..R1-094)', () => {
    it('tìm kiếm suất bán bằng ngôn ngữ tự nhiên thành công', async () => {
      offerRepo.find.mockResolvedValue([
        {
          id: 'off-1',
          itemId: 'item-1',
          originalPrice: 50000,
          currentPrice: 25000,
          status: OfferStatus.OPEN,
        },
      ]);
      itemRepo.find.mockResolvedValue([
        { id: 'item-1', name: 'Bánh Mì Phô Mai', category: 'Bánh Ngọt' },
      ]);

      const res = await service.searchDeals('user-cust', {
        query: 'bánh mì ngọt dưới 30k gần đây',
      });

      expect(res.matchedOffers).toHaveLength(1);
      expect(res.matchedOffers[0].currentPrice).toBe(25000);
      expect(quotaService.consume).toHaveBeenCalled();
    });

    it('chặn tìm kiếm AI nếu khách đã dùng hết 30 lượt trong tháng', async () => {
      quotaService.checkQuota.mockResolvedValue({
        isExceeded: true,
        limit: 30,
        used: 30,
      });

      await expect(service.searchDeals('user-cust', { query: 'tìm bánh' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('recordFeedback (R1-094, R2-126)', () => {
    it('ghi nhận đánh giá chất lượng AI thành công', async () => {
      logRepo.findOne.mockResolvedValue({ id: 'log-1' });

      const res = await service.recordFeedback('user-1', {
        logId: 'log-1',
        rating: AiRating.HELPFUL,
        reason: 'Gợi ý chuẩn xác',
      });

      expect(res.success).toBe(true);
      expect(feedbackRepo.save).toHaveBeenCalled();
    });

    it('ném lỗi NotFoundException nếu logId không tồn tại', async () => {
      logRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordFeedback('user-1', {
          logId: 'log-999',
          rating: AiRating.UNHELPFUL,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
