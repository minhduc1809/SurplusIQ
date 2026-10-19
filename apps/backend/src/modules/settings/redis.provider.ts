import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './settings.constants';

const logger = new Logger('RedisProvider');

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = Number(configService.get<number>('REDIS_PORT', 6379)) || 6379;
    const redisPassword = configService.get<string>('REDIS_PASSWORD') || undefined;
    const rawUrl = configService.get<string>('REDIS_URL');

    const commonOptions = {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      retryStrategy: (times: number) => {
        if (times > 3) {
          logger.warn(
            'Không thể kết nối tới Redis sau 3 lần thử, ứng dụng sẽ fallback sang truy vấn Database trực tiếp.',
          );
          return null; // Stop retrying, fail gracefully
        }
        return Math.min(times * 200, 1000);
      },
    };

    let client: Redis;
    // Kiểm tra tính hợp lệ của rawUrl trước khi truyền vào ioredis để tránh lỗi TypeError: Invalid URL
    if (
      rawUrl &&
      !rawUrl.includes('${') &&
      (rawUrl.startsWith('redis://') || rawUrl.startsWith('rediss://'))
    ) {
      try {
        new URL(rawUrl);
        client = new Redis(rawUrl, commonOptions);
      } catch {
        client = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          ...commonOptions,
        });
      }
    } else {
      client = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        ...commonOptions,
      });
    }

    client.on('error', (err) => {
      logger.warn(`Redis connection error: ${err.message}. Fallback active.`);
    });

    return client;
  },
};
