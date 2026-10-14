import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerInteractionsService } from './customer-interactions.service';
import { CustomerInteractionsController } from './customer-interactions.controller';
import { StoreInteractionsController } from './store-interactions.controller';
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { ComplaintAttachmentEntity } from '../../entities/complaints/complaint-attachment.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { ViolationReportEntity } from '../../entities/complaints/violation-report.entity';
import { SupportTicketEntity } from '../../entities/complaints/support-ticket.entity';
import { SupportMessageEntity } from '../../entities/complaints/support-message.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplaintEntity,
      ComplaintAttachmentEntity,
      ReviewEntity,
      OrderEntity,
      OfferEntity,
      ItemEntity,
      StoreEntity,
      ViolationReportEntity,
      SupportTicketEntity,
      SupportMessageEntity,
      PaymentTransactionEntity,
    ]),
  ],
  controllers: [CustomerInteractionsController, StoreInteractionsController],
  providers: [CustomerInteractionsService],
  exports: [CustomerInteractionsService],
})
export class CustomerInteractionsModule {}
