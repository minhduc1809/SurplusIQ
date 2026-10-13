import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';
import { IdempotencyKeyEntity } from '../../entities/orders/idempotency-key.entity';
import { StoreMemberEntity } from '../../entities/stores/store-member.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';
import { StorePermissionGuard } from '../../common/guards/store-permission.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity, IdempotencyKeyEntity, StoreMemberEntity])],
  controllers: [AuditLogController],
  providers: [AuditLogService, IdempotencyInterceptor, StorePermissionGuard],
  exports: [AuditLogService, IdempotencyInterceptor, TypeOrmModule],
})
export class AuditModule {}
