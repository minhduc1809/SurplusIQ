import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionsService } from './subscriptions.service';
import { QuotaService } from './quota.service';
import { SettingsService } from '../settings/settings.service';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';
import {
  SubscriptionInvoiceEntity,
  InvoiceStatus,
} from '../../entities/subscriptions/subscription-invoice.entity';
import { StoreSettingsEntity, PricingMode } from '../../entities/stores/store-settings.entity';
import {
  StoreMemberEntity,
  StoreMemberStatus,
  StorePermission,
} from '../../entities/stores/store-member.entity';

describe('SubscriptionsService Unit Tests (VC-01..VC-11)', () => {
  let service: SubscriptionsService;
  let subRepo: any;
  let invoiceRepo: any;
  let storeSettingsRepo: any;
  let storeMemberRepo: any;
  let quotaService: any;

  const mockStoreId = 'store-sub-123';

  beforeEach(async () => {
    subRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      create: jest.fn().mockImplementation((dto) => dto),
    };

    invoiceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'inv-1', ...e })),
      create: jest.fn().mockImplementation((dto) => dto),
    };

    storeSettingsRepo = {
      findOne: jest.fn().mockResolvedValue({ storeId: mockStoreId, pricingMode: PricingMode.AUTO }),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    storeMemberRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'm-1', permission: StorePermission.OWNER, status: StoreMemberStatus.ACTIVE },
        { id: 'm-2', permission: StorePermission.MANAGER, status: StoreMemberStatus.ACTIVE },
        { id: 'm-3', permission: StorePermission.COUNTER, status: StoreMemberStatus.ACTIVE },
      ]),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    quotaService = {
      getEffectivePlan: jest.fn().mockResolvedValue(SubscriptionPlan.PRO),
      getStoreQuotaSummary: jest.fn(),
    };
    const repositories = new Map<any, any>([
      [SubscriptionEntity, subRepo],
      [SubscriptionInvoiceEntity, invoiceRepo],
      [StoreSettingsEntity, storeSettingsRepo],
      [StoreMemberEntity, storeMemberRepo],
    ]);
    const transactionManager = {
      findOne: jest.fn().mockResolvedValue({ id: mockStoreId }),
      getRepository: (entity) => repositories.get(entity),
    };
    subRepo.manager = { transaction: jest.fn((work) => work(transactionManager)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getRepositoryToken(SubscriptionEntity), useValue: subRepo },
        { provide: getRepositoryToken(SubscriptionInvoiceEntity), useValue: invoiceRepo },
        { provide: getRepositoryToken(StoreSettingsEntity), useValue: storeSettingsRepo },
        { provide: getRepositoryToken(StoreMemberEntity), useValue: storeMemberRepo },
        { provide: QuotaService, useValue: quotaService },
        {
          provide: SettingsService,
          useValue: { invalidateStoreSettingsCache: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it('getCurrentSubscription - tạo mới gói Basic nếu chưa có', async () => {
    subRepo.findOne.mockResolvedValueOnce(null);
    quotaService.getEffectivePlan.mockResolvedValueOnce(SubscriptionPlan.BASIC);

    const res = await service.getCurrentSubscription(mockStoreId);
    expect(res.plan).toBe(SubscriptionPlan.BASIC);
    expect(subRepo.create).toHaveBeenCalled();
  });

  it('upgradeToPro - nâng cấp lên gói Pro và sinh hóa đơn 300.000đ (VC-02)', async () => {
    subRepo.findOne.mockResolvedValueOnce({
      storeId: mockStoreId,
      plan: SubscriptionPlan.BASIC,
      status: SubscriptionStatus.ACTIVE,
    });

    const res = await service.upgradeToPro(mockStoreId);
    expect(res.plan).toBe(SubscriptionPlan.PRO);
    expect(invoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: mockStoreId,
        amount: 300000,
        status: InvoiceStatus.PAID,
      }),
    );
  });

  it('renewPro - gia hạn trước hạn sẽ nối tiếp kỳ hạn cũ +30 ngày (VC-03)', async () => {
    const futurePeriodEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    subRepo.findOne.mockResolvedValueOnce({
      storeId: mockStoreId,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      periodStart: new Date(),
      periodEnd: futurePeriodEnd,
    });

    const res = await service.renewPro(mockStoreId);
    expect(res.plan).toBe(SubscriptionPlan.PRO);
    expect(invoiceRepo.save).toHaveBeenCalled();
    const periodEndMs = new Date(res.periodEnd).getTime();
    expect(periodEndMs).toBeGreaterThan(futurePeriodEnd.getTime());
    expect(invoiceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: futurePeriodEnd,
        periodEnd: new Date(futurePeriodEnd.getTime() + 30 * 86400000),
      }),
    );
  });

  it('downgradeToBasic - gói Trial dừng ngay lập tức, tắt AUTO và khóa nhân viên ngoài hạn mức (VC-05, VC-06)', async () => {
    subRepo.findOne.mockResolvedValueOnce({
      storeId: mockStoreId,
      plan: SubscriptionPlan.TRIAL,
      status: SubscriptionStatus.ACTIVE,
      periodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    });

    const res = await service.downgradeToBasic(mockStoreId);
    expect(res.plan).toBe(SubscriptionPlan.BASIC);
    expect(storeSettingsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ pricingMode: PricingMode.MANUAL }),
    );
    expect(storeMemberRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm-3', status: StoreMemberStatus.LOCKED }),
    );
  });

  it('downgradeToBasic - gói Pro trả phí đánh dấu downgradeAtPeriodEnd (VC-05)', async () => {
    const sub = {
      storeId: mockStoreId,
      plan: SubscriptionPlan.PRO,
      status: SubscriptionStatus.ACTIVE,
      periodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      downgradeAtPeriodEnd: false,
    };
    subRepo.findOne.mockResolvedValueOnce(sub);

    const res = await service.downgradeToBasic(mockStoreId);
    expect(res.downgradeAtPeriodEnd).toBe(true);
  });

  it('getInvoices & getInvoicePdf - lấy hóa đơn và tải PDF', async () => {
    invoiceRepo.find.mockResolvedValueOnce([{ id: 'inv-1', amount: 300000 }]);
    invoiceRepo.findOne.mockResolvedValueOnce({
      id: 'inv-1',
      storeId: mockStoreId,
      amount: 300000,
      periodStart: new Date(),
      periodEnd: new Date(),
      status: InvoiceStatus.PAID,
    });

    const invoices = await service.getInvoices(mockStoreId);
    expect(invoices.length).toBe(1);

    const pdf = await service.getInvoicePdf(mockStoreId, 'inv-1');
    expect(pdf.filename).toBe('invoice-inv-1.pdf');
    expect(pdf.contentType).toBe('application/pdf');
    expect(pdf.dataBase64).toBeDefined();
  });
});
