import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserEntity, UserRole, StoreEntity, OfferEntity, AuditLogEntity } from '../../entities';
import { CryptoUtil } from '../auth/crypto.util';
import {
  buildDemoSeed,
  demoId,
  DEFAULT_DEMO_ADMIN_EMAIL,
  DEFAULT_DEMO_ADMIN_PASSWORD,
} from './demo-seed.data';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    if (process.env.SEED_DEMO_ON_STARTUP === 'true' && process.env.NODE_ENV !== 'production') {
      await this.seedDemoData();
    }
  }

  async seedDemoData() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Demo seed chỉ được dùng ngoài môi trường production.');
    }
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || DEFAULT_DEMO_ADMIN_EMAIL)
      .trim()
      .toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || DEFAULT_DEMO_ADMIN_PASSWORD;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || adminPassword.length < 12) {
      throw new ConflictException(
        'SEED_ADMIN_EMAIL phải hợp lệ và SEED_ADMIN_PASSWORD có ít nhất 12 ký tự.',
      );
    }
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(73675321)');
        const existingAdmin = await manager.findOneBy(UserEntity, { email: adminEmail });
        if (existingAdmin && existingAdmin.role !== UserRole.ADMIN) {
          throw new ConflictException(
            'Email seed ADMIN thuộc tài khoản khác. Seed không tự nâng quyền tài khoản hiện có.',
          );
        }
        const adminId = existingAdmin?.id || demoId(`admin:${adminEmail}`);
        const anchor = await manager.findOneBy(AuditLogEntity, { id: demoId('seed-anchor') });
        const plan = buildDemoSeed({
          now: anchor?.createdAt || new Date(),
          adminId,
          adminEmail,
          adminPasswordHash: existingAdmin?.passwordHash || CryptoUtil.hashPassword(adminPassword),
          demoPasswordHash: CryptoUtil.hashPassword('Surplus@1'),
        });
        for (const user of plan.users) {
          const matches = await manager.find(UserEntity, {
            where: [
              { id: user.id as string },
              { email: user.email as string },
              ...(user.phone ? [{ phone: user.phone as string }] : []),
            ],
          });
          if (matches.some((found) => found.id !== user.id || found.role !== user.role)) {
            throw new ConflictException(
              'Định danh tài khoản demo đã được sử dụng. Seed dừng để giữ nguyên dữ liệu và quyền hiện có.',
            );
          }
        }
        const insertedCounts: Record<string, number> = {};
        for (const step of plan.steps) {
          insertedCounts[step.table] =
            (insertedCounts[step.table] || 0) + (await step.run(manager));
        }
        return {
          success: true,
          message: 'Đã bổ sung dữ liệu demo còn thiếu; giữ nguyên các bản ghi đã tồn tại.',
          storesCount: await manager.count(StoreEntity),
          offersCount: await manager.count(OfferEntity),
          adminEmail,
          adminCreated: !existingAdmin,
          insertedCounts,
        };
      });
      this.logger.log(
        'Seed demo hoàn tất trong một transaction; không cập nhật mật khẩu, quyền hoặc tồn kho đã có.',
      );
      return result;
    } catch (error: unknown) {
      this.logger.error(
        'Seed demo thất bại; transaction đã rollback.',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
