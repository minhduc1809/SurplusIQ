import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoreEntity } from '../../entities/stores/store.entity';
import { StoreClosureEntity } from '../../entities/stores/store-closure.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { WeeklyStatementEntity } from '../../entities/reconciliation/weekly-statement.entity';

describe('StoresService Unit Tests (R2-004..R2-010, R2-050, R2-061..R2-075)', () => {
  let service: StoresService;
  let storeRepo: any;
  let closureRepo: any;
  let settingsRepo: any;
  let orderRepo: any;
  let offerRepo: any;
  let complaintRepo: any;
  let reviewRepo: any;
  let statementRepo: any;

  beforeEach(async () => {
    storeRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    closureRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    settingsRepo = {
      findOne: jest.fn(),
    };
    orderRepo = {
      find: jest.fn(),
    };
    offerRepo = {
      count: jest.fn().mockResolvedValue(3),
      update: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    complaintRepo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([]),
    };
    reviewRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    statementRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
        { provide: getRepositoryToken(StoreClosureEntity), useValue: closureRepo },
        { provide: getRepositoryToken(StoreSettingsEntity), useValue: settingsRepo },
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(ComplaintEntity), useValue: complaintRepo },
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: getRepositoryToken(WeeklyStatementEntity), useValue: statementRepo },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
  });

  describe('getStoreProfile (R2-004)', () => {
    it('lấy thông tin hồ sơ và cấu hình thành công', async () => {
      storeRepo.findOne.mockResolvedValue({
        id: 'store-1',
        name: 'Tiệm Bánh Mì',
        phone: '0901234567',
      });
      settingsRepo.findOne.mockResolvedValue({ floorRatio: 0.4 });
      closureRepo.findOne.mockResolvedValue(null);

      const res = await service.getStoreProfile('store-1');
      expect(res.store.name).toBe('Tiệm Bánh Mì');
      expect(res.isPausedToday).toBe(false);
    });

    it('ném lỗi NotFoundException nếu không tìm thấy quán', async () => {
      storeRepo.findOne.mockResolvedValue(null);
      await expect(service.getStoreProfile('store-99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStoreProfile (R2-005)', () => {
    it('cập nhật thông tin quán thành công', async () => {
      storeRepo.findOne.mockResolvedValue({
        id: 'store-1',
        name: 'Tên Cũ',
      });

      const updated = await service.updateStoreProfile('store-1', {
        name: 'Tên Mới',
        phone: '0988888888',
      });

      expect(updated.name).toBe('Tên Mới');
      expect(storeRepo.save).toHaveBeenCalled();
    });
  });

  describe('pauseToday & resumeToday (R2-006, BR-006)', () => {
    it('tạm dừng nhận đơn hôm nay thành công', async () => {
      closureRepo.findOne.mockResolvedValue(null);

      const res = await service.pauseToday('store-1');
      expect(res.success).toBe(true);
      expect(closureRepo.save).toHaveBeenCalled();
      expect(offerRepo.update).toHaveBeenCalledWith(
        { storeId: 'store-1', status: OfferStatus.OPEN },
        { status: OfferStatus.CLOSED },
      );
    });

    it('mở lại hoạt động nhận đơn hôm nay thành công', async () => {
      const res = await service.resumeToday('store-1');
      expect(res.success).toBe(true);
      expect(closureRepo.delete).toHaveBeenCalled();
      expect(offerRepo.update).toHaveBeenCalledWith(
        { storeId: 'store-1', status: OfferStatus.CLOSED },
        { status: OfferStatus.OPEN },
      );
    });
  });

  describe('getDailyOverview (R2-050)', () => {
    it('tổng quan số liệu ngày chính xác', async () => {
      orderRepo.find.mockResolvedValue([
        { id: '1', status: OrderStatus.PICKED_UP, totalAmount: 40000, quantity: 2 },
        { id: '2', status: OrderStatus.PAID, totalAmount: 30000, quantity: 1 },
        { id: '3', status: OrderStatus.CANCELLED, totalAmount: 20000, quantity: 1 },
      ]);
      closureRepo.findOne.mockResolvedValue(null);

      const overview = await service.getDailyOverview('store-1');
      expect(overview.orders.completed).toBe(1);
      expect(overview.orders.paid).toBe(1);
      expect(overview.orders.cancelled).toBe(1);
      expect(overview.grossRevenue).toBe(70000);
      expect(overview.rescuedItemsCount).toBe(2);
      expect(overview.foodSavedKg).toBe(0.8);
    });
  });

  describe('getPickupSchedule (R2-050)', () => {
    it('phân nhóm các đơn hàng vào khung 15 phút', async () => {
      orderRepo.find.mockResolvedValue([
        {
          id: '1',
          code: 'SQ01',
          quantity: 2,
          totalAmount: 50000,
          status: OrderStatus.PAID,
          pickupSlot: new Date('2026-10-14T19:05:00Z'),
          createdAt: new Date('2026-10-14T18:00:00Z'),
        },
        {
          id: '2',
          code: 'SQ02',
          quantity: 1,
          totalAmount: 25000,
          status: OrderStatus.PICKED_UP,
          pickupSlot: new Date('2026-10-14T19:10:00Z'),
          createdAt: new Date('2026-10-14T18:10:00Z'),
        },
      ]);

      const schedule = await service.getPickupSchedule('store-1');
      expect(schedule.length).toBeGreaterThanOrEqual(1);
      expect(schedule[0].orderCount).toBe(2);
    });
  });

  describe('getReportsOverview (R2-061..R2-064)', () => {
    it('tính toán báo cáo kinh doanh theo khoảng ngày', async () => {
      orderRepo.find.mockResolvedValue([
        { id: '1', status: OrderStatus.PICKED_UP, totalAmount: 100000, quantity: 4 },
      ]);
      reviewRepo.find.mockResolvedValue([{ rating: 5 }, { rating: 4 }]);

      const report = await service.getReportsOverview('store-1', {
        startDate: '2026-10-01',
        endDate: '2026-10-14',
      });

      expect(report.summary.grossRevenue).toBe(100000);
      expect(report.summary.foodSavedKg).toBe(1.6);
      expect(report.summary.ratingAvg).toBe(4.5);
    });
  });

  describe('getReconciliation (R2-068..R2-075)', () => {
    it('tính toán đối soát tài chính tuần và kiểm tra checksum bất biến', async () => {
      orderRepo.find.mockResolvedValue([
        { id: 'ord-1', totalAmount: 200000, status: OrderStatus.PICKED_UP },
      ]);
      complaintRepo.find.mockResolvedValue([]);
      statementRepo.find.mockResolvedValue([]);

      const result = await service.getReconciliation('store-1');
      expect(result.currentCycle).toBeDefined();
      expect(result.currentCycle.grossSales).toBe(200000);
      expect(result.currentCycle.commissionAmount).toBe(20000); // 10%
      expect(result.currentCycle.netPayout).toBe(180000);
      expect(result.currentCycle.checksumValid).toBe(true);
    });
  });
});
