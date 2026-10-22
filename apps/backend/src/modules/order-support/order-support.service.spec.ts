import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OfferStatus } from '../../entities/catalog/offer.entity';
import { GiftStatus } from '../../entities/order-support/order-gift.entity';
import { IncidentStatus, IncidentType } from '../../entities/order-support/pickup-incident.entity';
import { OrderStatus } from '../../entities/orders/order.entity';
import { OrderSupportService } from './order-support.service';
import { OrderTransferService } from './order-transfer.service';

const minutes = (m: number) => new Date(Date.now() + m * 60000);

const paidOrder = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  code: 'SQ1',
  customerId: 'cus-1',
  storeId: 'st-1',
  offerId: 'of-1',
  quantity: 2,
  unitPrice: 30000,
  totalAmount: 60000,
  status: OrderStatus.PAID,
  holdExpiresAt: minutes(-60),
  swappedAt: null,
  pickedUpAt: null,
  cancelledAt: null,
  updatedAt: new Date(),
  ...over,
});

const offer = (over: Record<string, unknown> = {}) => ({
  id: 'of-1',
  storeId: 'st-1',
  itemId: 'it-1',
  status: OfferStatus.OPEN,
  currentPrice: 30000,
  remainingQuantity: 5,
  pickupStart: minutes(-30),
  pickupEnd: minutes(90),
  ...over,
});

function repo(over: Record<string, jest.Mock> = {}) {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve({ id: 'new-1', createdAt: new Date(), ...v })),
    ...over,
  };
}

function buildSupport(
  opts: { order?: object | null; offer?: object | null; incidents?: object[] } = {},
) {
  const orderRepo = repo({
    findOne: jest.fn().mockResolvedValue(opts.order === undefined ? paidOrder() : opts.order),
  });
  const offerRepo = repo({
    findOne: jest.fn().mockResolvedValue(opts.offer === undefined ? offer() : opts.offer),
  });
  const incidentRepo = repo({ find: jest.fn().mockResolvedValue(opts.incidents ?? []) });
  const messageRepo = repo();
  const notifications = { createNotification: jest.fn() };
  const audit = { log: jest.fn() };
  const service = new OrderSupportService(
    orderRepo as never,
    offerRepo as never,
    repo() as never,
    incidentRepo as never,
    messageRepo as never,
    { query: jest.fn(), transaction: jest.fn() } as unknown as DataSource,
    notifications as never,
    audit as never,
  );
  return { service, incidentRepo, notifications, orderRepo };
}

describe('OrderSupportService sự cố khi nhận (KX03)', () => {
  it('ghi sự cố và báo cho cửa hàng khi đơn đã thanh toán và đang trong khung nhận', async () => {
    const h = buildSupport();
    const res = await h.service.createIncident('cus-1', 'o1', {
      type: IncidentType.STORE_CLOSED,
      note: ' đóng cửa ',
    });
    expect(res).toMatchObject({
      type: IncidentType.STORE_CLOSED,
      status: IncidentStatus.OPEN,
      note: 'đóng cửa',
    });
    expect(h.notifications.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'st-1', title: 'Khách báo sự cố khi nhận hàng' }),
    );
  });

  it('chỉ nhận sự cố cho đơn đã thanh toán, trong khung giờ nhận, không trùng và không quá 3 sự cố', async () => {
    await expect(
      buildSupport({ order: paidOrder({ status: OrderStatus.PICKED_UP }) }).service.createIncident(
        'cus-1',
        'o1',
        { type: IncidentType.OTHER },
      ),
    ).rejects.toThrow('đã thanh toán');
    await expect(
      buildSupport({
        offer: offer({ pickupStart: minutes(300), pickupEnd: minutes(400) }),
      }).service.createIncident('cus-1', 'o1', { type: IncidentType.OTHER }),
    ).rejects.toThrow('khung giờ nhận');
    await expect(
      buildSupport({
        incidents: [{ type: IncidentType.NOT_READY, status: IncidentStatus.OPEN }],
      }).service.createIncident('cus-1', 'o1', { type: IncidentType.NOT_READY }),
    ).rejects.toThrow(ConflictException);
    const three = Array.from({ length: 3 }, () => ({
      type: IncidentType.OTHER,
      status: IncidentStatus.RESOLVED,
    }));
    await expect(
      buildSupport({ incidents: three }).service.createIncident('cus-1', 'o1', {
        type: IncidentType.LONG_WAIT,
      }),
    ).rejects.toThrow('tối đa 3');
  });

  it('không tìm thấy đơn của người khác', async () => {
    await expect(
      buildSupport({ order: null }).service.createIncident('cus-2', 'o1', {
        type: IncidentType.OTHER,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('cửa hàng phải ghi lý do khi không công nhận sự cố', async () => {
    const h = buildSupport();
    await expect(
      h.service.respondIncident('st-1', 'u1', 'i1', { action: 'REJECT', note: 'ko' }),
    ).rejects.toThrow('lý do');
  });
});

describe('OrderSupportService trò chuyện (KX11)', () => {
  it('đóng trò chuyện khi đơn chưa thanh toán', async () => {
    const h = buildSupport({ order: paidOrder({ status: OrderStatus.PENDING_PAYMENT }) });
    await expect(h.service.customerSend('cus-1', 'o1', { body: 'xin chào' })).rejects.toThrow(
      'sau khi đơn được thanh toán',
    );
  });

  it('đóng trò chuyện sau 24 giờ kể từ khi đơn kết thúc', async () => {
    const h = buildSupport({
      order: paidOrder({ status: OrderStatus.PICKED_UP, pickedUpAt: minutes(-25 * 60) }),
    });
    await expect(h.service.customerSend('cus-1', 'o1', { body: 'cảm ơn' })).rejects.toThrow(
      'đóng sau 24 giờ',
    );
  });
});

function buildTransfer(
  opts: {
    order?: object | null;
    offers?: Record<string, object>;
    recipient?: object | null;
    giftsToday?: number;
    pendingGift?: object | null;
  } = {},
) {
  const order = opts.order === undefined ? paidOrder() : opts.order;
  const orderRepo = repo({ findOne: jest.fn().mockResolvedValue(order) });
  const offers = opts.offers ?? { 'of-1': offer() };
  const offerRepo = repo({
    findOne: jest.fn(({ where }) => Promise.resolve(offers[where.id] ?? null)),
    find: jest.fn().mockResolvedValue(Object.values(offers)),
  });
  const giftRepo = repo({
    count: jest.fn().mockResolvedValue(opts.giftsToday ?? 0),
    findOne: jest.fn().mockResolvedValue(opts.pendingGift ?? null),
  });
  const userRepo = repo({
    findOne: jest
      .fn()
      .mockResolvedValue(
        opts.recipient === undefined
          ? { id: 'cus-2', role: 'CUSTOMER', status: 'ACTIVE', phone: '0901234567' }
          : opts.recipient,
      ),
  });
  const manager = { findOne: jest.fn().mockResolvedValue(null) };
  const service = new OrderTransferService(
    orderRepo as never,
    offerRepo as never,
    repo() as never,
    giftRepo as never,
    userRepo as never,
    repo({ findOne: jest.fn().mockResolvedValue({ fullName: 'Người Tặng' }) }) as never,
    { manager, transaction: jest.fn() } as unknown as DataSource,
    { createNotification: jest.fn() } as never,
    { log: jest.fn() } as never,
  );
  return { service, giftRepo };
}

describe('OrderTransferService tặng suất (KX18)', () => {
  it('tặng được cho khách khác và hết hạn trước khi khung nhận kết thúc', async () => {
    const h = buildTransfer();
    const gift = await h.service.createGift('cus-1', 'o1', {
      recipient: '0901234567',
      message: 'Ăn ngon nhé',
    });
    expect(gift.status).toBe(GiftStatus.PENDING);
    expect(new Date(gift.expiresAt).getTime()).toBeLessThan(minutes(90).getTime());
  });

  it('từ chối khi tặng chính mình, người nhận không tồn tại, quá giới hạn ngày hoặc còn quá ít thời gian', async () => {
    await expect(
      buildTransfer({
        recipient: { id: 'cus-1', role: 'CUSTOMER', status: 'ACTIVE' },
      }).service.createGift('cus-1', 'o1', { recipient: '0900000001' }),
    ).rejects.toThrow('chính mình');
    await expect(
      buildTransfer({ recipient: null }).service.createGift('cus-1', 'o1', {
        recipient: '0900000009',
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      buildTransfer({ giftsToday: 3 }).service.createGift('cus-1', 'o1', {
        recipient: '0901234567',
      }),
    ).rejects.toThrow('tối đa 3');
    await expect(
      buildTransfer({ offers: { 'of-1': offer({ pickupEnd: minutes(10) }) } }).service.createGift(
        'cus-1',
        'o1',
        { recipient: '0901234567' },
      ),
    ).rejects.toThrow('ít nhất 30 phút');
    await expect(
      buildTransfer({ order: paidOrder({ status: OrderStatus.PICKED_UP }) }).service.createGift(
        'cus-1',
        'o1',
        { recipient: '0901234567' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('một đơn chỉ có một lời tặng chờ', async () => {
    await expect(
      buildTransfer({ pendingGift: { id: 'g0' } }).service.createGift('cus-1', 'o1', {
        recipient: '0901234567',
      }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('OrderTransferService đổi suất (KX05)', () => {
  it('chỉ liệt kê suất cùng cửa hàng còn đủ phần, giá không cao hơn và không kết thúc muộn hơn mã QR', async () => {
    const h = buildTransfer({
      offers: {
        'of-1': offer(),
        cheap: offer({ id: 'cheap', currentPrice: 20000, pickupEnd: minutes(60) }),
        pricey: offer({ id: 'pricey', currentPrice: 45000 }),
        late: offer({ id: 'late', currentPrice: 20000, pickupEnd: minutes(500) }),
        short: offer({ id: 'short', currentPrice: 20000, remainingQuantity: 1 }),
      },
    });
    const res = await h.service.getSwapOptions('cus-1', 'o1');
    expect(res.options.map((o) => o.offerId)).toEqual(['cheap']);
    expect(res.note).toContain('không được hoàn phần chênh lệch');
  });

  it('không đổi lần hai và không đổi khi đơn đã nhận', async () => {
    await expect(
      buildTransfer({ order: paidOrder({ swappedAt: new Date() }) }).service.getSwapOptions(
        'cus-1',
        'o1',
      ),
    ).rejects.toThrow('một lần');
    await expect(
      buildTransfer({ order: paidOrder({ status: OrderStatus.PICKED_UP }) }).service.getSwapOptions(
        'cus-1',
        'o1',
      ),
    ).rejects.toThrow('đã thanh toán');
  });
});
