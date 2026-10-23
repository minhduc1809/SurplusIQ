import { BadRequestException, ConflictException } from '@nestjs/common';
import { ContractStatus } from '../../entities/stores/store-contract.entity';
import { detectContractType, StoreLegalService } from './store-legal.service';

describe('detectContractType', () => {
  it('nhận PDF, JPG, PNG theo chữ ký đầu tệp', () => {
    expect(detectContractType(Buffer.from('%PDF-1.7 ...'))?.mime).toBe('application/pdf');
    expect(detectContractType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]))?.mime).toBe('image/jpeg');
    expect(
      detectContractType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime,
    ).toBe('image/png');
  });

  it('từ chối tệp giả đuôi (nội dung không phải PDF/ảnh)', () => {
    expect(detectContractType(Buffer.from('MZ\x90\x00 chương trình chạy được'))).toBeNull();
    expect(detectContractType(Buffer.from('<html></html>'))).toBeNull();
  });
});

describe('StoreLegalService', () => {
  const profileRepo = { findOne: jest.fn(), create: jest.fn((x) => x), save: jest.fn((x) => x) };
  const contractRepo = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn((x) => x),
    find: jest.fn(),
  };

  const storeRepo = {
    count: jest.fn().mockResolvedValue(10),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn((x) => x),
  };
  const notificationsService = {
    createNotification: jest.fn(),
    notifyQuietly: jest.fn(),
  };
  const service = new StoreLegalService(
    profileRepo as never,
    contractRepo as never,
    storeRepo as never,
    notificationsService as never,
  );
  const pdf = { buffer: Buffer.from('%PDF-1.7 hợp đồng'), size: 20, originalname: 'hd.pdf' };

  beforeEach(() => jest.clearAllMocks());

  it('không cho tải tệp sai định dạng thật', async () => {
    contractRepo.findOne.mockResolvedValue(null);
    await expect(
      service.uploadContract('s1', 'u1', {
        buffer: Buffer.from('not a pdf'),
        size: 9,
        originalname: 'hd.pdf',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('không cho tải bản mới khi đang chờ duyệt hoặc đã duyệt', async () => {
    contractRepo.findOne.mockResolvedValue({ status: ContractStatus.PENDING_REVIEW });
    await expect(service.uploadContract('s1', 'u1', pdf)).rejects.toBeInstanceOf(ConflictException);
    contractRepo.findOne.mockResolvedValue({ status: ContractStatus.APPROVED });
    await expect(service.uploadContract('s1', 'u1', pdf)).rejects.toBeInstanceOf(ConflictException);
  });

  it('từ chối hoặc yêu cầu bổ sung bắt buộc có lý do', async () => {
    contractRepo.findOne.mockResolvedValue({ id: 'c1', status: ContractStatus.PENDING_REVIEW });
    await expect(
      service.review('c1', 'admin', { decision: ContractStatus.REJECTED }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('chỉ duyệt được hợp đồng đang chờ duyệt', async () => {
    contractRepo.findOne.mockResolvedValue({ id: 'c1', status: ContractStatus.APPROVED });
    await expect(
      service.review('c1', 'admin', { decision: ContractStatus.APPROVED }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('duyệt ghi lại người duyệt và thời điểm', async () => {
    contractRepo.findOne.mockResolvedValue({ id: 'c1', status: ContractStatus.PENDING_REVIEW });
    const res = await service.review('c1', 'admin-1', { decision: ContractStatus.APPROVED });
    expect(res?.status).toBe(ContractStatus.APPROVED);
    expect(contractRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ reviewedBy: 'admin-1', reviewedAt: expect.any(Date) }),
    );
  });
});
