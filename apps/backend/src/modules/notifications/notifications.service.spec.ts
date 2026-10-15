import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import {
  NotificationEntity,
  NotificationType,
} from '../../entities/notifications/notification.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationRepo: any;
  let mockCustomerProfileRepo: any;

  beforeEach(async () => {
    mockNotificationRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'notif-1', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(2),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            { id: 'notif-1', title: 'Đơn hàng mới', isRead: false },
            { id: 'notif-2', title: 'Ưu đãi mới', isRead: true },
          ],
          2,
        ]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 2 }),
      }),
    };

    mockCustomerProfileRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: mockNotificationRepo,
        },
        {
          provide: getRepositoryToken(CustomerProfileEntity),
          useValue: mockCustomerProfileRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should create notification successfully', async () => {
    const result = await service.createNotification({
      userId: 'user-123',
      type: NotificationType.ORDER,
      title: 'Đơn hàng thành công',
      body: 'Bạn đã giữ thành công suất bánh mì',
    });

    expect(result).toBeDefined();
    expect(mockNotificationRepo.create).toHaveBeenCalled();
    expect(mockNotificationRepo.save).toHaveBeenCalled();
  });

  it('should list customer notifications with unread count', async () => {
    const res = await service.getCustomerNotifications('user-123', { page: 1, limit: 10 });
    expect(res.items.length).toBe(2);
    expect(res.unreadCount).toBe(2);
    expect(res.page).toBe(1);
  });

  it('should mark customer notification as read', async () => {
    mockNotificationRepo.findOne.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-123',
      isRead: false,
    });

    const updated = await service.markCustomerNotificationAsRead('user-123', 'notif-1');
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).toBeDefined();
  });

  it('should throw NotFoundException if customer notification not found', async () => {
    mockNotificationRepo.findOne.mockResolvedValue(null);

    await expect(
      service.markCustomerNotificationAsRead('user-123', 'notif-unknown'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should mark all customer notifications as read', async () => {
    const res = await service.markAllCustomerNotificationsAsRead('user-123');
    expect(res.success).toBe(true);
  });

  it('should list store notifications with unread count', async () => {
    const res = await service.getStoreNotifications('store-123', { page: 1, limit: 10 });
    expect(res.items.length).toBe(2);
    expect(res.unreadCount).toBe(2);
  });

  it('should mark store notification as read', async () => {
    mockNotificationRepo.findOne.mockResolvedValue({
      id: 'notif-1',
      storeId: 'store-123',
      isRead: false,
    });

    const updated = await service.markStoreNotificationAsRead('store-123', 'notif-1');
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).toBeDefined();
  });

  it('should mark all store notifications as read', async () => {
    const res = await service.markAllStoreNotificationsAsRead('store-123');
    expect(res.success).toBe(true);
  });

  it('should update customer notification preferences', async () => {
    mockCustomerProfileRepo.findOne.mockResolvedValue({
      userId: 'user-123',
      notificationPreferences: {
        transactionPush: true,
        promoPush: true,
        reminderPush: true,
      },
    });

    const res = await service.updateNotificationSettings('user-123', { promoPush: false });
    expect(res.promoPush).toBe(false);
    expect(res.transactionPush).toBe(true);
  });
});
