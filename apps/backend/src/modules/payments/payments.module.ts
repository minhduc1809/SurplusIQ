import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { CustomerPaymentsController } from './customer-payments.controller';
import { OrdersPaymentsController } from './orders-payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { PickupTokenEntity } from '../../entities/orders/pickup-token.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentTransactionEntity,
      OrderEntity,
      PickupTokenEntity,
      OfferEntity,
    ]),
    AuditModule,
  ],
  controllers: [CustomerPaymentsController, OrdersPaymentsController, PaymentsWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
