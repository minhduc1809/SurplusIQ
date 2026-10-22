import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoreStaffService } from './store-staff.service';
import { StoreOperationsController } from './store-operations.controller';
import { StoreEntity } from '../../entities/stores/store.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { StaffInviteEntity } from '../../entities/stores/staff-invite.entity';
import { StoreClosureEntity } from '../../entities/stores/store-closure.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { OrderEntity } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ComplaintEntity } from '../../entities/complaints/complaint.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { WeeklyStatementEntity } from '../../entities/reconciliation/weekly-statement.entity';
import { StatementLineEntity } from '../../entities/reconciliation/statement-line.entity';
import { CustomerNoteEntity } from '../../entities/stores/customer-note.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { FavoriteStoreEntity } from '../../entities/auth/favorite-store.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { PriceProposalEntity } from '../../entities/reconciliation/price-proposal.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreEntity,
      StoreMemberEntity,
      StaffInviteEntity,
      StoreClosureEntity,
      StoreSettingsEntity,
      OrderEntity,
      OfferEntity,
      ItemEntity,
      PriceProposalEntity,
      ComplaintEntity,
      ReviewEntity,
      WeeklyStatementEntity,
      StatementLineEntity,
      CustomerNoteEntity,
      CustomerProfileEntity,
      FavoriteStoreEntity,
      UserEntity,
    ]),
    SubscriptionsModule,
    AuditModule,
  ],
  controllers: [StoreOperationsController],
  providers: [StoresService, StoreStaffService],
  exports: [StoresService, StoreStaffService],
})
export class StoresModule {}
