package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.repository.OrderRepository
import com.surplusiq.app.domain.repository.PickupPassInfo
import com.surplusiq.app.domain.repository.PickupRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PickupPassUiState(
    val passInfo: PickupPassInfo? = null,
    val hasNotifiedArrival: Boolean = false,
    val isPickedUp: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class PickupPassViewModel @Inject constructor(
    private val pickupRepository: PickupRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PickupPassUiState())
    val uiState: StateFlow<PickupPassUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null

    fun loadPickupPass(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = pickupRepository.getPickupPass(orderId)
            result.fold(
                onSuccess = { info ->
                    _uiState.value = _uiState.value.copy(passInfo = info, isLoading = false)
                    startStatusPolling(orderId)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = err.message ?: "Không thể tải vé nhận hàng."
                    )
                }
            )
        }
    }

    /**
     * Khách hàng không tự xác nhận đã nhận hàng - chỉ cửa hàng quét QR mới đổi
     * trạng thái thật. App dò định kỳ trạng thái đơn để phản ánh đúng, không có
     * nút "mô phỏng quét thành công" (rule 0.1: không fake success).
     */
    private fun startStatusPolling(orderId: String) {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (!_uiState.value.isPickedUp) {
                delay(6000L)
                val result = orderRepository.getOrderStatus(orderId)
                result.onSuccess { status ->
                    if (status == "PICKED_UP") {
                        _uiState.value = _uiState.value.copy(isPickedUp = true)
                    }
                }
                // Lỗi mạng khi poll không hiển thị lỗi chặn màn hình - vé vẫn dùng được,
                // chỉ thử lại ở vòng kế tiếp.
            }
        }
    }

    fun notifyArriving(orderId: String) {
        if (_uiState.value.hasNotifiedArrival) return
        viewModelScope.launch {
            val result = orderRepository.notifyArriving(orderId)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(hasNotifiedArrival = true)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        errorMessage = err.message ?: "Không thể báo sắp đến, vui lòng thử lại."
                    )
                }
            )
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
    }
}
