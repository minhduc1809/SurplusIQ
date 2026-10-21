import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { ChannelGuard } from './channel.guard';
import { StorePermissionGuard } from './store-permission.guard';
import { StoreStatusGuard } from './store-status.guard';
import { PlanGuard } from './plan.guard';
import { UserRole } from '../../entities/auth/user.entity';
import { ChannelType } from '../decorators/channel.decorator';
import { StoreMemberStatus, StorePermission } from '../../entities/stores/store-member.entity';
import { StoreStatus } from '../../entities/stores/store.entity';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';

describe('3-Tier RBAC & Security Guards Unit Tests', () => {
  let reflector: Reflector;

  const createMockContext = (
    req: any,
    handler = () => {},
    targetClass = class {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
      getHandler: () => handler,
      getClass: () => targetClass,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
  });

  // =========================================================================
  // TIER 1: IDENTITY, ROLES & CHANNELS
  // =========================================================================
  describe('Tier 1: JwtAuthGuard', () => {
    let guard: JwtAuthGuard;

    beforeEach(() => {
      guard = new JwtAuthGuard(reflector);
    });

    it('should allow access without authentication when @Public() is present', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = createMockContext({});

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw UnauthorizedException when user is missing in handleRequest', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
    });

    it('should return user when present in handleRequest', () => {
      const user = { userId: 'u1', role: UserRole.CUSTOMER };
      expect(guard.handleRequest(null, user)).toEqual(user);
    });
  });

  describe('Tier 1: RolesGuard', () => {
    let guard: RolesGuard;

    beforeEach(() => {
      guard = new RolesGuard(reflector);
    });

    it('should allow access if no roles required', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : null));
      const context = createMockContext({ user: { role: UserRole.CUSTOMER } });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access if user has required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : [UserRole.STORE_USER]));
      const context = createMockContext({ user: { role: UserRole.STORE_USER } });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw FORBIDDEN_ROLE if user has different role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : [UserRole.STORE_USER]));
      const context = createMockContext({ user: { role: UserRole.CUSTOMER } });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw FORBIDDEN_ROLE if user object is not attached', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : [UserRole.STORE_USER]));
      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Tier 1: ChannelGuard (Rule 9.1 Channel Separation)', () => {
    let guard: ChannelGuard;

    beforeEach(() => {
      guard = new ChannelGuard(reflector);
    });

    it('should allow access when no channel specified', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : null));
      const context = createMockContext({ user: { role: UserRole.CUSTOMER } });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow CUSTOMER on CUSTOMER channel', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : ChannelType.CUSTOMER));
      const context = createMockContext({ user: { role: UserRole.CUSTOMER } });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should REJECT STORE_USER on CUSTOMER channel (Rule 9.1)', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : ChannelType.CUSTOMER));
      const context = createMockContext({ user: { role: UserRole.STORE_USER } });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow STORE_USER on STORE channel', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : ChannelType.STORE));
      const context = createMockContext({ user: { role: UserRole.STORE_USER } });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should REJECT CUSTOMER on STORE channel (Rule 9.1)', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockImplementation((key) => (key === IS_PUBLIC_KEY ? false : ChannelType.STORE));
      const context = createMockContext({ user: { role: UserRole.CUSTOMER } });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // TIER 2: STORE PERMISSIONS & STORE STATUS
  // =========================================================================
  describe('Tier 2: StorePermissionGuard (Tenant Isolation & RBAC Hierarchy)', () => {
    let guard: StorePermissionGuard;
    let mockStoreMemberRepo: any;

    beforeEach(() => {
      mockStoreMemberRepo = {
        findOne: jest.fn(),
      };
      guard = new StorePermissionGuard(reflector, mockStoreMemberRepo);
    });

    it('should allow if no permissions required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockContext({ user: { userId: 'u1' } });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should throw if storeId missing from token (Anti-IDOR 12.27.2)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.OWNER]);
      const context = createMockContext({ user: { userId: 'u1' /* no storeId */ } });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if user is not member of store', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.OWNER]);
      mockStoreMemberRepo.findOne.mockResolvedValue(null);
      const context = createMockContext({ user: { userId: 'u1', storeId: 's1' } });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if member is LOCKED or INVITED', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.OWNER]);
      mockStoreMemberRepo.findOne.mockResolvedValue({
        storeId: 's1',
        userId: 'u1',
        permission: StorePermission.OWNER,
        status: StoreMemberStatus.LOCKED,
      });
      const context = createMockContext({ user: { userId: 'u1', storeId: 's1' } });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow OWNER on any permission route', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.COUNTER]);
      mockStoreMemberRepo.findOne.mockResolvedValue({
        storeId: 's1',
        userId: 'u1',
        permission: StorePermission.OWNER,
        status: StoreMemberStatus.ACTIVE,
      });
      const req = { user: { userId: 'u1', storeId: 's1' } };
      const context = createMockContext(req);

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect((req as any).storeMember).toBeDefined();
    });

    it('should allow MANAGER on MANAGER and COUNTER routes, but reject on OWNER-only route', async () => {
      const managerMember = {
        storeId: 's1',
        userId: 'u2',
        permission: StorePermission.MANAGER,
        status: StoreMemberStatus.ACTIVE,
      };
      mockStoreMemberRepo.findOne.mockResolvedValue(managerMember);
      const req = { user: { userId: 'u2', storeId: 's1' } };

      // Route requiring COUNTER -> ALLOW
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.COUNTER]);
      await expect(guard.canActivate(createMockContext(req))).resolves.toBe(true);

      // Route requiring MANAGER -> ALLOW
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.MANAGER]);
      await expect(guard.canActivate(createMockContext(req))).resolves.toBe(true);

      // Route requiring OWNER -> REJECT
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.OWNER]);
      await expect(guard.canActivate(createMockContext(req))).rejects.toThrow(ForbiddenException);
    });

    it('should reject COUNTER on MANAGER or OWNER routes', async () => {
      const counterMember = {
        storeId: 's1',
        userId: 'u3',
        permission: StorePermission.COUNTER,
        status: StoreMemberStatus.ACTIVE,
      };
      mockStoreMemberRepo.findOne.mockResolvedValue(counterMember);
      const req = { user: { userId: 'u3', storeId: 's1' } };

      // Route requiring COUNTER -> ALLOW
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.COUNTER]);
      await expect(guard.canActivate(createMockContext(req))).resolves.toBe(true);

      // Route requiring MANAGER -> REJECT
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([StorePermission.MANAGER]);
      await expect(guard.canActivate(createMockContext(req))).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Tier 2: StoreStatusGuard (Suspend & Freeze)', () => {
    let guard: StoreStatusGuard;
    let mockStoreRepo: any;

    beforeEach(() => {
      mockStoreRepo = {
        findOne: jest.fn(),
      };
      guard = new StoreStatusGuard(reflector, mockStoreRepo);
    });

    it('should allow read (GET) requests without explicit status check', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockContext({
        method: 'GET',
        user: { storeId: 's1' },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should block mutating (POST/PUT/PATCH/DELETE) requests when store is SUSPENDED', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      mockStoreRepo.findOne.mockResolvedValue({
        id: 's1',
        status: StoreStatus.SUSPENDED,
      });

      const context = createMockContext({
        method: 'POST',
        user: { storeId: 's1' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should block mutating requests when store is PENDING_VERIFY', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      mockStoreRepo.findOne.mockResolvedValue({
        id: 's1',
        status: StoreStatus.PENDING_VERIFY,
      });

      const context = createMockContext({
        method: 'PUT',
        user: { storeId: 's1' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should allow mutating requests when store is ACTIVE', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      mockStoreRepo.findOne.mockResolvedValue({
        id: 's1',
        status: StoreStatus.ACTIVE,
      });

      const context = createMockContext({
        method: 'POST',
        user: { storeId: 's1' },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  // =========================================================================
  // TIER 3: SUBSCRIPTION PLAN GUARD
  // =========================================================================
  describe('Tier 3: PlanGuard (VC-01..VC-06 Feature Gating)', () => {
    let guard: PlanGuard;
    let mockSubRepo: any;

    beforeEach(() => {
      mockSubRepo = {
        findOne: jest.fn(),
      };
      guard = new PlanGuard(reflector, mockSubRepo);
    });

    it('should allow when no plan or BASIC plan required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(SubscriptionPlan.BASIC);
      const context = createMockContext({ user: { storeId: 's1' } });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow when store is on active PRO plan', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(SubscriptionPlan.PRO);
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 's1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days remaining
      });

      const context = createMockContext({ user: { storeId: 's1' } });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow when store is on active TRIAL plan (VC-01: Pro features in Trial)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(SubscriptionPlan.PRO);
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 's1',
        plan: SubscriptionPlan.TRIAL,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days remaining
      });

      const context = createMockContext({ user: { storeId: 's1' } });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should reject when PRO subscription period has expired (VC-06: Auto-revert to Basic)', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(SubscriptionPlan.PRO);
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 's1',
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const context = createMockContext({ user: { storeId: 's1' } });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should reject when store is on BASIC plan accessing PRO feature', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(SubscriptionPlan.PRO);
      mockSubRepo.findOne.mockResolvedValue({
        storeId: 's1',
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
      });

      const context = createMockContext({ user: { storeId: 's1' } });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
