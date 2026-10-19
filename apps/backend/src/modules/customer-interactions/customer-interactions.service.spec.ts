import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CustomerInteractionsService } from './customer-interactions.service';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { ComplaintAttachmentEntity } from '../../entities/complaints/complaint-attachment.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import { ViolationReportEntity } from '../../entities/complaints/violation-report.entity';
import { SupportTicketEntity, TicketStatus } from '../../entities/complaints/support-ticket.entity';
import { SupportMessageEntity } from '../../entities/complaints/support-message.entity';
import { ViolationTargetType } from './dto/interaction-extras.dto';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';
import { PaymentTransactionEntity } from '../../entities/orders/payment-transaction.entity';

describe('CustomerInteractionsService', () => {
  let service: CustomerInteractionsService;
  let complaintRepo: any;
  let attachmentRepo: any;
  let reviewRepo: any;
  let violationReportRepo: any;
  let supportTicketRepo: any;
  let supportMessageRepo: any;
  let orderRepo: any;
  let offerRepo: any;
  let itemRepo: any;
  let storeRepo: any;
  let transactionManager: any;
  let paymentTxnRepo: any;

  beforeEach(async () => {
    complaintRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'comp-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'comp-1', ...d })),
    };
    attachmentRepo = {
      create: jest.fn().mockImplementation((d) => ({ id: 'att-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };
    reviewRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'rev-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'rev-1', ...d })),
    };
    orderRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            order_id: 'ord-1',
            quantity: 2,
            unit_price: 25000,
            original_price: 50000,
            weight_grams: 400,
          },
        ]),
      }),
    };
    violationReportRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'rep-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'rep-1', ...d })),
    };
    supportTicketRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => ({ id: 'tick-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'tick-1', ...d })),
    };
    supportMessageRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => ({ id: 'msg-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'msg-1', ...d })),
    };
    offerRepo = {};
    itemRepo = {};
    storeRepo = {
      findOne: jest.fn(),
    };
    paymentTxnRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => ({ id: 'pt-1', ...d })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'pt-1', ...d })),
    };
    const repositories = new Map<any, any>([
      [ComplaintEntity, complaintRepo],
      [OrderEntity, orderRepo],
      [PaymentTransactionEntity, paymentTxnRepo],
    ]);
    transactionManager = {
      findOne: jest.fn(async (entity, options) => {
        const value = await repositories.get(entity).findOne(options);
        return value ? Object.assign(new entity(), value) : null;
      }),
      find: jest.fn((entity, options) => repositories.get(entity).find(options)),
      create: jest.fn((entity, value) =>
        Object.assign(new entity(), repositories.get(entity).create(value)),
      ),
      save: jest.fn((value) => repositories.get(value.constructor).save(value)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerInteractionsService,
        { provide: getRepositoryToken(ComplaintEntity), useValue: complaintRepo },
        { provide: getRepositoryToken(ComplaintAttachmentEntity), useValue: attachmentRepo },
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: getRepositoryToken(ViolationReportEntity), useValue: violationReportRepo },
        { provide: getRepositoryToken(SupportTicketEntity), useValue: supportTicketRepo },
        { provide: getRepositoryToken(SupportMessageEntity), useValue: supportMessageRepo },
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
        { provide: getRepositoryToken(PaymentTransactionEntity), useValue: paymentTxnRepo },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn((work) => work(transactionManager)) },
        },
      ],
    }).compile();

    service = module.get<CustomerInteractionsService>(CustomerInteractionsService);
  });

  describe('createComplaint', () => {
    it('nên tạo khiếu nại thành công trong 24 giờ sau khi nhận đơn (R1-061)', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        customerId: 'user-1',
        storeId: 'store-1',
        status: OrderStatus.PICKED_UP,
        pickedUpAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 giờ trước
      });
      complaintRepo.findOne.mockResolvedValue(null);

      const result = await service.createComplaint('user-1', 'ord-1', {
        category: 'Hàng hỏng',
        description: 'Bánh mì có mùi lạ không ăn được.',
        imageUrls: ['https://example.com/photo.jpg'],
      });

      expect(result.id).toBe('comp-1');
      expect(result.category).toBe('Hàng hỏng');
      expect(result.status).toBe(ComplaintStatus.PENDING_STORE);
      expect(result.attachments).toEqual(['https://example.com/photo.jpg']);
    });

    it('nên từ chối khiếu nại nếu đơn chưa hoàn tất (chưa nhận)', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        customerId: 'user-1',
        status: OrderStatus.PAID, // Chưa nhận
      });

      await expect(
        service.createComplaint('user-1', 'ord-1', {
          category: 'Hàng hỏng',
          description: 'Mô tả hợp lệ nhưng chưa nhận',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên từ chối khiếu nại nếu đã quá 24 giờ kể từ khi nhận (R1-061)', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        customerId: 'user-1',
        status: OrderStatus.PICKED_UP,
        pickedUpAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 giờ trước
      });

      await expect(
        service.createComplaint('user-1', 'ord-1', {
          category: 'Hàng hỏng',
          description: 'Mô tả hợp lệ nhưng quá 24h',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createReview', () => {
    it('nên gửi đánh giá 1-5 sao thành công cho đơn đã nhận (R1-064)', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        customerId: 'user-1',
        storeId: 'store-1',
        status: OrderStatus.PICKED_UP,
      });
      reviewRepo.findOne.mockResolvedValue(null);

      const rev = await service.createReview('user-1', 'ord-1', {
        rating: 5,
        comment: 'Rất hài lòng!',
      });

      expect(rev.id).toBe('rev-1');
      expect(rev.rating).toBe(5);
      expect(rev.status).toBe(ReviewStatus.VISIBLE);
    });

    it('nên chặn đánh giá lặp lại cho cùng một đơn (R1-064)', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        customerId: 'user-1',
        status: OrderStatus.PICKED_UP,
      });
      reviewRepo.findOne.mockResolvedValue({ id: 'existing-rev' });

      await expect(service.createReview('user-1', 'ord-1', { rating: 4 })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getCustomerImpact', () => {
    it('nên tính đúng tổng số tiền tiết kiệm và khối lượng thực phẩm đã cứu (R1-076)', async () => {
      const impact = await service.getCustomerImpact('user-1');

      expect(impact.totalOrders).toBe(1);
      // 2 suất * (50000 - 25000) = 50.000 VND
      expect(impact.totalSavingsVnd).toBe(50000);
      // 2 suất * 400g = 800g = 0.8 kg
      expect(impact.totalFoodSavedKg).toBe(0.8);
    });
  });

  describe('withdrawComplaint & addAttachments (R1-063, R1-068)', () => {
    it('cho phép rút khiếu nại đang chờ xử lý', async () => {
      complaintRepo.findOne.mockResolvedValue({
        id: 'comp-1',
        customerId: 'user-1',
        status: ComplaintStatus.PENDING_STORE,
      });

      const res = await service.withdrawComplaint('user-1', 'comp-1');
      expect(res.success).toBe(true);
      expect(complaintRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ComplaintStatus.CLOSED,
        }),
      );
    });

    it('từ chối rút khiếu nại nếu đã được chấp nhận hoặc đóng', async () => {
      complaintRepo.findOne.mockResolvedValue({
        id: 'comp-1',
        customerId: 'user-1',
        status: ComplaintStatus.ACCEPTED,
      });

      await expect(service.withdrawComplaint('user-1', 'comp-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateReview & hideReview (R1-065, R1-066)', () => {
    it('cho phép chỉnh sửa đánh giá trong vòng 24 giờ', async () => {
      reviewRepo.findOne.mockResolvedValue({
        id: 'rev-1',
        customerId: 'user-1',
        rating: 4,
        comment: 'Ngon',
        createdAt: new Date(),
      });

      const res = await service.updateReview('user-1', 'rev-1', {
        rating: 5,
        comment: 'Rất ngon!',
      });

      expect(res.rating).toBe(5);
      expect(res.comment).toBe('Rất ngon!');
    });

    it('cho phép ẩn đánh giá', async () => {
      reviewRepo.findOne.mockResolvedValue({
        id: 'rev-1',
        customerId: 'user-1',
        status: ReviewStatus.VISIBLE,
      });

      const res = await service.hideReview('user-1', 'rev-1');
      expect(res.success).toBe(true);
    });
  });

  describe('createViolationReport (R1-069)', () => {
    it('tạo báo cáo vi phạm thành công', async () => {
      violationReportRepo.findOne.mockResolvedValue(null);

      const res = await service.createViolationReport('user-1', {
        targetType: ViolationTargetType.STORE,
        targetId: 'store-1',
        reason: 'Quán không phục vụ đúng món',
      });

      expect(res.id).toBe('rep-1');
      expect(violationReportRepo.create).toHaveBeenCalled();
    });
  });

  describe('supportTickets (R1-070, R1-071)', () => {
    it('tạo ticket hỗ trợ mới thành công kèm tin nhắn đầu tiên', async () => {
      supportTicketRepo.count.mockResolvedValue(1);

      const res = await service.createSupportTicket('user-1', {
        subject: 'Hỏi về đơn hàng',
        message: 'Đơn hàng của tôi chưa có món',
      });

      expect(res.id).toBe('tick-1');
      expect(supportMessageRepo.create).toHaveBeenCalled();
    });

    it('gửi thêm tin nhắn trong ticket đang mở', async () => {
      supportTicketRepo.findOne.mockResolvedValue({
        id: 'tick-1',
        customerId: 'user-1',
        status: TicketStatus.OPEN,
      });

      const res = await service.sendSupportMessage('user-1', 'tick-1', {
        message: 'Tôi đã kiểm tra lại, cảm ơn!',
      });

      expect(res.id).toBe('msg-1');
    });
  });

  describe('Store Complaints & Reviews Management (R2-054..R2-060)', () => {
    describe('getStoreComplaints', () => {
      it('lấy danh sách khiếu nại của cửa hàng thành công', async () => {
        complaintRepo.find.mockResolvedValue([
          { id: 'comp-1', storeId: 'store-1', orderId: 'ord-1' },
        ]);
        orderRepo.find.mockResolvedValue([
          { id: 'ord-1', totalAmount: 50000, status: OrderStatus.PICKED_UP },
        ]);

        const result = await service.getStoreComplaints('store-1');
        expect(result).toHaveLength(1);
        expect(result[0].order?.id).toBe('ord-1');
      });
    });

    describe('getStoreComplaintDetail', () => {
      it('xem chi tiết khiếu nại kèm attachments và order', async () => {
        complaintRepo.findOne.mockResolvedValue({
          id: 'comp-1',
          storeId: 'store-1',
          orderId: 'ord-1',
        });
        attachmentRepo.find.mockResolvedValue([{ id: 'att-1', photoUrl: 'https://img.com/1.jpg' }]);
        orderRepo.findOne.mockResolvedValue({ id: 'ord-1' });

        const detail = await service.getStoreComplaintDetail('store-1', 'comp-1');
        expect(detail.complaint.id).toBe('comp-1');
        expect(detail.attachments).toHaveLength(1);
        expect(detail.order.id).toBe('ord-1');
      });

      it('ném lỗi NotFoundException nếu khiếu nại không thuộc quán', async () => {
        complaintRepo.findOne.mockResolvedValue(null);
        await expect(service.getStoreComplaintDetail('store-1', 'comp-99')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('resolveComplaint', () => {
      it('giải quyết khiếu nại và hoàn tiền thành công', async () => {
        complaintRepo.findOne.mockResolvedValue({
          id: 'comp-1',
          storeId: 'store-1',
          orderId: 'ord-1',
          status: ComplaintStatus.PENDING_STORE,
        });
        orderRepo.findOne.mockResolvedValue({
          id: 'ord-1',
          storeId: 'store-1',
          totalAmount: 50000,
          status: OrderStatus.PICKED_UP,
        });

        const res = await service.resolveComplaint('store-1', 'comp-1', {
          refundAmount: 50000,
          note: 'Hoàn 100% tiền đơn bánh',
        });

        expect(res.success).toBe(true);
        expect(complaintRepo.save).toHaveBeenCalled();
        expect(transactionManager.findOne).toHaveBeenCalledWith(
          ComplaintEntity,
          expect.objectContaining({
            lock: { mode: 'pessimistic_write' },
            where: { id: 'comp-1', storeId: 'store-1' },
          }),
        );
        expect(transactionManager.findOne).toHaveBeenCalledWith(
          OrderEntity,
          expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
        );
      });

      it('ném lỗi nếu số tiền hoàn vượt quá giá trị đơn hàng', async () => {
        complaintRepo.findOne.mockResolvedValue({
          id: 'comp-1',
          storeId: 'store-1',
          orderId: 'ord-1',
          status: ComplaintStatus.PENDING_STORE,
        });
        orderRepo.findOne.mockResolvedValue({
          id: 'ord-1',
          storeId: 'store-1',
          totalAmount: 30000,
        });

        await expect(
          service.resolveComplaint('store-1', 'comp-1', { refundAmount: 50000 }),
        ).rejects.toThrow(BadRequestException);
      });

      it('does not refund again after another channel has resolved the locked complaint', async () => {
        complaintRepo.findOne.mockResolvedValue({
          id: 'comp-1',
          storeId: 'store-1',
          status: ComplaintStatus.ACCEPTED,
        });
        await expect(
          service.resolveComplaint('store-1', 'comp-1', { refundAmount: 50000 }),
        ).rejects.toThrow(ConflictException);
        expect(paymentTxnRepo.save).not.toHaveBeenCalled();
        expect(complaintRepo.save).not.toHaveBeenCalled();
      });
    });

    describe('rejectComplaint', () => {
      it('từ chối khiếu nại thành công kèm lý do', async () => {
        complaintRepo.findOne.mockResolvedValue({
          id: 'comp-1',
          storeId: 'store-1',
          status: ComplaintStatus.PENDING_STORE,
        });

        const res = await service.rejectComplaint('store-1', 'comp-1', {
          reason: 'Bánh đúng chất lượng tiêu chuẩn tại quầy',
        });

        expect(res.success).toBe(true);
        expect(res.complaint.status).toBe(ComplaintStatus.REJECTED);
      });
    });

    describe('extendComplaint', () => {
      it('gia hạn thêm 24 giờ thành công lần đầu', async () => {
        const now = new Date();
        complaintRepo.findOne.mockResolvedValue({
          id: 'comp-1',
          storeId: 'store-1',
          status: ComplaintStatus.PENDING_STORE,
          extended: false,
          responseDueAt: now,
        });

        const res = await service.extendComplaint('store-1', 'comp-1');
        expect(res.success).toBe(true);
        expect(res.complaint.extended).toBe(true);
      });

      it('ném lỗi nếu khiếu nại đã từng được gia hạn trước đó', async () => {
        complaintRepo.findOne.mockResolvedValue({
          id: 'comp-1',
          storeId: 'store-1',
          status: ComplaintStatus.PENDING_STORE,
          extended: true,
          responseDueAt: new Date(),
        });

        await expect(service.extendComplaint('store-1', 'comp-1')).rejects.toThrow(
          BadRequestException,
        );
      });
    });

    describe('replyReview', () => {
      it('phản hồi đánh giá thành công lần đầu', async () => {
        reviewRepo.findOne.mockResolvedValue({
          id: 'rev-1',
          storeId: 'store-1',
          storeReply: null,
        });

        const res = await service.replyReview('store-1', 'rev-1', {
          reply: 'Cảm ơn quý khách đã ủng hộ tiệm bánh!',
        });

        expect(res.success).toBe(true);
        expect(res.review.storeReply).toBe('Cảm ơn quý khách đã ủng hộ tiệm bánh!');
      });

      it('ném lỗi nếu đánh giá đã từng được phản hồi trước đó', async () => {
        reviewRepo.findOne.mockResolvedValue({
          id: 'rev-1',
          storeId: 'store-1',
          storeReply: 'Phản hồi cũ',
        });

        await expect(
          service.replyReview('store-1', 'rev-1', { reply: 'Phản hồi mới' }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('ImpactBadges & FAQ (R1-081, R1-072)', () => {
    it('lấy danh hiệu tác động môi trường của khách hàng (R1-081)', async () => {
      jest.spyOn(service, 'getCustomerImpact').mockResolvedValueOnce({
        totalOrders: 6,
        totalFoodSavedKg: 2.5,
        totalSavingsVnd: 150000,
      });

      const badges = await service.getCustomerImpactBadges('user-1');
      expect(badges.impact.totalOrders).toBe(6);
      expect(badges.badges.length).toBeGreaterThan(0);
      expect(badges.badges[0].isUnlocked).toBe(true);
    });

    it('lấy danh sách câu hỏi thường gặp FAQ (R1-072)', async () => {
      const faq = await service.getHelpCenterFaq();
      expect(faq.length).toBeGreaterThan(0);
      expect(faq[0].faqs.length).toBeGreaterThan(0);
    });
  });
});
