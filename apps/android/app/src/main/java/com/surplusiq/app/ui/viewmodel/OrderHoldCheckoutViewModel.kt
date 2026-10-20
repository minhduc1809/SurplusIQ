package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.OrderStatus
import com.surplusiq.app.domain.model.PaymentInfo
import com.surplusiq.app.domain.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Trạng thái thanh toán thật, không có biến thể "đang giả lập" (rule 0.1):
 * mọi chuyển trạng thái chỉ xảy ra sau phản hồi thật từ backend.
 */
sealed interface PaymentUiState {
    data object Idle : PaymentUiState
    data object Creating : PaymentUiState
    data class Pending(val info: PaymentInfo) : PaymentUiState
    data class Checking(val info: PaymentInfo) : PaymentUiState
    data class Failed(val message: String, val canRetry: Boolean = true) : PaymentUiState
}

/** Bốn biến thể màn Kết quả thanh toán (K25) - chỉ dựng từ phản hồi thật của backend/đồng hồ giữ suất. */
sealed interface PaymentResult {
    data object Success : PaymentResult
    data class Pending(val message: String) : PaymentResult
    data object HoldExpired : PaymentResult
    data class LatePayment(val message: String) : PaymentResult
}

data class OrderCheckoutUiState(
    val isHolding: Boolean = false,
    val activeOrder: ActiveOrder? = null,
    val remainingSeconds: Long = 600L, // 10 minutes (BR-017)
    val isHoldExpired: Boolean = false,
    val holdErrorMessage: String? = null,
    val payment: PaymentUiState = PaymentUiState.Idle,
    val isPaymentSuccess: Boolean = false,
    val paymentResult: PaymentResult? = null
)

@HiltViewModel
class OrderHoldCheckoutViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderCheckoutUiState())
    val uiState: StateFlow<OrderCheckoutUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null

    /**
     * VM sống theo Activity (không có NavHost) nên phải dọn phiên cũ khi mở checkout cho deal khác
     * hoặc khi phiên trước đã kết thúc; giữ nguyên nếu đang thanh toán dở cùng deal.
     */
    fun startFor(dealId: String) {
        val current = _uiState.value
        val finished = current.paymentResult != null && current.paymentResult !is PaymentResult.Pending
        if (current.activeOrder?.deal?.id != dealId || finished || current.holdErrorMessage != null) {
            countdownJob?.cancel()
            _uiState.value = OrderCheckoutUiState()
        }
    }

    fun initializeHoldOrder(deal: Deal, quantity: Int = 1, note: String? = null, promotionId: String? = null) {
        viewModelScope.launch {
            _uiState.value = OrderCheckoutUiState(isHolding = true)
            val result = orderRepository.holdOrder(
                deal = deal,
                quantity = quantity,
                note = note,
                promotionId = promotionId
            )
            result.fold(
                onSuccess = { order ->
                    val initialSeconds =
                        ((order.holdExpiresAtMillis - System.currentTimeMillis()) / 1000L).coerceAtLeast(0L)
                    _uiState.value = _uiState.value.copy(
                        isHolding = false,
                        activeOrder = order,
                        remainingSeconds = initialSeconds,
                        isHoldExpired = initialSeconds <= 0
                    )
                    startCountdown()
                    createPayment()
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isHolding = false,
                        holdErrorMessage = err.message ?: "Không thể giữ suất cứu món."
                    )
                }
            )
        }
    }

    private fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = viewModelScope.launch {
            while (_uiState.value.remainingSeconds > 0 && !_uiState.value.isPaymentSuccess) {
                delay(1000L)
                val newSec = _uiState.value.remainingSeconds - 1
                if (newSec <= 0) {
                    _uiState.value = _uiState.value.copy(
                        remainingSeconds = 0,
                        isHoldExpired = true,
                        paymentResult = PaymentResult.HoldExpired
                    )
                    break
                } else {
                    _uiState.value = _uiState.value.copy(remainingSeconds = newSec)
                }
            }
        }
    }

    /** Khởi tạo giao dịch VietQR thật ngay sau khi giữ suất thành công (R1-041). */
    private fun createPayment() {
        val order = _uiState.value.activeOrder ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(payment = PaymentUiState.Creating)
            val result = orderRepository.createPayment(order.id)
            result.fold(
                onSuccess = { info ->
                    _uiState.value = _uiState.value.copy(payment = PaymentUiState.Pending(info))
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        payment = PaymentUiState.Failed(err.message ?: "Không thể khởi tạo thanh toán.")
                    )
                }
            )
        }
    }

    /**
     * "Tôi đã chuyển tiền, kiểm tra lại" - gọi backend xác nhận thật, không tự đoán thành công.
     * Backend giới hạn 1 lần/phút; lỗi (vd. 400 do gọi quá nhanh) giữ nguyên thông tin VietQR.
     */
    fun recheckPayment() {
        val order = _uiState.value.activeOrder ?: return
        val pendingInfo = (_uiState.value.payment as? PaymentUiState.Pending)?.info
            ?: (_uiState.value.payment as? PaymentUiState.Checking)?.info
            ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(payment = PaymentUiState.Checking(pendingInfo))
            val result = orderRepository.recheckPayment(order.id)
            result.fold(
                onSuccess = { recheck ->
                    val paymentResult = when {
                        recheck.orderStatus == "PAID" || recheck.orderStatus == "PICKED_UP" -> PaymentResult.Success
                        // R1-047: tiền về sau khi hết hạn giữ -> đơn giữ HOLD_EXPIRED, backend tự hoàn 100%.
                        recheck.orderStatus == "HOLD_EXPIRED" && recheck.paymentStatus == "SUCCEEDED" ->
                            PaymentResult.LatePayment(recheck.message)
                        recheck.orderStatus == "HOLD_EXPIRED" -> PaymentResult.HoldExpired
                        else -> PaymentResult.Pending(recheck.message)
                    }
                    if (paymentResult == PaymentResult.Success) countdownJob?.cancel()
                    _uiState.value = _uiState.value.copy(
                        activeOrder = if (paymentResult == PaymentResult.Success) {
                            order.copy(status = OrderStatus.PAID_WAITING_PICKUP)
                        } else order,
                        isPaymentSuccess = paymentResult == PaymentResult.Success,
                        payment = PaymentUiState.Pending(pendingInfo),
                        paymentResult = paymentResult
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        payment = PaymentUiState.Pending(pendingInfo),
                        paymentResult = PaymentResult.Pending(
                            err.message ?: "Chưa xác định được kết quả thanh toán."
                        )
                    )
                }
            )
        }
    }

    /** Quay lại màn mã VietQR từ biến thể "Đang chờ xác nhận". */
    fun dismissPendingResult() {
        if (_uiState.value.paymentResult is PaymentResult.Pending) {
            _uiState.value = _uiState.value.copy(paymentResult = null)
        }
    }

    fun retryCreatePayment() = createPayment()

    fun cancelHold() {
        countdownJob?.cancel()
        val orderId = _uiState.value.activeOrder?.id
        if (orderId != null) {
            viewModelScope.launch {
                orderRepository.cancelHold(orderId, "Hết hạn 10 phút hoặc khách hủy")
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        countdownJob?.cancel()
    }
}
