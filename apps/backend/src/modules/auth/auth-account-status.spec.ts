import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '../../entities';
import { AuthService } from './auth.service';

describe('Authentication account status', () => {
  let users: { findOne: jest.Mock; save: jest.Mock };
  let refreshTokens: { findOne: jest.Mock; save: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    users = { findOne: jest.fn(), save: jest.fn() };
    refreshTokens = {
      findOne: jest.fn().mockResolvedValue({
        userId: 'user',
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
      }),
      save: jest.fn(),
    };
    service = new AuthService(
      users as never,
      null,
      null,
      null,
      null,
      null,
      null,
      refreshTokens as never,
      null,
      null,
      null,
      null,
    );
  });

  it('BUG-017: tài khoản không phải khách ở PENDING_DELETE vẫn bị từ chối đăng nhập', async () => {
    users.findOne.mockResolvedValue({
      id: 'user',
      role: UserRole.ADMIN,
      status: UserStatus.PENDING_DELETE,
    });
    await expect(
      service.loginStore({ email: 'admin@example.com', password: 'Password123', deviceId: 'test' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it.each([UserStatus.LOCKED, UserStatus.ANONYMIZED])(
    'rejects login and refresh for %s',
    async (status) => {
      users.findOne.mockResolvedValue({ id: 'user', role: UserRole.CUSTOMER, status });
      await expect(
        service.loginCustomer({
          identifier: 'customer@example.com',
          password: 'Password123',
          deviceId: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
      users.findOne.mockResolvedValue({ id: 'user', role: UserRole.ADMIN, status });
      await expect(
        service.loginStore({
          email: 'admin@example.com',
          password: 'Password123',
          deviceId: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(service.refreshAccessToken({ refreshToken: 'refresh-token' })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(users.save).not.toHaveBeenCalled();
      expect(refreshTokens.save).not.toHaveBeenCalled();
    },
  );
});
