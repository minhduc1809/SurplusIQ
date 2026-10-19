import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities/subscriptions/subscription.entity';
import {
  SubscriptionInvoiceEntity,
  InvoiceStatus,
} from '../../entities/subscriptions/subscription-invoice.entity';
import { StoreSettingsEntity, PricingMode } from '../../entities/stores/store-settings.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import {
  StoreMemberEntity,
  StoreMemberStatus,
  StorePermission,
} from '../../entities/stores/store-member.entity';
import { QuotaService } from './quota.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subRepo: Repository<SubscriptionEntity>,
    @InjectRepository(SubscriptionInvoiceEntity)
    private readonly invoiceRepo: Repository<SubscriptionInvoiceEntity>,
    @InjectRepository(StoreSettingsEntity)
    private readonly storeSettingsRepo: Repository<StoreSettingsEntity>,
    @InjectRepository(StoreMemberEntity)
    private readonly storeMemberRepo: Repository<StoreMemberEntity>,
    private readonly quotaService: QuotaService,
    private readonly settingsService: SettingsService,
  ) {}

  private async withStoreLock<T>(
    storeId: string,
    mutate: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const result = await this.subRepo.manager.transaction(async (manager) => {
      const store = await manager.findOne(StoreEntity, {
        where: { id: storeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!store) throw new NotFoundException('Không tìm thấy cửa hàng.');
      return mutate(manager);
    });
    await this.settingsService.invalidateStoreSettingsCache(storeId);
    return result;
  }

  private async formatSubscription(sub: SubscriptionEntity, manager?: EntityManager) {
    const effectivePlan = await this.quotaService.getEffectivePlan(sub.storeId, manager);
    const now = new Date();
    const periodEnd = sub.periodEnd ? new Date(sub.periodEnd) : null;
    const msRemaining = periodEnd ? Math.max(0, periodEnd.getTime() - now.getTime()) : 0;
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    return {
      storeId: sub.storeId,
      plan: sub.plan,
      effectivePlan,
      status: sub.status,
      periodStart: sub.periodStart,
      periodEnd: sub.periodEnd,
      daysRemaining,
      trialUsed: sub.trialUsed,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      downgradeAtPeriodEnd: sub.downgradeAtPeriodEnd,
      isTrial: sub.plan === SubscriptionPlan.TRIAL,
    };
  }

  /**
   * Lấy thông tin gói dịch vụ hiện tại và quyền lợi của cửa hàng (R2-011, VC-01..VC-06)
   */
  async getCurrentSubscription(storeId: string) {
    let sub = await this.subRepo.findOne({
      where: { storeId },
    });

    if (!sub) {
      sub = this.subRepo.create({
        storeId,
        plan: SubscriptionPlan.BASIC,
        status: SubscriptionStatus.ACTIVE,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1000), // Vô thời hạn
        trialUsed: false,
      });
      await this.subRepo.save(sub);
    }

    return this.formatSubscription(sub);
  }

  /**
   * Nâng cấp gói Pro (VC-02, kỳ 30 ngày tính từ thời điểm kích hoạt)
   */
  async upgradeToPro(storeId: string, manager?: EntityManager) {
    if (!manager) return this.withStoreLock(storeId, (tx) => this.upgradeToPro(storeId, tx));
    const subRepo = manager.getRepository(SubscriptionEntity);
    const invoiceRepo = manager.getRepository(SubscriptionInvoiceEntity);
    let sub = await subRepo.findOne({
      where: { storeId },
    });

    if (
      sub?.plan === SubscriptionPlan.PRO &&
      sub.status === SubscriptionStatus.ACTIVE &&
      sub.periodEnd &&
      new Date(sub.periodEnd) > new Date()
    ) {
      throw new ConflictException(
        'Cửa hàng đang có gói PRO còn hạn. Hãy dùng gia hạn để giữ nguyên thời gian đã thanh toán.',
      );
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (!sub) {
      sub = subRepo.create({
        storeId,
        plan: SubscriptionPlan.PRO,
        status: SubscriptionStatus.ACTIVE,
        periodStart: now,
        periodEnd,
        trialUsed: true,
      });
    } else {
      sub.plan = SubscriptionPlan.PRO;
      sub.status = SubscriptionStatus.ACTIVE;
      sub.periodStart = now;
      sub.periodEnd = periodEnd;
      sub.cancelAtPeriodEnd = false;
      sub.downgradeAtPeriodEnd = false;
    }

    const saved = await subRepo.save(sub);

    // Tạo hóa đơn gói Pro bất biến 300.000đ (BR-049, VC-02, VC-10)
    const invoice = invoiceRepo.create({
      storeId,
      periodStart: now,
      periodEnd,
      amount: 300000,
      paymentTxnId: `sub_pay_${storeId}_${randomUUID()}`,
      status: InvoiceStatus.PAID,
    });
    await invoiceRepo.save(invoice);

    return this.formatSubscription(saved, manager);
  }

  /**
   * Gia hạn gói Pro (VC-03: trước hạn nối tiếp +30 ngày, sau hạn tính từ lúc gia hạn)
   */
  async renewPro(storeId: string, manager?: EntityManager) {
    if (!manager) return this.withStoreLock(storeId, (tx) => this.renewPro(storeId, tx));
    const subRepo = manager.getRepository(SubscriptionEntity);
    const invoiceRepo = manager.getRepository(SubscriptionInvoiceEntity);
    const sub = await subRepo.findOne({ where: { storeId } });
    if (!sub) {
      throw new NotFoundException('Không tìm thấy thông tin gói dịch vụ');
    }

    const now = new Date();
    let newStart = now;
    let invoiceStart = now;
    let newEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (sub.plan === SubscriptionPlan.PRO && sub.periodEnd && new Date(sub.periodEnd) > now) {
      // Gia hạn trước hạn: kỳ mới nối tiếp kỳ cũ (+30 ngày)
      newStart = new Date(sub.periodStart);
      invoiceStart = new Date(sub.periodEnd);
      newEnd = new Date(new Date(sub.periodEnd).getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    sub.plan = SubscriptionPlan.PRO;
    sub.status = SubscriptionStatus.ACTIVE;
    sub.periodStart = newStart;
    sub.periodEnd = newEnd;
    sub.cancelAtPeriodEnd = false;
    sub.downgradeAtPeriodEnd = false;

    const saved = await subRepo.save(sub);

    // Tạo hóa đơn gia hạn
    const invoice = invoiceRepo.create({
      storeId,
      periodStart: invoiceStart,
      periodEnd: newEnd,
      amount: 300000,
      paymentTxnId: `sub_renew_${storeId}_${randomUUID()}`,
      status: InvoiceStatus.PAID,
    });
    await invoiceRepo.save(invoice);

    return this.formatSubscription(saved, manager);
  }

  /**
   * Hạ cấp về gói Basic (VC-05: hiệu lực cuối kỳ nếu đang Pro; dừng ngay nếu đang Trial)
   */
  async downgradeToBasic(storeId: string, manager?: EntityManager) {
    if (!manager) return this.withStoreLock(storeId, (tx) => this.downgradeToBasic(storeId, tx));
    const subRepo = manager.getRepository(SubscriptionEntity);
    const storeSettingsRepo = manager.getRepository(StoreSettingsEntity);
    const storeMemberRepo = manager.getRepository(StoreMemberEntity);
    const sub = await subRepo.findOne({ where: { storeId } });
    if (!sub) {
      throw new NotFoundException('Không tìm thấy thông tin gói dịch vụ');
    }

    if (sub.plan === SubscriptionPlan.TRIAL) {
      // Dừng ngay lập tức về Basic
      sub.plan = SubscriptionPlan.BASIC;
      sub.periodEnd = new Date();
      sub.downgradeAtPeriodEnd = false;
      await subRepo.save(sub);

      // Tắt AUTO pricing & khóa nhân viên thừa
      const settings = await storeSettingsRepo.findOne({ where: { storeId } });
      if (settings) {
        settings.pricingMode = PricingMode.MANUAL;
        await storeSettingsRepo.save(settings);
      }

      const staffList = await storeMemberRepo.find({
        where: { storeId, status: StoreMemberStatus.ACTIVE },
        order: { createdAt: 'ASC' },
      });
      let activeKept = 0;
      for (const m of staffList) {
        if (m.permission === StorePermission.OWNER) continue;
        if (activeKept < 1) {
          activeKept++;
        } else {
          m.status = StoreMemberStatus.LOCKED;
          await storeMemberRepo.save(m);
        }
      }
    } else if (sub.plan === SubscriptionPlan.PRO) {
      // Đánh dấu hạ cấp vào cuối kỳ (VC-05)
      sub.downgradeAtPeriodEnd = true;
      await subRepo.save(sub);
    }

    return this.formatSubscription(sub, manager);
  }

  /**
   * Hủy gói Pro (VC-08: giữ nguyên quyền đến period_end)
   */
  async cancelPro(storeId: string, manager?: EntityManager) {
    if (!manager) return this.withStoreLock(storeId, (tx) => this.cancelPro(storeId, tx));
    const subRepo = manager.getRepository(SubscriptionEntity);
    const sub = await subRepo.findOne({
      where: { storeId },
    });

    if (!sub) {
      throw new NotFoundException('Không tìm thấy thông tin gói dịch vụ');
    }

    if (sub.plan === SubscriptionPlan.TRIAL) {
      sub.plan = SubscriptionPlan.BASIC;
      sub.periodEnd = new Date();
      sub.cancelAtPeriodEnd = false;
    } else if (sub.plan === SubscriptionPlan.PRO) {
      sub.cancelAtPeriodEnd = true;
    }

    const saved = await subRepo.save(sub);
    return this.formatSubscription(saved, manager);
  }

  /**
   * Lấy danh sách hóa đơn thuê bao (R2-015)
   */
  async getInvoices(storeId: string) {
    return this.invoiceRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Tải hóa đơn PDF (R2-015)
   */
  async getInvoicePdf(storeId: string, invoiceId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, storeId },
    });
    if (!invoice) {
      throw new NotFoundException('Hóa đơn không tồn tại hoặc không thuộc cửa hàng');
    }

    const pdfContent = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
      `4 0 obj << /Length 120 >> stream`,
      `BT /F1 14 Tf 50 700 Td (SURPLUSIQ INVOICE: ${invoice.id}) Tj ET`,
      `BT /F1 12 Tf 50 670 Td (Store: ${storeId}) Tj ET`,
      `BT /F1 12 Tf 50 640 Td (Amount: ${invoice.amount} VND) Tj ET`,
      `BT /F1 12 Tf 50 610 Td (Status: ${invoice.status}) Tj ET`,
      'endstream endobj',
      'xref',
      '0 5',
      '0000000000 65535 f ',
      '0000000010 00000 n ',
      '0000000060 00000 n ',
      '0000000115 00000 n ',
      '0000000215 00000 n ',
      'trailer << /Size 5 /Root 1 0 R >>',
      'startxref',
      '400',
      '%%EOF',
    ].join('\n');

    return {
      invoiceId: invoice.id,
      storeId: invoice.storeId,
      amount: invoice.amount,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      status: invoice.status,
      filename: `invoice-${invoice.id}.pdf`,
      contentType: 'application/pdf',
      dataBase64: Buffer.from(pdfContent).toString('base64'),
    };
  }
}
