import { OfferKind, OfferStatus } from '../../entities/catalog/offer.entity';
import {
  RescueActionType,
  RescueDataQualityStatus,
  RescueLotStatus,
  RescueRiskLevel,
} from '../../entities/rescue-timeline/rescue-risk-snapshot.entity';
import { calculateRisk, RiskInput } from './rescue-timeline.risk';

const now = new Date('2026-10-19T18:00:00Z');
const min = (m: number) => new Date(now.getTime() + m * 60 * 1000);

function input(over: Partial<RiskInput['offer']> = {}, rest: Partial<RiskInput> = {}): RiskInput {
  return {
    now,
    offer: {
      status: OfferStatus.OPEN,
      kind: OfferKind.REGULAR,
      totalQuantity: 10,
      remainingQuantity: 9,
      currentPrice: 30000,
      floorPrice: 15000,
      priceChangeCount: 0,
      pickupEnd: min(20),
      createdAt: min(-120),
      updatedAt: min(-10),
      ...over,
    },
    item: { expiryAt: null, preparedAt: null },
    orders: { sold: 1, held: 0, lastOrderAt: min(-30) },
    handedOver: false,
    ...rest,
  };
}

describe('calculateRisk (CM-B01)', () => {
  it('lots of stock, slow sales, little time -> CRITICAL with explainable factors and actions', () => {
    const r = calculateRisk(input());
    expect(r.riskLevel).toBe(RescueRiskLevel.CRITICAL);
    expect(r.dataQualityStatus).toBe(RescueDataQualityStatus.OK);
    expect(r.riskFactors.map((f) => f.code)).toEqual(
      expect.arrayContaining([
        'TIME_LEFT',
        'QUANTITY_REMAINING',
        'SALES_VELOCITY',
        'EXPIRY_UNKNOWN',
      ]),
    );
    expect(r.recommendedActions.map((a) => a.type)).toEqual(
      expect.arrayContaining([
        RescueActionType.ADJUST_PRICE,
        RescueActionType.CREATE_SURPRISE_BAG,
        RescueActionType.OPEN_RESCUE_BRIDGE,
      ]),
    );
  });

  it('few left with hours to go -> LOW', () => {
    const r = calculateRisk(
      input(
        { remainingQuantity: 1, pickupEnd: min(300) },
        { orders: { sold: 9, held: 0, lastOrderAt: min(-5) } },
      ),
    );
    expect(r.riskLevel).toBe(RescueRiskLevel.LOW);
  });

  it('BR-B01-02: just listed -> INSUFFICIENT, no risk level, asks to confirm stock', () => {
    const r = calculateRisk(input({ createdAt: min(-10) }));
    expect(r.dataQualityStatus).toBe(RescueDataQualityStatus.INSUFFICIENT);
    expect(r.riskLevel).toBeNull();
    expect(r.recommendedActions[0].type).toBe(RescueActionType.UPDATE_STOCK);
  });

  it('BR-B01-02: does not infer expiry; invalid declared expiry is ignored and flagged', () => {
    const r = calculateRisk(input({}, { item: { expiryAt: min(-60), preparedAt: min(-30) } }));
    expect(r.expiryAt).toBeNull();
    expect(r.dataQualityStatus).toBe(RescueDataQualityStatus.INSUFFICIENT);
    expect(r.riskLevel).toBeNull();
  });

  it('stock untouched for a long time -> STALE but keeps a provisional level', () => {
    const r = calculateRisk(
      input({ updatedAt: min(-200) }, { orders: { sold: 1, held: 0, lastOrderAt: min(-200) } }),
    );
    expect(r.dataQualityStatus).toBe(RescueDataQualityStatus.STALE);
    expect(r.riskLevel).not.toBeNull();
  });

  it('valid expiry before pickup end becomes the deadline; past it -> EXPIRED', () => {
    const r = calculateRisk(
      input({ pickupEnd: min(120) }, { item: { expiryAt: min(-1), preparedAt: min(-300) } }),
    );
    expect(r.lotStatus).toBe(RescueLotStatus.EXPIRED);
    expect(r.riskLevel).toBeNull();
  });

  it('closed offer with a donation record -> HANDED_OVER', () => {
    const r = calculateRisk(input({ status: OfferStatus.CLOSED }, { handedOver: true }));
    expect(r.lotStatus).toBe(RescueLotStatus.HANDED_OVER);
  });
});
