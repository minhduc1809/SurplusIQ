package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OrderCheckoutUiState(
    val activeOrder: ActiveOrder? = null,
    val remainingSeconds: Long = 600L, // 10 minutes (BR-017)
    val isHoldExpired: Boolean = false,
    val isPaymentProcessing: Boolean = false,
    val isPaymentSuccess: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class OrderHoldCheckoutViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrderCheckoutUiState())
    val uiState: StateFlow<OrderCheckoutUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null

    fun initializeHoldOrder(deal: Deal, quantity: Int = 1, note: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPaymentProcessing = false, isPaymentSuccess = false, errorMessage = null)
            val result = orderRepository.holdOrder(deal = deal, quantity = quantity, note = note)
            result.fold(
                onSuccess = { order ->
                    val initialSeconds = ((order.holdExpiresAtMillis - System.currentTimeMillis()) / 1000L).coerceAtLeast(0L)
                    _uiState.value = _uiState.value.copy(
                        activeOrder = order,
                        remainingSeconds = initialSeconds,
                        isHoldExpired = initialSeconds <= 0
                    )
                    startCountdown()
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        errorMessage = err.localizedMessage ?: "Không thể giữ suất cứu món"
                    )
                }
            )
        }
    }

    private fun startCountdown() {
        countdownJob?.cancel()
        countdownJob = viewModelScope.launch {
            while (_uiState.value.remainingSeconds > 0) {
                delay(1000L)
                val newSec = _uiState.value.remainingSeconds - 1
                if (newSec <= 0) {
                    _uiState.value = _uiState.value.copy(remainingSeconds = 0, isHoldExpired = true)
                    cancelHold()
                    break
                } else {
                    _uiState.value = _uiState.value.copy(remainingSeconds = newSec)
                }
            }
        }
    }

    fun confirmPayment() {
        val order = _uiState.value.activeOrder ?: return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isPaymentProcessing = true)
            delay(1200L) // Simulate VietQR payment gateway callback
            val result = orderRepository.confirmPayment(order.id)
            result.fold(
                onSuccess = { updated ->
                    countdownJob?.cancel()
                    _uiState.value = _uiState.value.copy(
                        activeOrder = updated,
                        isPaymentProcessing = false,
                        isPaymentSuccess = true
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        isPaymentProcessing = false,
                        errorMessage = "Thanh toán thất bại, vui lòng thử lại"
                    )
                }
            )
        }
    }

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
