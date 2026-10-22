import { Injectable, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThanOrEqual, QueryFailedError, Repository } from 'typeorm';
import {
  PromotionEntity,
  PromotionStatus,
  PromotionTarget,
  PromotionType,
} from '../../entities/marketing/promotion.entity';
import { PromotionWalletEntity } from '../../entities/marketing/promotion-wallet.entity';
import { RewardAccountEntity } from '../../entities/rewards/reward-account.entity';
import {
  RewardEntryType,
  RewardLedgerEntryEntity,
} from '../../entities/rewards/reward-ledger-entry.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { MAX_REDEEM_PER_DAY, REWARDS_CONSTANTS, REWARD_CATALOG } from './rewards.constants';
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
export class RewardsService implements OnModuleInit {
  private readonly logger = new Logger(RewardsService.name);

  /**
   * shortcut: hẹn giờ trong tiến trình thay vì hàng đợi BullMQ; an toàn khi chạy nhiều bản vì có khóa tư vấn
   * Postgres, đổi sang tác vụ BullMQ khi cần theo dõi lịch sử chạy.
   */
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    setInterval(
      () => void this.expireDuePoints().catch((e) => this.logger.error(`[REWARDS_EXPIRE] ${e}`)),
      60 * 60 * 1000,
    ).unref();
  }

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

  /** Danh mục đổi điểm kèm số dư, để app hiện đúng điều kiện trước khi khách xác nhận (BR-C04-03). */
  async getCatalog(customerId: string) {
    const balance = await this.getBalance(customerId);
    const redeemedToday = await this.countRedeemedToday(customerId);
    return {
      pointsBalance: balance.pointsBalance,
      dailyLimit: MAX_REDEEM_PER_DAY,
      redeemedToday,
      items: REWARD_CATALOG.map((c) => ({
        ...c,
        canRedeem: balance.pointsBalance >= c.points && redeemedToday < MAX_REDEEM_PER_DAY,
        shortfall: Math.max(0, c.points - balance.pointsBalance),
      })),
    };
  }

  /** Quy tắc chương trình điểm: mọi con số lấy từ cấu hình đang chạy nên không lệch với hành vi thật (KC14). */
  getRules() {
    const c = REWARDS_CONSTANTS;
    return {
      ruleVersion: c.RULE_VERSION,
      sections: [
        {
          title: 'Cách nhận điểm',
          body: `Mỗi ${c.POINTS_PER_VND_DIVISOR.toLocaleString('vi-VN')}đ giá trị đơn đã nhận thành công được 1 điểm, làm tròn xuống. Đơn chưa nhận, đơn hủy hoặc đơn không đến nhận không được cộng điểm.`,
        },
        {
          title: 'Hạn dùng điểm',
          body: `Điểm hết hạn sau ${c.POINTS_EXPIRY_DAYS} ngày kể từ ngày nhận. Điểm cũ nhất được dùng trước và hết hạn trước.`,
        },
        {
          title: 'Đổi điểm lấy voucher',
          body: `Voucher do SurplusIQ tài trợ, dùng ở mọi cửa hàng, mỗi mã một lần, hiệu lực ${REWARD_CATALOG[0].validDays} ngày. Tối đa ${MAX_REDEEM_PER_DAY} lượt đổi mỗi ngày. Voucher chỉ có trong ví của bạn, không chuyển nhượng được.`,
        },
        {
          title: 'Khi đơn được hoàn tiền',
          body: 'Điểm đã cộng cho đơn được hoàn tiền sẽ bị trừ lại bằng một bút toán điều chỉnh; lịch sử không bị xóa. Điểm không thay thế tiền hoàn của đơn.',
        },
        {
          title: 'Khi chương trình tạm dừng hoặc xóa tài khoản',
          body: 'Điểm hiện có được giữ nguyên khi chương trình tạm dừng. Khi bạn xóa tài khoản, điểm và voucher chưa dùng sẽ mất cùng tài khoản.',
        },
        {
          title: 'Nghi ngờ gian lận',
          body: 'Giao dịch nghi ngờ lạm dụng có thể được rà soát; SurplusIQ không tự kết luận trước khi xem xét.',
        },
      ],
    };
  }

  private countRedeemedToday(customerId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.ledgerRepo.count({
      where: {
        customerId,
        entryType: RewardEntryType.REDEEM,
        createdAt: MoreThanOrEqual(startOfDay),
      },
    });
  }

  /**
   * Đổi điểm lấy voucher (BR-C04-04): giá điểm lấy từ danh mục chứ không nhận từ app; trừ điểm, tạo voucher
   * trong ví và ghi bút toán cùng một giao dịch nên không thể mất điểm mà không có voucher.
   */
  async redeem(customerId: string, dto: RedeemRewardDto) {
    const item = REWARD_CATALOG.find((c) => c.id === dto.redemptionId);
    if (!item) throw new BadRequestException('Ưu đãi không tồn tại trong danh mục đổi điểm.');
    if ((await this.countRedeemedToday(customerId)) >= MAX_REDEEM_PER_DAY) {
      throw new BadRequestException(`Mỗi ngày chỉ đổi tối đa ${MAX_REDEEM_PER_DAY} lần.`);
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
        [customerId, item.points],
      );

      if (rows.length === 0) {
        throw new BadRequestException('Số dư điểm không đủ để đổi (BR-C04-04).');
      }

      const now = new Date();
      const promo = await manager.save(
        manager.create(PromotionEntity, {
          storeId: null,
          fundedBy: 'PLATFORM',
          name: item.name,
          type: PromotionType.FIXED,
          value: item.valueVnd,
          target: PromotionTarget.ALL,
          maxUses: 1,
          usedCount: 0,
          startAt: now,
          endAt: new Date(now.getTime() + item.validDays * 24 * 60 * 60 * 1000),
          minOrderAmount: item.minOrderVnd,
          status: PromotionStatus.ACTIVE,
        }),
      );
      await manager.save(
        manager.create(PromotionWalletEntity, {
          customerId,
          promotionId: promo.id,
          claimedAt: now,
          usedAt: null,
          orderId: null,
        }),
      );

      const ledgerRepo = manager.getRepository(RewardLedgerEntryEntity);
      const entry = ledgerRepo.create({
        customerId,
        entryType: RewardEntryType.REDEEM,
        pointsDelta: -item.points,
        ruleVersion: REWARDS_CONSTANTS.RULE_VERSION,
        redemptionId: item.id,
        reason: `Đổi điểm lấy ${item.name}`,
      });
      await ledgerRepo.save(entry);

      await this.auditLogService.log({
        actorId: customerId,
        actorRole: 'CUSTOMER',
        action: 'REWARD_POINTS_REDEEMED',
        targetType: 'REWARD_LEDGER_ENTRY',
        targetId: entry.id,
        newValue: { points: item.points, redemptionId: item.id, promotionId: promo.id },
      });

      return {
        customerId,
        pointsBalance: rows[0].points_balance,
        updatedAt: now,
        voucher: {
          promotionId: promo.id,
          name: item.name,
          valueVnd: item.valueVnd,
          minOrderVnd: item.minOrderVnd,
          expiresAt: promo.endAt,
        },
      };
    });
  }

  /**
   * Hết hạn điểm (KC14): điểm kiếm đã quá hạn mà chưa được dùng thì trừ khỏi số dư bằng bút toán EXPIRE.
   * Quy ước điểm cũ nhất dùng trước: số điểm đã dùng hoặc hoàn tác được trừ dần vào các khoản kiếm cũ nhất.
   */
  async expireDuePoints(now = new Date()): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      // Chỉ một tiến trình được chạy tại một thời điểm, tránh trừ điểm hết hạn hai lần.
      const [lock] = await manager.query('SELECT pg_try_advisory_xact_lock(710001) AS locked');
      if (!lock?.locked) return 0;
      const rows: { customer_id: string; expired: string }[] = await manager.query(
        `SELECT customer_id,
                GREATEST(0,
                  SUM(CASE WHEN entry_type = 'EARN' AND expiry_at <= $1 THEN points_delta ELSE 0 END)
                  + SUM(CASE WHEN entry_type IN ('REDEEM', 'REVERSAL', 'EXPIRE') THEN points_delta ELSE 0 END)
                  + SUM(CASE WHEN entry_type = 'ADJUST' THEN LEAST(points_delta, 0) ELSE 0 END)
                ) AS expired
           FROM reward_ledger_entries
          GROUP BY customer_id
         HAVING SUM(CASE WHEN entry_type = 'EARN' AND expiry_at <= $1 THEN points_delta ELSE 0 END) > 0`,
        [now],
      );
      let count = 0;
      for (const r of rows) {
        const points = Number(r.expired);
        if (points <= 0) continue;
        const [updated]: [Array<{ points_balance: number }>, number] = await manager.query(
          `UPDATE reward_accounts SET points_balance = GREATEST(0, points_balance - $2), updated_at = NOW()
            WHERE customer_id = $1 RETURNING points_balance`,
          [r.customer_id, points],
        );
        if (updated.length === 0) continue;
        const ledger = manager.getRepository(RewardLedgerEntryEntity);
        await ledger.save(
          ledger.create({
            customerId: r.customer_id,
            entryType: RewardEntryType.EXPIRE,
            pointsDelta: -points,
            ruleVersion: REWARDS_CONSTANTS.RULE_VERSION,
            reason: `Điểm hết hạn sau ${REWARDS_CONSTANTS.POINTS_EXPIRY_DAYS} ngày`,
          }),
        );
        count += 1;
      }
      return count;
    });
  }
}
