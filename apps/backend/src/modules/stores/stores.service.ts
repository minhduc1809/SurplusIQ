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
import { StatementLineEntity } from '../../entities/reconciliation/statement-line.entity';
import { CustomerNoteEntity } from '../../entities/stores/customer-note.entity';
import { CustomerProfileEntity } from '../../entities/auth/customer-profile.entity';
import {
  UpdateStoreProfileDto,
  StoreReportsQueryDto,
  CustomerNoteDto,
  VirtualClockDto,
  ExportDataQueryDto,
  CreateStoreClosureDto,
  UpdateTaskRemindersDto,
} from './dto/store-operations.dto';
import { ReconciliationEngine, type ReconciliationOrderStatus } from '@surplusiq/core';

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
    @InjectRepository(StatementLineEntity)
    private readonly statementLineRepo: Repository<StatementLineEntity>,
    @InjectRepository(CustomerNoteEntity)
    private readonly customerNoteRepo: Repository<CustomerNoteEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly customerProfileRepo: Repository<CustomerProfileEntity>,
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

    const coreOrders = currentCycleOrders.map((o) => {
      let reconStatus: ReconciliationOrderStatus = 'CANCELLED';
      if (o.status === OrderStatus.PICKED_UP) {
        reconStatus = 'PICKED_UP';
      } else if (o.status === OrderStatus.PICKUP_EXPIRED) {
        reconStatus = 'PICKUP_EXPIRED';
      } else if (o.status === OrderStatus.REFUNDED) {
        reconStatus = 'REFUNDED';
      }
      return {
        orderId: o.id,
        amount: o.totalAmount,
        status: reconStatus,
        completedAt: o.updatedAt || new Date(),
        storeFault: false,
      };
    });

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

  /**
   * Xem danh sách sao kê đối soát tuần đã chốt (R2-067)
   */
  async getStatements(storeId: string) {
    return this.statementRepo.find({
      where: { storeId },
      order: { weekStart: 'DESC' },
    });
  }

  /**
   * Xem chi tiết một bản sao kê kèm các dòng chi tiết (R2-067)
   */
  async getStatementById(storeId: string, statementId: string) {
    const statement = await this.statementRepo.findOne({
      where: { id: statementId, storeId },
    });
    if (!statement) {
      throw new NotFoundException(
        'Bản sao kê không tồn tại hoặc không thuộc quyền sở hữu của bạn.',
      );
    }
    const lines = await this.statementLineRepo.find({
      where: { statementId },
      order: { createdAt: 'ASC' },
    });
    return { statement, lines };
  }

  /**
   * Tải sao kê định dạng PDF (R2-067)
   */
  async getStatementPdf(storeId: string, statementId: string) {
    const { statement, lines } = await this.getStatementById(storeId, statementId);
    const pdfContent = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /Resources <<>> /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj',
      '4 0 obj << /Length 200 >> stream',
      `BT /F1 14 Tf 50 720 Td (SURPLUSIQ WEEKLY STATEMENT: ${statement.id}) Tj ET`,
      `BT /F1 11 Tf 50 690 Td (Store: ${storeId} | Period: ${statement.weekStart} to ${statement.weekEnd}) Tj ET`,
      `BT /F1 11 Tf 50 660 Td (Gross: ${statement.gross} VND | Commission: ${statement.commission} VND) Tj ET`,
      `BT /F1 11 Tf 50 630 Td (Refunds: ${statement.refunds} VND | Net Payable: ${statement.netPayable} VND) Tj ET`,
      `BT /F1 10 Tf 50 600 Td (Status: ${statement.status} | Total Lines: ${lines.length}) Tj ET`,
      `BT /F1 9 Tf 50 570 Td (Checksum: ${statement.checksum || 'N/A'}) Tj ET`,
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
      statementId: statement.id,
      filename: `statement-${statement.weekStart}.pdf`,
      contentType: 'application/pdf',
      dataBase64: Buffer.from(pdfContent).toString('base64'),
    };
  }

  /**
   * Tải sao kê định dạng CSV (R2-067)
   */
  async getStatementCsv(storeId: string, statementId: string) {
    const { statement, lines } = await this.getStatementById(storeId, statementId);
    const header = '\uFEFFMã dòng,Mã đơn,Loại bút toán,Số tiền (VNĐ),Hoa hồng (VNĐ),Thời gian\n';
    const rows = lines
      .map(
        (l) =>
          `"${l.id}","${l.orderId || ''}","${l.type}",${l.amount},${l.commission},"${l.createdAt.toISOString()}"`,
      )
      .join('\n');
    const summary = `\n"TỔNG KẾT",,"Doanh số: ${statement.gross}",,"Thực nhận: ${statement.netPayable}","Checksum: ${statement.checksum || ''}"\n`;

    return {
      statementId: statement.id,
      filename: `statement-${statement.weekStart}.csv`,
      contentType: 'text/csv; charset=utf-8',
      content: header + rows + summary,
    };
  }

  /**
   * Xuất toàn bộ dữ liệu đơn hàng CSV/JSON (R2-103)
   */
  async exportOrders(storeId: string, query: ExportDataQueryDto) {
    const where: any = { storeId };
    if (query.fromDate && query.toDate) {
      where.createdAt = Between(new Date(query.fromDate), new Date(query.toDate));
    }
    const orders = await this.orderRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const header = '\uFEFFMã đơn,Khách hàng,Tổng tiền (VNĐ),Trạng thái,Thời gian tạo,Hạn lấy\n';
    const rows = orders
      .map(
        (o) =>
          `"${o.code}","${o.customerId}",${o.totalAmount},"${o.status}","${o.createdAt.toISOString()}","${o.pickupSlot ? o.pickupSlot.toISOString() : ''}"`,
      )
      .join('\n');

    return {
      storeId,
      totalOrders: orders.length,
      filename: `store-orders-${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
      content: header + rows,
      data: orders,
    };
  }

  /**
   * Xuất dữ liệu đối soát kế toán (R2-104..105)
   */
  async exportAccounting(storeId: string, query: ExportDataQueryDto) {
    const where: any = { storeId };
    if (query.fromDate && query.toDate) {
      where.weekStart = Between(query.fromDate, query.toDate);
    }
    const statements = await this.statementRepo.find({
      where,
      order: { weekStart: 'DESC' },
    });

    const header =
      '\uFEFFMã sao kê,Kỳ bắt đầu,Kỳ kết thúc,Doanh thu,Hoa hồng,Khấu trừ hoàn,Thực trả,Trạng thái,Checksum\n';
    const rows = statements
      .map(
        (s) =>
          `"${s.id}","${s.weekStart}","${s.weekEnd}",${s.gross},${s.commission},${s.refunds},${s.netPayable},"${s.status}","${s.checksum || ''}"`,
      )
      .join('\n');

    return {
      storeId,
      totalStatements: statements.length,
      filename: `store-accounting-${Date.now()}.csv`,
      contentType: 'text/csv; charset=utf-8',
      content: header + rows,
      statements,
    };
  }

  /**
   * Xem trạng thái bộ điều khiển demo / VirtualClock (R2-065)
   */
  async getVirtualClock(storeId: string) {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Cửa hàng không tồn tại.');
    }
    return {
      storeId,
      isDemo: store.isDemo,
      virtualDayDurationSeconds: 120, // 1 ngày = 2 phút (R2-065)
      speedMultiplier: 720,
      simulatedTime: new Date().toISOString(),
      label: store.isDemo ? 'DEMO_RUNNING' : 'REALTIME_NORMAL',
    };
  }

  /**
   * Bật/tắt chế độ demo VirtualClock (R2-065)
   */
  async toggleVirtualClock(storeId: string, dto: VirtualClockDto) {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Cửa hàng không tồn tại.');
    }
    store.isDemo = Boolean(dto.enabled);
    await this.storeRepo.save(store);
    return {
      storeId,
      isDemo: store.isDemo,
      message: store.isDemo
        ? 'Đã kích hoạt chế độ demo tua nhanh (1 ngày = 120s) trên dữ liệu mẫu.'
        : 'Đã tắt chế độ demo, quay lại vận hành dữ liệu thực tế.',
    };
  }

  /**
   * Lấy danh sách khách hàng của quán kèm lịch sử mua (R2-082, R2-083)
   */
  async getStoreCustomers(storeId: string) {
    const orders = await this.orderRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });

    const customerMap = new Map<
      string,
      {
        customerId: string;
        totalOrders: number;
        completedOrders: number;
        totalSpend: number;
        lastOrderDate: Date;
      }
    >();

    for (const o of orders) {
      const existing = customerMap.get(o.customerId) || {
        customerId: o.customerId,
        totalOrders: 0,
        completedOrders: 0,
        totalSpend: 0,
        lastOrderDate: o.createdAt,
      };

      existing.totalOrders += 1;
      if (o.status === OrderStatus.PICKED_UP) {
        existing.completedOrders += 1;
        existing.totalSpend += o.totalAmount;
      }
      if (o.createdAt > existing.lastOrderDate) {
        existing.lastOrderDate = o.createdAt;
      }
      customerMap.set(o.customerId, existing);
    }

    const customerIds = Array.from(customerMap.keys());
    const notes =
      customerIds.length > 0
        ? await this.customerNoteRepo.find({ where: { storeId, customerId: In(customerIds) } })
        : [];
    const noteMap = new Map(notes.map((n) => [n.customerId, n.note]));

    const profiles =
      customerIds.length > 0
        ? await this.customerProfileRepo.find({ where: { userId: In(customerIds) } })
        : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return Array.from(customerMap.values()).map((c) => {
      const p = profileMap.get(c.customerId);
      const name = p?.fullName || 'Khách hàng';
      const maskedName =
        name.length > 2 ? `${name.substring(0, 1)}***${name.substring(name.length - 1)}` : 'K***';
      return {
        customerId: c.customerId,
        customerName: maskedName,
        totalOrders: c.totalOrders,
        completedOrders: c.completedOrders,
        totalSpend: c.totalSpend,
        lastOrderDate: c.lastOrderDate,
        internalNote: noteMap.get(c.customerId) || null,
      };
    });
  }

  /**
   * Lấy ghi chú nội bộ của một khách hàng (R2-085)
   */
  async getCustomerNotes(storeId: string, customerId: string) {
    const note = await this.customerNoteRepo.findOne({
      where: { storeId, customerId },
    });
    return {
      storeId,
      customerId,
      note: note ? note.note : null,
      updatedAt: note ? note.updatedAt : null,
    };
  }

  /**
   * Thêm hoặc cập nhật ghi chú nội bộ về khách hàng (tối đa 200 ký tự) (R2-085)
   */
  async saveCustomerNote(storeId: string, customerId: string, dto: CustomerNoteDto) {
    let noteEntity = await this.customerNoteRepo.findOne({
      where: { storeId, customerId },
    });

    if (!noteEntity) {
      noteEntity = this.customerNoteRepo.create({
        storeId,
        customerId,
        note: dto.note,
      });
    } else {
      noteEntity.note = dto.note;
    }

    const saved = await this.customerNoteRepo.save(noteEntity);
    return {
      storeId: saved.storeId,
      customerId: saved.customerId,
      note: saved.note,
      updatedAt: saved.updatedAt,
    };
  }

  /**
   * Danh sách các ngày đóng cửa / giờ đặc biệt của cửa hàng (R2-097)
   */
  async getClosures(storeId: string) {
    return this.closureRepo.find({
      where: { storeId },
      order: { date: 'ASC' },
    });
  }

  /**
   * Thiết lập lịch đóng cửa hoặc giờ mở cửa đặc biệt (R2-097)
   */
  async createClosure(storeId: string, dto: CreateStoreClosureDto) {
    let closure = await this.closureRepo.findOne({
      where: { storeId, date: dto.date },
    });
    const closureType =
      dto.type === 'SPECIAL_HOURS' ? StoreClosureType.SPECIAL_HOURS : StoreClosureType.CLOSED;
    if (!closure) {
      closure = this.closureRepo.create({
        storeId,
        date: dto.date,
        type: closureType,
        openHours: dto.openHours || null,
      });
    } else {
      closure.type = closureType;
      closure.openHours = dto.openHours || null;
    }
    return this.closureRepo.save(closure);
  }

  /**
   * Xóa lịch đóng cửa (R2-097)
   */
  async deleteClosure(storeId: string, closureId: string) {
    const closure = await this.closureRepo.findOne({
      where: { id: closureId, storeId },
    });
    if (!closure) {
      throw new NotFoundException('Lịch nghỉ không tồn tại.');
    }
    await this.closureRepo.delete({ id: closureId });
    return { success: true, message: 'Đã xóa lịch nghỉ thành công.' };
  }

  /**
   * Hàng đợi việc cần làm hôm nay của cửa hàng (R2-095)
   */
  async getTodayTasks(storeId: string) {
    const pendingComplaints = await this.complaintRepo.count({
      where: { storeId, status: ComplaintStatus.PENDING_STORE },
    });

    const activeOffers = await this.offerRepo.count({
      where: { storeId, status: OfferStatus.OPEN },
    });

    const settings = await this.settingsRepo.findOne({ where: { storeId } });
    const reminders = (settings?.taskReminders as Record<string, unknown>) || {};

    const tasks = [
      {
        id: 'complaints_review',
        title: 'Khiếu nại chờ xử lý',
        count: pendingComplaints,
        urgent: pendingComplaints > 0,
        actionUrl: '/complaints',
        description: 'Phản hồi khiếu nại khách hàng trong 48h để tránh tự động hoàn tiền 100%.',
      },
      {
        id: 'active_offers_monitoring',
        title: 'Suất bán đang mở hôm nay',
        count: activeOffers,
        urgent: false,
        actionUrl: '/offers',
        description: 'Theo dõi tồn kho thực tế và áp dụng điều chỉnh số lượng nếu cần.',
      },
      {
        id: 'daily_actuals',
        title: 'Ghi nhận số lượng thực tế cuối ngày',
        count: 1,
        urgent: false,
        actionUrl: '/forecasting',
        description: 'Nhập số lượng thực tế để cải thiện độ chính xác dự báo AI.',
      },
    ];

    return {
      storeId,
      tasks,
      reminders: {
        actualsEntry: (reminders.actualsEntry as boolean) ?? true,
        priceReview: (reminders.priceReview as boolean) ?? true,
        reminderTime: (reminders.reminderTime as string) || '21:30',
      },
    };
  }

  /**
   * Cập nhật cấu hình nhắc nhở công việc (R2-096)
   */
  async updateTaskReminders(storeId: string, dto: UpdateTaskRemindersDto) {
    let settings = await this.settingsRepo.findOne({ where: { storeId } });
    if (!settings) {
      settings = this.settingsRepo.create({ storeId });
    }
    const currentReminders = (settings.taskReminders as Record<string, unknown>) || {};
    settings.taskReminders = {
      ...currentReminders,
      ...(dto.actualsEntryReminder !== undefined && { actualsEntry: dto.actualsEntryReminder }),
      ...(dto.priceReviewReminder !== undefined && { priceReview: dto.priceReviewReminder }),
      ...(dto.reminderTime !== undefined && { reminderTime: dto.reminderTime }),
    };
    await this.settingsRepo.save(settings);
    return {
      success: true,
      reminders: settings.taskReminders,
    };
  }
}
