import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { TrustpassHistoryEntity } from '../../entities/catalog/trustpass-history.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { AuditModule } from '../audit/audit.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ItemEntity, OfferEntity, TrustpassHistoryEntity, StoreMemberEntity]),
    AuditModule,
    SubscriptionsModule,
  ],
  controllers: [CatalogController],
  providers: [CatalogService, StorePermissionGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
