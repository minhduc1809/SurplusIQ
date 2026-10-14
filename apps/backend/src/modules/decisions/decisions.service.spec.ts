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
import { SpecialEventEntity } from '../../entities/reconciliation/special-event.entity';
import { ActionCardEntity, ActionCardStatus } from '../../entities/ai/action-card.entity';
import { DonationRecordEntity } from '../../entities/ai/donation-record.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';

describe('DecisionsService Unit Tests (R2-036..R2-048, R2-040, R2-099, R2-112..115, R2-121)', () => {
  let service: DecisionsService;
  let itemRepo: any;
  let offerRepo: any;
  let dailyActualRepo: any;
  let forecastRepo: any;
  let proposalRepo: any;
  let decisionRepo: any;
  let settingsRepo: any;
  let specialEventRepo: any;
  let actionCardRepo: any;
  let donationRecordRepo: any;
  let orderRepo: any;

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
    specialEventRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'ev-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'ev-1', ...d })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    actionCardRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'ac-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'ac-1', ...d })),
    };
    donationRecordRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => ({ id: 'don-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'don-1', ...d })),
    };
    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
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
        { provide: getRepositoryToken(SpecialEventEntity), useValue: specialEventRepo },
        { provide: getRepositoryToken(ActionCardEntity), useValue: actionCardRepo },
        { provide: getRepositoryToken(DonationRecordEntity), useValue: donationRecordRepo },
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
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

  describe('special events & anomalies & action cards (R2-040, R2-112..115)', () => {
    it('quản lý sự kiện đặc biệt thành công (R2-040)', async () => {
      specialEventRepo.find.mockResolvedValue([{ id: 'ev-1', type: 'LỄ HỘI', impactFactor: 1.3 }]);
      const list = await service.getSpecialEvents('store-1');
      expect(list.length).toBe(1);

      const created = await service.createSpecialEvent('store-1', {
        date: '2026-10-20',
        type: 'LỄ HỘI',
        impactFactor: 1.3,
      });
      expect(created.id).toBe('ev-1');

      specialEventRepo.findOne.mockResolvedValue({ id: 'ev-1', storeId: 'store-1' });
      const del = await service.deleteSpecialEvent('store-1', 'ev-1');
      expect(del.success).toBe(true);
    });

    it('phát hiện bất thường và thẻ hành động AI (R2-112..115)', async () => {
      dailyActualRepo.find.mockResolvedValue([
        { date: '2026-10-14', produced: 50, soldOffline: 10, soldApp: 5 },
      ]);
      orderRepo.find.mockResolvedValue([
        { createdAt: new Date('2026-10-14T10:00:00Z'), totalAmount: 150000 },
      ]);

      const anomalies = await service.detectAnomalies('store-1');
      expect(anomalies).toBeDefined();

      const cards = await service.getActionCards('store-1');
      expect(cards.length).toBeGreaterThan(0);

      actionCardRepo.findOne.mockResolvedValue({
        id: 'ac-1',
        storeId: 'store-1',
        status: ActionCardStatus.PENDING,
      });
      const applied = await service.applyActionCard('store-1', 'ac-1');
      expect(applied.status).toBe(ActionCardStatus.ACCEPTED);
    });

    it('mô phỏng chính sách và ghi nhận quyên góp (R2-099, R2-121)', async () => {
      orderRepo.find.mockResolvedValue([{ createdAt: new Date(), totalAmount: 200000 }]);
      const sim = await service.simulatePolicy('store-1', {
        days: 30,
        discountRatio: 0.5,
        dynamicPricing: true,
      });
      expect(sim.simulated.revenue).toBeGreaterThan(0);

      const donSuggest = await service.getDonationSuggestions('store-1');
      expect(donSuggest.verifiedCharities.length).toBeGreaterThan(0);

      const donRec = await service.createDonationRecord('store-1', {
        offerId: '00000000-0000-0000-0000-000000000001',
        quantity: 5,
        recipientName: 'Mái ấm Ánh Sáng',
      });
      expect(donRec.success).toBe(true);
    });
  });
});
