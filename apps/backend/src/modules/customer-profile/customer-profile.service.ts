import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { UserEntity, UserStatus } from '../../entities/auth/user.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { SavedPlaceEntity } from '../../entities/auth/saved-place.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { FcmTokenEntity } from '../../entities/auth/fcm-token.entity';
import { ConsentEntity, ConsentType } from '../../entities/auth/consent.entity';
import { FavoriteStoreEntity } from '../../entities/auth/favorite-store.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { PromotionWalletEntity } from '../../entities/marketing/promotion-wallet.entity';
import { PromotionEntity, PromotionStatus } from '../../entities/marketing/promotion.entity';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { CreateSavedPlaceDto } from './dto/saved-place.dto';
import { UpdateDietaryProfileDto } from './dto/dietary-profile.dto';
import { RegisterFcmTokenDto } from './dto/fcm-token.dto';

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
  return `${maskedName}@${domain}`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 3)}***${phone.slice(-3)}`;
}

@Injectable()
export class CustomerProfileService {
  private readonly logger = new Logger(CustomerProfileService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly profileRepo: Repository<CustomerProfileEntity>,
    @InjectRepository(SavedPlaceEntity)
    private readonly savedPlaceRepo: Repository<SavedPlaceEntity>,
    @InjectRepository(DietaryProfileEntity)
    private readonly dietaryRepo: Repository<DietaryProfileEntity>,
    @InjectRepository(NoshowRecordEntity)
    private readonly noshowRepo: Repository<NoshowRecordEntity>,
    @InjectRepository(OrderLockEntity)
    private readonly orderLockRepo: Repository<OrderLockEntity>,
    @InjectRepository(FcmTokenEntity)
    private readonly fcmRepo: Repository<FcmTokenEntity>,
    @InjectRepository(ConsentEntity)
    private readonly consentRepo: Repository<ConsentEntity>,
    @InjectRepository(FavoriteStoreEntity)
    private readonly favoriteRepo: Repository<FavoriteStoreEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly paymentRepo: Repository<PaymentTransactionEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(PromotionWalletEntity)
    private readonly walletRepo: Repository<PromotionWalletEntity>,
    @InjectRepository(PromotionEntity)
    private readonly promotionRepo: Repository<PromotionEntity>,
  ) {}

  /**
   * Xem hồ sơ cá nhân của khách hàng kèm thông tin bảo mật và trạng thái khóa đặt (R1-005, R1-048)
   */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({
        userId,
        fullName: 'Khách hàng',
        searchRadiusKm: 5.0,
      });
      profile = await this.profileRepo.save(profile);
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const noshowCount = await this.noshowRepo.count({
      where: {
        customerId: userId,
        excluded: false,
        occurredAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    const now = new Date();
    const orderLock = await this.orderLockRepo.findOne({ where: { customerId: userId } });
    const isLocked = Boolean(
      orderLock && orderLock.lockedUntil && new Date(orderLock.lockedUntil) > now,
    );

    return {
      userId: user.id,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      searchRadiusKm: Number(profile.searchRadiusKm),
      twoFactorEnabled: user.twoFactorEnabled,
      status: user.status,
      noshowCount30d: noshowCount,
      orderLock: {
        isLocked,
        lockedUntil: isLocked && orderLock ? orderLock.lockedUntil : null,
      },
    };
  }

  /**
   * Chỉnh sửa thông tin hồ sơ cá nhân (R1-006, BR-004)
   */
  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({
        userId,
        fullName: dto.fullName || 'Khách hàng',
        searchRadiusKm: dto.searchRadiusKm || 5.0,
      });
    }

    if (dto.fullName !== undefined) profile.fullName = dto.fullName;
    if (dto.avatarUrl !== undefined) profile.avatarUrl = dto.avatarUrl;
    if (dto.searchRadiusKm !== undefined) profile.searchRadiusKm = dto.searchRadiusKm;
    if (dto.lastLat !== undefined) profile.lastLat = dto.lastLat;
    if (dto.lastLng !== undefined) profile.lastLng = dto.lastLng;

    const saved = await this.profileRepo.save(profile);
    return {
      fullName: saved.fullName,
      avatarUrl: saved.avatarUrl,
      searchRadiusKm: Number(saved.searchRadiusKm),
      lastLat: saved.lastLat ? Number(saved.lastLat) : null,
      lastLng: saved.lastLng ? Number(saved.lastLng) : null,
    };
  }

  /**
   * Xem danh sách địa điểm quen thuộc (R1-015)
   */
  async getSavedPlaces(userId: string) {
    return this.savedPlaceRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Thêm địa điểm quen thuộc mới (tối đa 5 địa điểm) (R1-015)
   */
  async createSavedPlace(userId: string, dto: CreateSavedPlaceDto) {
    const count = await this.savedPlaceRepo.count({ where: { userId } });
    if (count >= 5) {
      throw new BadRequestException('Bạn chỉ được lưu tối đa 5 địa điểm quen thuộc (R1-015).');
    }

    const place = this.savedPlaceRepo.create({
      userId,
      label: dto.label,
      location: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      radiusKm: dto.radiusKm,
    });

    return this.savedPlaceRepo.save(place);
  }

  /**
   * Xóa địa điểm quen thuộc (R1-015)
   */
  async deleteSavedPlace(userId: string, placeId: string) {
    const place = await this.savedPlaceRepo.findOne({ where: { id: placeId, userId } });
    if (!place) {
      throw new NotFoundException('Địa điểm không tồn tại hoặc không thuộc về bạn.');
    }
    await this.savedPlaceRepo.delete({ id: placeId });
    return { success: true, message: 'Đã xóa địa điểm thành công.' };
  }

  /**
   * Lấy hồ sơ ăn uống và dị ứng của khách hàng (R1-016)
   */
  async getDietaryProfile(userId: string) {
    const dietary = await this.dietaryRepo.findOne({ where: { userId } });
    return {
      allergens: dietary?.allergens || [],
      excludedItems: dietary?.excludedItems || [],
    };
  }

  /**
   * Cập nhật hồ sơ ăn uống và dị ứng (R1-016)
   */
  async updateDietaryProfile(userId: string, dto: UpdateDietaryProfileDto) {
    let dietary = await this.dietaryRepo.findOne({ where: { userId } });
    if (!dietary) {
      dietary = this.dietaryRepo.create({ userId });
    }

    dietary.allergens = dto.allergens;
    dietary.excludedItems = dto.excludedItems;

    const saved = await this.dietaryRepo.save(dietary);
    return {
      allergens: saved.allergens,
      excludedItems: saved.excludedItems,
    };
  }

  /**
   * Đăng ký hoặc cập nhật FCM Token của thiết bị (R1-004, R1-073)
   */
  async registerFcmToken(userId: string, dto: RegisterFcmTokenDto) {
    let fcm = await this.fcmRepo.findOne({
      where: { userId, deviceId: dto.deviceId },
    });

    if (!fcm) {
      fcm = this.fcmRepo.create({
        userId,
        deviceId: dto.deviceId,
        token: dto.token,
        enabled: dto.enabled !== undefined ? dto.enabled : true,
      });
    } else {
      fcm.token = dto.token;
      if (dto.enabled !== undefined) {
        fcm.enabled = dto.enabled;
      }
    }

    await this.fcmRepo.save(fcm);
    return { success: true, message: 'Đăng ký FCM Token thành công.' };
  }

  /**
   * Hủy đăng ký FCM Token khi đăng xuất khỏi thiết bị (R1-004)
   */
  async deleteFcmToken(userId: string, deviceId: string) {
    await this.fcmRepo.delete({ userId, deviceId });
    return { success: true, message: 'Hủy đăng ký FCM Token trên thiết bị thành công.' };
  }

  /**
   * Lấy danh sách chấp thuận người dùng (R1-012, R1-017)
   */
  async getConsents(userId: string) {
    return this.consentRepo.find({
      where: { userId },
      order: { grantedAt: 'DESC' },
    });
  }

  /**
   * Ghi nhận chấp thuận / rút lại (R1-012, R1-017, BR-005) - lịch sử chỉ INSERT
   */
  async recordConsent(
    userId: string,
    type: ConsentType,
    granted: boolean,
    version: string = '1.0',
  ) {
    const consent = this.consentRepo.create({
      userId,
      type,
      granted,
      version,
    });
    return this.consentRepo.save(consent);
  }

  /**
   * Cài đặt nhận thông báo (R1-010)
   */
  async getNotificationSettings(userId: string) {
    const fcm = await this.fcmRepo.findOne({ where: { userId } });
    return {
      orderUpdates: true, // Bắt buộc luôn bật theo BRD
      dealAlerts: fcm ? fcm.enabled : true,
      promotions: true,
      quietHours: { start: '22:00', end: '07:00' },
    };
  }

  /**
   * Yêu cầu xóa tài khoản (R1-011, R1-019, BR-007)
   */
  async requestAccountDelete(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    user.status = UserStatus.PENDING_DELETE;
    user.deleteRequestedAt = new Date();
    await this.userRepo.save(user);

    return {
      success: true,
      status: user.status,
      deleteRequestedAt: user.deleteRequestedAt,
      message:
        'Yêu cầu xóa tài khoản đã được ghi nhận. Tài khoản sẽ được ẩn danh sau 7 ngày (BR-007).',
    };
  }

  /**
   * Hủy yêu cầu xóa tài khoản trong thời gian 7 ngày ân hạn (R1-019)
   */
  async cancelAccountDelete(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    user.status = UserStatus.ACTIVE;
    user.deleteRequestedAt = null;
    await this.userRepo.save(user);

    return {
      success: true,
      status: user.status,
      message: 'Đã hủy yêu cầu xóa tài khoản thành công.',
    };
  }

  /**
   * Xuất dữ liệu cá nhân (R1-018 - link 24h)
   */
  async exportUserData(userId: string) {
    const profile = await this.getProfile(userId);
    const dietary = await this.getDietaryProfile(userId);
    const places = await this.getSavedPlaces(userId);
    const consents = await this.getConsents(userId);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile,
      dietary,
      savedPlaces: places,
      consents,
    };

    return {
      downloadUrl: `https://api.surplusiq.vn/v1/customer/data-export/download?token=${Buffer.from(userId).toString('base64')}`,
      expiresInHours: 24,
      data: exportPayload,
    };
  }

  /**
   * Danh sách cửa hàng yêu thích (R1-028)
   */
  async getFavoriteStores(userId: string) {
    return this.favoriteRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Thêm cửa hàng yêu thích (tối đa 50) (R1-028)
   */
  async addFavoriteStore(userId: string, storeId: string) {
    const count = await this.favoriteRepo.count({ where: { userId } });
    if (count >= 50) {
      throw new BadRequestException(
        'Bạn chỉ được lưu tối đa 50 cửa hàng yêu thích (BR-011, R1-028).',
      );
    }

    const existing = await this.favoriteRepo.findOne({ where: { userId, storeId } });
    if (existing) {
      return existing;
    }

    const fav = this.favoriteRepo.create({ userId, storeId });
    return this.favoriteRepo.save(fav);
  }

  /**
   * Bỏ cửa hàng yêu thích (R1-029)
   */
  async removeFavoriteStore(userId: string, storeId: string) {
    await this.favoriteRepo.delete({ userId, storeId });
    return { success: true, message: 'Đã bỏ cửa hàng khỏi danh sách yêu thích.' };
  }

  /**
   * Lịch sử giao dịch thanh toán và hoàn tiền của khách hàng (R1-077)
   */
  async getCustomerTransactions(userId: string) {
    const orders = await this.orderRepo.find({
      where: { customerId: userId },
      select: ['id'],
    });

    const orderIds = orders.map((o) => o.id);
    if (orderIds.length === 0) return [];

    return this.paymentRepo.find({
      where: { orderId: In(orderIds) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Xem trạng thái khóa đặt hàng (R1-048)
   */
  async getOrderLockStatus(userId: string) {
    const now = new Date();
    const lock = await this.orderLockRepo.findOne({ where: { customerId: userId } });
    const isLocked = Boolean(lock && lock.lockedUntil && new Date(lock.lockedUntil) > now);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const noshowRecords = await this.noshowRepo.find({
      where: {
        customerId: userId,
        excluded: false,
        occurredAt: MoreThanOrEqual(thirtyDaysAgo),
      },
      order: { occurredAt: 'DESC' },
    });

    return {
      isLocked,
      lockedUntil: isLocked && lock ? lock.lockedUntil : null,
      noshowCount30d: noshowRecords.length,
      noshowRecords,
      policy:
        'Tài khoản vi phạm từ 3 lần noshow trong 30 ngày sẽ bị tạm khóa đặt hàng 7 ngày (BR-020).',
    };
  }

  /**
   * Ví ưu đãi của khách hàng (R1-078)
   */
  async getPromotionWallet(userId: string) {
    const walletItems = await this.walletRepo.find({
      where: { customerId: userId },
      order: { claimedAt: 'DESC' },
    });

    const promoIds = walletItems.map((w) => w.promotionId);
    if (promoIds.length === 0) return [];

    const promotions = await this.promotionRepo.find({
      where: { id: In(promoIds) },
    });

    return walletItems.map((item) => {
      const promo = promotions.find((p) => p.id === item.promotionId);
      return {
        ...item,
        promotion: promo || null,
        isUsable: !item.usedAt && promo?.status === PromotionStatus.ACTIVE,
      };
    });
  }

  /**
   * Thu thập ưu đãi vào ví (R1-079)
   */
  async claimPromotion(userId: string, promotionId: string) {
    const promo = await this.promotionRepo.findOne({ where: { id: promotionId } });
    if (!promo || promo.status !== PromotionStatus.ACTIVE) {
      throw new NotFoundException('Mã ưu đãi không tồn tại hoặc đã kết thúc');
    }

    const existing = await this.walletRepo.findOne({
      where: { customerId: userId, promotionId },
    });
    if (existing) {
      throw new ConflictException('Bạn đã thu thập mã ưu đãi này rồi');
    }

    const item = this.walletRepo.create({
      customerId: userId,
      promotionId,
      claimedAt: new Date(),
    });

    return this.walletRepo.save(item);
  }
}
