import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RescueBridgeTransferEntity } from '../../entities/rescue-bridge/rescue-bridge-transfer.entity';
import { RecipientOrganizationEntity } from '../../entities/rescue-bridge/recipient-organization.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { SettingsModule } from '../settings/settings.module';
import { RescueBridgeService } from './rescue-bridge.service';
import { StoreRescueBridgeController } from './store-rescue-bridge.controller';
import { RecipientRescueBridgeController } from './recipient-rescue-bridge.controller';
import { AdminRescueBridgeController } from './admin-rescue-bridge.controller';

/** Rescue Bridge (CM-B03): cửa hàng ↔ đơn vị tiếp nhận, vận hành duyệt đơn vị và xử lý tranh chấp. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RescueBridgeTransferEntity,
      RecipientOrganizationEntity,
      StoreMemberEntity,
    ]),
    SettingsModule,
  ],
  controllers: [
    StoreRescueBridgeController,
    RecipientRescueBridgeController,
    AdminRescueBridgeController,
  ],
  providers: [RescueBridgeService],
  exports: [RescueBridgeService],
})
export class RescueBridgeModule {}
