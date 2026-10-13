import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CustomerInteractionsService } from './customer-interactions.service';
import { ComplaintEntity, ComplaintStatus } from '../../entities/complaints/complaint.entity';
import { ComplaintAttachmentEntity } from '../../entities/complaints/complaint-attachment.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/complaints/review.entity';
import { OrderEntity, OrderStatus } from '../../entities/orders/order.entity';
import { OfferEntity } from '../../entities/catalog/offer.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';
import { StoreEntity } from '../../entities/stores/store.entity';

describe('CustomerInteractionsService', () => {
  let service: CustomerInteractionsService;
  let complaintRepo: any;
  let attachmentRepo: any;
  let reviewRepo: any;
  let orderRepo: any;
  let offerRepo: any;
  let itemRepo: any;
  let storeRepo: any;

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
    offerRepo = {};
    itemRepo = {};
    storeRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerInteractionsService,
        { provide: getRepositoryToken(ComplaintEntity), useValue: complaintRepo },
        { provide: getRepositoryToken(ComplaintAttachmentEntity), useValue: attachmentRepo },
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewRepo },
        { provide: getRepositoryToken(OrderEntity), useValue: orderRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offerRepo },
        { provide: getRepositoryToken(ItemEntity), useValue: itemRepo },
        { provide: getRepositoryToken(StoreEntity), useValue: storeRepo },
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
});
