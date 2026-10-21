import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ItemEntity,
  ItemStatus,
  TrustpassVerificationStatus,
} from '../../entities/catalog/item.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { TrustpassHistoryEntity } from '../../entities/catalog/trustpass-history.entity';
import {
  CreateItemDto,
  UpdateItemDto,
  QueryItemsDto,
  QueryItemStatus,
  ImportCsvItemsDto,
  BatchUpdateItemsDto,
  UpdateTrustpassDto,
} from './dto';
import { CATALOG_CONSTANTS } from './catalog.constants';
import { AuditLogService } from '../audit/audit-log.service';
import { QuotaService } from '../subscriptions/quota.service';
import { QuotaKey } from '../subscriptions/quota.constants';

export interface PaginatedItemsResult {
  data: ItemEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ItemDetailWithStats extends ItemEntity {
  stats: {
    totalOffersCreated: number;
    totalSold: number;
  };
}

export interface CsvImportSummary {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ index: number; name: string; error: string }>;
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(TrustpassHistoryEntity)
    private readonly trustpassHistoryRepo: Repository<TrustpassHistoryEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Xem danh sách món ăn của cửa hàng có phân trang, tìm kiếm và lọc (R2-017, R2-018)
   * Mặc định chỉ hiển thị các món ACTIVE, ẩn các món ARCHIVED.
   */
  async getItems(storeId: string, query: QueryItemsDto): Promise<PaginatedItemsResult> {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(
      Math.max(query.limit || CATALOG_CONSTANTS.DEFAULT_PAGE_SIZE, 1),
      CATALOG_CONSTANTS.MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * limit;

    const qb = this.itemRepo
      .createQueryBuilder('item')
      .where('item.store_id = :storeId', { storeId });

    // Lọc theo trạng thái (Mặc định ẩn ARCHIVED theo R2-017)
    const statusFilter = query.status || QueryItemStatus.ACTIVE;
    if (statusFilter === QueryItemStatus.ACTIVE) {
      qb.andWhere('item.status = :status', { status: ItemStatus.ACTIVE });
    } else if (statusFilter === QueryItemStatus.ARCHIVED) {
      qb.andWhere('item.status = :status', { status: ItemStatus.ARCHIVED });
    }

    // Tìm kiếm không phân biệt hoa thường theo tên món (R2-018)
    if (query.search && query.search.trim()) {
      qb.andWhere('LOWER(item.name) LIKE LOWER(:search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    // Lọc theo danh mục
    if (query.category && query.category.trim()) {
      qb.andWhere('item.category = :category', { category: query.category.trim() });
    }

    // Sắp xếp
    const validSortFields: Record<string, string> = {
      name: 'item.name',
      createdAt: 'item.createdAt',
      originalPrice: 'item.originalPrice',
    };
    const sortField = validSortFields[query.sortBy || 'createdAt'] || 'item.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortField, sortOrder);

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Xem chi tiết món ăn kèm thống kê số suất đã tạo và tổng số lượng đã bán (R2-019)
   */
  async getItemById(storeId: string, itemId: string): Promise<ItemDetailWithStats> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, storeId },
    });

    if (!item) {
      throw new NotFoundException(
        `Không tìm thấy món ăn với ID [${itemId}] trong cửa hàng (R2-019).`,
      );
    }

    // Thống kê số suất và tổng lượng đã bán từ các suất của món
    const statsRaw = await this.offerRepo
      .createQueryBuilder('offer')
      .select('COUNT(offer.id)', 'totalOffers')
      .addSelect('COALESCE(SUM(offer.totalQuantity - offer.remainingQuantity), 0)', 'totalSold')
      .where('offer.itemId = :itemId', { itemId })
      .andWhere('offer.storeId = :storeId', { storeId })
      .getRawOne();

    return {
      ...item,
      stats: {
        totalOffersCreated: Number(statsRaw?.totalOffers || 0),
        totalSold: Number(statsRaw?.totalSold || 0),
      },
    };
  }

  /**
   * Tạo món ăn mới (R2-020)
   * Kiểm tra ràng buộc giá bội số 500đ (BR-064), giá vốn <= giá gốc, tên duy nhất trong quán.
   */
  async createItem(
    storeId: string,
    dto: CreateItemDto,
    actorId = '00000000-0000-0000-0000-000000000000',
  ): Promise<ItemEntity> {
    const trimmedName = dto.name.trim();

    // 1. Kiểm tra bội số giá 500 VND (BR-064)
    if (dto.originalPrice % CATALOG_CONSTANTS.PRICE_ROUNDING_STEP !== 0) {
      throw new BadRequestException(
        `Giá gốc (${dto.originalPrice} VND) phải là bội số của ${CATALOG_CONSTANTS.PRICE_ROUNDING_STEP} VND (BR-064).`,
      );
    }

    // 2. Giá vốn không được cao hơn giá gốc
    if (
      dto.costPrice !== undefined &&
      dto.costPrice !== null &&
      dto.costPrice > dto.originalPrice
    ) {
      throw new BadRequestException(
        `Giá vốn (${dto.costPrice} VND) không được vượt quá giá gốc (${dto.originalPrice} VND).`,
      );
    }

    // 3. Kiểm tra trùng tên trong các món ACTIVE cùng cửa hàng
    const existing = await this.itemRepo
      .createQueryBuilder('item')
      .where('item.store_id = :storeId', { storeId })
      .andWhere('LOWER(item.name) = LOWER(:name)', { name: trimmedName })
      .andWhere('item.status = :status', { status: ItemStatus.ACTIVE })
      .getOne();

    if (existing) {
      throw new ConflictException(
        `Tên món "${trimmedName}" đã tồn tại trong danh mục đang hoạt động của cửa hàng (R2-020).`,
      );
    }

    const newItem = this.itemRepo.create({
      ...dto,
      name: trimmedName,
      storeId,
      status: ItemStatus.ACTIVE,
      allergens: dto.allergens || [],
    });

    const saved = await this.itemRepo.save(newItem);

    // Ghi nhật ký kiểm toán
    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'ITEM_CREATED',
      targetType: 'ITEM',
      targetId: saved.id,
      newValue: {
        name: saved.name,
        category: saved.category,
        originalPrice: saved.originalPrice,
      },
    });

    return saved;
  }

  /**
   * Chỉnh sửa thông tin món ăn (R2-022)
   * Thay đổi giá gốc không làm ảnh hưởng giá của suất đang mở hoặc đơn đã chốt (R2-022).
   */
  async updateItem(
    storeId: string,
    itemId: string,
    dto: UpdateItemDto,
    actorId = '00000000-0000-0000-0000-000000000000',
  ): Promise<ItemEntity> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, storeId },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID [${itemId}] trong cửa hàng.`);
    }

    // 1. Kiểm tra bội số giá 500 VND nếu cập nhật giá
    if (dto.originalPrice !== undefined) {
      if (dto.originalPrice % CATALOG_CONSTANTS.PRICE_ROUNDING_STEP !== 0) {
        throw new BadRequestException(
          `Giá gốc (${dto.originalPrice} VND) phải là bội số của ${CATALOG_CONSTANTS.PRICE_ROUNDING_STEP} VND (BR-064).`,
        );
      }
    }

    // 2. Kiểm tra giá vốn vs giá gốc
    const finalOriginal = dto.originalPrice ?? item.originalPrice;
    const finalCost = dto.costPrice !== undefined ? dto.costPrice : item.costPrice;
    if (finalCost !== null && finalCost !== undefined && finalCost > finalOriginal) {
      throw new BadRequestException(
        `Giá vốn (${finalCost} VND) không được vượt quá giá gốc (${finalOriginal} VND).`,
      );
    }

    // 3. Kiểm tra trùng tên nếu đổi tên
    if (dto.name && dto.name.trim().toLowerCase() !== item.name.toLowerCase()) {
      const trimmedName = dto.name.trim();
      const duplicate = await this.itemRepo
        .createQueryBuilder('item')
        .where('item.store_id = :storeId', { storeId })
        .andWhere('LOWER(item.name) = LOWER(:name)', { name: trimmedName })
        .andWhere('item.id != :itemId', { itemId })
        .andWhere('item.status = :status', { status: ItemStatus.ACTIVE })
        .getOne();

      if (duplicate) {
        throw new ConflictException(
          `Tên món "${trimmedName}" đã tồn tại trong danh mục đang hoạt động của cửa hàng.`,
        );
      }
      item.name = trimmedName;
    }

    const oldPrice = item.originalPrice;

    // Cập nhật các trường được truyền vào
    if (dto.category !== undefined) item.category = dto.category;
    if (dto.originalPrice !== undefined) item.originalPrice = dto.originalPrice;
    if (dto.costPrice !== undefined) item.costPrice = dto.costPrice;
    if (dto.standardShelfLifeHours !== undefined)
      item.standardShelfLifeHours = dto.standardShelfLifeHours;
    if (dto.ingredients !== undefined) item.ingredients = dto.ingredients;
    if (dto.allergens !== undefined) item.allergens = dto.allergens;
    if (dto.weightGrams !== undefined) item.weightGrams = dto.weightGrams;
    if (dto.imageUrl !== undefined) item.imageUrl = dto.imageUrl;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.nutritionEstimate !== undefined) item.nutritionEstimate = dto.nutritionEstimate;

    const saved = await this.itemRepo.save(item);

    // Ghi nhật ký kiểm toán nếu thay đổi giá gốc (R2-022, BR-080)
    if (dto.originalPrice !== undefined && dto.originalPrice !== oldPrice) {
      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_MEMBER',
        action: 'ITEM_PRICE_CHANGED',
        targetType: 'ITEM',
        targetId: saved.id,
        oldValue: { originalPrice: oldPrice },
        newValue: { originalPrice: saved.originalPrice },
      });
    }

    return saved;
  }

  /**
   * Lưu trữ món ăn không còn kinh doanh (R2-023, BR-051)
   * Tuyệt đối KHÔNG xóa vật lý; từ chối lưu trữ nếu món đang có suất bán OPEN.
   */
  async archiveItem(
    storeId: string,
    itemId: string,
    actorId = '00000000-0000-0000-0000-000000000000',
  ): Promise<ItemEntity> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, storeId },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID [${itemId}] trong cửa hàng.`);
    }

    if (item.status === ItemStatus.ARCHIVED) {
      return item;
    }

    // Kiểm tra xem món có suất bán nào đang OPEN không (BR-051)
    const activeOffersCount = await this.offerRepo.count({
      where: {
        itemId,
        storeId,
        status: OfferStatus.OPEN,
      },
    });

    if (activeOffersCount > 0) {
      throw new BadRequestException(
        `Không thể lưu trữ món đang có ${activeOffersCount} suất bán mở (BR-051). Vui lòng đóng hoặc kết thúc suất trước khi lưu trữ.`,
      );
    }

    item.status = ItemStatus.ARCHIVED;
    const saved = await this.itemRepo.save(item);

    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'ITEM_ARCHIVED',
      targetType: 'ITEM',
      targetId: saved.id,
      newValue: { status: ItemStatus.ARCHIVED, name: saved.name },
    });

    return saved;
  }

  /**
   * Khôi phục món đã lưu trữ về trạng thái Đang dùng (R2-024)
   * Kiểm tra tên món không bị trùng với món đang hoạt động khác trong quán.
   */
  async restoreItem(
    storeId: string,
    itemId: string,
    actorId = '00000000-0000-0000-0000-000000000000',
  ): Promise<ItemEntity> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, storeId },
    });

    if (!item) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID [${itemId}] trong cửa hàng.`);
    }

    if (item.status === ItemStatus.ACTIVE) {
      return item;
    }

    // Kiểm tra tên món có bị trùng với món ACTIVE nào khác không
    const existing = await this.itemRepo
      .createQueryBuilder('item')
      .where('item.store_id = :storeId', { storeId })
      .andWhere('LOWER(item.name) = LOWER(:name)', { name: item.name })
      .andWhere('item.id != :itemId', { itemId })
      .andWhere('item.status = :status', { status: ItemStatus.ACTIVE })
      .getOne();

    if (existing) {
      throw new ConflictException(
        `Đã tồn tại món "${item.name}" đang hoạt động trong cửa hàng. Vui lòng đổi tên trước khi khôi phục (R2-024).`,
      );
    }

    item.status = ItemStatus.ACTIVE;
    const saved = await this.itemRepo.save(item);

    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'ITEM_RESTORED',
      targetType: 'ITEM',
      targetId: saved.id,
      newValue: { status: ItemStatus.ACTIVE, name: saved.name },
    });

    return saved;
  }

  /**
   * Nhập hàng loạt danh mục món từ CSV theo hạn mức gói (R2-025)
   * Giới hạn: 100 dòng với gói Cơ bản, 500 dòng với gói Pro/Dùng thử.
   */
  async importCsvItems(
    storeId: string,
    dto: ImportCsvItemsDto,
    actorId = '00000000-0000-0000-0000-000000000000',
  ): Promise<CsvImportSummary> {
    const itemsToImport = dto.items;
    const count = itemsToImport.length;

    // 1. Kiểm tra hạn mức nhập CSV theo gói dịch vụ (R2-025, VC-01)
    const quotaLimit = await this.quotaService.getQuotaLimit(storeId, QuotaKey.CSV_IMPORT_LINES);
    if (count > quotaLimit) {
      throw new BadRequestException(
        `Số lượng dòng (${count}) vượt quá hạn mức tối đa (${quotaLimit} dòng/lần) theo gói dịch vụ của cửa hàng (R2-025).`,
      );
    }

    const summary: CsvImportSummary = {
      total: count,
      imported: 0,
      failed: 0,
      errors: [],
    };

    const validItemsToInsert: ItemEntity[] = [];
    const seenNamesInBatch = new Set<string>();

    for (let i = 0; i < itemsToImport.length; i++) {
      const itemDto = itemsToImport[i];
      const normalizedName = itemDto.name?.trim().toLowerCase();

      // Kiểm tra tên hợp lệ
      if (!itemDto.name || itemDto.name.trim().length < 2) {
        summary.failed++;
        summary.errors.push({
          index: i + 1,
          name: itemDto.name || 'N/A',
          error: 'Tên món phải có tối thiểu 2 ký tự.',
        });
        continue;
      }

      // Trùng tên trong cùng mẻ import
      if (seenNamesInBatch.has(normalizedName)) {
        summary.failed++;
        summary.errors.push({
          index: i + 1,
          name: itemDto.name,
          error: 'Tên món bị trùng lặp ngay trong tệp nhập CSV.',
        });
        continue;
      }

      // Kiểm tra giá bội 500
      if (
        !itemDto.originalPrice ||
        itemDto.originalPrice % CATALOG_CONSTANTS.PRICE_ROUNDING_STEP !== 0
      ) {
        summary.failed++;
        summary.errors.push({
          index: i + 1,
          name: itemDto.name,
          error: `Giá gốc (${itemDto.originalPrice}) phải là bội số của ${CATALOG_CONSTANTS.PRICE_ROUNDING_STEP} VND.`,
        });
        continue;
      }

      // Giá vốn <= giá gốc
      if (itemDto.costPrice !== undefined && itemDto.costPrice > itemDto.originalPrice) {
        summary.failed++;
        summary.errors.push({
          index: i + 1,
          name: itemDto.name,
          error: 'Giá vốn không được vượt quá giá gốc.',
        });
        continue;
      }

      // Kiểm tra trùng tên trong database
      const existingInDb = await this.itemRepo
        .createQueryBuilder('item')
        .where('item.store_id = :storeId', { storeId })
        .andWhere('LOWER(item.name) = LOWER(:name)', { name: normalizedName })
        .andWhere('item.status = :status', { status: ItemStatus.ACTIVE })
        .getOne();

      if (existingInDb) {
        summary.failed++;
        summary.errors.push({
          index: i + 1,
          name: itemDto.name,
          error: 'Món đã tồn tại trong danh mục đang hoạt động của quán.',
        });
        continue;
      }

      seenNamesInBatch.add(normalizedName);
      validItemsToInsert.push(
        this.itemRepo.create({
          ...itemDto,
          name: itemDto.name.trim(),
          storeId,
          status: ItemStatus.ACTIVE,
          allergens: itemDto.allergens || [],
        }),
      );
    }

    if (validItemsToInsert.length > 0) {
      await this.itemRepo.save(validItemsToInsert);
      summary.imported = validItemsToInsert.length;

      // Tiêu hao hạn mức sử dụng
      await this.quotaService.consume({
        storeId,
        quotaKey: QuotaKey.CSV_IMPORT_LINES,
        units: validItemsToInsert.length,
      });

      // Ghi nhật ký kiểm toán
      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_MEMBER',
        action: 'ITEMS_CSV_IMPORTED',
        targetType: 'ITEM_BATCH',
        newValue: {
          totalRows: count,
          imported: summary.imported,
          failed: summary.failed,
        },
      });
    }

    return summary;
  }

  /**
   * Xem cảnh báo chất lượng dữ liệu món ăn (R2-099)
   */
  async getDataQualityWarnings(storeId: string) {
    const items = await this.itemRepo.find({
      where: { storeId, status: ItemStatus.ACTIVE },
    });

    const warnings: Array<{
      itemId: string;
      itemName: string;
      type: 'MISSING_WEIGHT' | 'MISSING_COST' | 'MISSING_ALLERGENS';
      severity: 'MEDIUM' | 'LOW';
      suggestion: string;
    }> = [];

    let fullyConfigured = 0;

    for (const item of items) {
      let isFull = true;
      if (!item.weightGrams) {
        isFull = false;
        warnings.push({
          itemId: item.id,
          itemName: item.name,
          type: 'MISSING_WEIGHT',
          severity: 'MEDIUM',
          suggestion:
            'Khai báo trọng lượng ước tính để hệ thống tính chính xác số kg thực phẩm cứu được.',
        });
      }
      if (!item.costPrice) {
        isFull = false;
        warnings.push({
          itemId: item.id,
          itemName: item.name,
          type: 'MISSING_COST',
          severity: 'LOW',
          suggestion:
            'Khai báo giá vốn giúp thuật toán định giá không bao giờ giảm dưới mức hòa vốn.',
        });
      }
      if (!item.allergens || item.allergens.length === 0) {
        isFull = false;
        warnings.push({
          itemId: item.id,
          itemName: item.name,
          type: 'MISSING_ALLERGENS',
          severity: 'MEDIUM',
          suggestion: 'Khai báo thành phần dị ứng để bảo vệ khách hàng có hồ sơ dị ứng thực phẩm.',
        });
      }
      if (isFull) fullyConfigured++;
    }

    const completenessScore =
      items.length > 0 ? Math.round((fullyConfigured / items.length) * 100) : 100;

    return {
      totalItems: items.length,
      fullyConfigured,
      completenessScore,
      warnings,
    };
  }

  /**
   * Cập nhật hàng loạt thuộc tính món ăn (tối đa 100 món theo R2-100)
   */
  async batchUpdateItems(storeId: string, dto: BatchUpdateItemsDto, actorId?: string) {
    const items = await this.itemRepo.findByIds(dto.itemIds);
    const storeItems = items.filter((i) => i.storeId === storeId);

    const updatedIds: string[] = [];

    for (const item of storeItems) {
      if (dto.category !== undefined) item.category = dto.category;
      if (dto.standardShelfLifeHours !== undefined)
        item.standardShelfLifeHours = dto.standardShelfLifeHours;
      if (dto.estimatedWeightGrams !== undefined) item.weightGrams = dto.estimatedWeightGrams;
      updatedIds.push(item.id);
    }

    if (storeItems.length > 0) {
      await this.itemRepo.save(storeItems);

      await this.auditLogService.log({
        storeId,
        actorId,
        actorRole: 'STORE_MEMBER',
        action: 'ITEMS_BATCH_UPDATED',
        targetType: 'ITEM_BATCH',
        newValue: {
          updatedCount: storeItems.length,
          itemIds: updatedIds,
        },
      });
    }

    return {
      successCount: storeItems.length,
      failedCount: dto.itemIds.length - storeItems.length,
      updatedItemIds: updatedIds,
    };
  }

  // -------------------------------------------------------------------------
  // TRUSTPASS MANAGER (CM-B05): hồ sơ minh bạch lô món
  // -------------------------------------------------------------------------

  /** Các trường trọng yếu phải lưu lịch sử khi thay đổi (BR-B05-06). */
  private static readonly TRUSTPASS_TRACKED_FIELDS = [
    'ingredients',
    'allergens',
    'expiryAt',
    'storageInstructions',
  ] as const;

  /** Lịch sử thay đổi các trường trọng yếu của hồ sơ minh bạch, mới nhất trước (BR-B05-06). */
  async getTrustpassHistory(storeId: string, itemId: string) {
    const item = await this.itemRepo.findOne({ where: { id: itemId, storeId } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID [${itemId}] trong cửa hàng.`);
    }
    return this.trustpassHistoryRepo.find({
      where: { itemId },
      order: { versionNo: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
  }

  async updateTrustpass(
    storeId: string,
    itemId: string,
    dto: UpdateTrustpassDto,
    actorId = '00000000-0000-0000-0000-000000000000',
  ): Promise<ItemEntity> {
    const item = await this.itemRepo.findOne({ where: { id: itemId, storeId } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID [${itemId}] trong cửa hàng.`);
    }

    // Thông tin mâu thuẫn thì chặn công bố (CM-B05): hạn dùng phải sau thời điểm chuẩn bị
    const prepared = dto.preparedAt ? new Date(dto.preparedAt) : item.preparedAt;
    const expiry = dto.expiryAt ? new Date(dto.expiryAt) : item.expiryAt;
    if (prepared && expiry && new Date(expiry).getTime() <= new Date(prepared).getTime()) {
      throw new BadRequestException('Hạn dùng phải sau thời điểm chuẩn bị món.');
    }

    // BR-B05-02: "đã xác minh" chỉ dùng khi có quy trình xác minh cụ thể - không
    // cho cửa hàng tự đặt informationSource ngoài danh sách cho phép ở DTO đã validate,
    // nhưng chủ cửa hàng không thể tự tuyên bố VERIFIED, chỉ nền tảng mới được (giữ DECLARED).
    const historyRows: Partial<TrustpassHistoryEntity>[] = [];
    const nextValues: Record<string, unknown> = {
      ingredients: dto.ingredients,
      allergens: dto.allergens,
      expiryAt: dto.expiryAt ? new Date(dto.expiryAt) : undefined,
      storageInstructions: dto.storageInstructions,
    };

    for (const field of CatalogService.TRUSTPASS_TRACKED_FIELDS) {
      const nextValue = nextValues[field];
      if (nextValue === undefined) continue;
      const oldValue = (item as unknown as Record<string, unknown>)[field];
      const changed =
        field === 'allergens'
          ? JSON.stringify(oldValue) !== JSON.stringify(nextValue)
          : String(oldValue ?? '') !== String(nextValue ?? '');
      if (changed) {
        historyRows.push({
          itemId: item.id,
          versionNo: item.trustpassVersion + 1,
          changedBy: actorId,
          fieldName: field,
          oldValue: oldValue ?? null,
          newValue: nextValue as never,
          source: dto.informationSource ?? item.informationSource,
        });
      }
      (item as unknown as Record<string, unknown>)[field] = nextValue;
    }

    if (dto.preparedAt !== undefined) item.preparedAt = new Date(dto.preparedAt);
    if (dto.informationSource !== undefined) item.informationSource = dto.informationSource;

    if (historyRows.length > 0) {
      item.trustpassVersion += 1;
      item.trustpassPublishedAt = new Date();
    }
    item.trustpassUpdatedBy = actorId;

    await this.itemRepo.save(item);
    if (historyRows.length > 0) {
      await this.trustpassHistoryRepo.save(this.trustpassHistoryRepo.create(historyRows));
    }

    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: 'STORE_MEMBER',
      action: 'TRUSTPASS_UPDATED',
      targetType: 'ITEM',
      targetId: item.id,
      newValue: { version: item.trustpassVersion, fields: historyRows.map((h) => h.fieldName) },
    });

    return item;
  }

  /**
   * Chỉ nền tảng/quy trình xác minh được chuyển verificationStatus sang VERIFIED
   * (BR-B05-01, BR-B05-02). Không expose qua endpoint cửa hàng.
   */
  async setTrustpassVerificationStatus(
    itemId: string,
    status: TrustpassVerificationStatus,
    actorId: string,
  ): Promise<ItemEntity> {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID [${itemId}].`);
    }
    item.verificationStatus = status;
    item.trustpassUpdatedBy = actorId;
    return this.itemRepo.save(item);
  }
}
