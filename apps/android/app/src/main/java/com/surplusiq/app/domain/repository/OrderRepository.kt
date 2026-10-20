package com.surplusiq.app.domain.repository

import com.surplusiq.app.data.remote.dto.OrderReceiptDto
import com.surplusiq.app.data.remote.dto.ProxyCodeResponse
import com.surplusiq.app.data.remote.dto.ReorderResponseDto
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.PaymentInfo
import com.surplusiq.app.domain.model.PaymentRecheckResult

interface OrderRepository {
    suspend fun holdOrder(
        deal: Deal,
        quantity: Int,
        pickupSlot: String? = null,
        note: String? = null,
        promotionId: String? = null
    ): Result<ActiveOrder>

    suspend fun getActiveOrders(): Result<List<ActiveOrder>>

    suspend fun cancelHold(orderId: String, reason: String? = null): Result<Boolean>

    suspend fun notifyArriving(orderId: String): Result<Boolean>

    /** Khởi tạo giao dịch VietQR/giả lập thật từ backend (R1-041). Không tự fake thành công. */
    suspend fun createPayment(orderId: String): Result<PaymentInfo>

    /** Khách bấm "Kiểm tra lại" - gọi backend xác nhận trạng thái thật, không đoán (R1-056). */
    suspend fun recheckPayment(orderId: String): Result<PaymentRecheckResult>

    /** Trạng thái đơn thật từ server (PENDING_PAYMENT/PAID/PICKED_UP/...) - dùng để dò quán đã quét QR hay chưa. */
    suspend fun getOrderStatus(orderId: String): Result<String>

    /** Tạo mã nhận hộ 8 ký tự cho đơn đã thanh toán (R1-052). */
    suspend fun createProxyCode(orderId: String): Result<ProxyCodeResponse>

    /** Lấy mã nhận hộ đang có hiệu lực của đơn hàng, null nếu chưa tạo (R1-052). */
    suspend fun getProxyCode(orderId: String): Result<ProxyCodeResponse?>

    /** Thu hồi mã nhận hộ khi chưa sử dụng (R1-052). */
    suspend fun revokeProxyCode(orderId: String): Result<Boolean>

    /**
     * Hạn hủy thật theo R1-043: đơn chờ thanh toán -> hết hạn giữ suất; đơn đã thanh toán ->
     * giờ bắt đầu nhận trừ 60 phút. null nếu server không trả mốc giờ.
     */
    suspend fun getCancelDeadlineMillis(orderId: String): Result<Long?>

    /** Biên nhận đơn đã thanh toán (R1-054). */
    suspend fun getOrderReceipt(orderId: String): Result<OrderReceiptDto>

    /** Đặt lại từ đơn cũ (R1-051): null khi món chưa có suất mở (server trả 400). */
    suspend fun reorder(oldOrderId: String): Result<ReorderResponseDto?>
}
