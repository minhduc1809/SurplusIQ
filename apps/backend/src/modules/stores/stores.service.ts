import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { StoreEntity } from '../../entities/stores/store.entity';
import { StoreClosureEntity, StoreClosureType } from '../../entities/stores/store-closure.entity';
import { StoreSettingsEntity } from '../../entities/stores/store-settings.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { ReviewEntity } from '../../entities/complaints/review.entity';
import { WeeklyStatementEntity } from '../../entities/reconciliation/weekly-statement.entity';
import { UpdateStoreProfileDto, StoreReportsQueryDto } from './dto/store-operations.dto';
import { ReconciliationEngine } from '@surplusiq/core';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(StoreClosureEntity)
    private readonly closureRepo: Repository<StoreClosureEntity>,
    @InjectRepository(StoreSettingsEntity)
    private readonly settingsRepo: Repository<StoreSettingsEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(WeeklyStatementEntity)
    private readonly statementRepo: Repository<WeeklyStatementEntity>,
  ) {}

  /**
   * Xem hồ sơ chi tiết và cấu hình của cửa hàng (R2-004)
   */
  async getStoreProfile(storeId: string) {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Cửa hàng không tồn tại.');
    }
    const settings = await this.settingsRepo.findOne({ where: { storeId } });
    const todayStr = new Date().toISOString().split('T')[0];
    const isPausedToday = await this.closureRepo.findOne({
      where: { storeId, date: todayStr },
    });

    return {
      store,
      settings: settings || null,
      isPausedToday: Boolean(isPausedToday),
    };
  }

  /**
   * Cập nhật thông tin hồ sơ cửa hàng (R2-005)
   */
  async updateStoreProfile(storeId: string, dto: UpdateStoreProfileDto) {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Cửa hàng không tồn tại.');
    }

    if (dto.name !== undefined) store.name = dto.name;
    if (dto.address !== undefined) store.address = dto.address;
    if (dto.phone !== undefined) store.phone = dto.phone;
    if (dto.logoUrl !== undefined) store.logoUrl = dto.logoUrl;
    if (dto.openHours !== undefined) store.openHours = dto.openHours;

    return this.storeRepo.save(store);
  }

  /**
   * Tạm dừng hoạt động nhận đơn trong ngày hôm nay (R2-006, BR-006)
   */
  async pauseToday(storeId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = await this.closureRepo.findOne({
      where: { storeId, date: todayStr },
    });

    if (!existing) {
      const closure = this.closureRepo.create({
        storeId,
        date: todayStr,
        type: StoreClosureType.CLOSED,
      });
      await this.closureRepo.save(closure);
    }

    // Đóng các suất bán đang mở hôm nay
    await this.offerRepo.update(
      { storeId, status: OfferStatus.OPEN },
      { status: OfferStatus.CLOSED },
    );

    return {
      success: true,
      message: 'Đã tạm dừng nhận đơn cho hôm nay thành công (R2-006, BR-006).',
    };
  }

  /**
   * Mở lại hoạt động nhận đơn hôm nay (R2-006)
   */
  async resumeToday(storeId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    await this.closureRepo.delete({ storeId, date: todayStr });

    // Khôi phục các suất bán đã đóng
    await this.offerRepo.update(
      { storeId, status: OfferStatus.CLOSED },
      { status: OfferStatus.OPEN },
    );

    return {
      success: true,
      message: 'Đã mở lại hoạt động nhận đơn hôm nay thành công (R2-006).',
    };
  }

  /**
   * Tổng quan vận hành trong ngày: Đơn hàng, doanh thu, thực phẩm cứu được (R2-050)
   */
  async getDailyOverview(storeId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const ordersToday = await this.orderRepo.find({
      where: {
        storeId,
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    let grossRevenue = 0;
    let completedOrders = 0;
    let paidOrders = 0;
    let cancelledOrders = 0;
    let noShowOrders = 0;
    let rescuedItemsCount = 0;

    for (const ord of ordersToday) {
      if (ord.status === OrderStatus.PICKED_UP) {
        completedOrders++;
        grossRevenue += ord.totalAmount;
        rescuedItemsCount += ord.quantity;
      } else if (ord.status === OrderStatus.PAID) {
        paidOrders++;
        grossRevenue += ord.totalAmount;
      } else if (ord.status === OrderStatus.PICKUP_EXPIRED) {
        noShowOrders++;
        grossRevenue += ord.totalAmount;
      } else if (ord.status === OrderStatus.CANCELLED) {
        cancelledOrders++;
      }
    }

    const pendingComplaints = await this.complaintRepo.count({
      where: { storeId, status: ComplaintStatus.PENDING_STORE },
    });

    const activeOffers = await this.offerRepo.count({
      where: { storeId, status: OfferStatus.OPEN },
    });

    const todayStr = now.toISOString().split('T')[0];
    const isPausedToday = Boolean(
      await this.closureRepo.findOne({ where: { storeId, date: todayStr } }),
    );

    // Ước tính 0.4kg thức ăn cho mỗi sản phẩm cứu được
    const foodSavedKg = Number((rescuedItemsCount * 0.4).toFixed(2));

    return {
      date: todayStr,
      isPausedToday,
      orders: {
        total: ordersToday.length,
        paid: paidOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        noShow: noShowOrders,
      },
      grossRevenue,
      rescuedItemsCount,
      foodSavedKg,
      pendingComplaints,
      activeOffers,
    };
  }

  /**
   * Lịch nhận hàng theo khung 15 phút hôm nay (R2-050)
   */
  async getPickupSchedule(storeId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const orders = await this.orderRepo.find({
      where: {
        storeId,
        createdAt: Between(startOfDay, endOfDay),
        status: In([OrderStatus.PAID, OrderStatus.PICKED_UP]),
      },
      order: { pickupSlot: 'ASC', createdAt: 'ASC' },
    });

    // Gom nhóm đơn hàng vào các khung 15 phút
    const buckets: Record<string, OrderEntity[]> = {};

    for (const order of orders) {
      const timeRef = order.pickupSlot ? new Date(order.pickupSlot) : new Date(order.createdAt);
      const hours = timeRef.getHours().toString().padStart(2, '0');
      const minutes = Math.floor(timeRef.getMinutes() / 15) * 15;
      const minStart = minutes.toString().padStart(2, '0');
      const minEnd = (minutes + 15).toString().padStart(2, '0');
      const slotKey = `${hours}:${minStart} - ${hours}:${minEnd}`;

      if (!buckets[slotKey]) {
        buckets[slotKey] = [];
      }
      buckets[slotKey].push(order);
    }

    return Object.entries(buckets).map(([timeSlot, slotOrders]) => ({
      timeSlot,
      orderCount: slotOrders.length,
      orders: slotOrders.map((o) => ({
        id: o.id,
        code: o.code,
        quantity: o.quantity,
        totalAmount: o.totalAmount,
        status: o.status,
        pickupSlot: o.pickupSlot,
      })),
    }));
  }

  /**
   * Báo cáo thống kê hiệu quả kinh doanh & tác động môi trường theo khoảng ngày (R2-061..R2-064)
   */
  async getReportsOverview(storeId: string, query: StoreReportsQueryDto) {
    const now = new Date();
    const endDate = query.endDate ? new Date(query.endDate) : now;
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const orders = await this.orderRepo.find({
      where: {
        storeId,
        createdAt: Between(startDate, endDate),
      },
    });

    let grossRevenue = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let noShowOrders = 0;
    let rescuedItemsCount = 0;

    for (const ord of orders) {
      if (ord.status === OrderStatus.PICKED_UP) {
        completedOrders++;
        grossRevenue += ord.totalAmount;
        rescuedItemsCount += ord.quantity;
      } else if (ord.status === OrderStatus.PICKUP_EXPIRED) {
        noShowOrders++;
        grossRevenue += ord.totalAmount;
      } else if (ord.status === OrderStatus.CANCELLED) {
        cancelledOrders++;
      }
    }

    const reviews = await this.reviewRepo.find({ where: { storeId } });
    const ratingCount = reviews.length;
    const ratingAvg =
      ratingCount > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount).toFixed(1))
        : 0;

    const complaintsCount = await this.complaintRepo.count({
      where: { storeId, createdAt: Between(startDate, endDate) },
    });

    const foodSavedKg = Number((rescuedItemsCount * 0.4).toFixed(2));
    const co2SavedKg = Number((foodSavedKg * 2.5).toFixed(2));

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      summary: {
        totalOrders: orders.length,
        completedOrders,
        cancelledOrders,
        noShowOrders,
        grossRevenue,
        foodSavedKg,
        co2SavedKg,
        ratingAvg,
        ratingCount,
        complaintsCount,
      },
    };
  }

  /**
   * Báo cáo đối soát tài chính tuần và lịch sử sao kê bất biến (R2-068..R2-075)
   */
  async getReconciliation(storeId: string, _cycleId?: string) {
    // 1. Lịch sử sao kê đã chốt từ bảng weekly_statements
    const historyStatements = await this.statementRepo.find({
      where: { storeId },
      order: { weekStart: 'DESC' },
    });

    // 2. Tính toán đối soát thời gian thực kỳ hiện tại
    const now = new Date();
    const period = ReconciliationEngine.getIsoWeekPeriod(now);

    const currentCycleOrders = await this.orderRepo.find({
      where: {
        storeId,
        createdAt: Between(new Date(period.startDate), new Date(period.endDate)),
      },
    });

    const complaints = await this.complaintRepo.find({
      where: {
        storeId,
        status: ComplaintStatus.ACCEPTED,
        createdAt: Between(new Date(period.startDate), new Date(period.endDate)),
      },
    });

    const refundDeductions = complaints.reduce((sum, c) => sum + (c.refundAmount || 0), 0);

    const coreOrders = currentCycleOrders.map((o) => ({
      orderId: o.id,
      amount: o.totalAmount,
      status: o.status as any,
      completedAt: o.updatedAt || new Date(),
      storeFault: false,
    }));

    const currentStatement = ReconciliationEngine.calculate({
      storeId,
      period,
      orders: coreOrders,
      refundsDeduction: refundDeductions,
      subscriptionFee: 0,
      adjustments: [],
    });

    return {
      currentCycle: {
        ...currentStatement,
        checksumValid: ReconciliationEngine.verifyChecksum(currentStatement),
      },
      history: historyStatements,
    };
  }
}
