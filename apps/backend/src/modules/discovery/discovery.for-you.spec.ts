import { DataSource } from 'typeorm';
import { DiscoveryService } from './discovery.service';
import { FavoriteStoreEntity } from '../../entities/auth/favorite-store.entity';
import { DietaryProfileEntity } from '../../entities/auth/dietary-profile.entity';
import { ItemEntity } from '../../entities/catalog/item.entity';

const candidate = (over: Record<string, unknown>) => ({
  id: 'o1',
  storeId: 's1',
  itemId: 'i1',
  title: 'Bánh mì',
  category: 'Bánh',
  pickupEnd: new Date('2026-10-21T19:30:00'),
  rankingScore: 50,
  rankingReasons: ['Cách bạn khoảng 0.3km'],
  ...over,
});

function build(opts: {
  radar: object[];
  favorites?: object[];
  orders?: object[];
  views?: object[];
  dietary?: object | null;
  items?: object[];
}) {
  const chain = (rows: object[]) => {
    const c: Record<string, unknown> = {};
    for (const k of ['innerJoin', 'leftJoin', 'where', 'andWhere', 'select']) c[k] = () => c;
    c.getRawMany = () => Promise.resolve(rows);
    return c;
  };
  let builderCall = 0;
  const manager = {
    find: jest.fn((entity: unknown) => {
      if (entity === FavoriteStoreEntity) return Promise.resolve(opts.favorites ?? []);
      if (entity === ItemEntity) return Promise.resolve(opts.items ?? []);
      return Promise.resolve([]);
    }),
    findOne: jest.fn((entity: unknown) =>
      Promise.resolve(entity === DietaryProfileEntity ? (opts.dietary ?? null) : null),
    ),
    createQueryBuilder: jest.fn(() =>
      chain(builderCall++ === 0 ? (opts.orders ?? []) : (opts.views ?? [])),
    ),
  };
  const service = new DiscoveryService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    { manager } as unknown as DataSource,
    {} as never,
    {} as never,
  );
  jest.spyOn(service, 'getRadarRanking').mockResolvedValue({
    data: opts.radar as never,
    meta: { total: opts.radar.length, hiddenByAllergens: 0, locationSource: 'GPS_OR_SELECTED' },
  });
  return service;
}

describe('DiscoveryService.getForYou (K21)', () => {
  it('cộng điểm cửa hàng yêu thích và loại món đã nhận, kèm lý do có căn cứ', async () => {
    const service = build({
      radar: [
        candidate({ id: 'a', storeId: 'fav', rankingScore: 40 }),
        candidate({ id: 'b', storeId: 'other', rankingScore: 55 }),
      ],
      favorites: [{ storeId: 'fav' }],
      orders: [
        { category: 'Bánh', store_id: 'x', pickup_start: new Date('2026-10-20T18:00:00') },
        { category: 'Bánh', store_id: 'x', pickup_start: new Date('2026-10-19T18:30:00') },
      ],
    });
    const res = await service.getForYou('u1', {});
    expect(res.data[0].id).toBe('a');
    expect(res.data[0].forYouReasons[0]).toBe('Cửa hàng bạn yêu thích');
    expect(res.data[0].forYouReasons.join('|')).toContain('đã nhận 2 suất bánh');
    expect(res.meta.personalised).toBe(true);
  });

  it('loại hẳn suất chứa chất gây dị ứng hoặc món khách loại trừ, không chỉ hạ điểm', async () => {
    const service = build({
      radar: [
        candidate({ id: 'peanut', itemId: 'i-peanut', title: 'Chè đậu phộng' }),
        candidate({ id: 'safe', itemId: 'i-safe', title: 'Bánh mì thịt' }),
        candidate({ id: 'no-fish', itemId: 'i-fish', title: 'Bún cá' }),
      ],
      items: [
        { id: 'i-peanut', allergens: ['Đậu phộng'] },
        { id: 'i-safe', allergens: [] },
        { id: 'i-fish', allergens: [] },
      ],
      dietary: { allergens: ['đậu phộng'], excludedItems: ['cá'] },
    });
    const res = await service.getForYou('u1', {});
    expect(res.data.map((d) => d.id)).toEqual(['safe']);
    expect(res.meta.excludedByDietary).toBe(2);
  });

  it('khách mới chưa có lịch sử vẫn nhận xếp hạng Radar kèm ghi chú, không bịa lý do cá nhân hóa', async () => {
    const service = build({ radar: [candidate({})] });
    const res = await service.getForYou('u1', {});
    expect(res.meta.personalised).toBe(false);
    expect(res.meta.note).toContain('Chưa có lịch sử');
    expect(res.data[0].forYouReasons).toEqual(['Cách bạn khoảng 0.3km']);
  });
});

describe('DiscoveryService.getRadarRanking bộ lọc (KC15)', () => {
  const row = (over: Record<string, unknown>) => ({
    offer_id: 'o',
    store_id: 's',
    item_id: 'i',
    original_price: 40000,
    current_price: 20000,
    remaining_quantity: 3,
    pickup_start: new Date(Date.now() - 3600_000),
    pickup_end: new Date(Date.now() + 90 * 60_000),
    item_name: 'Món',
    item_category: 'Bánh',
    item_image_url: null,
    item_allergens: [],
    store_name: 'Quán',
    store_address: 'HN',
    distance_meters: 500,
    ...over,
  });

  function radar(rows: object[]) {
    const qb: Record<string, jest.Mock> = {};
    for (const k of ['innerJoin', 'leftJoin', 'where', 'andWhere', 'select', 'addSelect', 'limit'])
      qb[k] = jest.fn(() => qb);
    qb.getRawMany = jest.fn().mockResolvedValue(rows);
    const offerRepo = { createQueryBuilder: jest.fn(() => qb) };
    const service = new DiscoveryService(
      offerRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, qb };
  }

  it('loại hẳn suất chứa chất gây dị ứng khách chọn tránh và báo số suất đã ẩn', async () => {
    const { service } = radar([
      row({ offer_id: 'a', item_allergens: ['Đậu phộng'] }),
      row({ offer_id: 'b', item_allergens: [] }),
    ]);
    const res = await service.getRadarRanking({ excludeAllergens: 'đậu phộng, sữa' });
    expect(res.data.map((d) => d.id)).toEqual(['b']);
    expect(res.meta.hiddenByAllergens).toBe(1);
  });

  it('ưu tiên nhận kịp ẩn suất còn dưới 15 phút', async () => {
    const { service } = radar([
      row({ offer_id: 'late', pickup_end: new Date(Date.now() + 8 * 60_000) }),
      row({ offer_id: 'ok' }),
    ]);
    const res = await service.getRadarRanking({ prioritizeInTime: true });
    expect(res.data.map((d) => d.id)).toEqual(['ok']);
  });

  it('lọc khung giờ nhận bằng điều kiện giao nhau của khung nhận và khoảng khách chọn', async () => {
    const { service, qb } = radar([row({})]);
    await service.getRadarRanking({
      pickupFrom: '2026-10-21T17:00:00.000Z',
      pickupTo: '2026-10-21T21:00:00.000Z',
    });
    const conditions = qb.andWhere.mock.calls.map((c) => c[0] as string);
    expect(conditions).toContain('o.pickup_end >= :pickupFrom');
    expect(conditions).toContain('o.pickup_start <= :pickupTo');
  });
});
