import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { ComplaintAttachmentEntity } from '../../entities/complaints/complaint-attachment.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { ViolationReportEntity } from '../../entities/complaints/violation-report.entity';
import { SupportTicketEntity, TicketStatus } from '../../entities/complaints/support-ticket.entity';
import { SupportMessageEntity } from '../../entities/complaints/support-message.entity';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  UpdateReviewDto,
  AddComplaintAttachmentsDto,
  CreateViolationReportDto,
  CreateSupportTicketDto,
  SendSupportMessageDto,
  ResolveComplaintDto,
  RejectComplaintDto,
  ReplyReviewDto,
} from './dto/interaction-extras.dto';
import {
  PaymentTransactionEntity,
  PaymentKind,
  PaymentMethod,
  PaymentStatus,
} from '../../entities/orders/payment-transaction.entity';

@Injectable()
export class CustomerInteractionsService {
  private readonly logger = new Logger(CustomerInteractionsService.name);

  constructor(
    @InjectRepository(ComplaintEntity)
    private readonly complaintRepo: Repository<ComplaintEntity>,
    @InjectRepository(ComplaintAttachmentEntity)
    private readonly attachmentRepo: Repository<ComplaintAttachmentEntity>,
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>,
    @InjectRepository(ItemEntity)
    private readonly itemRepo: Repository<ItemEntity>,
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
    @InjectRepository(ViolationReportEntity)
    private readonly violationRepo: Repository<ViolationReportEntity>,
    @InjectRepository(SupportTicketEntity)
    private readonly ticketRepo: Repository<SupportTicketEntity>,
    @InjectRepository(SupportMessageEntity)
    private readonly messageRepo: Repository<SupportMessageEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly paymentTxnRepo: Repository<PaymentTransactionEntity>,
  ) {}

  /**
   * Khách hàng gửi khiếu nại chất lượng đơn hàng trong 24 giờ sau khi nhận (R1-061)
   */
  async createComplaint(customerId: string, orderId: string, dto: CreateComplaintDto) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    // 1. Chỉ khiếu nại cho đơn Đã nhận hàng thành công (PICKED_UP)
    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException(
        'Chỉ có thể khiếu nại đối với đơn hàng đã nhận thành công tại quầy (R1-061).',
      );
    }

    // 2. Kiểm tra thời hạn 24 giờ kể từ thời điểm nhận hàng (R1-061)
    const pickupTime = order.pickedUpAt
      ? new Date(order.pickedUpAt).getTime()
      : new Date(order.updatedAt).getTime();
    const hoursElapsed = (Date.now() - pickupTime) / (1000 * 60 * 60);
    if (hoursElapsed > 24) {
      throw new BadRequestException(
        'Đã quá thời hạn 24 giờ kể từ khi nhận hàng. Hệ thống không thể tiếp nhận khiếu nại (R1-061).',
      );
    }

    // 3. Mỗi đơn hàng chỉ có một khiếu nại đang mở (PENDING_STORE)
    const existingOpen = await this.complaintRepo.findOne({
      where: { orderId, status: ComplaintStatus.PENDING_STORE },
    });
    if (existingOpen) {
      throw new ConflictException(
        'Đơn hàng này hiện đang có một khiếu nại chờ cửa hàng xử lý (R1-061).',
      );
    }

    // Hạn phản hồi của cửa hàng: 48 giờ sau khi tạo
    const responseDueAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const complaint = this.complaintRepo.create({
      orderId,
      customerId,
      storeId: order.storeId,
      category: dto.category.trim(),
      description: dto.description.trim(),
      status: ComplaintStatus.PENDING_STORE,
      responseDueAt,
      refundAmount: 0,
      autoAccepted: false,
    });

    const savedComplaint = await this.complaintRepo.save(complaint);

    // Lưu ảnh bằng chứng đính kèm (tối đa 3 ảnh)
    let attachments: ComplaintAttachmentEntity[] = [];
    if (dto.imageUrls && dto.imageUrls.length > 0) {
      const attachmentEntities = dto.imageUrls.slice(0, 3).map((url) =>
        this.attachmentRepo.create({
          complaintId: savedComplaint.id,
          url,
          addedRound: 0,
        }),
      );
      attachments = await this.attachmentRepo.save(attachmentEntities);
    }

    return {
      id: savedComplaint.id,
      orderId: savedComplaint.orderId,
      category: savedComplaint.category,
      description: savedComplaint.description,
      status: savedComplaint.status,
      responseDueAt: savedComplaint.responseDueAt,
      createdAt: savedComplaint.createdAt,
      attachments: attachments.map((a) => a.url),
    };
  }

  /**
   * Xem danh sách khiếu nại của khách hàng (R1-067)
   */
  async getCustomerComplaints(customerId: string) {
    const complaints = await this.complaintRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });

    if (!complaints.length) {
      return [];
    }

    const complaintIds = complaints.map((c) => c.id);
    const attachments = await this.attachmentRepo
      .createQueryBuilder('a')
      .where('a.complaint_id IN (:...complaintIds)', { complaintIds })
      .getMany();

    const attachmentMap = new Map<string, string[]>();
    for (const a of attachments) {
      const list = attachmentMap.get(a.complaintId) || [];
      list.push(a.url);
      attachmentMap.set(a.complaintId, list);
    }

    return complaints.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      storeId: c.storeId,
      category: c.category,
      description: c.description,
      status: c.status,
      responseDueAt: c.responseDueAt,
      refundAmount: c.refundAmount,
      rejectReason: c.rejectReason,
      createdAt: c.createdAt,
      attachments: attachmentMap.get(c.id) || [],
    }));
  }

  /**
   * Xem chi tiết khiếu nại (R1-062)
   */
  async getComplaintDetail(customerId: string, complaintId: string) {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId, customerId },
    });

    if (!complaint) {
      throw new NotFoundException('Khiếu nại không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    const [attachments, store, order] = await Promise.all([
      this.attachmentRepo.find({ where: { complaintId } }),
      this.storeRepo.findOne({ where: { id: complaint.storeId } }),
      this.orderRepo.findOne({ where: { id: complaint.orderId } }),
    ]);

    return {
      id: complaint.id,
      orderId: complaint.orderId,
      orderCode: order?.code || null,
      store: store
        ? {
            id: store.id,
            name: store.name,
            address: store.address,
            phone: store.phone,
          }
        : null,
      category: complaint.category,
      description: complaint.description,
      status: complaint.status,
      responseDueAt: complaint.responseDueAt,
      refundAmount: complaint.refundAmount,
      rejectReason: complaint.rejectReason,
      autoAccepted: complaint.autoAccepted,
      createdAt: complaint.createdAt,
      attachments: attachments.map((a) => a.url),
    };
  }

  /**
   * Gửi đánh giá 1-5 sao và nhận xét cho đơn hàng đã hoàn tất (R1-064)
   */
  async createReview(customerId: string, orderId: string, dto: CreateReviewDto) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    // 1. Chỉ đánh giá đơn Đã nhận hàng thành công
    if (order.status !== OrderStatus.PICKED_UP) {
      throw new BadRequestException(
        'Chỉ có thể đánh giá đối với đơn hàng đã nhận thành công tại quầy (R1-064).',
      );
    }

    // 2. Chống đánh giá trùng lặp: mỗi đơn chỉ được đánh giá 1 lần (BR-021)
    const existing = await this.reviewRepo.findOne({ where: { orderId } });
    if (existing) {
      throw new ConflictException(
        'Đơn hàng này đã được đánh giá trước đó, không thể gửi lại (R1-064).',
      );
    }

    const review = this.reviewRepo.create({
      orderId,
      customerId,
      storeId: order.storeId,
      rating: dto.rating,
      comment: dto.comment ? dto.comment.trim() : null,
      status: ReviewStatus.VISIBLE,
    });

    const saved = await this.reviewRepo.save(review);

    return {
      id: saved.id,
      orderId: saved.orderId,
      storeId: saved.storeId,
      rating: saved.rating,
      comment: saved.comment,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }

  /**
   * Thống kê tác động cá nhân: số đơn đã cứu, tiền tiết kiệm, kg thực phẩm (R1-076)
   */
  async getCustomerImpact(customerId: string) {
    const completedOrders = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin(OfferEntity, 'off', 'off.id = o.offer_id')
      .leftJoin(ItemEntity, 'i', 'i.id = off.item_id')
      .where('o.customer_id = :customerId', { customerId })
      .andWhere('o.status = :status', { status: OrderStatus.PICKED_UP })
      .select([
        'o.id AS order_id',
        'o.quantity AS quantity',
        'o.unit_price AS unit_price',
        'off.original_price AS original_price',
        'i.weight_grams AS weight_grams',
      ])
      .getRawMany();

    const totalOrders = completedOrders.length;
    let totalSavingsVnd = 0;
    let totalWeightGrams = 0;

    for (const ord of completedOrders) {
      const qty = Number(ord.quantity || 1);
      const unitPrice = Number(ord.unit_price || 0);
      const origPrice = Number(ord.original_price || unitPrice);
      const savingsPerUnit = Math.max(0, origPrice - unitPrice);

      totalSavingsVnd += savingsPerUnit * qty;

      // Nếu món chưa khai báo trọng lượng, ước tính mặc định 300g per suất (R1-076)
      const weight = ord.weight_grams ? Number(ord.weight_grams) : 300;
      totalWeightGrams += weight * qty;
    }

    const totalFoodSavedKg = Number((totalWeightGrams / 1000).toFixed(2));

    return {
      totalOrders,
      totalSavingsVnd,
      totalFoodSavedKg,
    };
  }

  /**
   * Xem huy hiệu tác động xã hội & danh hiệu giải cứu thực phẩm (R1-081)
   */
  async getCustomerImpactBadges(customerId: string) {
    const impact = await this.getCustomerImpact(customerId);
    const { totalOrders, totalFoodSavedKg, totalSavingsVnd } = impact;

    const badges = [
      {
        id: 'BRONZE_RESCUER',
        name: 'Người Cứu Món Tập Sự',
        description: 'Giải cứu thành công suất bánh đầu tiên.',
        icon: '🥉',
        isUnlocked: totalOrders >= 1,
        progress: Math.min(100, Math.round((totalOrders / 1) * 100)),
      },
      {
        id: 'GREEN_PIONEER',
        name: 'Chiến Binh Xanh',
        description: 'Giải cứu từ 5 suất ăn hoặc 2kg thực phẩm.',
        icon: '🌱',
        isUnlocked: totalOrders >= 5 || totalFoodSavedKg >= 2,
        progress: Math.min(100, Math.round((totalOrders / 5) * 100)),
      },
      {
        id: 'SILVER_CHAMPION',
        name: 'Dũng Sĩ Tiết Kiệm',
        description: 'Giải cứu từ 10 suất ăn và tiết kiệm hơn 200.000đ.',
        icon: '🥈',
        isUnlocked: totalOrders >= 10,
        progress: Math.min(100, Math.round((totalOrders / 10) * 100)),
      },
      {
        id: 'PLANET_HERO',
        name: 'Anh Hùng Hành Tinh',
        description: 'Giải cứu từ 25 suất ăn hoặc hơn 10kg thực phẩm.',
        icon: '🌍',
        isUnlocked: totalOrders >= 25 || totalFoodSavedKg >= 10,
        progress: Math.min(100, Math.round((totalOrders / 25) * 100)),
      },
      {
        id: 'ZERO_WASTE_MASTER',
        name: 'Bậc Thầy Chống Lãng Phí',
        description: 'Giải cứu trên 50 suất ăn - giảm phát thải rác thải thực phẩm xuất sắc.',
        icon: '👑',
        isUnlocked: totalOrders >= 50,
        progress: Math.min(100, Math.round((totalOrders / 50) * 100)),
      },
    ];

    const currentBadge = [...badges].reverse().find((b) => b.isUnlocked) || badges[0];

    return {
      impact,
      currentBadgeTitle: currentBadge.name,
      unlockedCount: badges.filter((b) => b.isUnlocked).length,
      totalBadges: badges.length,
      badges,
      shareCard: {
        title: `Tôi đã cứu được ${totalFoodSavedKg}kg thực phẩm cùng SurplusIQ!`,
        statLine: `${totalOrders} đơn hàng hoàn tất • Tiết kiệm ${totalSavingsVnd.toLocaleString('vi-VN')}đ`,
        shareUrl: `https://surplusiq.vn/impact/${customerId}`,
        hashtag: '#SurplusIQ #GiaiCuuThucPham #ZeroWasteVietnam',
      },
    };
  }

  /**
   * Danh mục câu hỏi thường gặp FAQ & Hướng dẫn (R1-072)
   */
  async getHelpCenterFaq() {
    return [
      {
        category: 'NHAN_HANG',
        categoryTitle: 'Nhận hàng & Xác thực',
        faqs: [
          {
            q: 'Làm thế nào để nhận hàng tại cửa hàng?',
            a: 'Sau khi thanh toán thành công, mở vé nhận hàng trên App, đưa mã QR cho nhân viên quét hoặc đọc mã PIN 6 ký tự hiển thị trên màn hình.',
          },
          {
            q: 'Tôi có thể nhờ người khác đến lấy hộ không?',
            a: 'Có. Tại chi tiết đơn hàng, chọn "Tạo mã nhận hộ" để sinh mã PIN 8 ký tự gửi cho người thân. Mã này chỉ có hiệu lực một lần.',
          },
          {
            q: 'Khung giờ nhận hàng được quy định thế nào?',
            a: 'Mỗi suất có khung giờ nhận riêng (thường cuối ngày). Bạn được phép đến trễ tối đa 15 phút. Sau thời gian này đơn có thể bị đánh dấu quá hạn.',
          },
        ],
      },
      {
        category: 'THANH_TOAN',
        categoryTitle: 'Thanh toán & Hoàn tiền',
        faqs: [
          {
            q: 'Thời gian thanh toán giữ suất là bao lâu?',
            a: 'Hệ thống giữ suất trong đúng 10 phút. Bạn cần hoàn tất quét mã VietQR và xác nhận trước khi hết giờ.',
          },
          {
            q: 'Nếu tôi chuyển khoản muộn hơn 10 phút thì sao?',
            a: 'Hệ thống sẽ tự động phát hiện giao dịch muộn và tạo yêu cầu hoàn trả 100% số tiền về tài khoản của bạn (VC-07, R1-047).',
          },
        ],
      },
      {
        category: 'KHIEU_NAI',
        categoryTitle: 'Khiếu nại & Chất lượng',
        faqs: [
          {
            q: 'Tôi có thể khiếu nại chất lượng món ăn không?',
            a: 'Có. Bạn có thể gửi khiếu nại kèm tối đa 3 ảnh chụp thực tế trong vòng 24 giờ kể từ khi nhận hàng.',
          },
          {
            q: 'Thời hạn cửa hàng xử lý khiếu nại là bao lâu?',
            a: 'Cửa hàng có 48 giờ để phản hồi. Nếu cửa hàng quá hạn không phản hồi, hệ thống sẽ tự động chấp nhận và hoàn tiền 100% cho bạn (BR-071).',
          },
        ],
      },
      {
        category: 'QUY_DINH',
        categoryTitle: 'Quy định & Chính sách',
        faqs: [
          {
            q: 'Giá bán suất cứu món có gì đặc biệt?',
            a: 'Tất cả các món giảm giá trên SurplusIQ đều có giá bán tối thiểu bằng giá sàn (40% giá gốc) để bảo đảm quyền lợi đôi bên.',
          },
          {
            q: 'Chính sách No-show (không đến nhận)?',
            a: 'Nếu bạn đặt hàng nhưng không đến nhận quá 3 lần trong vòng 30 ngày, tài khoản sẽ bị tạm ngưng quyền đặt hàng trong 7 ngày (BR-020).',
          },
        ],
      },
    ];
  }

  // -------------------------------------------------------------------------
  // RÚT & BỔ SUNG BẰNG CHỨNG KHIẾU NẠI (R1-063, R1-068)
  // -------------------------------------------------------------------------

  /**
   * Khách hàng tự nguyện rút khiếu nại khi chưa xử lý (R1-063)
   */
  async withdrawComplaint(customerId: string, complaintId: string) {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId, customerId },
    });
    if (!complaint) {
      throw new NotFoundException('Khiếu nại không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    if (complaint.status !== ComplaintStatus.PENDING_STORE) {
      throw new BadRequestException(
        `Chỉ có thể rút khiếu nại đang ở trạng thái chờ cửa hàng xử lý (hiện tại: ${complaint.status}) (R1-063).`,
      );
    }
    complaint.status = ComplaintStatus.CLOSED;
    complaint.rejectReason = 'Khách hàng tự nguyện rút khiếu nại';
    await this.complaintRepo.save(complaint);
    return { success: true, message: 'Đã rút khiếu nại thành công.' };
  }

  /**
   * Bổ sung bằng chứng ảnh cho khiếu nại đang mở (R1-068)
   */
  async addComplaintAttachments(
    customerId: string,
    complaintId: string,
    dto: AddComplaintAttachmentsDto,
  ) {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId, customerId },
    });
    if (!complaint) {
      throw new NotFoundException('Khiếu nại không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    if (complaint.status !== ComplaintStatus.PENDING_STORE) {
      throw new BadRequestException(
        'Chỉ có thể bổ sung bằng chứng khi khiếu nại đang chờ xử lý (R1-068).',
      );
    }
    const currentCount = await this.attachmentRepo.count({ where: { complaintId } });
    if (currentCount + dto.photoUrls.length > 5) {
      throw new BadRequestException('Tổng số ảnh bằng chứng tối đa là 5 ảnh.');
    }

    const newAttachments = dto.photoUrls.map((url) =>
      this.attachmentRepo.create({
        complaintId,
        url,
      }),
    );
    await this.attachmentRepo.save(newAttachments);
    return { success: true, message: 'Đã bổ sung bằng chứng thành công.' };
  }

  // -------------------------------------------------------------------------
  // SỬA VÀ ẨN ĐÁNH GIÁ (R1-065, R1-066)
  // -------------------------------------------------------------------------

  /**
   * Sửa đánh giá trong vòng 24 giờ sau khi gửi (R1-065)
   */
  async updateReview(customerId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, customerId },
    });
    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    const diffHours = (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      throw new BadRequestException('Đã quá thời hạn 24 giờ cho phép chỉnh sửa đánh giá (R1-065).');
    }

    review.rating = dto.rating;
    if (dto.comment !== undefined) {
      review.comment = dto.comment ? dto.comment.trim() : null;
    }
    const saved = await this.reviewRepo.save(review);
    return saved;
  }

  /**
   * Khách hàng ẩn đánh giá của mình (R1-066)
   */
  async hideReview(customerId: string, reviewId: string) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, customerId },
    });
    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    review.status = ReviewStatus.HIDDEN;
    await this.reviewRepo.save(review);
    return { success: true, message: 'Đã ẩn đánh giá thành công (R1-066).' };
  }

  // -------------------------------------------------------------------------
  // BÁO CÁO VI PHẠM (VIOLATION REPORTS - R1-069)
  // -------------------------------------------------------------------------

  /**
   * Báo cáo cửa hàng hoặc nội dung vi phạm (R1-069)
   */
  async createViolationReport(customerId: string, dto: CreateViolationReportDto) {
    const existing = await this.violationRepo.findOne({
      where: {
        reporterId: customerId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
    if (existing) {
      throw new ConflictException('Bạn đã gửi báo cáo vi phạm cho đối tượng này rồi (R1-069).');
    }

    const report = this.violationRepo.create({
      reporterId: customerId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      reason: dto.reason,
    });
    const saved = await this.violationRepo.save(report);
    return saved;
  }

  // -------------------------------------------------------------------------
  // YÊU CẦU HỖ TRỢ NGƯỜI THẬT (SUPPORT TICKETS - R1-070, R1-071)
  // -------------------------------------------------------------------------

  /**
   * Gửi yêu cầu hỗ trợ cho người thật (R1-070)
   */
  async createSupportTicket(customerId: string, dto: CreateSupportTicketDto) {
    const activeCount = await this.ticketRepo.count({
      where: {
        userId: customerId,
        status: Not(TicketStatus.CLOSED),
      },
    });
    if (activeCount >= 5) {
      throw new BadRequestException(
        'Mỗi khách hàng chỉ được mở tối đa 5 yêu cầu hỗ trợ đồng thời (R1-070).',
      );
    }

    const ticket = this.ticketRepo.create({
      userId: customerId,
      subject: dto.subject,
      status: TicketStatus.OPEN,
    });
    const savedTicket = await this.ticketRepo.save(ticket);

    const message = this.messageRepo.create({
      ticketId: savedTicket.id,
      senderId: customerId,
      message: dto.message,
      isInternal: false,
    });
    await this.messageRepo.save(message);

    return savedTicket;
  }

  async getCustomerSupportTickets(customerId: string) {
    return this.ticketRepo.find({
      where: { userId: customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async getSupportTicketDetail(customerId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, userId: customerId },
    });
    if (!ticket) {
      throw new NotFoundException('Yêu cầu hỗ trợ không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    const messages = await this.messageRepo.find({
      where: { ticketId, isInternal: false },
      order: { createdAt: 'ASC' },
    });
    return {
      ticket,
      messages,
    };
  }

  async sendSupportMessage(customerId: string, ticketId: string, dto: SendSupportMessageDto) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, userId: customerId },
    });
    if (!ticket) {
      throw new NotFoundException('Yêu cầu hỗ trợ không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException(
        'Yêu cầu hỗ trợ này đã đóng, không thể gửi thêm tin nhắn (R1-071).',
      );
    }

    const msg = this.messageRepo.create({
      ticketId,
      senderId: customerId,
      message: dto.message,
      isInternal: false,
    });
    const saved = await this.messageRepo.save(msg);

    if (ticket.status === TicketStatus.ANSWERED) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepo.save(ticket);
    }

    return saved;
  }

  async closeSupportTicket(customerId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, userId: customerId },
    });
    if (!ticket) {
      throw new NotFoundException('Yêu cầu hỗ trợ không tồn tại hoặc không thuộc quyền sở hữu.');
    }
    ticket.status = TicketStatus.CLOSED;
    await this.ticketRepo.save(ticket);
    return { success: true, message: 'Đã đóng yêu cầu hỗ trợ thành công.' };
  }

  // ==========================================
  // STORE COMPLAINTS & REVIEWS (R2-054..R2-060)
  // ==========================================

  /**
   * Lấy danh sách khiếu nại của quán (R2-054)
   */
  async getStoreComplaints(storeId: string, status?: ComplaintStatus) {
    const where: any = { storeId };
    if (status) {
      where.status = status;
    }
    const complaints = await this.complaintRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const orderIds = complaints.map((c) => c.orderId);
    let orders: OrderEntity[] = [];
    if (orderIds.length > 0) {
      orders = await this.orderRepo.find({
        where: orderIds.map((id) => ({ id })),
      });
    }
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    return complaints.map((c) => ({
      ...c,
      order: orderMap.get(c.orderId) || null,
    }));
  }

  /**
   * Xem chi tiết khiếu nại phía cửa hàng kèm ảnh bằng chứng và đơn hàng (R2-054)
   */
  async getStoreComplaintDetail(storeId: string, complaintId: string) {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId, storeId },
    });
    if (!complaint) {
      throw new NotFoundException(
        'Khiếu nại không tồn tại hoặc không thuộc quyền sở hữu của quán.',
      );
    }
    const attachments = await this.attachmentRepo.find({
      where: { complaintId },
      order: { createdAt: 'ASC' },
    });
    const order = await this.orderRepo.findOne({
      where: { id: complaint.orderId },
    });
    return {
      complaint,
      attachments,
      order,
    };
  }

  /**
   * Cửa hàng chấp nhận khiếu nại và hoàn tiền cho khách (R2-055, BR-054)
   */
  async resolveComplaint(storeId: string, complaintId: string, dto: ResolveComplaintDto) {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId, storeId },
    });
    if (!complaint) {
      throw new NotFoundException(
        'Khiếu nại không tồn tại hoặc không thuộc quyền sở hữu của quán.',
      );
    }
    if (complaint.status !== ComplaintStatus.PENDING_STORE) {
      throw new BadRequestException(
        'Chỉ có thể giải quyết khiếu nại đang ở trạng thái chờ xử lý (PENDING_STORE).',
      );
    }
    const order = await this.orderRepo.findOne({
      where: { id: complaint.orderId },
    });
    if (!order) {
      throw new NotFoundException('Đơn hàng liên quan không tồn tại.');
    }

    const orderAmount = order.totalAmount || 0;
    const refundAmount = dto.refundAmount !== undefined ? dto.refundAmount : orderAmount;
    if (refundAmount > orderAmount) {
      throw new BadRequestException(
        `Số tiền hoàn không được vượt quá số tiền khách đã thanh toán (${orderAmount} VND).`,
      );
    }

    complaint.status = ComplaintStatus.ACCEPTED;
    complaint.refundAmount = refundAmount;
    await this.complaintRepo.save(complaint);

    if (refundAmount > 0) {
      const refundTxn = this.paymentTxnRepo.create({
        orderId: order.id,
        storeId,
        kind: PaymentKind.ORDER_REFUND,
        amount: refundAmount,
        method: PaymentMethod.SIMULATED,
        status: PaymentStatus.SUCCEEDED,
        gatewayTxnId: `REFUND_${complaint.id}_${Date.now()}`,
      });
      await this.paymentTxnRepo.save(refundTxn);
    }

    if (refundAmount >= orderAmount && order.status === OrderStatus.PICKED_UP) {
      order.status = OrderStatus.REFUNDED;
      await this.orderRepo.save(order);
    }

    return {
      success: true,
      message: 'Giải quyết khiếu nại thành công.',
      complaint,
    };
  }

  /**
   * Cửa hàng từ chối khiếu nại với lý do bắt buộc (R2-056, BR-056)
   */
  async rejectComplaint(storeId: string, complaintId: string, dto: RejectComplaintDto) {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId, storeId },
    });
    if (!complaint) {
      throw new NotFoundException(
        'Khiếu nại không tồn tại hoặc không thuộc quyền sở hữu của quán.',
      );
    }
    if (complaint.status !== ComplaintStatus.PENDING_STORE) {
      throw new BadRequestException(
        'Chỉ có thể từ chối khiếu nại đang ở trạng thái chờ xử lý (PENDING_STORE).',
      );
    }
    complaint.status = ComplaintStatus.REJECTED;
    complaint.rejectReason = dto.reason;
    await this.complaintRepo.save(complaint);

    return {
      success: true,
      message: 'Đã từ chối khiếu nại.',
      complaint,
    };
  }

  /**
   * Cửa hàng gia hạn thời gian xử lý khiếu nại thêm 24 giờ (R2-055, BR-055)
   */
  async extendComplaint(storeId: string, complaintId: string) {
    const complaint = await this.complaintRepo.findOne({
      where: { id: complaintId, storeId },
    });
    if (!complaint) {
      throw new NotFoundException(
        'Khiếu nại không tồn tại hoặc không thuộc quyền sở hữu của quán.',
      );
    }
    if (complaint.status !== ComplaintStatus.PENDING_STORE) {
      throw new BadRequestException(
        'Chỉ có thể gia hạn khiếu nại đang ở trạng thái chờ xử lý (PENDING_STORE).',
      );
    }
    if (complaint.extended) {
      throw new BadRequestException(
        'Khiếu nại này đã được gia hạn trước đó. Cửa hàng chỉ được gia hạn tối đa 1 lần (+24 giờ) (BR-055).',
      );
    }
    complaint.extended = true;
    complaint.responseDueAt = new Date(
      new Date(complaint.responseDueAt).getTime() + 24 * 60 * 60 * 1000,
    );
    await this.complaintRepo.save(complaint);

    return {
      success: true,
      message: 'Đã gia hạn thời gian phản hồi thêm 24 giờ thành công (BR-055).',
      complaint,
    };
  }

  /**
   * Lấy danh sách đánh giá của quán có bộ lọc (R2-057, R2-058)
   */
  async getStoreReviews(
    storeId: string,
    query?: { rating?: number; status?: ReviewStatus; hasReply?: boolean },
  ) {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .where('review.store_id = :storeId', { storeId });

    if (query?.rating) {
      qb.andWhere('review.rating = :rating', { rating: query.rating });
    }
    if (query?.status) {
      qb.andWhere('review.status = :status', { status: query.status });
    }
    if (query?.hasReply !== undefined) {
      if (query.hasReply) {
        qb.andWhere('review.store_reply IS NOT NULL');
      } else {
        qb.andWhere('review.store_reply IS NULL');
      }
    }

    qb.orderBy('review.created_at', 'DESC');
    return qb.getMany();
  }

  /**
   * Phản hồi đánh giá của khách hàng (R2-057, BR-057)
   */
  async replyReview(storeId: string, reviewId: string, dto: ReplyReviewDto) {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId, storeId },
    });
    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại hoặc không thuộc quyền sở hữu của quán.');
    }
    if (review.storeReply) {
      throw new BadRequestException(
        'Đánh giá này đã được phản hồi trước đó. Cửa hàng chỉ được phản hồi 1 lần duy nhất (BR-057).',
      );
    }
    review.storeReply = dto.reply;
    review.storeReplyAt = new Date();
    await this.reviewRepo.save(review);

    return {
      success: true,
      message: 'Đã phản hồi đánh giá thành công.',
      review,
    };
  }
}
