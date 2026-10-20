import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';
import { RewardAccountEntity } from '../../entities/rewards/reward-account.entity';
import {
  RewardEntryType,
  RewardLedgerEntryEntity,
} from '../../entities/rewards/reward-ledger-entry.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { REWARDS_CONSTANTS } from './rewards.constants';
import { RedeemRewardDto } from './dto';

export interface RewardBalance {
  customerId: string;
  pointsBalance: number;
  updatedAt: Date | null;
}

/**
 * Rescue Rewards (CM-C04): ledger điểm thưởng theo giao dịch hoàn tất.
 * Không xóa bút toán - mọi điều chỉnh là bút toán đối ứng (BR-C04-05).
 * Số dư không âm, mọi thay đổi số dư nguyên tử (BR-C04-04).
 */
@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    @InjectRepository(RewardAccountEntity)
    private readonly accountRepo: Repository<RewardAccountEntity>,
    @InjectRepository(RewardLedgerEntryEntity)
    private readonly ledgerRepo: Repository<RewardLedgerEntryEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async getBalance(customerId: string): Promise<RewardBalance> {
    const account = await this.accountRepo.findOne({ where: { customerId } });
    return {
      customerId,
      pointsBalance: account?.pointsBalance ?? 0,
      updatedAt: account?.updatedAt ?? null,
    };
  }

  async getHistory(customerId: string): Promise<RewardLedgerEntryEntity[]> {
    return this.ledgerRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Số điểm cộng cho một đơn đã nhận thành công (BR-C04-01: theo sự kiện hợp lệ, không chỉ tạo đơn). */
  calculatePointsForOrder(totalAmount: number): number {
    return Math.floor(totalAmount / REWARDS_CONSTANTS.POINTS_PER_VND_DIVISOR);
  }

  /**
   * Cộng điểm khi đơn được nhận thành công (gọi từ PickupsService trong cùng
   * transaction để tính nguyên tử cùng xác nhận nhận hàng). Idempotent qua unique
   * index DB (source_order_id, entry_type='EARN') - gọi lặp không cộng trùng
   * (BR-C04-02).
   */
  async awardForOrder(
    customerId: string,
    sourceOrderId: string,
    totalAmount: number,
    manager?: EntityManager,
  ): Promise<void> {
    const points = this.calculatePointsForOrder(totalAmount);
    if (points <= 0) return;

    const runner = manager ?? this.dataSource.manager;
    const ledgerRepo = runner.getRepository(RewardLedgerEntryEntity);

    const entry = ledgerRepo.create({
      customerId,
      sourceOrderId,
      entryType: RewardEntryType.EARN,
      pointsDelta: points,
      ruleVersion: REWARDS_CONSTANTS.RULE_VERSION,
      expiryAt: new Date(Date.now() + REWARDS_CONSTANTS.POINTS_EXPIRY_DAYS * 86400 * 1000),
      reason: `Cộng điểm cho đơn hàng đã nhận thành công`,
    });

    try {
      await ledgerRepo.save(entry);
    } catch (err) {
      // Vi phạm unique index EARN/order -> đã cộng trước đó, bỏ qua im lặng (idempotent).
      if (err instanceof QueryFailedError) {
        this.logger.warn(`Bỏ qua cộng điểm trùng cho đơn ${sourceOrderId} (đã cộng trước đó).`);
        return;
      }
      throw err;
    }

    await runner.query(
      `INSERT INTO reward_accounts (customer_id, points_balance, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (customer_id) DO UPDATE SET
         points_balance = reward_accounts.points_balance + $2,
         updated_at = NOW();`,
      [customerId, points],
    );

    await this.auditLogService.log({
      actorId: '00000000-0000-0000-0000-000000000000',
      actorRole: 'SYSTEM',
      action: 'REWARD_POINTS_EARNED',
      targetType: 'REWARD_LEDGER_ENTRY',
      targetId: entry.id,
      newValue: { customerId, sourceOrderId, points },
    });
  }

  /**
   * Hoàn tác điểm đã cộng khi đơn bị hủy/hoàn tiền sau khi đã cộng (BR-C04-06, BR-C04-07).
   * Ghi bút toán REVERSAL đối ứng, không xóa bút toán EARN gốc.
   */
  async reverseForOrder(
    sourceOrderId: string,
    reason: string,
    manager?: EntityManager,
  ): Promise<void> {
    const runner = manager ?? this.dataSource.manager;
    const ledgerRepo = runner.getRepository(RewardLedgerEntryEntity);

    const earnEntry = await ledgerRepo.findOne({
      where: { sourceOrderId, entryType: RewardEntryType.EARN },
    });
    if (!earnEntry) return; // Chưa từng cộng điểm cho đơn này - không có gì để hoàn tác.

    const alreadyReversed = await ledgerRepo.findOne({
      where: { reversalOfEntryId: earnEntry.id },
    });
    if (alreadyReversed) return; // Idempotent - đã hoàn tác trước đó.

    const reversal = ledgerRepo.create({
      customerId: earnEntry.customerId,
      sourceOrderId,
      entryType: RewardEntryType.REVERSAL,
      pointsDelta: -earnEntry.pointsDelta,
      ruleVersion: earnEntry.ruleVersion,
      reversalOfEntryId: earnEntry.id,
      reason,
    });
    await ledgerRepo.save(reversal);

    // Không để số dư âm (BR-C04-04): nếu khách đã đổi hết điểm trước khi hoàn tác,
    // số dư chỉ trừ đến 0, phần chênh được ghi nhận lại trong nhật ký, không chặn hủy đơn.
    await runner.query(
      `UPDATE reward_accounts SET
         points_balance = GREATEST(0, points_balance - $2),
         updated_at = NOW()
       WHERE customer_id = $1;`,
      [earnEntry.customerId, earnEntry.pointsDelta],
    );

    await this.auditLogService.log({
      actorId: '00000000-0000-0000-0000-000000000000',
      actorRole: 'SYSTEM',
      action: 'REWARD_POINTS_REVERSED',
      targetType: 'REWARD_LEDGER_ENTRY',
      targetId: earnEntry.id,
      newValue: { sourceOrderId, points: earnEntry.pointsDelta, reason },
    });
  }

  /** Đổi điểm lấy ưu đãi - trừ điểm nguyên tử, không để số dư âm (BR-C04-04). */
  async redeem(customerId: string, dto: RedeemRewardDto): Promise<RewardBalance> {
    if (dto.points > REWARDS_CONSTANTS.MAX_REDEEM_PER_REQUEST) {
      throw new BadRequestException(
        `Mỗi lần đổi tối đa ${REWARDS_CONSTANTS.MAX_REDEEM_PER_REQUEST} điểm.`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // Lưu ý: manager.query() cho UPDATE/DELETE trả về tuple [rows, rowCount],
      // không phải mảng rows trực tiếp - phải destructure, không dùng .length trên kết quả thô.
      const [rows]: [Array<{ points_balance: number }>, number] = await manager.query(
        `UPDATE reward_accounts SET
           points_balance = points_balance - $2,
           updated_at = NOW()
         WHERE customer_id = $1 AND points_balance >= $2
         RETURNING points_balance;`,
        [customerId, dto.points],
      );

      if (rows.length === 0) {
        throw new BadRequestException('Số dư điểm không đủ để đổi (BR-C04-04).');
      }

      const ledgerRepo = manager.getRepository(RewardLedgerEntryEntity);
      const entry = ledgerRepo.create({
        customerId,
        entryType: RewardEntryType.REDEEM,
        pointsDelta: -dto.points,
        ruleVersion: REWARDS_CONSTANTS.RULE_VERSION,
        redemptionId: dto.redemptionId,
        reason: `Đổi điểm lấy ưu đãi [${dto.redemptionId}]`,
      });
      await ledgerRepo.save(entry);

      await this.auditLogService.log({
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action: 'REWARD_POINTS_REDEEMED',
        targetType: 'REWARD_LEDGER_ENTRY',
        targetId: entry.id,
        newValue: { points: dto.points, redemptionId: dto.redemptionId },
      });

      return {
        customerId,
        pointsBalance: rows[0].points_balance,
        updatedAt: new Date(),
      };
    });
  }
}
