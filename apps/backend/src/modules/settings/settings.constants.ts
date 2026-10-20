export const REDIS_CLIENT = 'REDIS_CLIENT';

export const SETTINGS_CACHE_PREFIX = {
  PLATFORM: 'settings:platform:',
  PLATFORM_ALL: 'settings:platform:__all__',
  STORE: 'settings:store:',
};

export const SETTINGS_CACHE_TTL_SECONDS = 3600; // 1 hour

export interface DefaultSettingItem {
  value: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  description: string;
}

export const DEFAULT_PLATFORM_SETTINGS: Record<string, DefaultSettingItem> = {
  'order.hold_minutes': {
    value: '10',
    dataType: 'NUMBER',
    description: 'Thời gian giữ suất tối đa khi chờ thanh toán (phút) - BR-017',
  },
  'order.max_qty_per_order': {
    value: '5',
    dataType: 'NUMBER',
    description: 'Số suất tối đa mỗi đơn hàng - BR-017, R2-101',
  },
  'order.cancel_min_minutes_before_pickup': {
    value: '60',
    dataType: 'NUMBER',
    description: 'Thời gian tối thiểu trước giờ nhận để khách hủy đơn (phút) - BR-018',
  },
  'pickup.late_grace_minutes': {
    value: '15',
    dataType: 'NUMBER',
    description: 'Thời gian gia hạn trễ nhận hàng trước khi đánh dấu no-show (phút) - BR-023',
  },
  'pickup.reminder_minutes_before': {
    value: '30',
    dataType: 'NUMBER',
    description: 'Thời gian nhắc nhở nhận hàng trước khung giờ (phút) - R1-075',
  },
  'noshow.threshold': {
    value: '3',
    dataType: 'NUMBER',
    description: 'Số lần không đến nhận tối đa trước khi khóa tài khoản - BR-020',
  },
  'noshow.window_days': {
    value: '30',
    dataType: 'NUMBER',
    description: 'Cửa sổ ngày cuốn chiếu tính số lần no-show - BR-020',
  },
  'noshow.lock_days': {
    value: '7',
    dataType: 'NUMBER',
    description: 'Thời gian khóa đặt đơn khi vi phạm no-show (ngày) - BR-020',
  },
  'price.floor_ratio_default': {
    value: '0.40',
    dataType: 'NUMBER',
    description: 'Tỷ lệ giá sàn mặc định so với giá gốc - BR-046',
  },
  'price.rounding_step': {
    value: '500',
    dataType: 'NUMBER',
    description: 'Bước làm tròn giá bán (VND) - BR-064',
  },
  'price.max_changes_per_offer': {
    value: '3',
    dataType: 'NUMBER',
    description: 'Số lần đổi giá tối đa trong một đợt mở bán - BR-064',
  },
  'price.proposal_ttl_minutes': {
    value: '15',
    dataType: 'NUMBER',
    description: 'Thời gian hiệu lực của đề xuất giá (phút) - BR-065',
  },
  'commission.rate': {
    value: '0.10',
    dataType: 'NUMBER',
    description: 'Tỷ lệ hoa hồng nền tảng trên giá sau ưu đãi - Ch.13 #2',
  },
  'complaint.window_hours': {
    value: '24',
    dataType: 'NUMBER',
    description: 'Thời gian cho phép khiếu nại sau khi nhận hàng (giờ) - BR-026',
  },
  'complaint.response_hours': {
    value: '48',
    dataType: 'NUMBER',
    description: 'Thời gian cửa hàng phải phản hồi khiếu nại (giờ) - BR-071',
  },
  'complaint.extension_hours': {
    value: '24',
    dataType: 'NUMBER',
    description: 'Thời gian gia hạn bổ sung bằng chứng khiếu nại (giờ) - BR-073',
  },
  'complaint.max_images': {
    value: '3',
    dataType: 'NUMBER',
    description: 'Số lượng ảnh bằng chứng tối đa khi khiếu nại - R1-061',
  },
  'complaint.max_evidence_additions': {
    value: '2',
    dataType: 'NUMBER',
    description: 'Số lần tối đa được bổ sung bằng chứng - BR-027',
  },
  'review.edit_hours': {
    value: '24',
    dataType: 'NUMBER',
    description: 'Thời gian cho phép chỉnh sửa đánh giá sau khi gửi (giờ) - BR-028',
  },
  'otp.length': {
    value: '6',
    dataType: 'NUMBER',
    description: 'Độ dài mã OTP - BR-002',
  },
  'otp.ttl_minutes': {
    value: '5',
    dataType: 'NUMBER',
    description: 'Thời gian hiệu lực của mã OTP (phút) - BR-002',
  },
  'otp.max_wrong': {
    value: '5',
    dataType: 'NUMBER',
    description: 'Số lần nhập sai OTP tối đa trước khi khóa - BR-002',
  },
  'otp.lock_minutes': {
    value: '15',
    dataType: 'NUMBER',
    description: 'Thời gian khóa tạm thời khi nhập sai OTP (phút) - BR-002',
  },
  'otp.resend_per_hour': {
    value: '3',
    dataType: 'NUMBER',
    description: 'Số lần yêu cầu gửi lại OTP tối đa mỗi giờ - BR-002',
  },
  'auth.login_max_wrong': {
    value: '5',
    dataType: 'NUMBER',
    description: 'Số lần đăng nhập sai tối đa trước khi khóa tài khoản',
  },
  'auth.lock_minutes': {
    value: '15',
    dataType: 'NUMBER',
    description: 'Thời gian khóa đăng nhập khi sai quá số lần (phút)',
  },
  'staff.invite_link_hours': {
    value: '72',
    dataType: 'NUMBER',
    description: 'Thời gian hiệu lực link mời nhân viên (giờ) - 12.18.3',
  },
  'account.delete_grace_days': {
    value: '7',
    dataType: 'NUMBER',
    description: 'Thời gian ân hạn trước khi ẩn danh xóa tài khoản (ngày) - R1-019',
  },
  'payment.pending_max_hours': {
    value: '24',
    dataType: 'NUMBER',
    description: 'Thời gian tối đa giữ giao dịch chờ xác nhận (giờ) - VC-07',
  },
  'payment.recheck_minutes': {
    value: '15',
    dataType: 'NUMBER',
    description: 'Khoảng thời gian polling kiểm tra lại giao dịch treo (phút) - VC-07',
  },
  'payment.customer_recheck_min_interval_seconds': {
    value: '60',
    dataType: 'NUMBER',
    description: 'Khoảng cách tối thiểu giữa 2 lần khách bấm kiểm tra lại thanh toán (giây)',
  },
  'refund.max_retries': {
    value: '3',
    dataType: 'NUMBER',
    description: 'Số lần thử lại hoàn tiền tự động tối đa trước khi chuyển can thiệp thủ công',
  },
  'campaign.per_store_per_day': {
    value: '1',
    dataType: 'NUMBER',
    description: 'Số chiến dịch tối đa cửa hàng được gửi mỗi ngày - BR-086',
  },
  'campaign.per_customer_per_day': {
    value: '2',
    dataType: 'NUMBER',
    description: 'Số chiến dịch tối đa khách hàng được nhận mỗi ngày - BR-086',
  },
  'pagination.page_size': {
    value: '20',
    dataType: 'NUMBER',
    description: 'Số lượng phần tử mặc định mỗi trang phân trang',
  },
  'retention.notifications_days': {
    value: '90',
    dataType: 'NUMBER',
    description: 'Thời gian lưu trữ thông báo (ngày)',
  },
  'retention.audit_months': {
    value: '12',
    dataType: 'NUMBER',
    description: 'Thời gian lưu trữ nhật ký kiểm toán (tháng)',
  },
  'retention.ai_log_days': {
    value: '90',
    dataType: 'NUMBER',
    description: 'Thời gian lưu trữ nhật ký gọi AI (ngày)',
  },
  'retention.view_history_days': {
    value: '30',
    dataType: 'NUMBER',
    description: 'Thời gian lưu lịch sử xem deal (ngày)',
  },
  'forecast.min_days': {
    value: '14',
    dataType: 'NUMBER',
    description: 'Số ngày dữ liệu tối thiểu để kích hoạt dự báo theo thứ (WMA) - BR-060',
  },
  'anomaly.min_days': {
    value: '28',
    dataType: 'NUMBER',
    description: 'Số ngày dữ liệu tối thiểu để phát hiện bất thường - BR-096',
  },
  'segment.min_customers': {
    value: '20',
    dataType: 'NUMBER',
    description: 'Số khách hàng tối thiểu để bắt đầu phân nhóm quy tắc - 12.19.1',
  },
  'simulation.min_days': {
    value: '14',
    dataType: 'NUMBER',
    description: 'Số ngày mô phỏng tối thiểu - BR-090',
  },
  'donation.min_remaining': {
    value: '3',
    dataType: 'NUMBER',
    description: 'Số lượng tồn tối thiểu để gợi ý chuyển từ thiện - BR-098',
  },
  'donation.minutes_before_end': {
    value: '30',
    dataType: 'NUMBER',
    description: 'Thời gian trước khi đóng suất để kích hoạt gợi ý từ thiện (phút) - BR-098',
  },
  'rescue_bridge.evidence_required': {
    value: 'true',
    dataType: 'BOOLEAN',
    description: 'Rescue Bridge: bắt buộc bằng chứng bàn giao trước khi hoàn tất - BR-B03-06',
  },
  'promo.max_percent': {
    value: '50',
    dataType: 'NUMBER',
    description: 'Tỷ lệ giảm giá khuyến mãi tối đa (%) - BR-084',
  },
  'demo.day_duration_seconds': {
    value: '120',
    dataType: 'NUMBER',
    description: 'Độ dài 1 ngày mô phỏng trong chế độ demo (giây = 2 phút) - R2-065',
  },
  'plan.trial_months': {
    value: '1',
    dataType: 'NUMBER',
    description: 'Thời gian dùng thử gói Pro miễn phí (tháng) - VC-01',
  },
  'plan.pro_price_vnd': {
    value: '300000',
    dataType: 'NUMBER',
    description: 'Phí thuê bao gói Pro mỗi tháng (VND) - VC-02',
  },
  'plan.pro_period_days': {
    value: '30',
    dataType: 'NUMBER',
    description: 'Chu kỳ gói Pro (ngày) - Ch.13 #1',
  },
};
