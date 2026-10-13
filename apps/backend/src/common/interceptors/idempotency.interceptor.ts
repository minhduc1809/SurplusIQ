import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as crypto from 'crypto';
import { IDEMPOTENT_METADATA_KEY, IdempotentOptions } from '../decorators/idempotent.decorator';
import { IdempotencyKeyEntity } from '../../entities/orders/idempotency-key.entity';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(IdempotencyKeyEntity)
    private readonly idempotencyRepo: Repository<IdempotencyKeyEntity>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const options = this.reflector.getAllAndOverride<IdempotentOptions>(IDEMPOTENT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const rawKey =
      req.headers['idempotency-key'] ||
      req.headers['Idempotency-Key'] ||
      req.headers['x-idempotency-key'];

    const idempotencyKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;

    // Nếu route yêu cầu bắt buộc header Idempotency-Key (BR-015) mà client không truyền
    if (options?.required && !idempotencyKey) {
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Yêu cầu cung cấp header [Idempotency-Key] cho thao tác giao dịch này (BR-015)',
      });
    }

    // Nếu không có header Idempotency-Key và route không bắt buộc -> cho qua bình thường
    if (!idempotencyKey) {
      return next.handle();
    }

    const scope = options?.scope || req.route?.path || req.path || 'default';
    const userId = req.user?.userId || 'anonymous';
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body || {}))
      .digest('hex');

    // 1. Kiểm tra khóa đã tồn tại trong CSDL chưa
    const existing = await this.idempotencyRepo.findOne({
      where: {
        scope,
        userId,
        key: idempotencyKey,
      },
    });

    if (existing) {
      // 1.1 Khóa đã dùng nhưng payload request khác nhau -> Báo lỗi 422 IDEMPOTENCY_KEY_REUSED (BR-015, mục 5.5)
      if (existing.requestHash !== requestHash) {
        this.logger.warn(
          `[IDEMPOTENCY_CONFLICT] Key: ${idempotencyKey}, User: ${userId}, Scope: ${scope} đã được sử dụng với payload khác!`,
        );

        throw new HttpException(
          {
            code: 'IDEMPOTENCY_KEY_REUSED',
            message: 'Khóa Idempotency-Key đã được sử dụng với nội dung yêu cầu khác (BR-015)',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // 1.2 Khóa và payload khớp hoàn toàn -> Trả lại kết quả đã lưu trước đó (Replay response)
      this.logger.log(`[IDEMPOTENCY_HIT] Replaying cached response for key: ${idempotencyKey}`);

      if (res.status && typeof res.status === 'function') {
        res.status(existing.statusCode || 200);
      }
      if (res.setHeader && typeof res.setHeader === 'function') {
        res.setHeader('X-Idempotency-Status', 'REPLAYED');
      }

      return of(existing.response);
    }

    // 2. Lần gọi đầu tiên: Tiến hành thực thi và lưu kết quả vào idempotency_keys
    if (res.setHeader && typeof res.setHeader === 'function') {
      res.setHeader('X-Idempotency-Status', 'SAVED');
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const statusCode = res.statusCode || 200;

          // Chỉ lưu idempotency cho các mã thành công hoặc lỗi nghiệp vụ đã xác định
          if (statusCode >= 200 && statusCode < 500) {
            const record = this.idempotencyRepo.create({
              scope,
              userId,
              key: idempotencyKey,
              requestHash,
              response: responseBody,
              statusCode,
            });
            await this.idempotencyRepo.save(record);
          }
        } catch (saveErr) {
          this.logger.error(
            `[IDEMPOTENCY_SAVE_ERROR] Failed to save key: ${idempotencyKey}`,
            saveErr,
          );
        }
      }),
    );
  }
}
