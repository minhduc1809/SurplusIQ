import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoresService } from './stores.service';
import { StoreStaffService } from './store-staff.service';
import { StoreOperationsController } from './store-operations.controller';
import { StoreStaffController } from './store-staff.controller';
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
import { UserEntity } from '../../entities/auth/user.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

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
      ComplaintEntity,
      ReviewEntity,
      WeeklyStatementEntity,
      UserEntity,
    ]),
    SubscriptionsModule,
  ],
  controllers: [StoreOperationsController, StoreStaffController],
  providers: [StoresService, StoreStaffService],
  exports: [StoresService, StoreStaffService],
})
export class StoresModule {}
