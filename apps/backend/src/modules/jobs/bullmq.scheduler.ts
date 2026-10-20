import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job } from 'bullmq';
import { JobsService } from './jobs.service';
import { JOBS_CONSTANTS } from './jobs.constants';

@Injectable()
export class BullMqScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BullMqScheduler.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly jobsService: JobsService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const enableJobs = this.configService.get<string>('ENABLE_BACKGROUND_JOBS', 'true') === 'true';
    if (!enableJobs) {
      this.logger.log('Tác vụ nền BullMQ đã bị tắt bởi cấu hình ENABLE_BACKGROUND_JOBS=false.');
      return;
    }

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = Number(this.configService.get<number>('REDIS_PORT', 6379));

    try {
      const connection = {
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      };

      this.queue = new Queue(JOBS_CONSTANTS.QUEUES.BACKGROUND_JOBS, { connection });

      this.worker = new Worker(
        JOBS_CONSTANTS.QUEUES.BACKGROUND_JOBS,
        async (job: Job) => {
          this.logger.debug(`[BULLMQ_JOB_START] Thực thi tác vụ [${job.name}]...`);
          switch (job.name) {
            case JOBS_CONSTANTS.JOB_NAMES.RELEASE_HOLDS:
              return this.jobsService.releaseExpiredHolds();
            case JOBS_CONSTANTS.JOB_NAMES.PICKUP_EXPIRE:
              return this.jobsService.expireUnclaimedPickups();
            case JOBS_CONSTANTS.JOB_NAMES.OFFERS_AUTO_CLOSE:
              return this.jobsService.autoCloseExpiredOffers();
            case JOBS_CONSTANTS.JOB_NAMES.COMPLAINTS_AUTO_ACCEPT:
              return this.jobsService.autoAcceptExpiredComplaints();
            case JOBS_CONSTANTS.JOB_NAMES.STATEMENTS_CLOSE_WEEK:
              return this.jobsService.closeWeeklyStatements();
            case JOBS_CONSTANTS.JOB_NAMES.SUBSCRIPTION_LIFECYCLE:
              return this.jobsService.processSubscriptionLifecycles();
            case JOBS_CONSTANTS.JOB_NAMES.PAYMENTS_RECHECK:
              return this.jobsService.recheckPendingPayments();
            case JOBS_CONSTANTS.JOB_NAMES.FORECAST_DAILY:
              return this.jobsService.generateDailyForecasts();
            case JOBS_CONSTANTS.JOB_NAMES.PRICE_PROPOSALS:
              return this.jobsService.generateHourlyPriceProposals();
            case JOBS_CONSTANTS.JOB_NAMES.NOTIFY_PICKUP_REMINDER:
              return this.jobsService.sendPickupReminders();
            case JOBS_CONSTANTS.JOB_NAMES.RETENTION_CLEANUP:
              return this.jobsService.cleanupExpiredRetentionData();
            case JOBS_CONSTANTS.JOB_NAMES.ACCOUNT_ANONYMIZE:
              return this.jobsService.anonymizePendingDeleteAccounts();
            case JOBS_CONSTANTS.JOB_NAMES.RESCUE_TIMELINE_RECALC:
              return this.jobsService.recalculateRescueTimelines();
            case JOBS_CONSTANTS.JOB_NAMES.RESCUE_POOL_DEADLINES:
              return this.jobsService.processRescuePoolDeadlines();
            case JOBS_CONSTANTS.JOB_NAMES.RESCUE_BRIDGE_DEADLINES:
              return this.jobsService.processRescueBridgeDeadlines();
            default:
              return this.jobsService.processAllBackgroundJobs();
          }
        },
        { connection },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(`[BULLMQ_JOB_FAILED] Tác vụ [${job?.name}] thất bại: ${err.message}`);
      });

      // 1 phút: Nhả suất, quá hạn nhận, tự đóng suất, gửi nhắc nhở
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.RELEASE_HOLDS,
        {},
        { repeat: { every: 60 * 1000 } },
      );
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.PICKUP_EXPIRE,
        {},
        { repeat: { every: 60 * 1000 } },
      );
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.OFFERS_AUTO_CLOSE,
        {},
        { repeat: { every: 60 * 1000 } },
      );
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.NOTIFY_PICKUP_REMINDER,
        {},
        { repeat: { every: 60 * 1000 } },
      );
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.RESCUE_POOL_DEADLINES,
        {},
        { repeat: { every: 60 * 1000 } },
      );
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.RESCUE_BRIDGE_DEADLINES,
        {},
        { repeat: { every: 60 * 1000 } },
      );

      // 5 phút: Tự chấp nhận khiếu nại quá hạn
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.COMPLAINTS_AUTO_ACCEPT,
        {},
        { repeat: { every: 5 * 60 * 1000 } },
      );

      // 5 phút: Tính lại Rescue Timeline (CM-B01)
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.RESCUE_TIMELINE_RECALC,
        {},
        { repeat: { every: 5 * 60 * 1000 } },
      );

      // 15 phút: Đề xuất giá động, recheck thanh toán
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.PRICE_PROPOSALS,
        {},
        { repeat: { every: 15 * 60 * 1000 } },
      );
      await this.queue.add(
        JOBS_CONSTANTS.JOB_NAMES.PAYMENTS_RECHECK,
        {},
        { repeat: { every: 15 * 60 * 1000 } },
      );

      this.logger.log(`[BULLMQ] Đã kết nối Redis (${redisHost}:${redisPort}) và khởi chạy worker.`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `[BULLMQ_FALLBACK] Không thể kết nối Redis (${redisHost}:${redisPort}): ${errorMessage}. Chuyển sang In-Memory Fallback Interval.`,
      );
      this.startFallbackTimer();
    }
  }

  private startFallbackTimer() {
    // Chạy định kỳ mỗi 60 giây khi không có Redis
    this.fallbackTimer = setInterval(async () => {
      try {
        await this.jobsService.processAllBackgroundJobs();
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        this.logger.error(`[FALLBACK_INTERVAL_ERROR] Lỗi thực thi tác vụ nền: ${errorMessage}`);
      }
    }, 60 * 1000);
    if (this.fallbackTimer.unref) {
      this.fallbackTimer.unref(); // Không block event loop khi exit
    }
  }

  async onModuleDestroy() {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
  }
}
