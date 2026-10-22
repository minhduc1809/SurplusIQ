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
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';
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
    // Cột user_id là uuid — không dùng chuỗi 'anonymous' vì sẽ gây lỗi QueryFailedError cho
    // request chưa đăng nhập; anonymous request có đóng góp chống double-submit nên bỏ qua lookup.
    const userId = req.user?.userId;
    if (!idempotencyKey || !userId) {
      return next.handle();
    }
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body || {}))
      .digest('hex');

    const keyWhere = { scope, userId, key: idempotencyKey };

    // 1. Chiếm khóa nguyên tử TRƯỚC khi xử lý (BUG-006): khóa chính (scope,user,key) bảo đảm chỉ một yêu cầu thắng,
    //    nên bấm đúp song song không còn tạo hai đơn. statusCode=0 nghĩa là đang xử lý.
    const claim = await this.idempotencyRepo
      .createQueryBuilder()
      .insert()
      .into(IdempotencyKeyEntity)
      .values({ ...keyWhere, requestHash, response: {}, statusCode: 0 })
      .orIgnore()
      .returning('key')
      .execute();
    const claimed = (claim.raw?.length ?? claim.identifiers?.length ?? 0) > 0;

    if (!claimed) {
      const existing = await this.idempotencyRepo.findOne({ where: keyWhere });
      if (existing) {
        // 1.1 Khóa đã dùng nhưng payload khác -> 422 IDEMPOTENCY_KEY_REUSED (BR-015, mục 5.5)
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
        // 1.2 Yêu cầu đầu vẫn đang xử lý (bấm đúp song song)
        if (existing.statusCode === 0) {
          throw new HttpException(
            {
              code: 'IDEMPOTENCY_IN_PROGRESS',
              message:
                'Yêu cầu trước đó với cùng khóa đang được xử lý, vui lòng chờ giây lát (BR-015)',
            },
            HttpStatus.CONFLICT,
          );
        }
        // 1.3 Khóa và payload khớp -> trả lại kết quả đã lưu (replay)
        this.logger.log(`[IDEMPOTENCY_HIT] Replaying cached response for key: ${idempotencyKey}`);
        if (res.status && typeof res.status === 'function') res.status(existing.statusCode || 200);
        if (res.setHeader && typeof res.setHeader === 'function')
          res.setHeader('X-Idempotency-Status', 'REPLAYED');
        return of(existing.response);
      }
    }

    // 2. Thắng khóa: xử lý rồi ghi kết quả TRƯỚC khi trả phản hồi; lỗi thì nhả khóa để client thử lại.
    if (res.setHeader && typeof res.setHeader === 'function')
      res.setHeader('X-Idempotency-Status', 'SAVED');

    return next.handle().pipe(
      mergeMap(async (responseBody) => {
        const statusCode = res.statusCode || 200;
        try {
          await this.idempotencyRepo.update(keyWhere, {
            response: (responseBody ?? {}) as Record<string, unknown>,
            statusCode: statusCode >= 200 && statusCode < 500 ? statusCode : 200,
          });
        } catch (saveErr) {
          this.logger.error(
            `[IDEMPOTENCY_SAVE_ERROR] Failed to save key: ${idempotencyKey}`,
            saveErr,
          );
        }
        return responseBody;
      }),
      catchError((err) =>
        from(this.idempotencyRepo.delete(keyWhere).catch(() => undefined)).pipe(
          mergeMap(() => throwError(() => err)),
        ),
      ),
    );
  }
}
