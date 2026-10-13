import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SettingsService } from './settings.service';
import {
  PlatformSettingEntity,
  StoreSettingsEntity,
  StoreSettingsHistoryEntity,
  PricingMode,
} from '../../entities';
import { REDIS_CLIENT, SETTINGS_CACHE_PREFIX } from './settings.constants';

describe('SettingsService', () => {
  let service: SettingsService;
  let mockPlatformSettingRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockStoreSettingsRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockStoreSettingsHistoryRepo: {
    find: jest.Mock;
  };
  let mockRedisClient: {
    status: string;
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let mockDataSource: {
    transaction: jest.Mock;
  };

  beforeEach(async () => {
    mockPlatformSettingRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockStoreSettingsRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockStoreSettingsHistoryRepo = {
      find: jest.fn(),
    };

    mockRedisClient = {
      status: 'ready',
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => {
        const manager = {
          findOne: mockStoreSettingsRepo.findOne,
          create: jest.fn((entityClass, dto) => ({ ...dto })),
          save: jest.fn((entities) => Promise.resolve(entities)),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(PlatformSettingEntity),
          useValue: mockPlatformSettingRepo,
        },
        {
          provide: getRepositoryToken(StoreSettingsEntity),
          useValue: mockStoreSettingsRepo,
        },
        {
          provide: getRepositoryToken(StoreSettingsHistoryEntity),
          useValue: mockStoreSettingsHistoryRepo,
        },
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('seedDefaultPlatformSettings', () => {
    it('should seed missing platform settings into database', async () => {
      mockPlatformSettingRepo.find.mockResolvedValue([]);
      await service.seedDefaultPlatformSettings();

      expect(mockPlatformSettingRepo.save).toHaveBeenCalled();
      const savedEntities = mockPlatformSettingRepo.save.mock.calls[0][0];
      expect(savedEntities.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('getPlatformSetting', () => {
    it('should return cached value from Redis when available', async () => {
      mockRedisClient.get.mockResolvedValue(JSON.stringify(10));

      const result = await service.getPlatformSetting('order.hold_minutes');
      expect(result).toBe(10);
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        `${SETTINGS_CACHE_PREFIX.PLATFORM}order.hold_minutes`,
      );
      expect(mockPlatformSettingRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from database, cache to Redis, and return parsed number', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        key: 'order.hold_minutes',
        value: '10',
        dataType: 'NUMBER',
      });

      const result = await service.getPlatformSetting<number>('order.hold_minutes');
      expect(result).toBe(10);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `${SETTINGS_CACHE_PREFIX.PLATFORM}order.hold_minutes`,
        '10',
        'EX',
        3600,
      );
    });

    it('should fallback to default item if setting not found in DB', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockPlatformSettingRepo.findOne.mockResolvedValue(null);

      const result = await service.getPlatformSetting<number>('order.hold_minutes');
      expect(result).toBe(10);
    });

    it('should throw NotFoundException if setting is unknown and has no default', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockPlatformSettingRepo.findOne.mockResolvedValue(null);

      await expect(service.getPlatformSetting('unknown.nonexistent.key')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should gracefully degrade and fetch from DB if Redis throws error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection lost'));
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        key: 'price.rounding_step',
        value: '500',
        dataType: 'NUMBER',
      });

      const result = await service.getPlatformSetting<number>('price.rounding_step');
      expect(result).toBe(500);
    });
  });

  describe('setPlatformSetting', () => {
    it('should save setting and invalidate Redis caches', async () => {
      mockPlatformSettingRepo.findOne.mockResolvedValue({
        key: 'order.hold_minutes',
        value: '10',
        dataType: 'NUMBER',
      });

      await service.setPlatformSetting('order.hold_minutes', 15);
      expect(mockPlatformSettingRepo.save).toHaveBeenCalled();
      expect(mockRedisClient.del).toHaveBeenCalledWith(
        `${SETTINGS_CACHE_PREFIX.PLATFORM}order.hold_minutes`,
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith(SETTINGS_CACHE_PREFIX.PLATFORM_ALL);
    });
  });

  describe('getStoreSettings', () => {
    const storeId = '11111111-1111-1111-1111-111111111111';

    it('should return cached store settings from Redis', async () => {
      const mockSettings = {
        storeId,
        defaultPickupStart: '19:00:00',
        maxQtyPerOrder: 5,
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSettings));

      const result = await service.getStoreSettings(storeId);
      expect(result).toEqual(mockSettings);
      expect(mockStoreSettingsRepo.findOne).not.toHaveBeenCalled();
    });

    it('should create default settings if store settings do not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockStoreSettingsRepo.findOne.mockResolvedValue(null);

      const result = await service.getStoreSettings(storeId);
      expect(result.storeId).toBe(storeId);
      expect(result.floorRatio).toBe(0.4);
      expect(result.maxQtyPerOrder).toBe(5);
      expect(mockStoreSettingsRepo.save).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });
  });

  describe('updateStoreSettings', () => {
    const storeId = '11111111-1111-1111-1111-111111111111';
    const actorId = '22222222-2222-2222-2222-222222222222';

    it('should reject maxQtyPerOrder > 5 per BR-017 & R2-101', async () => {
      await expect(
        service.updateStoreSettings(storeId, actorId, { maxQtyPerOrder: 6 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject pricingMode AUTO for non-pro stores per BR-046', async () => {
      await expect(
        service.updateStoreSettings(
          storeId,
          actorId,
          { pricingMode: PricingMode.AUTO },
          false, // Not pro
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow pricingMode AUTO for Pro store plan', async () => {
      mockStoreSettingsRepo.findOne.mockResolvedValue({
        storeId,
        pricingMode: PricingMode.MANUAL,
        maxQtyPerOrder: 5,
        floorRatio: 0.4,
      });

      const result = await service.updateStoreSettings(
        storeId,
        actorId,
        { pricingMode: PricingMode.AUTO },
        true, // Pro plan
      );

      expect(result.pricingMode).toBe(PricingMode.AUTO);
      expect(mockRedisClient.del).toHaveBeenCalledWith(`${SETTINGS_CACHE_PREFIX.STORE}${storeId}`);
    });

    it('should reject floorRatio < 0.40 if costPriceRatio is not provided per BR-046', async () => {
      await expect(
        service.updateStoreSettings(storeId, actorId, { floorRatio: 0.35 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should record audit history in store_settings_history when settings change', async () => {
      mockStoreSettingsRepo.findOne.mockResolvedValue({
        storeId,
        maxQtyPerOrder: 5,
        lateGraceMinutes: 15,
      });

      await service.updateStoreSettings(storeId, actorId, {
        maxQtyPerOrder: 3,
        lateGraceMinutes: 20,
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });
});
