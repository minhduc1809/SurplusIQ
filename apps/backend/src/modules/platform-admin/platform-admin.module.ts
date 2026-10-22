import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AdminDirectoryController } from './admin-directory.controller';
import { AdminDirectoryService } from './admin-directory.service';
import { AdminOperationsController } from './admin-operations.controller';
import { AdminOperationsService } from './admin-operations.service';
import { AdminSnapshotController } from './admin-snapshot.controller';
import { AdminSnapshotService } from './admin-snapshot.service';

@Module({
  imports: [AuthModule, SettingsModule, SubscriptionsModule, PaymentsModule],
  controllers: [AdminDirectoryController, AdminOperationsController, AdminSnapshotController],
  providers: [AdminDirectoryService, AdminOperationsService, AdminSnapshotService],
})
export class PlatformAdminModule {}
