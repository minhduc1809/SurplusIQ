import { adminApi } from './admin-api.client';
import { text, type SnapshotRow } from '../snapshot/model';

// =====================================================
// 1. CẤU HÌNH HẠN MỨC QUOTA
// =====================================================

export const quotaOptions = [
  ['daily_offers', 'Số suất mở bán / ngày', 'DAILY'],
  ['csv_import_lines', 'Số dòng nhập CSV / lần', 'PER_REQUEST'],
  ['ai_image_scan', 'AI phân tích hình ảnh / tháng', 'MONTHLY'],
  ['ai_chat_query', 'AI hỏi đáp kinh doanh / tháng', 'MONTHLY'],
  ['ai_content_gen', 'AI soạn nội dung / tháng', 'MONTHLY'],
  ['active_staff', 'Nhân viên hoạt động', 'EXISTENCE'],
  ['active_promotions', 'Ưu đãi đồng thời', 'EXISTENCE'],
  ['campaigns_per_month', 'Chiến dịch / tháng', 'MONTHLY'],
  ['export_reports', 'Xuất báo cáo / tháng', 'MONTHLY'],
  ['export_orders', 'Xuất đơn hàng / tháng', 'MONTHLY'],
  ['ai_customer_queries', 'AI của khách / ngày', 'DAILY'],
  ['ai_complaint_gen', 'AI soạn khiếu nại / ngày', 'DAILY'],
] as const;

// =====================================================
// 2. KIỂM TRA KHẢ NĂNG THAO TÁC
// =====================================================

export function supportsCreate(collection: string): boolean {
  return ['users', 'stores', 'quotas'].includes(collection);
}

export function supportsEdit(collection: string): boolean {
  return [
    'users',
    'stores',
    'complaints',
    'violations',
    'reviews',
    'subscriptions',
    'settings',
    'quotas',
  ].includes(collection);
}

export function canEditRecord(collection: string, row: SnapshotRow): boolean {
  if (!supportsEdit(collection)) return false;
  if (collection === 'complaints') return row.status === 'PENDING_STORE';
  if (collection === 'users') return !['ANONYMIZED', 'PENDING_DELETE'].includes(text(row.status));
  if (collection === 'quotas' && row.plan === 'TRIAL') return false;
  return true;
}

export function deleteLabel(collection: string, row: SnapshotRow): string | null {
  if (
    collection === 'users' &&
    !['LOCKED', 'ANONYMIZED', 'PENDING_DELETE'].includes(text(row.status))
  )
    return 'Khóa tài khoản';
  if (collection === 'stores' && row.status !== 'SUSPENDED') return 'Tạm ngưng';
  if (collection === 'reviews' && row.status !== 'HIDDEN') return 'Ẩn đánh giá';
  if (collection === 'quotas' && row.plan !== 'TRIAL') return 'Xóa ghi đè';
  return null;
}

// =====================================================
// 3. THỰC HIỆN THAO TÁC GHI
// =====================================================

export function deleteRecord(collection: string, row: SnapshotRow): Promise<unknown> {
  if (!deleteLabel(collection, row)) return Promise.reject(new Error('Thao tác không khả dụng.'));
  return adminApi.delete(`/admin/${collection}/${encodeURIComponent(text(row.id))}`);
}

// =====================================================
// 4. LƯU BẢN GHI ADMIN
// =====================================================

export function saveAdminRecord(
  collection: string,
  row: SnapshotRow | null,
  values: Record<string, string>,
  idempotencyKey?: string,
): Promise<unknown> {
  const id = encodeURIComponent(text(row?.id));
  const storeId = encodeURIComponent(text(row?.store_id));
  const postOptions = idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {};
  switch (collection) {
    case 'users': {
      const body = {
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        role: values.role,
        status: values.status,
        ...(!row ? { password: values.password } : {}),
      };
      return row
        ? adminApi.patch(`/admin/users/${id}`, body)
        : adminApi.post('/admin/users', body, postOptions);
    }
    case 'stores': {
      const body = {
        name: values.name.trim(),
        address: values.address.trim(),
        phone: values.phone.trim(),
        logoUrl: values.logoUrl.trim() || null,
        status: values.status,
        ...(!row ? { ownerUserId: values.ownerUserId } : {}),
      };
      return row
        ? adminApi.patch(`/admin/stores/${id}`, body)
        : adminApi.post('/admin/stores', body, postOptions);
    }
    case 'complaints':
      return adminApi.post(
        `/admin/complaints/${id}/resolve`,
        {
          decision: values.decision,
          ...(values.decision === 'ACCEPT' && values.refundAmount.trim()
            ? { refundAmount: Number(values.refundAmount) }
            : {}),
          ...(values.reason.trim() ? { reason: values.reason.trim() } : {}),
        },
        postOptions,
      );
    case 'violations':
    case 'reviews':
      return adminApi.patch(`/admin/${collection}/${id}`, { status: values.status });
    case 'subscriptions':
      return adminApi.post(
        `/admin/stores/${storeId}/subscription/${values.action}`,
        undefined,
        postOptions,
      );
    case 'settings':
      return adminApi.put(`/admin/stores/${storeId}/settings`, {
        defaultPickupStart: values.defaultPickupStart,
        defaultPickupEnd: values.defaultPickupEnd,
        floorRatio: Number(values.floorRatio),
        costPriceRatio: values.costPriceRatio.trim() ? Number(values.costPriceRatio) : null,
        pricingMode: values.pricingMode,
        lateGraceMinutes: Number(values.lateGraceMinutes),
        maxQtyPerOrder: Number(values.maxQtyPerOrder),
      });
    case 'quotas': {
      const body = { quotaValue: Number(values.quotaValue) };
      return row
        ? adminApi.patch(`/admin/quotas/${id}`, body)
        : adminApi.post(
            '/admin/quotas',
            {
              ...body,
              plan: values.plan,
              quotaKey: values.quotaKey,
              period: quotaOptions.find(([key]) => key === values.quotaKey)?.[2],
            },
            postOptions,
          );
    }
    default:
      return Promise.reject(new Error('Tập dữ liệu này chỉ hỗ trợ xem.'));
  }
}
