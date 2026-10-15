import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationEntity,
  NotificationType,
} from '../../entities/notifications/notification.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { QueryNotificationsDto, UpdateNotificationSettingsDto } from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly customerProfileRepo: Repository<CustomerProfileEntity>,
  ) {}

  async createNotification(params: {
    userId?: string;
    storeId?: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<NotificationEntity> {
    const notif = this.notificationRepo.create({
      userId: params.userId || null,
      storeId: params.storeId || null,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data || null,
      isRead: false,
    });
    return this.notificationRepo.save(notif);
  }

  async getCustomerNotifications(userId: string, query: QueryNotificationsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId });

    if (query.unreadOnly) {
      qb.andWhere('n.is_read = false');
    }
    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    qb.orderBy('n.created_at', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markCustomerNotificationAsRead(userId: string, notificationId: string) {
    const notif = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notif) {
      throw new NotFoundException('Thông báo không tồn tại');
    }
    notif.isRead = true;
    notif.readAt = new Date();
    return this.notificationRepo.save(notif);
  }

  async markAllCustomerNotificationsAsRead(userId: string) {
    await this.notificationRepo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true, readAt: new Date() })
      .where('user_id = :userId AND is_read = false', { userId })
      .execute();

    return { success: true, message: 'Đã đánh dấu đã đọc toàn bộ thông báo' };
  }

  async getStoreNotifications(storeId: string, query: QueryNotificationsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.store_id = :storeId', { storeId });

    if (query.unreadOnly) {
      qb.andWhere('n.is_read = false');
    }
    if (query.type) {
      qb.andWhere('n.type = :type', { type: query.type });
    }

    qb.orderBy('n.created_at', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const unreadCount = await this.notificationRepo.count({
      where: { storeId, isRead: false },
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markStoreNotificationAsRead(storeId: string, notificationId: string) {
    const notif = await this.notificationRepo.findOne({
      where: { id: notificationId, storeId },
    });
    if (!notif) {
      throw new NotFoundException('Thông báo không tồn tại');
    }
    notif.isRead = true;
    notif.readAt = new Date();
    return this.notificationRepo.save(notif);
  }

  async markAllStoreNotificationsAsRead(storeId: string) {
    await this.notificationRepo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true, readAt: new Date() })
      .where('store_id = :storeId AND is_read = false', { storeId })
      .execute();

    return { success: true, message: 'Đã đánh dấu đã đọc toàn bộ thông báo của cửa hàng' };
  }

  async updateNotificationSettings(userId: string, dto: UpdateNotificationSettingsDto) {
    let profile = await this.customerProfileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.customerProfileRepo.create({
        userId,
        fullName: 'Khách hàng',
        searchRadiusKm: 5.0,
        notificationPreferences: {
          transactionPush: dto.transactionPush ?? true,
          promoPush: dto.promoPush ?? true,
          reminderPush: dto.reminderPush ?? true,
        },
      });
    } else {
      profile.notificationPreferences = {
        ...(profile.notificationPreferences || {}),
        ...(dto.transactionPush !== undefined && { transactionPush: dto.transactionPush }),
        ...(dto.promoPush !== undefined && { promoPush: dto.promoPush }),
        ...(dto.reminderPush !== undefined && { reminderPush: dto.reminderPush }),
      };
    }
    await this.customerProfileRepo.save(profile);
    return profile.notificationPreferences;
  }
}
