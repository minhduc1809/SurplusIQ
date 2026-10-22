import { orderGrossAmount, releasePromotionUse } from './order-amounts';
import { PromotionEntity } from '../../entities/marketing/promotion.entity';
import { PromotionWalletEntity } from '../../entities/marketing/promotion-wallet.entity';

describe('order-amounts', () => {
  it('giá trị đơn của cửa hàng gồm cả phần nền tảng bù', () => {
    expect(orderGrossAmount({ totalAmount: 50000, platformSubsidy: 10000 })).toBe(60000);
    expect(orderGrossAmount({ totalAmount: 50000 })).toBe(50000);
    expect(orderGrossAmount({ totalAmount: 50000, platformSubsidy: null })).toBe(50000);
  });

  it('hủy đơn trả lượt dùng ưu đãi và đưa mã về ví chưa dùng', async () => {
    const manager = { decrement: jest.fn(), update: jest.fn() };
    await releasePromotionUse(manager as never, 'o1', 'p1');
    expect(manager.decrement).toHaveBeenCalledWith(PromotionEntity, { id: 'p1' }, 'usedCount', 1);
    expect(manager.update).toHaveBeenCalledWith(
      PromotionWalletEntity,
      { orderId: 'o1' },
      { usedAt: null, orderId: null },
    );
  });

  it('đơn không dùng ưu đãi không đụng tới lượt dùng', async () => {
    const manager = { decrement: jest.fn(), update: jest.fn() };
    await releasePromotionUse(manager as never, 'o1', null);
    expect(manager.decrement).not.toHaveBeenCalled();
  });
});
