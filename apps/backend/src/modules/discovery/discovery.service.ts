import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ItemEntity, ItemStatus } from '../../entities/catalog/item.entity';
import { TrustpassView } from './trustpass-view.interface';
import { StoreEntity, StoreStatus } from '../../entities/stores/store.entity';
import { SavedDealEntity } from '../../entities/auth/saved-deal.entity';
import { DealAlertEntity } from '../../entities/auth/deal-alert.entity';
import { SavedFilterEntity } from '../../entities/auth/saved-filter.entity';
import { ViewHistoryEntity } from '../../entities/auth/view-history.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import { QueryDealsDto, DealSortBy } from './dto/query-deals.dto';
import { QueryMapDealsDto } from './dto/query-map-deals.dto';
import { QueryStoreReviewsDto } from './dto/query-store-reviews.dto';
import { CreateDealAlertDto, UpdateDealAlertDto } from './dto/deal-alert.dto';
import { CreateSavedFilterDto } from './dto/saved-filter.dto';
import { QueryRadarDto } from './dto/query-radar.dto';
import { SuggestBasketDto } from './dto/suggest-basket.dto';
import { BasketSubstitutesQueryDto, BasketCheckoutDto } from './dto/basket-checkout.dto';
import { OrdersService } from '../orders/orders.service';
import { RealtimeService } from '../realtime/realtime.service';

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
    @InjectRepository(DealAlertEntity)
    private readonly dealAlertRepo: Repository<DealAlertEntity>,
    @InjectRepository(SavedFilterEntity)
    private readonly savedFilterRepo: Repository<SavedFilterEntity>,
    @InjectRepository(ViewHistoryEntity)
    private readonly viewHistoryRepo: Repository<ViewHistoryEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    private readonly dataSource: DataSource,
    private readonly ordersService: OrdersService,
    private readonly realtimeService: RealtimeService,
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
    let distanceSelectExpr = 'NULL';
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
      distanceSelectExpr =
        'ROUND(ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography))';
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

    // Stable tie-breaker prevents repeated/missing rows across offset pages.
    qb.addOrderBy('o.id', 'ASC');

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
    qb.addSelect(distanceSelectExpr, 'distance_meters');

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

    let distanceSelectExpr = 'NULL';
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
      distanceSelectExpr =
        'ROUND(ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography))';
    }

    if (query.category) {
      qb.andWhere('i.category ILIKE :category', { category: `%${query.category}%` });
    }

    // distance_meters đưa vào cùng select() - addSelect() sau select() sẽ bị
    // TypeORM reset mất cột đã thêm trước đó, đây là lỗi đã vá (xem findNearbyDeals).
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
    qb.addSelect(distanceSelectExpr, 'distance_meters');

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
      trustpass: item ? this.buildTrustpassView(item) : null,
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
   * TrustPass (CM-C03, BR-C03-01..08): hồ sơ minh bạch món, không phải chứng nhận
   * an toàn tuyệt đối. Trường thiếu trả null + liệt kê trong missingFields để FE
   * hiển thị "Chưa được cung cấp", không suy diễn thành "không có" (BR-C03-02).
   */
  private buildTrustpassView(item: ItemEntity): TrustpassView {
    const missingFields: string[] = [];
    if (!item.ingredients) missingFields.push('ingredients');
    if (!item.allergens || item.allergens.length === 0) missingFields.push('allergens');
    if (!item.expiryAt) missingFields.push('expiryAt');
    if (!item.storageInstructions) missingFields.push('storageInstructions');

    return {
      itemId: item.id,
      ingredients: item.ingredients || null,
      allergens: item.allergens && item.allergens.length > 0 ? item.allergens : null,
      expiryAt: item.expiryAt || null,
      pickupWindowNote: 'Hạn dùng khác khung nhận hàng của suất, không thay thế nhau (BR-B05-05).',
      storageInstructions: item.storageInstructions || null,
      informationSource: item.informationSource,
      verificationStatus: item.verificationStatus,
      versionNo: item.trustpassVersion,
      publishedAt: item.trustpassPublishedAt || null,
      reviewStatus: item.reviewStatus,
      missingFields,
    };
  }

  /** CM-C03: endpoint tường minh xem TrustPass của một deal. */
  async getDealTrustpass(offerId: string): Promise<TrustpassView> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      throw new NotFoundException('Suất cứu món không tồn tại hoặc đã hết hiệu lực.');
    }
    if (!offer.itemId) {
      throw new NotFoundException('Suất này chưa gắn với món nào để xem TrustPass.');
    }
    const item = await this.itemRepo.findOne({ where: { id: offer.itemId } });
    if (!item) {
      throw new NotFoundException('Không tìm thấy món của suất này.');
    }
    // Món hết/đóng không hiển thị như đang bán - báo rõ trạng thái cho FE (BR-C03-05).
    const isOfferActive =
      offer.status === OfferStatus.OPEN &&
      offer.remainingQuantity > 0 &&
      new Date(offer.pickupEnd) > new Date();
    return { ...this.buildTrustpassView(item), isOfferActive } as TrustpassView & {
      isOfferActive: boolean;
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
   * Xem danh sách đánh giá công khai và phân bổ sao của cửa hàng (K15, R1-027)
   */
  async getStoreReviews(storeId: string, query: QueryStoreReviewsDto) {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException('Cửa hàng không tồn tại.');
    }

    const page = query.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query.limit && query.limit > 0 ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    // 1. Thống kê toàn bộ đánh giá đang hiển thị của cửa hàng
    const allStoreReviews = await this.reviewRepo.find({
      where: { storeId, status: ReviewStatus.VISIBLE },
      select: ['id', 'rating'],
    });

    const totalReviews = allStoreReviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((allStoreReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : 5.0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allStoreReviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      }
    });

    // 2. Query danh sách review có lọc và phân trang
    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoin(CustomerProfileEntity, 'cp', 'cp.user_id = r.customer_id')
      .where('r.store_id = :storeId', { storeId })
      .andWhere('r.status = :status', { status: ReviewStatus.VISIBLE });

    if (query.rating) {
      qb.andWhere('r.rating = :rating', { rating: Number(query.rating) });
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .select([
        'r.id AS id',
        'r.rating AS rating',
        'r.comment AS comment',
        'r.store_reply AS store_reply',
        'r.store_reply_at AS store_reply_at',
        'r.created_at AS created_at',
        'cp.full_name AS customer_name',
        'cp.avatar_url AS customer_avatar',
      ]);

    const rawReviews = await qb.getRawMany();

    const maskName = (name?: string | null) => {
      if (!name || !name.trim()) return 'Khách hàng';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) {
        return parts[0].length > 2 ? `${parts[0][0]}***` : parts[0];
      }
      const first = parts[0];
      const last = parts[parts.length - 1];
      return `${first[0]}*** ${last}`;
    };

    const reviews = rawReviews.map((item) => ({
      id: item.id,
      rating: Number(item.rating),
      comment: item.comment,
      storeReply: item.store_reply,
      storeReplyAt: item.store_reply_at ? new Date(item.store_reply_at) : null,
      createdAt: new Date(item.created_at),
      customerName: maskName(item.customer_name),
      customerAvatar: item.customer_avatar || null,
    }));

    return {
      storeId,
      storeName: store.name,
      averageRating,
      totalReviews,
      distribution,
      page,
      limit,
      totalPages: Math.ceil(totalReviews / limit) || 1,
      reviews,
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

  // -------------------------------------------------------------------------
  // CẢNH BÁO DEAL THEO ĐIỀU KIỆN (DEAL ALERTS - R1-031, R1-032)
  // -------------------------------------------------------------------------

  async createDealAlert(userId: string, dto: CreateDealAlertDto): Promise<DealAlertEntity> {
    const activeCount = await this.dealAlertRepo.count({
      where: { userId, isActive: true },
    });
    if (activeCount >= 10) {
      throw new BadRequestException(
        'Mỗi khách hàng chỉ được bật tối đa 10 cảnh báo deal đồng thời (R1-031).',
      );
    }
    if (!dto.criteria || Object.keys(dto.criteria).length === 0) {
      throw new BadRequestException('Tiêu chí cảnh báo không được rỗng (R1-031).');
    }
    const alert = this.dealAlertRepo.create({
      userId,
      criteria: dto.criteria,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return this.dealAlertRepo.save(alert);
  }

  async getDealAlerts(userId: string): Promise<DealAlertEntity[]> {
    return this.dealAlertRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateDealAlert(
    userId: string,
    id: string,
    dto: UpdateDealAlertDto,
  ): Promise<DealAlertEntity> {
    const alert = await this.dealAlertRepo.findOne({ where: { id, userId } });
    if (!alert) {
      throw new NotFoundException(`Không tìm thấy cảnh báo deal với ID [${id}].`);
    }
    if (dto.criteria) {
      if (Object.keys(dto.criteria).length === 0) {
        throw new BadRequestException('Tiêu chí cảnh báo không được rỗng.');
      }
      alert.criteria = dto.criteria;
    }
    if (dto.isActive !== undefined) {
      if (dto.isActive && !alert.isActive) {
        const activeCount = await this.dealAlertRepo.count({
          where: { userId, isActive: true },
        });
        if (activeCount >= 10) {
          throw new BadRequestException(
            'Mỗi khách hàng chỉ được bật tối đa 10 cảnh báo deal đồng thời (R1-031).',
          );
        }
      }
      alert.isActive = dto.isActive;
    }
    return this.dealAlertRepo.save(alert);
  }

  async deleteDealAlert(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const alert = await this.dealAlertRepo.findOne({ where: { id, userId } });
    if (!alert) {
      throw new NotFoundException(`Không tìm thấy cảnh báo deal với ID [${id}].`);
    }
    await this.dealAlertRepo.remove(alert);
    return { success: true, message: 'Đã xóa cảnh báo deal thành công.' };
  }

  // -------------------------------------------------------------------------
  // BỘ LỌC TÌM KIẾM ĐÃ LƯU (SAVED FILTERS - R1-033)
  // -------------------------------------------------------------------------

  async createSavedFilter(userId: string, dto: CreateSavedFilterDto): Promise<SavedFilterEntity> {
    const count = await this.savedFilterRepo.count({ where: { userId } });
    if (count >= 10) {
      throw new BadRequestException(
        'Mỗi khách hàng chỉ được lưu tối đa 10 bộ lọc tìm kiếm (R1-033).',
      );
    }
    const existing = await this.savedFilterRepo.findOne({
      where: { userId, name: dto.name.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `Tên bộ lọc [${dto.name}] đã tồn tại. Vui lòng chọn tên khác (R1-033).`,
      );
    }
    const filter = this.savedFilterRepo.create({
      userId,
      name: dto.name.trim(),
      criteria: dto.criteria,
    });
    return this.savedFilterRepo.save(filter);
  }

  async getSavedFilters(userId: string): Promise<SavedFilterEntity[]> {
    return this.savedFilterRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteSavedFilter(
    userId: string,
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const filter = await this.savedFilterRepo.findOne({ where: { id, userId } });
    if (!filter) {
      throw new NotFoundException(`Không tìm thấy bộ lọc đã lưu với ID [${id}].`);
    }
    await this.savedFilterRepo.remove(filter);
    return { success: true, message: 'Đã xóa bộ lọc tìm kiếm đã lưu thành công.' };
  }

  // -------------------------------------------------------------------------
  // LỊCH SỬ XEM DEAL GẦN ĐÂY (VIEW HISTORY - R1-035)
  // -------------------------------------------------------------------------

  async recordViewHistory(userId: string, offerId: string): Promise<ViewHistoryEntity> {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      throw new NotFoundException(`Không tìm thấy deal với ID [${offerId}].`);
    }

    // Xóa bản ghi cũ cùng offerId nếu đã có
    await this.viewHistoryRepo.delete({ userId, offerId });

    // Tạo bản ghi mới
    const record = this.viewHistoryRepo.create({
      userId,
      offerId,
      viewedAt: new Date(),
    });
    const saved = await this.viewHistoryRepo.save(record);

    // Giữ tối đa 20 mục gần nhất
    const all = await this.viewHistoryRepo.find({
      where: { userId },
      order: { viewedAt: 'DESC' },
    });
    if (all.length > 20) {
      const toDelete = all.slice(20).map((r) => r.id);
      await this.viewHistoryRepo.delete(toDelete);
    }

    return saved;
  }

  async getViewHistory(userId: string) {
    const records = await this.viewHistoryRepo.find({
      where: { userId },
      order: { viewedAt: 'DESC' },
      take: 20,
    });
    if (records.length === 0) return [];

    const offerIds = records.map((r) => r.offerId);
    const offers = await this.offerRepo.find({ where: { id: In(offerIds) } });
    const itemIds = offers.map((o) => o.itemId).filter(Boolean) as string[];
    const items =
      itemIds.length > 0 ? await this.itemRepo.find({ where: { id: In(itemIds) } }) : [];
    const storeIds = offers.map((o) => o.storeId);
    const stores =
      storeIds.length > 0 ? await this.storeRepo.find({ where: { id: In(storeIds) } }) : [];

    const offersMap = new Map(offers.map((o) => [o.id, o]));
    const itemsMap = new Map(items.map((i) => [i.id, i]));
    const storesMap = new Map(stores.map((s) => [s.id, s]));

    return records.map((r) => {
      const offer = offersMap.get(r.offerId);
      const item = offer && offer.itemId ? itemsMap.get(offer.itemId) : null;
      const store = offer ? storesMap.get(offer.storeId) : null;
      return {
        id: r.id,
        offerId: r.offerId,
        viewedAt: r.viewedAt,
        title: item?.name || 'Suất cứu món',
        storeName: store?.name || '',
        currentPrice: offer?.currentPrice || 0,
        originalPrice: offer?.originalPrice || 0,
        status: offer ? offer.status : 'EXPIRED',
        remainingQuantity: offer ? offer.remainingQuantity : 0,
      };
    });
  }

  async clearViewHistory(userId: string): Promise<{ success: boolean; message: string }> {
    await this.viewHistoryRepo.delete({ userId });
    return { success: true, message: 'Đã xóa toàn bộ lịch sử xem deal thành công.' };
  }

  /**
   * Rescue Radar (CM-C05): xếp hạng deal theo khả năng nhận kịp, phù hợp ngân sách
   * và còn khả dụng - không chỉ khoảng cách/giảm giá (BR-C05-01..07). Chỉ dùng
   * suất thật đang mở; không khẳng định "đến kịp" khi thiếu nguồn thời gian di
   * chuyển hợp lệ (BR-C05-04).
   */
  async getRadarRanking(query: QueryRadarDto) {
    const hasCoords =
      query.latitude !== undefined &&
      query.latitude !== null &&
      query.longitude !== undefined &&
      query.longitude !== null;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.offerRepo
      .createQueryBuilder('o')
      .innerJoin(StoreEntity, 's', 's.id = o.store_id')
      .leftJoin(ItemEntity, 'i', 'i.id = o.item_id')
      .where('o.status = :status', { status: OfferStatus.OPEN })
      .andWhere('o.remaining_quantity > 0')
      .andWhere('o.pickup_end > NOW()')
      .andWhere('s.status = :storeStatus', { storeStatus: StoreStatus.ACTIVE });

    let distanceSelectExpr = 'NULL';
    if (hasCoords) {
      const radiusMeters = (query.radiusKm || 5) * 1000;
      qb.andWhere(
        's.location IS NOT NULL AND ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        { lng: query.longitude, lat: query.latitude, radiusMeters },
      );
      distanceSelectExpr =
        'ROUND(ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography))';
    }

    if (query.budgetMax !== undefined && query.budgetMax !== null) {
      qb.andWhere('o.current_price <= :budgetMax', { budgetMax: query.budgetMax });
    }

    // distance_meters đưa vào cùng select() - addSelect() sau select() sẽ bị
    // TypeORM reset mất cột đã thêm trước đó.
    qb.select([
      'o.id AS offer_id',
      'o.store_id AS store_id',
      'o.item_id AS item_id',
      'o.original_price AS original_price',
      'o.current_price AS current_price',
      'o.remaining_quantity AS remaining_quantity',
      'o.pickup_start AS pickup_start',
      'o.pickup_end AS pickup_end',
      'i.name AS item_name',
      'i.category AS item_category',
      'i.image_url AS item_image_url',
      's.name AS store_name',
      's.address AS store_address',
    ]);
    qb.addSelect(distanceSelectExpr, 'distance_meters');

    const rawResults = await qb.limit(500).getRawMany();
    const now = Date.now();

    const ranked = rawResults.map((r) => {
      const distanceMeters = r.distance_meters !== null ? Number(r.distance_meters) : null;
      const minutesLeft = Math.max(0, (new Date(r.pickup_end).getTime() - now) / 60000);
      const orig = Number(r.original_price || 0);
      const curr = Number(r.current_price || 0);
      const discountPercent = orig > 0 ? Math.round(((orig - curr) / orig) * 100) : 0;
      const remaining = Number(r.remaining_quantity || 0);

      // BR-C05-03: lý do xếp hạng phải có căn cứ - tính điểm từ 3 yếu tố quan sát được.
      const reasons: string[] = [];
      let score = 0;

      if (distanceMeters !== null) {
        const distanceScore = Math.max(0, 1 - distanceMeters / ((query.radiusKm || 5) * 1000));
        score += distanceScore * 40;
        reasons.push(`Cách bạn khoảng ${(distanceMeters / 1000).toFixed(1)}km`);
      } else {
        reasons.push('Chưa có vị trí để tính khoảng cách - nhập địa điểm để cải thiện xếp hạng');
      }

      const timeScore = Math.min(1, minutesLeft / 120);
      score += timeScore * 35;
      reasons.push(
        minutesLeft > 30
          ? `Còn ${Math.round(minutesLeft)} phút để nhận`
          : `Sắp hết giờ nhận - chỉ còn ${Math.round(minutesLeft)} phút`,
      );

      const stockScore = Math.min(1, remaining / 5);
      score += stockScore * 15;
      if (remaining <= 1) reasons.push('Chỉ còn 1 suất - rủi ro hết hàng khi bạn tới');

      score += Math.min(1, discountPercent / 100) * 10;
      if (discountPercent > 0) reasons.push(`Giảm ${discountPercent}% so với giá gốc`);

      // BR-C05-04: không khẳng định "đến kịp" khi thiếu nguồn thời gian di chuyển hợp lệ.
      const canArriveInTime = query.travelTimeSource ? minutesLeft > 10 : null; // null = chưa đủ dữ liệu để khẳng định

      return {
        id: r.offer_id,
        storeId: r.store_id,
        itemId: r.item_id,
        storeName: r.store_name,
        storeAddress: r.store_address,
        title: r.item_name || 'Suất cứu món',
        category: r.item_category || 'Khác',
        imageUrl: r.item_image_url,
        originalPrice: orig,
        currentPrice: curr,
        discountPercent,
        remainingQuantity: remaining,
        pickupEnd: new Date(r.pickup_end),
        distanceMeters,
        minutesLeftToPickup: Math.round(minutesLeft),
        canArriveInTime,
        travelTimeSource: query.travelTimeSource || null,
        rankingScore: Math.round(score * 100) / 100,
        rankingReasons: reasons,
      };
    });

    ranked.sort((a, b) => b.rankingScore - a.rankingScore);

    return {
      data: ranked.slice(0, limit),
      meta: {
        total: ranked.length,
        locationSource: hasCoords ? 'GPS_OR_SELECTED' : 'NONE',
      },
    };
  }

  /**
   * Rescue Basket (CM-C01): gợi ý tổ hợp suất theo ngân sách/số người/khung nhận,
   * chỉ dùng suất thật, không giữ tồn, không tạo đơn (BR-C01-01, BR-C01-02).
   * MVP ưu tiên một cửa hàng/điểm nhận (BR-C01-06).
   */
  async suggestBasket(dto: SuggestBasketDto) {
    const hasCoords = dto.latitude !== undefined && dto.longitude !== undefined;

    const qb = this.offerRepo
      .createQueryBuilder('o')
      .innerJoin(StoreEntity, 's', 's.id = o.store_id')
      .leftJoin(ItemEntity, 'i', 'i.id = o.item_id')
      .where('o.status = :status', { status: OfferStatus.OPEN })
      .andWhere('o.remaining_quantity > 0')
      .andWhere('o.pickup_end > NOW()')
      .andWhere('s.status = :storeStatus', { storeStatus: StoreStatus.ACTIVE });

    if (hasCoords) {
      const radiusMeters = (dto.radiusKm || 5) * 1000;
      qb.andWhere(
        's.location IS NOT NULL AND ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        { lng: dto.longitude, lat: dto.latitude, radiusMeters },
      );
    }

    qb.select([
      'o.id AS offer_id',
      'o.store_id AS store_id',
      'o.item_id AS item_id',
      'o.current_price AS current_price',
      'o.original_price AS original_price',
      'o.remaining_quantity AS remaining_quantity',
      'o.pickup_start AS pickup_start',
      'o.pickup_end AS pickup_end',
      'i.name AS item_name',
      'i.allergens AS item_allergens',
      's.name AS store_name',
    ]);

    const rawOffers = await qb.limit(300).getRawMany();

    // BR-C01-07: thiếu dữ liệu dị ứng không đồng nghĩa không có chất gây dị ứng -
    // chỉ loại suất có allergens khai báo trùng với avoidAllergens, không loại suất
    // chưa khai báo (vì không thể khẳng định an toàn hay không an toàn).
    const avoid = (dto.avoidAllergens || []).map((a) => a.toLowerCase());
    const filtered = rawOffers.filter((o) => {
      if (avoid.length === 0) return true;
      const allergens: string[] = o.item_allergens || [];
      const hasDeclaredAllergen = allergens.some((a) => avoid.includes(a.toLowerCase()));
      return !hasDeclaredAllergen;
    });

    // Gom theo cửa hàng (BR-C01-06: MVP ưu tiên một cửa hàng/điểm nhận).
    const byStore = new Map<string, typeof filtered>();
    for (const o of filtered) {
      const list = byStore.get(o.store_id) || [];
      list.push(o);
      byStore.set(o.store_id, list);
    }

    interface BasketCandidate {
      storeId: string;
      storeName: string;
      items: Array<{ offerId: string; title: string; price: number }>;
      estimatedTotal: number;
      pickupEnd: Date;
    }

    const candidates: BasketCandidate[] = [];
    for (const [storeId, offers] of byStore) {
      if (offers.length === 0) continue;
      // Sắp theo giá tăng dần, chọn tham lam cho đến khi đủ số người hoặc hết ngân sách.
      const sorted = [...offers].sort((a, b) => Number(a.current_price) - Number(b.current_price));
      const picked: typeof sorted = [];
      let total = 0;
      for (const o of sorted) {
        const price = Number(o.current_price);
        if (picked.length >= dto.peopleCount) break;
        if (total + price > dto.budgetMax) continue;
        picked.push(o);
        total += price;
      }
      if (picked.length === 0) continue;

      candidates.push({
        storeId,
        storeName: offers[0].store_name,
        items: picked.map((o) => ({
          offerId: o.offer_id,
          title: o.item_name || 'Suất cứu món',
          price: Number(o.current_price),
        })),
        estimatedTotal: total,
        pickupEnd: picked.reduce(
          (min, o) => (new Date(o.pickup_end) < min ? new Date(o.pickup_end) : min),
          new Date(picked[0].pickup_end),
        ),
      });
    }

    // Xếp hạng: đủ số người trước, rồi tổng giá thấp hơn, rồi nhiều lựa chọn hơn (đa dạng).
    candidates.sort((a, b) => {
      const aFull = a.items.length >= dto.peopleCount ? 1 : 0;
      const bFull = b.items.length >= dto.peopleCount ? 1 : 0;
      if (aFull !== bFull) return bFull - aFull;
      if (a.estimatedTotal !== b.estimatedTotal) return a.estimatedTotal - b.estimatedTotal;
      return b.items.length - a.items.length;
    });

    const top = candidates.slice(0, 3).map((c) => ({
      ...c,
      withinBudget: c.estimatedTotal <= dto.budgetMax,
      meetsPeopleCount: c.items.length >= dto.peopleCount,
      rankingReasons: [
        c.items.length >= dto.peopleCount
          ? `Đủ ${dto.peopleCount} suất cho ${dto.peopleCount} người`
          : `Chỉ tìm được ${c.items.length}/${dto.peopleCount} suất phù hợp tại cửa hàng này`,
        `Tổng giá ${c.estimatedTotal.toLocaleString('vi-VN')}đ trong ngân sách ${dto.budgetMax.toLocaleString('vi-VN')}đ`,
      ],
    }));

    return {
      generatedAt: new Date(),
      availabilityCheckedAt: new Date(),
      hasResults: top.length > 0,
      baskets: top,
      message:
        top.length === 0
          ? 'Không tìm được tổ hợp phù hợp. Thử nới ngân sách, số người hoặc khu vực tìm kiếm (BR-C01 - không tạo deal giả).'
          : undefined,
    };
  }

  /**
   * So sánh chi tiết 2 đến 3 suất bán (R1-036)
   */
  async compareDeals(dealIds: string[]) {
    if (!dealIds || dealIds.length < 2 || dealIds.length > 3) {
      throw new BadRequestException('Chỉ có thể so sánh từ 2 đến 3 suất bán (R1-036).');
    }
    const deals = await Promise.all(
      dealIds.map(async (id) => {
        try {
          return await this.getDealDetail(id);
        } catch {
          return null;
        }
      }),
    );
    const validDeals = deals.filter(Boolean);
    if (validDeals.length < 2) {
      throw new NotFoundException('Không tìm thấy đủ số lượng suất bán hợp lệ để so sánh.');
    }
    return {
      count: validDeals.length,
      deals: validDeals,
    };
  }

  /**
   * Lấy thông tin chia sẻ liên kết suất bán không chứa PII (R1-037)
   */
  async getShareableDeal(dealId: string) {
    const deal = await this.getDealDetail(dealId);
    const title = deal.item?.name || 'Suất cứu món';
    const storeName = deal.store?.name || '';
    return {
      dealId: deal.id,
      title,
      storeName,
      originalPrice: deal.originalPrice,
      currentPrice: deal.currentPrice,
      discountPercent: deal.discountPercent,
      imageUrl: deal.item?.imageUrl,
      shareUrl: `https://surplusiq.vn/deals/${deal.id}`,
      shareText: `[SurplusIQ] Cứu món ${title} tại ${storeName} chỉ với ${deal.currentPrice.toLocaleString('vi-VN')}đ (-${deal.discountPercent}%)!`,
    };
  }

  /**
   * Lấy danh sách suất cứu thay thế cùng cửa hàng (KC03, CM-C01)
   */
  async getBasketSubstitutes(dto: BasketSubstitutesQueryDto) {
    const qb = this.offerRepo
      .createQueryBuilder('o')
      .innerJoin(StoreEntity, 's', 's.id = o.store_id')
      .leftJoin(ItemEntity, 'i', 'i.id = o.item_id')
      .where('o.store_id = :storeId', { storeId: dto.storeId })
      .andWhere('o.id != :currentOfferId', { currentOfferId: dto.currentOfferId })
      .andWhere('o.status = :status', { status: OfferStatus.OPEN })
      .andWhere('o.remaining_quantity > 0')
      .andWhere('o.pickup_end > NOW()');

    if (dto.maxPrice && dto.maxPrice > 0) {
      qb.andWhere('o.current_price <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    const offers = await qb
      .select([
        'o.id AS offer_id',
        'o.current_price AS current_price',
        'o.original_price AS original_price',
        'o.discount_percent AS discount_percent',
        'o.remaining_quantity AS remaining_quantity',
        'o.pickup_start AS pickup_start',
        'o.pickup_end AS pickup_end',
        'i.name AS item_name',
        'i.image_url AS image_url',
        'i.allergens AS allergens',
      ])
      .getRawMany();

    return offers.map((o) => ({
      offerId: o.offer_id,
      title: o.item_name || 'Suất cứu thay thế',
      price: Number(o.current_price),
      originalPrice: Number(o.original_price),
      discountPercent: Number(o.discount_percent),
      remainingStock: Number(o.remaining_quantity),
      imageUrl: o.image_url,
      allergens: o.allergens || [],
      pickupStart: o.pickup_start,
      pickupEnd: o.pickup_end,
    }));
  }

  /**
   * Đặt toàn bộ giỏ cứu món (KC04, CM-C01) với giữ suất 10 phút và kiểm tra tồn kho nguyên tử
   */
  async checkoutBasket(customerId: string, dto: BasketCheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ cứu không có món nào để đặt hàng.');
    }

    // 1. Kiểm tra tồn kho và hạn của từng món trước
    const checkedItems: Array<{ offer: OfferEntity; quantity: number }> = [];
    for (const item of dto.items) {
      const offer = await this.offerRepo.findOne({
        where: { id: item.offerId, storeId: dto.storeId },
      });

      if (!offer) {
        throw new NotFoundException(
          `Suất cứu món với mã ${item.offerId} không tồn tại tại cửa hàng này.`,
        );
      }

      if (offer.status !== OfferStatus.OPEN || new Date(offer.pickupEnd) <= new Date()) {
        throw new ConflictException({
          errorCode: 'BASKET_ITEM_EXPIRED',
          message: `Suất món "${offer.id}" đã hết hạn nhận hàng.`,
          unavailableOfferId: item.offerId,
        });
      }

      if (offer.remainingQuantity < item.quantity) {
        throw new ConflictException({
          errorCode: 'BASKET_ITEM_OUT_OF_STOCK',
          message: `Suất món "${offer.id}" chỉ còn ${offer.remainingQuantity} suất (bạn đặt ${item.quantity}).`,
          unavailableOfferId: item.offerId,
          availableStock: offer.remainingQuantity,
        });
      }

      checkedItems.push({ offer, quantity: item.quantity });
    }

    // 2. Tạo đơn cho từng món thông qua ordersService trong database transaction
    const createdOrders: any[] = [];
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const checked of checkedItems) {
        const order = await this.ordersService.holdOrder(
          customerId,
          {
            offerId: checked.offer.id,
            quantity: checked.quantity,
            promotionId: dto.promotionId,
            note: 'Đặt qua Rescue Basket (CM-C01)',
          },
          customerId,
          queryRunner.manager,
        );
        createdOrders.push(order);
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // 3. Thông báo Realtime cho từng món qua WebSocket
    for (const checked of checkedItems) {
      const remaining = Math.max(0, checked.offer.remainingQuantity - checked.quantity);
      this.realtimeService.notifyStockUpdated({
        dealId: checked.offer.id,
        storeId: dto.storeId,
        remainingQuantity: remaining,
        status: remaining < 3 ? (remaining === 0 ? 'SOLD_OUT' : 'LOW_STOCK') : 'AVAILABLE',
      });
    }

    const totalAmount = createdOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const holdExpiresAt = createdOrders[0]?.holdExpiresAt || new Date(Date.now() + 10 * 60 * 1000);

    return {
      success: true,
      storeId: dto.storeId,
      orders: createdOrders.map((o) => ({
        id: o.id,
        code: o.code,
        offerId: o.offerId,
        quantity: o.quantity,
        totalAmount: o.totalAmount,
      })),
      totalAmount,
      holdExpiresAt: holdExpiresAt.toISOString(),
      itemsCount: dto.items.reduce((sum, i) => sum + i.quantity, 0),
      message: 'Đặt giữ cả giỏ cứu thành công! Suất của bạn được giữ trong 10 phút.',
    };
  }
}
