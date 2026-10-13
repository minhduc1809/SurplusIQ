import { AuditLogService } from './audit-log.service';

describe('AuditLogService Unit Tests (R2-075, BR-080)', () => {
  let service: AuditLogService;
  let mockAuditRepo: any;

  beforeEach(() => {
    mockAuditRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'audit-1' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      createQueryBuilder: jest.fn(),
    };

    service = new AuditLogService(mockAuditRepo);
  });

  describe('log (Append-only audit trail)', () => {
    it('should create and save audit log with full context', async () => {
      const params = {
        storeId: 'store-1',
        actorId: 'user-1',
        actorRole: 'OWNER',
        action: 'PRICE_CHANGED',
        targetType: 'OFFER',
        targetId: 'offer-101',
        oldValue: { currentPrice: 50000 },
        newValue: { currentPrice: 40000 },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Chrome',
      };

      const result = await service.log(params);

      expect(mockAuditRepo.create).toHaveBeenCalledWith(params);
      expect(mockAuditRepo.save).toHaveBeenCalled();
      expect(result.id).toBe('audit-1');
      expect(result.action).toBe('PRICE_CHANGED');
    });
  });

  describe('getStoreAuditLogs (R2-075, 12-month retention BR-080)', () => {
    it('should filter logs by store_id and enforce 12-month retention window', async () => {
      const mockLogs = [
        { id: '1', action: 'PRICE_CHANGED', createdAt: new Date() },
        { id: '2', action: 'STOCK_ADJUSTED', createdAt: new Date() },
      ];

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 2]),
      };

      mockAuditRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.getStoreAuditLogs('store-1', {
        action: 'PRICE_CHANGED',
        page: 1,
        limit: 10,
      });

      expect(qb.where).toHaveBeenCalledWith('audit.store_id = :storeId', { storeId: 'store-1' });
      expect(qb.andWhere).toHaveBeenCalledWith('audit.action = :action', {
        action: 'PRICE_CHANGED',
      });
      expect(res.items).toHaveLength(2);
      expect(res.total).toBe(2);
      expect(res.retentionMonths).toBe(12);
    });
  });
});
