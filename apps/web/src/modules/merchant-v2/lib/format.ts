export const vnd = (n: number | null | undefined) => `${(n ?? 0).toLocaleString('vi-VN')}đ`;

export const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const dayMonthTime = (iso: string) =>
  new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

/** YYYY-MM-DD theo giờ máy người dùng (không dùng toISOString vì đó là giờ UTC, lệch ngày trước 7h sáng). */
export const localDate = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};

/** Giờ địa phương của ô datetime-local -> ISO để gửi backend. */
export const localInputToIso = (v: string) => new Date(v).toISOString();
