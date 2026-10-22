import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { CustomerOrdersController } from './customer-orders.controller';
import { StoreOrdersController } from './store-orders.controller';
import { OrderEntity } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { OrderLockEntity } from '../../entities/orders/order-lock.entity';
import { NoshowRecordEntity } from '../../entities/orders/noshow-record.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { ProxyPickupCodeEntity } from '../../entities/orders/proxy-pickup-code.entity';
import { PickupTokenEntity } from '../../entities/orders/pickup-token.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      OrderEntity,
      OfferEntity,
      OrderLockEntity,
      NoshowRecordEntity,
      StoreMemberEntity,
      ProxyPickupCodeEntity,
      PickupTokenEntity,
      PaymentTransactionEntity,
      ItemEntity,
      StoreEntity,
    ]),
    AuditModule,
  ],
  controllers: [CustomerOrdersController, StoreOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
