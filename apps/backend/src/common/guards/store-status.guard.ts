import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { STORE_STATUS_KEY } from '../decorators/store-status.decorator';
import { StoreEntity, StoreStatus } from '../../entities/stores/store.entity';

@Injectable()
export class StoreStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredStatus = this.reflector.getAllAndOverride<StoreStatus>(STORE_STATUS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const storeId = user?.storeId;

    // Nếu không có storeId (ví dụ route dành cho khách hàng hoặc public) thì bỏ qua
    if (!storeId) {
      return true;
    }

    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      request.method?.toUpperCase(),
    );

    // Kiểm tra nếu route có đánh dấu explicit hoặc là thao tác ghi
    if (!requiredStatus && !isMutatingMethod) {
      return true;
    }

    const store = await this.storeRepo.findOne({
      where: { id: storeId },
    });

    if (!store) {
      throw new ForbiddenException({
        code: 'STORE_NOT_FOUND',
        message: 'Không tìm thấy thông tin cửa hàng',
      });
    }

    request.store = store;

    if (requiredStatus) {
      if (store.status !== requiredStatus) {
        throw new ForbiddenException({
          code: 'STORE_SUSPENDED',
          message: `Cửa hàng đang ở trạng thái [${store.status}], yêu cầu trạng thái [${requiredStatus}]`,
        });
      }
    } else if (isMutatingMethod) {
      // Mặc định: Chặn mọi thao tác ghi khi SUSPENDED hoặc PENDING_VERIFY (kế hoạch mục 6)
      if (store.status === StoreStatus.SUSPENDED) {
        throw new ForbiddenException({
          code: 'STORE_SUSPENDED',
          message: 'Cửa hàng đang bị tạm ngưng hoạt động, không thể thực hiện thao tác sửa đổi',
        });
      }

      if (store.status === StoreStatus.PENDING_VERIFY) {
        throw new ForbiddenException({
          code: 'STORE_PENDING_VERIFY',
          message:
            'Cửa hàng chưa hoàn tất xác thực thông tin, không thể thực hiện thao tác sửa đổi',
        });
      }
    }

    return true;
  }
}
