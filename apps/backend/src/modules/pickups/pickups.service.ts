import { getJwtSecret } from '../../common/config/jwt-secret';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notifications/notification.entity';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { PickupTokenEntity, PickupTokenStatus } from '../../entities/orders/pickup-token.entity';
import {
  ProxyPickupCodeEntity,
  ProxyPickupCodeStatus,
} from '../../entities/orders/proxy-pickup-code.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { RewardsService } from '../rewards/rewards.service';
import { QrTokenEngine, BackupPinEngine } from '@surplusiq/core';
import { VerifyPickupDto, VerifyProxyCodeDto } from './dto';
import { ORDERS_CONSTANTS } from '../orders/orders.constants';

export interface PickupVerificationResult {
  success: boolean;
  orderId: string;
  orderCode: string;
  status: OrderStatus;
  pickedUpAt: Date;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  pickupSlot: Date | null;
  note: string | null;
  customerMasked: string;
  message: string;
}

export interface PickupPassDetails {
  orderId: string;
  orderCode: string;
  status: OrderStatus;
  pickupToken: string;
  backupCode: string;
  expiresAt: Date;
  itemName: string;
  quantity: number;
  totalAmount: number;
  note: string | null;
}

@Injectable()
export class PickupsService {
  private readonly logger = new Logger(PickupsService.name);
  private readonly jwtSecret = getJwtSecret();

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(PickupTokenEntity)
    private readonly pickupTokenRepo: Repository<PickupTokenEntity>,
    @InjectRepository(ProxyPickupCodeEntity)
    private readonly proxyCodeRepo: Repository<ProxyPickupCodeEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rewardsService: RewardsService,
    private readonly dataSource: DataSource,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private async notifyPickedUp(order: OrderEntity) {
    await this.notifications?.notifyQuietly({
      userId: order.customerId,
      type: NotificationType.ORDER,
      title: 'Đã nhận hàng',
      body: `Đơn ${order.code} đã được xác nhận nhận hàng. Hãy đánh giá cửa hàng nhé.`,
      data: { orderId: order.id, kind: 'ORDER_PICKED_UP' },
    });
  }

  /**
   * Che giấu thông tin liên hệ khách hàng để hiển thị an toàn tại quầy (bảo vệ quyền riêng tư)
   */
  private maskContact(contact: string | null): string {
    if (!contact) return 'Khách hàng';
    if (contact.includes('@')) {
      const [name, domain] = contact.split('@');
      const maskedName = name.length > 2 ? `${name[0]}***${name.slice(-1)}` : `${name}***`;
      return `${maskedName}@${domain}`;
    }
    // Số điện thoại
    if (contact.length >= 7) {
      return `${contact.slice(0, 3)}****${contact.slice(-3)}`;
    }
    return 'Khách hàng';
  }

  /**
   * Cửa hàng quét QR hoặc nhập PIN 6 số xác nhận giao hàng (R1-058, R2-052, BR-022, BR-069)
   */
  async verifyPickup(
    storeId: string,
    actorId: string,
    dto: VerifyPickupDto,
  ): Promise<PickupVerificationResult> {
    if (!dto.token && !dto.backupCode) {
      throw new BadRequestException(
        'Vui lòng cung cấp mã QR token hoặc mã PIN dự phòng 6 ký tự để xác nhận nhận hàng.',
      );
    }

    const now = new Date();
    let targetOrderId: string | null = null;
    let targetTokenId: string | null = null;

    // 1. Phân giải danh tính đơn hàng từ QR Token hoặc PIN 6 số
    if (dto.token) {
      const verifyResult = QrTokenEngine.verify(dto.token, this.jwtSecret, now);

      if (!verifyResult.isValid || !verifyResult.payload) {
        throw new BadRequestException(
          `Mã QR không hợp lệ hoặc đã hết hạn: ${verifyResult.errorMessage || 'Lỗi kiểm tra chữ ký số'}.`,
        );
      }

      const { jti, orderId, storeId: tokenStoreId } = verifyResult.payload;

      // Kiểm tra cửa hàng khớp với mã QR
      if (tokenStoreId !== storeId) {
        throw new BadRequestException('Mã QR này thuộc về một cửa hàng khác (BR-069).');
      }

      targetOrderId = orderId;
      targetTokenId = jti;
    } else if (dto.backupCode) {
      const normalizedPin = BackupPinEngine.normalize(dto.backupCode);

      if (!BackupPinEngine.isValidFormat(normalizedPin)) {
        throw new BadRequestException(
          'Mã PIN dự phòng phải gồm đúng 6 ký tự thuộc bảng ký tự cho phép (loại bỏ 0, O, 1, I, L) (BR-022).',
        );
      }

      const tokenRecord = await this.pickupTokenRepo.findOne({
        where: { backupCode: normalizedPin, status: PickupTokenStatus.UNUSED },
      });

      if (!tokenRecord) {
        throw new NotFoundException('Mã PIN dự phòng không tồn tại hoặc đã được sử dụng trước đó.');
      }

      if (new Date(tokenRecord.expiresAt) <= now) {
        throw new BadRequestException('Mã PIN dự phòng này đã hết hạn nhận hàng.');
      }

      targetOrderId = tokenRecord.orderId;
      targetTokenId = tokenRecord.id;
    }

    if (!targetOrderId) {
      throw new BadRequestException('Không thể xác định đơn hàng hợp lệ từ thông tin đã cung cấp.');
    }

    // 2. Mở Transaction khóa bi quan trên đơn hàng (pessimistic_write) để chốt trạng thái một lần duy nhất
    return this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(OrderEntity, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: targetOrderId })
        .getOne();

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${targetOrderId}].`);
      }

      if (order.storeId !== storeId) {
        throw new BadRequestException('Đơn hàng này không thuộc về cửa hàng của bạn (BR-069).');
      }

      if (order.status === OrderStatus.PICKED_UP) {
        throw new BadRequestException(
          'Đơn hàng này đã được xác nhận nhận hàng tại quầy trước đó rồi.',
        );
      }

      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException(
          `Chỉ có thể giao đơn hàng đã thanh toán thành công (Trạng thái hiện tại: ${order.status}).`,
        );
      }

      // 3. Kiểm tra khung giờ nhận hàng + 15 phút trễ (BR-069)
      const offer = await manager.findOne(OfferEntity, { where: { id: order.offerId } });

      let deadline: Date | null = null;
      if (offer && offer.pickupEnd) {
        deadline = new Date(offer.pickupEnd);
      } else if (order.pickupSlot) {
        deadline = new Date(order.pickupSlot);
      }

      if (deadline) {
        const graceMinutes = ORDERS_CONSTANTS.PICKUP_GRACE_MINUTES;
        const graceDeadline = new Date(deadline.getTime() + graceMinutes * 60 * 1000);
        if (now > graceDeadline) {
          throw new BadRequestException(
            `Đã quá thời gian nhận hàng cho phép (+ ${graceMinutes} phút trễ) (BR-069). Khung nhận kết thúc lúc ${deadline.toLocaleTimeString(
              'vi-VN',
            )}.`,
          );
        }
      }

      // 4. Cập nhật trạng thái đơn sang PICKED_UP
      order.status = OrderStatus.PICKED_UP;
      order.pickedUpAt = now;
      order.pickedUpBy = actorId;
      const savedOrder = await manager.save(order);

      // 5. Đánh dấu vé nhận hàng đã sử dụng (USED)
      if (targetTokenId) {
        const tokenToUpdate = await manager.findOne(PickupTokenEntity, {
          where: { id: targetTokenId },
        });
        if (tokenToUpdate) {
          tokenToUpdate.status = PickupTokenStatus.USED;
          tokenToUpdate.usedAt = now;
          await manager.save(tokenToUpdate);
        }
      } else {
        // Cập nhật tất cả token còn UNUSED của đơn này
        await manager.update(
          PickupTokenEntity,
          { orderId: order.id, status: PickupTokenStatus.UNUSED },
          { status: PickupTokenStatus.USED, usedAt: now },
        );
      }

      // 5b. Cộng điểm thưởng Rescue Rewards cho đơn đã nhận thành công (CM-C04, BR-C04-01)
      await this.rewardsService.awardForOrder(
        savedOrder.customerId,
        savedOrder.id,
        savedOrder.totalAmount,
        manager,
      );

      // 6. Lấy tên món và thông tin đối chiếu tại quầy
      let itemName = 'Món ăn Surplus';
      if (offer?.itemId) {
        const item = await manager.findOne(ItemEntity, { where: { id: offer.itemId } });
        if (item) {
          itemName = item.name;
        }
      }

      // 7. Lấy thông tin khách hàng che giấu (Masked)
      const customer = await manager.findOne(UserEntity, { where: { id: order.customerId } });
      const customerMasked = this.maskContact(customer?.phone || customer?.email || null);

      // 8. Ghi nhật ký kiểm toán
      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_MEMBER',
        action: 'ORDER_PICKUP_VERIFIED',
        targetType: 'ORDER',
        targetId: savedOrder.id,
        newValue: {
          status: OrderStatus.PICKED_UP,
          pickedUpAt: savedOrder.pickedUpAt,
          verifiedVia: dto.token ? 'QR_TOKEN' : 'BACKUP_PIN',
        },
      });

      await this.notifyPickedUp(savedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderCode: savedOrder.code,
        status: OrderStatus.PICKED_UP,
        pickedUpAt: savedOrder.pickedUpAt,
        itemName,
        quantity: savedOrder.quantity,
        unitPrice: savedOrder.unitPrice,
        totalAmount: savedOrder.totalAmount,
        pickupSlot: savedOrder.pickupSlot,
        note: savedOrder.note,
        customerMasked,
        message: 'Xác nhận nhận hàng thành công.',
      };
    });
  }

  /**
   * Khách hàng lấy thông tin vé nhận hàng (QR Token HMAC & Mã PIN dự phòng) (R1-057, BR-022)
   */
  async getPickupPass(customerId: string, orderId: string): Promise<PickupPassDetails> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${orderId}].`);
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Vé nhận hàng chỉ hiển thị đối với đơn đã thanh toán thành công (Trạng thái hiện tại: ${order.status}) (BR-022).`,
      );
    }

    let tokenRecord = await this.pickupTokenRepo.findOne({
      where: { orderId, status: PickupTokenStatus.UNUSED },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const offer = await this.offerRepo.findOne({ where: { id: order.offerId } });

    // Nếu chưa có token hoặc token đã hết hạn, tạo mới
    if (!tokenRecord) {
      let expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (offer && offer.pickupEnd) {
        expiresAt = new Date(offer.pickupEnd);
      }

      tokenRecord = this.pickupTokenRepo.create({
        orderId: order.id,
        backupCode: BackupPinEngine.generate(),
        expiresAt,
        status: PickupTokenStatus.UNUSED,
      });
      tokenRecord = await this.pickupTokenRepo.save(tokenRecord);
    }

    // Ký token QR HMAC-SHA256 (tuyệt đối không chứa PII như buyerId, email, sđt - BR-022)
    const signedQrToken = QrTokenEngine.sign(
      {
        jti: tokenRecord.id,
        orderId: order.id,
        storeId: order.storeId,
        exp: new Date(tokenRecord.expiresAt).getTime(),
      },
      this.jwtSecret,
    );

    let itemName = 'Món ăn Surplus';
    if (offer?.itemId) {
      const item = await this.itemRepo.findOne({ where: { id: offer.itemId } });
      if (item) {
        itemName = item.name;
      }
    }

    return {
      orderId: order.id,
      orderCode: order.code,
      status: order.status,
      pickupToken: signedQrToken,
      backupCode: tokenRecord.backupCode,
      expiresAt: tokenRecord.expiresAt,
      itemName,
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      note: order.note,
    };
  }

  /**
   * Cửa hàng xác nhận giao hàng thông qua Mã Nhận Hộ 8 ký tự do người thân khách cung cấp (R1-052)
   */
  async verifyProxyPickup(
    storeId: string,
    actorId: string,
    dto: VerifyProxyCodeDto,
  ): Promise<PickupVerificationResult> {
    const code = dto.code.trim().toUpperCase();
    const proxyRecord = await this.proxyCodeRepo.findOne({
      where: { code, status: ProxyPickupCodeStatus.UNUSED },
    });

    if (!proxyRecord) {
      throw new NotFoundException(
        'Mã nhận hộ không tồn tại hoặc đã được sử dụng trước đó (R1-052).',
      );
    }

    const now = new Date();
    if (new Date(proxyRecord.expiresAt) <= now) {
      throw new BadRequestException('Mã nhận hộ này đã hết hạn nhận hàng.');
    }

    return this.dataSource.transaction(async (manager) => {
      const order = await manager
        .createQueryBuilder(OrderEntity, 'order')
        .setLock('pessimistic_write')
        .where('order.id = :id', { id: proxyRecord.orderId })
        .getOne();

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng với ID [${proxyRecord.orderId}].`);
      }

      if (order.storeId !== storeId) {
        throw new BadRequestException('Mã nhận hộ này thuộc về đơn hàng của cửa hàng khác.');
      }

      if (order.status === OrderStatus.PICKED_UP) {
        throw new BadRequestException('Đơn hàng này đã được xác nhận nhận hàng trước đó rồi.');
      }

      if (order.status !== OrderStatus.PAID) {
        throw new BadRequestException(
          `Chỉ có thể giao đơn hàng đã thanh toán thành công (Trạng thái hiện tại: ${order.status}).`,
        );
      }

      // 1. Cập nhật mã nhận hộ thành USED
      proxyRecord.status = ProxyPickupCodeStatus.USED;
      await manager.save(proxyRecord);

      // 2. Vô hiệu hóa mã QR gốc nếu có
      await manager.update(
        PickupTokenEntity,
        { orderId: order.id, status: PickupTokenStatus.UNUSED },
        { status: PickupTokenStatus.USED },
      );

      // 3. Đánh dấu đơn hàng là PICKED_UP
      order.status = OrderStatus.PICKED_UP;
      order.pickedUpAt = now;
      order.pickedUpBy = actorId;
      const savedOrder = await manager.save(order);

      // 3b. Cộng điểm thưởng Rescue Rewards cho đơn đã nhận thành công (CM-C04, BR-C04-01)
      await this.rewardsService.awardForOrder(
        savedOrder.customerId,
        savedOrder.id,
        savedOrder.totalAmount,
        manager,
      );

      // 4. Lấy chi tiết món ăn & khách hàng để trả về cho quầy
      const offer = await manager.findOne(OfferEntity, { where: { id: order.offerId } });
      const item = offer
        ? await manager.findOne(ItemEntity, { where: { id: offer.itemId } })
        : null;
      const customer = await manager.findOne(UserEntity, { where: { id: order.customerId } });

      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_STAFF',
        action: 'PICKUP_VERIFIED_VIA_PROXY_CODE',
        targetType: 'ORDER',
        targetId: order.id,
        newValue: {
          orderCode: order.code,
          pickedUpAt: savedOrder.pickedUpAt,
          proxyCode: proxyRecord.code,
        },
      });

      await this.notifyPickedUp(savedOrder);

      return {
        success: true,
        orderId: savedOrder.id,
        orderCode: savedOrder.code,
        status: savedOrder.status,
        pickedUpAt: savedOrder.pickedUpAt!,
        itemName: item?.name || 'Món ăn',
        quantity: savedOrder.quantity,
        unitPrice: savedOrder.unitPrice,
        totalAmount: savedOrder.totalAmount,
        pickupSlot: savedOrder.pickupSlot,
        note: savedOrder.note,
        customerMasked: `${this.maskContact(customer?.phone || customer?.email || null)} (Nhận hộ)`,
        message: 'Xác nhận nhận hàng qua mã nhận hộ thành công.',
      };
    });
  }
}
