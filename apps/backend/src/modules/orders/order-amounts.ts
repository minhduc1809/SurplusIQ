import { EntityManager } from 'typeorm';
import { PromotionEntity } from '../../entities/marketing/promotion.entity';
import { PromotionWalletEntity } from '../../entities/marketing/promotion-wallet.entity';

/** Giá trị đơn cửa hàng được tính khi đối soát: khách trả + phần nền tảng bù. */
export const orderGrossAmount = (o: { totalAmount: number; platformSubsidy?: number | null }) =>
  o.totalAmount + (o.platformSubsidy ?? 0);

/** Đơn hủy hoặc hết hạn giữ: trả lại lượt dùng ưu đãi và đưa mã về ví để khách dùng lại. */
export async function releasePromotionUse(
  manager: EntityManager,
  orderId: string,
  promotionId: string | null,
): Promise<void> {
  if (promotionId) await manager.decrement(PromotionEntity, { id: promotionId }, 'usedCount', 1);
  await manager.update(PromotionWalletEntity, { orderId }, { usedAt: null, orderId: null });
}
