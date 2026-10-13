import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomerProfileService } from './customer-profile.service';
import { UserEntity } from '../../entities/auth/user.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { SavedPlaceEntity } from '../../entities/auth/saved-place.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { FcmTokenEntity } from '../../entities/auth/fcm-token.entity';

describe('CustomerProfileService', () => {
  let service: CustomerProfileService;
  let userRepo: any;
  let profileRepo: any;
  let savedPlaceRepo: any;
  let dietaryRepo: any;
  let noshowRepo: any;
  let orderLockRepo: any;
  let fcmTokenRepo: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    profileRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    savedPlaceRepo = {
      count: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'place-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'place-1', ...d })),
      remove: jest.fn().mockResolvedValue({}),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 'place-1',
            label: 'Nhà riêng',
            radius_km: '2.5',
            created_at: new Date(),
            latitude: '10.7769',
            longitude: '106.7009',
          },
        ]),
      }),
    };
    dietaryRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    };
    noshowRepo = {
      count: jest.fn().mockResolvedValue(2),
    };
    orderLockRepo = {
      findOne: jest.fn(),
    };
    fcmTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'fcm-1', ...d })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
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
      ],
    }).compile();

    service = module.get<CustomerProfileService>(CustomerProfileService);
  });

  describe('getProfile', () => {
    it('nên trả về hồ sơ kèm email/phone đã che và đếm số lần noshow 30 ngày (R1-005, R1-048)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'minhduc@gmail.com',
        phone: '0987654321',
        createdAt: new Date(),
      });
      profileRepo.findOne.mockResolvedValue({
        userId: 'user-1',
        fullName: 'Minh Đức',
        avatarUrl: 'https://avatar.com/1.jpg',
        searchRadiusKm: 3.0,
      });
      orderLockRepo.findOne.mockResolvedValue({
        customerId: 'user-1',
        lockedUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Khóa 5 ngày tới
      });

      const profile = await service.getProfile('user-1');
      expect(profile.userId).toBe('user-1');
      expect(profile.emailMasked).toBe('m***c@gmail.com');
      expect(profile.phoneMasked).toBe('098***321');
      expect(profile.noshowCount30d).toBe(2);
      expect(profile.isOrderLocked).toBe(true);
      expect(profile.lockedUntil).toBeDefined();
    });
  });

  describe('createSavedPlace', () => {
    it('nên tạo địa điểm quen thuộc thành công (R1-015)', async () => {
      savedPlaceRepo.count.mockResolvedValue(2);
      const result = await service.createSavedPlace('user-1', {
        label: 'Cơ quan',
        latitude: 10.78,
        longitude: 106.71,
        radiusKm: 2.0,
      });

      expect(result.id).toBe('place-1');
      expect(result.label).toBe('Cơ quan');
      expect(result.latitude).toBe(10.78);
    });

    it('nên chặn tạo khi khách đã đạt giới hạn 5 địa điểm quen thuộc (R1-015)', async () => {
      savedPlaceRepo.count.mockResolvedValue(5);
      await expect(
        service.createSavedPlace('user-1', {
          label: 'Địa điểm thứ 6',
          latitude: 10.78,
          longitude: 106.71,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dietaryProfile', () => {
    it('nên lưu và cập nhật danh sách dị ứng của khách hàng (R1-016)', async () => {
      dietaryRepo.findOne.mockResolvedValue(null);
      const updated = await service.updateDietaryProfile('user-1', {
        allergens: ['gluten', 'trứng'],
        excludedItems: ['hành lá'],
      });

      expect(updated.allergens).toEqual(['gluten', 'trứng']);
      expect(updated.excludedItems).toEqual(['hành lá']);
    });
  });

  describe('FCM Token (R1-004, R1-073)', () => {
    it('đăng ký FCM token mới cho thiết bị thành công', async () => {
      fcmTokenRepo.findOne.mockResolvedValue(null);
      const res = await service.registerFcmToken('user-1', {
        token: 'fcm_token_xyz_123',
        deviceId: 'device_iphone_15',
        enabled: true,
      });

      expect(res.success).toBe(true);
      expect(fcmTokenRepo.create).toHaveBeenCalled();
    });

    it('xóa FCM token khi đăng xuất', async () => {
      const res = await service.deleteFcmToken('user-1', 'device_iphone_15');
      expect(res.success).toBe(true);
      expect(fcmTokenRepo.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        deviceId: 'device_iphone_15',
      });
    });
  });
});
