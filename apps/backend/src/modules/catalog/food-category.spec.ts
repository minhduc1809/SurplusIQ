import { normalizeFoodCategory } from './food-category';

describe('normalizeFoodCategory', () => {
  it.each([
    ['RICE', '', 'RICE'],
    ['Phở & Bún', '', 'NOODLE'],
    ['Meals', 'Suất Cứu Món • Phở Bò Tái Lăn', 'NOODLE'],
    ['Meals', 'Cơm Tấm Sườn Bì', 'RICE'],
    ['Baked goods', 'Bánh Mì Pate Chả', 'BREAD'],
    ['Baked goods', 'Croissant Bơ Pháp', 'SWEET'],
    ['Groceries', 'Rau Củ Hữu Cơ', 'PRODUCE'],
    ['Other', 'Trà Sữa Trân Châu', 'DRINK'],
    ['Other', 'Lẩu Thái', 'OTHER'],
    [null, '', 'OTHER'],
  ])('%s + "%s" -> %s', (raw, name, expected) => {
    expect(normalizeFoodCategory(raw, name)).toBe(expected);
  });
});
