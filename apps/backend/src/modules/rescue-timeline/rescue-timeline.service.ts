import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { OfferEventEntity, OfferEventType } from '../../entities/catalog/offer-event.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { DonationRecordEntity } from '../../entities/ai/donation-record.entity';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';
import { StorePermission } from '../../entities/stores/store-member.entity';
import {
  RescueActionOutcome,
  RescueActionType,
  RescueDataQualityStatus,
  RescueLotStatus,
  RescueRiskSnapshotEntity,
} from '../../entities/rescue-timeline/rescue-risk-snapshot.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { RescueLotActionDto } from './dto/rescue-timeline.dto';
import { calculateRisk, RESCUE_TIMELINE_CONFIG, RISK_LEVEL_RANK } from './rescue-timeline.risk';

const AUDIT_TARGET = 'RESCUE_LOT';

/** Quyền theo đúng endpoint đích đang có (adjust-stock, pricing, surprise-bags, donations đều OWNER/MANAGER). */
const ACTION_PERMISSIONS: Record<RescueActionType, StorePermission[]> = {
  [RescueActionType.UPDATE_STOCK]: [StorePermission.OWNER, StorePermission.MANAGER],
  [RescueActionType.VIEW_PRICE]: [StorePermission.OWNER, StorePermission.MANAGER],
  [RescueActionType.ADJUST_PRICE]: [StorePermission.OWNER, StorePermission.MANAGER],
  [RescueActionType.CREATE_SURPRISE_BAG]: [StorePermission.OWNER, StorePermission.MANAGER],
  [RescueActionType.OPEN_RESCUE_BRIDGE]: [StorePermission.OWNER, StorePermission.MANAGER],
  // Ngoại lệ "người dùng thiếu quyền: chỉ xem hoặc chuyển yêu cầu"
  [RescueActionType.REQUEST_MANAGER]: [StorePermission.COUNTER],
};

/** Rescue Timeline chỉ điều phối: các hành động (trừ cập nhật tồn) chuyển sang API có sẵn. */
const ACTION_META: Record<
  RescueActionType,
  { label: string; next: (lotId: string) => { method: string; path: string } | null }
> = {
  [RescueActionType.UPDATE_STOCK]: { label: 'Cập nhật tồn', next: () => null },
  [RescueActionType.VIEW_PRICE]: {
    label: 'Xem giá đề xuất',
    next: (id) => ({ method: 'GET', path: `/store/offers/${id}/pricing-recommendation` }),
  },
  [RescueActionType.ADJUST_PRICE]: {
    label: 'Đề xuất điều chỉnh giá',
    next: (id) => ({ method: 'POST', path: `/store/decisions/pricing/propose/${id}` }),
  },
  [RescueActionType.CREATE_SURPRISE_BAG]: {
    label: 'Tạo túi bất ngờ',
    next: () => ({ method: 'POST', path: '/store/surprise-bags' }),
  },
  [RescueActionType.OPEN_RESCUE_BRIDGE]: {
    label: 'Mở Rescue Bridge',
    // shortcut: CM-B03 Rescue Bridge chưa có - tạm trỏ sang gợi ý quyên góp, đổi khi CM-B03 xong.
    next: () => ({ method: 'GET', path: '/store/donations/suggestions' }),
  },
  [RescueActionType.REQUEST_MANAGER]: { label: 'Chuyển yêu cầu cho quản lý', next: () => null },
};

type SnapshotRow = Pick<
  RescueRiskSnapshotEntity,
  | 'lotId'
  | 'storeId'
  | 'itemId'
  | 'quantityAvailable'
  | 'pickupEndAt'
  | 'expiryAt'
  | 'lotStatus'
  | 'riskLevel'
  | 'riskFactors'
  | 'dataQualityStatus'
  | 'recommendedActions'
  | 'calculatedAt'
>;

@Injectable()
export class RescueTimelineService {
  private readonly logger = new Logger(RescueTimelineService.name);

  constructor(
    @InjectRepository(RescueRiskSnapshotEntity)
    private readonly snapshotRepo: Repository<RescueRiskSnapshotEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Bước 1-2: lấy tồn, khung nhận, lịch sử bán của các lô (luôn lọc theo store_id - BR-B01-01) và tính nguy cơ.
   * Không ghi gì vào offers (BR-B01-04).
   */
  private async computeLots(
    manager: EntityManager,
    storeId: string,
    offers: OfferEntity[],
    now: Date,
  ): Promise<{ row: SnapshotRow; deadline: Date }[]> {
    if (offers.length === 0) return [];
    const offerIds = offers.map((o) => o.id);
    const itemIds = [...new Set(offers.map((o) => o.itemId).filter((id): id is string => !!id))];

    const items = itemIds.length
      ? await manager.find(ItemEntity, { where: { id: In(itemIds), storeId } })
      : [];
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const orderAgg = await manager
      .createQueryBuilder(OrderEntity, 'o')
      .select('o.offer_id', 'offerId')
      .addSelect(
        'COALESCE(SUM(o.quantity) FILTER (WHERE o.status IN (:...soldStatuses)), 0)',
        'sold',
      )
      .addSelect('COALESCE(SUM(o.quantity) FILTER (WHERE o.status = :held), 0)', 'held')
      .addSelect('MAX(o.created_at)', 'lastOrderAt')
      .where('o.store_id = :storeId AND o.offer_id IN (:...offerIds)', { storeId, offerIds })
      .setParameters({
        soldStatuses: [OrderStatus.PAID, OrderStatus.PICKED_UP],
        held: OrderStatus.PENDING_PAYMENT,
      })
      .groupBy('o.offer_id')
      .getRawMany<{ offerId: string; sold: string; held: string; lastOrderAt: Date | null }>();
    const orderMap = new Map(orderAgg.map((r) => [r.offerId, r]));

    const donations = await manager.find(DonationRecordEntity, {
      where: { storeId, offerId: In(offerIds) },
      select: { offerId: true },
    });
    const donated = new Set(donations.map((d) => d.offerId));

    return offers.map((offer) => {
      const agg = orderMap.get(offer.id);
      const item = offer.itemId ? itemMap.get(offer.itemId) : undefined;
      const r = calculateRisk({
        now,
        offer,
        item: item ? { expiryAt: item.expiryAt, preparedAt: item.preparedAt } : null,
        orders: {
          sold: Number(agg?.sold ?? 0),
          held: Number(agg?.held ?? 0),
          lastOrderAt: agg?.lastOrderAt ?? null,
        },
        handedOver: donated.has(offer.id),
      });
      return {
        deadline: r.deadline,
        row: {
          lotId: offer.id,
          storeId,
          itemId: offer.itemId,
          quantityAvailable: r.quantityAvailable,
          pickupEndAt: offer.pickupEnd,
          expiryAt: r.expiryAt,
          lotStatus: r.lotStatus,
          riskLevel: r.riskLevel,
          riskFactors: r.riskFactors,
          dataQualityStatus: r.dataQualityStatus,
          recommendedActions: r.recommendedActions,
          calculatedAt: now,
        },
      };
    });
  }

  /** Tính lại toàn bộ lô đang hoạt động của một cửa hàng (gồm lô ACTIVE cũ để chuyển sang trạng thái kết thúc). */
  async recalculateStore(storeId: string, now: Date = new Date()): Promise<number> {
    const activeLots = await this.snapshotRepo.find({
      where: { storeId, lotStatus: RescueLotStatus.ACTIVE },
      select: { lotId: true },
    });
    const activeLotIds = activeLots.map((s) => s.lotId);
    const offers = await this.offerRepo.find({
      where: [
        { storeId, status: In([OfferStatus.OPEN, OfferStatus.SOLD_OUT]) },
        ...(activeLotIds.length ? [{ storeId, id: In(activeLotIds) }] : []),
      ],
    });
    const lots = await this.computeLots(this.dataSource.manager, storeId, offers, now);
    if (lots.length) {
      // upsert chỉ ghi cột tính toán - giữ nguyên action_taken/outcome đã ghi
      await this.snapshotRepo.upsert(
        lots.map((l) => l.row),
        ['lotId'],
      );
    }
    return lots.length;
  }

  /**
   * Tác vụ nền: tính lại cho mọi cửa hàng. Lỗi một cửa hàng được ghi log và để lại snapshot cũ
   * (sẽ bị đánh dấu STALE khi đọc) - không đánh dấu hoàn tất, lần chạy sau/nút "Làm mới" xử lý lại.
   */
  async recalculateAll(now: Date = new Date()) {
    const fromOffers = await this.offerRepo
      .createQueryBuilder('o')
      .select('DISTINCT o.store_id', 'storeId')
      .where('o.status IN (:...statuses)', { statuses: [OfferStatus.OPEN, OfferStatus.SOLD_OUT] })
      .getRawMany<{ storeId: string }>();
    const fromSnapshots = await this.snapshotRepo
      .createQueryBuilder('s')
      .select('DISTINCT s.store_id', 'storeId')
      .where('s.lot_status = :status', { status: RescueLotStatus.ACTIVE })
      .getRawMany<{ storeId: string }>();
    const storeIds = [...new Set([...fromOffers, ...fromSnapshots].map((r) => r.storeId))];

    const processed: string[] = [];
    const failedStoreIds: string[] = [];
    let lotsCalculated = 0;
    for (const storeId of storeIds) {
      try {
        lotsCalculated += await this.recalculateStore(storeId, now);
        processed.push(storeId);
      } catch (err: unknown) {
        failedStoreIds.push(storeId);
        this.logger.error(
          `[RESCUE_TIMELINE_RECALC_FAILED] store=${storeId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return { count: processed.length, storeIds: processed, failedStoreIds, lotsCalculated };
  }

  /** GET danh sách ưu tiên: phục vụ snapshot gần nhất, đánh dấu cần tính lại khi cũ/dữ liệu đã đổi (BR-B01-05). */
  async getTimeline(storeId: string) {
    const now = new Date();
    let snapshots = await this.snapshotRepo.find({
      where: { storeId, lotStatus: RescueLotStatus.ACTIVE },
    });
    const openOffers = await this.offerRepo.find({ where: { storeId, status: OfferStatus.OPEN } });
    const activeIds = new Set(snapshots.map((s) => s.lotId));

    // Lô mới (chưa có snapshot) phải xuất hiện ngay - tính đồng bộ cho cửa hàng này.
    if (openOffers.some((o) => !activeIds.has(o.id))) {
      await this.recalculateStore(storeId, now);
      snapshots = await this.snapshotRepo.find({
        where: { storeId, lotStatus: RescueLotStatus.ACTIVE },
      });
    }

    const offerMap = new Map(openOffers.map((o) => [o.id, o]));
    const itemNames = await this.itemNames(
      storeId,
      snapshots.map((s) => s.itemId),
    );

    const items = snapshots
      .map((s) => this.toView(s, offerMap.get(s.lotId), itemNames, now))
      .sort(
        (a, b) =>
          (b.riskLevel ? RISK_LEVEL_RANK[b.riskLevel] : 0) -
            (a.riskLevel ? RISK_LEVEL_RANK[a.riskLevel] : 0) ||
          new Date(a.pickupEndAt).getTime() - new Date(b.pickupEndAt).getTime(),
      );

    return {
      items,
      needsRecalculation: items.some((i) => i.needsRecalculation),
      oldestCalculatedAt: items.length
        ? new Date(Math.min(...items.map((i) => new Date(i.calculatedAt).getTime())))
        : null,
      snapshotMaxAgeMinutes: RESCUE_TIMELINE_CONFIG.SNAPSHOT_MAX_AGE_MINUTES,
    };
  }

  /** Bước 4: chi tiết lô - luôn tính lại lô này trước khi hiển thị hành động khả dụng. */
  async getLotDetail(storeId: string, lotId: string, permission: StorePermission | undefined) {
    const now = new Date();
    const offer = await this.offerRepo.findOne({ where: { id: lotId, storeId } });
    if (!offer) {
      throw new NotFoundException('Lô/suất không tồn tại hoặc không thuộc cửa hàng.');
    }
    const [lot] = await this.computeLots(this.dataSource.manager, storeId, [offer], now);
    await this.snapshotRepo.upsert(lot.row, ['lotId']);
    const snapshot = await this.snapshotRepo.findOneOrFail({ where: { lotId, storeId } });

    const itemNames = await this.itemNames(storeId, [snapshot.itemId]);
    const history = await this.auditRepo.find({
      where: { storeId, targetType: AUDIT_TARGET, targetId: lotId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    const recommended = new Set(snapshot.recommendedActions.map((a) => a.type));
    const availableActions = Object.values(RescueActionType)
      .filter(
        (type) =>
          type !== RescueActionType.REQUEST_MANAGER || permission === StorePermission.COUNTER,
      )
      .map((type) => {
        const blocked = this.stateBlockReason(type, snapshot.lotStatus, now < lot.deadline);
        const allowed = this.canPerform(permission, type);
        return {
          type,
          label: ACTION_META[type].label,
          recommended: recommended.has(type),
          enabled: !blocked && allowed,
          disabledReason:
            blocked ?? (allowed ? null : 'Cần quyền quản lý - hãy chuyển yêu cầu cho quản lý'),
          next: ACTION_META[type].next(lotId),
        };
      });

    return {
      ...this.toView(snapshot, offer, itemNames, now),
      offer: {
        status: offer.status,
        kind: offer.kind,
        totalQuantity: offer.totalQuantity,
        originalPrice: offer.originalPrice,
        currentPrice: offer.currentPrice,
        floorPrice: offer.floorPrice,
        priceChangeCount: offer.priceChangeCount,
        pickupStart: offer.pickupStart,
        pickupEnd: offer.pickupEnd,
      },
      availableActions,
      history: history.map((h) => ({
        action: h.action,
        actorId: h.actorId,
        actorRole: h.actorRole,
        at: h.createdAt,
        input: h.oldValue,
        result: h.newValue,
      })),
    };
  }

  /**
   * Bước 5-6: kiểm tra lại quyền, trạng thái và tồn thực tế dưới khóa dòng (SELECT ... FOR UPDATE trên offers),
   * rồi ghi hành động + kết quả. Tồn chỉ đổi trong transaction này, nên hai yêu cầu đồng thời không thể
   * cùng áp dụng: yêu cầu thứ hai thấy expectedQuantity lệch và bị trả về trạng thái mới.
   */
  async performAction(
    storeId: string,
    lotId: string,
    actor: { userId: string; permission: StorePermission | undefined },
    dto: RescueLotActionDto,
  ) {
    const now = new Date();
    const actorRole = actor.permission ?? 'UNKNOWN';

    if (!this.canPerform(actor.permission, dto.actionType)) {
      await this.auditLogService.log({
        storeId,
        actorId: actor.userId,
        actorRole,
        action: 'RESCUE_ACTION_BLOCKED',
        targetType: AUDIT_TARGET,
        targetId: lotId,
        newValue: { actionType: dto.actionType, code: 'FORBIDDEN_PERMISSION' },
      });
      throw new ForbiddenException({
        code: 'FORBIDDEN_PERMISSION',
        message: `Vai trò [${actorRole}] không được thực hiện ${ACTION_META[dto.actionType].label}. Hãy chuyển yêu cầu cho quản lý.`,
      });
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const offer = await manager
        .createQueryBuilder(OfferEntity, 'offer')
        .setLock('pessimistic_write')
        .where('offer.id = :id AND offer.store_id = :storeId', { id: lotId, storeId })
        .getOne();
      if (!offer) {
        throw new NotFoundException('Lô/suất không tồn tại hoặc không thuộc cửa hàng.');
      }

      const [before] = await this.computeLots(manager, storeId, [offer], now);
      const decisionInput = {
        riskLevel: before.row.riskLevel,
        dataQualityStatus: before.row.dataQualityStatus,
        quantityAvailable: before.row.quantityAvailable,
        riskFactors: before.row.riskFactors,
      };

      const blocked = this.stateBlockReason(
        dto.actionType,
        before.row.lotStatus,
        now < before.deadline,
      );
      const stale =
        dto.expectedQuantity !== offer.remainingQuantity
          ? `Tồn đã thay đổi (bạn thấy ${dto.expectedQuantity}, thực tế còn ${offer.remainingQuantity}). Vui lòng tải lại.`
          : null;
      if (blocked || stale) {
        await manager.upsert(RescueRiskSnapshotEntity, before.row, ['lotId']);
        return {
          ok: false as const,
          code: blocked ? 'LOT_NOT_ACTIONABLE' : 'STALE_STATE',
          message: (blocked ?? stale) as string,
          decisionInput,
        };
      }

      let outcome = RescueActionOutcome.ROUTED;
      let stockChange: Record<string, unknown> | null = null;
      let after = before;

      if (dto.actionType === RescueActionType.UPDATE_STOCK) {
        const delta = dto.deltaQuantity ?? 0;
        const oldRemaining = offer.remainingQuantity;
        const newRemaining = oldRemaining + delta;
        const newTotal = offer.totalQuantity + delta;
        // Cùng quy tắc R2-031 như POST /store/offers/:id/adjust-stock
        if (delta === 0) throw new BadRequestException('Số lượng thay đổi phải khác 0.');
        if (newRemaining < 0) {
          throw new BadRequestException(
            `Tồn sau điều chỉnh (${newRemaining}) không được âm. Hiện còn ${oldRemaining}.`,
          );
        }
        if (newTotal < offer.soldQuantity) {
          throw new BadRequestException(
            `Tổng số lượng sau điều chỉnh (${newTotal}) không được nhỏ hơn số đã bán (${offer.soldQuantity}).`,
          );
        }
        offer.remainingQuantity = newRemaining;
        offer.totalQuantity = newTotal;
        if (newRemaining === 0 && offer.status === OfferStatus.OPEN)
          offer.status = OfferStatus.SOLD_OUT;
        else if (newRemaining > 0 && offer.status === OfferStatus.SOLD_OUT)
          offer.status = OfferStatus.OPEN;
        await manager.save(offer);
        await manager.save(
          manager.create(OfferEventEntity, {
            offerId: offer.id,
            actorId: actor.userId,
            type: OfferEventType.STOCK_ADJUSTED,
            reason: dto.reason ?? null,
            payload: {
              deltaQuantity: delta,
              oldRemaining,
              newRemaining,
              newTotal,
              note: dto.note,
              source: 'RESCUE_TIMELINE',
            },
          }),
        );
        stockChange = { deltaQuantity: delta, oldRemaining, newRemaining };
        outcome = RescueActionOutcome.APPLIED;
        [after] = await this.computeLots(manager, storeId, [offer], now);
      } else if (dto.actionType === RescueActionType.REQUEST_MANAGER) {
        outcome = RescueActionOutcome.FORWARDED;
      }

      await manager.upsert(
        RescueRiskSnapshotEntity,
        {
          ...after.row,
          actionTaken: dto.actionType,
          outcome,
          actionTakenBy: actor.userId,
          actionTakenAt: now,
        },
        ['lotId'],
      );
      return { ok: true as const, outcome, stockChange, decisionInput };
    });

    // Ghi audit sau khi commit để không lưu hành động đã rollback (BR-B01-07).
    await this.auditLogService.log({
      storeId,
      actorId: actor.userId,
      actorRole,
      action: result.ok ? 'RESCUE_ACTION' : 'RESCUE_ACTION_BLOCKED',
      targetType: AUDIT_TARGET,
      targetId: lotId,
      oldValue: { ...result.decisionInput, expectedQuantity: dto.expectedQuantity },
      newValue: result.ok
        ? {
            actionType: dto.actionType,
            outcome: result.outcome,
            stockChange: result.stockChange,
            reason: dto.reason ?? null,
            note: dto.note ?? null,
          }
        : { actionType: dto.actionType, code: result.code, message: result.message },
    });

    const lot = await this.getLotDetail(storeId, lotId, actor.permission);
    if (!result.ok) {
      // "Suất hết/đóng: chặn hành động và tải lại trạng thái" - trả kèm trạng thái mới để FE tải lại.
      throw new ConflictException({ code: result.code, message: result.message, lot });
    }
    return {
      success: true,
      outcome: result.outcome,
      next: ACTION_META[dto.actionType].next(lotId),
      lot,
    };
  }

  private canPerform(permission: StorePermission | undefined, type: RescueActionType): boolean {
    return !!permission && ACTION_PERMISSIONS[type].includes(permission);
  }

  /** BR-B01-06: không bán/bàn giao khi lô đã kết thúc hoặc quá hạn chót. */
  private stateBlockReason(
    type: RescueActionType,
    lotStatus: RescueLotStatus,
    beforeDeadline: boolean,
  ): string | null {
    if (lotStatus === RescueLotStatus.ACTIVE) return null;
    // Suất hết nhưng còn trong khung: vẫn cho tăng tồn (vd. làm thêm)
    if (
      type === RescueActionType.UPDATE_STOCK &&
      lotStatus === RescueLotStatus.SOLD_OUT &&
      beforeDeadline
    ) {
      return null;
    }
    return `Lô đang ở trạng thái ${lotStatus} - không thể thực hiện hành động.`;
  }

  private async itemNames(storeId: string, itemIds: (string | null)[]) {
    const ids = [...new Set(itemIds.filter((id): id is string => !!id))];
    if (!ids.length) return new Map<string, string>();
    const items = await this.itemRepo.find({
      where: { id: In(ids), storeId },
      select: { id: true, name: true },
    });
    return new Map(items.map((i) => [i.id, i.name]));
  }

  private toView(
    s: RescueRiskSnapshotEntity,
    offer: OfferEntity | undefined,
    itemNames: Map<string, string>,
    now: Date,
  ) {
    const maxAgeMs = RESCUE_TIMELINE_CONFIG.SNAPSHOT_MAX_AGE_MINUTES * 60 * 1000;
    const needsRecalculation =
      now.getTime() - new Date(s.calculatedAt).getTime() > maxAgeMs ||
      !offer ||
      new Date(offer.updatedAt) > new Date(s.calculatedAt);
    // Kết quả cũ không được trình bày như dữ liệu hợp lệ: OK -> STALE khi cần tính lại.
    const dataQualityStatus =
      needsRecalculation && s.dataQualityStatus === RescueDataQualityStatus.OK
        ? RescueDataQualityStatus.STALE
        : s.dataQualityStatus;
    return {
      lotId: s.lotId,
      itemId: s.itemId,
      itemName: s.itemId ? (itemNames.get(s.itemId) ?? null) : null,
      kind: offer?.kind ?? null,
      lotStatus: s.lotStatus,
      quantityAvailable: s.quantityAvailable,
      pickupEndAt: s.pickupEndAt,
      expiryAt: s.expiryAt,
      riskLevel: s.riskLevel,
      riskFactors: s.riskFactors,
      dataQualityStatus,
      recommendedActions: s.recommendedActions,
      calculatedAt: s.calculatedAt,
      needsRecalculation,
      actionTaken: s.actionTaken,
      outcome: s.outcome,
      actionTakenBy: s.actionTakenBy,
      actionTakenAt: s.actionTakenAt,
    };
  }
}
