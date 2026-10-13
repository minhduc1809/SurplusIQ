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
            default:
              return this.jobsService.processAllBackgroundJobs();
          }
        },
        { connection },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(`[BULLMQ_JOB_FAILED] Tác vụ [${job?.name}] thất bại: ${err.message}`);
      });

      // Đăng ký lặp lại mỗi 60 giây (1 phút)
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
