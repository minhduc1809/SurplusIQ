import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { OrderGiftEntity } from '../../entities/order-support/order-gift.entity';
import { OrderMessageEntity } from '../../entities/order-support/order-message.entity';
import { PickupIncidentEntity } from '../../entities/order-support/pickup-incident.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  CustomerOrderSupportController,
  StoreOrderSupportController,
} from './order-support.controllers';
import { OrderSupportService } from './order-support.service';
import { OrderTransferService } from './order-transfer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OfferEntity,
      ItemEntity,
      StoreEntity,
      StoreMemberEntity,
      UserEntity,
      CustomerProfileEntity,
      PickupIncidentEntity,
      OrderMessageEntity,
      OrderGiftEntity,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [CustomerOrderSupportController, StoreOrderSupportController],
  providers: [OrderSupportService, OrderTransferService],
  exports: [OrderSupportService, OrderTransferService],
})
export class OrderSupportModule {}
