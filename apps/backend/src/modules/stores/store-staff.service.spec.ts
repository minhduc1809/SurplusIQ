import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { StoreStaffService } from './store-staff.service';
import {
  StoreMemberEntity,
  StoreMemberStatus,
  StorePermission,
} from '../../entities/stores/store-member.entity';
import { StaffInviteEntity } from '../../entities/stores/staff-invite.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { QuotaService } from '../subscriptions/quota.service';

describe('StoreStaffService Unit Tests (R2-076..R2-081)', () => {
  let service: StoreStaffService;
  let memberRepo: any;
  let inviteRepo: any;
  let userRepo: any;
  let quotaService: any;

  beforeEach(async () => {
    memberRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'mem-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'mem-1', ...d })),
    };
    inviteRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'inv-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'inv-1', ...d })),
    };
    userRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    quotaService = {
      checkQuota: jest.fn().mockResolvedValue({
        isExceeded: false,
        limit: 1,
        used: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreStaffService,
        { provide: getRepositoryToken(StoreMemberEntity), useValue: memberRepo },
        { provide: getRepositoryToken(StaffInviteEntity), useValue: inviteRepo },
        { provide: getRepositoryToken(UserEntity), useValue: userRepo },
        { provide: QuotaService, useValue: quotaService },
      ],
    }).compile();

    service = module.get<StoreStaffService>(StoreStaffService);
  });

  describe('getStaffList (R2-076)', () => {
    it('lấy danh sách nhân viên và thư mời chờ', async () => {
      memberRepo.find.mockResolvedValue([
        {
          id: 'mem-1',
          storeId: 'store-1',
          userId: 'user-1',
          permission: StorePermission.COUNTER,
          status: StoreMemberStatus.ACTIVE,
        },
      ]);
      userRepo.find.mockResolvedValue([
        { id: 'user-1', email: 'staff@gmail.com', phone: '0987654321' },
      ]);
      inviteRepo.find.mockResolvedValue([
        {
          id: 'inv-1',
          email: 'invite@gmail.com',
          usedAt: null,
          expiresAt: new Date(Date.now() + 10000),
        },
      ]);

      const res = await service.getStaffList('store-1');
      expect(res.members).toHaveLength(1);
      expect(res.members[0].user?.email).toBe('staff@gmail.com');
      expect(res.pendingInvites).toHaveLength(1);
    });
  });

  describe('inviteStaff (R2-076, BR-076)', () => {
    it('gửi lời mời thành công khi chưa vượt quota', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const res = await service.inviteStaff('store-1', {
        email: 'newstaff@gmail.com',
        permission: StorePermission.COUNTER,
      });

      expect(res.success).toBe(true);
      expect(res.invitationToken).toBeDefined();
      expect(inviteRepo.save).toHaveBeenCalled();
    });

    it('ném lỗi BadRequestException khi vượt quá hạn mức nhân viên', async () => {
      quotaService.checkQuota.mockResolvedValue({
        isExceeded: true,
        limit: 1,
        used: 1,
      });

      await expect(
        service.inviteStaff('store-1', {
          email: 'another@gmail.com',
          permission: StorePermission.COUNTER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ném lỗi ConflictException nếu người dùng đã là thành viên quán', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'user-2' });
      memberRepo.findOne.mockResolvedValue({
        id: 'mem-2',
        status: StoreMemberStatus.ACTIVE,
      });

      await expect(
        service.inviteStaff('store-1', {
          email: 'existing@gmail.com',
          permission: StorePermission.COUNTER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStaffRole (R2-077)', () => {
    it('cập nhật vai trò thành công', async () => {
      memberRepo.findOne.mockResolvedValue({
        id: 'mem-1',
        storeId: 'store-1',
        permission: StorePermission.COUNTER,
      });

      const res = await service.updateStaffRole('store-1', 'mem-1', {
        permission: StorePermission.MANAGER,
      });

      expect(res.permission).toBe(StorePermission.MANAGER);
      expect(memberRepo.save).toHaveBeenCalled();
    });

    it('chặn đổi quyền hạn của OWNER', async () => {
      memberRepo.findOne.mockResolvedValue({
        id: 'mem-owner',
        storeId: 'store-1',
        permission: StorePermission.OWNER,
      });

      await expect(
        service.updateStaffRole('store-1', 'mem-owner', {
          permission: StorePermission.COUNTER,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeStaff (R2-078)', () => {
    it('xóa nhân viên thành công', async () => {
      memberRepo.findOne.mockResolvedValue({
        id: 'mem-1',
        storeId: 'store-1',
        permission: StorePermission.COUNTER,
      });

      const res = await service.removeStaff('store-1', 'mem-1');
      expect(res.success).toBe(true);
      expect(memberRepo.save).toHaveBeenCalled();
    });

    it('chặn xóa OWNER khỏi quán', async () => {
      memberRepo.findOne.mockResolvedValue({
        id: 'mem-owner',
        storeId: 'store-1',
        permission: StorePermission.OWNER,
      });

      await expect(service.removeStaff('store-1', 'mem-owner')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('acceptInvite (R2-079)', () => {
    it('chấp nhận lời mời thành công và kích hoạt thành viên', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      inviteRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        storeId: 'store-1',
        permission: StorePermission.COUNTER,
        expiresAt: futureDate,
        usedAt: null,
      });
      memberRepo.findOne.mockResolvedValue(null);

      const res = await service.acceptInvite('valid-token-string', 'user-new');
      expect(res.success).toBe(true);
      expect(res.storeId).toBe('store-1');
      expect(memberRepo.save).toHaveBeenCalled();
      expect(inviteRepo.save).toHaveBeenCalled();
    });

    it('ném lỗi nếu lời mời đã hết hạn', async () => {
      const pastDate = new Date(Date.now() - 1000);
      inviteRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        expiresAt: pastDate,
        usedAt: null,
      });

      await expect(service.acceptInvite('expired-token', 'user-new')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
