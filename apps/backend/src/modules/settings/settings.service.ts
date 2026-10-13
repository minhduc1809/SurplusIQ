import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import Redis from 'ioredis';
import {
  PlatformSettingEntity,
  StoreSettingsEntity,
  StoreSettingsHistoryEntity,
  PricingMode,
} from '../../entities';
import {
  REDIS_CLIENT,
  SETTINGS_CACHE_PREFIX,
  SETTINGS_CACHE_TTL_SECONDS,
  DEFAULT_PLATFORM_SETTINGS,
} from './settings.constants';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(PlatformSettingEntity)
    private readonly platformSettingRepo: Repository<PlatformSettingEntity>,
    @InjectRepository(StoreSettingsEntity)
    private readonly storeSettingsRepo: Repository<StoreSettingsEntity>,
    @InjectRepository(StoreSettingsHistoryEntity)
    private readonly storeSettingsHistoryRepo: Repository<StoreSettingsHistoryEntity>,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.seedDefaultPlatformSettings();
  }

  /**
   * Khởi tạo các tham số nền tảng mặc định nếu chưa tồn tại trong DB
   */
  async seedDefaultPlatformSettings(): Promise<void> {
    try {
      const existingSettings = await this.platformSettingRepo.find();
      const existingKeys = new Set(existingSettings.map((s) => s.key));

      const missingEntries: PlatformSettingEntity[] = [];
      for (const [key, item] of Object.entries(DEFAULT_PLATFORM_SETTINGS)) {
        if (!existingKeys.has(key)) {
          const entity = this.platformSettingRepo.create({
            key,
            value: item.value,
            dataType: item.dataType,
            description: item.description,
          });
          missingEntries.push(entity);
        }
      }

      if (missingEntries.length > 0) {
        await this.platformSettingRepo.save(missingEntries);
        this.logger.log(
          `Đã khởi tạo thành công ${missingEntries.length} tham số nền tảng mặc định.`,
        );
        await this.redisDel(SETTINGS_CACHE_PREFIX.PLATFORM_ALL);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không thể seed platform settings khi khởi động: ${msg}`);
    }
  }

  // =========================================================================
  // 1. QUẢN LÝ THAM SỐ NỀN TẢNG (PLATFORM SETTINGS)
  // =========================================================================

  /**
   * Đọc giá trị tham số nền tảng có cache Redis và ép kiểu tự động
   */
  async getPlatformSetting<T = unknown>(key: string, defaultValue?: T): Promise<T> {
    const cacheKey = `${SETTINGS_CACHE_PREFIX.PLATFORM}${key}`;

    // 1. Thử lấy từ Redis
    const cached = await this.redisGet(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }

    // 2. Fallback sang truy vấn CSDL
    const setting = await this.platformSettingRepo.findOne({ where: { key } });
    if (!setting) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      const defaultItem = DEFAULT_PLATFORM_SETTINGS[key];
      if (defaultItem) {
        return this.parseSettingValue(defaultItem.value, defaultItem.dataType) as T;
      }
      throw new NotFoundException(`Tham số nền tảng '${key}' không tồn tại`);
    }

    const parsedValue = this.parseSettingValue(setting.value, setting.dataType) as T;

    // 3. Ghi vào Redis cache
    await this.redisSet(cacheKey, JSON.stringify(parsedValue), SETTINGS_CACHE_TTL_SECONDS);

    return parsedValue;
  }

  /**
   * Lấy toàn bộ tham số nền tảng dưới dạng Record<key, value>
   */
  async getAllPlatformSettings(): Promise<Record<string, unknown>> {
    const cacheKey = SETTINGS_CACHE_PREFIX.PLATFORM_ALL;
    const cached = await this.redisGet(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as Record<string, unknown>;
    }

    const settings = await this.platformSettingRepo.find();
    const result: Record<string, unknown> = {};
    for (const s of settings) {
      result[s.key] = this.parseSettingValue(s.value, s.dataType);
    }

    await this.redisSet(cacheKey, JSON.stringify(result), SETTINGS_CACHE_TTL_SECONDS);

    return result;
  }

  /**
   * Cập nhật hoặc tạo mới một tham số nền tảng
   */
  async setPlatformSetting(
    key: string,
    value: unknown,
    description?: string,
  ): Promise<PlatformSettingEntity> {
    const defaultMeta = DEFAULT_PLATFORM_SETTINGS[key];
    const dataType = defaultMeta ? defaultMeta.dataType : this.inferDataType(value);
    const serializedValue =
      typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);

    let setting = await this.platformSettingRepo.findOne({ where: { key } });
    if (setting) {
      setting.value = serializedValue;
      setting.dataType = dataType;
      if (description) setting.description = description;
    } else {
      setting = this.platformSettingRepo.create({
        key,
        value: serializedValue,
        dataType,
        description: description || defaultMeta?.description || null,
      });
    }

    const saved = await this.platformSettingRepo.save(setting);

    // Xóa cache Redis
    await this.redisDel(`${SETTINGS_CACHE_PREFIX.PLATFORM}${key}`);
    await this.redisDel(SETTINGS_CACHE_PREFIX.PLATFORM_ALL);

    return saved;
  }

  // =========================================================================
  // 2. QUẢN LÝ THAM SỐ CỬA HÀNG (STORE SETTINGS) - R2-007, R2-101, R2-102
  // =========================================================================

  /**
   * Lấy cấu hình của một cửa hàng, nếu chưa có sẽ tự tạo mặc định
   */
  async getStoreSettings(storeId: string): Promise<StoreSettingsEntity> {
    const cacheKey = `${SETTINGS_CACHE_PREFIX.STORE}${storeId}`;

    const cached = await this.redisGet(cacheKey);
    if (cached !== null) {
      return JSON.parse(cached) as StoreSettingsEntity;
    }

    let settings = await this.storeSettingsRepo.findOne({
      where: { storeId },
    });

    if (!settings) {
      // Khởi tạo mặc định theo quy định BRD
      settings = this.storeSettingsRepo.create({
        storeId,
        defaultPickupStart: '19:00:00',
        defaultPickupEnd: '21:00:00',
        floorRatio: 0.4,
        costPriceRatio: null,
        pricingMode: PricingMode.MANUAL,
        lateGraceMinutes: 15,
        maxQtyPerOrder: 5,
        fixedDiscountSchedule: null,
      });
      settings = await this.storeSettingsRepo.save(settings);
    }

    await this.redisSet(cacheKey, JSON.stringify(settings), SETTINGS_CACHE_TTL_SECONDS);

    return settings;
  }

  /**
   * Cập nhật cấu hình cửa hàng, kiểm tra biên hợp lệ và ghi vết audit (R2-101, R2-102)
   */
  async updateStoreSettings(
    storeId: string,
    actorId: string,
    dto: UpdateStoreSettingsDto,
    isProPlan: boolean = false,
  ): Promise<StoreSettingsEntity> {
    // 1. Kiểm tra ràng buộc nghiệp vụ (R2-101, BR-046)
    if (dto.maxQtyPerOrder !== undefined && (dto.maxQtyPerOrder < 1 || dto.maxQtyPerOrder > 5)) {
      throw new BadRequestException(
        'Số lượng suất tối đa mỗi đơn chỉ được từ 1 đến 5 (BR-017, R2-101)',
      );
    }

    if (dto.pricingMode === PricingMode.AUTO && !isProPlan) {
      throw new BadRequestException(
        'Chế độ định giá tự động AUTO chỉ khả dụng cho cửa hàng gói Pro (BR-046)',
      );
    }

    if (dto.floorRatio !== undefined && dto.floorRatio < 0.4 && !dto.costPriceRatio) {
      throw new BadRequestException(
        'Tỷ lệ giá sàn không được thấp hơn 0.40 nếu chưa khai báo giá vốn (BR-046)',
      );
    }

    // 2. Chạy cập nhật và ghi audit trail trong Transaction
    return this.dataSource.transaction(async (manager) => {
      let currentSettings = await manager.findOne(StoreSettingsEntity, {
        where: { storeId },
      });

      if (!currentSettings) {
        currentSettings = manager.create(StoreSettingsEntity, {
          storeId,
          defaultPickupStart: '19:00:00',
          defaultPickupEnd: '21:00:00',
          floorRatio: 0.4,
          costPriceRatio: null,
          pricingMode: PricingMode.MANUAL,
          lateGraceMinutes: 15,
          maxQtyPerOrder: 5,
          fixedDiscountSchedule: null,
        });
      }

      const auditEntries: StoreSettingsHistoryEntity[] = [];

      for (const [k, newVal] of Object.entries(dto)) {
        if (newVal !== undefined) {
          const key = k as keyof StoreSettingsEntity;
          const oldVal = currentSettings[key];

          const oldStr = oldVal !== null && oldVal !== undefined ? JSON.stringify(oldVal) : null;
          const newStr = newVal !== null && newVal !== undefined ? JSON.stringify(newVal) : null;

          if (oldStr !== newStr) {
            auditEntries.push(
              manager.create(StoreSettingsHistoryEntity, {
                storeId,
                actorId,
                key: String(key),
                oldValue: oldStr,
                newValue: newStr,
              }),
            );
            Object.assign(currentSettings, { [key]: newVal });
          }
        }
      }

      if (auditEntries.length > 0) {
        await manager.save(auditEntries);
      }

      const updated = await manager.save(currentSettings);

      // Invalidate cache
      await this.redisDel(`${SETTINGS_CACHE_PREFIX.STORE}${storeId}`);

      return updated;
    });
  }

  /**
   * Lấy lịch sử thay đổi cấu hình của cửa hàng (R2-102)
   */
  async getStoreSettingsHistory(storeId: string): Promise<StoreSettingsHistoryEntity[]> {
    return this.storeSettingsHistoryRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  // =========================================================================
  // TIỆN ÍCH HỖ TRỢ (HELPERS)
  // =========================================================================

  private parseSettingValue(value: string, dataType: string): unknown {
    switch (dataType) {
      case 'NUMBER':
        return Number(value);
      case 'BOOLEAN':
        return value === 'true' || value === '1';
      case 'JSON':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  private inferDataType(value: unknown): 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' {
    if (typeof value === 'number') return 'NUMBER';
    if (typeof value === 'boolean') return 'BOOLEAN';
    if (typeof value === 'object' && value !== null) return 'JSON';
    return 'STRING';
  }

  private async redisGet(key: string): Promise<string | null> {
    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
        return await this.redisClient.get(key);
      }
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Redis get failed: ${msg}. Falling back to DB.`);
      return null;
    }
  }

  private async redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Redis set failed: ${msg}.`);
    }
  }

  private async redisDel(key: string): Promise<void> {
    try {
      if (this.redisClient.status === 'ready' || this.redisClient.status === 'connecting') {
        await this.redisClient.del(key);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(`Redis del failed: ${msg}.`);
    }
  }
}
