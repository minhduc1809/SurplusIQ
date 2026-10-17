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
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
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
  let reviewRepo: any;
  let complaintRepo: any;
  let storeRepo: any;
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
      findOne: jest.fn(),
    };
    itemRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    reviewRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    complaintRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'comp-1',
        reason: 'Món ăn không đúng mô tả',
        description: 'Bánh mì giao đến bị nguội và thiếu nước xốt',
      }),
    };
    storeRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'store-1', name: 'Tiệm Bánh Mì Việt' }),
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
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: getRepositoryToken(ComplaintEntity), useValue: complaintRepo },
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
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

  describe('Customer SaveBite AI Features (R1-084, R1-085, R1-087, R1-088)', () => {
    it('tóm tắt thông tin deal dưới 3 gạch đầu dòng (R1-084)', async () => {
      offerRepo.findOne.mockResolvedValueOnce({
        id: 'deal-1',
        storeId: 'store-1',
        itemId: 'item-1',
        originalPrice: 60000,
        currentPrice: 30000,
        pickupStart: new Date(),
        pickupEnd: new Date(),
      });
      itemRepo.findOne.mockResolvedValueOnce({ id: 'item-1', name: 'Bánh Mì Kẹp Thịt' });

      const res = await service.summarizeDeal('deal-1');
      expect(res.dealId).toBe('deal-1');
      expect(res.bullets).toHaveLength(3);
      expect(res.bullets[1]).toContain('50%');
    });

    it('kiểm tra và cảnh báo thành phần dị ứng an toàn (R1-085)', async () => {
      offerRepo.findOne.mockResolvedValueOnce({
        id: 'deal-1',
        itemId: 'item-1',
      });
      itemRepo.findOne.mockResolvedValueOnce({
        id: 'item-1',
        name: 'Bánh Cookie Đậu Phộng',
        allergens: ['Đậu phộng', 'Trứng'],
        ingredients: 'Bơ, bột mì, đậu phộng rang',
      });

      const res = await service.checkAllergies('user-1', {
        dealId: 'deal-1',
        userAllergies: ['Đậu phộng', 'Tôm'],
      });

      expect(res.riskLevel).toBe('DANGER');
      expect(res.matchedAllergens).toContain('Đậu phộng');
    });

    it('gợi ý cách hâm nóng và ý tưởng món ăn sáng tạo (R1-087)', async () => {
      offerRepo.findOne.mockResolvedValueOnce({ id: 'deal-1', itemId: 'item-1' });
      itemRepo.findOne.mockResolvedValueOnce({
        id: 'item-1',
        name: 'Bánh Mì Chuối',
        category: 'Bánh ngọt',
      });

      const res = await service.getRecipeIdeas('deal-1');
      expect(res.reheatingGuide.length).toBeGreaterThan(0);
      expect(res.creativeRecipes.length).toBeGreaterThan(0);
    });

    it('trò chuyện tự nhiên với SaveBite AI (R1-088)', async () => {
      const res = await service.chatWithCustomer('user-1', {
        message: 'Làm thế nào để nhận hàng tại quán?',
      });

      expect(res.reply).toContain('mã QR');
      expect(quotaService.consume).toHaveBeenCalled();
    });
  });

  describe('Store AI Copilot Features (R2-116, R2-119, R2-122, R2-124)', () => {
    it('AI soạn thảo phản hồi đánh giá khách hàng (R2-116)', async () => {
      reviewRepo.findOne.mockResolvedValueOnce({
        id: 'rev-1',
        rating: 5,
        comment: 'Bánh rất ngon và rẻ!',
      });

      const res = await service.draftReviewReply('store-1', 'user-1', {
        reviewId: 'rev-1',
        tone: 'FRIENDLY',
      });

      expect(res.draftReply).toContain('cảm ơn');
      expect(quotaService.consume).toHaveBeenCalled();
    });

    it('AI đề xuất tiêu đề và nội dung push marketing (R2-122)', async () => {
      const res = await service.draftMarketingCampaign('store-1', 'user-1', {
        targetAudience: 'ALL',
      });

      expect(res.proposals.length).toBeGreaterThan(0);
      expect(res.proposals[0].title).toBeDefined();
    });

    it('phân tích cảm xúc và trích xuất điểm cần cải thiện từ đánh giá (R2-119)', async () => {
      reviewRepo.find.mockResolvedValueOnce([
        { id: 'r1', rating: 5 },
        { id: 'r2', rating: 4 },
        { id: 'r3', rating: 2 },
      ]);

      const res = await service.analyzeSentiment('store-1', 'user-1', { limit: 10 });
      expect(res.totalReviewsAnalyzed).toBe(3);
      expect(res.breakdown.positive).toBe(2);
      expect(res.breakdown.negative).toBe(1);
    });

    it('gợi ý ghép combo hoặc túi bất ngờ tối ưu doanh thu (R2-124)', async () => {
      offerRepo.find.mockResolvedValueOnce([
        {
          id: 'o-1',
          itemId: 'it-1',
          originalPrice: 50000,
          currentPrice: 25000,
          remainingQuantity: 5,
        },
      ]);
      itemRepo.find.mockResolvedValueOnce([{ id: 'it-1', name: 'Bánh Baguette' }]);

      const res = await service.suggestCombos('store-1', 'user-1', { targetDiscountPercent: 50 });
      expect(res.suggestedCombos.length).toBeGreaterThan(0);
      expect(res.suggestedCombos[0].type).toBe('SURPRISE_BAG');
    });
  });
});
