import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreLegalProfileEntity } from '../../entities/stores/store-legal-profile.entity';
import { StoreContractEntity } from '../../entities/stores/store-contract.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { StoreLegalService } from './store-legal.service';
import { AdminStoreContractsController, StoreLegalController } from './store-legal.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreLegalProfileEntity,
      StoreContractEntity,
      StoreMemberEntity,
      StoreEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [StoreLegalController, AdminStoreContractsController],
  providers: [StoreLegalService],
  exports: [StoreLegalService],
})
export class StoreLegalModule {}
