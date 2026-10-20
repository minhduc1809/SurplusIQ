export const JOBS_CONSTANTS = {
  QUEUES: {
    BACKGROUND_JOBS: 'surplusiq-background-jobs',
    RELEASE_HOLDS: 'orders.release-holds',
    PICKUP_EXPIRE: 'orders.pickup-expire',
    OFFERS_AUTO_CLOSE: 'offers.auto-close',
    COMPLAINTS_AUTO_ACCEPT: 'complaints.auto-accept',
    STATEMENTS_CLOSE_WEEK: 'statements.close-week',
    SUBSCRIPTION_LIFECYCLE: 'subscription.lifecycle',
    PAYMENTS_RECHECK: 'payments.recheck',
    FORECAST_DAILY: 'forecast.daily',
    PRICE_PROPOSALS: 'price.proposals',
    NOTIFY_PICKUP_REMINDER: 'notify.pickup-reminder',
    RETENTION_CLEANUP: 'retention.cleanup',
    ACCOUNT_ANONYMIZE: 'account.anonymize',
    RESCUE_TIMELINE_RECALC: 'rescue-timeline.recalculate',
    RESCUE_POOL_DEADLINES: 'rescue-pool.deadlines',
    RESCUE_BRIDGE_DEADLINES: 'rescue-bridge.deadlines',
    CAMPAIGN_DISPATCH: 'campaigns.dispatch',
  },
  JOB_NAMES: {
    RELEASE_HOLDS: 'orders.release-holds',
    PICKUP_EXPIRE: 'orders.pickup-expire',
    OFFERS_AUTO_CLOSE: 'offers.auto-close',
    COMPLAINTS_AUTO_ACCEPT: 'complaints.auto-accept',
    STATEMENTS_CLOSE_WEEK: 'statements.close-week',
    SUBSCRIPTION_LIFECYCLE: 'subscription.lifecycle',
    PAYMENTS_RECHECK: 'payments.recheck',
    FORECAST_DAILY: 'forecast.daily',
    PRICE_PROPOSALS: 'price.proposals',
    NOTIFY_PICKUP_REMINDER: 'notify.pickup-reminder',
    RETENTION_CLEANUP: 'retention.cleanup',
    ACCOUNT_ANONYMIZE: 'account.anonymize',
    RESCUE_TIMELINE_RECALC: 'rescue-timeline.recalculate',
    RESCUE_POOL_DEADLINES: 'rescue-pool.deadlines',
    RESCUE_BRIDGE_DEADLINES: 'rescue-bridge.deadlines',
    CAMPAIGN_DISPATCH: 'campaigns.dispatch',
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
