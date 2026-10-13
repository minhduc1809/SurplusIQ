import { SubscriptionPlan } from '../../entities/subscriptions/subscription.entity';

export enum QuotaKey {
  DAILY_OFFERS = 'daily_offers',
  CSV_IMPORT_LINES = 'csv_import_lines',
  AI_IMAGE_SCAN = 'ai_image_scan',
  AI_CHAT_QUERY = 'ai_chat_query',
  AI_CONTENT_GEN = 'ai_content_gen',
  ACTIVE_STAFF = 'active_staff',
  ACTIVE_PROMOTIONS = 'active_promotions',
  CAMPAIGNS_PER_MONTH = 'campaigns_per_month',
  EXPORT_REPORTS = 'export_reports',
  EXPORT_ORDERS = 'export_orders',
  AI_CUSTOMER_QUERIES = 'ai_customer_queries',
  AI_COMPLAINT_GEN = 'ai_complaint_gen',
}

export enum QuotaPeriod {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  PER_REQUEST = 'PER_REQUEST',
  EXISTENCE = 'EXISTENCE',
}

export interface QuotaDefinition {
  key: QuotaKey;
  name: string;
  period: QuotaPeriod;
  limits: {
    [SubscriptionPlan.BASIC]: number;
    [SubscriptionPlan.PRO]: number;
    [SubscriptionPlan.TRIAL]: number;
  };
}

export const PLAN_QUOTAS_MAP: Record<QuotaKey, QuotaDefinition> = {
  [QuotaKey.DAILY_OFFERS]: {
    key: QuotaKey.DAILY_OFFERS,
    name: 'Số suất mở bán trong ngày',
    period: QuotaPeriod.DAILY,
    limits: {
      [SubscriptionPlan.BASIC]: 20,
      [SubscriptionPlan.PRO]: 100,
      [SubscriptionPlan.TRIAL]: 100,
    },
  },
  [QuotaKey.CSV_IMPORT_LINES]: {
    key: QuotaKey.CSV_IMPORT_LINES,
    name: 'Số dòng nhập danh mục từ CSV mỗi lần',
    period: QuotaPeriod.PER_REQUEST,
    limits: {
      [SubscriptionPlan.BASIC]: 100,
      [SubscriptionPlan.PRO]: 500,
      [SubscriptionPlan.TRIAL]: 500,
    },
  },
  [QuotaKey.AI_IMAGE_SCAN]: {
    key: QuotaKey.AI_IMAGE_SCAN,
    name: 'Số lượt AI phân tích hình ảnh món ăn / tháng',
    period: QuotaPeriod.MONTHLY,
    limits: {
      [SubscriptionPlan.BASIC]: 20,
      [SubscriptionPlan.PRO]: 300,
      [SubscriptionPlan.TRIAL]: 300,
    },
  },
  [QuotaKey.AI_CHAT_QUERY]: {
    key: QuotaKey.AI_CHAT_QUERY,
    name: 'Số câu hỏi đáp số liệu kinh doanh với trợ lý AI / tháng',
    period: QuotaPeriod.MONTHLY,
    limits: {
      [SubscriptionPlan.BASIC]: 10,
      [SubscriptionPlan.PRO]: 300,
      [SubscriptionPlan.TRIAL]: 300,
    },
  },
  [QuotaKey.AI_CONTENT_GEN]: {
    key: QuotaKey.AI_CONTENT_GEN,
    name: 'Số lượt AI soạn nội dung mô tả & thông báo / tháng',
    period: QuotaPeriod.MONTHLY,
    limits: {
      [SubscriptionPlan.BASIC]: 10,
      [SubscriptionPlan.PRO]: 200,
      [SubscriptionPlan.TRIAL]: 200,
    },
  },
  [QuotaKey.ACTIVE_STAFF]: {
    key: QuotaKey.ACTIVE_STAFF,
    name: 'Số nhân viên tối đa được phân quyền trong cửa hàng',
    period: QuotaPeriod.EXISTENCE,
    limits: {
      [SubscriptionPlan.BASIC]: 1,
      [SubscriptionPlan.PRO]: 5,
      [SubscriptionPlan.TRIAL]: 5,
    },
  },
  [QuotaKey.ACTIVE_PROMOTIONS]: {
    key: QuotaKey.ACTIVE_PROMOTIONS,
    name: 'Số chương trình ưu đãi chạy cùng lúc',
    period: QuotaPeriod.EXISTENCE,
    limits: {
      [SubscriptionPlan.BASIC]: 2,
      [SubscriptionPlan.PRO]: 10,
      [SubscriptionPlan.TRIAL]: 10,
    },
  },
  [QuotaKey.CAMPAIGNS_PER_MONTH]: {
    key: QuotaKey.CAMPAIGNS_PER_MONTH,
    name: 'Số chiến dịch thông báo tiếp thị / tháng',
    period: QuotaPeriod.MONTHLY,
    limits: {
      [SubscriptionPlan.BASIC]: 4,
      [SubscriptionPlan.PRO]: 30,
      [SubscriptionPlan.TRIAL]: 30,
    },
  },
  [QuotaKey.EXPORT_REPORTS]: {
    key: QuotaKey.EXPORT_REPORTS,
    name: 'Số lần xuất báo cáo kinh doanh / tháng',
    period: QuotaPeriod.MONTHLY,
    limits: {
      [SubscriptionPlan.BASIC]: 3,
      [SubscriptionPlan.PRO]: 30,
      [SubscriptionPlan.TRIAL]: 30,
    },
  },
  [QuotaKey.EXPORT_ORDERS]: {
    key: QuotaKey.EXPORT_ORDERS,
    name: 'Số lần xuất danh sách đơn hàng / tháng',
    period: QuotaPeriod.MONTHLY,
    limits: {
      [SubscriptionPlan.BASIC]: 5,
      [SubscriptionPlan.PRO]: 60,
      [SubscriptionPlan.TRIAL]: 60,
    },
  },
  [QuotaKey.AI_CUSTOMER_QUERIES]: {
    key: QuotaKey.AI_CUSTOMER_QUERIES,
    name: 'Hạn mức câu hỏi trợ lý Cứu Món của khách / ngày',
    period: QuotaPeriod.DAILY,
    limits: {
      [SubscriptionPlan.BASIC]: 30,
      [SubscriptionPlan.PRO]: 30,
      [SubscriptionPlan.TRIAL]: 30,
    },
  },
  [QuotaKey.AI_COMPLAINT_GEN]: {
    key: QuotaKey.AI_COMPLAINT_GEN,
    name: 'Hạn mức AI hỗ trợ soạn đơn khiếu nại của khách / ngày',
    period: QuotaPeriod.DAILY,
    limits: {
      [SubscriptionPlan.BASIC]: 10,
      [SubscriptionPlan.PRO]: 10,
      [SubscriptionPlan.TRIAL]: 10,
    },
  },
};
