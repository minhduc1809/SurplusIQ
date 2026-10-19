import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  AuditLogEntity,
  CustomerProfileEntity,
  RefreshTokenEntity,
  StoreEntity,
  StoreMemberEntity,
  StoreMemberStatus,
  StorePermission,
  StoreSettingsEntity,
  StoreStatus,
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
  UserEntity,
  UserRole,
  UserStatus,
} from '../../entities';
import { CryptoUtil } from '../auth/crypto.util';
import {
  CreateAdminStoreDto,
  CreateAdminUserDto,
  UpdateAdminStoreDto,
  UpdateAdminUserDto,
} from './dto/admin-directory.dto';

@Injectable()
export class AdminDirectoryService {
  constructor(private readonly dataSource: DataSource) {}

  private userView(user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private storeView(store: StoreEntity) {
    return {
      id: store.id,
      ownerUserId: store.ownerUserId,
      name: store.name,
      address: store.address,
      phone: store.phone,
      logoUrl: store.logoUrl,
      status: store.status,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private async write<T>(
    actorId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Serialize directory writes, including competing last-admin changes and case-insensitive identities.
        await manager.query('SELECT pg_advisory_xact_lock($1)', [73675322]);
        const actor = await manager.findOne(UserEntity, { where: { id: actorId } });
        if (actor?.role !== UserRole.ADMIN || actor.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException('Tài khoản quản trị không còn hoạt động');
        }
        return work(manager);
      });
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new ConflictException(
          'Email, số điện thoại hoặc tài khoản chủ cửa hàng đã được sử dụng',
        );
      }
      throw error;
    }
  }

  private async audit(
    manager: EntityManager,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown>,
    storeId: string | null = null,
  ) {
    await manager.save(
      manager.create(AuditLogEntity, {
        actorId,
        actorRole: UserRole.ADMIN,
        action,
        targetType,
        targetId,
        storeId,
        oldValue,
        newValue,
      }),
    );
  }

  private async checkIdentity(
    manager: EntityManager,
    email: string | null,
    phone: string | null,
    id?: string,
  ) {
    if (!email && !phone) {
      throw new BadRequestException('Cần ít nhất email hoặc số điện thoại');
    }
    const query = manager.createQueryBuilder(UserEntity, 'user');
    query.where('(LOWER(user.email) = LOWER(:email) OR user.phone = :phone)', { email, phone });
    if (id) query.andWhere('user.id <> :id', { id });
    if (await query.getOne()) {
      throw new ConflictException('Email hoặc số điện thoại đã được sử dụng');
    }
  }

  async createUser(actorId: string, dto: CreateAdminUserDto) {
    return this.write(actorId, async (manager) => {
      const email = dto.email?.trim().toLowerCase() || null;
      const phone = dto.phone?.trim() || null;
      await this.checkIdentity(manager, email, phone);
      if ([UserRole.ADMIN, UserRole.STORE_USER].includes(dto.role) && !email) {
        throw new BadRequestException('Tài khoản quản trị/cửa hàng cần email để đăng nhập');
      }
      const user = manager.create(UserEntity, {
        email,
        phone,
        passwordHash: CryptoUtil.hashPassword(dto.password),
        role: dto.role,
        status: dto.status ?? UserStatus.ACTIVE,
      });
      await manager.save(user);
      if (user.role === UserRole.CUSTOMER) {
        await manager.save(
          manager.create(CustomerProfileEntity, {
            userId: user.id,
            fullName: (email || phone).slice(0, 150),
          }),
        );
      }
      const result = this.userView(user);
      await this.audit(manager, actorId, 'ADMIN_USER_CREATE', 'USER', user.id, null, result);
      return result;
    });
  }

  async updateUser(actorId: string, id: string, dto: UpdateAdminUserDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('Chưa có thông tin thay đổi');
    return this.write(actorId, async (manager) => {
      const user = await manager.findOne(UserEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');
      if ([UserStatus.PENDING_DELETE, UserStatus.ANONYMIZED].includes(user.status)) {
        throw new BadRequestException('Không thể sửa tài khoản đã yêu cầu xóa hoặc đã ẩn danh');
      }
      const before = this.userView(user);
      const role = dto.role ?? user.role;
      const status = dto.status ?? user.status;
      if (id === actorId && (role !== UserRole.ADMIN || status !== UserStatus.ACTIVE)) {
        throw new BadRequestException('Không thể tự khóa hoặc hạ quyền tài khoản đang đăng nhập');
      }
      if (
        user.role === UserRole.ADMIN &&
        user.status === UserStatus.ACTIVE &&
        (role !== UserRole.ADMIN || status !== UserStatus.ACTIVE)
      ) {
        const adminCount = await manager.count(UserEntity, {
          where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
        });
        if (adminCount <= 1)
          throw new BadRequestException('Cần giữ ít nhất một quản trị viên đang hoạt động');
      }
      if (user.role === UserRole.STORE_USER && role !== UserRole.STORE_USER) {
        const member = await manager.findOne(StoreMemberEntity, { where: { userId: id } });
        if (member)
          throw new BadRequestException(
            'Tài khoản đang liên kết cửa hàng; hãy giữ vai trò STORE_USER',
          );
      }
      const email = dto.email === undefined ? user.email : dto.email?.trim().toLowerCase() || null;
      const phone = dto.phone === undefined ? user.phone : dto.phone?.trim() || null;
      await this.checkIdentity(manager, email, phone, id);
      if ([UserRole.ADMIN, UserRole.STORE_USER].includes(role) && !email) {
        throw new BadRequestException('Tài khoản quản trị/cửa hàng cần email để đăng nhập');
      }
      Object.assign(user, { email, phone, role, status });
      if (status === UserStatus.ACTIVE && before.status !== UserStatus.ACTIVE) {
        user.failedLoginCount = 0;
        user.lockedUntil = null;
      }
      await manager.save(user);
      if (
        role === UserRole.CUSTOMER &&
        !(await manager.findOne(CustomerProfileEntity, { where: { userId: id } }))
      ) {
        await manager.save(
          manager.create(CustomerProfileEntity, {
            userId: id,
            fullName: (email || phone).slice(0, 150),
          }),
        );
      }
      if (status !== UserStatus.ACTIVE || role !== before.role) {
        await manager.update(
          RefreshTokenEntity,
          { userId: id, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
      }
      const result = this.userView(user);
      await this.audit(manager, actorId, 'ADMIN_USER_UPDATE', 'USER', id, before, result);
      return result;
    });
  }

  deactivateUser(actorId: string, id: string) {
    return this.updateUser(actorId, id, { status: UserStatus.LOCKED });
  }

  async createStore(actorId: string, dto: CreateAdminStoreDto) {
    return this.write(actorId, async (manager) => {
      const owner = await manager.findOne(UserEntity, {
        where: { id: dto.ownerUserId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!owner || owner.status !== UserStatus.ACTIVE || owner.role !== UserRole.STORE_USER) {
        throw new BadRequestException('Chủ cửa hàng phải là tài khoản STORE_USER đang hoạt động');
      }
      if (await manager.findOne(StoreMemberEntity, { where: { userId: owner.id } })) {
        throw new ConflictException('Tài khoản chủ đã liên kết với một cửa hàng');
      }
      const store = manager.create(StoreEntity, {
        ownerUserId: owner.id,
        name: dto.name.trim(),
        address: dto.address.trim(),
        phone: dto.phone.trim(),
        logoUrl: dto.logoUrl || null,
        status: dto.status ?? StoreStatus.PENDING_VERIFY,
      });
      await manager.save(store);
      await manager.save(
        manager.create(StoreMemberEntity, {
          storeId: store.id,
          userId: owner.id,
          permission: StorePermission.OWNER,
          status: StoreMemberStatus.ACTIVE,
        }),
      );
      await manager.save(manager.create(StoreSettingsEntity, { storeId: store.id }));
      const start = new Date();
      await manager.save(
        manager.create(SubscriptionEntity, {
          storeId: store.id,
          plan: SubscriptionPlan.BASIC,
          periodStart: start,
          periodEnd: new Date(start.getTime() + 30 * 86400000),
          status: SubscriptionStatus.ACTIVE,
          trialUsed: false,
        }),
      );
      const result = this.storeView(store);
      await this.audit(
        manager,
        actorId,
        'ADMIN_STORE_CREATE',
        'STORE',
        store.id,
        null,
        result,
        store.id,
      );
      return result;
    });
  }

  async updateStore(actorId: string, id: string, dto: UpdateAdminStoreDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('Chưa có thông tin thay đổi');
    return this.write(actorId, async (manager) => {
      const store = await manager.findOne(StoreEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!store) throw new NotFoundException('Không tìm thấy cửa hàng');
      const before = this.storeView(store);
      for (const field of ['name', 'address', 'phone', 'logoUrl', 'status'] as const) {
        if (dto[field] !== undefined) (store[field] as string | null) = dto[field];
      }
      await manager.save(store);
      const result = this.storeView(store);
      await this.audit(manager, actorId, 'ADMIN_STORE_UPDATE', 'STORE', id, before, result, id);
      return result;
    });
  }

  suspendStore(actorId: string, id: string) {
    return this.updateStore(actorId, id, { status: StoreStatus.SUSPENDED });
  }
}
