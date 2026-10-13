import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './settings.constants';

const logger = new Logger('RedisProvider');

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn(
            'Không thể kết nối tới Redis sau 3 lần thử, ứng dụng sẽ fallback sang truy vấn Database trực tiếp.',
          );
          return null; // Stop retrying, fail gracefully
        }
        return Math.min(times * 200, 1000);
      },
    });

    client.on('error', (err) => {
      logger.warn(`Redis connection error: ${err.message}. Fallback active.`);
    });

    return client;
  },
};
