export const JOBS_CONSTANTS = {
  QUEUES: {
    BACKGROUND_JOBS: 'surplusiq-background-jobs',
    RELEASE_HOLDS: 'orders.release-holds',
    PICKUP_EXPIRE: 'orders.pickup-expire',
    OFFERS_AUTO_CLOSE: 'offers.auto-close',
  },
  JOB_NAMES: {
    RELEASE_HOLDS: 'orders.release-holds',
    PICKUP_EXPIRE: 'orders.pickup-expire',
    OFFERS_AUTO_CLOSE: 'offers.auto-close',
  },
  /**
   * Thời gian giữ suất tối đa là 10 phút (BR-017)
   */
  HOLD_DURATION_MINUTES: 10,
  /**
   * Thời gian trễ cho phép sau khi hết khung nhận hàng trước khi tính Noshow là 15 phút (BR-020, BR-024)
   */
  PICKUP_GRACE_MINUTES: 15,
  /**
   * Số lần không đến nhận hàng tối đa trong 30 ngày trước khi bị khóa đặt hàng (BR-020)
   */
  NOSHOW_THRESHOLD: 3,
  /**
   * Cửa sổ thời gian tính noshow cuốn chiếu (30 ngày)
   */
  NOSHOW_WINDOW_DAYS: 30,
  /**
   * Thời hạn khóa quyền đặt hàng khi vi phạm noshow (7 ngày) (BR-020)
   */
  NOSHOW_LOCK_DAYS: 7,
};
