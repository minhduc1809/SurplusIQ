import { CryptoUtil } from '../auth/crypto.util';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CustomerProfileService } from './customer-profile.service';
import { UserEntity, UserStatus } from '../../entities/auth/user.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { SavedPlaceEntity } from '../../entities/auth/saved-place.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { FcmTokenEntity } from '../../entities/auth/fcm-token.entity';
import { ConsentEntity, ConsentType } from '../../entities/auth/consent.entity';
import { FavoriteStoreEntity } from '../../entities/auth/favorite-store.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { PromotionWalletEntity } from '../../entities/marketing/promotion-wallet.entity';
import { PromotionEntity, PromotionStatus } from '../../entities/marketing/promotion.entity';

describe('CustomerProfileService (Full Customer Features)', () => {
  let service: CustomerProfileService;
  let userRepo: any;
  let profileRepo: any;
  let savedPlaceRepo: any;
  let dietaryRepo: any;
  let noshowRepo: any;
  let orderLockRepo: any;
  let fcmTokenRepo: any;
  let consentRepo: any;
  let favoriteRepo: any;
  let paymentRepo: any;
  let orderRepo: any;
  let walletRepo: any;
  let promotionRepo: any;

  beforeAll(() => {
    process.env.DATA_ENCRYPTION_KEY = 'test-key';
  });

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    profileRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    savedPlaceRepo = {
      count: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => ({ id: 'place-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'place-1', ...d })),
      delete: jest.fn().mockResolvedValue({}),
    };
    dietaryRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    noshowRepo = {
      count: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockResolvedValue([]),
    };
    orderLockRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    fcmTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      delete: jest.fn().mockResolvedValue({}),
    };
    consentRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => ({ id: 'c-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'c-1', ...d })),
    };
    favoriteRepo = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d) => ({ id: 'fav-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'fav-1', ...d })),
      delete: jest.fn().mockResolvedValue({}),
    };
    paymentRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    orderRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    walletRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((d) => ({ id: 'w-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'w-1', ...d })),
    };
    promotionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerProfileService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: getRepositoryToken(CustomerProfileEntity), useValue: profileRepo },
        { provide: getRepositoryToken(SavedPlaceEntity), useValue: savedPlaceRepo },
        { provide: getRepositoryToken(DietaryProfileEntity), useValue: dietaryRepo },
        { provide: getRepositoryToken(NoshowRecordEntity), useValue: noshowRepo },
        { provide: getRepositoryToken(OrderLockEntity), useValue: orderLockRepo },
        { provide: getRepositoryToken(FcmTokenEntity), useValue: fcmTokenRepo },
        { provide: getRepositoryToken(ConsentEntity), useValue: consentRepo },
        { provide: getRepositoryToken(FavoriteStoreEntity), useValue: favoriteRepo },
        { provide: getRepositoryToken(PaymentTransactionEntity), useValue: paymentRepo },
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(PromotionWalletEntity), useValue: walletRepo },
        { provide: getRepositoryToken(PromotionEntity), useValue: promotionRepo },
      ],
    }).compile();

    service = module.get<CustomerProfileService>(CustomerProfileService);
  });

  describe('getProfile', () => {
    it('lấy hồ sơ cá nhân và che mặt nạ email, SĐT (R1-005)', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'u1',
        email: 'nguyenvana@gmail.com',
        phone: '0901234567',
        twoFactorEnabled: false,
        status: UserStatus.ACTIVE,
      });
      profileRepo.findOne.mockResolvedValueOnce({
        userId: 'u1',
        fullName: 'Nguyễn Văn A',
        searchRadiusKm: 5.0,
      });

      const res = await service.getProfile('u1');
      expect(res.fullName).toBe('Nguyễn Văn A');
      expect(res.email).toBe('n***a@gmail.com');
      expect(res.phone).toBe('090***567');
    });
  });

  describe('consents & notification settings', () => {
    it('ghi nhận chấp thuận điều khoản (R1-012, R1-017)', async () => {
      const res = await service.recordConsent('u1', ConsentType.TERMS, true, '1.0');
      expect(res.granted).toBe(true);
      expect(consentRepo.create).toHaveBeenCalled();
    });

    it('lấy cài đặt thông báo (R1-010)', async () => {
      const res = await service.getNotificationSettings('u1');
      expect(res.orderUpdates).toBe(true);
    });
  });

  describe('account deletion & export', () => {
    it('yêu cầu xóa tài khoản chuyển status sang PENDING_DELETE (R1-011, BR-007)', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'u1',
        status: UserStatus.ACTIVE,
        passwordHash: CryptoUtil.hashPassword('Mat-khau-1'),
      });
      const res = await service.requestAccountDelete('u1', 'Mat-khau-1');
      expect(res.status).toBe(UserStatus.PENDING_DELETE);
      expect(res.deleteRequestedAt).toBeDefined();
    });

    it('BUG-016: sai mật khẩu hoặc thiếu mật khẩu thì KHÔNG được chuyển PENDING_DELETE', async () => {
      const user = {
        id: 'u1',
        status: UserStatus.ACTIVE,
        passwordHash: CryptoUtil.hashPassword('Mat-khau-1'),
      };
      userRepo.findOne.mockResolvedValueOnce(user);
      await expect(service.requestAccountDelete('u1', 'sai')).rejects.toThrow(
        /Mật khẩu không đúng/,
      );
      userRepo.findOne.mockResolvedValueOnce(user);
      await expect(service.requestAccountDelete('u1', '')).rejects.toThrow(/Mật khẩu không đúng/);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('hủy yêu cầu xóa tài khoản chuyển status về ACTIVE (R1-019)', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        id: 'u1',
        status: UserStatus.PENDING_DELETE,
        deleteRequestedAt: new Date(),
      });
      const res = await service.cancelAccountDelete('u1');
      expect(res.status).toBe(UserStatus.ACTIVE);
    });

    it('xuất toàn bộ dữ liệu cá nhân (R1-018)', async () => {
      userRepo.findOne.mockResolvedValueOnce({ id: 'u1', email: 'test@example.com' });
      profileRepo.findOne.mockResolvedValueOnce({ userId: 'u1', fullName: 'Test' });
      const res = await service.exportUserData('u1');
      expect(res.downloadUrl).toBeDefined();
      expect(res.expiresInHours).toBe(24);
    });
  });

  describe('favorites', () => {
    it('thêm cửa hàng yêu thích (R1-028)', async () => {
      const res = await service.addFavoriteStore('u1', 'store-1');
      expect(res.storeId).toBe('store-1');
      expect(favoriteRepo.save).toHaveBeenCalled();
    });

    it('báo lỗi nếu vượt quá 50 cửa hàng yêu thích (R1-028)', async () => {
      favoriteRepo.count.mockResolvedValueOnce(50);
      await expect(service.addFavoriteStore('u1', 'store-new')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('promotion wallet', () => {
    it('thu thập mã ưu đãi vào ví thành công (R1-079)', async () => {
      promotionRepo.findOne.mockResolvedValueOnce({
        id: 'promo-1',
        status: PromotionStatus.ACTIVE,
      });
      walletRepo.findOne.mockResolvedValueOnce(null);

      const res = await service.claimPromotion('u1', 'promo-1');
      expect(res.promotionId).toBe('promo-1');
      expect(walletRepo.save).toHaveBeenCalled();
    });

    it('báo lỗi khi mã đã được thu thập (R1-079)', async () => {
      promotionRepo.findOne.mockResolvedValueOnce({
        id: 'promo-1',
        status: PromotionStatus.ACTIVE,
      });
      walletRepo.findOne.mockResolvedValueOnce({ customerId: 'u1', promotionId: 'promo-1' });

      await expect(service.claimPromotion('u1', 'promo-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('refund bank account (KX01)', () => {
    it('lấy thông tin tài khoản hoàn tiền của khách hàng', async () => {
      profileRepo.findOne.mockResolvedValueOnce({
        userId: 'u1',
        refundBankAccount: {
          bankBin: '970422',
          bankName: 'MB Bank',
          accountNumber: '0388123456',
          accountHolder: 'NGUYEN VAN A',
        },
      });

      const res = await service.getRefundBankAccount('u1');
      expect(res?.bankBin).toBe('970422');
      expect(res?.bankName).toBe('MB Bank');
      expect(res?.accountNumber).toBe('0388123456');
    });

    it('cập nhật tài khoản hoàn tiền thành công và viết hoa tên chủ thẻ', async () => {
      const mockProfile = {
        userId: 'u1',
        refundBankAccount: null,
      };
      profileRepo.findOne.mockResolvedValue(mockProfile);

      const res = await service.updateRefundBankAccount('u1', {
        bankBin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0071001234567',
        accountHolder: 'nguyen van a',
      });

      expect(res.bankBin).toBe('970436');
      expect(res.accountHolder).toBe('NGUYEN VAN A');
      expect(res.updatedAt).toBeDefined();
      expect(profileRepo.save).toHaveBeenCalled();
      // Lưu mã hóa, không lưu rõ số tài khoản; khách vẫn xem lại được đúng số của mình.
      expect(JSON.stringify(mockProfile.refundBankAccount)).not.toContain('0071001234567');
      expect(res.accountNumber).toBe('0071001234567');
    });
  });
});
