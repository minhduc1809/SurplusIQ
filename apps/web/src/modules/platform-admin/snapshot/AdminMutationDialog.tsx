import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { AdminDrawer } from '../components/Drawer/AdminDrawer';
import {
  canEditRecord,
  quotaOptions,
  saveAdminRecord,
  supportsCreate,
} from '../api/admin-management.api';
import { collections, text, type AdminSnapshot, type SnapshotRow } from './model';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

interface AdminMutationDialogProps {
  collection: string;
  row: SnapshotRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  snapshot: AdminSnapshot;
}

type Values = Record<string, string>;
type Option = readonly [string, string];

// =====================================================
// 2. GIÁ TRỊ KHỚI TẠO FORM
// =====================================================

function initialValues(collection: string, row: SnapshotRow | null): Values {
  const value = (key: string, fallback = '') => text(row?.[key]) || fallback;
  switch (collection) {
    case 'users':
      return {
        email: value('email'),
        phone: value('phone'),
        password: '',
        role: value('role', 'CUSTOMER'),
        status: ['ACTIVE', 'LOCKED'].includes(value('status')) ? value('status') : 'ACTIVE',
      };
    case 'stores':
      return {
        name: value('name'),
        address: value('address'),
        phone: value('phone'),
        logoUrl: value('logo_url'),
        ownerUserId: '',
        status: value('status', 'PENDING_VERIFY'),
        latitude: value('latitude'),
        longitude: value('longitude'),
      };
    case 'complaints':
      return { decision: 'ACCEPT', refundAmount: '', reason: '' };
    case 'violations':
      return { status: row?.status === 'DISMISSED' ? 'DISMISSED' : 'REVIEWED' };
    case 'reviews':
      return { status: value('status', 'VISIBLE') };
    case 'subscriptions':
      return { action: row?.plan === 'PRO' ? 'renew' : 'upgrade' };
    case 'settings':
      return {
        defaultPickupStart: value('default_pickup_start', '19:00:00'),
        defaultPickupEnd: value('default_pickup_end', '21:00:00'),
        floorRatio: value('floor_ratio', '0.4'),
        costPriceRatio: value('cost_price_ratio'),
        pricingMode: value('pricing_mode', 'MANUAL'),
        lateGraceMinutes: value('late_grace_minutes', '15'),
        maxQtyPerOrder: value('max_qty_per_order', '5'),
      };
    case 'quotas':
      return {
        plan: value('plan', 'BASIC'),
        quotaKey: value('quota_key', 'daily_offers'),
        quotaValue: value('quota_value', '0'),
      };
    default:
      return {};
  }
}

// =====================================================
// 3. COMPONENT MUTATION DIALOG
// =====================================================

export function AdminMutationDialog({
  collection,
  row,
  open,
  onClose,
  onSaved,
  snapshot,
}: AdminMutationDialogProps) {
  const [values, setValues] = useState<Values>(() => initialValues(collection, row));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  // Chốt đồng bộ ngăn gửi trùng trước khi React cập nhật nút.
  const pending = useRef(false);
  const lastRequest = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    if (!open) return;
    setValues(initialValues(collection, row));
    setSaved(false);
    setError(null);
    pending.current = false;
    lastRequest.current = null;
  }, [collection, row, open]);
  const allowed = row ? canEditRecord(collection, row) : supportsCreate(collection);
  const changed = JSON.stringify(values) !== JSON.stringify(initialValues(collection, row));
  const title =
    collection === 'complaints'
      ? 'Xử lý khiếu nại'
      : collection === 'violations'
        ? 'Xử lý báo cáo vi phạm'
        : collection === 'subscriptions'
          ? 'Quản lý gói dịch vụ'
          : `${row ? 'Sửa' : 'Thêm'} ${collections[collection]?.title.toLocaleLowerCase('vi-VN') || ''}`;
  const update = (key: string, value: string) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const input = (
    key: string,
    label: string,
    options: {
      type?: string;
      required?: boolean;
      min?: number;
      max?: number;
      step?: number;
      maxLength?: number;
      minLength?: number;
      helperText?: string;
      multiline?: boolean;
    } = {},
  ) => (
    <TextField
      key={key}
      fullWidth
      label={label}
      value={values[key] ?? ''}
      onChange={(event) => update(key, event.target.value)}
      disabled={saving || saved}
      type={options.type || 'text'}
      required={options.required}
      multiline={options.multiline}
      minRows={options.multiline ? 3 : undefined}
      helperText={options.helperText}
      slotProps={{
        htmlInput: {
          min: options.min,
          max: options.max,
          step: options.step,
          maxLength: options.maxLength,
          minLength: options.minLength,
        },
        ...(options.type === 'time' ? { inputLabel: { shrink: true } } : {}),
      }}
    />
  );
  const select = (key: string, label: string, options: readonly Option[], disabled = false) => (
    <TextField
      key={key}
      fullWidth
      select
      label={label}
      value={values[key] ?? ''}
      onChange={(event) => update(key, event.target.value)}
      required
      disabled={saving || saved || disabled}
      slotProps={{ select: { native: true } }}
    >
      <option value="" disabled>
        Chọn {label.toLocaleLowerCase('vi-VN')}
      </option>
      {options.map(([value, name]) => (
        <option key={value} value={value}>
          {name}
        </option>
      ))}
    </TextField>
  );
  async function refresh() {
    setError(null);
    setSaving(true);
    try {
      await onSaved();
      onClose();
    } catch (caught) {
      setError(
        `Đã lưu vào database, nhưng chưa tải lại được bảng. ${caught instanceof Error ? caught.message : 'Vui lòng thử tải lại.'}`,
      );
    } finally {
      setSaving(false);
    }
  }
  async function submit() {
    if (pending.current || saved || !allowed || !form.current?.reportValidity()) return;
    if (collection === 'users' && !values.email.trim() && !values.phone.trim()) {
      setError('Cần nhập ít nhất một email hoặc số điện thoại.');
      return;
    }
    if (
      collection === 'stores' &&
      Boolean(values.latitude?.trim()) !== Boolean(values.longitude?.trim())
    ) {
      setError('Cần nhập đồng thời cả Vĩ độ (Latitude) và Kinh độ (Longitude) cho tọa độ PostGIS.');
      return;
    }
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      // Lần retry sau khi mất response phải xác định đúng thao tác, đặc biệt khi gia hạn.
      // Thay đổi giá trị đã gửi hoặc mở lại drawer sẽ bắt đầu thao tác mới.
      const signature = JSON.stringify([collection, row?.id || row?.store_id || null, values]);
      if (lastRequest.current?.signature !== signature) {
        lastRequest.current = { signature, key: crypto.randomUUID() };
      }
      await saveAdminRecord(collection, row, values, lastRequest.current.key);
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không lưu được dữ liệu.');
      setSaving(false);
      pending.current = false;
      return;
    }
    await refresh();
    pending.current = false;
  }
  const order = snapshot.collections.orders.find((item) => item.id === row?.order_id);
  const refunded = snapshot.collections.payments
    .filter(
      (payment) =>
        payment.order_id === row?.order_id &&
        payment.kind === 'ORDER_REFUND' &&
        payment.status === 'SUCCEEDED',
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const refundable = order ? Math.max(0, Number(order.total_amount) - refunded) : undefined;
  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      title={title}
      saving={saving}
      onSubmit={() => {
        void submit();
      }}
      submitLabel={row ? 'Lưu thay đổi' : 'Thêm mới'}
      submitDisabled={!allowed || saved}
      dirty={changed && !saved}
      error={error}
    >
      <Stack
        component="form"
        ref={form}
        spacing={2.5}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {saved && (
          <Alert severity="success">
            Đã lưu thay đổi vào database.
            <Button
              disabled={saving}
              onClick={() => {
                void refresh();
              }}
            >
              Tải lại dữ liệu
            </Button>
          </Alert>
        )}
        {!allowed && (
          <Alert severity="info">Bản ghi hiện tại không có thao tác chỉnh sửa phù hợp.</Alert>
        )}
        {row && (row.store_name || row.email || row.name || row.order_code) && (
          <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
            {text(row.store_name || row.email || row.name || row.order_code)}
          </Typography>
        )}
        {collection === 'users' && (
          <>
            {input('email', 'Email', {
              type: 'email',
              maxLength: 255,
              required: values.role !== 'CUSTOMER',
            })}
            {input('phone', 'Số điện thoại', { type: 'tel', maxLength: 20 })}
            {!row &&
              input('password', 'Mật khẩu', {
                type: 'password',
                required: true,
                minLength: 8,
                maxLength: 128,
                helperText: 'Tối thiểu 8 ký tự.',
              })}
            {select('role', 'Vai trò', [
              ['CUSTOMER', 'Khách hàng'],
              ['STORE_USER', 'Người dùng cửa hàng'],
              ['ADMIN', 'Quản trị viên'],
            ])}
            {select('status', 'Trạng thái', [
              ['ACTIVE', 'Hoạt động'],
              ['LOCKED', 'Đã khóa'],
            ])}
          </>
        )}
        {collection === 'stores' && (
          <>
            {!row &&
              select(
                'ownerUserId',
                'Chủ cửa hàng',
                snapshot.collections.users
                  .filter(
                    (item) =>
                      item.role === 'STORE_USER' &&
                      item.status === 'ACTIVE' &&
                      !snapshot.collections.members.some((member) => member.user_id === item.id),
                  )
                  .map(
                    (item) => [text(item.id), text(item.email || item.phone || item.id)] as const,
                  ),
              )}
            {!row && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Chọn tài khoản cửa hàng đang hoạt động và chưa tham gia cửa hàng khác. Có thể tạo
                tài khoản tại mục Người dùng.
              </Typography>
            )}
            {input('name', 'Tên cửa hàng', { required: true, maxLength: 150 })}
            {input('address', 'Địa chỉ', { required: true, maxLength: 255 })}
            {input('phone', 'Số điện thoại', { required: true, type: 'tel', maxLength: 20 })}
            {input('logoUrl', 'URL ảnh cửa hàng', { type: 'url', maxLength: 500 })}
            {input('latitude', 'Vĩ độ (Latitude)', {
              type: 'number',
              min: -90,
              max: 90,
              step: 0.000001,
              helperText: 'Tùy chọn tọa độ PostGIS (VD TP.HCM: 10.7769).',
            })}
            {input('longitude', 'Kinh độ (Longitude)', {
              type: 'number',
              min: -180,
              max: 180,
              step: 0.000001,
              helperText: 'Tùy chọn tọa độ PostGIS (VD TP.HCM: 106.7009).',
            })}
            {select('status', 'Trạng thái', [
              ['PENDING_VERIFY', 'Chờ xác minh'],
              ['ACTIVE', 'Hoạt động'],
              ['SUSPENDED', 'Tạm ngưng'],
            ])}
          </>
        )}
        {collection === 'complaints' && (
          <>
            {select('decision', 'Quyết định', [
              ['ACCEPT', 'Chấp nhận'],
              ['REJECT', 'Từ chối'],
            ])}
            {values.decision === 'ACCEPT' && (
              <>
                <Alert severity="info">
                  Hoàn tiền được ghi nhận bằng giao dịch mô phỏng. Bỏ trống số tiền để hoàn toàn bộ
                  phần tiền chưa hoàn của đơn hàng.
                </Alert>
                {input('refundAmount', 'Số tiền hoàn (VND)', {
                  type: 'number',
                  min: 0,
                  max: refundable,
                  step: 1,
                  helperText:
                    refundable !== undefined
                      ? `Tối đa ${refundable.toLocaleString('vi-VN')} đ.`
                      : undefined,
                })}
              </>
            )}
            {input('reason', values.decision === 'REJECT' ? 'Lý do từ chối' : 'Ghi chú xử lý', {
              required: values.decision === 'REJECT',
              multiline: true,
              maxLength: 1000,
            })}
          </>
        )}
        {collection === 'violations' &&
          select('status', 'Kết quả xử lý', [
            ['REVIEWED', 'Đã xem xét'],
            ['DISMISSED', 'Bỏ qua báo cáo'],
          ])}
        {collection === 'reviews' &&
          select('status', 'Hiển thị đánh giá', [
            ['VISIBLE', 'Hiển thị'],
            ['HIDDEN', 'Đã ẩn'],
          ])}
        {collection === 'subscriptions' && (
          <>
            {select('action', 'Thao tác', [
              ...(row?.plan === 'PRO'
                ? [['renew', 'Gia hạn Pro'] as const]
                : [['upgrade', 'Nâng cấp Pro'] as const]),
              ...(row?.plan !== 'BASIC' ? [['downgrade', 'Hạ về Basic'] as const] : []),
            ])}
            <Alert severity="info">
              {values.action === 'downgrade'
                ? 'Gói Pro hạ về Basic vào cuối kỳ. Gói dùng thử sẽ dừng ngay, chuyển định giá sang thủ công và áp dụng hạn mức nhân viên Basic.'
                : 'Nâng cấp hoặc gia hạn thêm 30 ngày, tạo hóa đơn 300.000 đ được đánh dấu thanh toán mô phỏng.'}
            </Alert>
          </>
        )}
        {collection === 'settings' && (
          <>
            {input('defaultPickupStart', 'Giờ nhận mặc định từ', { type: 'time', required: true })}
            {input('defaultPickupEnd', 'Giờ nhận mặc định đến', { type: 'time', required: true })}
            {input('floorRatio', 'Tỷ lệ giá sàn', {
              type: 'number',
              required: true,
              min: 0.1,
              max: 1,
              step: 0.01,
            })}
            {input('costPriceRatio', 'Tỷ lệ giá vốn', {
              type: 'number',
              min: 0,
              max: 1,
              step: 0.01,
              helperText: 'Để trống nếu không áp dụng.',
            })}
            {select('pricingMode', 'Chế độ định giá', [
              ['MANUAL', 'Thủ công'],
              ['AUTO', 'Tự động'],
            ])}
            {input('lateGraceMinutes', 'Số phút cho phép đến muộn', {
              type: 'number',
              required: true,
              min: 0,
              max: 60,
              step: 1,
            })}
            {input('maxQtyPerOrder', 'Số lượng tối đa mỗi đơn', {
              type: 'number',
              required: true,
              min: 1,
              max: 5,
              step: 1,
            })}
          </>
        )}
        {collection === 'quotas' && (
          <>
            {select(
              'plan',
              'Gói dịch vụ',
              [
                ['BASIC', 'Basic'],
                ['PRO', 'Pro (gồm gói dùng thử)'],
                ...(row?.plan === 'TRIAL'
                  ? [['TRIAL', 'Dùng thử (áp dụng hạn mức Pro)'] as const]
                  : []),
              ],
              !!row,
            )}
            {select(
              'quotaKey',
              'Hạn mức',
              quotaOptions.map(([key, label]) => [key, label]),
              !!row,
            )}
            {input('quotaValue', 'Giới hạn', { type: 'number', required: true, min: 0, step: 1 })}
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Chu kỳ được áp dụng theo loại hạn mức. Gói dùng thử áp dụng hạn mức Pro. Xóa ghi đè để
              quay về cấu hình mặc định.
            </Typography>
          </>
        )}
      </Stack>
    </AdminDrawer>
  );
}
