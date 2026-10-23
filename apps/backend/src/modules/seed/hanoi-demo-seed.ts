import { DataSource } from 'typeorm';
import { normalizeFoodCategory } from '../catalog/food-category';
import { Logger } from '@nestjs/common';
import {
  UserEntity,
  UserRole,
  UserStatus,
  StoreEntity,
  StoreStatus,
  StoreSettingsEntity,
  PricingMode,
  ItemEntity,
  ItemStatus,
  OfferEntity,
  OfferKind,
  OfferStatus,
  TrustpassInformationSource,
  TrustpassVerificationStatus,
  TrustpassReviewStatus,
  StoreMemberEntity,
  StorePermission,
  StoreMemberStatus,
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities';
import { CryptoUtil } from '../auth/crypto.util';
import { HANOI_50_STORES, HanoiStoreSeedDef, HanoiItemDef } from './hanoi-stores.catalog';

export { HANOI_50_STORES, HanoiStoreSeedDef, HanoiItemDef };

export const HANOI_DEMO_CENTER = {
  address: '122 Hoàng Quốc Việt, Phường Nghĩa Đô, Quận Cầu Giấy, Hà Nội',
  lat: 21.0458,
  lng: 105.795,
};

export async function seedHanoiStoresAndOffers(dataSource: DataSource): Promise<{
  storesCount: number;
  itemsCount: number;
  offersCount: number;
  storesUpdated?: number;
  itemsUpdated?: number;
  offersUpdated?: number;
}> {
  const logger = new Logger('HanoiDemoSeed');
  logger.log(
    '🚀 Bắt đầu nạp 50 cửa hàng ẩm thực thực tế kèm 3-6 món/quán quanh Cầu Giấy, Hà Nội...',
  );

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Đảm bảo có User chủ quán demo cho Hà Nội & phân quyền store_members
    const demoStoreAccounts = [
      {
        userId: 'a1000000-0000-4000-8000-000000000000',
        storeId: 'a1000000-0000-4000-8000-000000000001',
        email: 'chuthucan.hanoi@surplusiq.vn',
        phone: '0988123000',
        name: 'Chủ Quán Cơm Thố Anh Nguyễn & Cụm Hà Nội',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000021',
        storeId: 'a1000000-0000-4000-8000-000000000002',
        email: 'chuthucan2.hanoi@surplusiq.vn',
        phone: '0988123002',
        name: 'Chủ Quán Cơm Văn Phòng Sakura Quán',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000025',
        storeId: 'a1000000-0000-4000-8000-000000000003',
        email: 'chuthucan3.hanoi@surplusiq.vn',
        phone: '0988123003',
        name: 'Chủ Quán Cơm Tấm Sườn Nướng 234',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000032',
        storeId: 'a1000000-0000-4000-8000-000000000042',
        email: 'banhmi.cotdien@surplusiq.vn',
        phone: '0988123042',
        name: 'Chủ Quán Bánh Mì Chảo Cột Điện Quán Nghĩa Tân',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000033',
        storeId: 'a1000000-0000-4000-8000-000000000021',
        email: 'buncha.sinhtu@surplusiq.vn',
        phone: '0988123021',
        name: 'Chủ Quán Bún Chả Sinh Từ',
      },
    ];

    const hanoiOwnerId = demoStoreAccounts[0].userId;

    for (const acc of demoStoreAccounts) {
      const existingUser = await queryRunner.manager.findOne(UserEntity, {
        where: { id: acc.userId },
      });
      if (!existingUser) {
        const ownerUser = queryRunner.manager.create(UserEntity, {
          id: acc.userId,
          email: acc.email,
          phone: acc.phone,
          fullName: acc.name,
          role: UserRole.STORE_USER,
          status: UserStatus.ACTIVE,
          passwordHash: CryptoUtil.hashPassword('Surplus@1'),
        });
        await queryRunner.manager.save(UserEntity, ownerUser);
      } else {
        existingUser.status = UserStatus.ACTIVE;
        existingUser.role = UserRole.STORE_USER;
        existingUser.fullName = acc.name;
        existingUser.passwordHash = CryptoUtil.hashPassword('Surplus@1');
        await queryRunner.manager.save(UserEntity, existingUser);
      }

      // Đảm bảo có StoreMemberEntity liên kết tài khoản với cửa hàng để login app merchant/web store lấy được storeId
      const existingMember = await queryRunner.manager.findOne(StoreMemberEntity, {
        where: { userId: acc.userId },
      });
      if (!existingMember) {
        const member = queryRunner.manager.create(StoreMemberEntity, {
          storeId: acc.storeId,
          userId: acc.userId,
          permission: StorePermission.OWNER,
          status: StoreMemberStatus.ACTIVE,
          lastActiveAt: new Date(),
        });
        await queryRunner.manager.save(StoreMemberEntity, member);
      } else {
        existingMember.storeId = acc.storeId;
        existingMember.permission = StorePermission.OWNER;
        existingMember.status = StoreMemberStatus.ACTIVE;
        await queryRunner.manager.save(StoreMemberEntity, existingMember);
      }
    }

    const now = new Date();
    // Khung giờ cứu món cuối ngày chuẩn: từ 21:30 đến 23:30 tối
    const pickupStart = new Date(now);
    pickupStart.setHours(21, 30, 0, 0);

    const pickupEnd = new Date(now);
    pickupEnd.setHours(23, 30, 0, 0);

    // Nếu thời điểm hiện tại đã qua 23:30 đêm, chuyển sang khung 21:30 - 23:30 tối mai
    if (now.getTime() > pickupEnd.getTime()) {
      pickupStart.setDate(pickupStart.getDate() + 1);
      pickupEnd.setDate(pickupEnd.getDate() + 1);
    }

    const expiresAt = new Date(pickupEnd);

    let storesInserted = 0;
    let storesUpdated = 0;
    let itemsInserted = 0;
    let itemsUpdated = 0;
    let offersInserted = 0;
    let offersUpdated = 0;

    for (const storeDef of HANOI_50_STORES) {
      // 2. Insert or update StoreEntity
      const existingStore = await queryRunner.manager.findOne(StoreEntity, {
        where: { id: storeDef.id },
      });

      if (!existingStore) {
        // PostGIS geometry: ST_SetSRID(ST_MakePoint(lng, lat), 4326)
        await queryRunner.query(
          `INSERT INTO "stores" (
            "id", "owner_user_id", "name", "address", "location", "phone",
            "logo_url", "status", "rating_avg", "rating_count", "is_demo", "trial_used"
          ) VALUES (
            $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7,
            $8, $9, $10, $11, true, false
          ) ON CONFLICT ("id") DO UPDATE SET
            "location" = ST_SetSRID(ST_MakePoint($5, $6), 4326),
            "name" = EXCLUDED."name",
            "address" = EXCLUDED."address"`,
          [
            storeDef.id,
            hanoiOwnerId,
            storeDef.name,
            storeDef.address,
            storeDef.lng,
            storeDef.lat,
            storeDef.phone,
            storeDef.logoUrl,
            StoreStatus.ACTIVE,
            storeDef.ratingAvg,
            storeDef.ratingCount,
          ],
        );
        storesInserted++;
      } else {
        await queryRunner.query(
          `UPDATE "stores" SET
            "status" = $1,
            "location" = ST_SetSRID(ST_MakePoint($2, $3), 4326),
            "name" = $4,
            "address" = $5,
            "phone" = $6,
            "logo_url" = $7,
            "rating_avg" = $8,
            "rating_count" = $9
          WHERE "id" = $10`,
          [
            StoreStatus.ACTIVE,
            storeDef.lng,
            storeDef.lat,
            storeDef.name,
            storeDef.address,
            storeDef.phone,
            storeDef.logoUrl,
            storeDef.ratingAvg,
            storeDef.ratingCount,
            storeDef.id,
          ],
        );
        storesUpdated++;
      }

      // Store Settings
      const existingSettings = await queryRunner.manager.findOne(StoreSettingsEntity, {
        where: { storeId: storeDef.id },
      });
      if (!existingSettings) {
        const settings = queryRunner.manager.create(StoreSettingsEntity, {
          storeId: storeDef.id,
          defaultPickupStart: '21:30:00',
          defaultPickupEnd: '23:30:00',
          floorRatio: 0.4,
          pricingMode: PricingMode.MANUAL,
          taskReminders: { closingChecklist: true },
        });
        await queryRunner.manager.save(StoreSettingsEntity, settings);
      } else {
        existingSettings.defaultPickupStart = '21:30:00';
        existingSettings.defaultPickupEnd = '23:30:00';
        await queryRunner.manager.save(StoreSettingsEntity, existingSettings);
      }

      // Kích hoạt gói PRO (Subscription) cho quán để mở toàn bộ tính năng và quota
      const existingSub = await queryRunner.manager.findOne(SubscriptionEntity, {
        where: { storeId: storeDef.id },
      });
      if (!existingSub) {
        const sub = queryRunner.manager.create(SubscriptionEntity, {
          storeId: storeDef.id,
          plan: SubscriptionPlan.PRO,
          periodStart: now,
          periodEnd: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
          downgradeAtPeriodEnd: false,
          trialUsed: true,
        });
        await queryRunner.manager.save(SubscriptionEntity, sub);
      } else {
        existingSub.status = SubscriptionStatus.ACTIVE;
        existingSub.plan = SubscriptionPlan.PRO;
        existingSub.periodEnd = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
        await queryRunner.manager.save(SubscriptionEntity, existingSub);
      }

      // 3 & 4: Insert / update Items & Offers cho từng món trong storeDef.items (3-6 món/quán)
      for (let idx = 0; idx < storeDef.items.length; idx++) {
        const itemDef = storeDef.items[idx];
        const itemIndex = idx + 1; // 1, 2, 3, 4, 5, 6
        const itemId = storeDef.id.replace('a1000000', `b${itemIndex}000000`);
        const offerId = storeDef.id.replace('a1000000', `c${itemIndex}000000`);

        const existingItem = await queryRunner.manager.findOne(ItemEntity, {
          where: { id: itemId },
        });

        if (!existingItem) {
          const item = queryRunner.manager.create(ItemEntity, {
            id: itemId,
            storeId: storeDef.id,
            name: itemDef.name,
            category: normalizeFoodCategory(itemDef.category, itemDef.name),
            originalPrice: itemDef.originalPrice,
            standardShelfLifeHours: itemDef.shelfLifeHours,
            ingredients: itemDef.ingredients,
            allergens: itemDef.allergens,
            imageUrl: itemDef.imageUrl,
            description: itemDef.description,
            nutritionEstimate: {
              calories: itemDef.calories,
              source: 'Thực đơn món Việt Nam thực tế',
            },
            status: ItemStatus.ACTIVE,
            informationSource: TrustpassInformationSource.STORE,
            verificationStatus: TrustpassVerificationStatus.VERIFIED,
            trustpassVersion: 1,
            trustpassPublishedAt: now,
            reviewStatus: TrustpassReviewStatus.NONE,
          });
          await queryRunner.manager.save(ItemEntity, item);
          itemsInserted++;
        } else {
          existingItem.status = ItemStatus.ACTIVE;
          existingItem.name = itemDef.name;
          existingItem.category = normalizeFoodCategory(itemDef.category, itemDef.name);
          existingItem.originalPrice = itemDef.originalPrice;
          existingItem.imageUrl = itemDef.imageUrl;
          existingItem.description = itemDef.description;
          existingItem.ingredients = itemDef.ingredients;
          existingItem.allergens = itemDef.allergens;
          existingItem.nutritionEstimate = {
            calories: itemDef.calories,
            source: 'Thực đơn món Việt Nam thực tế',
          };
          await queryRunner.manager.save(ItemEntity, existingItem);
          itemsUpdated++;
        }

        // Insert or update OfferEntity (Suất Cứu Món)
        const existingOffer = await queryRunner.manager.findOne(OfferEntity, {
          where: { id: offerId },
        });

        if (!existingOffer) {
          const offer = queryRunner.manager.create(OfferEntity, {
            id: offerId,
            storeId: storeDef.id,
            itemId: itemId,
            kind: OfferKind.SURPRISE_BAG,
            totalQuantity: itemDef.totalQty,
            remainingQuantity: itemDef.remainingQty,
            soldQuantity: itemDef.totalQty - itemDef.remainingQty,
            originalPrice: itemDef.originalPrice,
            currentPrice: itemDef.currentPrice,
            floorPrice: itemDef.floorPrice,
            pickupStart,
            pickupEnd,
            expiresAt,
            status: OfferStatus.OPEN,
          });
          await queryRunner.manager.save(OfferEntity, offer);
          offersInserted++;
        } else {
          existingOffer.status = OfferStatus.OPEN;
          existingOffer.pickupStart = pickupStart;
          existingOffer.pickupEnd = pickupEnd;
          existingOffer.expiresAt = expiresAt;
          existingOffer.totalQuantity = itemDef.totalQty;
          existingOffer.remainingQuantity = itemDef.remainingQty;
          existingOffer.soldQuantity = itemDef.totalQty - itemDef.remainingQty;
          existingOffer.originalPrice = itemDef.originalPrice;
          existingOffer.currentPrice = itemDef.currentPrice;
          existingOffer.floorPrice = itemDef.floorPrice;
          await queryRunner.manager.save(OfferEntity, existingOffer);
          offersUpdated++;
        }
      }
    }

    await queryRunner.commitTransaction();
    const totalItems = itemsInserted + itemsUpdated;
    const totalOffers = offersInserted + offersUpdated;
    logger.log(
      `✅ [HanoiDemoSeed] Hoàn tất nạp seed: ${HANOI_50_STORES.length} cửa hàng thực tế tại Hà Nội (mới thêm: ${storesInserted} quán, ${itemsInserted} món, ${offersInserted} suất | cập nhật: ${storesUpdated} quán, ${itemsUpdated} món, ${offersUpdated} suất cứu món | tổng cộng: ${totalItems} món, ${totalOffers} suất cứu).`,
    );

    return {
      storesCount: HANOI_50_STORES.length,
      itemsCount: totalItems,
      offersCount: totalOffers,
      storesUpdated,
      itemsUpdated,
      offersUpdated,
    };
  } catch (err) {
    await queryRunner.rollbackTransaction();
    logger.error(
      '❌ [HanoiDemoSeed] Lỗi khi nạp seed Hà Nội:',
      err instanceof Error ? err.stack : String(err),
    );
    throw err;
  } finally {
    await queryRunner.release();
  }
}
