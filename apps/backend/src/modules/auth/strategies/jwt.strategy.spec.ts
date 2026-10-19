import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserEntity, UserRole, UserStatus } from '../../../entities';
import { JwtStrategy } from './jwt.strategy';

describe('JWT current account enforcement', () => {
  let users: { findOne: jest.Mock };
  let strategy: JwtStrategy;
  beforeEach(() => {
    users = { findOne: jest.fn() };
    strategy = new JwtStrategy(users as unknown as Repository<UserEntity>);
  });

  it.each([
    UserStatus.LOCKED,
    UserStatus.PENDING_DELETE,
    UserStatus.ANONYMIZED,
    UserStatus.PENDING_VERIFY,
  ])('rejects an existing token for %s accounts', async (status) => {
    users.findOne.mockResolvedValue({ id: 'user', role: UserRole.ADMIN, status });
    await expect(strategy.validate({ sub: 'user', role: 'ADMIN' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects stale role claims and deleted users', async () => {
    users.findOne.mockResolvedValue({
      id: 'user',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    });
    await expect(strategy.validate({ sub: 'user', role: 'ADMIN' })).rejects.toThrow(
      UnauthorizedException,
    );
    users.findOne.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 'user', role: 'ADMIN' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns current identity fields for an active account', async () => {
    users.findOne.mockResolvedValue({
      id: 'user',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      email: 'current@example.com',
      phone: null,
    });
    await expect(
      strategy.validate({
        sub: 'user',
        role: 'ADMIN',
        email: 'old@example.com',
        deviceId: 'device',
      }),
    ).resolves.toMatchObject({
      userId: 'user',
      email: 'current@example.com',
      role: UserRole.ADMIN,
      deviceId: 'device',
    });
  });
});
