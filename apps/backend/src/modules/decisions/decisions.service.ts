import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import { OverrideForecastDto, LogDailyActualDto } from './dto/decisions.dto';
import { DynamicPricingEngine, ForecastingEngine } from '@surplusiq/core';

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
  ) {}

  /**
   * Tính toán hoặc lấy dự báo số lượng sản xuất cho ngày mai (R2-036..R2-043)
   */
  async getForecasts(storeId: string, targetDate?: string) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const date = targetDate || tomorrow.toISOString().split('T')[0];
    const targetDayOfWeek = new Date(date).getDay();

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
          dayOfWeek: new Date(a.date).getDay(),
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
          method: engineOutput.method as unknown as ForecastMethod,
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

      results.push({
        ...forecast,
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
}
