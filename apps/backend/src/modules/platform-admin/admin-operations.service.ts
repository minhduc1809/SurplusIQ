import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull, Not } from 'typeorm';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import {
  PaymentKind,
  PaymentTransactionEntity,
} from '../../entities/orders/payment-transaction.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import { decryptField } from '../../common/crypto/field-crypto';
import { UserRole } from '../../entities/auth/user.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import {
  ViolationReportEntity,
  ViolationStatus,
} from '../../entities/complaints/violation-report.entity';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { PlanQuotaEntity } from '../../entities/subscriptions/plan-quota.entity';
import {
  SubscriptionEntity,
  SubscriptionPlan,
} from '../../entities/subscriptions/subscription.entity';
import { UpdateStoreSettingsDto } from '../settings/dto/update-store-settings.dto';
import { SettingsService } from '../settings/settings.service';
import { decideComplaint } from '../customer-interactions/complaint-decision';
import { PLAN_QUOTAS_MAP, QuotaKey } from '../subscriptions/quota.constants';
import { QuotaService } from '../subscriptions/quota.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  CreateAdminQuotaDto,
  ResolveAdminComplaintDto,
  UpdateAdminQuotaDto,
  UpdateAdminReviewDto,
  UpdateAdminViolationDto,
} from './dto/admin-operations.dto';

@Injectable()
export class AdminOperationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    private readonly quotaService: QuotaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async resolveComplaint(id: string, actorId: string, dto: ResolveAdminComplaintDto) {
    return this.dataSource.transaction(async (manager) => {
      const { complaint, oldValue, refundTransaction } = await decideComplaint(manager, id, dto);
      await this.audit(
        manager,
        actorId,
        'ADMIN_COMPLAINT_RESOLVED',
        'COMPLAINT',
        id,
        complaint.storeId,
        this.record(oldValue),
        { ...this.record(complaint), resolutionNote: dto.reason?.trim() || null },
      );
      return { success: true, complaint, refundTransaction };
    });
  }

  async updateViolation(id: string, actorId: string, dto: UpdateAdminViolationDto) {
    return this.dataSource.transaction(async (manager) => {
      const violation = await manager.findOne(ViolationReportEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!violation) throw new NotFoundException('Không tìm thấy báo cáo vi phạm.');
      const oldValue = this.record(violation);
      violation.status = dto.status as ViolationStatus;
      await manager.save(violation);
      await this.audit(
        manager,
        actorId,
        'ADMIN_VIOLATION_REVIEWED',
        'VIOLATION_REPORT',
        id,
        null,
        oldValue,
        this.record(violation),
      );
      return violation;
    });
  }

  async updateReview(id: string, actorId: string, dto: UpdateAdminReviewDto) {
    return this.dataSource.transaction(async (manager) => {
      const review = await manager.findOne(ReviewEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!review) throw new NotFoundException('Không tìm thấy đánh giá.');
      const oldValue = this.record(review);
      review.status = dto.status as ReviewStatus;
      await manager.save(review);
      await this.audit(
        manager,
        actorId,
        'ADMIN_REVIEW_MODERATED',
        'REVIEW',
        id,
        review.storeId,
        oldValue,
        this.record(review),
      );
      return review;
    });
  }

  async updateStoreSettings(id: string, actorId: string, dto: UpdateStoreSettingsDto) {
    for (const [key, value] of Object.entries(dto)) {
      if (value === null && key !== 'costPriceRatio' && key !== 'fixedDiscountSchedule')
        throw new BadRequestException(`Cấu hình ${key} không được để trống.`);
    }
    for (const value of [dto.defaultPickupStart, dto.defaultPickupEnd]) {
      if (value !== undefined && !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value))
        throw new BadRequestException('Giờ nhận hàng phải theo định dạng HH:mm hoặc HH:mm:ss.');
    }
    for (const value of [dto.lateGraceMinutes, dto.maxQtyPerOrder]) {
      if (value !== undefined && !Number.isInteger(value))
        throw new BadRequestException('Thời gian gia hạn và số lượng phải là số nguyên.');
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const store = await manager.findOne(StoreEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!store) throw new NotFoundException('Không tìm thấy cửa hàng.');
      const effectivePlan = await this.quotaService.getEffectivePlan(id, manager);
      const isPro =
        effectivePlan === SubscriptionPlan.PRO || effectivePlan === SubscriptionPlan.TRIAL;
      return this.settingsService.updateStoreSettings(
        id,
        actorId,
        dto,
        isPro,
        (tx, previous, updated) =>
          this.audit(
            tx,
            actorId,
            'ADMIN_STORE_SETTINGS_UPDATED',
            'STORE_SETTINGS',
            id,
            id,
            previous ? this.record(previous) : null,
            this.record(updated),
          ),
        manager,
      );
    });
    await this.settingsService.invalidateStoreSettingsCache(id);
    return result;
  }

  async changeSubscription(id: string, actorId: string, action: string) {
    if (!['upgrade', 'renew', 'downgrade'].includes(action))
      throw new BadRequestException('Chỉ hỗ trợ upgrade, renew hoặc downgrade.');
    const result = await this.dataSource.transaction(async (manager) => {
      const store = await manager.findOne(StoreEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!store) throw new NotFoundException('Không tìm thấy cửa hàng.');
      const oldValue = await manager.findOne(SubscriptionEntity, { where: { storeId: id } });
      const result =
        action === 'upgrade'
          ? await this.subscriptionsService.upgradeToPro(id, manager)
          : action === 'renew'
            ? await this.subscriptionsService.renewPro(id, manager)
            : await this.subscriptionsService.downgradeToBasic(id, manager);
      await this.audit(
        manager,
        actorId,
        `ADMIN_SUBSCRIPTION_${action.toUpperCase()}`,
        'SUBSCRIPTION',
        id,
        id,
        oldValue ? this.record(oldValue) : null,
        this.record(result),
      );
      return result;
    });
    await this.settingsService.invalidateStoreSettingsCache(id);
    return result;
  }

  async createQuota(actorId: string, dto: CreateAdminQuotaDto) {
    this.validateQuotaPlan(dto.plan);
    const definition = PLAN_QUOTAS_MAP[dto.quotaKey];
    if (!definition || dto.period !== definition.period)
      throw new BadRequestException('Chu kỳ phải khớp định nghĩa của loại hạn mức.');
    this.validateQuotaValue(dto.quotaValue);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await manager.findOne(PlanQuotaEntity, {
          where: { plan: dto.plan, quotaKey: dto.quotaKey },
        });
        if (existing)
          throw new ConflictException('Hạn mức của gói này đã tồn tại; hãy dùng chức năng sửa.');
        const quota = manager.create(PlanQuotaEntity, dto);
        await manager.save(quota);
        await this.audit(
          manager,
          actorId,
          'ADMIN_QUOTA_CREATED',
          'PLAN_QUOTA',
          quota.id,
          null,
          null,
          this.record(quota),
        );
        return quota;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Hạn mức của gói này đã tồn tại.');
      throw error;
    }
  }

  async updateQuota(id: string, actorId: string, dto: UpdateAdminQuotaDto) {
    this.validateQuotaValue(dto.quotaValue);
    return this.dataSource.transaction(async (manager) => {
      const quota = await manager.findOne(PlanQuotaEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!quota) throw new NotFoundException('Không tìm thấy hạn mức ghi đè.');
      this.validateQuotaPlan(quota.plan);
      const oldValue = this.record(quota);
      quota.quotaValue = dto.quotaValue;
      await manager.save(quota);
      await this.audit(
        manager,
        actorId,
        'ADMIN_QUOTA_UPDATED',
        'PLAN_QUOTA',
        id,
        null,
        oldValue,
        this.record(quota),
      );
      return quota;
    });
  }

  async deleteQuota(id: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const quota = await manager.findOne(PlanQuotaEntity, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!quota) throw new NotFoundException('Không tìm thấy hạn mức ghi đè.');
      this.validateQuotaPlan(quota.plan);
      const definition = PLAN_QUOTAS_MAP[quota.quotaKey as QuotaKey];
      const oldValue = this.record(quota);
      const fallbackValue = definition?.limits[quota.plan] ?? null;
      await manager.remove(quota);
      await this.audit(manager, actorId, 'ADMIN_QUOTA_DELETED', 'PLAN_QUOTA', id, null, oldValue, {
        fallbackValue,
      });
      return { success: true, deletedId: id, fallbackValue };
    });
  }

  private validateQuotaValue(value: number) {
    if (!Number.isInteger(value) || value < 0 || value > 2147483647)
      throw new BadRequestException('Hạn mức phải là số nguyên không âm hợp lệ.');
  }

  private validateQuotaPlan(plan: SubscriptionPlan) {
    if (plan === SubscriptionPlan.TRIAL)
      throw new BadRequestException('TRIAL sử dụng hạn mức PRO. Vui lòng chỉnh cấu hình PRO.');
    if (plan !== SubscriptionPlan.BASIC && plan !== SubscriptionPlan.PRO)
      throw new BadRequestException('Gói hạn mức không hợp lệ.');
  }

  private record(value: object): Record<string, unknown> {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }

  /** Biên lai khách gửi đang chờ đối chiếu với sao kê ngân hàng (KX02). */
  async listPaymentProofs() {
    const orders = await this.dataSource.manager.find(OrderEntity, {
      where: { status: OrderStatus.PENDING_PAYMENT, paymentProofUrl: Not(IsNull()) },
      order: { paymentProofUploadedAt: 'ASC' },
    });
    return orders.map((o) => ({
      orderId: o.id,
      orderCode: o.code,
      storeId: o.storeId,
      amount: o.totalAmount,
      transferMessage: `SUQ${o.code}`,
      proofUrl: o.paymentProofUrl,
      uploadedAt: o.paymentProofUploadedAt,
      holdExpiresAt: o.holdExpiresAt,
    }));
  }

  /**
   * Lệnh hoàn tiền chờ chuyển khoản. Quản trị nền tảng là bên duy nhất thấy số tài khoản đầy đủ.
   * Lệnh tạo khi khách chưa có tài khoản nhận thì lấy tài khoản hiện tại của khách nếu đã bổ sung.
   */
  async listRefundPayouts() {
    const m = this.dataSource.manager;
    const txns = await m.find(PaymentTransactionEntity, {
      where: { kind: PaymentKind.ORDER_REFUND, payoutStatus: 'PENDING' },
      order: { createdAt: 'ASC' },
    });
    const orderIds = txns.map((t) => t.orderId).filter((id): id is string => !!id);
    const orders = orderIds.length
      ? await m.find(OrderEntity, { where: { id: In(orderIds) } })
      : [];
    const byId = new Map(orders.map((o) => [o.id, o]));
    return Promise.all(
      txns.map(async (t) => {
        const order = byId.get(t.orderId ?? '');
        let dest: {
          bankBin?: string;
          bankName: string;
          accountHolder: string;
          accountNumber: string;
        } | null = null;
        if (t.refundDestination) {
          dest = {
            bankBin: t.refundDestination.bankBin,
            bankName: t.refundDestination.bankName,
            accountHolder: t.refundDestination.accountHolder,
            accountNumber: decryptField(t.refundDestination.accountNumberEnc),
          };
        } else if (order) {
          const acc = (
            await m.findOne(CustomerProfileEntity, { where: { userId: order.customerId } })
          )?.refundBankAccount;
          if (acc) {
            dest = {
              bankBin: acc.bankBin,
              bankName: acc.bankName,
              accountHolder: acc.accountHolder,
              accountNumber: acc.accountNumberEnc
                ? decryptField(acc.accountNumberEnc)
                : (acc.accountNumber ?? ''),
            };
          }
        }
        return {
          id: t.id,
          orderCode: order?.code ?? null,
          amount: t.amount,
          createdAt: t.createdAt,
          destination: dest,
        };
      }),
    );
  }

  /** Ghi nhận đã chuyển khoản hoàn tiền kèm mã giao dịch ngân hàng. */
  async markRefundPaid(id: string, actorId: string, reference: string) {
    return this.dataSource.transaction(async (manager) => {
      const txn = await manager.findOne(PaymentTransactionEntity, {
        where: { id, kind: PaymentKind.ORDER_REFUND },
        lock: { mode: 'pessimistic_write' },
      });
      if (!txn) throw new NotFoundException('Không tìm thấy lệnh hoàn tiền.');
      if (txn.payoutStatus !== 'PENDING') {
        throw new ConflictException('Lệnh hoàn tiền này không ở trạng thái chờ chi trả.');
      }
      txn.payoutStatus = 'PAID';
      txn.payoutReference = reference.trim();
      txn.paidOutAt = new Date();
      txn.paidOutBy = actorId;
      await manager.save(txn);
      await this.audit(
        manager,
        actorId,
        'REFUND_PAID_OUT',
        'PAYMENT_TRANSACTION',
        txn.id,
        txn.storeId,
        null,
        {
          amount: txn.amount,
          reference: txn.payoutReference,
        },
      );
      return {
        id: txn.id,
        payoutStatus: txn.payoutStatus,
        payoutReference: txn.payoutReference,
        paidOutAt: txn.paidOutAt,
      };
    });
  }

  private async audit(
    manager: EntityManager,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
    storeId: string | null,
    oldValue: Record<string, unknown> | null,
    newValue: Record<string, unknown> | null,
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
}
