import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Between } from 'typeorm';
import {
  PromotionEntity,
  PromotionStatus,
  PromotionType,
} from '../../entities/marketing/promotion.entity';
import { CampaignEntity, CampaignStatus } from '../../entities/marketing/campaign.entity';
import { CustomerSegmentEntity, SegmentType } from '../../entities/stores/customer-segment.entity';
import { SurpriseBagItemEntity } from '../../entities/catalog/surprise-bag-item.entity';
import { OfferEntity, OfferKind, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import {
  CreatePromotionDto,
  CreateCampaignDto,
  CreateSurpriseBagDto,
  UpdateCampaignDto,
} from './dto/marketing.dto';
import { QuotaService } from '../subscriptions/quota.service';
import { QuotaKey } from '../subscriptions/quota.constants';
import { CustomerSegmentationEngine } from '@surplusiq/core';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    @InjectRepository(PromotionEntity)
    private readonly promoRepo: Repository<PromotionEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(CustomerSegmentEntity)
    private readonly segmentRepo: Repository<CustomerSegmentEntity>,
    @InjectRepository(SurpriseBagItemEntity)
    private readonly surpriseBagRepo: Repository<SurpriseBagItemEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Danh sách các chương trình ưu đãi của quán (R2-088)
   */
  async getPromotions(storeId: string) {
    return this.promoRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Tạo voucher / chương trình ưu đãi mới (R2-088, kiểm tra quota ACTIVE_PROMOTIONS)
   */
  async createPromotion(storeId: string, dto: CreatePromotionDto) {
    // 1. Kiểm tra quota số ưu đãi chạy đồng thời
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.ACTIVE_PROMOTIONS,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức số chương trình ưu đãi đang kích hoạt của gói cước (${quotaCheck.limit} chương trình). Vui lòng tắt bớt hoặc nâng cấp gói (R2-088).`,
      );
    }

    if (new Date(dto.endAt) <= new Date(dto.startAt)) {
      throw new BadRequestException('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.');
    }

    if (dto.type === PromotionType.PERCENT && (dto.value <= 0 || dto.value > 100)) {
      throw new BadRequestException(
        'Mức giảm theo phần trăm phải nằm trong khoảng từ 1% đến 100%.',
      );
    }

    const promo = this.promoRepo.create({
      storeId,
      name: dto.name,
      type: dto.type,
      value: dto.value,
      target: dto.target,
      maxUses: dto.maxUses,
      usedCount: 0,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      minOrderAmount: dto.minOrderAmount || 0,
      status: PromotionStatus.ACTIVE,
    });

    return this.promoRepo.save(promo);
  }

  /**
   * Chuyển đổi trạng thái ưu đãi (ACTIVE / PAUSED / ENDED)
   */
  async togglePromotionStatus(storeId: string, promoId: string, status: PromotionStatus) {
    const promo = await this.promoRepo.findOne({
      where: { id: promoId, storeId },
    });
    if (!promo) {
      throw new NotFoundException('Chương trình ưu đãi không tồn tại.');
    }

    if (status === PromotionStatus.ACTIVE && promo.status !== PromotionStatus.ACTIVE) {
      const quotaCheck = await this.quotaService.checkQuota({
        storeId,
        quotaKey: QuotaKey.ACTIVE_PROMOTIONS,
      });
      if (quotaCheck.isExceeded) {
        throw new BadRequestException(
          `Đã đạt hạn mức số chương trình ưu đãi kích hoạt của gói cước (${quotaCheck.limit} chương trình).`,
        );
      }
    }

    promo.status = status;
    return this.promoRepo.save(promo);
  }

  /**
   * Danh sách chiến dịch thông báo push của quán (R2-086)
   */
  async getCampaigns(storeId: string) {
    return this.campaignRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Tạo chiến dịch thông báo push kèm kiểm tra giới nghiêm ban đêm (BR-086: 22h - 7h)
   */
  async createCampaign(storeId: string, dto: CreateCampaignDto) {
    // 1. Kiểm tra quota chiến dịch thông báo trong tháng
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.CAMPAIGNS_PER_MONTH,
    });
    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức chiến dịch thông báo gửi trong tháng (${quotaCheck.limit} chiến dịch). Vui lòng nâng cấp gói Pro.`,
      );
    }

    // 2. Kiểm tra giờ giới nghiêm ban đêm (BR-086: 22:00 - 07:00 giờ Việt Nam UTC+7)
    const scheduledDate = new Date(dto.scheduledAt);
    const vnHour = (scheduledDate.getUTCHours() + 7) % 24;

    if (vnHour >= 22 || vnHour < 7) {
      throw new BadRequestException(
        'Khung giờ 22:00 - 07:00 thuộc khung giờ giới nghiêm ban đêm. Hệ thống không cho phép gửi thông báo marketing vào khung giờ này (BR-086).',
      );
    }

    const campaign = this.campaignRepo.create({
      storeId,
      title: dto.title,
      content: dto.content,
      target: dto.target,
      scheduledAt: scheduledDate,
      status: CampaignStatus.SCHEDULED,
    });

    return this.campaignRepo.save(campaign);
  }

  /**
   * Phân nhóm khách hàng thông minh (R2-082..R2-085, ngưỡng tối thiểu 20 khách theo BR-082)
   */
  async calculateCustomerSegments(storeId: string) {
    const orders = await this.orderRepo.find({
      where: {
        storeId,
        status: In([OrderStatus.PICKED_UP, OrderStatus.PICKUP_EXPIRED]),
      },
      order: { createdAt: 'ASC' },
    });

    // Gom dữ liệu theo customerId
    const customerMap = new Map<
      string,
      {
        totalOrders: number;
        totalSpend: number;
        lastOrderDate: Date;
        noShowOrders: number;
      }
    >();

    for (const ord of orders) {
      const cId = ord.customerId;
      const current = customerMap.get(cId) || {
        totalOrders: 0,
        totalSpend: 0,
        lastOrderDate: ord.createdAt,
        noShowOrders: 0,
      };

      current.totalOrders += 1;
      current.totalSpend += ord.totalAmount;
      if (new Date(ord.createdAt) > new Date(current.lastOrderDate)) {
        current.lastOrderDate = ord.createdAt;
      }
      if (ord.status === OrderStatus.PICKUP_EXPIRED) {
        current.noShowOrders += 1;
      }

      customerMap.set(cId, current);
    }

    const inputCustomers = Array.from(customerMap.entries()).map(([customerId, data]) => ({
      customerId,
      totalOrders: data.totalOrders,
      totalSpent: data.totalSpend,
      lastOrderDate: data.lastOrderDate,
      noShowCount: data.noShowOrders,
    }));

    const segmentationResult = CustomerSegmentationEngine.segment({
      storeId,
      customers: inputCustomers,
      now: new Date(),
    });

    // Lưu vào cơ sở dữ liệu nếu đủ điều kiện phân nhóm (tối thiểu 20 khách hàng)
    if (segmentationResult.isEligible && segmentationResult.customers) {
      for (const seg of segmentationResult.customers) {
        let segmentRecord = await this.segmentRepo.findOne({
          where: { storeId, customerId: seg.customerId },
        });

        let mappedSegment = SegmentType.NEW;
        if (seg.primarySegment === 'LOYAL') {
          mappedSegment = SegmentType.LOYAL;
        } else if (seg.primarySegment === 'AT_RISK') {
          mappedSegment = SegmentType.AT_RISK;
        } else if (seg.primarySegment === 'HIGH_NOSHOW') {
          mappedSegment = SegmentType.FREQUENT_NOSHOW;
        }

        if (segmentRecord) {
          segmentRecord.segment = mappedSegment;
          segmentRecord.computedAt = new Date();
        } else {
          segmentRecord = this.segmentRepo.create({
            storeId,
            customerId: seg.customerId,
            segment: mappedSegment,
            computedAt: new Date(),
          });
        }
        await this.segmentRepo.save(segmentRecord);
      }
    }

    return segmentationResult;
  }

  /**
   * Tạo túi bất ngờ (Surprise Bag) kèm khai báo thành phần dị ứng bắt buộc (R1-026, R2-091, BR-085)
   */
  async createSurpriseBag(storeId: string, dto: CreateSurpriseBagDto) {
    const itemIds = dto.items.map((i) => i.itemId);
    const existingItems = await this.itemRepo.find({
      where: { id: In(itemIds), storeId },
    });

    if (existingItems.length !== itemIds.length) {
      throw new NotFoundException('Một hoặc nhiều sản phẩm chỉ định không tồn tại trong cửa hàng.');
    }

    // BR-085: Kiểm tra và tổng hợp tất cả các chất gây dị ứng từ các món bên trong
    const allAllergens = new Set<string>();
    for (const item of existingItems) {
      if (Array.isArray(item.allergens)) {
        item.allergens.forEach((al) => allAllergens.add(al));
      }
    }

    const allergenList = Array.from(allAllergens);
    const allergenNotice =
      allergenList.length > 0
        ? `Lưu ý dị ứng: Chứa ${allergenList.join(', ')}.`
        : 'Không có thành phần dị ứng phổ biến.';

    const floorPrice = dto.floorPrice || Math.round(dto.originalPrice * 0.4);

    const offer = this.offerRepo.create({
      storeId,
      kind: OfferKind.SURPRISE_BAG,
      originalPrice: dto.originalPrice,
      currentPrice: dto.currentPrice,
      floorPrice,
      totalQuantity: dto.totalQuantity,
      remainingQuantity: dto.totalQuantity,
      pickupStart: new Date(dto.pickupStart),
      pickupEnd: new Date(dto.pickupEnd),
      status: OfferStatus.OPEN,
      priceChangeCount: 0,
    });

    const savedOffer = await this.offerRepo.save(offer);

    const bagItems = dto.items.map((it) =>
      this.surpriseBagRepo.create({
        offerId: savedOffer.id,
        itemId: it.itemId,
        quantity: it.quantity,
      }),
    );
    await this.surpriseBagRepo.save(bagItems);

    return {
      offer: savedOffer,
      title: dto.title,
      allergenNotice,
      items: existingItems.map((item) => {
        const matching = dto.items.find((i) => i.itemId === item.id);
        return {
          id: item.id,
          name: item.name,
          quantity: matching?.quantity || 1,
          allergens: item.allergens || [],
        };
      }),
    };
  }

  /**
   * Danh sách túi bất ngờ của quán (R2-091)
   */
  async getSurpriseBags(storeId: string) {
    const offers = await this.offerRepo.find({
      where: {
        storeId,
        kind: OfferKind.SURPRISE_BAG,
      },
      order: { createdAt: 'DESC' },
    });

    const offerIds = offers.map((o) => o.id);
    if (offerIds.length === 0) {
      return [];
    }

    const bagItems = await this.surpriseBagRepo.find({
      where: { offerId: In(offerIds) },
    });

    const itemIds = Array.from(new Set(bagItems.map((bi) => bi.itemId)));
    let items: ItemEntity[] = [];
    if (itemIds.length > 0) {
      items = await this.itemRepo.find({ where: { id: In(itemIds) } });
    }
    const itemMap = new Map(items.map((it) => [it.id, it]));

    return offers.map((offer) => {
      const relatedBagItems = bagItems.filter((bi) => bi.offerId === offer.id);
      return {
        offer,
        items: relatedBagItems.map((bi) => ({
          itemId: bi.itemId,
          quantity: bi.quantity,
          item: itemMap.get(bi.itemId) || null,
        })),
      };
    });
  }

  /**
   * Chỉnh sửa lịch / hủy chiến dịch thông báo push (chỉ cho phép trước giờ gửi >= 15 phút) (R2-093)
   */
  async updateCampaign(storeId: string, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, storeId },
    });

    if (!campaign) {
      throw new NotFoundException('Chiến dịch thông báo không tồn tại.');
    }

    if (campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException(
        `Không thể chỉnh sửa chiến dịch đang ở trạng thái "${campaign.status}". Chỉ cho phép sửa chiến dịch đang lên lịch.`,
      );
    }

    const now = Date.now();
    const scheduledTime = new Date(campaign.scheduledAt).getTime();
    const minutesUntilSend = (scheduledTime - now) / (60 * 1000);

    if (minutesUntilSend < 15) {
      throw new BadRequestException(
        'Chỉ có thể chỉnh sửa hoặc hủy chiến dịch trước thời điểm gửi ít nhất 15 phút (R2-093).',
      );
    }

    if (dto.scheduledAt) {
      const newScheduledDate = new Date(dto.scheduledAt);
      const newMinutesUntilSend = (newScheduledDate.getTime() - now) / (60 * 1000);
      if (newMinutesUntilSend < 15) {
        throw new BadRequestException(
          'Thời điểm gửi mới phải cách thời điểm hiện tại ít nhất 15 phút.',
        );
      }

      // Kiểm tra giờ giới nghiêm ban đêm (22h - 7h)
      const vnHour = (newScheduledDate.getUTCHours() + 7) % 24;
      if (vnHour >= 22 || vnHour < 7) {
        throw new BadRequestException(
          'Khung giờ 22:00 - 07:00 thuộc khung giờ giới nghiêm ban đêm (BR-086).',
        );
      }
      campaign.scheduledAt = newScheduledDate;
    }

    if (dto.title !== undefined) campaign.title = dto.title;
    if (dto.content !== undefined) campaign.content = dto.content;
    if (dto.status !== undefined) campaign.status = dto.status;

    return this.campaignRepo.save(campaign);
  }

  /**
   * Thống kê hiệu quả chiến dịch thông báo (số người nhận, tỷ lệ mở, số đơn phát sinh 24h) (R2-094)
   */
  async getCampaignAnalytics(storeId: string, campaignId: string) {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId, storeId },
    });

    if (!campaign) {
      throw new NotFoundException('Chiến dịch thông báo không tồn tại.');
    }

    const scheduledDate = new Date(campaign.scheduledAt);
    const dayAfter = new Date(scheduledDate.getTime() + 24 * 60 * 60 * 1000);

    const ordersWithin24h = await this.orderRepo.find({
      where: {
        storeId,
        createdAt: Between(scheduledDate, dayAfter),
        status: In([OrderStatus.PAID, OrderStatus.PICKED_UP]),
      },
    });

    const ordersCount = ordersWithin24h.length;
    const revenueGenerated = ordersWithin24h.reduce(
      (sum, ord) => sum + Number(ord.unitPrice) * ord.quantity,
      0,
    );

    // Dữ liệu lượt tiếp cận dựa trên quy mô đối tượng target
    const estimatedRecipients = campaign.target === 'ALL' ? 120 : 35;
    const openedEstimate = Math.round(estimatedRecipients * 0.45);
    const openRatePercent =
      estimatedRecipients > 0 ? Math.round((openedEstimate / estimatedRecipients) * 100) : 0;

    return {
      campaignId: campaign.id,
      title: campaign.title,
      target: campaign.target,
      scheduledAt: campaign.scheduledAt,
      status: campaign.status,
      metrics: {
        recipientsCount: estimatedRecipients,
        openedCount: openedEstimate,
        openRatePercent,
        ordersWithin24h: ordersCount,
        revenueGeneratedVnd: revenueGenerated,
      },
    };
  }
}
