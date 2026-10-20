import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  RescueBridgeService,
  TRANSFER_TRANSITIONS,
  assertTransferTransition,
  hashToken,
  windowOverlaps,
} from './rescue-bridge.service';
import {
  RescueBridgeTransferEntity,
  RescueBridgeTransferStatus as T,
  TransportResponsibility,
} from '../../entities/rescue-bridge/rescue-bridge-transfer.entity';
import { RecipientOrganizationEntity } from '../../entities/rescue-bridge/recipient-organization.entity';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { DonationRecordEntity } from '../../entities/ai/donation-record.entity';
import { AuditLogEntity } from '../../entities/stores/audit-log.entity';

function qb(one: unknown, rawMany: unknown[] = []) {
  const q: Record<string, jest.Mock> = {};
  for (const k of ['setLock', 'where', 'andWhere', 'orderBy', 'select', 'setParameters'])
    q[k] = jest.fn(() => q);
  q.getOne = jest.fn(async () => one);
  q.getMany = jest.fn(async () => (one ? [one] : []));
  q.getRawMany = jest.fn(async () => rawMany);
  return q;
}

const mins = (n: number) => new Date(Date.now() + n * 60_000);

function makeOffer(over: Partial<OfferEntity> = {}) {
  return Object.assign(new OfferEntity(), {
    id: 'offer-1',
    storeId: 'store-1',
    itemId: null,
    remainingQuantity: 10,
    status: OfferStatus.OPEN,
    expiresAt: mins(600),
    pickupEnd: mins(120),
    ...over,
  });
}

function makeTransfer(over: Partial<RescueBridgeTransferEntity> = {}) {
  return Object.assign(new RescueBridgeTransferEntity(), {
    id: 'tr-1',
    storeId: 'store-1',
    offerId: 'offer-1',
    recipientOrgId: 'org-1',
    foodCategory: 'Bánh mì',
    quantityProposed: 8,
    quantityAccepted: 6,
    quantityHandedOver: null,
    reservedQuantity: 6,
    availableAt: mins(-30),
    handoverDeadline: mins(60),
    storageNotes: 'mát',
    transportResponsibility: TransportResponsibility.RECIPIENT_PICKUP,
    transferStatus: T.AWAITING_HANDOVER,
    senderConfirmedAt: null,
    senderConfirmedQuantity: null,
    recipientConfirmedAt: null,
    recipientConfirmedQuantity: null,
    evidenceReference: null,
    isDisputed: false,
    disputeNote: null,
    failureReason: null,
    ...over,
  });
}

function setup(
  opts: {
    offer?: OfferEntity;
    transfer?: RescueBridgeTransferEntity;
    evidenceRequired?: boolean;
  } = {},
) {
  const offer = opts.offer ?? makeOffer();
  const transfer = opts.transfer ?? makeTransfer();
  const org = Object.assign(new RecipientOrganizationEntity(), {
    id: 'org-1',
    name: 'Bếp cơm',
    isActive: true,
    isApproved: true,
    maxQuantityPerTransfer: 50,
  });
  const saved: unknown[] = [];
  const m = {
    createQueryBuilder: jest.fn((E: unknown) => qb(E === OfferEntity ? offer : transfer)),
    save: jest.fn(async (x: unknown) => {
      saved.push(x);
      return x;
    }),
    create: jest.fn((E: new () => object, data: object) => Object.assign(new E(), data)),
    findOne: jest.fn(async (E: unknown) =>
      E === OfferEntity ? offer : E === RecipientOrganizationEntity ? org : null,
    ),
  };
  const dataSource = {
    transaction: jest.fn(async (fn: (x: typeof m) => unknown) => fn(m)),
    manager: m,
  };
  const settings = {
    getPlatformSetting: jest.fn(async (key: string, def: unknown) =>
      key === 'rescue_bridge.evidence_required' ? (opts.evidenceRequired ?? true) : def,
    ),
  };
  const transferRepo = { createQueryBuilder: jest.fn(() => qb(null, [{ id: transfer.id }])) };
  const config = { get: jest.fn(() => 'https://web.test') };
  const service = new RescueBridgeService(
    transferRepo as never,
    {} as never,
    settings as never,
    config as never,
    dataSource as never,
  );
  const savedOf = <E>(E: new () => E) => saved.filter((x): x is E => x instanceof E);
  return { service, offer, transfer, m, savedOf };
}

describe('RescueBridge state machine', () => {
  it('terminal states have no exits', () => {
    for (const s of [T.REJECTED, T.HANDED_OVER, T.PARTIAL, T.FAILED, T.CANCELLED]) {
      expect(TRANSFER_TRANSITIONS[s]).toEqual([]);
    }
  });
  it('cannot skip agreement', () => {
    expect(() => assertTransferTransition(T.SENT, T.HANDED_OVER)).toThrow(ConflictException);
    expect(() => assertTransferTransition(T.ACCEPTED, T.AWAITING_HANDOVER)).not.toThrow();
  });
});

describe('windowOverlaps (giờ VN)', () => {
  // 13:00Z = 20:00 giờ VN
  const at = (iso: string) => new Date(iso);
  it('no window = always', () =>
    expect(windowOverlaps(at('2026-10-20T13:00:00Z'), at('2026-10-20T14:00:00Z'), null, null)).toBe(
      true,
    ));
  it('inside window', () =>
    expect(
      windowOverlaps(at('2026-10-20T13:00:00Z'), at('2026-10-20T14:00:00Z'), '19:00', '21:00'),
    ).toBe(true));
  it('outside window', () =>
    expect(
      windowOverlaps(at('2026-10-20T13:00:00Z'), at('2026-10-20T14:00:00Z'), '08:00', '11:00'),
    ).toBe(false));
  it('overnight window', () =>
    expect(
      windowOverlaps(at('2026-10-20T17:00:00Z'), at('2026-10-20T17:30:00Z'), '22:00', '02:00'),
    ).toBe(true));
  it('postgres time format', () =>
    expect(
      windowOverlaps(
        at('2026-10-20T13:00:00Z'),
        at('2026-10-20T14:00:00Z'),
        '19:00:00',
        '21:00:00',
      ),
    ).toBe(true));
});

describe('setReserved - bất biến tồn kho (BR-B03-05/07)', () => {
  it('reserving deducts remaining and flips SOLD_OUT at zero', async () => {
    const { service, offer, m } = setup({ offer: makeOffer({ remainingQuantity: 4 }) });
    const t = makeTransfer({ reservedQuantity: 0 });
    await service.setReserved(m as never, t, 4, offer);
    expect(offer.remainingQuantity).toBe(0);
    expect(offer.status).toBe(OfferStatus.SOLD_OUT);
    expect(t.reservedQuantity).toBe(4);
  });
  it('cannot reserve more than available', async () => {
    const { service, offer, m } = setup({ offer: makeOffer({ remainingQuantity: 3 }) });
    await expect(
      service.setReserved(m as never, makeTransfer({ reservedQuantity: 0 }), 4, offer),
    ).rejects.toThrow(BadRequestException);
    expect(offer.remainingQuantity).toBe(3);
  });
  it('releasing returns exactly the delta and reopens SOLD_OUT', async () => {
    const { service, offer, m } = setup({
      offer: makeOffer({ remainingQuantity: 0, status: OfferStatus.SOLD_OUT }),
    });
    const t = makeTransfer({ reservedQuantity: 8 });
    await service.setReserved(m as never, t, 6);
    expect(offer.remainingQuantity).toBe(2);
    expect(offer.status).toBe(OfferStatus.OPEN);
    await service.setReserved(m as never, t, 6); // idempotent
    expect(offer.remainingQuantity).toBe(2);
  });
});

describe('handover confirmation (BR-B03-06)', () => {
  it('store alone does not finalize', async () => {
    const { service, transfer } = setup();
    await service.storeConfirmHandover('store-1', 'u-1', 'tr-1', {
      quantityHandedOver: 6,
      evidenceReference: 'img',
    });
    expect(transfer.transferStatus).toBe(T.AWAITING_HANDOVER);
    expect(transfer.senderConfirmedQuantity).toBe(6);
  });

  it('missing mandatory evidence blocks store confirmation', async () => {
    const { service, transfer } = setup();
    await expect(
      service.storeConfirmHandover('store-1', 'u-1', 'tr-1', { quantityHandedOver: 6 }),
    ).rejects.toThrow(BadRequestException);
    expect(transfer.senderConfirmedAt).toBeNull();
  });

  it('both sides matching (less than accepted) → PARTIAL, shortfall back to stock, ledger written once', async () => {
    const { service, transfer, offer, savedOf } = setup({
      offer: makeOffer({ remainingQuantity: 2 }),
      transfer: makeTransfer({
        senderConfirmedAt: new Date(),
        senderConfirmedQuantity: 5,
        evidenceReference: 'img',
      }),
    });
    await service.recipientConfirmHandover('tok', { quantityReceived: 5, confirmedByName: 'B' });
    expect(transfer.transferStatus).toBe(T.PARTIAL);
    expect(transfer.quantityHandedOver).toBe(5);
    expect(transfer.reservedQuantity).toBe(5);
    expect(offer.remainingQuantity).toBe(3); // 1 suất không giao được trả về tồn bán
    const ledger = savedOf(DonationRecordEntity);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].quantity).toBe(5);
  });

  it('mismatch → dispute, no finalize, no stock change', async () => {
    const { service, transfer, offer, savedOf } = setup({
      transfer: makeTransfer({
        senderConfirmedAt: new Date(),
        senderConfirmedQuantity: 6,
        evidenceReference: 'img',
      }),
    });
    await service.recipientConfirmHandover('tok', { quantityReceived: 4, confirmedByName: 'B' });
    expect(transfer.transferStatus).toBe(T.AWAITING_HANDOVER);
    expect(transfer.isDisputed).toBe(true);
    expect(offer.remainingQuantity).toBe(10);
    expect(savedOf(DonationRecordEntity)).toHaveLength(0);
  });

  it('cannot confirm more than accepted', async () => {
    const { service } = setup();
    await expect(
      service.recipientConfirmHandover('tok', { quantityReceived: 7, confirmedByName: 'B' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('expired lot blocks the handover event', async () => {
    const { service } = setup({ offer: makeOffer({ expiresAt: mins(-1) }) });
    await expect(
      service.recipientConfirmHandover('tok', { quantityReceived: 6, confirmedByName: 'B' }),
    ).rejects.toThrow(/hết hạn/);
  });
});

describe('cancel / deadline', () => {
  it('cancel releases everything and logs the reason', async () => {
    const { service, transfer, offer, savedOf } = setup({
      transfer: makeTransfer({ transferStatus: T.SENT, reservedQuantity: 8 }),
    });
    await service.cancelTransfer('store-1', 'u-1', 'tr-1', 'Đổi kế hoạch');
    expect(transfer.transferStatus).toBe(T.CANCELLED);
    expect(transfer.failureReason).toBe('Đổi kế hoạch');
    expect(offer.remainingQuantity).toBe(18);
    expect(savedOf(AuditLogEntity).some((a) => a.action === 'RESCUE_BRIDGE_CANCELLED')).toBe(true);
  });

  it('cannot cancel after a handover confirmation', async () => {
    const { service } = setup({
      transfer: makeTransfer({ senderConfirmedAt: new Date(), senderConfirmedQuantity: 6 }),
    });
    await expect(service.cancelTransfer('store-1', 'u-1', 'tr-1', 'x')).rejects.toThrow(
      ConflictException,
    );
  });

  it('deadline with no confirmation → FAILED and stock released', async () => {
    const { service, transfer, offer } = setup({
      transfer: makeTransfer({ handoverDeadline: mins(-1) }),
    });
    await service.processDeadlines();
    expect(transfer.transferStatus).toBe(T.FAILED);
    expect(offer.remainingQuantity).toBe(16);
  });

  it('deadline with one-sided confirmation → escalated, not auto-concluded', async () => {
    const { service, transfer, offer } = setup({
      transfer: makeTransfer({
        handoverDeadline: mins(-1),
        senderConfirmedAt: new Date(),
        senderConfirmedQuantity: 6,
      }),
    });
    await service.processDeadlines();
    expect(transfer.transferStatus).toBe(T.AWAITING_HANDOVER);
    expect(transfer.isDisputed).toBe(true);
    expect(offer.remainingQuantity).toBe(10);
  });
});

it('token is stored hashed', () => {
  expect(hashToken('abc')).toHaveLength(64);
  expect(hashToken('abc')).not.toContain('abc');
});
