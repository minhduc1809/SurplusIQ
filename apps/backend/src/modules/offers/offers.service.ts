import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { OfferEntity, OfferStatus, OfferKind } from '../../entities/catalog/offer.entity';
import { OfferEventEntity, OfferEventType } from '../../entities/catalog/offer-event.entity';
import { ItemEntity, ItemStatus } from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus, CancelledBy } from '../../entities/orders/order.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { QuotaService } from '../subscriptions/quota.service';
import { QuotaKey } from '../subscriptions/quota.constants';
import { DynamicPricingEngine } from '@surplusiq/core';
import {
  CreateOfferDto,
  UpdateOfferDto,
  AdjustStockDto,
  CloseOfferDto,
  CancelOfferDto,
  CloneYesterdayOffersDto,
  QueryOffersDto,
} from './dto';
import { OFFERS_CONSTANTS } from './offers.constants';

export interface OffersListResult {
  data: OfferEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CloneSummary {
  clonedCount: number;
  skippedCount: number;
  clonedOffers: OfferEntity[];
  skippedOffers: { offerId: string; reason: string }[];
}

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(OfferEventEntity)
    private readonly offerEventRepo: Repository<OfferEventEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Xem danh sách suất bán trong ngày hoặc theo khoảng ngày (R2-026, R2-027)
   * Khoảng ngày tối đa 90 ngày; lọc theo ngày, trạng thái, món.
   */
  async getOffers(storeId: string, query: QueryOffersDto): Promise<OffersListResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.offerRepo
      .createQueryBuilder('offer')
      .where('offer.store_id = :storeId', { storeId });

    // 1. Kiểm tra ràng buộc khoảng ngày (R2-027)
    if (query.fromDate && query.toDate) {
      const start = new Date(query.fromDate);
      const end = new Date(query.toDate);

      if (start > end) {
        throw new BadRequestException(
          'Ngày bắt đầu (fromDate) phải trước hoặc bằng ngày kết thúc (toDate).',
        );
      }

      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > OFFERS_CONSTANTS.MAX_FILTER_DAYS) {
        throw new BadRequestException(
          `Khoảng ngày lọc không được vượt quá ${OFFERS_CONSTANTS.MAX_FILTER_DAYS} ngày (R2-027).`,
        );
      }

      qb.andWhere('offer.pickup_start >= :start AND offer.pickup_start <= :end', {
        start: new Date(`${query.fromDate}T00:00:00.000Z`),
        end: new Date(`${query.toDate}T23:59:59.999Z`),
      });
    } else if (query.date) {
      qb.andWhere('offer.pickup_start >= :start AND offer.pickup_start <= :end', {
        start: new Date(`${query.date}T00:00:00.000Z`),
        end: new Date(`${query.date}T23:59:59.999Z`),
      });
    }

    // 2. Lọc theo trạng thái
    if (query.status) {
      qb.andWhere('offer.status = :status', { status: query.status });
    }

    // 3. Lọc theo món
    if (query.itemId) {
      qb.andWhere('offer.item_id = :itemId', { itemId: query.itemId });
    }

    qb.orderBy('offer.pickup_start', 'DESC')
      .addOrderBy('offer.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Lấy chi tiết suất bán theo ID
   */
  async getOfferById(
    storeId: string,
    offerId: string,
  ): Promise<OfferEntity & { item?: ItemEntity | null }> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, storeId },
    });

    if (!offer) {
      throw new NotFoundException(`Không tìm thấy suất bán với ID [${offerId}] trong cửa hàng.`);
    }

    let item: ItemEntity | null = null;
    if (offer.itemId) {
      item = await this.itemRepo.findOne({ where: { id: offer.itemId, storeId } });
    }

    return {
      ...offer,
      item,
    };
  }

  /**
   * Tạo suất bán mới từ món ăn (R2-028, BR-054)
   * Kiểm tra giá sàn (40%), bội 500đ, hạn mức số suất mở trong ngày theo gói dịch vụ.
   */
  async createOffer(
    storeId: string,
    dto: CreateOfferDto,
    actorId = 'SYSTEM',
  ): Promise<OfferEntity> {
    // 1. Kiểm tra món ăn nếu là suất thông thường REGULAR
    if (dto.itemId) {
      const item = await this.itemRepo.findOne({
        where: { id: dto.itemId, storeId },
      });

      if (!item) {
        throw new NotFoundException(`Không tìm thấy món ăn với ID [${dto.itemId}] trong cửa hàng.`);
      }

      if (item.status === ItemStatus.ARCHIVED) {
        throw new BadRequestException(
          'Chỉ được tạo suất bán từ món ăn đang hoạt động (R2-028, BR3).',
        );
      }
    } else if (dto.kind !== OfferKind.SURPRISE_BAG) {
      throw new BadRequestException('Cần cung cấp itemId khi tạo suất bán thông thường (REGULAR).');
    }

    // 2. Kiểm tra tính hợp lệ của giá bán & giá gốc (bội số 500đ)
    if (dto.originalPrice % OFFERS_CONSTANTS.PRICE_ROUNDING_STEP !== 0) {
      throw new BadRequestException(
        `Giá gốc (${dto.originalPrice} VND) phải là bội số của ${OFFERS_CONSTANTS.PRICE_ROUNDING_STEP} VND (BR-064).`,
      );
    }
    if (dto.currentPrice % OFFERS_CONSTANTS.PRICE_ROUNDING_STEP !== 0) {
      throw new BadRequestException(
        `Giá bán (${dto.currentPrice} VND) phải là bội số của ${OFFERS_CONSTANTS.PRICE_ROUNDING_STEP} VND (BR-064).`,
      );
    }

    // 3. Tính toán và xác thực giá sàn (BR-054)
    const calculatedFloor =
      Math.ceil(
        (dto.originalPrice * OFFERS_CONSTANTS.DEFAULT_FLOOR_PRICE_RATIO) /
          OFFERS_CONSTANTS.PRICE_ROUNDING_STEP,
      ) * OFFERS_CONSTANTS.PRICE_ROUNDING_STEP;

    const finalFloorPrice = dto.floorPrice ?? calculatedFloor;

    if (dto.currentPrice < finalFloorPrice) {
      throw new BadRequestException(
        `Giá bán (${dto.currentPrice} VND) không được thấp hơn giá sàn an toàn (${finalFloorPrice} VND) (BR-054).`,
      );
    }
    if (dto.currentPrice > dto.originalPrice) {
      throw new BadRequestException(
        `Giá bán (${dto.currentPrice} VND) không được vượt quá giá gốc (${dto.originalPrice} VND) (BR-054).`,
      );
    }

    // 4. Kiểm tra khung giờ nhận hàng & hạn sử dụng
    const pickupStart = new Date(dto.pickupStart);
    const pickupEnd = new Date(dto.pickupEnd);

    if (pickupEnd <= pickupStart) {
      throw new BadRequestException(
        'Thời điểm kết thúc nhận hàng (pickupEnd) phải sau thời điểm bắt đầu (pickupStart).',
      );
    }

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(pickupEnd.getTime() + 60 * 60 * 1000);
    if (expiresAt < pickupEnd) {
      throw new BadRequestException(
        'Hạn sử dụng (expiresAt) phải sau hoặc bằng giờ kết thúc nhận hàng (R2-028, BR2).',
      );
    }

    const targetStatus = dto.status || OfferStatus.OPEN;

    // 5. Kiểm tra hạn mức suất mở trong ngày theo gói (BR-054, VC-01)
    if (targetStatus === OfferStatus.OPEN) {
      const dailyLimit = await this.quotaService.getQuotaLimit(storeId, QuotaKey.DAILY_OFFERS);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const todayOffersCount = await this.offerRepo.count({
        where: {
          storeId,
          createdAt: Between(startOfToday, endOfToday),
          status: In([OfferStatus.OPEN, OfferStatus.SOLD_OUT, OfferStatus.CLOSED]),
        },
      });

      if (todayOffersCount >= dailyLimit) {
        throw new BadRequestException(
          `Cửa hàng đã đạt hạn mức tối đa (${dailyLimit} suất mở/ngày) theo gói dịch vụ (BR-054). Vui lòng nâng cấp gói để tạo thêm.`,
        );
      }
    }

    // 6. Lưu thực thể OfferEntity
    const offer = this.offerRepo.create({
      storeId,
      itemId: dto.itemId || null,
      kind: dto.kind || OfferKind.REGULAR,
      totalQuantity: dto.totalQuantity,
      remainingQuantity: dto.totalQuantity,
      soldQuantity: 0,
      originalPrice: dto.originalPrice,
      currentPrice: dto.currentPrice,
      floorPrice: finalFloorPrice,
      pickupStart,
      pickupEnd,
      expiresAt,
      status: targetStatus,
      priceChangeCount: 0,
    });

    const savedOffer = await this.offerRepo.save(offer);

    // 7. Ghi nhận sự kiện vòng đời OfferEventEntity (R2-035)
    await this.offerEventRepo.save(
      this.offerEventRepo.create({
        offerId: savedOffer.id,
        actorId,
        type: OfferEventType.CREATED,
        payload: {
          totalQuantity: savedOffer.totalQuantity,
          originalPrice: savedOffer.originalPrice,
          currentPrice: savedOffer.currentPrice,
          floorPrice: savedOffer.floorPrice,
          note: dto.note,
        },
        reason: 'Tạo suất mới',
      }),
    );

    if (savedOffer.status === OfferStatus.OPEN) {
      await this.offerEventRepo.save(
        this.offerEventRepo.create({
          offerId: savedOffer.id,
          actorId,
          type: OfferEventType.OPENED,
          reason: 'Mở bán cho khách',
        }),
      );

      // Tiêu hao quota
      await this.quotaService.consume({
        storeId,
        quotaKey: QuotaKey.DAILY_OFFERS,
        units: 1,
      });
    }

    // 8. Ghi nhật ký kiểm toán
    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'OFFER_CREATED',
      targetType: 'OFFER',
      targetId: savedOffer.id,
      newValue: {
        itemId: savedOffer.itemId,
        totalQuantity: savedOffer.totalQuantity,
        currentPrice: savedOffer.currentPrice,
        status: savedOffer.status,
      },
    });

    return savedOffer;
  }

  /**
   * Nhân bản các suất của hôm qua sang hôm nay (R2-029)
   * Tạo các suất ở trạng thái DRAFT để chủ tiệm rà soát trước khi mở bán. Bỏ qua các món đã bị lưu trữ.
   */
  async cloneYesterdayOffers(
    storeId: string,
    dto: CloneYesterdayOffersDto,
    actorId = 'SYSTEM',
  ): Promise<CloneSummary> {
    const now = new Date();
    const yesterdayStart = new Date(now);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const qb = this.offerRepo
      .createQueryBuilder('offer')
      .where('offer.store_id = :storeId', { storeId })
      .andWhere('offer.pickup_start >= :start AND offer.pickup_start <= :end', {
        start: yesterdayStart,
        end: yesterdayEnd,
      });

    if (dto.sourceOfferIds && dto.sourceOfferIds.length > 0) {
      qb.andWhere('offer.id IN (:...ids)', { ids: dto.sourceOfferIds });
    }

    const yesterdayOffers = await qb.getMany();

    const summary: CloneSummary = {
      clonedCount: 0,
      skippedCount: 0,
      clonedOffers: [],
      skippedOffers: [],
    };

    const targetDateStr = dto.targetDate || now.toISOString().slice(0, 10);

    for (const oldOffer of yesterdayOffers) {
      // Kiểm tra món ăn nếu có: nếu đã lưu trữ (ARCHIVED) thì bỏ qua (R2-029)
      if (oldOffer.itemId) {
        const item = await this.itemRepo.findOne({
          where: { id: oldOffer.itemId, storeId },
        });

        if (!item || item.status === ItemStatus.ARCHIVED) {
          summary.skippedCount++;
          summary.skippedOffers.push({
            offerId: oldOffer.id,
            reason: `Món [${item?.name || oldOffer.itemId}] đã bị lưu trữ hoặc không còn kinh doanh.`,
          });
          continue;
        }
      }

      // Tính toán khung giờ nhận mới dựa trên ngày đích
      const oldStart = new Date(oldOffer.pickupStart);
      const oldEnd = new Date(oldOffer.pickupEnd);

      const newStart = new Date(`${targetDateStr}T${oldStart.toTimeString().slice(0, 8)}.000Z`);
      const newEnd = new Date(`${targetDateStr}T${oldEnd.toTimeString().slice(0, 8)}.000Z`);
      const newExpires = new Date(newEnd.getTime() + 60 * 60 * 1000);

      const newOffer = this.offerRepo.create({
        storeId,
        itemId: oldOffer.itemId,
        kind: oldOffer.kind,
        totalQuantity: oldOffer.totalQuantity,
        remainingQuantity: oldOffer.totalQuantity,
        soldQuantity: 0,
        originalPrice: oldOffer.originalPrice,
        currentPrice: oldOffer.currentPrice,
        floorPrice: oldOffer.floorPrice,
        pickupStart: newStart,
        pickupEnd: newEnd,
        expiresAt: newExpires,
        status: OfferStatus.DRAFT, // Mặc định DRAFT theo quy tắc R2-029
        priceChangeCount: 0,
      });

      const saved = await this.offerRepo.save(newOffer);

      await this.offerEventRepo.save(
        this.offerEventRepo.create({
          offerId: saved.id,
          actorId,
          type: OfferEventType.CREATED,
          payload: { clonedFromOfferId: oldOffer.id },
          reason: 'Nhân bản suất từ hôm qua (R2-029)',
        }),
      );

      summary.clonedOffers.push(saved);
      summary.clonedCount++;
    }

    if (summary.clonedCount > 0) {
      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_MEMBER',
        action: 'OFFERS_CLONED',
        targetType: 'OFFER_BATCH',
        newValue: {
          clonedCount: summary.clonedCount,
          skippedCount: summary.skippedCount,
        },
      });
    }

    return summary;
  }

  /**
   * Chỉnh sửa suất chưa bán hết (R2-030)
   * Không cho phép tổng số lượng nhỏ hơn số lượng đã bán + đang giữ;
   * Giá mới phải >= giá sàn; tối đa 3 lần đổi giá (Check constraint).
   */
  async updateOffer(
    storeId: string,
    offerId: string,
    dto: UpdateOfferDto,
    actorId = 'SYSTEM',
  ): Promise<OfferEntity> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, storeId },
    });

    if (!offer) {
      throw new NotFoundException(`Không tìm thấy suất bán với ID [${offerId}] trong cửa hàng.`);
    }

    if (offer.status === OfferStatus.CLOSED || offer.status === OfferStatus.CANCELLED) {
      throw new BadRequestException(
        `Không thể chỉnh sửa suất đã ở trạng thái ${offer.status} (R2-030).`,
      );
    }

    const oldPrice = offer.currentPrice;
    let priceChanged = false;

    // 1. Chỉnh sửa tổng số lượng
    if (dto.totalQuantity !== undefined) {
      if (dto.totalQuantity < offer.soldQuantity) {
        throw new BadRequestException(
          `Tổng số lượng (${dto.totalQuantity}) không được nhỏ hơn số lượng đã bán (${offer.soldQuantity}) (R2-030, BR1).`,
        );
      }

      const diff = dto.totalQuantity - offer.totalQuantity;
      offer.totalQuantity = dto.totalQuantity;
      offer.remainingQuantity = Math.max(0, offer.remainingQuantity + diff);

      if (offer.remainingQuantity === 0 && offer.status === OfferStatus.OPEN) {
        offer.status = OfferStatus.SOLD_OUT;
      } else if (offer.remainingQuantity > 0 && offer.status === OfferStatus.SOLD_OUT) {
        offer.status = OfferStatus.OPEN;
      }
    }

    // 2. Chỉnh sửa giá bán
    if (dto.currentPrice !== undefined && dto.currentPrice !== oldPrice) {
      if (offer.priceChangeCount >= OFFERS_CONSTANTS.MAX_PRICE_CHANGE_COUNT) {
        throw new BadRequestException(
          `Suất bán đã đạt tối đa ${OFFERS_CONSTANTS.MAX_PRICE_CHANGE_COUNT} lần thay đổi giá cho phép.`,
        );
      }

      if (dto.currentPrice % OFFERS_CONSTANTS.PRICE_ROUNDING_STEP !== 0) {
        throw new BadRequestException(
          `Giá bán mới (${dto.currentPrice} VND) phải là bội số của ${OFFERS_CONSTANTS.PRICE_ROUNDING_STEP} VND.`,
        );
      }

      if (dto.currentPrice < offer.floorPrice) {
        throw new BadRequestException(
          `Giá bán mới (${dto.currentPrice} VND) không được thấp hơn giá sàn an toàn (${offer.floorPrice} VND).`,
        );
      }

      if (dto.currentPrice > offer.originalPrice) {
        throw new BadRequestException(
          `Giá bán mới (${dto.currentPrice} VND) không được vượt quá giá gốc (${offer.originalPrice} VND).`,
        );
      }

      offer.currentPrice = dto.currentPrice;
      offer.priceChangeCount += 1;
      priceChanged = true;
    }

    // 3. Chỉnh sửa khung giờ
    if (dto.pickupStart) {
      offer.pickupStart = new Date(dto.pickupStart);
    }
    if (dto.pickupEnd) {
      const newEnd = new Date(dto.pickupEnd);
      if (newEnd <= offer.pickupStart) {
        throw new BadRequestException('Giờ kết thúc nhận hàng phải sau giờ bắt đầu.');
      }
      offer.pickupEnd = newEnd;
    }
    if (dto.expiresAt) {
      offer.expiresAt = new Date(dto.expiresAt);
    }

    // 4. Chuyển trạng thái từ DRAFT sang OPEN
    let wasDraftOpened = false;
    if (dto.status === OfferStatus.OPEN && offer.status === OfferStatus.DRAFT) {
      offer.status = OfferStatus.OPEN;
      wasDraftOpened = true;
    }

    const saved = await this.offerRepo.save(offer);

    // Ghi nhận sự kiện và audit
    if (priceChanged) {
      await this.offerEventRepo.save(
        this.offerEventRepo.create({
          offerId: saved.id,
          actorId,
          type: OfferEventType.PRICE_CHANGED,
          payload: { oldPrice, newPrice: saved.currentPrice, changeCount: saved.priceChangeCount },
          reason: dto.note || 'Chủ quán điều chỉnh giá bán',
        }),
      );

      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_MEMBER',
        action: 'OFFER_PRICE_CHANGED',
        targetType: 'OFFER',
        targetId: saved.id,
        oldValue: { currentPrice: oldPrice },
        newValue: { currentPrice: saved.currentPrice },
      });
    }

    if (wasDraftOpened) {
      await this.offerEventRepo.save(
        this.offerEventRepo.create({
          offerId: saved.id,
          actorId,
          type: OfferEventType.OPENED,
          reason: 'Mở bán suất từ bản nháp',
        }),
      );

      await this.quotaService.consume({
        storeId,
        quotaKey: QuotaKey.DAILY_OFFERS,
        units: 1,
      });
    }

    await this.offerEventRepo.save(
      this.offerEventRepo.create({
        offerId: saved.id,
        actorId,
        type: OfferEventType.EDITED,
        payload: { note: dto.note },
        reason: 'Chỉnh sửa thông tin suất',
      }),
    );

    return saved;
  }

  /**
   * Điều chỉnh tồn kho có lý do (R2-031)
   * Tăng/giảm số suất phát sinh thực tế (làm thêm, hỏng, bán tại quầy).
   * Không sửa tồn trực tiếp; lưu bản ghi lịch sử bắt buộc có lý do.
   */
  async adjustStock(
    storeId: string,
    offerId: string,
    dto: AdjustStockDto,
    actorId = 'SYSTEM',
  ): Promise<OfferEntity> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, storeId },
    });

    if (!offer) {
      throw new NotFoundException(`Không tìm thấy suất bán với ID [${offerId}] trong cửa hàng.`);
    }

    if (offer.status === OfferStatus.CANCELLED) {
      throw new BadRequestException('Không thể điều chỉnh tồn kho cho suất đã bị hủy (R2-031).');
    }

    const oldRemaining = offer.remainingQuantity;
    const newRemaining = oldRemaining + dto.deltaQuantity;
    const newTotal = offer.totalQuantity + dto.deltaQuantity;

    if (newRemaining < 0) {
      throw new BadRequestException(
        `Số lượng tồn kho sau điều chỉnh (${newRemaining}) không được âm (R2-031, BR1). Hiện còn ${oldRemaining} suất.`,
      );
    }

    if (newTotal < offer.soldQuantity) {
      throw new BadRequestException(
        `Tổng số lượng sau điều chỉnh (${newTotal}) không được nhỏ hơn số đã bán (${offer.soldQuantity}) (R2-031, BR1).`,
      );
    }

    offer.remainingQuantity = newRemaining;
    offer.totalQuantity = newTotal;

    if (newRemaining === 0 && offer.status === OfferStatus.OPEN) {
      offer.status = OfferStatus.SOLD_OUT;
    } else if (newRemaining > 0 && offer.status === OfferStatus.SOLD_OUT) {
      offer.status = OfferStatus.OPEN;
    }

    const saved = await this.offerRepo.save(offer);

    // Lưu vào offer_events với lý do bắt buộc (R2-031)
    await this.offerEventRepo.save(
      this.offerEventRepo.create({
        offerId: saved.id,
        actorId,
        type: OfferEventType.STOCK_ADJUSTED,
        payload: {
          deltaQuantity: dto.deltaQuantity,
          oldRemaining,
          newRemaining,
          oldTotal: offer.totalQuantity - dto.deltaQuantity,
          newTotal,
          note: dto.note,
        },
        reason: dto.reason,
      }),
    );

    // Ghi nhật ký kiểm toán
    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'STOCK_ADJUSTED',
      targetType: 'OFFER',
      targetId: saved.id,
      oldValue: { remainingQuantity: oldRemaining },
      newValue: {
        remainingQuantity: newRemaining,
        delta: dto.deltaQuantity,
        reason: dto.reason,
      },
    });

    return saved;
  }

  /**
   * Đóng suất sớm (R2-032)
   * Không bán thêm (hết nguyên liệu, đóng cửa). Tồn còn lại tính là hao hụt.
   */
  async closeOffer(
    storeId: string,
    offerId: string,
    dto: CloseOfferDto,
    actorId = 'SYSTEM',
  ): Promise<OfferEntity> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, storeId },
    });

    if (!offer) {
      throw new NotFoundException(`Không tìm thấy suất bán với ID [${offerId}] trong cửa hàng.`);
    }

    if (offer.status === OfferStatus.CLOSED) {
      throw new BadRequestException('Suất bán đã ở trạng thái Đã đóng (R2-032).');
    }
    if (offer.status === OfferStatus.CANCELLED) {
      throw new BadRequestException('Không thể đóng suất đã bị hủy.');
    }

    const wasteQuantity = offer.remainingQuantity;
    offer.status = OfferStatus.CLOSED;

    const saved = await this.offerRepo.save(offer);

    await this.offerEventRepo.save(
      this.offerEventRepo.create({
        offerId: saved.id,
        actorId,
        type: OfferEventType.CLOSED,
        payload: { wasteQuantity, note: dto.note },
        reason: dto.reason,
      }),
    );

    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'OFFER_CLOSED',
      targetType: 'OFFER',
      targetId: saved.id,
      newValue: { status: OfferStatus.CLOSED, reason: dto.reason, wasteQuantity },
    });

    return saved;
  }

  /**
   * Hủy suất và hoàn tiền 100% các đơn liên quan (R2-033)
   * Hoàn 100% tiền khách, không tính hoa hồng; ghi nhận 1 lần hủy do cửa hàng.
   */
  async cancelOffer(
    storeId: string,
    offerId: string,
    dto: CancelOfferDto,
    actorId = 'SYSTEM',
  ): Promise<OfferEntity> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, storeId },
    });

    if (!offer) {
      throw new NotFoundException(`Không tìm thấy suất bán với ID [${offerId}] trong cửa hàng.`);
    }

    if (offer.status === OfferStatus.CANCELLED) {
      throw new BadRequestException('Suất bán đã ở trạng thái Đã hủy (R2-033).');
    }
    if (offer.status === OfferStatus.CLOSED) {
      throw new BadRequestException('Không thể hủy suất đã đóng (R2-033).');
    }

    offer.status = OfferStatus.CANCELLED;
    const saved = await this.offerRepo.save(offer);

    // Tìm và hủy các đơn hàng đã thanh toán đang chờ nhận để hoàn tiền 100% (R2-033)
    const paidOrders = await this.orderRepo.find({
      where: {
        offerId,
        status: In([OrderStatus.PAID, OrderStatus.PENDING_PAYMENT]),
      },
    });

    for (const order of paidOrders) {
      order.status = OrderStatus.CANCELLED;
      order.cancelledBy = CancelledBy.STORE;
      order.cancelReason = `Cửa hàng hủy suất: ${dto.reason}`;
      await this.orderRepo.save(order);
    }

    await this.offerEventRepo.save(
      this.offerEventRepo.create({
        offerId: saved.id,
        actorId,
        type: OfferEventType.CANCELLED,
        payload: {
          affectedOrdersCount: paidOrders.length,
          note: dto.note,
        },
        reason: dto.reason,
      }),
    );

    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'OFFER_CANCELLED',
      targetType: 'OFFER',
      targetId: saved.id,
      newValue: {
        status: OfferStatus.CANCELLED,
        reason: dto.reason,
        refundedOrders: paidOrders.length,
      },
    });

    return saved;
  }

  /**
   * Tự động đóng các suất đã hết khung nhận hàng (R2-034)
   * Chạy định kỳ bởi cron / BullMQ task để chốt hao hụt.
   */
  async autoCloseExpiredOffers(): Promise<number> {
    const now = new Date();
    const expiredOffers = await this.offerRepo.find({
      where: {
        status: In([OfferStatus.OPEN, OfferStatus.DRAFT, OfferStatus.SOLD_OUT]),
        pickupEnd: Between(new Date('2000-01-01'), now),
      },
    });

    let closedCount = 0;
    for (const offer of expiredOffers) {
      offer.status = OfferStatus.CLOSED;
      await this.offerRepo.save(offer);

      await this.offerEventRepo.save(
        this.offerEventRepo.create({
          offerId: offer.id,
          actorId: null,
          type: OfferEventType.AUTO_CLOSED,
          payload: { remainingWaste: offer.remainingQuantity },
          reason: 'Hết khung nhận hàng (R2-034)',
        }),
      );
      closedCount++;
    }

    if (closedCount > 0) {
      this.logger.log(`[AUTO_CLOSE_OFFERS] Đã tự động đóng ${closedCount} suất hết khung nhận.`);
    }

    return closedCount;
  }

  /**
   * Xem lịch sử thay đổi của suất bán (R2-035)
   * Hiển thị: thời điểm, người thực hiện, loại sự kiện, giá trị cũ/mới, lý do. Chỉ đọc.
   */
  async getOfferHistory(storeId: string, offerId: string): Promise<OfferEventEntity[]> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, storeId },
    });

    if (!offer) {
      throw new NotFoundException(`Không tìm thấy suất bán với ID [${offerId}] trong cửa hàng.`);
    }

    return this.offerEventRepo.find({
      where: { offerId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Đề xuất định giá động qua DynamicPricingEngine (@surplusiq/core)
   */
  async getPricingRecommendation(offerId: string) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      throw new NotFoundException('Suất bán không tồn tại.');
    }

    const recommendation = DynamicPricingEngine.proposeDynamicPrice({
      offerId: offer.id,
      originalPrice: offer.originalPrice,
      currentPrice: offer.currentPrice,
      floorPrice: offer.floorPrice,
      initialQuantity: offer.totalQuantity,
      remainingQuantity: offer.remainingQuantity,
      pickupStart: offer.pickupStart,
      pickupEnd: offer.pickupEnd,
      now: new Date(),
      priceChangeCount: offer.priceChangeCount,
    });

    return {
      offerId: offer.id,
      originalPrice: offer.originalPrice,
      currentPrice: offer.currentPrice,
      floorPrice: offer.floorPrice,
      recommendation,
    };
  }

  /**
   * Áp dụng giá đề xuất động
   */
  async applyPricingRecommendation(storeId: string, offerId: string, actorId = 'SYSTEM') {
    const recData = await this.getPricingRecommendation(offerId);
    if (!recData.recommendation.canPropose) {
      throw new BadRequestException(recData.recommendation.explanation);
    }
    const recommendedPrice = recData.recommendation.proposedPrice;

    return this.updateOffer(
      storeId,
      offerId,
      {
        currentPrice: recommendedPrice,
        note: `Áp dụng định giá động: ${recData.recommendation.explanation}`,
      },
      actorId,
    );
  }
}
