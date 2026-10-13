import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { ComplaintAttachmentEntity } from '../../entities/complaints/complaint-attachment.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateReviewDto } from './dto/create-review.dto';

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
}
