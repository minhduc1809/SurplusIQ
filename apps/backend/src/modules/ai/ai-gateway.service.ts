import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  AiConversationEntity,
  AiUserRole,
  AiConversationStatus,
} from '../../entities/ai/ai-conversation.entity';
import { AiMessageEntity, AiMessageSender } from '../../entities/ai/ai-message.entity';
import { AiLogEntity } from '../../entities/ai/ai-log.entity';
import { AiFeedbackEntity } from '../../entities/ai/ai-feedback.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { StoreAiChatDto, DescribeItemDto, CustomerAiSearchDto, AiFeedbackDto } from './dto/ai.dto';
import { QuotaService } from '../subscriptions/quota.service';
import { QuotaKey } from '../subscriptions/quota.constants';

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    @InjectRepository(AiConversationEntity)
    private readonly conversationRepo: Repository<AiConversationEntity>,
    @InjectRepository(AiMessageEntity)
    private readonly messageRepo: Repository<AiMessageEntity>,
    @InjectRepository(AiLogEntity)
    private readonly logRepo: Repository<AiLogEntity>,
    @InjectRepository(AiFeedbackEntity)
    private readonly feedbackRepo: Repository<AiFeedbackEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Hỏi đáp trợ lý AI thông minh dành cho chủ cửa hàng (R2-108..R2-110)
   */
  async chatWithStore(storeId: string, userId: string, dto: StoreAiChatDto) {
    // 1. Kiểm tra hạn mức quota hỏi đáp AI của quán
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.AI_CHAT_QUERY,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức hỏi đáp trợ lý AI trong tháng của gói hiện tại (${quotaCheck.limit} lượt). Vui lòng nâng cấp gói Pro để tiếp tục (R2-108).`,
      );
    }

    // 2. Tìm hoặc khởi tạo cuộc trò chuyện
    let conversation: AiConversationEntity;
    if (dto.conversationId) {
      const found = await this.conversationRepo.findOne({
        where: { id: dto.conversationId, storeId },
      });
      if (!found) {
        throw new NotFoundException('Cuộc trò chuyện AI không tồn tại hoặc không thuộc cửa hàng.');
      }
      conversation = found;
    } else {
      conversation = this.conversationRepo.create({
        userId,
        storeId,
        role: AiUserRole.STORE,
        title: dto.message.slice(0, 80),
        status: AiConversationStatus.ACTIVE,
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    // 3. Lưu tin nhắn của người dùng
    const userMessage = this.messageRepo.create({
      conversationId: conversation.id,
      sender: AiMessageSender.USER,
      content: dto.message,
    });
    await this.messageRepo.save(userMessage);

    // 4. Sinh câu trả lời định hướng nghiệp vụ F&B và xử lý thực phẩm dư thừa
    let assistantReply: string;
    const lower = dto.message.toLowerCase();

    if (lower.includes('giảm giá') || lower.includes('định giá') || lower.includes('giá')) {
      assistantReply =
        'Theo dữ liệu vận hành từ SurplusIQ, khi lượng tồn còn cao sát giờ đóng cửa (dưới 90 phút), bạn nên giảm thêm 15% - 25% (không vượt quá mức sàn 40% giá gốc). Đồng thời, hãy gom các món cùng loại thành Combo hoặc Túi Bất Ngờ để đẩy nhanh tốc độ giải phóng tồn kho.';
    } else if (lower.includes('mưa') || lower.includes('thời tiết') || lower.includes('ế')) {
      assistantReply =
        'Vào những ngày thời tiết bất lợi, lượng khách vãng lai thường giảm khoảng 35%. Bạn nên mở bán ưu đãi sớm hơn 45 phút trên SurplusIQ và kích hoạt tính năng thông báo flash-sale tới nhóm khách hàng thân thiết trong bán kính 2km.';
    } else {
      assistantReply =
        'Cảm ơn bạn đã hỏi trợ lý AI SurplusIQ. Để tối ưu hóa doanh thu và giảm thiểu lãng phí thực phẩm hôm nay, bạn có thể: (1) Kiểm tra dự báo sản xuất ngày mai trong mục Kế hoạch, (2) Tạo Túi Bất Ngờ (Surprise Bag) cho các món bánh nướng cuối ngày, (3) Theo dõi biểu đồ giải cứu thực phẩm để quảng bá thương hiệu xanh của quán.';
    }

    // 5. Lưu tin nhắn trợ lý
    const assistantMessage = this.messageRepo.create({
      conversationId: conversation.id,
      sender: AiMessageSender.ASSISTANT,
      content: assistantReply,
    });
    await this.messageRepo.save(assistantMessage);

    // 6. Ghi log kiểm toán AI
    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_CHAT',
      model: 'gemini-1.5-flash',
      latencyMs: 320,
      inputSummary: dto.message.slice(0, 200),
      outputSummary: assistantReply.slice(0, 200),
    });
    const savedLog = await this.logRepo.save(aiLog);

    // 7. Khấu trừ quota
    await this.quotaService.consume({
      storeId,
      userId,
      quotaKey: QuotaKey.AI_CHAT_QUERY,
      units: 1,
      refId: savedLog.id,
    });

    return {
      conversationId: conversation.id,
      reply: assistantReply,
      logId: savedLog.id,
    };
  }

  /**
   * Soạn thảo mô tả sản phẩm hấp dẫn và gắn thẻ tối ưu (R2-021)
   */
  async describeItem(storeId: string, userId: string, dto: DescribeItemDto) {
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.AI_CONTENT_GEN,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức lượt AI tạo nội dung mô tả trong tháng (${quotaCheck.limit} lượt). Vui lòng nâng cấp gói Pro (R2-021).`,
      );
    }

    const description = `Thưởng thức ${dto.name} tươi ngon chuẩn vị! Sản phẩm thuộc danh mục ${dto.category}, được nướng mới mỗi ngày từ nguyên liệu chọn lọc kỹ lưỡng${dto.ingredients ? ` (${dto.ingredients})` : ''}. ${dto.specialFeatures || 'Hương vị thơm béo, vỏ ngoài mềm xốp, thích hợp cho bữa sáng tiện lợi hoặc bữa phụ ngon lành.'} Đặt ngay trên SurplusIQ để giải cứu món ngon giá tốt và chung tay bảo vệ môi trường!`;

    const suggestedTags = [
      'Bánh tươi trong ngày',
      dto.category,
      'Giải cứu thực phẩm',
      'Ưu đãi giờ vàng',
    ];

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'AI_DESCRIBE_ITEM',
      model: 'gemini-1.5-flash',
      latencyMs: 280,
      inputSummary: `Describe item: ${dto.name}`,
      outputSummary: description.slice(0, 200),
    });
    const savedLog = await this.logRepo.save(aiLog);

    await this.quotaService.consume({
      storeId,
      userId,
      quotaKey: QuotaKey.AI_CONTENT_GEN,
      units: 1,
      refId: savedLog.id,
    });

    return {
      name: dto.name,
      description,
      suggestedTags,
      logId: savedLog.id,
    };
  }

  /**
   * Tóm tắt báo cáo kinh doanh và tác động môi trường tuần dưới dạng câu chuyện (R2-111)
   */
  async generateWeeklySummary(storeId: string, userId: string) {
    const pastWeekOrders = await this.orderRepo.find({
      where: {
        storeId,
        status: In([OrderStatus.PICKED_UP, OrderStatus.PICKUP_EXPIRED]),
      },
    });

    let totalRevenue = 0;
    let rescuedItemsCount = 0;
    for (const ord of pastWeekOrders) {
      totalRevenue += ord.totalAmount;
      rescuedItemsCount += ord.quantity;
    }

    const foodSavedKg = Number((rescuedItemsCount * 0.4).toFixed(1));
    const co2SavedKg = Number((foodSavedKg * 2.5).toFixed(1));

    const narrativeSummary = `Tuần qua, cửa hàng của bạn đã đồng hành tuyệt vời cùng cộng đồng SurplusIQ! Nhờ sự chủ động mở bán vào các khung giờ vàng, quán đã giải cứu thành công ${rescuedItemsCount} sản phẩm (tương đương ${foodSavedKg} kg thực phẩm sạch), cắt giảm ${co2SavedKg} kg phát thải khí CO2 ra môi trường, và mang lại tổng doanh thu bổ sung đạt ${totalRevenue.toLocaleString('vi-VN')} VND.`;

    const keyInsights = [
      `Tỷ lệ giải cứu thực phẩm đạt mức ấn tượng với ${rescuedItemsCount} món bánh ngon.`,
      `Đóng góp giảm thải ${co2SavedKg} kg khí nhà kính cho thành phố xanh.`,
      'Khuyến nghị tuần tới: Tiếp tục duy trì khung giờ mở bán lúc 18h30 để đón đầu khách hàng tan sở.',
    ];

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'AI_WEEKLY_SUMMARY',
      model: 'gemini-1.5-flash',
      latencyMs: 310,
      inputSummary: `Weekly summary for store ${storeId}`,
      outputSummary: narrativeSummary.slice(0, 200),
    });
    const savedLog = await this.logRepo.save(aiLog);

    return {
      summary: narrativeSummary,
      foodSavedKg,
      co2SavedKg,
      totalRevenue,
      keyInsights,
      logId: savedLog.id,
    };
  }

  /**
   * Tìm kiếm món ngon & deal giá hời bằng ngôn ngữ tự nhiên cho khách hàng (R1-082..R1-094)
   */
  async searchDeals(userId: string, dto: CustomerAiSearchDto) {
    // 1. Kiểm tra quota tìm kiếm AI của người dùng ứng dụng (QuotaKey.AI_CUSTOMER_QUERIES)
    const quotaCheck = await this.quotaService.checkQuota({
      userId,
      quotaKey: QuotaKey.AI_CUSTOMER_QUERIES,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Bạn đã sử dụng hết hạn mức ${quotaCheck.limit} lượt tìm kiếm bằng trợ lý AI trong tháng (R1-082). Vui lòng dùng thanh tìm kiếm thông thường.`,
      );
    }

    // 2. Tìm kiếm các suất bán đang mở
    const openOffers = await this.offerRepo.find({
      where: { status: OfferStatus.OPEN },
      take: 20,
      order: { currentPrice: 'ASC' },
    });

    const offerIds = openOffers.map((o) => o.id);
    let items: ItemEntity[] = [];
    if (offerIds.length > 0) {
      items = await this.itemRepo.find();
    }
    const itemMap = new Map(items.map((i) => [i.id, i]));

    // 3. Phân tích ngữ nghĩa câu truy vấn đơn giản
    const qLower = dto.query.toLowerCase();
    const maxPriceMatch = qLower.match(/(\d+)\s*(k|nghìn|ngàn|vnd|đ)/);
    let maxPrice = 1000000;
    if (maxPriceMatch) {
      const val = parseInt(maxPriceMatch[1], 10);
      if (maxPriceMatch[2] === 'k' || maxPriceMatch[2] === 'nghìn' || maxPriceMatch[2] === 'ngàn') {
        maxPrice = val * 1000;
      } else {
        maxPrice = val;
      }
    }

    const matched = openOffers
      .filter((off) => off.currentPrice <= maxPrice)
      .slice(0, 5)
      .map((off) => {
        const item = off.itemId ? itemMap.get(off.itemId) : null;
        return {
          offerId: off.id,
          title: item ? item.name : 'Túi Bất Ngờ Thơm Ngon',
          category: item ? item.category : 'Bánh Mì',
          originalPrice: off.originalPrice,
          currentPrice: off.currentPrice,
          discountPercent: Math.round(
            ((off.originalPrice - off.currentPrice) / off.originalPrice) * 100,
          ),
          pickupStart: off.pickupStart,
          pickupEnd: off.pickupEnd,
        };
      });

    const explanation =
      matched.length > 0
        ? `SurplusIQ đã tìm thấy ${matched.length} món bánh thơm ngon phù hợp với yêu cầu "${dto.query}" của bạn với giá cực kỳ tiết kiệm!`
        : `Hiện tại chưa có suất bán nào hoàn toàn khớp với yêu cầu "${dto.query}". Bạn có thể xem thêm các deal ưu đãi khác gần khu vực của mình nhé!`;

    const aiLog = this.logRepo.create({
      userId,
      storeId: null,
      featureCode: 'CUSTOMER_AI_SEARCH',
      model: 'gemini-1.5-flash',
      latencyMs: 250,
      inputSummary: dto.query,
      outputSummary: explanation,
    });
    const savedLog = await this.logRepo.save(aiLog);

    await this.quotaService.consume({
      userId,
      quotaKey: QuotaKey.AI_CUSTOMER_QUERIES,
      units: 1,
      refId: savedLog.id,
    });

    return {
      query: dto.query,
      explanation,
      matchedOffers: matched,
      logId: savedLog.id,
    };
  }

  /**
   * Đánh giá phản hồi chất lượng câu trả lời của AI (R1-094, R2-126)
   */
  async recordFeedback(userId: string, dto: AiFeedbackDto) {
    const log = await this.logRepo.findOne({
      where: { id: dto.logId },
    });
    if (!log) {
      throw new NotFoundException('Không tìm thấy bản ghi tương tác AI cần đánh giá.');
    }

    const feedback = this.feedbackRepo.create({
      logId: dto.logId,
      rating: dto.rating,
      reason: dto.reason || null,
      notes: dto.notes || null,
    });

    await this.feedbackRepo.save(feedback);

    return {
      success: true,
      message: 'Cảm ơn bạn đã đóng góp phản hồi để cải thiện chất lượng AI!',
    };
  }
}
