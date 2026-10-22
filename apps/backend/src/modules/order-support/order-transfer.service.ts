import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual, Repository } from 'typeorm';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { UserEntity, UserRole, UserStatus } from '../../entities/auth/user.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { GiftStatus, OrderGiftEntity } from '../../entities/order-support/order-gift.entity';
import { NotificationType } from '../../entities/notifications/notification.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { PickupTokenEntity } from '../../entities/orders/pickup-token.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateGiftDto } from './order-support.dto';

const MAX_GIFTS_PER_DAY = 3;
/** Cần còn đủ thời gian để người nhận chấp nhận và đến lấy. */
const MIN_MINUTES_LEFT_TO_GIFT = 30;
const GIFT_VALID_HOURS = 24;
const SWAP_MIN_MINUTES_LEFT = 20;

const maskPhone = (p: string) => (p.length > 5 ? `${p.slice(0, 3)}***${p.slice(-2)}` : p);
const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, '$1***$2');

/** KX18 tặng suất và KX05 đổi suất, đều chỉ áp dụng cho đơn đã thanh toán và chưa nhận. */
@Injectable()
export class OrderTransferService implements OnModuleInit {
  private readonly logger = new Logger(OrderTransferService.name);

  constructor(
    @InjectRepository(OrderEntity) private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OfferEntity) private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ItemEntity) private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(OrderGiftEntity) private readonly giftRepo: Repository<OrderGiftEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly profileRepo: Repository<CustomerProfileEntity>,
    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditLogService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    setInterval(
      () => void this.expireGifts().catch((e) => this.logger.error(`[GIFT_EXPIRE] ${e}`)),
      10 * 60 * 1000,
    ).unref();
  }

  // ---------------------------------------------------------------- KX18 tặng suất

  async createGift(fromUserId: string, orderId: string, dto: CreateGiftDto) {
    const order = await this.orderRepo.findOne({ where: { id: orderId, customerId: fromUserId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Chỉ tặng được đơn đã thanh toán và chưa nhận hàng.');
    }
    const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });
    const minutesLeft = offer ? (new Date(offer.pickupEnd).getTime() - Date.now()) / 60000 : 0;
    if (minutesLeft < MIN_MINUTES_LEFT_TO_GIFT) {
      throw new BadRequestException(
        `Chỉ tặng khi còn ít nhất ${MIN_MINUTES_LEFT_TO_GIFT} phút trong khung nhận hàng.`,
      );
    }

    const key = dto.recipient.trim();
    const recipient = await this.userRepo.findOne({
      where: key.includes('@') ? { email: key.toLowerCase() } : { phone: key },
    });
    if (
      !recipient ||
      recipient.role !== UserRole.CUSTOMER ||
      recipient.status !== UserStatus.ACTIVE
    ) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản khách hàng với số điện thoại hoặc email này.',
      );
    }
    if (recipient.id === fromUserId)
      throw new BadRequestException('Bạn không thể tặng suất cho chính mình.');

    const since = new Date(Date.now() - 24 * 3600_000);
    const todayCount = await this.giftRepo.count({
      where: { fromUserId, createdAt: MoreThanOrEqual(since) },
    });
    if (todayCount >= MAX_GIFTS_PER_DAY) {
      throw new BadRequestException(`Mỗi ngày chỉ tặng tối đa ${MAX_GIFTS_PER_DAY} suất.`);
    }
    const pending = await this.giftRepo.findOne({ where: { orderId, status: GiftStatus.PENDING } });
    if (pending)
      throw new ConflictException('Đơn này đang có một lời tặng chờ người nhận chấp nhận.');

    const expiresAt = new Date(
      Math.min(
        Date.now() + GIFT_VALID_HOURS * 3600_000,
        new Date(offer!.pickupEnd).getTime() - 15 * 60000,
      ),
    );
    const gift = await this.giftRepo.save(
      this.giftRepo.create({
        orderId,
        fromUserId,
        toUserId: recipient.id,
        status: GiftStatus.PENDING,
        message: dto.message?.trim() || null,
        expiresAt,
        respondedAt: null,
      }),
    );
    const sender = await this.profileRepo.findOne({ where: { userId: fromUserId } });
    await this.notifications.createNotification({
      userId: recipient.id,
      type: NotificationType.ORDER,
      title: 'Bạn được tặng một suất cứu món',
      body: `${sender?.fullName || 'Một người bạn'} muốn tặng bạn suất ${order.code}. Chấp nhận trước ${expiresAt.toLocaleString('vi-VN')}.`,
      data: { giftId: gift.id, kind: 'ORDER_GIFT' },
    });
    await this.audit.log({
      storeId: order.storeId,
      actorId: fromUserId,
      actorRole: 'CUSTOMER',
      action: 'ORDER_GIFT_CREATED',
      targetType: 'ORDER',
      targetId: orderId,
      newValue: { giftId: gift.id },
    });
    return this.presentGift(gift, 'OUTGOING');
  }

  async listGifts(userId: string) {
    await this.expireGifts();
    const [incoming, outgoing] = await Promise.all([
      this.giftRepo.find({ where: { toUserId: userId }, order: { createdAt: 'DESC' }, take: 30 }),
      this.giftRepo.find({ where: { fromUserId: userId }, order: { createdAt: 'DESC' }, take: 30 }),
    ]);
    return {
      incoming: await Promise.all(incoming.map((g) => this.presentGift(g, 'INCOMING'))),
      outgoing: await Promise.all(outgoing.map((g) => this.presentGift(g, 'OUTGOING'))),
    };
  }

  async respondGift(userId: string, giftId: string, action: 'ACCEPT' | 'DECLINE' | 'CANCEL') {
    const result = await this.dataSource.transaction(async (manager) => {
      const gift = await manager.findOne(OrderGiftEntity, {
        where: { id: giftId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!gift) throw new NotFoundException('Không tìm thấy lời tặng.');
      const isRecipient = gift.toUserId === userId;
      const isSender = gift.fromUserId === userId;
      if (!(isRecipient || isSender)) throw new NotFoundException('Không tìm thấy lời tặng.');
      if ((action === 'ACCEPT' || action === 'DECLINE') && !isRecipient)
        throw new BadRequestException('Chỉ người nhận mới chấp nhận hoặc từ chối.');
      if (action === 'CANCEL' && !isSender)
        throw new BadRequestException('Chỉ người tặng mới thu hồi lời tặng.');
      if (gift.status !== GiftStatus.PENDING)
        throw new ConflictException('Lời tặng này đã được xử lý.');
      if (gift.expiresAt.getTime() < Date.now()) {
        gift.status = GiftStatus.EXPIRED;
        gift.respondedAt = new Date();
        await manager.save(gift);
        throw new ConflictException('Lời tặng đã hết hạn.');
      }
      if (action === 'ACCEPT') {
        const order = await manager.findOne(OrderEntity, {
          where: { id: gift.orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order || order.customerId !== gift.fromUserId || order.status !== OrderStatus.PAID) {
          throw new ConflictException(
            'Suất này không còn có thể nhận (đã nhận, đã hủy hoặc đổi chủ).',
          );
        }
        order.customerId = gift.toUserId;
        await manager.save(order);
        gift.status = GiftStatus.ACCEPTED;
      } else {
        gift.status = action === 'DECLINE' ? GiftStatus.DECLINED : GiftStatus.CANCELLED;
      }
      gift.respondedAt = new Date();
      return manager.save(gift);
    });

    if (action !== 'CANCEL') {
      await this.notifications.createNotification({
        userId: result.fromUserId,
        type: NotificationType.ORDER,
        title: action === 'ACCEPT' ? 'Lời tặng đã được nhận' : 'Lời tặng bị từ chối',
        body:
          action === 'ACCEPT'
            ? 'Người bạn tặng đã chấp nhận suất cứu món.'
            : 'Người nhận đã từ chối suất bạn tặng. Suất vẫn thuộc về bạn.',
        data: { giftId: result.id, kind: 'ORDER_GIFT' },
      });
    }
    return this.presentGift(result, result.toUserId === userId ? 'INCOMING' : 'OUTGOING');
  }

  /** Lời tặng quá hạn trả suất về cho người tặng (đơn không đổi chủ nên không cần hoàn tác). */
  async expireGifts(now = new Date()): Promise<number> {
    const res = await this.giftRepo
      .createQueryBuilder()
      .update(OrderGiftEntity)
      .set({ status: GiftStatus.EXPIRED, respondedAt: now })
      .where('status = :s AND expires_at < :now', { s: GiftStatus.PENDING, now })
      .execute();
    return res.affected ?? 0;
  }

  private async presentGift(g: OrderGiftEntity, direction: 'INCOMING' | 'OUTGOING') {
    const otherId = direction === 'INCOMING' ? g.fromUserId : g.toUserId;
    const [order, other, profile] = await Promise.all([
      this.orderRepo.findOne({ where: { id: g.orderId } }),
      this.userRepo.findOne({ where: { id: otherId } }),
      this.profileRepo.findOne({ where: { userId: otherId } }),
    ]);
    const offer = order ? await this.offerRepo.findOne({ where: { id: order.offerId } }) : null;
    const item = offer?.itemId
      ? await this.itemRepo.findOne({ where: { id: offer.itemId } })
      : null;
    return {
      id: g.id,
      direction,
      status: g.status,
      message: g.message,
      expiresAt: g.expiresAt,
      createdAt: g.createdAt,
      orderId: g.orderId,
      orderCode: order?.code ?? null,
      itemName: item?.name ?? null,
      quantity: order?.quantity ?? null,
      pickupEnd: offer?.pickupEnd ?? null,
      counterpart: {
        name: profile?.fullName ?? null,
        contact: other?.email
          ? maskEmail(other.email)
          : other?.phone
            ? maskPhone(other.phone)
            : null,
      },
    };
  }

  // ---------------------------------------------------------------- KX05 đổi suất

  /** Suất cùng cửa hàng khách đổi được: còn đủ phần, giá không cao hơn giá đã trả, còn đủ thời gian nhận. */
  async getSwapOptions(customerId: string, orderId: string) {
    const order = await this.assertSwappable(customerId, orderId);
    const offers = await this.offerRepo.find({
      where: { storeId: order.storeId, status: OfferStatus.OPEN },
      order: { currentPrice: 'ASC' },
      take: 50,
    });
    const now = Date.now();
    // Mã QR đã ký với hạn của suất cũ nên chỉ đổi sang suất kết thúc không muộn hơn hạn đó.
    const token = await this.dataSource.manager.findOne(PickupTokenEntity, { where: { orderId } });
    const oldOffer = await this.offerRepo.findOne({ where: { id: order.offerId } });
    const limit = new Date(token?.expiresAt ?? oldOffer?.pickupEnd ?? 0).getTime();
    const usable = offers.filter(
      (o) =>
        new Date(o.pickupEnd).getTime() <= limit &&
        o.id !== order.offerId &&
        o.remainingQuantity >= order.quantity &&
        o.currentPrice <= order.unitPrice &&
        new Date(o.pickupEnd).getTime() - now >= SWAP_MIN_MINUTES_LEFT * 60000,
    );
    const items = usable.length
      ? await this.itemRepo.find({
          where: { id: In(usable.map((o) => o.itemId).filter(Boolean) as string[]) },
        })
      : [];
    const itemById = new Map(items.map((i) => [i.id, i]));
    return {
      orderId,
      paidUnitPrice: order.unitPrice,
      quantity: order.quantity,
      note: 'Đổi sang suất rẻ hơn không được hoàn phần chênh lệch. Mỗi đơn chỉ đổi một lần.',
      options: usable.map((o) => ({
        offerId: o.id,
        title: (o.itemId && itemById.get(o.itemId)?.name) || 'Suất cứu món',
        currentPrice: o.currentPrice,
        remainingQuantity: o.remainingQuantity,
        pickupStart: o.pickupStart,
        pickupEnd: o.pickupEnd,
      })),
    };
  }

  private async assertSwappable(customerId: string, orderId: string): Promise<OrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id: orderId, customerId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.status !== OrderStatus.PAID)
      throw new BadRequestException('Chỉ đổi được đơn đã thanh toán và chưa nhận hàng.');
    if (order.swappedAt) throw new BadRequestException('Mỗi đơn chỉ được đổi suất một lần.');
    const pendingGift = await this.giftRepo.findOne({
      where: { orderId, status: GiftStatus.PENDING },
    });
    if (pendingGift)
      throw new ConflictException('Đơn đang có lời tặng chờ xử lý, chưa đổi suất được.');
    return order;
  }

  async swap(customerId: string, orderId: string, newOfferId: string) {
    await this.assertSwappable(customerId, orderId);
    const swapped = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(OrderEntity, {
        where: { id: orderId, customerId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order || order.status !== OrderStatus.PAID || order.swappedAt) {
        throw new ConflictException('Đơn không còn đổi suất được.');
      }
      if (newOfferId === order.offerId) throw new BadRequestException('Đây đang là suất của đơn.');
      // Khóa theo thứ tự id để hai lần đổi chéo nhau không bế tắc.
      const [firstId, secondId] = [order.offerId, newOfferId].sort();
      const first = await manager.findOne(OfferEntity, {
        where: { id: firstId },
        lock: { mode: 'pessimistic_write' },
      });
      const second = await manager.findOne(OfferEntity, {
        where: { id: secondId },
        lock: { mode: 'pessimistic_write' },
      });
      const oldOffer = [first, second].find((o) => o?.id === order.offerId);
      const newOffer = [first, second].find((o) => o?.id === newOfferId);
      if (!oldOffer || !newOffer) throw new NotFoundException('Không tìm thấy suất.');
      if (newOffer.storeId !== order.storeId)
        throw new BadRequestException('Chỉ đổi sang suất của cùng cửa hàng.');
      if (newOffer.status !== OfferStatus.OPEN)
        throw new BadRequestException('Suất muốn đổi hiện không mở.');
      if (newOffer.remainingQuantity < order.quantity)
        throw new BadRequestException('Suất muốn đổi không còn đủ số lượng.');
      if (newOffer.currentPrice > order.unitPrice)
        throw new BadRequestException('Chỉ đổi sang suất có giá không cao hơn giá đã trả.');
      const token = await manager.findOne(PickupTokenEntity, { where: { orderId } });
      if (
        new Date(newOffer.pickupEnd).getTime() >
        new Date(token?.expiresAt ?? oldOffer.pickupEnd).getTime()
      ) {
        throw new BadRequestException(
          'Mã QR của đơn chỉ dùng được đến hết khung nhận hiện tại, không đổi sang suất kết thúc muộn hơn.',
        );
      }
      if (new Date(newOffer.pickupEnd).getTime() - Date.now() < SWAP_MIN_MINUTES_LEFT * 60000) {
        throw new BadRequestException('Suất muốn đổi sắp hết giờ nhận.');
      }

      oldOffer.remainingQuantity += order.quantity;
      if (oldOffer.status === OfferStatus.SOLD_OUT && new Date(oldOffer.pickupEnd) > new Date())
        oldOffer.status = OfferStatus.OPEN;
      newOffer.remainingQuantity -= order.quantity;
      if (newOffer.remainingQuantity === 0) newOffer.status = OfferStatus.SOLD_OUT;
      await manager.save(oldOffer);
      await manager.save(newOffer);

      order.swappedFromOfferId = order.offerId;
      order.swappedAt = new Date();
      order.offerId = newOffer.id;
      return manager.save(order);
    });
    await this.audit.log({
      storeId: swapped.storeId,
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: 'ORDER_SWAPPED',
      targetType: 'ORDER',
      targetId: orderId,
      oldValue: { offerId: swapped.swappedFromOfferId },
      newValue: { offerId: swapped.offerId },
    });
    await this.notifications.createNotification({
      storeId: swapped.storeId,
      type: NotificationType.ORDER,
      title: 'Khách đổi suất',
      body: `Đơn ${swapped.code} đã đổi sang suất khác của cửa hàng. Vui lòng chuẩn bị đúng món mới.`,
      data: { orderId, kind: 'ORDER_SWAPPED' },
    });
    return { orderId, code: swapped.code, offerId: swapped.offerId, swappedAt: swapped.swappedAt };
  }
}
