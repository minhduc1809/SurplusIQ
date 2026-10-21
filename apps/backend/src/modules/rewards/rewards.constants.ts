export const REWARDS_CONSTANTS = {
  /** 1 điểm mỗi 1.000đ giá trị đơn, làm tròn xuống (BR-C04-03 công bố quy đổi). */
  POINTS_PER_VND_DIVISOR: 1000,
  RULE_VERSION: 'v1',
  /** Điểm hết hạn sau 180 ngày nếu không dùng (BR-C04-03, BR-C04-08). */
  POINTS_EXPIRY_DAYS: 180,
  MAX_REDEEM_PER_REQUEST: 100000,
};

/** Danh mục đổi điểm (BR-C04-03: công bố quy đổi). Giá trị lấy tại đây, không nhận từ app. */
export const REWARD_CATALOG = [
  {
    id: 'VOUCHER_10K',
    name: 'Voucher giảm 10.000đ',
    points: 100,
    valueVnd: 10_000,
    minOrderVnd: 30_000,
    validDays: 30,
  },
  {
    id: 'VOUCHER_20K',
    name: 'Voucher giảm 20.000đ',
    points: 200,
    valueVnd: 20_000,
    minOrderVnd: 60_000,
    validDays: 30,
  },
  {
    id: 'VOUCHER_50K',
    name: 'Voucher giảm 50.000đ',
    points: 500,
    valueVnd: 50_000,
    minOrderVnd: 120_000,
    validDays: 30,
  },
] as const;

/** Giới hạn lượt đổi mỗi ngày để hạn chế lạm dụng (BR-C04-03). */
export const MAX_REDEEM_PER_DAY = 3;
