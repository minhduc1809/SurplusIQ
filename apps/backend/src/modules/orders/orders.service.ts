import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderEntity } from './order.entity';
import { OfferEntity } from '../offers/offer.entity';
import { QrTokenEngine } from '@surplusiq/core';

@Injectable()
export class OrdersService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'surplusiq_super_secret_jwt_key_2026';

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Đặt suất cứu món với Transaction & Lock FOR UPDATE để chống bán lố tồn kho khi nhiều người đặt cùng lúc
   */
  async createOrder(buyerId: string, offerId: string, quantity: number = 1) {
    return this.dataSource.transaction(async (manager) => {
      // 1. Khóa bản ghi offer để kiểm tra và trừ tồn kho an toàn tuyệt đối
      const offer = await manager
        .createQueryBuilder(OfferEntity, 'offer')
        .setLock('pessimistic_write')
        .where('offer.id = :id', { id: offerId })
        .getOne();

      if (!offer) {
        throw new NotFoundException('Suất cứu món không tồn tại');
      }

      if (offer.status !== 'ACTIVE' || offer.remainingQuantity < quantity) {
        throw new BadRequestException('Món này đã hết suất hoặc không còn đủ số lượng yêu cầu');
      }

      // 2. Trừ tồn kho nguyên tử
      offer.remainingQuantity -= quantity;
      if (offer.remainingQuantity === 0) {
        offer.status = 'SOLD_OUT';
      }
      await manager.save(offer);

      // 3. Tạo QR Token bảo mật dùng 1 lần (hạn 3 tiếng)
      const expiresAt = Date.now() + 3 * 60 * 60 * 1000;
      const orderId = crypto.randomUUID();

      const qrToken = QrTokenEngine.generateToken(
        {
          orderId,
          storeId: offer.storeId,
          buyerId,
          expiresAt,
        },
        this.jwtSecret,
      );

      // 4. Lưu đơn hàng
      const order = manager.create(OrderEntity, {
        id: orderId,
        offerId: offer.id,
        storeId: offer.storeId,
        buyerId,
        quantity,
        totalPrice: offer.discountPrice * quantity,
        status: 'PAID',
        qrToken,
        qrTokenExpiresAt: new Date(expiresAt),
      });

      return manager.save(order);
    });
  }

  /**
   * Cửa hàng quét QR nhận hàng của khách
   */
  async claimOrder(qrToken: string, storeId: string) {
    const verification = QrTokenEngine.verifyToken(qrToken, this.jwtSecret);
    if (!verification.isValid || !verification.payload) {
      throw new BadRequestException(verification.error || 'Mã QR không hợp lệ');
    }

    const { orderId } = verification.payload;

    const order = await this.dataSource
      .getRepository(OrderEntity)
      .findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    if (order.storeId !== storeId) {
      throw new BadRequestException('Mã QR này không thuộc về cửa hàng của bạn');
    }

    if (order.status === 'CLAIMED') {
      throw new BadRequestException('Mã QR này đã được sử dụng để nhận hàng trước đó!');
    }

    order.status = 'CLAIMED';
    order.claimedAt = new Date();
    await this.dataSource.getRepository(OrderEntity).save(order);

    return {
      success: true,
      message: 'Xác nhận giao hàng thành công!',
      orderId: order.id,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
    };
  }
}
