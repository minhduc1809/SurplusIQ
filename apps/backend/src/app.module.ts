import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { StoreEntity as LegacyStoreEntity } from './modules/stores/store.entity';
import { DecisionEntity } from './modules/decisions/decision.entity';
import { ALL_ENTITIES } from './entities';
import { SettingsModule } from './modules/settings/settings.module';
import { AuthModule } from './modules/auth/auth.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AuditModule } from './modules/audit/audit.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { OffersModule } from './modules/offers/offers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { PickupsModule } from './modules/pickups/pickups.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { CustomerProfileModule } from './modules/customer-profile/customer-profile.module';
import { CustomerInteractionsModule } from './modules/customer-interactions/customer-interactions.module';
import { StoresModule } from './modules/stores/stores.module';
import { StoreLegalModule } from './modules/store-legal/store-legal.module';
import { DecisionsModule } from './modules/decisions/decisions.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SeedModule } from './modules/seed/seed.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { RescueTimelineModule } from './modules/rescue-timeline/rescue-timeline.module';
import { RescuePoolModule } from './modules/rescue-pool/rescue-pool.module';
import { RescueBridgeModule } from './modules/rescue-bridge/rescue-bridge.module';
import { RescueLabModule } from './modules/rescue-lab/rescue-lab.module';
import { OrderSupportModule } from './modules/order-support/order-support.module';
import { UploadModule } from './modules/upload/upload.module';
import { RealtimeModule } from './modules/realtime/realtime.module';

@Module({
  imports: [
    RealtimeModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '../.env', '.env'],
      expandVariables: true,
    }),
    SettingsModule,
    AuthModule,
    SubscriptionsModule,
    AuditModule,
    CatalogModule,
    UploadsModule,
    OffersModule,
    OrdersModule,
    PaymentsModule,
    JobsModule,
    PickupsModule,
    DiscoveryModule,
    CustomerProfileModule,
    CustomerInteractionsModule,
    StoresModule,
    StoreLegalModule,
    DecisionsModule,
    MarketingModule,
    AiModule,
    NotificationsModule,
    SeedModule,
    PlatformAdminModule,
    RewardsModule,
    RescueTimelineModule,
    RescuePoolModule,
    RescueBridgeModule,
    RescueLabModule,
    OrderSupportModule,
    UploadModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5432),
        username: config.get<string>('POSTGRES_USER', 'surplus_admin'),
        password: config.get<string>('POSTGRES_PASSWORD', 'surplus_secret_pass'),
        database: config.get<string>('POSTGRES_DB', 'surplusiq_db'),
        entities: [...ALL_ENTITIES, LegacyStoreEntity, DecisionEntity],
        synchronize: false, // Turn off auto-sync, enforce migrations per DoD TASK-M0-03
        migrations: [__dirname + '/migrations/*-*{.ts,.js}'],
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true',
        // Trước đây DB_POOL_MAX trong .env không được áp dụng (pool mặc định 10) và không có timeout nên
        // giao dịch kẹt giữ khóa làm treo cả API (BUG-001). Đặt kích thước pool và các timeout phía server.
        extra: {
          max: Number(config.get('DB_POOL_MAX', 20)),
          min: Number(config.get('DB_POOL_MIN', 2)),
          connectionTimeoutMillis: 10000,
          options:
            '-c lock_timeout=10000 -c idle_in_transaction_session_timeout=30000 -c statement_timeout=30000',
        },
      }),
    }),
    TypeOrmModule.forFeature([LegacyStoreEntity, DecisionEntity, ...ALL_ENTITIES]),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
