import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { UserEntity } from '../../entities/auth/user.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { SavedPlaceEntity } from '../../entities/auth/saved-place.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { FcmTokenEntity } from '../../entities/auth/fcm-token.entity';
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
        fullName: 'Khách hàng SurplusIQ',
        searchRadiusKm: 2.0,
      });
      await this.profileRepo.save(profile);
    }

    // Đếm số lần noshow trong 30 ngày gần nhất
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const noshowCount = await this.noshowRepo.count({
      where: {
        customerId: userId,
        occurredAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });

    // Kiểm tra trạng thái khóa đặt (R1-048)
    const lock = await this.orderLockRepo.findOne({
      where: { customerId: userId },
    });

    const isOrderLocked = lock ? new Date(lock.lockedUntil) > new Date() : false;
    const lockedUntil = isOrderLocked ? lock?.lockedUntil : null;

    return {
      userId: user.id,
      fullName: profile.fullName || 'Khách hàng SurplusIQ',
      emailMasked: maskEmail(user.email),
      phoneMasked: maskPhone(user.phone),
      avatarUrl: profile.avatarUrl,
      searchRadiusKm: Number(profile.searchRadiusKm || 2.0),
      createdAt: user.createdAt,
      noshowCount30d: noshowCount,
      isOrderLocked,
      lockedUntil,
    };
  }

  /**
   * Chỉnh sửa thông tin hồ sơ cá nhân (R1-006)
   */
  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({ userId, fullName: dto.fullName || 'Khách hàng' });
    }

    if (dto.fullName !== undefined) {
      profile.fullName = dto.fullName.trim();
    }

    if (dto.avatarUrl !== undefined) {
      profile.avatarUrl = dto.avatarUrl;
    }

    if (dto.searchRadiusKm !== undefined) {
      profile.searchRadiusKm = dto.searchRadiusKm;
    }

    const saved = await this.profileRepo.save(profile);
    return this.getProfile(saved.userId);
  }

  /**
   * Xem danh sách địa điểm quen thuộc đã lưu (R1-015)
   */
  async getSavedPlaces(userId: string) {
    const rawPlaces = await this.savedPlaceRepo
      .createQueryBuilder('p')
      .where('p.user_id = :userId', { userId })
      .select([
        'p.id AS id',
        'p.label AS label',
        'p.radius_km AS radius_km',
        'p.created_at AS created_at',
        'ST_Y(p.location::geometry) AS latitude',
        'ST_X(p.location::geometry) AS longitude',
      ])
      .orderBy('p.created_at', 'ASC')
      .getRawMany();

    return rawPlaces.map((p) => ({
      id: p.id,
      label: p.label,
      latitude: p.latitude !== null ? Number(p.latitude) : null,
      longitude: p.longitude !== null ? Number(p.longitude) : null,
      radiusKm: p.radius_km !== null ? Number(p.radius_km) : 2.0,
      createdAt: p.created_at,
    }));
  }

  /**
   * Thêm địa điểm quen thuộc mới (tối đa 5 địa điểm) (R1-015)
   */
  async createSavedPlace(userId: string, dto: CreateSavedPlaceDto) {
    const currentCount = await this.savedPlaceRepo.count({ where: { userId } });
    if (currentCount >= 5) {
      throw new BadRequestException(
        'Khách hàng chỉ được lưu tối đa 5 địa điểm quen thuộc (R1-015).',
      );
    }

    const place = this.savedPlaceRepo.create({
      userId,
      label: dto.label.trim(),
      radiusKm: dto.radiusKm || 2.0,
      location: () => `ST_SetSRID(ST_MakePoint(${dto.longitude}, ${dto.latitude}), 4326)`,
    });

    const saved = await this.savedPlaceRepo.save(place);

    return {
      id: saved.id,
      label: saved.label,
      latitude: dto.latitude,
      longitude: dto.longitude,
      radiusKm: saved.radiusKm,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Xóa địa điểm quen thuộc (R1-015)
   */
  async deleteSavedPlace(userId: string, placeId: string) {
    const place = await this.savedPlaceRepo.findOne({
      where: { id: placeId, userId },
    });

    if (!place) {
      throw new NotFoundException('Địa điểm không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    await this.savedPlaceRepo.remove(place);
    return { success: true, message: 'Đã xóa địa điểm quen thuộc.' };
  }

  /**
   * Lấy hồ sơ ăn uống và dị ứng (R1-016)
   */
  async getDietaryProfile(userId: string) {
    let dietary = await this.dietaryRepo.findOne({ where: { userId } });
    if (!dietary) {
      dietary = this.dietaryRepo.create({
        userId,
        allergens: [],
        excludedItems: [],
      });
      await this.dietaryRepo.save(dietary);
    }

    return {
      allergens: dietary.allergens || [],
      excludedItems: dietary.excludedItems || [],
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
}
