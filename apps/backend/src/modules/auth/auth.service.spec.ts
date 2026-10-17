import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import {
  UserEntity,
  UserRole,
  UserStatus,
  CustomerProfileEntity,
  StoreEntity,
  StoreStatus,
  StoreMemberEntity,
  StorePermission,
  StoreMemberStatus,
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
  StoreSettingsEntity,
  OtpCodeEntity,
  OtpPurpose,
  RefreshTokenEntity,
  TrustedDeviceEntity,
  ConsentEntity,
} from '../../entities';
import { CryptoUtil } from './crypto.util';
import { AUTH_CONSTANTS, AUTH_ERRORS } from './auth.constants';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockCustomerProfileRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockStoreRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockStoreMemberRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockSubscriptionRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockStoreSettingsRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockOtpRepo: {
    findOne: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockRefreshTokenRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let mockTrustedDeviceRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let mockConsentRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let mockJwtService: {
    sign: jest.Mock;
  };
  let mockDataSource: {
    transaction: jest.Mock;
  };

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'user-uuid-1' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'user-uuid-1' })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockCustomerProfileRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockStoreRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'store-uuid-1' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, id: entity.id || 'store-uuid-1' })),
    };

    mockStoreMemberRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'member-uuid-1' })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockSubscriptionRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockStoreSettingsRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockOtpRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'otp-uuid-1' })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockRefreshTokenRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, id: 'token-uuid-1' })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockTrustedDeviceRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockConsentRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mocked.jwt.access.token'),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => {
        const manager = {
          findOne: (entityClass: unknown, options: unknown) => {
            if (entityClass === UserEntity) return mockUserRepo.findOne(options);
            if (entityClass === StoreEntity) return mockStoreRepo.findOne(options);
            if (entityClass === SubscriptionEntity) return mockSubscriptionRepo.findOne(options);
            return Promise.resolve(null);
          },
          create: (entityClass: unknown, dto: unknown) => {
            if (entityClass === UserEntity) return mockUserRepo.create(dto);
            if (entityClass === StoreEntity) return mockStoreRepo.create(dto);
            if (entityClass === StoreMemberEntity) return mockStoreMemberRepo.create(dto);
            if (entityClass === SubscriptionEntity) return mockSubscriptionRepo.create(dto);
            if (entityClass === StoreSettingsEntity) return mockStoreSettingsRepo.create(dto);
            if (entityClass === CustomerProfileEntity) return mockCustomerProfileRepo.create(dto);
            if (entityClass === ConsentEntity) return mockConsentRepo.create(dto);
            if (entityClass === OtpCodeEntity) return mockOtpRepo.create(dto);
            return dto;
          },
          save: (entity: unknown) => Promise.resolve(entity),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(CustomerProfileEntity),
          useValue: mockCustomerProfileRepo,
        },
        {
          provide: getRepositoryToken(StoreEntity),
          useValue: mockStoreRepo,
        },
        {
          provide: getRepositoryToken(StoreMemberEntity),
          useValue: mockStoreMemberRepo,
        },
        {
          provide: getRepositoryToken(SubscriptionEntity),
          useValue: mockSubscriptionRepo,
        },
        {
          provide: getRepositoryToken(StoreSettingsEntity),
          useValue: mockStoreSettingsRepo,
        },
        {
          provide: getRepositoryToken(OtpCodeEntity),
          useValue: mockOtpRepo,
        },
        {
          provide: getRepositoryToken(RefreshTokenEntity),
          useValue: mockRefreshTokenRepo,
        },
        {
          provide: getRepositoryToken(TrustedDeviceEntity),
          useValue: mockTrustedDeviceRepo,
        },
        {
          provide: getRepositoryToken(ConsentEntity),
          useValue: mockConsentRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('Customer Registration (R1-001)', () => {
    it('should register customer, profile and dispatch OTP', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.registerCustomer({
        phone: '0901234567',
        fullName: 'Nguyễn Văn A',
        password: 'Password123@',
        deviceId: 'device-test-1',
      });

      expect(result.userId).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should throw ConflictException if phone/email already registered', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.registerCustomer({
          phone: '0901234567',
          fullName: 'Nguyễn Văn A',
          password: 'Password123@',
          deviceId: 'device-test-1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should block registration when device already registered 5 times in 1 hour', async () => {
      mockOtpRepo.count.mockResolvedValue(5);
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.registerCustomer({
          phone: '0901234567',
          fullName: 'Nguyễn Văn A',
          password: 'Password123@',
          deviceId: 'device-test-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('OTP Verification & Rate Limiting (BR-002)', () => {
    it('should verify OTP and activate user status', async () => {
      const code = '123456';
      mockOtpRepo.findOne.mockResolvedValue({
        id: 'otp-1',
        target: '0901234567',
        purpose: OtpPurpose.VERIFY,
        codeHash: CryptoUtil.sha256(code),
        expiresAt: new Date(Date.now() + 300000),
        wrongCount: 0,
        usedAt: null,
      });

      const result = await service.verifyOtp({
        target: '0901234567',
        code,
        purpose: OtpPurpose.VERIFY,
      });

      expect(result.success).toBe(true);
      expect(mockOtpRepo.save).toHaveBeenCalled();
      expect(mockUserRepo.update).toHaveBeenCalled();
    });

    it('should reject expired OTP', async () => {
      mockOtpRepo.findOne.mockResolvedValue({
        id: 'otp-1',
        codeHash: CryptoUtil.sha256('123456'),
        expiresAt: new Date(Date.now() - 1000), // Expired
        wrongCount: 0,
        usedAt: null,
      });

      await expect(
        service.verifyOtp({
          target: '0901234567',
          code: '123456',
          purpose: OtpPurpose.VERIFY,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject and increment wrongCount on incorrect code', async () => {
      const otpEntity = {
        id: 'otp-1',
        codeHash: CryptoUtil.sha256('654321'),
        expiresAt: new Date(Date.now() + 300000),
        wrongCount: 1,
        usedAt: null,
      };
      mockOtpRepo.findOne.mockResolvedValue(otpEntity);

      await expect(
        service.verifyOtp({
          target: '0901234567',
          code: '111111',
          purpose: OtpPurpose.VERIFY,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(otpEntity.wrongCount).toBe(2);
      expect(mockOtpRepo.save).toHaveBeenCalledWith(otpEntity);
    });

    it('should enforce 3 resends per hour limit (BR-002)', async () => {
      mockOtpRepo.count.mockResolvedValue(3); // Already 3 in 1 hour

      await expect(
        service.resendOtp({
          target: '0901234567',
          purpose: OtpPurpose.VERIFY,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Channel Separation & Customer Login (9.1, BR-002)', () => {
    it('should reject STORE_USER from logging in via Customer App (9.1)', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-store',
        role: UserRole.STORE_USER,
        status: UserStatus.ACTIVE,
        passwordHash: CryptoUtil.hashPassword('Pass123@'),
      });

      await expect(
        service.loginCustomer({
          identifier: '0901234567',
          password: 'Pass123@',
          deviceId: 'device-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should lock customer account for 15 minutes after 5 failed login attempts', async () => {
      const user = {
        id: 'user-cust',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        failedLoginCount: 4,
        lockedUntil: null,
        passwordHash: CryptoUtil.hashPassword('CorrectPass@'),
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.loginCustomer({
          identifier: '0901234567',
          password: 'WrongPassword!',
          deviceId: 'device-1',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(user.failedLoginCount).toBe(5);
      expect(user.lockedUntil).toBeDefined();
    });

    it('should require 2FA OTP if 2FA enabled and device is not trusted (R1-013)', async () => {
      const user = {
        id: 'user-cust',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        phone: '0901234567',
        failedLoginCount: 0,
        twoFactorEnabled: true,
        passwordHash: CryptoUtil.hashPassword('CorrectPass@'),
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockTrustedDeviceRepo.findOne.mockResolvedValue(null); // Not trusted

      const result = await service.loginCustomer({
        identifier: '0901234567',
        password: 'CorrectPass@',
        deviceId: 'untrusted-device',
      });

      if ('twoFactorRequired' in result) {
        expect(result.twoFactorRequired).toBe(true);
      } else {
        throw new Error('Expected 2FA challenge response');
      }
      expect(mockOtpRepo.save).toHaveBeenCalled();
    });

    it('should issue tokens on valid customer login', async () => {
      const user = {
        id: 'user-cust',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        phone: '0901234567',
        failedLoginCount: 0,
        twoFactorEnabled: false,
        passwordHash: CryptoUtil.hashPassword('CorrectPass@'),
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.loginCustomer({
        identifier: '0901234567',
        password: 'CorrectPass@',
        deviceId: 'device-1',
      });

      if ('accessToken' in result) {
        expect(result.accessToken).toBe('mocked.jwt.access.token');
        expect(result.refreshToken).toBeDefined();
      } else {
        throw new Error('Expected tokens response');
      }
      expect(mockRefreshTokenRepo.save).toHaveBeenCalled();
    });
  });

  describe('Store Registration & 30-Day Pro Trial (VC-01, R2-001)', () => {
    it('should register store with Basic subscription and pending verify', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.registerStore({
        email: 'tiembanh@example.com',
        password: 'Password123@',
        storeName: 'Tiệm Bánh ABC',
        storeAddress: '123 Nguyễn Huệ',
        storePhone: '02838123456',
      });

      expect(result.storeId).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should activate 30-day Pro Trial when store email is verified (VC-01)', async () => {
      const user = { id: 'user-store', email: 'tiembanh@example.com' };
      const store = {
        id: 'store-1',
        ownerUserId: user.id,
        status: StoreStatus.PENDING_VERIFY,
        trialUsed: false,
      };
      const subscription = {
        storeId: store.id,
        plan: SubscriptionPlan.BASIC,
        trialUsed: false,
        periodStart: new Date(),
        periodEnd: new Date(),
      };

      mockOtpRepo.findOne.mockResolvedValue({
        id: 'otp-1',
        target: 'tiembanh@example.com',
        purpose: OtpPurpose.VERIFY,
        codeHash: CryptoUtil.sha256('123456'),
        expiresAt: new Date(Date.now() + 300000),
        wrongCount: 0,
        usedAt: null,
      });

      mockUserRepo.findOne.mockResolvedValue(user);
      mockStoreRepo.findOne.mockResolvedValue(store);
      mockSubscriptionRepo.findOne.mockResolvedValue(subscription);

      const result = await service.verifyStoreEmail({
        target: 'tiembanh@example.com',
        code: '123456',
        purpose: OtpPurpose.VERIFY,
      });

      expect(result.success).toBe(true);
      expect(subscription.plan).toBe(SubscriptionPlan.TRIAL);
      expect(subscription.trialUsed).toBe(true);
    });
  });

  describe('Store Login & Channel Separation (9.1)', () => {
    it('should reject CUSTOMER from logging into Store Portal (9.1)', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-cust',
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        passwordHash: CryptoUtil.hashPassword('Pass123@'),
      });

      await expect(
        service.loginStore({
          email: 'cust@example.com',
          password: 'Pass123@',
          deviceId: 'device-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should login store and return storeId & role permission', async () => {
      const user = {
        id: 'user-store',
        email: 'tiembanh@example.com',
        role: UserRole.STORE_USER,
        status: UserStatus.ACTIVE,
        failedLoginCount: 0,
        passwordHash: CryptoUtil.hashPassword('CorrectPass@'),
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockStoreMemberRepo.findOne.mockResolvedValue({
        storeId: 'store-1',
        permission: StorePermission.OWNER,
      });

      const result = await service.loginStore({
        email: 'tiembanh@example.com',
        password: 'CorrectPass@',
        deviceId: 'browser-device-1',
      });

      expect(result.accessToken).toBe('mocked.jwt.access.token');
      expect(result.user.storeId).toBe('store-1');
      expect(result.user.permission).toBe(StorePermission.OWNER);
    });
  });

  describe('Security: Password Change & Token Revocation (BR-003)', () => {
    it('should change password and revoke all active refresh tokens (BR-003)', async () => {
      const user = {
        id: 'user-1',
        passwordHash: CryptoUtil.hashPassword('OldPass123@'),
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.changePassword('user-1', {
        currentPassword: 'OldPass123@',
        newPassword: 'NewPass456@',
      });

      expect(result.success).toBe(true);
      expect(mockUserRepo.save).toHaveBeenCalled();
      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-1' },
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });
  });
});
