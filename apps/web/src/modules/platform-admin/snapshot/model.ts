import definitions from '../../../../../backend/src/modules/platform-admin/data-collections.json';

// =====================================================
// 1. KIỂU DỮ LIỆU
// =====================================================

export type SnapshotValue =
  string | number | boolean | null | SnapshotValue[] | { [key: string]: SnapshotValue };
export type SnapshotRow = Record<string, SnapshotValue>;
export interface CollectionDefinition {
  table: string;
  title: string;
  primaryKey: string;
  columns: string[];
  fields: Record<string, string>;
}
export const collections: Record<string, CollectionDefinition> = definitions;

// =====================================================
// 2. ĐỊNH NGHĨA SNAPSHOT
// =====================================================

export interface AdminSnapshot {
  version: 1;
  exportedAt: string;
  source: string;
  counts: Record<string, number>;
  collections: Record<string, SnapshotRow[]>;
}

// =====================================================
// 3. HÀM XÁC THỰC DỮ LIỆU
// =====================================================

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validValue(value: unknown, depth = 0): value is SnapshotValue {
  if (depth > 8) return false;
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item) => validValue(item, depth + 1));
  return (
    record(value) &&
    Object.entries(value).every(
      ([key, item]) =>
        !/password|token|secret|otp|authorization|cookie/i.test(key) && validValue(item, depth + 1),
    )
  );
}

export function parseSnapshot(value: unknown): AdminSnapshot {
  if (
    !record(value) ||
    value.version !== 1 ||
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt)) ||
    typeof value.source !== 'string' ||
    !record(value.counts) ||
    !record(value.collections)
  ) {
    throw new Error('Tệp dữ liệu không đúng phiên bản hoặc thiếu thời điểm xuất.');
  }
  for (const [key, definition] of Object.entries(collections)) {
    const rows = value.collections[key];
    const allowed = new Set([
      ...Object.keys(definition.fields),
      'store_name',
      'user_label',
      'order_code',
      'item_name',
    ]);
    if (
      !Array.isArray(rows) ||
      value.counts[key] !== rows.length ||
      rows.some(
        (row) =>
          !record(row) ||
          typeof row[definition.primaryKey] !== 'string' ||
          Object.keys(definition.fields).some(
            (field) => !Object.prototype.hasOwnProperty.call(row, field),
          ) ||
          Object.entries(row).some(([field, item]) => !allowed.has(field) || !validValue(item)),
      )
    ) {
      throw new Error(`Tập dữ liệu ${definition.title} không hợp lệ hoặc chưa được xuất đầy đủ.`);
    }
    const ids = rows.map((row) => row[definition.primaryKey]);
    if (new Set(ids).size !== ids.length) throw new Error(`Trùng mã trong ${definition.title}.`);
  }
  return value as unknown as AdminSnapshot;
}

// =====================================================
// 4. HÀM TIỆN ÍCH Xử LÝ DỮ LIỆU
// =====================================================

export function text(value: SnapshotValue | undefined): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(text).join(', ');
  if (typeof value === 'object')
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${text(item)}`)
      .join('; ');
  return String(value);
}
export function number(row: SnapshotRow, field: string): number {
  const value = Number(row[field]);
  return Number.isFinite(value) ? value : 0;
}
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
export function vietnamDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (name: string) => parts.find((item) => item.type === name)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function filterRows(
  rows: readonly SnapshotRow[],
  query: string,
  filters: Record<string, string>,
  from: string,
  to: string,
  dateField: string,
) {
  const needle = normalize(query);
  return rows.filter((row) => {
    if (needle && !normalize(Object.values(row).map(text).join(' ')).includes(needle)) return false;
    if (Object.entries(filters).some(([field, value]) => value && text(row[field]) !== value))
      return false;
    if (from || to) {
      const date = text(row[dateField]);
      if (!date) return false;
      const day = vietnamDay(date);
      if (!day) return false;
      if ((from && day < from) || (to && day > to)) return false;
    }
    return true;
  });
}
