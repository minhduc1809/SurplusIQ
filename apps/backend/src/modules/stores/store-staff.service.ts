import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan, IsNull } from 'typeorm';
import * as crypto from 'crypto';
import {
  StoreMemberEntity,
  StoreMemberStatus,
  StorePermission,
} from '../../entities/stores/store-member.entity';
import { StaffInviteEntity } from '../../entities/stores/staff-invite.entity';
import { UserEntity } from '../../entities/auth/user.entity';
import { InviteStaffDto, UpdateStaffDto } from './dto/store-operations.dto';
import { QuotaService } from '../subscriptions/quota.service';
import { AuditLogService } from '../audit/audit-log.service';
import { QuotaKey } from '../subscriptions/quota.constants';

@Injectable()
export class StoreStaffService {
  private readonly logger = new Logger(StoreStaffService.name);

  constructor(
    @InjectRepository(StoreMemberEntity)
    private readonly memberRepo: Repository<StoreMemberEntity>,
    @InjectRepository(StaffInviteEntity)
    private readonly inviteRepo: Repository<StaffInviteEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly quotaService: QuotaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Danh sách nhân viên cửa hàng và các lời mời đang chờ xử lý (R2-076)
   */
  async getStaffList(storeId: string) {
    const members = await this.memberRepo.find({
      where: {
        storeId,
        status: Not(StoreMemberStatus.REMOVED),
      },
      order: { createdAt: 'ASC' },
    });

    const userIds = members.map((m) => m.userId);
    let users: UserEntity[] = [];
    if (userIds.length > 0) {
      users = await this.userRepo.find({
        where: userIds.map((id) => ({ id })),
      });
    }
    const userMap = new Map(users.map((u) => [u.id, u]));

    const pendingInvites = await this.inviteRepo.find({
      where: {
        storeId,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      members: members.map((m) => ({
        id: m.id,
        storeId: m.storeId,
        userId: m.userId,
        permission: m.permission,
        status: m.status,
        lastActiveAt: m.lastActiveAt,
        createdAt: m.createdAt,
        user: userMap.has(m.userId)
          ? {
              fullName: userMap.get(m.userId)?.fullName,
              email: userMap.get(m.userId)?.email,
              phone: userMap.get(m.userId)?.phone,
              status: userMap.get(m.userId)?.status,
            }
          : null,
      })),
      pendingInvites: pendingInvites
        .filter((inv) => !inv.usedAt)
        .map((inv) => ({
          id: inv.id,
          fullName: inv.fullName,
          email: inv.email,
          permission: inv.permission,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        })),
    };
  }

  /**
   * Mời nhân viên mới qua Email (R2-076, BR-076: kiểm tra hạn mức gói Cơ bản vs Pro)
   */
  async inviteStaff(storeId: string, dto: InviteStaffDto) {
    // 1. Kiểm tra hạn mức nhân viên gói cước hiện tại (QuotaKey.ACTIVE_STAFF)
    const quotaCheck = await this.quotaService.checkQuota({
      storeId,
      quotaKey: QuotaKey.ACTIVE_STAFF,
    });

    if (quotaCheck.isExceeded) {
      throw new BadRequestException(
        `Đã đạt hạn mức nhân viên của gói hiện tại (${quotaCheck.limit} người). Vui lòng nâng cấp lên gói Pro để mở rộng thêm nhân viên (BR-076).`,
      );
    }

    // 2. Kiểm tra xem email này đã là thành viên hoạt động của quán chưa
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      const activeMember = await this.memberRepo.findOne({
        where: {
          storeId,
          userId: existingUser.id,
          status: StoreMemberStatus.ACTIVE,
        },
      });
      if (activeMember) {
        throw new ConflictException(
          'Tài khoản này hiện đã là thành viên đang hoạt động của cửa hàng.',
        );
      }
    }

    // 3. Tạo token mời với hiệu lực 72 giờ
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const invite = this.inviteRepo.create({
      storeId,
      email: dto.email.toLowerCase(),
      fullName: dto.fullName.trim(),
      permission: dto.permission,
      tokenHash,
      expiresAt,
    });

    const saved = await this.inviteRepo.save(invite);

    return {
      success: true,
      message: 'Đã gửi lời mời tham gia cửa hàng thành công. Thư mời có hiệu lực trong 72 giờ.',
      inviteId: saved.id,
      invitationToken: rawToken,
      expiresAt,
    };
  }

  /**
   * Cập nhật phân quyền hoặc khóa/mở khóa nhân viên (R2-077)
   */
  async updateStaffRole(
    storeId: string,
    memberId: string,
    dto: UpdateStaffDto,
    actorId = 'system',
  ) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, storeId },
    });
    if (!member) {
      throw new NotFoundException('Nhân viên không tồn tại trong cửa hàng.');
    }

    if (member.permission === StorePermission.OWNER) {
      throw new BadRequestException('Không thể thay đổi quyền hạn của Chủ sở hữu (OWNER).');
    }

    if (dto.status === StoreMemberStatus.LOCKED && !dto.reason?.trim()) {
      throw new BadRequestException('Hãy nhập lý do khi tạm khóa nhân viên.');
    }

    const before = { permission: member.permission, status: member.status };
    member.permission = dto.permission;
    if (dto.status) {
      member.status = dto.status;
    }
    const saved = await this.memberRepo.save(member);

    await this.auditLogService.log({
      storeId,
      actorId,
      actorRole: StorePermission.OWNER,
      action:
        dto.status === StoreMemberStatus.LOCKED
          ? 'STAFF_LOCKED'
          : dto.status === StoreMemberStatus.ACTIVE && before.status === StoreMemberStatus.LOCKED
            ? 'STAFF_UNLOCKED'
            : 'STAFF_ROLE_CHANGED',
      targetType: 'STORE_MEMBER',
      targetId: memberId,
      oldValue: before,
      newValue: { permission: saved.permission, status: saved.status, reason: dto.reason ?? null },
    });
    return saved;
  }

  /**
   * Xóa nhân viên khỏi cửa hàng (R2-078)
   */
  async removeStaff(storeId: string, memberId: string) {
    const member = await this.memberRepo.findOne({
      where: { id: memberId, storeId },
    });
    if (!member) {
      throw new NotFoundException('Nhân viên không tồn tại trong cửa hàng.');
    }

    if (member.permission === StorePermission.OWNER) {
      throw new BadRequestException('Không thể xóa Chủ sở hữu (OWNER) khỏi cửa hàng.');
    }

    member.status = StoreMemberStatus.REMOVED;
    await this.memberRepo.save(member);

    return {
      success: true,
      message: 'Đã xóa nhân viên khỏi cửa hàng thành công (R2-078).',
    };
  }

  /**
   * Chấp nhận lời mời tham gia quản lý cửa hàng (R2-079)
   */
  async acceptInvite(token: string, userId: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await this.inviteRepo.findOne({
      where: { tokenHash },
    });

    if (!invite || invite.usedAt) {
      throw new BadRequestException('Thư mời không hợp lệ hoặc đã được sử dụng.');
    }

    if (new Date() > new Date(invite.expiresAt)) {
      throw new BadRequestException('Thư mời đã hết hạn sau 72 giờ (R2-079).');
    }

    // Gán thành viên vào quán
    let member = await this.memberRepo.findOne({
      where: { storeId: invite.storeId, userId },
    });

    if (member) {
      member.permission = invite.permission;
      member.status = StoreMemberStatus.ACTIVE;
      member.lastActiveAt = new Date();
    } else {
      member = this.memberRepo.create({
        storeId: invite.storeId,
        userId,
        permission: invite.permission,
        status: StoreMemberStatus.ACTIVE,
        lastActiveAt: new Date(),
      });
    }

    await this.memberRepo.save(member);

    // Họ tên do chủ nhập khi mời; không ghi đè nếu người dùng đã có tên
    if (invite.fullName) {
      await this.userRepo.update({ id: userId, fullName: IsNull() }, { fullName: invite.fullName });
    }

    // Đánh dấu lời mời đã sử dụng
    invite.usedAt = new Date();
    await this.inviteRepo.save(invite);

    return {
      success: true,
      message: 'Tham gia cửa hàng thành công.',
      storeId: invite.storeId,
      permission: invite.permission,
    };
  }
}
