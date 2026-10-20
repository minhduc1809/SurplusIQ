import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueTimelineService } from './rescue-timeline.service';
import { RescueTimelineController } from './rescue-timeline.controller';
import { RescueRiskSnapshotEntity } from '../../entities/rescue-timeline/rescue-risk-snapshot.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RescueRiskSnapshotEntity,
      OfferEntity,
      ItemEntity,
      StoreMemberEntity,
    ]),
    AuditModule,
  ],
  controllers: [RescueTimelineController],
  providers: [RescueTimelineService],
  exports: [RescueTimelineService],
})
export class RescueTimelineModule {}
