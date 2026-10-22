import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThan, MoreThanOrEqual } from 'typeorm';
import { ItemEntity, ItemStatus } from '../../entities/catalog/item.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import {
  ForecastEntity,
  ForecastConfidence,
  ForecastMethod,
} from '../../entities/reconciliation/forecast.entity';
import {
  PriceProposalEntity,
  ProposalStatus,
} from '../../entities/reconciliation/price-proposal.entity';
import { DecisionEntity } from './decision.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { SpecialEventEntity } from '../../entities/reconciliation/special-event.entity';
import { ActionCardEntity, ActionCardStatus } from '../../entities/ai/action-card.entity';
import { DonationRecordEntity } from '../../entities/ai/donation-record.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { OverrideForecastDto, LogDailyActualDto, CreateSpecialEventDto } from './dto/decisions.dto';
import {
  DynamicPricingEngine,
  ForecastingEngine,
  AnomalyDetectionEngine,
  type DailyMetricRecord,
} from '@surplusiq/core';

@Injectable()
export class DecisionsService {
  private readonly logger = new Logger(DecisionsService.name);

  constructor(
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(DailyActualEntity)
    private readonly dailyActualRepo: Repository<DailyActualEntity>,
    @InjectRepository(ForecastEntity)
    private readonly forecastRepo: Repository<ForecastEntity>,
    @InjectRepository(PriceProposalEntity)
    private readonly proposalRepo: Repository<PriceProposalEntity>,
    @InjectRepository(DecisionEntity)
    private readonly decisionRepo: Repository<DecisionEntity>,
    @InjectRepository(StoreSettingsEntity)
    private readonly settingsRepo: Repository<StoreSettingsEntity>,
    @InjectRepository(SpecialEventEntity)
    private readonly specialEventRepo: Repository<SpecialEventEntity>,
    @InjectRepository(ActionCardEntity)
    private readonly actionCardRepo: Repository<ActionCardEntity>,
    @InjectRepository(DonationRecordEntity)
    private readonly donationRecordRepo: Repository<DonationRecordEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
  ) {}

  /**
   * Tính toán hoặc lấy dự báo số lượng sản xuất cho ngày mai (R2-036..R2-043)
   */
  async getForecasts(storeId: string, targetDate?: string) {
    const tomorrow = new Date(Date.now() + 31 * 60 * 60 * 1000); // ngày mai theo giờ Việt Nam
    const date = targetDate || tomorrow.toISOString().split('T')[0];
    const targetDayOfWeek = new Date(date).getUTCDay();

    const items = await this.itemRepo.find({
      where: { storeId, status: ItemStatus.ACTIVE },
    });

    const results = [];

    for (const item of items) {
      let forecast = await this.forecastRepo.findOne({
        where: { storeId, itemId: item.id, targetDate: date },
      });

      if (!forecast) {
        const actuals = await this.dailyActualRepo.find({
          where: { storeId, itemId: item.id },
          order: { date: 'ASC' },
        });

        const history = actuals.map((a) => ({
          date: a.date,
          produced: a.produced,
          soldOffline: a.soldOffline,
          soldApp: a.soldApp,
          dayOfWeek: new Date(a.date).getUTCDay(),
          stockoutEarly: Boolean(a.stockoutAt),
        }));

        const engineOutput = ForecastingEngine.generateForecast({
          itemId: item.id,
          targetDate: date,
          targetDayOfWeek,
          history,
        });

        forecast = this.forecastRepo.create({
          storeId,
          itemId: item.id,
          targetDate: date,
          recommended: engineOutput.recommended,
          low: engineOutput.low,
          high: engineOutput.high,
          confidence: engineOutput.confidence as unknown as ForecastConfidence,
          method:
            engineOutput.method === 'DOW_AVERAGE'
              ? ForecastMethod.DOW_AVG
              : engineOutput.method === 'MANUAL_REQUIRED'
                ? ForecastMethod.MANUAL_REQUIRED
                : ForecastMethod.YESTERDAY_FALLBACK,
          components: engineOutput.components,
        });

        await this.forecastRepo.save(forecast);

        // Lưu quyết định gợi ý vào bảng decisions
        const decision = this.decisionRepo.create({
          storeId,
          decisionType: 'FORECAST',
          inputSnapshot: { itemId: item.id, targetDate: date, historyDays: history.length },
          outputRecommendation: engineOutput as unknown as Record<string, unknown>,
          rationale: engineOutput.explanation,
          wasAcceptedByStore: false,
        });
        await this.decisionRepo.save(decision);
      }

      const historyDays = Number(forecast.components?.historyDaysCount ?? 0);
      const isLowConfidence = forecast.confidence === ForecastConfidence.LOW || historyDays < 14;
      const dayName =
        ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][
          new Date(forecast.targetDate).getUTCDay()
        ] || 'ngày mai';

      const explanation = forecast.overrideReason
        ? `Số lượng đã được chủ quán điều chỉnh sang ${forecast.chosenQuantity} suất (Lý do: ${forecast.overrideReason}). Khuyến nghị gốc của hệ thống: ${forecast.recommended} suất.`
        : historyDays < 14
          ? `Dự báo ${dayName} cho món "${item.name}" áp dụng phương pháp Fallback theo doanh số ngày gần nhất do quán chưa đủ 14 ngày dữ liệu lịch sử bán hàng (BR-060). Khoảng khuyến nghị: ${forecast.low}–${forecast.high} sản phẩm. Độ tin cậy: THẤP.`
          : `Dự báo ${dayName} cho món "${item.name}" dựa trên trung bình dữ liệu các ngày cùng thứ (${forecast.components?.dowSampleCount || 2} ngày cùng thứ, mức trung bình ~${forecast.recommended} sản phẩm). Khoảng khuyến nghị an toàn: ${forecast.low}–${forecast.high} suất. Độ tin cậy: ${forecast.confidence}.`;

      const warning = isLowConfidence
        ? '⚠️ Cảnh báo độ tin cậy THẤP: Cửa hàng chưa có đủ 14 ngày dữ liệu bán hàng chuẩn. Sai số dự báo có thể lớn.'
        : null;

      const fallbackSuggestions = isLowConfidence
        ? [
            {
              id: 'FALLBACK_YESTERDAY',
              title: 'Phương án 1: Sản xuất theo mức bán hôm qua',
              description: `Sản xuất an toàn ${forecast.recommended} sản phẩm (khớp với doanh số ngày gần nhất).`,
              recommendedQuantity: forecast.recommended,
            },
            {
              id: 'FALLBACK_LOWER_BOUND',
              title: 'Phương án 2: Sản xuất theo cận dưới an toàn',
              description: `Sản xuất ${forecast.low} sản phẩm và chuẩn bị kích hoạt mở bán Cứu Món sớm nếu dư thừa.`,
              recommendedQuantity: forecast.low,
            },
            {
              id: 'FALLBACK_MANUAL',
              title: 'Phương án 3: Chủ quán tự nhập số lượng kế hoạch',
              description:
                'Chủ động điều chỉnh số lượng thủ công theo ước lượng thời tiết và lượng khách thực tế của quán.',
              recommendedQuantity: forecast.chosenQuantity || forecast.recommended,
            },
          ]
        : [];

      results.push({
        ...forecast,
        explanation,
        warning,
        fallbackSuggestions,
        item: {
          id: item.id,
          name: item.name,
          category: item.category,
          originalPrice: item.originalPrice,
        },
      });
    }

    return results;
  }

  /**
   * Chủ cửa hàng ghi đè số lượng dự báo (R2-041)
   */
  async overrideForecast(storeId: string, forecastId: string, dto: OverrideForecastDto) {
    const forecast = await this.forecastRepo.findOne({
      where: { id: forecastId, storeId },
    });
    if (!forecast) {
      throw new NotFoundException('Dự báo không tồn tại hoặc không thuộc cửa hàng.');
    }

    forecast.chosenQuantity = dto.chosenQuantity;
    forecast.overrideReason = dto.overrideReason || null;

    return this.forecastRepo.save(forecast);
  }

  /**
   * Ghi nhận số liệu sản xuất và bán thực tế cuối ngày (R2-039)
   */
  async logDailyActual(storeId: string, dto: LogDailyActualDto) {
    const item = await this.itemRepo.findOne({
      where: { id: dto.itemId, storeId },
    });
    if (!item) {
      throw new NotFoundException('Sản phẩm không tồn tại trong cửa hàng.');
    }

    let actual = await this.dailyActualRepo.findOne({
      where: { storeId, itemId: dto.itemId, date: dto.date },
    });

    if (actual) {
      actual.produced = dto.produced;
      actual.soldOffline = dto.soldOffline;
      actual.soldApp = dto.soldApp;
      actual.stockoutAt = dto.stockoutAt ? new Date(dto.stockoutAt) : null;
    } else {
      actual = this.dailyActualRepo.create({
        storeId,
        itemId: dto.itemId,
        date: dto.date,
        produced: dto.produced,
        soldOffline: dto.soldOffline,
        soldApp: dto.soldApp,
        stockoutAt: dto.stockoutAt ? new Date(dto.stockoutAt) : null,
      });
    }

    return this.dailyActualRepo.save(actual);
  }

  /**
   * Lấy danh sách các đề xuất giá động đang chờ phê duyệt (R2-047)
   */
  async getPricingProposals(storeId: string) {
    const offers = await this.offerRepo.find({
      where: { storeId },
    });
    const offerIds = offers.map((o) => o.id);
    if (offerIds.length === 0) {
      return [];
    }

    const proposals = await this.proposalRepo.find({
      where: {
        offerId: In(offerIds),
        status: ProposalStatus.PENDING,
        expiresAt: MoreThan(new Date()), // đề xuất hết hiệu lực không còn chờ duyệt
      },
      order: { createdAt: 'DESC' },
    });

    const offerMap = new Map(offers.map((o) => [o.id, o]));

    return proposals.map((p) => ({
      ...p,
      offer: offerMap.get(p.offerId) || null,
    }));
  }

  /**
   * Khởi tạo đề xuất định giá động thời gian thực cho một suất bán (R2-044..R2-048)
   */
  async proposeDynamicPrice(storeId: string, offerId: string) {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, storeId },
    });
    if (!offer) {
      throw new NotFoundException('Suất bán không tồn tại hoặc không thuộc cửa hàng.');
    }

    if (offer.status !== OfferStatus.OPEN) {
      throw new BadRequestException('Chỉ có thể đề xuất giá cho suất bán đang mở bán (OPEN).');
    }

    const settings = await this.settingsRepo.findOne({ where: { storeId } });
    const floorRatio = settings?.floorRatio ? Number(settings.floorRatio) : 0.4;

    const output = DynamicPricingEngine.proposeDynamicPrice({
      offerId: offer.id,
      originalPrice: offer.originalPrice,
      currentPrice: offer.currentPrice,
      floorPrice: offer.floorPrice,
      floorRatio,
      initialQuantity: offer.totalQuantity,
      remainingQuantity: offer.remainingQuantity,
      pickupStart: offer.pickupStart,
      pickupEnd: offer.pickupEnd,
      now: new Date(),
      priceChangeCount: offer.priceChangeCount,
    });

    if (!output.canPropose) {
      return {
        canPropose: false,
        reasonCode: output.reasonCode,
        explanation: output.explanation,
        currentPrice: offer.currentPrice,
      };
    }

    // Tạo đề xuất giá mới với hạn phê duyệt 15 phút
    const proposal = this.proposalRepo.create({
      offerId,
      oldPrice: offer.currentPrice,
      proposedPrice: output.proposedPrice,
      components: output.components as unknown as Record<string, unknown>,
      status: ProposalStatus.PENDING,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const savedProposal = await this.proposalRepo.save(proposal);

    // Ghi nhận quyết định hệ thống
    const decision = this.decisionRepo.create({
      storeId,
      decisionType: 'DYNAMIC_PRICING',
      inputSnapshot: {
        offerId,
        currentPrice: offer.currentPrice,
        remainingQuantity: offer.remainingQuantity,
      },
      outputRecommendation: output as unknown as Record<string, unknown>,
      rationale: output.explanation,
      wasAcceptedByStore: false,
    });
    await this.decisionRepo.save(decision);

    return {
      canPropose: true,
      proposal: savedProposal,
      explanation: output.explanation,
      components: output.components,
    };
  }

  /**
   * Phê duyệt đề xuất giá và cập nhật giá bán tức thì (R2-047, BR-064)
   */
  async acceptPriceProposal(storeId: string, proposalId: string, userId: string) {
    const proposal = await this.proposalRepo.findOne({
      where: { id: proposalId },
    });
    if (!proposal) {
      throw new NotFoundException('Đề xuất giá không tồn tại.');
    }

    const offer = await this.offerRepo.findOne({
      where: { id: proposal.offerId, storeId },
    });
    if (!offer) {
      throw new NotFoundException('Suất bán liên quan không thuộc cửa hàng này.');
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('Đề xuất giá này không còn ở trạng thái chờ duyệt.');
    }

    if (new Date() > new Date(proposal.expiresAt)) {
      proposal.status = ProposalStatus.EXPIRED;
      await this.proposalRepo.save(proposal);
      throw new BadRequestException('Đề xuất giá đã hết hạn 15 phút, vui lòng đề xuất lại.');
    }

    // Cập nhật giá suất bán
    offer.currentPrice = proposal.proposedPrice;
    offer.priceChangeCount += 1;
    await this.offerRepo.save(offer);

    // Cập nhật trạng thái đề xuất
    proposal.status = ProposalStatus.APPROVED;
    proposal.decidedBy = userId;
    proposal.decidedAt = new Date();
    await this.proposalRepo.save(proposal);

    return {
      success: true,
      message: `Đã áp dụng mức giá mới ${proposal.proposedPrice} VND thành công.`,
      newPrice: proposal.proposedPrice,
    };
  }

  /**
   * Từ chối đề xuất giá (R2-047)
   */
  async rejectPriceProposal(storeId: string, proposalId: string, userId: string) {
    const proposal = await this.proposalRepo.findOne({
      where: { id: proposalId },
    });
    if (!proposal) {
      throw new NotFoundException('Đề xuất giá không tồn tại.');
    }

    const offer = await this.offerRepo.findOne({
      where: { id: proposal.offerId, storeId },
    });
    if (!offer) {
      throw new NotFoundException('Suất bán liên quan không thuộc cửa hàng này.');
    }

    proposal.status = ProposalStatus.REJECTED;
    proposal.decidedBy = userId;
    proposal.decidedAt = new Date();
    await this.proposalRepo.save(proposal);

    return {
      success: true,
      message: 'Đã từ chối áp dụng đề xuất giá.',
    };
  }

  /**
   * Danh sách các sự kiện đặc biệt tác động dự báo (R2-040)
   */
  async getSpecialEvents(storeId: string) {
    return this.specialEventRepo.find({
      where: { storeId },
      order: { date: 'ASC' },
    });
  }

  /**
   * Tạo sự kiện đặc biệt mới (R2-040)
   */
  async createSpecialEvent(storeId: string, dto: CreateSpecialEventDto) {
    const event = this.specialEventRepo.create({
      storeId,
      date: dto.date,
      type: dto.type,
      impactFactor: dto.impactFactor,
    });
    return this.specialEventRepo.save(event);
  }

  /**
   * Xóa sự kiện đặc biệt (R2-040)
   */
  async deleteSpecialEvent(storeId: string, eventId: string) {
    const event = await this.specialEventRepo.findOne({
      where: { id: eventId, storeId },
    });
    if (!event) {
      throw new NotFoundException('Sự kiện đặc biệt không tồn tại hoặc không thuộc cửa hàng.');
    }
    await this.specialEventRepo.delete({ id: eventId });
    return { success: true, message: 'Đã xóa sự kiện đặc biệt thành công.' };
  }

  /**
   * Phát hiện bất thường kinh doanh và hao hụt sử dụng Median Absolute Deviation (MAD > 2.5) (R2-112, BR-096)
   */
  async detectAnomalies(storeId: string, sensitivity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM') {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Lấy số liệu các ngày gần nhất từ daily_actuals và orders
    const actuals = await this.dailyActualRepo.find({
      where: { storeId },
      order: { date: 'ASC' },
    });

    const orders = await this.orderRepo.find({
      where: { storeId },
      order: { createdAt: 'ASC' },
    });

    const events = await this.specialEventRepo.find({ where: { storeId } });
    const eventDates = new Set(events.map((e) => e.date));

    // Nhóm theo ngày
    const dateMap = new Map<string, DailyMetricRecord>();

    for (const act of actuals) {
      const d = act.date;
      const dayOfWeek = new Date(d).getUTCDay();
      const existing = dateMap.get(d) || {
        date: d,
        dayOfWeek,
        revenue: 0,
        wasteQuantity: 0,
        ordersCount: 0,
        noShowRate: 0,
        isSpecialEvent: eventDates.has(d),
      };
      existing.wasteQuantity =
        (existing.wasteQuantity || 0) + (act.produced - act.soldOffline - act.soldApp);
      dateMap.set(d, existing);
    }

    for (const ord of orders) {
      const vn = new Date(ord.createdAt.getTime() + 7 * 3_600_000); // ngày theo giờ Việt Nam
      const d = vn.toISOString().split('T')[0];
      const dayOfWeek = vn.getUTCDay();
      const existing = dateMap.get(d) || {
        date: d,
        dayOfWeek,
        revenue: 0,
        wasteQuantity: 0,
        ordersCount: 0,
        noShowRate: 0,
        isSpecialEvent: eventDates.has(d),
      };
      existing.revenue = (existing.revenue || 0) + ord.totalAmount;
      existing.ordersCount = (existing.ordersCount || 0) + 1;
      dateMap.set(d, existing);
    }

    const history = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Đảm bảo có bản ghi target cho ngày hôm nay nếu chưa có
    let targetMetrics = history.find((h) => h.date === todayStr);
    if (!targetMetrics && history.length > 0) {
      targetMetrics = history[history.length - 1];
    }

    if (!targetMetrics) {
      return {
        storeId,
        isEligible: false,
        reason: 'Chưa có đủ dữ liệu lịch sử để phát hiện bất thường (R2-112).',
        anomalies: [],
      };
    }

    return AnomalyDetectionEngine.detect({
      storeId,
      targetDate: targetMetrics.date,
      targetMetrics,
      history,
      config: {
        minHistoryDays: 1, // Hỗ trợ dev/demo
        sensitivity,
      },
    });
  }

  /**
   * Danh sách thẻ hành động AI thông minh (R2-114, R2-115)
   */
  async getActionCards(storeId: string) {
    await this.generateActionCards(storeId);
    const cards = await this.actionCardRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });

    return cards;
  }

  /**
   * Sinh thẻ đề xuất từ dữ liệu thật (R2-114): món có suất đã đóng trong 14 ngày mà bán được dưới 50%
   * (từ 10 suất trở lên) thì đề xuất giảm số suất mở bán. Không tạo trùng nếu đã có thẻ cho món đó trong 7 ngày.
   */
  async generateActionCards(storeId: string, now = new Date()) {
    const day = 24 * 60 * 60 * 1000;
    const offers = await this.offerRepo.find({
      where: {
        storeId,
        pickupEnd: Between(new Date(now.getTime() - 14 * day), now),
      },
    });
    const byItem = new Map<string, { offered: number; sold: number }>();
    for (const o of offers) {
      if (!o.itemId) continue;
      const cur = byItem.get(o.itemId) ?? { offered: 0, sold: 0 };
      cur.offered += o.totalQuantity;
      // soldQuantity không được cập nhật khi có đơn; số đã giữ/bán = tổng - còn lại.
      cur.sold += o.totalQuantity - o.remainingQuantity;
      byItem.set(o.itemId, cur);
    }

    const weak = Array.from(byItem.entries()).filter(
      ([, v]) => v.offered >= 10 && v.sold / v.offered < 0.5,
    );
    if (weak.length === 0) return 0;

    const recent = await this.actionCardRepo.find({
      where: { storeId, createdAt: MoreThanOrEqual(new Date(now.getTime() - 7 * day)) },
    });
    const existing = new Set(recent.map((c) => (c.payload as { itemId?: string })?.itemId));
    const items = await this.itemRepo.find({ where: { id: In(weak.map(([id]) => id)) } });

    let created = 0;
    for (const [itemId, v] of weak) {
      if (existing.has(itemId)) continue;
      const name = items.find((i) => i.id === itemId)?.name ?? 'Món này';
      const pct = Math.round((v.sold / v.offered) * 100);
      await this.actionCardRepo.save(
        this.actionCardRepo.create({
          storeId,
          actionType: 'ADJUST_QUANTITY',
          payload: { itemId, offered: v.offered, sold: v.sold },
          reasonText: `${name} chỉ bán được ${v.sold}/${v.offered} suất (${pct}%) trong 14 ngày qua.`,
          expectedOutcome: `Giảm số suất mở bán để bớt khoảng ${v.offered - v.sold} suất tồn mỗi 14 ngày.`,
          status: ActionCardStatus.PENDING,
          expiresAt: new Date(now.getTime() + 3 * day),
        }),
      );
      created++;
    }
    return created;
  }

  /**
   * Giải thích bất thường (R2-113): so số đơn của ngày đó theo giờ và theo món với mức trung bình mỗi ngày
   * của 28 ngày trước, liệt kê các yếu tố lệch nhiều nhất. Chỉ nêu số liệu, không suy đoán nguyên nhân ngoài hệ thống.
   */
  async explainAnomaly(storeId: string, date: string) {
    const target = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(target.getTime())) {
      throw new BadRequestException('Ngày không hợp lệ, cần dạng YYYY-MM-DD.');
    }
    const day = 24 * 60 * 60 * 1000;
    const orders = await this.orderRepo.find({
      where: {
        storeId,
        createdAt: Between(new Date(target.getTime() - 28 * day), new Date(target.getTime() + day)),
      },
    });
    const offers = orders.length
      ? await this.offerRepo.find({
          where: { id: In(Array.from(new Set(orders.map((o) => o.offerId)))) },
        })
      : [];
    const itemIds = Array.from(
      new Set(offers.map((o) => o.itemId).filter((x): x is string => !!x)),
    );
    const items = itemIds.length ? await this.itemRepo.find({ where: { id: In(itemIds) } }) : [];
    const nameOf = (offerId: string) =>
      items.find((i) => i.id === offers.find((o) => o.id === offerId)?.itemId)?.name ??
      'Món không định danh';

    const actual = new Map<string, number>();
    const past = new Map<string, number>();
    for (const o of orders) {
      const t = new Date(o.createdAt).getTime();
      const hour = new Date(t + 7 * 3_600_000).getUTCHours();
      const keys = [`HOUR|${String(hour).padStart(2, '0')}:00`, `ITEM|${nameOf(o.offerId)}`];
      const bucket = t >= target.getTime() ? actual : past;
      for (const k of keys) bucket.set(k, (bucket.get(k) ?? 0) + 1);
    }

    const factors = Array.from(new Set([...actual.keys(), ...past.keys()]))
      .map((k) => {
        const [type, label] = k.split('|');
        const average = Math.round(((past.get(k) ?? 0) / 28) * 10) / 10;
        const value = actual.get(k) ?? 0;
        return {
          type,
          label,
          actual: value,
          average,
          delta: Math.round((value - average) * 10) / 10,
        };
      })
      .filter((f) => Math.abs(f.delta) >= 1)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);

    return {
      date,
      factors,
      note: 'So số đơn của ngày này với trung bình mỗi ngày của 28 ngày trước. Chỉ là yếu tố liên quan, chưa chắc là nguyên nhân.',
    };
  }

  /**
   * Áp dụng thẻ hành động (R2-114)
   */
  async applyActionCard(storeId: string, cardId: string) {
    const card = await this.actionCardRepo.findOne({
      where: { id: cardId, storeId },
    });
    if (!card) {
      throw new NotFoundException('Thẻ hành động không tồn tại.');
    }
    card.status = ActionCardStatus.ACCEPTED;
    await this.actionCardRepo.save(card);
    return {
      success: true,
      cardId: card.id,
      status: card.status,
      message:
        'Đã ghi nhận chấp nhận. Hệ thống không tự đổi giá hay tồn kho, hãy thực hiện thay đổi ở màn tương ứng.',
    };
  }

  /**
   * Bỏ qua thẻ hành động (R2-114)
   */
  async dismissActionCard(storeId: string, cardId: string) {
    const card = await this.actionCardRepo.findOne({
      where: { id: cardId, storeId },
    });
    if (!card) {
      throw new NotFoundException('Thẻ hành động không tồn tại.');
    }
    card.status = ActionCardStatus.REJECTED;
    await this.actionCardRepo.save(card);
    return {
      success: true,
      cardId: card.id,
      status: card.status,
      message: 'Đã bỏ qua thẻ hành động.',
    };
  }

  /**
   * Gợi ý quyên góp từ thiện cho món sắp hết hạn (R2-121)
   */
  async getDonationSuggestions(storeId: string) {
    const offers = await this.offerRepo.find({
      where: { storeId, status: OfferStatus.OPEN },
    });

    const suggestions = offers
      .filter((o) => o.remainingQuantity > 0)
      .map((o) => ({
        offerId: o.id,
        remainingQuantity: o.remainingQuantity,
        pickupSlot: o.pickupEnd,
      }));

    // Đơn vị nhận không còn là danh sách cố định: chỉ đơn vị đã duyệt, ghép theo điều kiện (BR-B03-02/03)
    return {
      suggestions,
      next: { method: 'POST', path: '/store/rescue-bridge/transfers' },
    };
  }

  /**
   * Lịch sử quyên góp từ thiện (R2-121)
   */
  async getDonationRecords(storeId: string) {
    return this.donationRecordRepo.find({
      where: { storeId },
      order: { donatedAt: 'DESC' },
    });
  }
}
