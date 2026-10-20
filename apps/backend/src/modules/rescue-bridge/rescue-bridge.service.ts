import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, In, MoreThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import {
  RescueBridgeTransferEntity,
  RescueBridgeTransferStatus,
} from '../../entities/rescue-bridge/rescue-bridge-transfer.entity';
import { RecipientOrganizationEntity } from '../../entities/rescue-bridge/recipient-organization.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';
import { DonationRecordEntity } from '../../entities/ai/donation-record.entity';
import { SettingsService } from '../settings/settings.service';
import {
  ConfirmAgreementDto,
  CreateRecipientOrgDto,
  CreateTransferDto,
  QueryReportDto,
  QueryTransfersDto,
  RecipientAcceptDto,
  RecipientConfirmHandoverDto,
  ResolveDisputeDto,
  StoreConfirmHandoverDto,
  UpdateRecipientOrgDto,
} from './dto/rescue-bridge.dto';

const T = RescueBridgeTransferStatus;

/**
 * Máy trạng thái Rescue Bridge (BBRD phần 4):
 * Nháp → Đã gửi → Đã chấp nhận/Từ chối → Chờ bàn giao → Đã bàn giao (toàn bộ/một phần) / Thất bại / Hủy.
 */
export const TRANSFER_TRANSITIONS: Record<
  RescueBridgeTransferStatus,
  readonly RescueBridgeTransferStatus[]
> = {
  [T.DRAFT]: [T.SENT, T.CANCELLED],
  [T.SENT]: [T.ACCEPTED, T.REJECTED, T.CANCELLED, T.FAILED],
  [T.ACCEPTED]: [T.AWAITING_HANDOVER, T.CANCELLED, T.FAILED],
  [T.AWAITING_HANDOVER]: [T.HANDED_OVER, T.PARTIAL, T.FAILED, T.CANCELLED],
  [T.REJECTED]: [],
  [T.HANDED_OVER]: [],
  [T.PARTIAL]: [],
  [T.FAILED]: [],
  [T.CANCELLED]: [],
};

export function assertTransferTransition(
  from: RescueBridgeTransferStatus,
  to: RescueBridgeTransferStatus,
) {
  if (!TRANSFER_TRANSITIONS[from]?.includes(to)) {
    throw new ConflictException({
      code: 'RESCUE_BRIDGE_INVALID_TRANSITION',
      message: `Không thể chuyển đề nghị bàn giao từ trạng thái ${from} sang ${to}.`,
    });
  }
}

const OPEN_STATUSES = [T.DRAFT, T.SENT, T.ACCEPTED, T.AWAITING_HANDOVER];
const LINK_STATUSES = [T.SENT, T.ACCEPTED, T.AWAITING_HANDOVER];
const VN_OFFSET_MIN = 7 * 60; // Asia/Ho_Chi_Minh, không có giờ mùa hè
const DAY_MIN = 24 * 60;

type Actor = { id: string; role: 'STORE_USER' | 'RECIPIENT_ORG' | 'SYSTEM' | 'ADMIN' };
const SYSTEM_ACTOR: Actor = { id: '00000000-0000-0000-0000-000000000000', role: 'SYSTEM' };

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/**
 * Khung [from, to] có giao với khung giờ nhận hằng ngày [start, end] (giờ VN) của đơn vị không.
 * start/end NULL = nhận mọi giờ; end <= start = khung qua đêm.
 */
export function windowOverlaps(
  from: Date,
  to: Date,
  start: string | null,
  end: string | null,
): boolean {
  if (!start || !end) return true;
  const toMin = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const durMin = (to.getTime() - from.getTime()) / 60_000;
  if (durMin >= DAY_MIN) return true;
  const s = toMin(start);
  const e = toMin(end) <= s ? toMin(end) + DAY_MIN : toMin(end);
  const a = (from.getUTCHours() * 60 + from.getUTCMinutes() + VN_OFFSET_MIN) % DAY_MIN;
  const b = a + durMin;
  return [-DAY_MIN, 0, DAY_MIN].some((k) => a <= e + k && s + k <= b);
}

/** Hạn dùng thực của lô: sớm nhất giữa hạn suất bán và hạn món (nếu cửa hàng khai báo). */
function lotExpiry(offer: OfferEntity, item: ItemEntity | null): Date {
  const t = Math.min(
    new Date(offer.expiresAt).getTime(),
    item?.expiryAt ? new Date(item.expiryAt).getTime() : Infinity,
  );
  return new Date(t);
}

const hasConfirmation = (t: RescueBridgeTransferEntity) =>
  t.senderConfirmedAt !== null || t.recipientConfirmedAt !== null;

@Injectable()
export class RescueBridgeService {
  private readonly logger = new Logger(RescueBridgeService.name);

  constructor(
    @InjectRepository(RescueBridgeTransferEntity)
    private readonly transferRepo: Repository<RescueBridgeTransferEntity>,
    @InjectRepository(RecipientOrganizationEntity)
    private readonly orgRepo: Repository<RecipientOrganizationEntity>,
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ══════════════════════════ STORE SIDE ══════════════════════════

  /** Lô còn khả dụng để bàn giao + gợi ý khi gần cuối khung nhận (luồng chính bước 1, BR-098). */
  async eligibleOffers(storeId: string) {
    const now = new Date();
    const [minutesBeforeEnd, minRemaining] = await Promise.all([
      this.settingsService.getPlatformSetting<number>('donation.minutes_before_end', 30),
      this.settingsService.getPlatformSetting<number>('donation.min_remaining', 3),
    ]);
    const m = this.dataSource.manager;
    const offers = await m.find(OfferEntity, {
      where: {
        storeId,
        status: OfferStatus.OPEN,
        remainingQuantity: MoreThan(0),
        expiresAt: MoreThan(now),
      },
      order: { pickupEnd: 'ASC' },
    });
    const itemIds = offers.map((o) => o.itemId).filter((id): id is string => !!id);
    const items = itemIds.length ? await m.find(ItemEntity, { where: { id: In(itemIds) } }) : [];
    const itemMap = new Map(items.map((i) => [i.id, i]));
    return offers
      .map((o) => {
        const item = o.itemId ? (itemMap.get(o.itemId) ?? null) : null;
        const expiry = lotExpiry(o, item);
        return {
          offerId: o.id,
          kind: o.kind,
          itemName: item?.name ?? null,
          foodCategory: item?.category ?? null,
          remainingQuantity: o.remainingQuantity,
          pickupStart: o.pickupStart,
          pickupEnd: o.pickupEnd,
          lotExpiresAt: expiry,
          suggested:
            o.remainingQuantity >= minRemaining &&
            new Date(o.pickupEnd).getTime() - now.getTime() <= minutesBeforeEnd * 60_000,
        };
      })
      .filter((o) => o.lotExpiresAt > now);
  }

  /**
   * Tạo đề nghị (Nháp) và GIỮ NGAY số lượng khỏi tồn bán trong cùng transaction khóa dòng offer
   * (cùng khóa pessimistic_write với OrdersService.holdOrder) - BR-B03-05/07.
   */
  async createTransfer(storeId: string, userId: string, dto: CreateTransferDto) {
    const now = new Date();
    const availableAt = new Date(dto.availableAt);
    const handoverDeadline = new Date(dto.handoverDeadline);
    if (availableAt >= handoverDeadline) {
      throw new BadRequestException('Thời điểm sẵn sàng phải trước hạn nhận.');
    }
    if (handoverDeadline <= now) throw new BadRequestException('Hạn nhận đã qua.');

    return this.dataSource.transaction(async (m) => {
      const offer = await this.lockOffer(m, dto.offerId);
      if (offer.storeId !== storeId)
        throw new NotFoundException('Không tìm thấy suất của cửa hàng.');
      const item = offer.itemId
        ? await m.findOne(ItemEntity, { where: { id: offer.itemId } })
        : null;
      const expiry = lotExpiry(offer, item);
      if (expiry <= now) throw new BadRequestException('Lô đã hết hạn - chặn bàn giao.');
      if (handoverDeadline > expiry) {
        throw new BadRequestException(
          `Hạn nhận không được sau hạn dùng của lô (${expiry.toISOString()}).`,
        );
      }
      const foodCategory = (dto.foodCategory?.trim() || item?.category || '').trim();
      if (!foodCategory) {
        throw new BadRequestException('Suất không gắn món - cần khai báo nhóm món để ghép nối.');
      }

      const transfer = m.create(RescueBridgeTransferEntity, {
        storeId,
        offerId: offer.id,
        foodCategory,
        quantityProposed: dto.quantity,
        reservedQuantity: 0,
        availableAt,
        handoverDeadline,
        storageNotes: dto.storageNotes.trim(),
        transportResponsibility: dto.transportResponsibility,
        transferStatus: T.DRAFT,
        createdBy: userId,
      });
      await this.setReserved(m, transfer, dto.quantity, offer);
      const saved = await m.save(transfer);
      await this.audit(
        m,
        saved,
        { id: userId, role: 'STORE_USER' },
        'RESCUE_BRIDGE_CREATED',
        null,
        {
          status: T.DRAFT,
          quantityProposed: saved.quantityProposed,
          reserved: saved.reservedQuantity,
        },
      );
      return saved;
    });
  }

  async listTransfers(storeId: string, query: QueryTransfersDto) {
    const transfers = await this.transferRepo.find({
      where: { storeId, ...(query.status ? { transferStatus: query.status } : {}) },
      order: { createdAt: 'DESC' },
    });
    const orgIds = [
      ...new Set(transfers.map((t) => t.recipientOrgId).filter((x): x is string => !!x)),
    ];
    const orgs = orgIds.length
      ? await this.orgRepo.find({ where: { id: In(orgIds) }, select: { id: true, name: true } })
      : [];
    const names = new Map(orgs.map((o) => [o.id, o.name]));
    return transfers.map((t) => ({
      ...this.publicTransferFields(t),
      recipientOrgName: t.recipientOrgId ? (names.get(t.recipientOrgId) ?? null) : null,
    }));
  }

  async getTransfer(storeId: string, id: string) {
    const t = await this.transferRepo.findOne({ where: { id, storeId } });
    if (!t) throw new NotFoundException('Không tìm thấy đề nghị bàn giao.');
    const m = this.dataSource.manager;
    const [org, offer, history, evidenceRequired] = await Promise.all([
      t.recipientOrgId ? this.orgRepo.findOne({ where: { id: t.recipientOrgId } }) : null,
      m.findOne(OfferEntity, { where: { id: t.offerId } }),
      m.find(AuditLogEntity, {
        where: { storeId, targetType: 'RESCUE_BRIDGE_TRANSFER', targetId: t.id },
        order: { createdAt: 'ASC' },
        select: { action: true, actorRole: true, newValue: true, createdAt: true },
      }),
      this.evidenceRequired(),
    ]);
    const item = offer?.itemId
      ? await m.findOne(ItemEntity, { where: { id: offer.itemId } })
      : null;
    return {
      ...this.publicTransferFields(t),
      // BR-B03-09: liên hệ đơn vị chỉ lộ khi đã gửi đề nghị cho chính đơn vị đó
      recipientOrg: org
        ? {
            id: org.id,
            name: org.name,
            capacityNote: org.capacityNote,
            ...(t.sentAt ? { contactName: org.contactName, contactPhone: org.contactPhone } : {}),
          }
        : null,
      offer: offer
        ? {
            id: offer.id,
            itemName: item?.name ?? null,
            pickupStart: offer.pickupStart,
            pickupEnd: offer.pickupEnd,
          }
        : null,
      evidenceRequired,
      allowedActions: this.storeActions(t, new Date()),
      history,
    };
  }

  /** BR-B03-02/03: lọc đơn vị hợp lệ theo loại, số lượng, thời gian, khu vực, năng lực. Không tự gán. */
  async findMatches(storeId: string, id: string) {
    const t = await this.transferRepo.findOne({ where: { id, storeId } });
    if (!t) throw new NotFoundException('Không tìm thấy đề nghị bàn giao.');
    if (t.transferStatus !== T.DRAFT) {
      throw new ConflictException('Chỉ ghép nối khi đề nghị còn ở trạng thái Nháp.');
    }
    const store = await this.dataSource.manager.findOne(StoreEntity, { where: { id: storeId } });
    const orgs = await this.eligibleOrgs(this.dataSource.manager, t, store?.address ?? '');
    return {
      matches: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        acceptedFoodCategories: o.acceptedFoodCategories,
        serviceAreas: o.serviceAreas,
        maxQuantityPerTransfer: o.maxQuantityPerTransfer,
        receivingWindowStart: o.receivingWindowStart,
        receivingWindowEnd: o.receivingWindowEnd,
        capacityNote: o.capacityNote,
      })),
      message: orgs.length
        ? null
        : 'Không có đơn vị tiếp nhận phù hợp với nhóm món, số lượng, khu vực và khung thời gian này. Hệ thống không tự gán nơi nhận - bạn có thể đổi điều kiện hoặc hủy đề nghị để trả suất về tồn bán.',
    };
  }

  async sendTransfer(storeId: string, userId: string, id: string, recipientOrgId: string) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockTransfer(m, id, storeId);
      assertTransferTransition(t.transferStatus, T.SENT);
      if (new Date(t.handoverDeadline) <= new Date())
        throw new BadRequestException('Hạn nhận đã qua.');
      const store = await m.findOne(StoreEntity, { where: { id: storeId } });
      const [org] = await this.eligibleOrgs(m, t, store?.address ?? '', recipientOrgId);
      if (!org) {
        throw new BadRequestException(
          'Đơn vị không hợp lệ hoặc không phù hợp với đề nghị này (BR-B03-02/03).',
        );
      }
      const token = this.newToken(t);
      t.recipientOrgId = org.id;
      t.sentAt = new Date();
      await this.transition(
        m,
        t,
        T.SENT,
        { id: userId, role: 'STORE_USER' },
        {
          newValue: { recipientOrgId: org.id },
        },
      );
      return {
        transfer: this.publicTransferFields(t),
        responseLink: this.link(token),
        recipientContact: {
          name: org.name,
          contactName: org.contactName,
          contactPhone: org.contactPhone,
        },
      };
    });
  }

  /** Cấp lại link phản hồi (link cũ mất hiệu lực). */
  async rotateResponseLink(storeId: string, userId: string, id: string) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockTransfer(m, id, storeId);
      if (!LINK_STATUSES.includes(t.transferStatus)) {
        throw new ConflictException('Đề nghị không còn chờ đơn vị tiếp nhận phản hồi.');
      }
      const token = this.newToken(t);
      await m.save(t);
      await this.audit(
        m,
        t,
        { id: userId, role: 'STORE_USER' },
        'RESCUE_BRIDGE_LINK_ROTATED',
        null,
        null,
      );
      return { responseLink: this.link(token) };
    });
  }

  /** Cửa hàng đồng ý điều kiện đơn vị đã chấp nhận/đề xuất (bước 6): Đã chấp nhận → Chờ bàn giao. */
  async confirmAgreement(storeId: string, userId: string, id: string, dto: ConfirmAgreementDto) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockTransfer(m, id, storeId);
      assertTransferTransition(t.transferStatus, T.AWAITING_HANDOVER);
      if (new Date(t.handoverDeadline) <= new Date())
        throw new BadRequestException('Hạn nhận đã qua.');
      t.storeResponsibleName = dto.storeResponsibleName.trim();
      await this.transition(
        m,
        t,
        T.AWAITING_HANDOVER,
        { id: userId, role: 'STORE_USER' },
        {
          newValue: {
            storeResponsibleName: t.storeResponsibleName,
            agreedPickupAt: t.agreedPickupAt,
          },
        },
      );
      return this.publicTransferFields(t);
    });
  }

  async storeConfirmHandover(
    storeId: string,
    userId: string,
    id: string,
    dto: StoreConfirmHandoverDto,
  ) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockTransfer(m, id, storeId);
      await this.assertCanConfirm(m, t, dto.quantityHandedOver, t.recipientConfirmedAt === null);
      const evidence = dto.evidenceReference?.trim() || t.evidenceReference;
      if (!evidence && (await this.evidenceRequired())) {
        throw new BadRequestException(
          'Thiếu bằng chứng bàn giao bắt buộc theo chính sách - chưa thể xác nhận (BR-B03-06).',
        );
      }
      t.senderConfirmedBy = userId;
      t.senderConfirmedAt = new Date();
      t.senderConfirmedQuantity = dto.quantityHandedOver;
      t.evidenceReference = evidence ?? null;
      const actor: Actor = { id: userId, role: 'STORE_USER' };
      await this.audit(m, t, actor, 'RESCUE_BRIDGE_SENDER_CONFIRMED', null, {
        quantity: dto.quantityHandedOver,
        evidenceReference: t.evidenceReference,
      });
      return this.publicTransferFields(await this.reconcile(m, t, actor));
    });
  }

  /** Đơn vị không đến/không nhận (ngoại lệ CM-B03): ghi trạng thái + lý do, trả suất về tồn. */
  async failTransfer(storeId: string, userId: string, id: string, reason: string) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockTransfer(m, id, storeId);
      if (![T.ACCEPTED, T.AWAITING_HANDOVER].includes(t.transferStatus)) {
        throw new ConflictException('Chỉ báo thất bại khi đề nghị đã được chấp nhận.');
      }
      this.assertNoConfirmation(t);
      await this.close(m, t, T.FAILED, reason.trim(), { id: userId, role: 'STORE_USER' });
      return this.publicTransferFields(t);
    });
  }

  async cancelTransfer(storeId: string, userId: string, id: string, reason: string) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockTransfer(m, id, storeId);
      this.assertNoConfirmation(t);
      await this.close(m, t, T.CANCELLED, reason.trim(), { id: userId, role: 'STORE_USER' });
      return this.publicTransferFields(t);
    });
  }

  /** Báo cáo phân biệt đề nghị / chấp nhận / thực tế bàn giao (tiêu chí nghiệm thu). */
  async getReport(storeId: string, query: QueryReportDto) {
    const scoped = (alias: string) => {
      const qb = this.transferRepo
        .createQueryBuilder(alias)
        .where(`${alias}.store_id = :storeId`, { storeId });
      if (query.from) qb.andWhere(`${alias}.created_at >= :from`, { from: new Date(query.from) });
      if (query.to) qb.andWhere(`${alias}.created_at <= :to`, { to: new Date(query.to) });
      return qb;
    };
    const totals = await scoped('t')
      .select('COUNT(*) FILTER (WHERE t.sent_at IS NOT NULL)', 'proposedCount')
      .addSelect(
        'COALESCE(SUM(t.quantity_proposed) FILTER (WHERE t.sent_at IS NOT NULL), 0)',
        'proposedQty',
      )
      .addSelect('COUNT(*) FILTER (WHERE t.quantity_accepted IS NOT NULL)', 'acceptedCount')
      .addSelect('COALESCE(SUM(t.quantity_accepted), 0)', 'acceptedQty')
      .addSelect('COUNT(*) FILTER (WHERE t.transfer_status IN (:...done))', 'handedCount')
      .addSelect(
        'COALESCE(SUM(t.quantity_handed_over) FILTER (WHERE t.transfer_status IN (:...done)), 0)',
        'handedQty',
      )
      .addSelect(
        'COALESCE(SUM(t.quantity_accepted - t.quantity_handed_over) FILTER (WHERE t.transfer_status IN (:...done)), 0)',
        'shortfallQty',
      )
      .addSelect(
        'COUNT(*) FILTER (WHERE t.is_disputed AND t.transfer_status = :awaiting)',
        'openDisputes',
      )
      .setParameters({ done: [T.HANDED_OVER, T.PARTIAL], awaiting: T.AWAITING_HANDOVER })
      .getRawOne<Record<string, string>>();
    const byStatus = await scoped('s')
      .select('s.transfer_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.transfer_status')
      .getRawMany<{ status: string; count: string }>();
    const reasons = await scoped('r')
      .select('r.transfer_status', 'status')
      .addSelect("COALESCE(r.failure_reason, '(không ghi lý do)')", 'reason')
      .addSelect('COUNT(*)', 'count')
      .andWhere('r.transfer_status IN (:...closed)', {
        closed: [T.REJECTED, T.FAILED, T.CANCELLED],
      })
      .groupBy('r.transfer_status')
      .addGroupBy('r.failure_reason')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ status: string; reason: string; count: string }>();
    const n = (k: string) => Number(totals?.[k] ?? 0);
    return {
      proposed: { count: n('proposedCount'), quantity: n('proposedQty') },
      accepted: { count: n('acceptedCount'), quantity: n('acceptedQty') },
      handedOver: { count: n('handedCount'), quantity: n('handedQty') },
      shortfallQuantity: n('shortfallQty'),
      openDisputes: n('openDisputes'),
      byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      closedReasons: reasons.map((r) => ({
        status: r.status,
        reason: r.reason,
        count: Number(r.count),
      })),
      // BR-B03-07: số bàn giao không đi qua đơn hàng nên không bao giờ nằm trong số đã bán
      note: 'Lượng bàn giao không được tính vào lượng đã bán.',
    };
  }

  // ══════════════════════════ RECIPIENT SIDE (token link) ══════════════════════════

  /** Chỉ thông tin cần để phối hợp (BR-B03-09): tên/địa chỉ/điện thoại cửa hàng, điều kiện đề nghị. */
  async recipientView(token: string) {
    const t = await this.transferRepo.findOne({ where: { responseTokenHash: hashToken(token) } });
    if (!t) throw new NotFoundException('Link không hợp lệ hoặc đã được cấp lại.');
    const m = this.dataSource.manager;
    const [store, offer, org] = await Promise.all([
      m.findOne(StoreEntity, { where: { id: t.storeId } }),
      m.findOne(OfferEntity, { where: { id: t.offerId } }),
      t.recipientOrgId ? this.orgRepo.findOne({ where: { id: t.recipientOrgId } }) : null,
    ]);
    const item = offer?.itemId
      ? await m.findOne(ItemEntity, { where: { id: offer.itemId } })
      : null;
    return {
      id: t.id,
      status: t.transferStatus,
      recipientOrgName: org?.name ?? null,
      store: store ? { name: store.name, address: store.address, phone: store.phone } : null,
      itemName: item?.name ?? null,
      foodCategory: t.foodCategory,
      quantityProposed: t.quantityProposed,
      quantityAccepted: t.quantityAccepted,
      quantityHandedOver: t.quantityHandedOver,
      availableAt: t.availableAt,
      handoverDeadline: t.handoverDeadline,
      storageNotes: t.storageNotes,
      transportResponsibility: t.transportResponsibility,
      agreedPickupAt: t.agreedPickupAt,
      storeResponsibleName: t.storeResponsibleName,
      recipientResponsibleName: t.recipientResponsibleName,
      senderConfirmedQuantity: t.senderConfirmedQuantity,
      recipientConfirmedQuantity: t.recipientConfirmedQuantity,
      isDisputed: t.isDisputed,
      failureReason: t.failureReason,
      safetyNotice:
        'Điều kiện bảo quản do cửa hàng tự khai báo. Nền tảng không xác nhận món an toàn (BR-B03-04) - vui lòng tự kiểm tra khi nhận.',
    };
  }

  async recipientAccept(token: string, dto: RecipientAcceptDto) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockByToken(m, token);
      assertTransferTransition(t.transferStatus, T.ACCEPTED);
      const org = await this.assertOrgStillValid(m, t);
      if (new Date(t.handoverDeadline) <= new Date())
        throw new BadRequestException('Hạn nhận đã qua.');
      if (dto.quantityAccepted > t.quantityProposed) {
        throw new BadRequestException(
          `Không thể nhận nhiều hơn số đề nghị (${t.quantityProposed}).`,
        );
      }
      if (dto.quantityAccepted > org.maxQuantityPerTransfer) {
        throw new BadRequestException(
          `Vượt năng lực đã khai báo của đơn vị (${org.maxQuantityPerTransfer}).`,
        );
      }
      const pickupAt = new Date(dto.pickupAt);
      if (pickupAt < new Date(t.availableAt) || pickupAt > new Date(t.handoverDeadline)) {
        throw new BadRequestException(
          'Thời điểm đến nhận phải nằm trong khung sẵn sàng → hạn nhận.',
        );
      }
      t.quantityAccepted = dto.quantityAccepted;
      t.agreedPickupAt = pickupAt;
      t.recipientResponsibleName = dto.responsibleName.trim();
      t.recipientNote = dto.note?.trim() || null;
      await this.setReserved(m, t, dto.quantityAccepted); // trả phần đơn vị không nhận về tồn bán
      await this.transition(
        m,
        t,
        T.ACCEPTED,
        { id: org.id, role: 'RECIPIENT_ORG' },
        {
          newValue: {
            quantityAccepted: t.quantityAccepted,
            changedFromProposal: t.quantityAccepted !== t.quantityProposed,
            agreedPickupAt: pickupAt,
          },
        },
      );
      return this.recipientView(token);
    });
  }

  async recipientReject(token: string, reason: string) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockByToken(m, token);
      if (t.transferStatus !== T.SENT)
        throw new ConflictException('Đề nghị không còn chờ phản hồi.');
      await this.close(m, t, T.REJECTED, reason.trim(), {
        id: t.recipientOrgId as string,
        role: 'RECIPIENT_ORG',
      });
      return { id: t.id, status: t.transferStatus };
    });
  }

  async recipientConfirmHandover(token: string, dto: RecipientConfirmHandoverDto) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockByToken(m, token);
      await this.assertCanConfirm(m, t, dto.quantityReceived, t.senderConfirmedAt === null);
      t.recipientConfirmedBy = dto.confirmedByName.trim();
      t.recipientConfirmedAt = new Date();
      t.recipientConfirmedQuantity = dto.quantityReceived;
      const actor: Actor = { id: t.recipientOrgId as string, role: 'RECIPIENT_ORG' };
      await this.audit(m, t, actor, 'RESCUE_BRIDGE_RECIPIENT_CONFIRMED', null, {
        quantity: dto.quantityReceived,
        confirmedBy: t.recipientConfirmedBy,
      });
      await this.reconcile(m, t, actor);
      return { id: t.id, status: t.transferStatus, isDisputed: t.isDisputed };
    });
  }

  // ══════════════════════════ PLATFORM OPS (ADMIN) ══════════════════════════

  async createOrg(adminId: string, dto: CreateRecipientOrgDto) {
    const org = this.orgRepo.create(this.normalizeOrg(dto));
    this.assertWindowPair(org);
    return this.dataSource.transaction(async (m) => {
      const saved = await m.save(org);
      await this.auditOrg(m, adminId, 'RECIPIENT_ORG_CREATED', saved);
      return saved;
    });
  }

  async listOrgs() {
    return this.orgRepo.find({ order: { createdAt: 'DESC' } });
  }

  async updateOrg(adminId: string, id: string, dto: UpdateRecipientOrgDto) {
    return this.dataSource.transaction(async (m) => {
      const org = await m.findOne(RecipientOrganizationEntity, { where: { id } });
      if (!org) throw new NotFoundException('Không tìm thấy đơn vị tiếp nhận.');
      Object.assign(org, this.normalizeOrg(dto));
      this.assertWindowPair(org);
      const saved = await m.save(org);
      await this.auditOrg(m, adminId, 'RECIPIENT_ORG_UPDATED', saved, dto);
      return saved;
    });
  }

  async listDisputes() {
    return this.transferRepo.find({
      where: { isDisputed: true, transferStatus: T.AWAITING_HANDOVER },
      order: { handoverDeadline: 'ASC' },
    });
  }

  /** Vận hành xử lý tranh chấp - kết luận do con người đưa ra, hệ thống chỉ ghi nhận. */
  async resolveDispute(adminId: string, id: string, dto: ResolveDisputeDto) {
    return this.dataSource.transaction(async (m) => {
      const t = await this.lockTransfer(m, id);
      if (t.transferStatus !== T.AWAITING_HANDOVER || !t.isDisputed) {
        throw new ConflictException('Đề nghị không ở trạng thái tranh chấp chờ xử lý.');
      }
      if (dto.quantityHandedOver > (t.quantityAccepted ?? 0)) {
        throw new BadRequestException('Số lượng vượt số đã chấp nhận (BR-B03-05).');
      }
      const evidence = dto.evidenceReference?.trim() || t.evidenceReference;
      if (dto.quantityHandedOver > 0 && !evidence && (await this.evidenceRequired())) {
        throw new BadRequestException('Thiếu bằng chứng bắt buộc - chưa thể hoàn tất (BR-B03-06).');
      }
      t.evidenceReference = evidence ?? null;
      t.disputeNote = `${t.disputeNote ?? ''}\n[Vận hành] ${dto.resolutionNote.trim()}`.trim();
      const actor: Actor = { id: adminId, role: 'ADMIN' };
      if (dto.quantityHandedOver === 0) {
        t.isDisputed = false;
        await this.close(m, t, T.FAILED, dto.resolutionNote.trim(), actor);
      } else {
        await this.finalize(m, t, dto.quantityHandedOver, actor);
      }
      return t;
    });
  }

  // ══════════════════════════ JOB (deadline sweep) ══════════════════════════

  /** Quá hạn nhận mà chưa có trạng thái cuối → Hủy (Nháp) / Thất bại / chuyển vận hành nếu một bên đã xác nhận. */
  async processDeadlines(now: Date = new Date()) {
    const due = await this.transferRepo
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .where(
        't.transfer_status IN (:...open) AND t.handover_deadline <= :now AND t.is_disputed = false',
      )
      .setParameters({ open: OPEN_STATUSES, now })
      .getRawMany<{ id: string }>();

    let processed = 0;
    for (const { id } of due) {
      try {
        await this.dataSource.transaction(async (m) => {
          const t = await this.lockTransfer(m, id);
          if (!OPEN_STATUSES.includes(t.transferStatus) || t.isDisputed) return;
          if (new Date(t.handoverDeadline) > now) return;
          if (t.transferStatus === T.DRAFT) {
            await this.close(
              m,
              t,
              T.CANCELLED,
              'Quá hạn nhận khi đề nghị chưa được gửi',
              SYSTEM_ACTOR,
            );
          } else if (t.transferStatus === T.SENT) {
            await this.close(
              m,
              t,
              T.FAILED,
              'Đơn vị tiếp nhận không phản hồi trước hạn nhận',
              SYSTEM_ACTOR,
            );
          } else if (!hasConfirmation(t)) {
            await this.close(
              m,
              t,
              T.FAILED,
              'Quá hạn nhận, không có xác nhận bàn giao',
              SYSTEM_ACTOR,
            );
          } else {
            // Một bên đã xác nhận: không tự kết luận - chuyển vận hành (CM-B03 ngoại lệ tranh chấp)
            t.isDisputed = true;
            t.disputeNote = 'Quá hạn nhận mà chưa đủ xác nhận hai bên - chuyển vận hành xử lý';
            await m.save(t);
            await this.audit(m, t, SYSTEM_ACTOR, 'RESCUE_BRIDGE_DISPUTED', null, {
              reason: t.disputeNote,
            });
          }
          processed += 1;
        });
      } catch (e: unknown) {
        this.logger.error(
          `[RESCUE_BRIDGE_JOB] Transfer ${id}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    return { count: processed };
  }

  // ══════════════════════════ internals ══════════════════════════

  /**
   * Điểm DUY NHẤT thay đổi reserved_quantity. Trừ/hoàn đúng phần chênh lệch vào offers.remaining_quantity
   * trên dòng offer đã khóa FOR UPDATE - cùng mẫu với holdOrder (trừ) và hủy đơn (hoàn).
   * Caller phải lưu transfer trong cùng transaction.
   */
  async setReserved(
    m: EntityManager,
    transfer: RescueBridgeTransferEntity,
    target: number,
    lockedOffer?: OfferEntity,
  ) {
    const delta = target - transfer.reservedQuantity;
    if (delta === 0) return;
    const offer = lockedOffer ?? (await this.lockOffer(m, transfer.offerId));
    if (delta > 0) {
      if (offer.status !== OfferStatus.OPEN) {
        throw new BadRequestException('Suất không còn mở - không thể giữ để bàn giao.');
      }
      if (offer.remainingQuantity < delta) {
        throw new BadRequestException(
          `Số lượng bàn giao vượt lượng còn khả dụng (còn ${offer.remainingQuantity}) (BR-B03-05).`,
        );
      }
    }
    offer.remainingQuantity -= delta;
    if (offer.remainingQuantity === 0 && offer.status === OfferStatus.OPEN) {
      offer.status = OfferStatus.SOLD_OUT;
    } else if (offer.remainingQuantity > 0 && offer.status === OfferStatus.SOLD_OUT) {
      offer.status = OfferStatus.OPEN;
    }
    await m.save(offer);
    transfer.reservedQuantity = target;
  }

  /** Đủ xác nhận hai bên: khớp → hoàn tất; lệch → tranh chấp; thiếu bằng chứng → chưa hoàn tất. */
  private async reconcile(m: EntityManager, t: RescueBridgeTransferEntity, actor: Actor) {
    const s = t.senderConfirmedQuantity;
    const r = t.recipientConfirmedQuantity;
    if (s === null || r === null) {
      return m.save(t);
    }
    if (s !== r) {
      t.isDisputed = true;
      t.disputeNote = `Cửa hàng xác nhận ${s} suất, đơn vị tiếp nhận xác nhận ${r} suất - chuyển vận hành xử lý`;
      await m.save(t);
      await this.audit(m, t, actor, 'RESCUE_BRIDGE_DISPUTED', null, {
        senderQuantity: s,
        recipientQuantity: r,
      });
      return t;
    }
    if (!t.evidenceReference && (await this.evidenceRequired())) {
      return m.save(t); // chính sách đổi giữa chừng: chờ cửa hàng bổ sung bằng chứng
    }
    await this.finalize(m, t, s, actor);
    return t;
  }

  /** Hoàn tất: bàn giao toàn bộ/một phần, trả phần thiếu về tồn, ghi sổ donation_records. */
  private async finalize(
    m: EntityManager,
    t: RescueBridgeTransferEntity,
    qty: number,
    actor: Actor,
  ) {
    const accepted = t.quantityAccepted ?? 0;
    const to = qty === accepted ? T.HANDED_OVER : T.PARTIAL;
    t.quantityHandedOver = qty;
    t.isDisputed = false;
    await this.setReserved(m, t, qty);
    await this.transition(m, t, to, actor, {
      newValue: {
        quantityHandedOver: qty,
        shortfall: accepted - qty,
        evidenceReference: t.evidenceReference,
      },
    });
    const org = t.recipientOrgId
      ? await m.findOne(RecipientOrganizationEntity, { where: { id: t.recipientOrgId } })
      : null;
    await m.save(
      m.create(DonationRecordEntity, {
        storeId: t.storeId,
        offerId: t.offerId,
        quantity: qty,
        recipientInfo: {
          transferId: t.id,
          recipientOrgId: t.recipientOrgId,
          name: org?.name ?? null,
        },
        donatedAt: new Date(),
        note: `Rescue Bridge ${to}${t.evidenceReference ? ` - bằng chứng: ${t.evidenceReference}` : ''}`,
      }),
    );
  }

  /** Từ chối/thất bại/hủy: ghi lý do và trả toàn bộ suất đang giữ về tồn bán. */
  private async close(
    m: EntityManager,
    t: RescueBridgeTransferEntity,
    to: RescueBridgeTransferStatus,
    reason: string,
    actor: Actor,
  ) {
    assertTransferTransition(t.transferStatus, to);
    t.failureReason = reason;
    const released = t.reservedQuantity;
    await this.setReserved(m, t, 0);
    await this.transition(m, t, to, actor, { newValue: { reason, releasedQuantity: released } });
  }

  private async transition(
    m: EntityManager,
    t: RescueBridgeTransferEntity,
    to: RescueBridgeTransferStatus,
    actor: Actor,
    opts: { newValue?: Record<string, unknown> } = {},
  ) {
    const from = t.transferStatus;
    assertTransferTransition(from, to);
    t.transferStatus = to;
    await m.save(t);
    await this.audit(
      m,
      t,
      actor,
      `RESCUE_BRIDGE_${to}`,
      { status: from },
      { status: to, ...(opts.newValue ?? {}) },
    );
  }

  /** BR-B03-08: nhật ký cùng transaction với thay đổi - bảng audit_logs dùng chung. */
  private async audit(
    m: EntityManager,
    t: RescueBridgeTransferEntity,
    actor: Actor,
    action: string,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
  ) {
    await m.save(
      m.create(AuditLogEntity, {
        storeId: t.storeId,
        actorId: actor.id,
        actorRole: actor.role,
        action,
        targetType: 'RESCUE_BRIDGE_TRANSFER',
        targetId: t.id,
        oldValue,
        newValue,
      }),
    );
    this.logger.log(`[AUDIT_LOG] ${action} transfer#${t.id} by ${actor.role}`);
  }

  private async auditOrg(
    m: EntityManager,
    adminId: string,
    action: string,
    org: RecipientOrganizationEntity,
    changes?: object,
  ) {
    await m.save(
      m.create(AuditLogEntity, {
        storeId: null,
        actorId: adminId,
        actorRole: 'ADMIN',
        action,
        targetType: 'RECIPIENT_ORG',
        targetId: org.id,
        oldValue: null,
        newValue: {
          ...(changes ?? { name: org.name }),
          isActive: org.isActive,
          isApproved: org.isApproved,
        },
      }),
    );
  }

  private async eligibleOrgs(
    m: EntityManager,
    t: RescueBridgeTransferEntity,
    storeAddress: string,
    onlyOrgId?: string,
  ) {
    const qb = m
      .createQueryBuilder(RecipientOrganizationEntity, 'o')
      .where('o.is_active = true AND o.is_approved = true')
      .andWhere('o.max_quantity_per_transfer >= :qty', { qty: t.quantityProposed })
      .andWhere(
        'EXISTS (SELECT 1 FROM unnest(o.accepted_food_categories) c WHERE lower(c) = lower(:cat))',
        { cat: t.foodCategory },
      )
      .andWhere(
        "EXISTS (SELECT 1 FROM unnest(o.service_areas) a WHERE a <> '' AND strpos(lower(:addr), lower(a)) > 0)",
        { addr: storeAddress },
      )
      .orderBy('o.name', 'ASC');
    if (onlyOrgId) qb.andWhere('o.id = :orgId', { orgId: onlyOrgId });
    const orgs = await qb.getMany();
    return orgs.filter((o) =>
      windowOverlaps(
        new Date(t.availableAt),
        new Date(t.handoverDeadline),
        o.receivingWindowStart,
        o.receivingWindowEnd,
      ),
    );
  }

  /**
   * Điều kiện xác nhận bàn giao. Xác nhận đầu tiên (= sự kiện bàn giao) phải trong khung
   * sẵn sàng → hạn nhận và lô chưa hết hạn ("lô hết hạn: chặn bàn giao"). Xác nhận thứ hai
   * chỉ ghi nhận sự kiện đã xảy ra, hoặc sửa số liệu khi đang lệch.
   */
  private async assertCanConfirm(
    m: EntityManager,
    t: RescueBridgeTransferEntity,
    qty: number,
    first: boolean,
  ) {
    if (t.transferStatus !== T.AWAITING_HANDOVER) {
      throw new ConflictException('Chỉ xác nhận bàn giao khi đề nghị đang Chờ bàn giao.');
    }
    if (qty > (t.quantityAccepted ?? 0)) {
      throw new BadRequestException(
        `Số lượng vượt số đã thống nhất (${t.quantityAccepted}) (BR-B03-05).`,
      );
    }
    if (!first) return;
    const now = new Date();
    if (now < new Date(t.availableAt))
      throw new BadRequestException('Chưa đến thời điểm sẵn sàng bàn giao.');
    if (now > new Date(t.handoverDeadline)) throw new BadRequestException('Đã quá hạn nhận.');
    const offer = await m.findOne(OfferEntity, { where: { id: t.offerId } });
    const item = offer?.itemId
      ? await m.findOne(ItemEntity, { where: { id: offer.itemId } })
      : null;
    if (!offer || lotExpiry(offer, item) <= now) {
      throw new BadRequestException('Lô đã hết hạn - chặn bàn giao, vui lòng báo thất bại.');
    }
  }

  private assertNoConfirmation(t: RescueBridgeTransferEntity) {
    if (hasConfirmation(t)) {
      throw new ConflictException(
        'Đã có xác nhận bàn giao - không thể hủy/báo thất bại; nếu số liệu sai, liên hệ vận hành xử lý tranh chấp.',
      );
    }
  }

  private async assertOrgStillValid(m: EntityManager, t: RescueBridgeTransferEntity) {
    const org = t.recipientOrgId
      ? await m.findOne(RecipientOrganizationEntity, { where: { id: t.recipientOrgId } })
      : null;
    if (!org || !org.isActive || !org.isApproved) {
      throw new ForbiddenException(
        'Đơn vị tiếp nhận chưa được duyệt hoặc đã ngừng hoạt động (BR-B03-02).',
      );
    }
    return org;
  }

  private storeActions(t: RescueBridgeTransferEntity, now: Date): string[] {
    const s = t.transferStatus;
    const actions: string[] = [];
    if (s === T.DRAFT) actions.push('SEND');
    if (s === T.ACCEPTED) actions.push('CONFIRM_AGREEMENT');
    if (
      s === T.AWAITING_HANDOVER &&
      (t.recipientConfirmedAt !== null ||
        (now >= new Date(t.availableAt) && now <= new Date(t.handoverDeadline)))
    ) {
      actions.push('CONFIRM_HANDOVER');
    }
    if (!hasConfirmation(t)) {
      if (s === T.ACCEPTED || s === T.AWAITING_HANDOVER) actions.push('FAIL');
      if (OPEN_STATUSES.includes(s)) actions.push('CANCEL');
    }
    if (LINK_STATUSES.includes(s)) actions.push('ROTATE_LINK');
    return actions;
  }

  /** Không bao giờ trả token hash ra ngoài. */
  private publicTransferFields(t: RescueBridgeTransferEntity) {
    const { responseTokenHash: _hidden, ...rest } = t;
    return rest;
  }

  private newToken(t: RescueBridgeTransferEntity) {
    const token = randomBytes(32).toString('base64url');
    t.responseTokenHash = hashToken(token);
    return token;
  }

  private link(token: string) {
    const base = this.config.get<string>('WEB_STORE_URL') || 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/bridge/respond/${token}`;
  }

  private evidenceRequired() {
    return this.settingsService.getPlatformSetting<boolean>(
      'rescue_bridge.evidence_required',
      true,
    );
  }

  private normalizeOrg(dto: UpdateRecipientOrgDto) {
    const clean = (xs?: string[]) => xs?.map((x) => x.trim()).filter(Boolean);
    return {
      ...dto,
      ...(dto.acceptedFoodCategories && {
        acceptedFoodCategories: clean(dto.acceptedFoodCategories),
      }),
      ...(dto.serviceAreas && { serviceAreas: clean(dto.serviceAreas) }),
    };
  }

  private assertWindowPair(org: RecipientOrganizationEntity) {
    if (!org.receivingWindowStart !== !org.receivingWindowEnd) {
      throw new BadRequestException('Khung giờ nhận cần đủ cả giờ bắt đầu và kết thúc.');
    }
    if (!org.serviceAreas?.length || !org.acceptedFoodCategories?.length) {
      throw new BadRequestException('Cần ít nhất một khu vực phục vụ và một nhóm món nhận.');
    }
  }

  private async lockOffer(m: EntityManager, offerId: string) {
    const offer = await m
      .createQueryBuilder(OfferEntity, 'offer')
      .setLock('pessimistic_write')
      .where('offer.id = :id', { id: offerId })
      .getOne();
    if (!offer) throw new NotFoundException('Không tìm thấy suất bán.');
    return offer;
  }

  /** Thứ tự khóa luôn là transfer → offer (setReserved) để không deadlock với nhau. */
  private async lockTransfer(m: EntityManager, id: string, storeId?: string) {
    const qb = m
      .createQueryBuilder(RescueBridgeTransferEntity, 't')
      .setLock('pessimistic_write')
      .where('t.id = :id', { id });
    if (storeId) qb.andWhere('t.store_id = :storeId', { storeId });
    const t = await qb.getOne();
    if (!t) throw new NotFoundException('Không tìm thấy đề nghị bàn giao.');
    return t;
  }

  private async lockByToken(m: EntityManager, token: string) {
    const t = await m
      .createQueryBuilder(RescueBridgeTransferEntity, 't')
      .setLock('pessimistic_write')
      .where('t.response_token_hash = :h', { h: hashToken(token) })
      .getOne();
    if (!t) throw new NotFoundException('Link không hợp lệ hoặc đã được cấp lại.');
    return t;
  }
}
