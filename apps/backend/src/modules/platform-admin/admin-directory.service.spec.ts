import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';
import {
  AuditLogEntity,
  CustomerProfileEntity,
  OfferEntity,
  OfferStatus,
  RefreshTokenEntity,
  StoreEntity,
  StoreMemberEntity,
  StoreSettingsEntity,
  StoreStatus,
  SubscriptionEntity,
  SubscriptionPlan,
  UserEntity,
  UserRole,
  UserStatus,
} from '../../entities';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CryptoUtil } from '../auth/crypto.util';
import { AdminDirectoryController } from './admin-directory.controller';
import { AdminDirectoryService } from './admin-directory.service';
import {
  CreateAdminStoreDto,
  CreateAdminUserDto,
  UpdateAdminStoreDto,
  UpdateAdminUserDto,
} from './dto/admin-directory.dto';

describe('Admin directory writes', () => {
  let service: AdminDirectoryService;
  let manager: {
    query: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let actor: UserEntity;
  let target: UserEntity;
  let member: StoreMemberEntity | null;
  let store: StoreEntity | null;
  let duplicate: boolean;

  beforeEach(() => {
    actor = Object.assign(new UserEntity(), {
      id: 'actor',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      email: 'admin@example.com',
    });
    target = Object.assign(new UserEntity(), {
      id: 'target',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      email: 'customer@example.com',
      phone: null,
      passwordHash: 'secret-hash',
    });
    member = null;
    store = Object.assign(new StoreEntity(), {
      id: 'store',
      name: 'Original',
      status: StoreStatus.ACTIVE,
      ownerUserId: 'target',
    });
    duplicate = false;
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => (duplicate ? target : null)),
    };
    manager = {
      query: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(async (entity, { where }) => {
        if (entity === UserEntity) return where.id === actor.id ? actor : target;
        if (entity === StoreMemberEntity) return member;
        if (entity === StoreEntity) return store;
        return null;
      }),
      create: jest.fn((entity, values) => Object.assign(new entity(), values)),
      save: jest.fn(async (entity) => {
        entity.id ??= 'new-id';
        return entity;
      }),
      count: jest.fn().mockResolvedValue(2),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => query),
    };
    service = new AdminDirectoryService({
      transaction: async (work) => work(manager as unknown as EntityManager),
    } as DataSource);
  });

  it('requires JWT and ADMIN role on every directory route', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminDirectoryController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, AdminDirectoryController)).toEqual([UserRole.ADMIN]);
  });

  it('rechecks the current actor before accepting a write', async () => {
    actor.status = UserStatus.LOCKED;
    await expect(service.deactivateUser(actor.id, target.id)).rejects.toThrow(ForbiddenException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('creates a hashed customer and profile, auditing only the safe projection', async () => {
    const result = await service.createUser(actor.id, {
      email: 'NEW@Example.com',
      password: 'Example123',
      role: UserRole.CUSTOMER,
    });
    expect(result).toMatchObject({
      email: 'new@example.com',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    });
    const saved = manager.save.mock.calls.map(([entity]) => entity);
    const user = saved.find((entity) => entity instanceof UserEntity);
    expect(CryptoUtil.verifyPassword('Example123', user.passwordHash)).toBe(true);
    expect(saved.some((entity) => entity instanceof CustomerProfileEntity)).toBe(true);
    expect(saved.find((entity) => entity instanceof AuditLogEntity)).toMatchObject({
      actorId: actor.id,
      action: 'ADMIN_USER_CREATE',
      oldValue: null,
      newValue: result,
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(saved.find((entity) => entity instanceof AuditLogEntity))).not.toContain(
      user.passwordHash,
    );
  });

  it('rejects duplicate identity and missing login identity', async () => {
    duplicate = true;
    await expect(
      service.createUser(actor.id, {
        email: 'customer@example.com',
        password: 'Example123',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(ConflictException);
    duplicate = false;
    await expect(
      service.createUser(actor.id, {
        password: 'Example123',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createUser(actor.id, {
        phone: '0901234567',
        password: 'Example123',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow('cần email');
  });

  it('keeps an email-based customer profile label within the profile column limit', async () => {
    const email = `${'a'.repeat(60)}@${'b'.repeat(60)}.${'c'.repeat(60)}.com`;
    const result = await service.createUser(actor.id, {
      email,
      password: 'Example123',
      role: UserRole.CUSTOMER,
    });
    const profile = manager.save.mock.calls
      .map(([entity]) => entity)
      .find((entity) => entity instanceof CustomerProfileEntity);
    expect(result.email).toBe(email);
    expect(profile.fullName).toHaveLength(150);
  });

  it.each<UpdateAdminUserDto>([{ status: UserStatus.LOCKED }, { role: UserRole.CUSTOMER }])(
    'prevents self lock/demotion %p',
    async (dto) => {
      await expect(service.updateUser(actor.id, actor.id, dto)).rejects.toThrow(
        'Không thể tự khóa',
      );
      expect(manager.save).not.toHaveBeenCalled();
    },
  );

  it('serializes competing writes and refuses removal of the last active admin', async () => {
    target.role = UserRole.ADMIN;
    manager.count.mockResolvedValue(1);
    await expect(service.deactivateUser(actor.id, target.id)).rejects.toThrow(
      'ít nhất một quản trị viên',
    );
    expect(manager.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [73675322]);
    expect(manager.findOne).toHaveBeenCalledWith(
      UserEntity,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('deactivates by status, revokes sessions and preserves the user and audit history', async () => {
    const result = await service.deactivateUser(actor.id, target.id);
    expect(result.status).toBe(UserStatus.LOCKED);
    expect(manager.update).toHaveBeenCalledWith(
      RefreshTokenEntity,
      expect.objectContaining({ userId: target.id }),
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    const audit = manager.save.mock.calls
      .map(([entity]) => entity)
      .find((entity) => entity instanceof AuditLogEntity);
    expect(audit.oldValue.status).toBe(UserStatus.ACTIVE);
    expect(audit.newValue.status).toBe(UserStatus.LOCKED);
  });

  it('does not allow a user update to erase the last login identifier', async () => {
    await expect(
      service.updateUser(actor.id, target.id, { email: null, phone: null }),
    ).rejects.toThrow('ít nhất email');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('preserves store membership role invariants', async () => {
    target.role = UserRole.STORE_USER;
    member = Object.assign(new StoreMemberEntity(), { userId: target.id, storeId: 'store' });
    await expect(
      service.updateUser(actor.id, target.id, { role: UserRole.CUSTOMER }),
    ).rejects.toThrow('đang liên kết cửa hàng');
  });

  it('creates store, owner membership, default settings and BASIC subscription in one transaction', async () => {
    target.role = UserRole.STORE_USER;
    const result = await service.createStore(actor.id, {
      ownerUserId: target.id,
      name: 'New',
      address: 'Address',
      phone: '0901234567',
    });
    expect(result.status).toBe(StoreStatus.PENDING_VERIFY);
    const saved = manager.save.mock.calls.map(([entity]) => entity);
    expect(saved.find((entity) => entity instanceof StoreMemberEntity)).toMatchObject({
      userId: target.id,
      storeId: result.id,
      permission: 'OWNER',
      status: 'ACTIVE',
    });
    expect(saved.find((entity) => entity instanceof StoreSettingsEntity)).toMatchObject({
      storeId: result.id,
    });
    expect(saved.find((entity) => entity instanceof SubscriptionEntity)).toMatchObject({
      storeId: result.id,
      plan: SubscriptionPlan.BASIC,
      status: 'ACTIVE',
    });
    expect(saved.find((entity) => entity instanceof AuditLogEntity)).toMatchObject({
      storeId: result.id,
      targetId: result.id,
      action: 'ADMIN_STORE_CREATE',
    });
  });

  it('rejects locked/non-store owners and owners already assigned to a store', async () => {
    const dto = { ownerUserId: target.id, name: 'New', address: 'Address', phone: '0901234567' };
    await expect(service.createStore(actor.id, dto)).rejects.toThrow('STORE_USER đang hoạt động');
    target.role = UserRole.STORE_USER;
    target.status = UserStatus.LOCKED;
    await expect(service.createStore(actor.id, dto)).rejects.toThrow('STORE_USER đang hoạt động');
    target.status = UserStatus.ACTIVE;
    member = new StoreMemberEntity();
    await expect(service.createStore(actor.id, dto)).rejects.toThrow(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('store delete suspends without deleting related records and closes open offers', async () => {
    const result = await service.suspendStore(actor.id, 'store');
    expect(result.status).toBe(StoreStatus.SUSPENDED);
    const saved = manager.save.mock.calls.map(([entity]) => entity);
    expect(saved).toHaveLength(2);
    expect(saved[1]).toMatchObject({
      action: 'ADMIN_STORE_UPDATE',
      oldValue: { status: 'ACTIVE', id: 'store', name: 'Original', ownerUserId: 'target' },
      newValue: { status: 'SUSPENDED', id: 'store', name: 'Original', ownerUserId: 'target' },
    });
    expect(manager.update).toHaveBeenCalledWith(
      OfferEntity,
      { storeId: 'store', status: OfferStatus.OPEN },
      { status: OfferStatus.CLOSED },
    );
  });

  it('sets PostGIS Point location when latitude and longitude are provided', async () => {
    await service.updateStore(actor.id, 'store', {
      latitude: 10.7769,
      longitude: 106.7009,
    });
    expect(store?.location).toEqual({
      type: 'Point',
      coordinates: [106.7009, 10.7769],
    });
  });

  it('DTOs require create fields and reject null or empty required store fields', async () => {
    const userErrors = await validate(plainToInstance(CreateAdminUserDto, { password: 'abcdef' }));
    expect(userErrors.some((error) => error.property === 'role')).toBe(true);
    const storeErrors = await validate(plainToInstance(CreateAdminStoreDto, { ownerUserId: '1' }));
    for (const field of ['ownerUserId', 'name', 'address', 'phone']) {
      expect(storeErrors.some((error) => error.property === field)).toBe(true);
    }
    const nullErrors = await validate(
      plainToInstance(UpdateAdminStoreDto, { name: null, address: '   ', logoUrl: null }),
    );
    expect(nullErrors.some((error) => error.property === 'name')).toBe(true);
    expect(nullErrors.some((error) => error.property === 'address')).toBe(true);
    expect(nullErrors.some((error) => error.property === 'logoUrl')).toBe(false);
  });
});
