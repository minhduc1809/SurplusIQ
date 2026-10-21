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
    meta: { total: opts.radar.length, locationSource: 'GPS_OR_SELECTED' },
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
