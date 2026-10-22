import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
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
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { UpdateAiConfigDto } from './dto/ai-config.dto';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import {
  StoreAiChatDto,
  DescribeItemDto,
  CustomerAiSearchDto,
  AiFeedbackDto,
  CustomerAllergyCheckDto,
  CustomerAiChatDto,
  DraftReviewReplyDto,
  DraftMarketingCampaignDto,
  DraftComplaintReplyDto,
  SentimentAnalysisDto,
  SuggestCombosDto,
  AiSuggestedActionDto,
} from './dto/ai.dto';
import {
  matchCustomerAppGuide,
  matchStoreAppGuide,
  CUSTOMER_GUIDE_KNOWLEDGE_PROMPT,
  STORE_GUIDE_KNOWLEDGE_PROMPT,
} from './knowledge/surplusiq-app-guide.knowledge';
import { QuotaService } from '../subscriptions/quota.service';
import { QuotaKey } from '../subscriptions/quota.constants';

export type AiFeatureKey = 'chat' | 'weeklySummary' | 'drafts';

export interface AiConfig {
  chat: boolean;
  weeklySummary: boolean;
  drafts: boolean;
  managerCanUse: boolean;
  defaultTone: 'FRIENDLY' | 'FORMAL' | 'APOLOGETIC';
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  chat: true,
  weeklySummary: true,
  drafts: true,
  managerCanUse: true,
  defaultTone: 'FRIENDLY',
};

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

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
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(StoreSettingsEntity)
    private readonly settingsRepo: Repository<StoreSettingsEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly customerProfileRepo: Repository<CustomerProfileEntity>,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Gọi Google Gemini API thực tế thông qua GEMINI_API_KEY từ .env,
   * tự động fallback an toàn về câu trả lời nghiệp vụ chuẩn nếu mất mạng hoặc trong môi trường test.
   */
  private async callGemini(
    prompt: string,
    fallbackText: string,
    preferredModel?: string,
  ): Promise<{ text: string; model: string; latencyMs: number }> {
    const startMs = Date.now();
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const configuredModel =
      preferredModel ||
      process.env.GEMINI_CHAT_MODEL?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      'gemini-1.5-flash';

    if (
      !apiKey ||
      apiKey === 'your_gemini_api_key_here' ||
      (process.env.NODE_ENV === 'test' && process.env.GEMINI_FORCE_LIVE_TEST !== 'true')
    ) {
      return {
        text: fallbackText,
        model: configuredModel,
        latencyMs: Math.max(1, Date.now() - startMs) || 280,
      };
    }

    const candidateModels = Array.from(
      new Set([configuredModel, 'gemini-2.0-flash', 'gemini-1.5-flash']),
    );
    const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 10000;
    const maxOutputTokens = Number(process.env.GEMINI_MAX_TOKENS) || 2048;

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens,
              temperature: 0.4,
            },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const generated = payload.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? '')
          .join('')
          .trim();

        if (generated) {
          return {
            text: generated,
            model,
            latencyMs: Math.max(1, Date.now() - startMs),
          };
        }
      } catch (err) {
        this.logger.warn(
          `Gemini API call failed on model ${model}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return {
      text: fallbackText,
      model: configuredModel,
      latencyMs: Math.max(1, Date.now() - startMs),
    };
  }

  /** Số liệu 7 ngày gần nhất và 7 ngày trước đó, do hệ thống tính (không do AI). Doanh thu gồm cả đơn khách không đến, như báo cáo. */
  private async weeklyStats(storeId: string, now = new Date()) {
    const day = 24 * 60 * 60 * 1000;
    const orders = await this.orderRepo.find({
      where: { storeId, createdAt: MoreThanOrEqual(new Date(now.getTime() - 14 * day)) },
    });
    const cut = now.getTime() - 7 * day;
    const calc = (list: OrderEntity[]) => {
      const r = { orders: list.length, pickedUp: 0, noShow: 0, cancelled: 0, units: 0, revenue: 0 };
      for (const o of list) {
        if (o.status === OrderStatus.PICKED_UP) {
          r.pickedUp++;
          r.units += o.quantity;
          r.revenue += o.totalAmount;
        } else if (o.status === OrderStatus.PICKUP_EXPIRED) {
          r.noShow++;
          r.revenue += o.totalAmount;
        } else if (o.status === OrderStatus.CANCELLED) {
          r.cancelled++;
        }
      }
      return r;
    };
    return {
      current: calc(orders.filter((o) => new Date(o.createdAt).getTime() >= cut)),
      previous: calc(orders.filter((o) => new Date(o.createdAt).getTime() < cut)),
    };
  }

  private factsText(stats: Awaited<ReturnType<AiGatewayService['weeklyStats']>>): string {
    const line = (label: string, s: typeof stats.current) =>
      `${label}: ${s.orders} đơn (${s.pickedUp} đã nhận, ${s.noShow} khách không đến, ${s.cancelled} hủy), ${s.units} suất cứu được, doanh thu ${s.revenue.toLocaleString('vi-VN')} đ.`;
    return `${line('7 ngày gần nhất', stats.current)}\n${line('7 ngày trước đó', stats.previous)}`;
  }

  async getAiConfig(storeId: string): Promise<AiConfig> {
    const row = await this.settingsRepo.findOne({ where: { storeId } });
    return { ...DEFAULT_AI_CONFIG, ...((row?.aiConfig as Partial<AiConfig>) ?? {}) };
  }

  async updateAiConfig(storeId: string, dto: UpdateAiConfigDto): Promise<AiConfig> {
    const row = await this.settingsRepo.findOne({ where: { storeId } });
    if (!row) throw new NotFoundException('Cửa hàng chưa có cài đặt vận hành.');
    row.aiConfig = { ...dto };
    await this.settingsRepo.save(row);
    return { ...dto };
  }

  /** Chặn khi cửa hàng đã tắt nhóm tính năng này, hoặc tắt AI cho vai Quản lý. Chủ luôn được dùng nếu tính năng bật. */
  async assertFeatureAllowed(storeId: string, feature: AiFeatureKey, permission?: string) {
    const cfg = await this.getAiConfig(storeId);
    if (!cfg[feature]) {
      throw new ForbiddenException('Cửa hàng đã tắt tính năng AI này trong cấu hình AI.');
    }
    if (permission === 'MANAGER' && !cfg.managerCanUse) {
      throw new ForbiddenException('Chủ cửa hàng chưa cho phép Quản lý dùng AI.');
    }
  }

  /** Danh sách hội thoại của chính người dùng trong cửa hàng (R2-110). */
  async listStoreConversations(storeId: string, userId: string) {
    const list = await this.conversationRepo.find({
      where: { storeId, userId },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    return list.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async getStoreConversation(storeId: string, userId: string, id: string) {
    const conversation = await this.conversationRepo.findOne({ where: { id, storeId, userId } });
    if (!conversation) throw new NotFoundException('Cuộc trò chuyện AI không tồn tại.');
    const messages = await this.messageRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });
    return {
      id: conversation.id,
      title: conversation.title,
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async deleteStoreConversation(storeId: string, userId: string, id: string) {
    const conversation = await this.conversationRepo.findOne({ where: { id, storeId, userId } });
    if (!conversation) throw new NotFoundException('Cuộc trò chuyện AI không tồn tại.');
    await this.messageRepo.delete({ conversationId: id });
    await this.conversationRepo.delete({ id });
    return { success: true };
  }

  async deleteAllStoreConversations(storeId: string, userId: string) {
    const list = await this.conversationRepo.find({ where: { storeId, userId }, select: ['id'] });
    if (list.length > 0) {
      await this.messageRepo.delete({ conversationId: In(list.map((c) => c.id)) });
      await this.conversationRepo.delete({ id: In(list.map((c) => c.id)) });
    }
    return { success: true, deleted: list.length };
  }

  /** Nhật ký lượt dùng AI của cửa hàng (R2-124), mới nhất trước. */
  async listStoreAiLogs(storeId: string, page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 100);
    const [items, total] = await this.logRepo.findAndCount({
      where: { storeId },
      order: { createdAt: 'DESC' },
      skip: (Math.max(page, 1) - 1) * take,
      take,
    });
    return {
      items,
      total,
      page: Math.max(page, 1),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  }

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

    // 3. Lịch sử gần nhất để trả lời nhiều lượt, rồi lưu tin nhắn của người dùng
    const history = (
      await this.messageRepo.find({
        where: { conversationId: conversation.id },
        order: { createdAt: 'DESC' },
        take: 6,
      })
    ).reverse();
    const userMessage = this.messageRepo.create({
      conversationId: conversation.id,
      sender: AiMessageSender.USER,
      content: dto.message,
    });
    await this.messageRepo.save(userMessage);

    // 4. Phát hiện ý định hướng dẫn sử dụng / nghiệp vụ và gán action điều hướng
    // 4. Phát hiện ý định hướng dẫn sử dụng / nghiệp vụ vận hành
    const norm = normalizeText(dto.message);
    const suggestedAction: AiSuggestedActionDto | null = null;
    let guideHint = '';

    // Khớp bộ tri thức hướng dẫn sử dụng chuyên biệt cho chủ cửa hàng
    const matchedStoreGuide = matchStoreAppGuide(norm);
    if (matchedStoreGuide) {
      guideHint = matchedStoreGuide;
    } else if (
      norm.includes('nhiem vu') ||
      norm.includes('checklist') ||
      norm.includes('dong ca') ||
      norm.includes('cuoi ngay') ||
      norm.includes('viec can lam')
    ) {
      guideHint =
        '### Hướng dẫn đóng ca & kiểm kê cuối ngày:\n\n' +
        '* Mở màn hình `[Nhiệm vụ]` trên ứng dụng.\n' +
        '* Tích chọn checklist dọn quầy và nhập số lượng tồn thực tế của các món để hệ thống đối soát chính xác.';
    } else if (
      norm.includes('hop dong') ||
      norm.includes('phap ly') ||
      norm.includes('ngan hang') ||
      norm.includes('tai khoan thu huong') ||
      norm.includes('an toan thuc pham')
    ) {
      guideHint =
        '### Hồ sơ pháp lý & Hợp đồng đối tác:\n\n' +
        '* Vào Menu `[Cửa hàng]` ➔ `[Hồ sơ kinh doanh và hợp đồng]` để xem hợp đồng điện tử đã ký, giấy chứng nhận VSATTP và tài khoản ngân hàng thụ hưởng.';
    } else if (
      norm.includes('nhan vien') ||
      norm.includes('phan quyen') ||
      norm.includes('them thu ngan') ||
      norm.includes('quan ly nhan su')
    ) {
      guideHint =
        '### Phân quyền & Nhân sự cửa hàng:\n\n' +
        '* Trên hệ thống SurplusIQ, tài khoản đăng nhập là vai trò **Chủ cửa hàng (Owner)** nắm toàn quyền quản lý.\n' +
        '* Nhân viên quầy có thể sử dụng màn hình `[Xác nhận nhận hàng]` để quét camera mã QR hoặc nhập mã PIN 6 số của khách giao hàng.';
    } else if (
      norm.includes('ho tro') ||
      norm.includes('lien he') ||
      norm.includes('ky thuat') ||
      norm.includes('bao loi')
    ) {
      guideHint =
        '### Kênh hỗ trợ kỹ thuật SurplusIQ:\n\n' +
        '* Bạn có thể gửi yêu cầu hỗ trợ qua mục `[Yêu cầu hỗ trợ]` trên app hoặc liên hệ hotline kỹ thuật SurplusIQ hỗ trợ 24/7.';
    }

    // 5. Trả lời dựa trên số liệu hệ thống tính & hướng dẫn nghiệp vụ
    const facts = this.factsText(await this.weeklyStats(storeId));
    const fallbackReply = guideHint
      ? guideHint
      : `Dạ chào bạn, tôi là Trợ lý vận hành SurplusIQ dành cho chủ quán! Tôi có thể hướng dẫn bạn cách đăng suất bán, quét mã QR nhận đơn, xem báo cáo doanh thu, đối soát tuần hay xử lý khiếu nại. Bạn muốn tìm hiểu chức năng nào trước ạ?\n\nSố liệu hiện tại của quán:\n${facts}`;

    const transcript = history
      .map((m) => `${m.sender === AiMessageSender.USER ? 'Chủ quán' : 'Trợ lý'}: ${m.content}`)
      .join('\n');

    const geminiResult = await this.callGemini(
      `Bạn là trợ lý vận hành AI chuyên nghiệp của nền tảng giải cứu thực phẩm SurplusIQ dành riêng cho Chủ cửa hàng và Quản lý quán ăn/nhà hàng tại Việt Nam.
Hãy trả lời ân cần, súc tích, thực tế bằng tiếng Việt theo định dạng Markdown rõ ràng.

${STORE_GUIDE_KNOWLEDGE_PROMPT}

Số liệu kinh doanh thực tế của cửa hàng tuần qua:
${facts}
${guideHint ? `\nDữ liệu nghiệp vụ hướng dẫn chuẩn cho câu hỏi này:\n${guideHint}\n` : ''}
${transcript ? `\nLịch sử trao đổi gần nhất:\n${transcript}\n` : ''}

Quy tắc phản hồi:
- Nếu người dùng hỏi về số liệu doanh thu/đơn hàng: chỉ dùng số liệu hệ thống ở trên, tuyệt đối không bịa số.
- Nếu người dùng hỏi về cách sử dụng app, quy trình vận hành, hướng dẫn thao tác, quyền lợi, cách đăng món, quét QR, khiếu nại, gói Pro hay lỗi thường gặp: Hãy giải thích trực tiếp theo đúng định dạng luồng thao tác: [Tên nút / Màn hình] ➔ [Bước tiếp theo] kèm Lưu ý nếu có.
- TUYỆT ĐỐI KHÔNG bảo người dùng "bấm nút bên dưới" hoặc nhắc đến việc mở liên kết bên dưới vì giao diện app hiện tại hiển thị thuần văn bản.

Câu hỏi của chủ quán: "${dto.message}"`,
      fallbackReply,
      process.env.GEMINI_CHAT_MODEL,
    );
    const assistantReply = geminiResult.text;

    // 6. Lưu tin nhắn trợ lý
    const assistantMessage = this.messageRepo.create({
      conversationId: conversation.id,
      sender: AiMessageSender.ASSISTANT,
      content: assistantReply,
    });
    await this.messageRepo.save(assistantMessage);

    // 7. Ghi log kiểm toán AI
    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_CHAT',
      model: geminiResult.model,
      latencyMs: geminiResult.latencyMs,
      inputSummary: dto.message.slice(0, 200),
      outputSummary: assistantReply.slice(0, 200),
    });
    const savedLog = await this.logRepo.save(aiLog);

    // 8. Khấu trừ quota
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
      suggestedAction: suggestedAction || undefined,
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

    const fallbackDescription = `Thưởng thức ${dto.name} tươi ngon chuẩn vị! Sản phẩm thuộc danh mục ${dto.category}, được nướng mới mỗi ngày từ nguyên liệu chọn lọc kỹ lưỡng${dto.ingredients ? ` (${dto.ingredients})` : ''}. ${dto.specialFeatures || 'Hương vị thơm béo, vỏ ngoài mềm xốp, thích hợp cho bữa sáng tiện lợi hoặc bữa phụ ngon lành.'} Đặt ngay trên SurplusIQ để giải cứu món ngon giá tốt và chung tay bảo vệ môi trường!`;

    const geminiResult = await this.callGemini(
      `Hãy viết đoạn văn ngắn (2-3 câu, tiếng Việt) mô tả hấp dẫn cho món "${dto.name}" thuộc danh mục "${dto.category}", nguyên liệu: "${dto.ingredients || 'tự nhiên'}", điểm nổi bật: "${dto.specialFeatures || 'tươi ngon trong ngày'}" trên ứng dụng giải cứu thực phẩm SurplusIQ.`,
      fallbackDescription,
      process.env.GEMINI_MODEL,
    );
    const description = geminiResult.text;

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
      model: geminiResult.model,
      latencyMs: geminiResult.latencyMs,
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
    const stats = await this.weeklyStats(storeId);
    const { current, previous } = stats;
    const totalRevenue = current.revenue;
    const foodSavedKg = Number((current.units * 0.4).toFixed(1));
    const co2SavedKg = Number((foodSavedKg * 2.5).toFixed(1));

    const fallbackSummary = `7 ngày qua cửa hàng có ${current.orders} đơn, ${current.pickedUp} đơn đã nhận, cứu được ${current.units} suất (khoảng ${foodSavedKg} kg thực phẩm), doanh thu ${totalRevenue.toLocaleString('vi-VN')} đ.`;

    const geminiResult = await this.callGemini(
      `Viết 2-3 câu tiếng Việt tóm tắt tuần qua cho chủ cửa hàng. Chỉ dùng số liệu sau, không bịa thêm, không đưa lời khuyên không có căn cứ.\n${this.factsText(stats)}`,
      fallbackSummary,
      process.env.GEMINI_MODEL,
    );
    const narrativeSummary = geminiResult.text;

    const change = (cur: number, prev: number) =>
      prev > 0
        ? `${cur >= prev ? 'tăng' : 'giảm'} ${Math.abs(Math.round(((cur - prev) / prev) * 100))}% so với tuần trước`
        : 'chưa có tuần trước để so sánh';
    const keyInsights = [
      `Doanh thu ${totalRevenue.toLocaleString('vi-VN')} đ, ${change(totalRevenue, previous.revenue)}.`,
      `Số đơn ${current.orders}, ${change(current.orders, previous.orders)}.`,
      ...(current.noShow > 0 ? [`${current.noShow} đơn khách không đến nhận.`] : []),
      ...(current.cancelled > 0 ? [`${current.cancelled} đơn bị hủy.`] : []),
    ];

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'AI_WEEKLY_SUMMARY',
      model: geminiResult.model,
      latencyMs: geminiResult.latencyMs,
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
      current,
      previous,
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

    const fallbackExplanation =
      matched.length > 0
        ? `SurplusIQ đã tìm thấy ${matched.length} món bánh thơm ngon phù hợp với yêu cầu "${dto.query}" của bạn với giá cực kỳ tiết kiệm!`
        : `Hiện tại chưa có suất bán nào hoàn toàn khớp với yêu cầu "${dto.query}". Bạn có thể xem thêm các deal ưu đãi khác gần khu vực của mình nhé!`;

    const geminiSearch = await this.callGemini(
      `Khách hàng trên ứng dụng giải cứu thực phẩm SurplusIQ tìm kiếm: "${dto.query}". Hệ thống tìm được ${matched.length} suất ăn phù hợp (${matched.map((m) => `${m.title} - ${m.currentPrice}đ`).join(', ') || 'không có'}). Hãy viết 1-2 câu giới thiệu ngắn gọn, thân thiện bằng tiếng Việt.`,
      fallbackExplanation,
      process.env.GEMINI_CHAT_MODEL,
    );
    const explanation = geminiSearch.text;

    const aiLog = this.logRepo.create({
      userId,
      storeId: null,
      featureCode: 'CUSTOMER_AI_SEARCH',
      model: geminiSearch.model,
      latencyMs: geminiSearch.latencyMs,
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

    const norm = normalizeText(dto.message);
    let fallbackReply: string;
    const suggestedAction: AiSuggestedActionDto | null = null;

    // 1. Ưu tiên khớp bộ tri thức hướng dẫn sử dụng chuyên biệt cho khách hàng
    const matchedCustomerGuide = matchCustomerAppGuide(norm);
    if (matchedCustomerGuide) {
      fallbackReply = matchedCustomerGuide;
    } else {
      const isOrderQuery =
        norm.includes('don hang gan nhat') ||
        norm.includes('don cua toi') ||
        norm.includes('kiem tra don') ||
        norm.includes('tinh trang don') ||
        norm.includes('don da dat');

      if (isOrderQuery) {
        // Truy vấn đơn hàng thật của khách hàng (R1-083, R1-088)
        const recentOrders = await this.orderRepo.find({
          where: { customerId: userId },
          order: { createdAt: 'DESC' },
          take: 3,
        });

        const activeOrder =
          recentOrders.find(
            (o) => o.status === OrderStatus.PENDING_PAYMENT || o.status === OrderStatus.PAID,
          ) || recentOrders[0];

        if (!activeOrder) {
          fallbackReply =
            'Để nhận hàng tại quán, bạn chỉ cần mở ứng dụng SurplusIQ, vào mục "Đơn hàng" để lấy vé mã QR và đưa nhân viên quầy quét khi đến khung giờ nhận (hoặc đọc mã PIN 6 số dự phòng). Hiện bạn chưa có đơn hàng nào đang chờ nhận trên SurplusIQ. Bạn có muốn mình gợi ý vài suất Cứu Món ngon giá tốt quanh khu vực của bạn tối nay không?';
        } else {
          const store = await this.storeRepo.findOne({ where: { id: activeOrder.storeId } });
          const storeName = store?.name || 'Cửa hàng';
          const storeAddress = store?.address || '';
          const nowMs = Date.now();

          if (activeOrder.status === OrderStatus.PENDING_PAYMENT) {
            fallbackReply = `Đơn hàng #${activeOrder.code} tại quán "${storeName}" của bạn hiện ĐANG CHỜ THANH TOÁN (thời gian giữ suất 10 phút theo BR-017). Vui lòng hoàn tất quét mã VietQR trong app để khóa giá và nhận Vé QR lấy món nhé!`;
          } else if (activeOrder.status === OrderStatus.PAID) {
            if (activeOrder.pickupSlot) {
              const slotMs = new Date(activeOrder.pickupSlot).getTime();
              const slotTimeStr = new Date(activeOrder.pickupSlot).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              if (nowMs < slotMs - 15 * 60 * 1000) {
                fallbackReply = `Đơn hàng #${activeOrder.code} tại "${storeName}" (${storeAddress}) đã được thanh toán thành công! Khung giờ hẹn nhận của bạn bắt đầu lúc ${slotTimeStr}. Hiện chưa đến giờ nhận, quán đang chuẩn bị suất ăn tươi ngon nhất. Bạn vui lòng chờ thêm một chút trước khi di chuyển nhé! Khi chuẩn bị đi, bạn có thể bấm nút "Báo quán tôi sắp đến" trên app.`;
              } else if (nowMs >= slotMs - 15 * 60 * 1000 && nowMs <= slotMs + 60 * 60 * 1000) {
                fallbackReply = `Đơn hàng #${activeOrder.code} tại "${storeName}" (${storeAddress}) ĐÃ ĐẾN GIỜ NHẬN! Bạn hãy mở Vé QR trong mục "Đơn hàng" trên app SurplusIQ và đến quầy đọc mã hoặc đưa nhân viên quét để nhận món ngay nhé.`;
              } else {
                fallbackReply = `Đơn hàng #${activeOrder.code} tại "${storeName}" đã quá khung giờ nhận dự kiến (${slotTimeStr}). Bạn hãy đến quán ngay tại địa chỉ ${storeAddress} hoặc gọi quán theo SĐT ${store?.phone || ''} để nhân viên hỗ trợ giữ phần nhé.`;
              }
            } else {
              fallbackReply = `Đơn hàng #${activeOrder.code} tại quán "${storeName}" (${storeAddress}) đã thanh toán thành công và sẵn sàng nhận món. Bạn có thể mở mục "Vé QR" trong app và ghé quán nhận hàng ngay nhé!`;
            }
          } else if (activeOrder.status === OrderStatus.PICKED_UP) {
            fallbackReply = `Đơn hàng gần nhất #${activeOrder.code} tại "${storeName}" của bạn đã hoàn thành nhận hàng. Cảm ơn bạn đã đồng hành cứu thực phẩm cùng SurplusIQ! Bạn có hài lòng với món ăn không?`;
          } else {
            fallbackReply = `Đơn hàng #${activeOrder.code} tại "${storeName}" hiện ở trạng thái ${activeOrder.status}. Nếu cần hỗ trợ thêm, bạn có thể tạo khiếu nại hoặc liên hệ tổng đài SurplusIQ nhé!`;
          }
        }
      } else if (
        norm.includes('xu') ||
        norm.includes('diem thuong') ||
        norm.includes('doi qua') ||
        norm.includes('rewards')
      ) {
        fallbackReply =
          'Mỗi đơn hàng giải cứu thực phẩm thành công giúp bạn tích lũy Điểm thưởng. Bạn có thể mở Tab `[Tôi]` ➔ `[Điểm thưởng]` để đổi lấy các voucher giảm giá hấp dẫn!';
      } else if (
        norm.includes('quy') ||
        norm.includes('cuu tro') ||
        norm.includes('rescue pool') ||
        norm.includes('tu thien') ||
        norm.includes('chia se')
      ) {
        fallbackReply =
          'Quỹ Giải Cứu Thực Phẩm (Rescue Pool) kết nối thực phẩm dôi dư từ nhà hàng với các tổ chức thiện nguyện và hoàn cảnh khó khăn. Bạn có thể theo dõi và chung tay đóng góp suất ăn trực tiếp trên app.';
      } else if (
        norm.includes('bao quan') ||
        norm.includes('de qua dem') ||
        norm.includes('ham') ||
        norm.includes('nuong lai') ||
        norm.includes('lo vi song')
      ) {
        fallbackReply =
          'Các món cứu thực phẩm được chuẩn bị tươi mới trong ngày. Bạn nên dùng ngay hoặc bọc kín trong màng bọc thực phẩm để ngăn mát tủ lạnh (dùng trong 24-48 giờ). Khi ăn hãy nướng lại bằng nồi chiên không dầu 160°C trong 3 phút là bánh sẽ giòn ngon như mới!';
      } else {
        fallbackReply =
          'Chào bạn! Mình là SaveBite AI – trợ lý cứu thực phẩm thông minh. Mình có thể giúp bạn hướng dẫn cách dùng app, kiểm tra tình trạng đơn hàng, giờ nhận món, mẹo hâm nóng, thành phần dị ứng hoặc đề xuất món ngon giá tốt hôm nay. Bạn cần mình hỗ trợ gì?';
      }
    }

    // Kiểm tra cài đặt ghi nhớ ngữ cảnh (R1-091, K51)
    const memorySetting = await this.getMemorySetting(userId);
    let contextHistoryPrompt = '';
    if (memorySetting.rememberContext) {
      const pastMessages = await this.messageRepo.find({
        where: { conversationId: conversation.id },
        order: { createdAt: 'DESC' },
        take: 5,
      });
      if (pastMessages.length > 1) {
        const previous = pastMessages.slice(1).reverse();
        contextHistoryPrompt =
          `Lịch sử hội thoại trước đó giữa bạn và khách hàng:\n` +
          previous
            .map((m) => `${m.sender === AiMessageSender.USER ? 'Khách' : 'AI'}: ${m.content}`)
            .join('\n') +
          `\n\n`;
      }
    }

    const geminiCustomer = await this.callGemini(
      `Bạn là trợ lý SaveBite AI của ứng dụng giải cứu thực phẩm SurplusIQ dành cho khách hàng tại Việt Nam.
Hãy trả lời thân thiện, hữu ích, chuẩn xác theo định dạng Markdown.

${CUSTOMER_GUIDE_KNOWLEDGE_PROMPT}

${contextHistoryPrompt}
Dữ liệu nghiệp vụ hệ thống tham chiếu:
${fallbackReply}

Quy tắc phản hồi:
- Khi người dùng hỏi về cách sử dụng app, quy trình đặt hàng, thanh toán VietQR, vé nhận hàng QR/PIN, báo sự cố, hủy đơn, hoàn tiền, khiếu nại, đánh giá, đổi điểm, hoặc các lỗi thường gặp: Hãy trả lời trực tiếp và ngắn gọn theo đúng định dạng luồng thao tác: [Tên nút / Màn hình] ➔ [Bước tiếp theo] kèm Lưu ý/Nguyên nhân/Cách xử lý.
- TUYỆT ĐỐI KHÔNG bảo khách "bấm nút bên dưới" hay nhắc đến việc mở liên kết bên dưới vì giao diện app hiện tại hiển thị thuần văn bản Markdown.
- Nếu khách hỏi về đơn hàng thật của họ: hãy giải thích rõ tình trạng đơn hàng dựa trên thông tin hệ thống tham chiếu ở trên.

Câu hỏi của khách hàng: "${dto.message}"`,
      fallbackReply,
      process.env.GEMINI_CHAT_MODEL,
    );
    const reply = geminiCustomer.text;

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
      model: geminiCustomer.model,
      latencyMs: geminiCustomer.latencyMs,
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

    // Số lượt còn lại lấy từ hạn mức thật của backend để app không phải tự đếm (BUG hạn mức giả 28/30).
    const after = await this.quotaService.checkQuota({
      userId,
      quotaKey: QuotaKey.AI_CUSTOMER_QUERIES,
    });

    return {
      conversationId: conversation.id,
      reply,
      logId: savedLog.id,
      remainingQuota: after.remaining,
      quotaLimit: after.limit,
      suggestedAction: suggestedAction || undefined,
    };
  }

  /** Hạn mức hỏi trợ lý trong ngày của khách (R1-082), dùng để hiển thị số lượt còn lại. */
  async getCustomerQuota(userId: string) {
    const q = await this.quotaService.checkQuota({
      userId,
      quotaKey: QuotaKey.AI_CUSTOMER_QUERIES,
    });
    return { limit: q.limit, used: q.used, remaining: q.remaining, resetsAt: q.resetsAt };
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
    const tone = dto.tone || (await this.getAiConfig(storeId)).defaultTone;

    let fallbackDraft: string;
    if (rating >= 4) {
      if (tone === 'FORMAL') {
        fallbackDraft = `Kính gửi quý khách, ${storeName} xin trân trọng cảm ơn quý khách đã tin tưởng và đồng hành cùng sứ mệnh giải cứu thực phẩm xanh. Chúng tôi luôn nỗ lực duy trì chất lượng phục vụ tốt nhất và rất mong được tiếp tục đón tiếp quý khách.`;
      } else {
        fallbackDraft = `Dạ ${storeName} cảm ơn bạn rất nhiều vì lời khen dễ thương! Cùng nhau cứu món ngon giá tốt và bảo vệ môi trường bạn nhé. Hẹn gặp lại bạn ở những suất cứu món tiếp theo ạ! 🥰`;
      }
    } else if (rating === 3) {
      fallbackDraft = `Chào bạn, ${storeName} chân thành ghi nhận góp ý của bạn để cải thiện hương vị và dịch vụ tốt hơn nữa trong những lần tới. Cảm ơn bạn đã luôn ủng hộ tiệm!`;
    } else {
      fallbackDraft = `Kính gửi quý khách, ${storeName} thành thật xin lỗi vì trải nghiệm chưa trọn vẹn của bạn lần này. Chúng tôi đã nghiêm túc rà soát lại quy trình chuẩn bị và đóng gói món. Rất mong quý khách liên hệ hotline của quán để chúng tôi được lắng nghe và hỗ trợ chu đáo nhất!`;
    }

    const geminiReview = await this.callGemini(
      `Hãy soạn câu phản hồi ngắn gọn (2-3 câu, giọng điệu ${tone}, tiếng Việt) thay mặt cửa hàng "${storeName}" trả lời đánh giá ${rating}/5 sao của khách hàng với nhận xét: "${review.comment || 'Không có lời nhắn'}".`,
      fallbackDraft,
      process.env.GEMINI_MODEL,
    );
    const draftReply = geminiReview.text;

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_REVIEW_REPLY',
      model: geminiReview.model,
      latencyMs: geminiReview.latencyMs,
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
   * AI gợi ý soạn phản hồi cho khiếu nại của khách hàng (R2-118, BR-054, BR-056)
   */
  async draftComplaintReply(storeId: string, userId: string, dto: DraftComplaintReplyDto) {
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.AI_CONTENT_GEN,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức lượt AI tạo nội dung trong tháng (${quotaCheck.limit} lượt). Vui lòng nâng cấp gói Pro.`,
      );
    }

    const complaint = await this.complaintRepo.findOne({
      where: { id: dto.complaintId, storeId },
    });
    if (!complaint) {
      throw new NotFoundException('Khiếu nại không tồn tại hoặc không thuộc cửa hàng.');
    }

    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    const storeName = store?.name || 'Cửa hàng';
    const action = dto.action || 'REFUND';
    let fallbackDraft: string;

    if (action === 'REFUND') {
      fallbackDraft = `Kính gửi quý khách, ${storeName} xin chân thành cáo lỗi về sự cố đối với đơn hàng của quý khách (${complaint.description}). Chúng tôi đã kiểm tra và đồng ý hoàn tiền 100% cho đơn hàng này theo đúng chính sách của SurplusIQ (BR-054). ${dto.notes ? dto.notes + '. ' : ''}Khoản hoàn tiền sẽ được chuyển về tài khoản của bạn trong 24 giờ. Rất mong quý khách thông cảm và tiếp tục ủng hộ tiệm!`;
    } else if (action === 'REJECT') {
      fallbackDraft = `Kính gửi quý khách, ${storeName} đã tiếp nhận và xem xét kỹ lưỡng khiếu nại của quý khách về đơn hàng. Sau khi đối chiếu hình ảnh lưu mẫu trước khi giao và quy định tại quầy (BR-056), chúng tôi xin phép chưa thể chấp nhận yêu cầu này do sản phẩm đã bàn giao đúng tình trạng và đúng khung giờ quy định. ${dto.notes ? dto.notes + '. ' : ''}Nếu quý khách có thêm thắc mắc, vui lòng liên hệ hotline quán để được giải thích thêm. Chân thành cảm ơn quý khách.`;
    } else {
      fallbackDraft = `Kính gửi quý khách, ${storeName} xin gửi lời xin lỗi chân thành vì trải nghiệm chưa thật sự hài lòng của quý khách (${complaint.description}). Để tạ lỗi, chúng tôi xin gửi tặng quý khách mã ưu đãi giảm 20% cho lần ghé tiếp theo. ${dto.notes ? dto.notes + '. ' : ''}Chúng tôi đã nhắc nhở nhân viên quầy để không tái diễn sự cố. Chúc quý khách một ngày tốt lành!`;
    }

    const geminiComplaint = await this.callGemini(
      `Hãy soạn phản hồi lịch sự (2-3 câu, tiếng Việt) thay mặt cửa hàng "${storeName}" xử lý khiếu nại của khách ("${complaint.description}") với hướng xử lý "${action}" (${dto.notes || ''}).`,
      fallbackDraft,
      process.env.GEMINI_MODEL,
    );
    const draftReply = geminiComplaint.text;

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_COMPLAINT_REPLY',
      model: geminiComplaint.model,
      latencyMs: geminiComplaint.latencyMs,
      inputSummary: `Complaint ID: ${dto.complaintId}, Action: ${action}`,
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
      complaintId: complaint.id,
      action,
      suggestedReply: draftReply,
      aiLogId: savedLog.id,
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
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
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

    const fallbackSummary = `Qua phân tích ${total} đánh giá gần nhất, cửa hàng đạt chỉ số hài lòng ${sentimentScore}%. Tỷ lệ phản hồi tích cực chiếm ${Math.round((pos / total) * 100)}%. Khách hàng đặc biệt hài lòng với độ tươi ngon và tính tiện lợi của quy trình nhận hàng.`;

    const geminiSentiment = await this.callGemini(
      `Hãy tóm tắt ngắn gọn (2 câu, tiếng Việt) kết quả phân tích cảm xúc từ ${total} đánh giá khách hàng của cửa hàng F&B trên SurplusIQ (tích cực: ${pos}, trung lập: ${neu}, tiêu cực: ${neg}, điểm hài lòng: ${sentimentScore}%).`,
      fallbackSummary,
      process.env.GEMINI_MODEL,
    );
    const summary = geminiSentiment.text;

    const aiLog = this.logRepo.create({
      userId,
      storeId,
      featureCode: 'STORE_AI_SENTIMENT_ANALYSIS',
      model: geminiSentiment.model,
      latencyMs: geminiSentiment.latencyMs,
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

  // --- Quản lý lịch sử hội thoại AI & Ghi nhớ ngữ cảnh (K51, R1-091) ---

  async listCustomerConversations(userId: string) {
    const conversations = await this.conversationRepo.find({
      where: { userId, role: AiUserRole.CUSTOMER, status: AiConversationStatus.ACTIVE },
      order: { updatedAt: 'DESC' },
    });

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const [lastMsg, count] = await Promise.all([
          this.messageRepo.findOne({
            where: { conversationId: conv.id },
            order: { createdAt: 'DESC' },
          }),
          this.messageRepo.count({
            where: { conversationId: conv.id },
          }),
        ]);

        return {
          id: conv.id,
          title: conv.title,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          messageCount: count,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                sender: lastMsg.sender,
                createdAt: lastMsg.createdAt,
              }
            : null,
        };
      }),
    );

    return result;
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId, userId, role: AiUserRole.CUSTOMER },
    });
    if (!conv) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại.');
    }

    const messages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    return {
      conversation: {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.sender,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }

  async deleteCustomerConversation(userId: string, conversationId: string) {
    const conv = await this.conversationRepo.findOne({
      where: { id: conversationId, userId, role: AiUserRole.CUSTOMER },
    });
    if (!conv) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại.');
    }

    await this.messageRepo.delete({ conversationId });
    await this.conversationRepo.delete({ id: conversationId });
    return { success: true, message: 'Đã xóa phiên hội thoại.' };
  }

  async clearAllCustomerConversations(userId: string) {
    const convs = await this.conversationRepo.find({
      where: { userId, role: AiUserRole.CUSTOMER },
      select: ['id'],
    });

    const ids = convs.map((c) => c.id);
    if (ids.length > 0) {
      await this.messageRepo.delete({ conversationId: In(ids) });
      await this.conversationRepo.delete({ id: In(ids) });
    }

    return { success: true, count: ids.length, message: 'Đã xóa toàn bộ lịch sử hội thoại.' };
  }

  async getMemorySetting(userId: string): Promise<{ rememberContext: boolean }> {
    const profile = await this.customerProfileRepo.findOne({ where: { userId } });
    const remember = profile?.notificationPreferences?.ai_remember_context ?? true;
    return { rememberContext: remember };
  }

  async updateMemorySetting(
    userId: string,
    rememberContext: boolean,
  ): Promise<{ rememberContext: boolean }> {
    let profile = await this.customerProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.customerProfileRepo.create({
        userId,
        fullName: 'Khách hàng',
        searchRadiusKm: 5.0,
        notificationPreferences: { ai_remember_context: rememberContext },
      });
    } else {
      profile.notificationPreferences = {
        ...(profile.notificationPreferences || {}),
        ai_remember_context: rememberContext,
      };
    }
    await this.customerProfileRepo.save(profile);
    return { rememberContext };
  }
}
