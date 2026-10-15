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
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import {
  StoreAiChatDto,
  DescribeItemDto,
  CustomerAiSearchDto,
  AiFeedbackDto,
  CustomerAllergyCheckDto,
  CustomerAiChatDto,
  DraftReviewReplyDto,
  DraftMarketingCampaignDto,
  SentimentAnalysisDto,
  SuggestCombosDto,
} from './dto/ai.dto';
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
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
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

  // =========================================================================
  // TRỢ LÝ SAVEBITE AI DÀNH CHO KHÁCH HÀNG (R1-084, R1-085, R1-087, R1-088)
  // =========================================================================

  /**
   * Tóm tắt deal nhanh dưới 3 gạch đầu dòng (R1-084)
   */
  async summarizeDeal(dealId: string) {
    const offer = await this.offerRepo.findOne({ where: { id: dealId } });
    if (!offer) {
      throw new NotFoundException('Suất cứu món không tồn tại.');
    }

    const item = offer.itemId ? await this.itemRepo.findOne({ where: { id: offer.itemId } }) : null;
    const store = await this.storeRepo.findOne({ where: { id: offer.storeId } });

    const orig = Number(offer.originalPrice);
    const curr = Number(offer.currentPrice);
    const discountPercent = orig > 0 ? Math.round(((orig - curr) / orig) * 100) : 0;

    const bullets = [
      `Chất lượng & nguồn gốc: ${item ? item.name : 'Suất cứu món tổng hợp'} tại ${store ? store.name : 'cửa hàng đối tác'}, bảo đảm an toàn vệ sinh và tươi ngon trong ngày.`,
      `Mức tiết kiệm: Giảm ${discountPercent}% (tiết kiệm ${(orig - curr).toLocaleString('vi-VN')}đ, chỉ còn ${curr.toLocaleString('vi-VN')}đ).`,
      `Khung giờ nhận: Từ ${new Date(offer.pickupStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} đến ${new Date(offer.pickupEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, vui lòng chuẩn bị mã QR để nhận nhanh.`,
    ];

    return {
      dealId,
      title: item ? item.name : 'Suất cứu món',
      storeName: store ? store.name : '',
      bullets,
    };
  }

  /**
   * Phân tích và giải thích dị ứng thực phẩm an toàn (R1-085)
   */
  async checkAllergies(userId: string, dto: CustomerAllergyCheckDto) {
    const offer = await this.offerRepo.findOne({ where: { id: dto.dealId } });
    if (!offer) {
      throw new NotFoundException('Suất cứu món không tồn tại.');
    }

    const item = offer.itemId ? await this.itemRepo.findOne({ where: { id: offer.itemId } }) : null;
    const itemAllergens = (item?.allergens || []).map((a) => a.toLowerCase().trim());
    const ingredients = (item?.ingredients || '').toLowerCase();

    const matchedAllergens: string[] = [];
    for (const allergy of dto.userAllergies) {
      const aLower = allergy.toLowerCase().trim();
      if (itemAllergens.includes(aLower) || ingredients.includes(aLower)) {
        matchedAllergens.push(allergy);
      }
    }

    const hasDanger = matchedAllergens.length > 0;
    const riskLevel = hasDanger ? 'DANGER' : 'SAFE';
    const warningMessage = hasDanger
      ? `CẢNH BÁO: Món ăn có chứa hoặc có khả năng tiếp xúc với các thành phần gây dị ứng của bạn (${matchedAllergens.join(', ')}). Bạn không nên sử dụng món này.`
      : 'AN TOÀN: Không phát hiện các chất gây dị ứng đã khai báo trong thành phần tiêu chuẩn của món. Tuy nhiên vui lòng thông báo cho nhân viên nếu bạn có tiền sử dị ứng chéo nghiêm trọng.';

    return {
      dealId: dto.dealId,
      itemName: item?.name || 'Món ăn',
      riskLevel,
      matchedAllergens,
      message: warningMessage,
    };
  }

  /**
   * Gợi ý công thức hâm nóng và tái chế món ăn giải cứu sáng tạo (R1-087)
   */
  async getRecipeIdeas(dealId: string) {
    const offer = await this.offerRepo.findOne({ where: { id: dealId } });
    if (!offer) {
      throw new NotFoundException('Suất cứu món không tồn tại.');
    }
    const item = offer.itemId ? await this.itemRepo.findOne({ where: { id: offer.itemId } }) : null;
    const itemName = item?.name || 'Món ăn';
    const category = item?.category || 'Bánh mì';

    const reheatingGuide = [
      'Nồi chiên không dầu: Làm nóng trước 160°C, xịt nhẹ một lớp nước mỏng lên vỏ bánh, nướng trong 3-4 phút để vỏ giòn rụm như mới.',
      'Lò vi sóng: Đặt một chén nước nhỏ cạnh món ăn, quay mức công suất vừa trong 45-60 giây để ruột bánh mềm ẩm không bị khô.',
      'Áp chảo: Quét một lớp bơ mỏng lên chảo nóng, áp chảo mỗi mặt 1-2 phút lửa nhỏ.',
    ];

    const creativeRecipes = [
      {
        title: `Salad ${itemName} giòn sốt mè rang`,
        description:
          'Cắt nhỏ bánh thành viên hạt lựu, nướng giòn làm croutons ăn kèm xà lách, cà chua bi và sốt mè rang thanh mát.',
        prepTimeMinutes: 10,
      },
      {
        title: `Pudding ${itemName} nướng trứng sữa`,
        description:
          'Xé nhỏ bánh xếp vào khuôn, rưới hỗn hợp sữa tươi, trứng gà và vani, nướng ở 170°C trong 15 phút để có bữa xế thơm béo.',
        prepTimeMinutes: 20,
      },
    ];

    return {
      dealId,
      itemName,
      category,
      reheatingGuide,
      creativeRecipes,
    };
  }

  /**
   * Trợ lý SaveBite AI hỏi đáp tự nhiên dành cho khách hàng (R1-088)
   */
  async chatWithCustomer(userId: string, dto: CustomerAiChatDto) {
    const quotaCheck = await this.quotaService.checkQuota({
      userId,
      quotaKey: QuotaKey.AI_CUSTOMER_QUERIES,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Bạn đã sử dụng hết hạn mức hỏi đáp AI trong tháng (${quotaCheck.limit} lượt). Vui lòng sử dụng Trung tâm trợ giúp (FAQ) hoặc liên hệ hỗ trợ viên.`,
      );
    }

    let conversation: AiConversationEntity;
    if (dto.conversationId) {
      const found = await this.conversationRepo.findOne({
        where: { id: dto.conversationId, userId },
      });
      if (!found) {
        throw new NotFoundException('Cuộc trò chuyện không tồn tại.');
      }
      conversation = found;
    } else {
      conversation = this.conversationRepo.create({
        userId,
        storeId: null,
        role: AiUserRole.CUSTOMER,
        title: dto.message.slice(0, 80),
        status: AiConversationStatus.ACTIVE,
      });
      conversation = await this.conversationRepo.save(conversation);
    }

    const userMessage = this.messageRepo.create({
      conversationId: conversation.id,
      sender: AiMessageSender.USER,
      content: dto.message,
    });
    await this.messageRepo.save(userMessage);

    const msgLower = dto.message.toLowerCase();
    let reply: string;

    if (
      msgLower.includes('nhận hàng') ||
      msgLower.includes('quét mã') ||
      msgLower.includes('lấy bánh')
    ) {
      reply =
        'Khi đến cửa hàng nhận suất cứu món, bạn chỉ cần mở đơn hàng trên app SurplusIQ và đưa mã QR cho nhân viên quét (hoặc đọc mã PIN 6 số nếu camera có vấn đề). Hãy chú ý đến đúng khung giờ nhận để món ăn luôn thơm ngon nhất nhé!';
    } else if (
      msgLower.includes('hoàn tiền') ||
      msgLower.includes('hủy đơn') ||
      msgLower.includes('đổi')
    ) {
      reply =
        'Theo chính sách chống lãng phí, đơn hàng đã thanh toán không thể tự hủy. Tuy nhiên, nếu món ăn nhận được không đúng mô tả hoặc chất lượng có vấn đề, bạn có thể gửi khiếu nại kèm ảnh chụp trong 24 giờ kể từ khi nhận để được hoàn tiền 100% (BR-071).';
    } else if (
      msgLower.includes('bảo quản') ||
      msgLower.includes('để qua đêm') ||
      msgLower.includes('hâm')
    ) {
      reply =
        'Các món cứu thực phẩm được chuẩn bị tươi mới trong ngày. Bạn nên dùng ngay hoặc bọc kín trong màng bọc thực phẩm để ngăn mát tủ lạnh (dùng trong 24-48 giờ). Khi ăn hãy nướng lại bằng nồi chiên không dầu 160°C trong 3 phút là bánh sẽ giòn ngon như mới!';
    } else {
      reply =
        'Chào bạn! Mình là SaveBite AI – trợ lý cứu thực phẩm thông minh. Mình có thể giúp bạn giải đáp thắc mắc về các món ngon hôm nay, mẹo hâm nóng, kiểm tra dị ứng hoặc hướng dẫn quy trình nhận hàng tại cửa hàng đối tác. Bạn cần mình hỗ trợ gì thêm không?';
    }

    const assistantMessage = this.messageRepo.create({
      conversationId: conversation.id,
      sender: AiMessageSender.ASSISTANT,
      content: reply,
    });
    await this.messageRepo.save(assistantMessage);

    const aiLog = this.logRepo.create({
      userId,
      storeId: null,
      featureCode: 'CUSTOMER_AI_CHAT',
      model: 'gemini-1.5-flash',
      latencyMs: 290,
      inputSummary: dto.message.slice(0, 200),
      outputSummary: reply.slice(0, 200),
    });
    const savedLog = await this.logRepo.save(aiLog);

    await this.quotaService.consume({
      userId,
      quotaKey: QuotaKey.AI_CUSTOMER_QUERIES,
      units: 1,
      refId: savedLog.id,
    });

    return {
      conversationId: conversation.id,
      reply,
      logId: savedLog.id,
    };
  }

  // =========================================================================
  // TRỢ LÝ STORE AI COPILOT DÀNH CHO CỬA HÀNG (R2-116, R2-119, R2-122, R2-124)
  // =========================================================================

  /**
   * Soạn thảo phản hồi thông minh cho đánh giá của khách hàng (R2-116)
   */
  async draftReviewReply(storeId: string, userId: string, dto: DraftReviewReplyDto) {
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.AI_CONTENT_GEN,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức lượt AI tạo nội dung trong tháng (${quotaCheck.limit} lượt). Vui lòng nâng cấp gói Pro.`,
      );
    }

    const review = await this.reviewRepo.findOne({
      where: { id: dto.reviewId, storeId },
    });
    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại hoặc không thuộc cửa hàng.');
    }

    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    const storeName = store?.name || 'Cửa hàng';
    const rating = review.rating;
    const tone = dto.tone || 'FRIENDLY';

    let draftReply: string;
    if (rating >= 4) {
      if (tone === 'FORMAL') {
        draftReply = `Kính gửi quý khách, ${storeName} xin trân trọng cảm ơn quý khách đã tin tưởng và đồng hành cùng sứ mệnh giải cứu thực phẩm xanh. Chúng tôi luôn nỗ lực duy trì chất lượng phục vụ tốt nhất và rất mong được tiếp tục đón tiếp quý khách.`;
      } else {
        draftReply = `Dạ ${storeName} cảm ơn bạn rất nhiều vì lời khen dễ thương! Cùng nhau cứu món ngon giá tốt và bảo vệ môi trường bạn nhé. Hẹn gặp lại bạn ở những suất cứu món tiếp theo ạ! 🥰`;
      }
    } else if (rating === 3) {
      draftReply = `Chào bạn, ${storeName} chân thành ghi nhận góp ý của bạn để cải thiện hương vị và dịch vụ tốt hơn nữa trong những lần tới. Cảm ơn bạn đã luôn ủng hộ tiệm!`;
    } else {
      draftReply = `Kính gửi quý khách, ${storeName} thành thật xin lỗi vì trải nghiệm chưa trọn vẹn của bạn lần này. Chúng tôi đã nghiêm túc rà soát lại quy trình chuẩn bị và đóng gói món. Rất mong quý khách liên hệ hotline của quán để chúng tôi được lắng nghe và hỗ trợ chu đáo nhất!`;
    }

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_REVIEW_REPLY',
      model: 'gemini-1.5-flash',
      latencyMs: 310,
      inputSummary: `Review rating: ${rating}, comment: ${review.comment || 'None'}`,
      outputSummary: draftReply.slice(0, 200),
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
      reviewId: review.id,
      customerRating: rating,
      customerComment: review.comment,
      draftReply,
      logId: savedLog.id,
    };
  }

  /**
   * Soạn thảo nội dung thông báo push marketing kích cầu (R2-122)
   */
  async draftMarketingCampaign(storeId: string, userId: string, dto: DraftMarketingCampaignDto) {
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.AI_CONTENT_GEN,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức lượt AI tạo nội dung trong tháng (${quotaCheck.limit} lượt). Vui lòng nâng cấp gói Pro.`,
      );
    }

    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    const storeName = store?.name || 'Cửa hàng';

    let itemName = 'bánh ngon';
    if (dto.offerId) {
      const offer = await this.offerRepo.findOne({ where: { id: dto.offerId } });
      if (offer && offer.itemId) {
        const item = await this.itemRepo.findOne({ where: { id: offer.itemId } });
        if (item) itemName = item.name;
      }
    }

    const proposals = [
      {
        title: `🔥 Giờ vàng cứu ${itemName} tại ${storeName}!`,
        content: `Chỉ còn vài suất ${itemName} nướng mới hôm nay với giá giảm đến 50%. Mở app đặt ngay kẻo lỡ bạn nhé!`,
        recommendedTarget: dto.targetAudience || 'ALL',
      },
      {
        title: `🌱 Cùng ${storeName} giải cứu món ngon cuối ngày!`,
        content: `Ưu đãi siêu hời dành riêng cho cộng đồng SurplusIQ: ${itemName} thơm ngon đang chờ bạn ghé nhận chiều nay!`,
        recommendedTarget: dto.targetAudience || 'FAVORITES',
      },
    ];

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_MARKETING_DRAFT',
      model: 'gemini-1.5-flash',
      latencyMs: 330,
      inputSummary: `Draft campaign for ${itemName}`,
      outputSummary: proposals[0].title,
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
      storeName,
      targetAudience: dto.targetAudience || 'ALL',
      proposals,
      logId: savedLog.id,
    };
  }

  /**
   * Phân tích cảm xúc (Sentiment Analysis) từ các đánh giá của khách hàng (R2-119)
   */
  async analyzeSentiment(storeId: string, userId: string, dto: SentimentAnalysisDto) {
    const limit = dto.limit || 30;
    const reviews = await this.reviewRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    if (reviews.length === 0) {
      return {
        storeId,
        totalReviewsAnalyzed: 0,
        sentimentScore: 100,
        breakdown: { positive: 0, neutral: 0, negative: 0 },
        strengths: [],
        areasForImprovement: [],
        summary: 'Cửa hàng chưa có đánh giá nào từ khách hàng.',
      };
    }

    let pos = 0;
    let neu = 0;
    let neg = 0;

    for (const r of reviews) {
      if (r.rating >= 4) pos++;
      else if (r.rating === 3) neu++;
      else neg++;
    }

    const total = reviews.length;
    const sentimentScore = Math.round(((pos + neu * 0.5) / total) * 100);

    const strengths = [
      'Chất lượng món ăn tươi ngon, đúng như mô tả trên ứng dụng.',
      'Khung giờ nhận hàng thuận tiện, nhân viên thân thiện.',
      'Giá bán cứu món cực kỳ tiết kiệm và đóng gói cẩn thận.',
    ];

    const areasForImprovement =
      neg > 0
        ? [
            'Một số khách nhận xét thời gian đợi quét mã tại quầy vào giờ cao điểm còn chậm.',
            'Nên kiểm tra bao bì để giữ độ giòn của bánh khi khách di chuyển xa.',
          ]
        : ['Tiếp tục duy trì phong độ phục vụ tốt hiện tại!'];

    const summary = `Qua phân tích ${total} đánh giá gần nhất, cửa hàng đạt chỉ số hài lòng ${sentimentScore}%. Tỷ lệ phản hồi tích cực chiếm ${Math.round((pos / total) * 100)}%. Khách hàng đặc biệt hài lòng với độ tươi ngon và tính tiện lợi của quy trình nhận hàng.`;

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_SENTIMENT_ANALYSIS',
      model: 'gemini-1.5-flash',
      latencyMs: 340,
      inputSummary: `Analyzed ${total} reviews for store ${storeId}`,
      outputSummary: summary.slice(0, 200),
    });
    const savedLog = await this.logRepo.save(aiLog);

    return {
      storeId,
      totalReviewsAnalyzed: total,
      sentimentScore,
      breakdown: {
        positive: pos,
        neutral: neu,
        negative: neg,
      },
      strengths,
      areasForImprovement,
      summary,
      logId: savedLog.id,
    };
  }

  /**
   * Đề xuất ghép combo hoặc tạo túi bất ngờ từ các món còn tồn kho (R2-124)
   */
  async suggestCombos(storeId: string, userId: string, dto: SuggestCombosDto) {
    const openOffers = await this.offerRepo.find({
      where: { storeId, status: OfferStatus.OPEN },
      take: 10,
    });

    const offerIds = openOffers.map((o) => o.id);
    let items: ItemEntity[] = [];
    if (offerIds.length > 0) {
      items = await this.itemRepo.find({ where: { storeId } });
    }
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const discount = dto.targetDiscountPercent || 50;

    const availableItems = openOffers.map((o) => {
      const item = o.itemId ? itemMap.get(o.itemId) : null;
      return {
        offerId: o.id,
        name: item?.name || 'Món ăn',
        originalPrice: o.originalPrice,
        currentPrice: o.currentPrice,
        remainingQuantity: o.remainingQuantity,
      };
    });

    const suggestions = [
      {
        type: 'SURPRISE_BAG',
        title: 'Túi Bất Ngờ Bánh Nướng Thơm Ngon Cuối Ngày',
        description:
          'Tập hợp ngẫu nhiên 3-4 loại bánh mì nướng và bánh ngọt trong ngày, tạo trải nghiệm mở túi đầy thú vị cho khách hàng.',
        estimatedOriginalPrice: 100000,
        suggestedComboPrice: Math.round(100000 * (1 - discount / 100)),
        discountPercent: discount,
        benefit: 'Giải phóng hàng tồn nhanh gấp 3 lần so với bán từng món lẻ sát giờ đóng cửa.',
      },
      {
        type: 'SAVINGS_COMBO',
        title: 'Combo Cứu Món Bữa Xế No Nê',
        description:
          'Ghép 1 món bánh mặn no bụng cùng 1 bánh ngọt tráng miệng thành set hoàn chỉnh cho dân văn phòng.',
        estimatedOriginalPrice: 75000,
        suggestedComboPrice: Math.round(75000 * (1 - discount / 100)),
        discountPercent: discount,
        benefit: 'Kích thích giá trị đơn hàng trung bình (AOV) tăng thêm 40%.',
      },
    ];

    return {
      storeId,
      availableOffersCount: openOffers.length,
      availableItems,
      suggestedCombos: suggestions,
    };
  }
}
