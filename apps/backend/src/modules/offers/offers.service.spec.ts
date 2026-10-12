import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OffersService } from './offers.service';
import { OfferEntity } from './offer.entity';

describe('OffersService', () => {
  let service: OffersService;
  const mockOfferRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        {
          provide: getRepositoryToken(OfferEntity),
          useValue: mockOfferRepo,
        },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find active offers', async () => {
    mockOfferRepo.find.mockResolvedValue([{ id: '1', title: 'Bánh mì', status: 'ACTIVE' }]);

    const result = await service.findAllActive();
    expect(result).toHaveLength(1);
    expect(mockOfferRepo.find).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
  });
});
