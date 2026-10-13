import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity, ItemStatus } from '../../entities/catalog/item.entity';
import { StoreEntity, StoreStatus } from '../../entities/stores/store.entity';
import { SavedDealEntity } from '../../entities/auth/saved-deal.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import { QueryDealsDto, DealSortBy } from './dto/query-deals.dto';
import { QueryMapDealsDto } from './dto/query-map-deals.dto';

export interface DealResponseItem {
  id: string;
  itemId: string | null;
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeLogoUrl: string | null;
  distanceMeters: number | null;
  distanceKm: number | null;
  title: string;
  category: string;
  imageUrl: string | null;
  originalPrice: number;
  currentPrice: number;
  discountPercent: number;
  remainingQuantity: number;
  pickupStart: Date;
  pickupEnd: Date;
  expiresAt: Date;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(SavedDealEntity)
    private readonly savedDealRepo: Repository<SavedDealEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Khám phá deal gần vị trí khách hàng với PostGIS, bộ lọc và phân trang (R1-020, R1-022..R1-025)
   */
  async findNearbyDeals(query: QueryDealsDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const offset = (page - 1) * limit;

    const hasCoords =
      query.latitude !== undefined &&
      query.latitude !== null &&
      query.longitude !== undefined &&
      query.longitude !== null;

    const qb = this.offerRepo
      .createQueryBuilder('o')
      .innerJoin(StoreEntity, 's', 's.id = o.store_id')
      .leftJoin(ItemEntity, 'i', 'i.id = o.item_id')
      .where('o.status = :status', { status: OfferStatus.OPEN })
      .andWhere('o.remaining_quantity > 0')
      .andWhere('o.pickup_end > NOW()')
      .andWhere('s.status = :storeStatus', { storeStatus: StoreStatus.ACTIVE });

    // 1. Áp dụng truy vấn không gian PostGIS nếu khách có tọa độ
    if (hasCoords) {
      const radiusMeters = (query.radiusKm || 2) * 1000;
      qb.andWhere(
        's.location IS NOT NULL AND ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        {
          lng: query.longitude,
          lat: query.latitude,
          radiusMeters,
        },
      );
      qb.addSelect(
        'ROUND(ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography))',
        'distance_meters',
      );
    } else {
      qb.addSelect('NULL', 'distance_meters');
    }

    // 2. Bộ lọc danh mục món (R1-023)
    if (query.category) {
      qb.andWhere('i.category ILIKE :category', { category: `%${query.category}%` });
    }

    // 3. Bộ lọc giá tối đa (R1-023)
    if (query.maxPrice !== undefined && query.maxPrice !== null) {
      qb.andWhere('o.current_price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    // 4. Bộ lọc mức giảm tối thiểu (R1-023)
    if (query.minDiscountPercent !== undefined && query.minDiscountPercent !== null) {
      qb.andWhere(
        '((1.0 - CAST(o.current_price AS FLOAT) / o.original_price) * 100) >= :minDiscountPercent',
        { minDiscountPercent: query.minDiscountPercent },
      );
    }

    // 5. Tìm kiếm từ khóa (tên món hoặc tên quán) (R1-022)
    if (query.search && query.search.trim()) {
      const keyword = `%${query.search.trim()}%`;
      qb.andWhere('(i.name ILIKE :keyword OR s.name ILIKE :keyword)', { keyword });
    }

    // 6. Sắp xếp kết quả (R1-024)
    switch (query.sortBy) {
      case DealSortBy.PRICE_ASC:
        qb.orderBy('o.current_price', 'ASC');
        break;
      case DealSortBy.DISCOUNT_DESC:
        qb.orderBy('(1.0 - CAST(o.current_price AS FLOAT) / o.original_price)', 'DESC');
        break;
      case DealSortBy.CLOSING_SOON:
        qb.orderBy('o.pickup_end', 'ASC');
        break;
      case DealSortBy.DISTANCE:
      default:
        if (hasCoords) {
          qb.orderBy('distance_meters', 'ASC');
        } else {
          qb.orderBy('o.pickup_end', 'ASC');
        }
        break;
    }

    // 7. Chọn trường cần thiết
    qb.select([
      'o.id AS offer_id',
      'o.store_id AS store_id',
      'o.item_id AS item_id',
      'o.original_price AS original_price',
      'o.current_price AS current_price',
      'o.remaining_quantity AS remaining_quantity',
      'o.pickup_start AS pickup_start',
      'o.pickup_end AS pickup_end',
      'o.expires_at AS expires_at',
      'i.name AS item_name',
      'i.category AS item_category',
      'i.image_url AS item_image_url',
      's.name AS store_name',
      's.address AS store_address',
      's.logo_url AS store_logo_url',
    ]);

    // Đếm tổng số deal khớp
    const totalCount = await qb.getCount();

    // Lấy dữ liệu phân trang (R1-025)
    const rawResults = await qb.offset(offset).limit(limit).getRawMany();

    const data: DealResponseItem[] = rawResults.map((r) => {
      const orig = Number(r.original_price || 0);
      const curr = Number(r.current_price || 0);
      const discountPercent = orig > 0 ? Math.round(((orig - curr) / orig) * 100) : 0;
      const distanceMeters = r.distance_meters !== null ? Number(r.distance_meters) : null;
      const distanceKm =
        distanceMeters !== null ? Number((distanceMeters / 1000).toFixed(2)) : null;

      return {
        id: r.offer_id,
        itemId: r.item_id,
        storeId: r.store_id,
        storeName: r.store_name,
        storeAddress: r.store_address,
        storeLogoUrl: r.store_logo_url,
        distanceMeters,
        distanceKm,
        title: r.item_name || 'Suất cứu món tổng hợp',
        category: r.item_category || 'Khác',
        imageUrl: r.item_image_url,
        originalPrice: orig,
        currentPrice: curr,
        discountPercent,
        remainingQuantity: Number(r.remaining_quantity || 0),
        pickupStart: new Date(r.pickup_start),
        pickupEnd: new Date(r.pickup_end),
        expiresAt: new Date(r.expires_at),
      };
    });

    return {
      data,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Bản đồ deal: Lấy danh sách điểm ghim (pins) cửa hàng có deal đang mở trong bán kính (R1-021)
   */
  async findMapPins(query: QueryMapDealsDto) {
    const hasCoords =
      query.latitude !== undefined &&
      query.latitude !== null &&
      query.longitude !== undefined &&
      query.longitude !== null;

    const qb = this.offerRepo
      .createQueryBuilder('o')
      .innerJoin(StoreEntity, 's', 's.id = o.store_id')
      .leftJoin(ItemEntity, 'i', 'i.id = o.item_id')
      .where('o.status = :status', { status: OfferStatus.OPEN })
      .andWhere('o.remaining_quantity > 0')
      .andWhere('o.pickup_end > NOW()')
      .andWhere('s.status = :storeStatus', { storeStatus: StoreStatus.ACTIVE })
      .andWhere('s.location IS NOT NULL');

    if (hasCoords) {
      const radiusMeters = (query.radiusKm || 5) * 1000;
      qb.andWhere(
        'ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        {
          lng: query.longitude,
          lat: query.latitude,
          radiusMeters,
        },
      );
      qb.addSelect(
        'ROUND(ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography))',
        'distance_meters',
      );
    } else {
      qb.addSelect('NULL', 'distance_meters');
    }

    if (query.category) {
      qb.andWhere('i.category ILIKE :category', { category: `%${query.category}%` });
    }

    qb.groupBy('s.id')
      .addGroupBy('s.name')
      .addGroupBy('s.address')
      .addGroupBy('s.logo_url')
      .addGroupBy('s.location')
      .select([
        's.id AS store_id',
        's.name AS store_name',
        's.address AS store_address',
        's.logo_url AS store_logo_url',
        'ST_Y(s.location::geometry) AS latitude',
        'ST_X(s.location::geometry) AS longitude',
        'COUNT(o.id) AS active_deals_count',
        'MIN(o.current_price) AS min_price',
        'MAX((1.0 - CAST(o.current_price AS FLOAT) / o.original_price) * 100) AS max_discount_percent',
      ]);

    const rawPins = await qb.getRawMany();

    return rawPins.map((p) => ({
      storeId: p.store_id,
      storeName: p.store_name,
      storeAddress: p.store_address,
      storeLogoUrl: p.store_logo_url,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      activeDealsCount: Number(p.active_deals_count),
      minPrice: Number(p.min_price),
      maxDiscountPercent: Math.round(Number(p.max_discount_percent || 0)),
      distanceMeters: p.distance_meters !== null ? Number(p.distance_meters) : null,
    }));
  }

  /**
   * Xem chi tiết một suất cứu món kèm thông tin món ăn và đánh giá cửa hàng (R1-026)
   */
  async getDealDetail(offerId: string) {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException('Suất cứu món không tồn tại hoặc đã hết hiệu lực (R1-026).');
    }

    const [item, store] = await Promise.all([
      offer.itemId ? this.itemRepo.findOne({ where: { id: offer.itemId } }) : null,
      this.storeRepo.findOne({ where: { id: offer.storeId } }),
    ]);

    if (!store) {
      throw new NotFoundException('Cửa hàng cung cấp món này không tồn tại.');
    }

    // Tính điểm đánh giá trung bình của cửa hàng
    const reviewStats = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.store_id = :storeId', { storeId: store.id })
      .andWhere('r.status = :status', { status: ReviewStatus.VISIBLE })
      .select('ROUND(AVG(r.rating)::numeric, 1)', 'avg_rating')
      .addSelect('COUNT(r.id)', 'review_count')
      .getRawOne();

    const orig = Number(offer.originalPrice);
    const curr = Number(offer.currentPrice);
    const discountPercent = orig > 0 ? Math.round(((orig - curr) / orig) * 100) : 0;
    const isAvailable =
      offer.status === OfferStatus.OPEN &&
      offer.remainingQuantity > 0 &&
      new Date(offer.pickupEnd) > new Date();

    return {
      id: offer.id,
      kind: offer.kind,
      status: offer.status,
      isAvailable,
      originalPrice: orig,
      currentPrice: curr,
      floorPrice: offer.floorPrice,
      discountPercent,
      remainingQuantity: offer.remainingQuantity,
      totalQuantity: offer.totalQuantity,
      pickupStart: offer.pickupStart,
      pickupEnd: offer.pickupEnd,
      expiresAt: offer.expiresAt,
      item: item
        ? {
            id: item.id,
            name: item.name,
            category: item.category,
            description: item.description,
            ingredients: item.ingredients,
            allergens: item.allergens || [],
            weightGrams: item.weightGrams,
            imageUrl: item.imageUrl,
            standardShelfLifeHours: item.standardShelfLifeHours,
          }
        : null,
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        logoUrl: store.logoUrl,
        openHours: store.openHours,
        status: store.status,
        averageRating: reviewStats?.avg_rating ? Number(reviewStats.avg_rating) : 5.0,
        reviewsCount: reviewStats?.review_count ? Number(reviewStats.review_count) : 0,
      },
    };
  }

  /**
   * Xem chi tiết cửa hàng và các suất đang mở bán của quán (R1-027)
   */
  async getStoreDetail(storeId: string) {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
    });

    if (!store || store.status !== StoreStatus.ACTIVE) {
      throw new NotFoundException('Cửa hàng không tồn tại hoặc đang tạm ngưng hoạt động (R1-027).');
    }

    // Danh sách deal đang mở của cửa hàng
    const activeOffers = await this.offerRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect(ItemEntity, 'i', 'i.id = o.item_id')
      .where('o.store_id = :storeId', { storeId })
      .andWhere('o.status = :status', { status: OfferStatus.OPEN })
      .andWhere('o.remaining_quantity > 0')
      .andWhere('o.pickup_end > NOW()')
      .orderBy('o.pickup_end', 'ASC')
      .select([
        'o.id AS offer_id',
        'o.item_id AS item_id',
        'o.original_price AS original_price',
        'o.current_price AS current_price',
        'o.remaining_quantity AS remaining_quantity',
        'o.pickup_start AS pickup_start',
        'o.pickup_end AS pickup_end',
        'i.name AS item_name',
        'i.category AS item_category',
        'i.image_url AS item_image_url',
      ])
      .getRawMany();

    // Điểm đánh giá
    const reviewStats = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.store_id = :storeId', { storeId })
      .andWhere('r.status = :status', { status: ReviewStatus.VISIBLE })
      .select('ROUND(AVG(r.rating)::numeric, 1)', 'avg_rating')
      .addSelect('COUNT(r.id)', 'review_count')
      .getRawOne();

    return {
      store: {
        id: store.id,
        name: store.name,
        address: store.address,
        phone: store.phone,
        logoUrl: store.logoUrl,
        openHours: store.openHours,
        status: store.status,
        averageRating: reviewStats?.avg_rating ? Number(reviewStats.avg_rating) : 5.0,
        reviewsCount: reviewStats?.review_count ? Number(reviewStats.review_count) : 0,
      },
      activeDeals: activeOffers.map((o) => {
        const orig = Number(o.original_price);
        const curr = Number(o.current_price);
        return {
          id: o.offer_id,
          itemId: o.item_id,
          title: o.item_name || 'Suất cứu món',
          category: o.item_category || 'Khác',
          imageUrl: o.item_image_url,
          originalPrice: orig,
          currentPrice: curr,
          discountPercent: orig > 0 ? Math.round(((orig - curr) / orig) * 100) : 0,
          remainingQuantity: Number(o.remaining_quantity),
          pickupStart: new Date(o.pickup_start),
          pickupEnd: new Date(o.pickup_end),
        };
      }),
    };
  }

  /**
   * Lưu deal để xem sau (R1-034)
   */
  async saveDeal(userId: string, offerId: string) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      throw new NotFoundException('Suất cứu món không tồn tại.');
    }

    const existing = await this.savedDealRepo.findOne({
      where: { userId, offerId },
    });

    if (existing) {
      return { success: true, message: 'Deal đã nằm trong danh sách lưu xem sau.' };
    }

    const saved = this.savedDealRepo.create({
      userId,
      offerId,
    });
    await this.savedDealRepo.save(saved);

    return { success: true, message: 'Đã lưu deal vào danh sách xem sau (R1-034).' };
  }

  /**
   * Bỏ lưu deal xem sau (R1-034)
   */
  async unsaveDeal(userId: string, offerId: string) {
    await this.savedDealRepo.delete({ userId, offerId });
    return { success: true, message: 'Đã xóa deal khỏi danh sách lưu xem sau.' };
  }

  /**
   * Lấy danh sách deal đã lưu của khách hàng, tự động đánh dấu deal đã hết hạn (R1-034)
   */
  async getSavedDeals(userId: string) {
    const savedRecords = await this.savedDealRepo.find({
      where: { userId },
      order: { savedAt: 'DESC' },
    });

    if (!savedRecords.length) {
      return [];
    }

    const offerIds = savedRecords.map((r) => r.offerId);

    const offers = await this.offerRepo
      .createQueryBuilder('o')
      .innerJoin(StoreEntity, 's', 's.id = o.store_id')
      .leftJoin(ItemEntity, 'i', 'i.id = o.item_id')
      .where('o.id IN (:...offerIds)', { offerIds })
      .select([
        'o.id AS offer_id',
        'o.status AS offer_status',
        'o.original_price AS original_price',
        'o.current_price AS current_price',
        'o.remaining_quantity AS remaining_quantity',
        'o.pickup_start AS pickup_start',
        'o.pickup_end AS pickup_end',
        'i.name AS item_name',
        'i.category AS item_category',
        'i.image_url AS item_image_url',
        's.id AS store_id',
        's.name AS store_name',
        's.address AS store_address',
      ])
      .getRawMany();

    const offerMap = new Map<string, any>(offers.map((o) => [o.offer_id, o]));

    return savedRecords.map((record) => {
      const o = offerMap.get(record.offerId);
      if (!o) {
        return {
          savedAt: record.savedAt,
          offerId: record.offerId,
          isExpired: true,
          deal: null,
        };
      }

      const isExpired =
        o.offer_status !== OfferStatus.OPEN ||
        Number(o.remaining_quantity) <= 0 ||
        new Date(o.pickup_end) <= new Date();

      const orig = Number(o.original_price);
      const curr = Number(o.current_price);

      return {
        savedAt: record.savedAt,
        offerId: record.offerId,
        isExpired,
        deal: {
          id: o.offer_id,
          storeId: o.store_id,
          storeName: o.store_name,
          storeAddress: o.store_address,
          title: o.item_name || 'Suất cứu món',
          category: o.item_category || 'Khác',
          imageUrl: o.item_image_url,
          originalPrice: orig,
          currentPrice: curr,
          discountPercent: orig > 0 ? Math.round(((orig - curr) / orig) * 100) : 0,
          remainingQuantity: Number(o.remaining_quantity),
          pickupStart: new Date(o.pickup_start),
          pickupEnd: new Date(o.pickup_end),
        },
      };
    });
  }
}
