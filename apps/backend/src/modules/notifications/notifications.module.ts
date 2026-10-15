import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from '../../entities/notifications/notification.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { NotificationsService } from './notifications.service';
import { CustomerNotificationsController } from './customer-notifications.controller';
import { StoreNotificationsController } from './store-notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, CustomerProfileEntity, StoreMemberEntity]),
  ],
  controllers: [CustomerNotificationsController, StoreNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
