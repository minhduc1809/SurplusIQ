import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { DailyActualEntity } from '../../entities/reconciliation/daily-actual.entity';
import { ForecastEntity, ForecastConfidence } from '../../entities/reconciliation/forecast.entity';
import {
  PriceProposalEntity,
  ProposalStatus,
} from '../../entities/reconciliation/price-proposal.entity';
import { DecisionEntity } from './decision.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';

describe('DecisionsService Unit Tests (R2-036..R2-048)', () => {
  let service: DecisionsService;
  let itemRepo: any;
  let offerRepo: any;
  let dailyActualRepo: any;
  let forecastRepo: any;
  let proposalRepo: any;
  let decisionRepo: any;
  let settingsRepo: any;

  beforeEach(async () => {
    itemRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    offerRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    dailyActualRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'da-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'da-1', ...d })),
    };
    forecastRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'fc-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'fc-1', ...d })),
    };
    proposalRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'prop-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'prop-1', ...d })),
    };
    decisionRepo = {
      create: jest.fn().mockImplementation((d) => ({ id: 'dec-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'dec-1', ...d })),
    };
    settingsRepo = {
      findOne: jest.fn().mockResolvedValue({ floorRatio: 0.4 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DecisionsService,
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(DailyActualEntity), useValue: dailyActualRepo },
        { provide: getRepositoryToken(ForecastEntity), useValue: forecastRepo },
        { provide: getRepositoryToken(PriceProposalEntity), useValue: proposalRepo },
        { provide: getRepositoryToken(DecisionEntity), useValue: decisionRepo },
        { provide: getRepositoryToken(StoreSettingsEntity), useValue: settingsRepo },
      ],
    }).compile();

    service = module.get<DecisionsService>(DecisionsService);
  });

  describe('getForecasts (R2-036..R2-043)', () => {
    it('dự báo số lượng sản xuất ngày mai khi có lịch sử < 14 ngày (fallback hôm qua, cờ LOW)', async () => {
      itemRepo.find.mockResolvedValue([
        { id: 'item-1', name: 'Bánh mì hoa cúc', category: 'BAKERY', originalPrice: 35000 },
      ]);
      forecastRepo.findOne.mockResolvedValue(null);
      dailyActualRepo.find.mockResolvedValue([
        { date: '2026-10-14', produced: 30, soldOffline: 25, soldApp: 3, stockoutAt: null },
      ]);

      const forecasts = await service.getForecasts('store-1', '2026-10-15');
      expect(forecasts).toHaveLength(1);
      expect(forecasts[0].recommended).toBe(28); // 25 + 3
      expect(forecasts[0].confidence).toBe(ForecastConfidence.LOW);
      expect(forecastRepo.save).toHaveBeenCalled();
      expect(decisionRepo.save).toHaveBeenCalled();
    });
  });

  describe('overrideForecast (R2-041)', () => {
    it('chủ quán ghi đè số lượng dự báo thành công', async () => {
      forecastRepo.findOne.mockResolvedValue({
        id: 'fc-1',
        storeId: 'store-1',
        recommended: 20,
        chosenQuantity: null,
      });

      const res = await service.overrideForecast('store-1', 'fc-1', {
        chosenQuantity: 35,
        overrideReason: 'Khách đặt trước tiệc',
      });

      expect(res.chosenQuantity).toBe(35);
      expect(res.overrideReason).toBe('Khách đặt trước tiệc');
      expect(forecastRepo.save).toHaveBeenCalled();
    });

    it('ném lỗi NotFoundException nếu không tìm thấy forecast', async () => {
      forecastRepo.findOne.mockResolvedValue(null);
      await expect(
        service.overrideForecast('store-1', 'fc-99', { chosenQuantity: 30 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('logDailyActual (R2-039)', () => {
    it('ghi nhận số liệu thực tế cuối ngày thành công', async () => {
      itemRepo.findOne.mockResolvedValue({ id: 'item-1', storeId: 'store-1' });
      dailyActualRepo.findOne.mockResolvedValue(null);

      const res = await service.logDailyActual('store-1', {
        itemId: 'item-1',
        date: '2026-10-14',
        produced: 40,
        soldOffline: 35,
        soldApp: 5,
      });

      expect(res.produced).toBe(40);
      expect(res.soldOffline).toBe(35);
      expect(dailyActualRepo.save).toHaveBeenCalled();
    });
  });

  describe('proposeDynamicPrice (R2-044..R2-048)', () => {
    it('khởi tạo đề xuất giảm giá động khi tồn kho cao sát giờ chót', async () => {
      offerRepo.findOne.mockResolvedValue({
        id: 'off-1',
        storeId: 'store-1',
        status: OfferStatus.OPEN,
        originalPrice: 50000,
        currentPrice: 35000,
        floorPrice: 20000,
        totalQuantity: 10,
        remainingQuantity: 8,
        pickupStart: new Date(Date.now() - 3600000),
        pickupEnd: new Date(Date.now() + 1800000), // còn 30 phút
        priceChangeCount: 0,
      });

      const res = await service.proposeDynamicPrice('store-1', 'off-1');
      expect(res.canPropose).toBe(true);
      expect(proposalRepo.save).toHaveBeenCalled();
      expect(decisionRepo.save).toHaveBeenCalled();
    });

    it('từ chối đề xuất giá nếu suất bán không ở trạng thái OPEN', async () => {
      offerRepo.findOne.mockResolvedValue({
        id: 'off-1',
        storeId: 'store-1',
        status: OfferStatus.CLOSED,
      });

      await expect(service.proposeDynamicPrice('store-1', 'off-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acceptPriceProposal & rejectPriceProposal (R2-047)', () => {
    it('phê duyệt đề xuất giá thành công và cập nhật giá suất bán', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      proposalRepo.findOne.mockResolvedValue({
        id: 'prop-1',
        offerId: 'off-1',
        proposedPrice: 25000,
        status: ProposalStatus.PENDING,
        expiresAt: futureDate,
      });
      offerRepo.findOne.mockResolvedValue({
        id: 'off-1',
        storeId: 'store-1',
        currentPrice: 35000,
        priceChangeCount: 1,
      });

      const res = await service.acceptPriceProposal('store-1', 'prop-1', 'user-1');
      expect(res.success).toBe(true);
      expect(res.newPrice).toBe(25000);
      expect(offerRepo.save).toHaveBeenCalled();
      expect(proposalRepo.save).toHaveBeenCalled();
    });

    it('ném lỗi nếu đề xuất giá đã hết hạn 15 phút', async () => {
      const pastDate = new Date(Date.now() - 1000);
      proposalRepo.findOne.mockResolvedValue({
        id: 'prop-1',
        offerId: 'off-1',
        proposedPrice: 25000,
        status: ProposalStatus.PENDING,
        expiresAt: pastDate,
      });
      offerRepo.findOne.mockResolvedValue({
        id: 'off-1',
        storeId: 'store-1',
      });

      await expect(service.acceptPriceProposal('store-1', 'prop-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('từ chối đề xuất giá thành công', async () => {
      proposalRepo.findOne.mockResolvedValue({
        id: 'prop-1',
        offerId: 'off-1',
        status: ProposalStatus.PENDING,
      });
      offerRepo.findOne.mockResolvedValue({
        id: 'off-1',
        storeId: 'store-1',
      });

      const res = await service.rejectPriceProposal('store-1', 'prop-1', 'user-1');
      expect(res.success).toBe(true);
      expect(proposalRepo.save).toHaveBeenCalled();
    });
  });
});
