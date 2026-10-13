import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ItemEntity, ItemStatus } from '../../entities/catalog/item.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { QuotaService } from '../subscriptions/quota.service';
import { QuotaKey } from '../subscriptions/quota.constants';
import {
  CreateItemDto,
  UpdateItemDto,
  QueryItemsDto,
  QueryItemStatus,
  ImportCsvItemsDto,
} from './dto';

describe('CatalogService', () => {
  let service: CatalogService;

  const mockStoreId = 'store-uuid-101';
  const mockItemId = 'item-uuid-202';

  const mockItemEntity: ItemEntity = {
    id: mockItemId,
    storeId: mockStoreId,
    name: 'Bánh Mì Hoa Cúc',
    category: 'Bánh ngọt',
    originalPrice: 85000,
    costPrice: 35000,
    standardShelfLifeHours: 24,
    ingredients: 'Bột mì, bơ, trứng, đường',
    allergens: ['Gluten', 'Trứng', 'Sữa (Lactose)'],
    weightGrams: 300,
    imageUrl: 'https://cdn.example.com/banh.jpg',
    description: 'Bánh thơm bơ',
    nutritionEstimate: { cal: 350 },
    status: ItemStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockQueryBuilder = (result: any = null, countResult: any = [[mockItemEntity], 1]) => {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(result),
      getManyAndCount: jest.fn().mockResolvedValue(countResult),
      getRawOne: jest.fn().mockResolvedValue(result),
    };
  };

  const mockItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOfferRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  };

  const mockQuotaService = {
    getQuotaLimit: jest.fn().mockResolvedValue(100),
    consume: jest.fn().mockResolvedValue({ isExceeded: false }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: mockItemRepo,
        },
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: mockOfferRepo,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: QuotaService,
          useValue: mockQuotaService,
        },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  describe('getItems (R2-017, R2-018)', () => {
    it('phải trả về danh sách phân trang và mặc định lọc món ACTIVE', async () => {
      const qb = createMockQueryBuilder(null, [[mockItemEntity], 1]);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      const query: QueryItemsDto = { page: 1, limit: 20, status: QueryItemStatus.ACTIVE };
      const result = await service.getItems(mockStoreId, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(qb.andWhere).toHaveBeenCalledWith('item.status = :status', {
        status: ItemStatus.ACTIVE,
      });
    });

    it('phải tìm kiếm không phân biệt hoa thường khi có từ khóa search', async () => {
      const qb = createMockQueryBuilder(null, [[mockItemEntity], 1]);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getItems(mockStoreId, { search: 'hoa cúc' });

      expect(qb.andWhere).toHaveBeenCalledWith('LOWER(item.name) LIKE LOWER(:search)', {
        search: '%hoa cúc%',
      });
    });

    it('phải lọc theo danh mục khi được yêu cầu', async () => {
      const qb = createMockQueryBuilder(null, [[mockItemEntity], 1]);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getItems(mockStoreId, { category: 'Bánh ngọt' });

      expect(qb.andWhere).toHaveBeenCalledWith('item.category = :category', {
        category: 'Bánh ngọt',
      });
    });
  });

  describe('getItemById (R2-019)', () => {
    it('phải trả về chi tiết món kèm thống kê số suất và lượng đã bán', async () => {
      mockItemRepo.findOne.mockResolvedValue(mockItemEntity);

      const offerStatsQb = createMockQueryBuilder({ totalOffers: '5', totalSold: '42' });
      mockOfferRepo.createQueryBuilder.mockReturnValue(offerStatsQb);

      const result = await service.getItemById(mockStoreId, mockItemId);

      expect(result.id).toBe(mockItemId);
      expect(result.stats.totalOffersCreated).toBe(5);
      expect(result.stats.totalSold).toBe(42);
    });

    it('phải ném lỗi NotFoundException khi món không tồn tại trong quán', async () => {
      mockItemRepo.findOne.mockResolvedValue(null);

      await expect(service.getItemById(mockStoreId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createItem (R2-020, BR-064)', () => {
    const validDto: CreateItemDto = {
      name: 'Croissant Phô Mai',
      category: 'Bánh mì',
      originalPrice: 45000, // Bội số 500
      costPrice: 20000,
      standardShelfLifeHours: 12,
      allergens: ['Gluten', 'Sữa (Lactose)'],
    };

    it('phải tạo món mới thành công khi dữ liệu hợp lệ', async () => {
      const qb = createMockQueryBuilder(null);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);
      mockItemRepo.create.mockReturnValue({ ...validDto, id: 'new-id', status: ItemStatus.ACTIVE });
      mockItemRepo.save.mockResolvedValue({ ...validDto, id: 'new-id', status: ItemStatus.ACTIVE });

      const result = await service.createItem(mockStoreId, validDto, 'user-1');

      expect(result.name).toBe('Croissant Phô Mai');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ITEM_CREATED',
          targetType: 'ITEM',
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu giá không chia hết cho 500đ (BR-064)', async () => {
      const invalidDto: CreateItemDto = {
        ...validDto,
        originalPrice: 45200, // Không chia hết cho 500
      };

      await expect(service.createItem(mockStoreId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi BadRequestException nếu giá vốn cao hơn giá gốc', async () => {
      const invalidDto: CreateItemDto = {
        ...validDto,
        originalPrice: 45000,
        costPrice: 50000, // Giá vốn > Giá gốc
      };

      await expect(service.createItem(mockStoreId, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi ConflictException nếu tên món đã tồn tại trong các món ACTIVE của quán', async () => {
      const qb = createMockQueryBuilder(mockItemEntity); // Đã tồn tại
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.createItem(mockStoreId, validDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateItem (R2-022)', () => {
    it('phải cập nhật thông tin món và ghi nhật ký nếu thay đổi giá gốc', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItemEntity });
      mockItemRepo.save.mockImplementation(async (item: any) => item);

      const updateDto: UpdateItemDto = { originalPrice: 90000 };
      const result = await service.updateItem(mockStoreId, mockItemId, updateDto, 'user-1');

      expect(result.originalPrice).toBe(90000);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ITEM_PRICE_CHANGED',
          oldValue: { originalPrice: 85000 },
          newValue: { originalPrice: 90000 },
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu giá mới không chia hết cho 500đ', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItemEntity });

      const updateDto: UpdateItemDto = { originalPrice: 85250 };
      await expect(service.updateItem(mockStoreId, mockItemId, updateDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('phải ném lỗi ConflictException nếu đổi tên trùng với món ACTIVE khác', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItemEntity });
      const qb = createMockQueryBuilder({ id: 'other-item-id', name: 'Bánh Mì Gối' });
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      const updateDto: UpdateItemDto = { name: 'Bánh Mì Gối' };
      await expect(service.updateItem(mockStoreId, mockItemId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('archiveItem (R2-023, BR-051)', () => {
    it('phải chuyển trạng thái sang ARCHIVED khi không có suất nào đang OPEN', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItemEntity, status: ItemStatus.ACTIVE });
      mockOfferRepo.count.mockResolvedValue(0); // Không có suất OPEN
      mockItemRepo.save.mockImplementation(async (item: any) => item);

      const result = await service.archiveItem(mockStoreId, mockItemId, 'user-1');

      expect(result.status).toBe(ItemStatus.ARCHIVED);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ITEM_ARCHIVED',
        }),
      );
    });

    it('phải ném lỗi BadRequestException nếu món đang có suất bán OPEN (BR-051)', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItemEntity, status: ItemStatus.ACTIVE });
      mockOfferRepo.count.mockResolvedValue(2); // Có 2 suất OPEN

      await expect(service.archiveItem(mockStoreId, mockItemId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('restoreItem (R2-024)', () => {
    it('phải khôi phục món sang ACTIVE khi tên không bị trùng', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItemEntity, status: ItemStatus.ARCHIVED });
      const qb = createMockQueryBuilder(null); // Không trùng
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);
      mockItemRepo.save.mockImplementation(async (item: any) => item);

      const result = await service.restoreItem(mockStoreId, mockItemId, 'user-1');

      expect(result.status).toBe(ItemStatus.ACTIVE);
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ITEM_RESTORED',
        }),
      );
    });

    it('phải ném lỗi ConflictException nếu tên món trùng với món ACTIVE đang có', async () => {
      mockItemRepo.findOne.mockResolvedValue({ ...mockItemEntity, status: ItemStatus.ARCHIVED });
      const qb = createMockQueryBuilder({ id: 'active-item-dup', name: mockItemEntity.name });
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.restoreItem(mockStoreId, mockItemId)).rejects.toThrow(ConflictException);
    });
  });

  describe('importCsvItems (R2-025)', () => {
    it('phải kiểm tra hạn mức qua QuotaService và lưu các món hợp lệ', async () => {
      const qb = createMockQueryBuilder(null); // Không trùng DB
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);
      mockItemRepo.create.mockImplementation((dto: any) => ({ ...dto, id: 'id-' + Math.random() }));
      mockItemRepo.save.mockResolvedValue([]);

      const dto: ImportCsvItemsDto = {
        items: [
          {
            name: 'Món CSV 1',
            category: 'Bánh ngọt',
            originalPrice: 30000,
            standardShelfLifeHours: 24,
          },
          {
            name: 'Món CSV 2',
            category: 'Bánh mì',
            originalPrice: 40000,
            standardShelfLifeHours: 12,
          },
        ],
      };

      const result = await service.importCsvItems(mockStoreId, dto, 'user-1');

      expect(mockQuotaService.getQuotaLimit).toHaveBeenCalledWith(
        mockStoreId,
        QuotaKey.CSV_IMPORT_LINES,
      );
      expect(result.total).toBe(2);
      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockQuotaService.consume).toHaveBeenCalledWith({
        storeId: mockStoreId,
        quotaKey: QuotaKey.CSV_IMPORT_LINES,
        units: 2,
      });
    });

    it('phải ghi nhận lỗi cho các dòng không hợp lệ mà không làm dừng toàn bộ', async () => {
      const qb = createMockQueryBuilder(null);
      mockItemRepo.createQueryBuilder.mockReturnValue(qb);
      mockItemRepo.create.mockImplementation((dto: any) => dto);
      mockItemRepo.save.mockResolvedValue([]);

      const dto: ImportCsvItemsDto = {
        items: [
          {
            name: 'Món Hợp Lệ',
            category: 'Bánh ngọt',
            originalPrice: 30000,
            standardShelfLifeHours: 24,
          },
          {
            name: 'Món Sai Giá',
            category: 'Bánh mì',
            originalPrice: 30123, // Không chia hết 500
            standardShelfLifeHours: 12,
          },
        ],
      };

      const result = await service.importCsvItems(mockStoreId, dto, 'user-1');

      expect(result.total).toBe(2);
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0].name).toBe('Món Sai Giá');
    });
  });
});
