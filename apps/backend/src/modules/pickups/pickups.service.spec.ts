import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PickupsService } from './pickups.service';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { PickupTokenEntity, PickupTokenStatus } from '../../entities/orders/pickup-token.entity';
import {
  ProxyPickupCodeEntity,
  ProxyPickupCodeStatus,
} from '../../entities/orders/proxy-pickup-code.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { RewardsService } from '../rewards/rewards.service';
import { QrTokenEngine } from '@surplusiq/core';

describe('PickupsService', () => {
  let service: PickupsService;
  let orderRepo: jest.Mocked<Repository<OrderEntity>>;
  let pickupTokenRepo: jest.Mocked<Repository<PickupTokenEntity>>;
  let proxyCodeRepo: jest.Mocked<Repository<ProxyPickupCodeEntity>>;
  let offerRepo: jest.Mocked<Repository<OfferEntity>>;
  let itemRepo: jest.Mocked<Repository<ItemEntity>>;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockCustomerId = 'cust-111-uuid';
  const mockStoreId = 'store-222-uuid';
  const mockOrderId = 'order-333-uuid';
  const mockOfferId = 'offer-444-uuid';
  const mockItemId = 'item-555-uuid';
  const mockTokenId = 'token-666-uuid';
  const jwtSecret = 'surplusiq_super_secret_jwt_key_2026';

  const baseOrder: Partial<OrderEntity> = {
    id: mockOrderId,
    code: 'SQ261013ABCD',
    customerId: mockCustomerId,
    storeId: mockStoreId,
    offerId: mockOfferId,
    quantity: 2,
    unitPrice: 25000,
    totalAmount: 50000,
    status: OrderStatus.PAID,
    paidAt: new Date(),
    pickupSlot: null,
  };

  beforeEach(async () => {
    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    pickupTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: mockTokenId, ...dto }) as any),
      save: jest.fn((entity) => Promise.resolve({ id: mockTokenId, ...entity } as any)),
      update: jest.fn(),
    } as any;

    proxyCodeRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    offerRepo = {
      findOne: jest.fn(),
    } as any;

    itemRepo = {
      findOne: jest.fn(),
    } as any;

    userRepo = {
      findOne: jest.fn(),
    } as any;

    auditLogService = {
      log: jest.fn().mockResolvedValue({} as any),
      getStoreAuditLogs: jest.fn(),
    } as any;

    dataSource = {
      transaction: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickupsService,
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: orderRepo,
        },
        {
          provide: getRepositoryToken(PickupTokenEntity),
          useValue: pickupTokenRepo,
        },
        {
          provide: getRepositoryToken(ProxyPickupCodeEntity),
          useValue: proxyCodeRepo,
        },
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: offerRepo,
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: itemRepo,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: userRepo,
        },
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
        {
          provide: RewardsService,
          useValue: { awardForOrder: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<PickupsService>(PickupsService);
  });

  describe('verifyPickup (R1-058, R2-052, BR-022, BR-069)', () => {
    it('quét QR token hợp lệ tại quầy: chuyển PICKED_UP, token chuyển USED, trả thông tin đối chiếu', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 3600 * 1000);

      // Ký QR token chuẩn HMAC không chứa PII (BR-022)
      const validToken = QrTokenEngine.sign(
        {
          jti: mockTokenId,
          orderId: mockOrderId,
          storeId: mockStoreId,
          exp: expiresAt.getTime(),
        },
        jwtSecret,
      );

      const mockOrder = { ...baseOrder };
      const mockOffer = { id: mockOfferId, itemId: mockItemId, pickupEnd: expiresAt };
      const mockItem = { id: mockItemId, name: 'Bánh Mì Pate Đặc Biệt' };
      const mockUser = { id: mockCustomerId, phone: '0912345678' };
      const mockTokenEntity = { id: mockTokenId, status: PickupTokenStatus.UNUSED };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockOrder),
        }),
        findOne: jest.fn().mockImplementation((cls) => {
          if (cls === OfferEntity) return Promise.resolve(mockOffer);
          if (cls === ItemEntity) return Promise.resolve(mockItem);
          if (cls === UserEntity) return Promise.resolve(mockUser);
          if (cls === PickupTokenEntity) return Promise.resolve(mockTokenEntity);
          return Promise.resolve(null);
        }),
        save: jest.fn((entity) => Promise.resolve(entity)),
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      const result = await service.verifyPickup(mockStoreId, 'staff-user-id', {
        token: validToken,
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(mockOrderId);
      expect(result.status).toBe(OrderStatus.PICKED_UP);
      expect(result.itemName).toBe('Bánh Mì Pate Đặc Biệt');
      expect(result.quantity).toBe(2);
      expect(result.customerMasked).toBe('091****678');
      expect(mockTokenEntity.status).toBe(PickupTokenStatus.USED);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ORDER_PICKUP_VERIFIED' }),
      );
    });

    it('xác nhận thành công bằng mã PIN dự phòng 6 ký tự (BR-022, R2-052)', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 2 * 3600 * 1000);
      const backupPin = '2H7K9P';

      pickupTokenRepo.findOne.mockResolvedValueOnce({
        id: mockTokenId,
        orderId: mockOrderId,
        backupCode: backupPin,
        status: PickupTokenStatus.UNUSED,
        expiresAt,
      } as PickupTokenEntity);

      const mockOrder = { ...baseOrder };
      const mockOffer = { id: mockOfferId, itemId: mockItemId, pickupEnd: expiresAt };
      const mockItem = { id: mockItemId, name: 'Cơm Tấm Sườn Bì' };
      const mockUser = { id: mockCustomerId, phone: '0987654321' };
      const mockTokenEntity = { id: mockTokenId, status: PickupTokenStatus.UNUSED };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockOrder),
        }),
        findOne: jest.fn().mockImplementation((cls) => {
          if (cls === OfferEntity) return Promise.resolve(mockOffer);
          if (cls === ItemEntity) return Promise.resolve(mockItem);
          if (cls === UserEntity) return Promise.resolve(mockUser);
          if (cls === PickupTokenEntity) return Promise.resolve(mockTokenEntity);
          return Promise.resolve(null);
        }),
        save: jest.fn((entity) => Promise.resolve(entity)),
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      const result = await service.verifyPickup(mockStoreId, 'staff-user-id', {
        backupCode: '2h7k9p', // Kiểm tra chuẩn hóa viết thường -> hoa
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe(mockOrderId);
      expect(result.status).toBe(OrderStatus.PICKED_UP);
      expect(result.itemName).toBe('Cơm Tấm Sườn Bì');
    });

    it('từ chối nếu không cung cấp cả token lẫn mã PIN', async () => {
      await expect(service.verifyPickup(mockStoreId, 'staff-id', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('từ chối nếu mã QR thuộc cửa hàng khác (BR-069)', async () => {
      const expiresAt = new Date(Date.now() + 2 * 3600 * 1000);
      const foreignToken = QrTokenEngine.sign(
        {
          jti: mockTokenId,
          orderId: mockOrderId,
          storeId: 'different-store-uuid',
          exp: expiresAt.getTime(),
        },
        jwtSecret,
      );

      await expect(
        service.verifyPickup(mockStoreId, 'staff-id', { token: foreignToken }),
      ).rejects.toThrow(/thuộc về một cửa hàng khác/);
    });

    it('từ chối nếu đơn hàng đã được nhận trước đó (tránh nhận lặp)', async () => {
      const expiresAt = new Date(Date.now() + 2 * 3600 * 1000);
      const validToken = QrTokenEngine.sign(
        {
          jti: mockTokenId,
          orderId: mockOrderId,
          storeId: mockStoreId,
          exp: expiresAt.getTime(),
        },
        jwtSecret,
      );

      const alreadyPickedUpOrder = { ...baseOrder, status: OrderStatus.PICKED_UP };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(alreadyPickedUpOrder),
        }),
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      await expect(
        service.verifyPickup(mockStoreId, 'staff-id', { token: validToken }),
      ).rejects.toThrow(/đã được xác nhận nhận hàng tại quầy trước đó/);
    });

    it('từ chối nếu đã quá khung giờ nhận + 15 phút trễ (BR-069)', async () => {
      const expiresAt = new Date(Date.now() + 2 * 3600 * 1000);
      const validToken = QrTokenEngine.sign(
        {
          jti: mockTokenId,
          orderId: mockOrderId,
          storeId: mockStoreId,
          exp: expiresAt.getTime(),
        },
        jwtSecret,
      );

      const mockOrder = { ...baseOrder };
      // Khung nhận đã kết thúc cách đây 20 phút (> 15m grace)
      const mockExpiredOffer = {
        id: mockOfferId,
        pickupEnd: new Date(Date.now() - 20 * 60 * 1000),
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockOrder),
        }),
        findOne: jest.fn().mockResolvedValue(mockExpiredOffer),
      };

      dataSource.transaction.mockImplementationOnce((cb: any) => cb(mockManager));

      await expect(
        service.verifyPickup(mockStoreId, 'staff-id', { token: validToken }),
      ).rejects.toThrow(/Đã quá thời gian nhận hàng cho phép \(\+ 15 phút trễ\)/);
    });
  });

  describe('getPickupPass (R1-057, BR-022)', () => {
    it('khách hàng lấy vé nhận hàng thành công khi đơn đã PAID: trả token QR và PIN 6 số', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ ...baseOrder } as OrderEntity);
      pickupTokenRepo.findOne.mockResolvedValueOnce({
        id: mockTokenId,
        orderId: mockOrderId,
        backupCode: '4M9K2P',
        expiresAt: new Date(Date.now() + 2 * 3600 * 1000),
        status: PickupTokenStatus.UNUSED,
      } as PickupTokenEntity);
      offerRepo.findOne.mockResolvedValueOnce({
        id: mockOfferId,
        itemId: mockItemId,
      } as OfferEntity);
      itemRepo.findOne.mockResolvedValueOnce({
        id: mockItemId,
        name: 'Bánh Bao Xá Xíu',
      } as ItemEntity);

      const result = await service.getPickupPass(mockCustomerId, mockOrderId);

      expect(result.orderId).toBe(mockOrderId);
      expect(result.pickupToken).toBeDefined();
      expect(result.backupCode).toBe('4M9K2P');
      expect(result.itemName).toBe('Bánh Bao Xá Xíu');

      // Xác thực token trả ra hợp lệ
      const verify = QrTokenEngine.verify(result.pickupToken, jwtSecret, new Date());
      expect(verify.isValid).toBe(true);
      expect(verify.payload?.orderId).toBe(mockOrderId);
    });

    it('từ chối xem vé nhận hàng nếu đơn chưa ở trạng thái PAID (BR-022)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({
        ...baseOrder,
        status: OrderStatus.PENDING_PAYMENT,
      } as OrderEntity);

      await expect(service.getPickupPass(mockCustomerId, mockOrderId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('báo lỗi NotFoundException nếu đơn hàng không tồn tại', async () => {
      orderRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.getPickupPass(mockCustomerId, 'nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('verifyProxyPickup (R1-052)', () => {
    it('xác thực mã nhận hộ hợp lệ: đơn chuyển PICKED_UP và mã chuyển USED', async () => {
      const mockOrder = { ...baseOrder };
      const mockProxy = {
        id: 'proxy-1',
        orderId: mockOrderId,
        code: 'A2B3C4D5',
        status: ProxyPickupCodeStatus.UNUSED,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };

      const mockManager = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(mockOrder),
        }),
        findOne: jest.fn().mockImplementation((entity: any) => {
          if (entity === UserEntity)
            return Promise.resolve({ id: mockCustomerId, phone: '0988776655' });
          if (entity === ItemEntity)
            return Promise.resolve({ id: mockItemId, name: 'Cơm Gà Xối Mỡ' });
          return null;
        }),
        save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      dataSource.transaction.mockImplementation(async (cb: any) => cb(mockManager));
      proxyCodeRepo.findOne.mockResolvedValue(mockProxy as any);
      orderRepo.findOne.mockResolvedValue(mockOrder as any);

      const result = await service.verifyProxyPickup(mockStoreId, 'staff-1', {
        code: 'A2B3C4D5',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(OrderStatus.PICKED_UP);
      expect(result.customerMasked).toContain('(Nhận hộ)');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'PICKUP_VERIFIED_VIA_PROXY_CODE',
        }),
      );
    });

    it('từ chối nếu mã nhận hộ không tồn tại hoặc đã sử dụng', async () => {
      proxyCodeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyProxyPickup(mockStoreId, 'staff-1', { code: 'INVALID' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
