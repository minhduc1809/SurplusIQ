package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.repository.OrderRepository
import com.surplusiq.app.domain.repository.PickupPassInfo
import com.surplusiq.app.domain.repository.PickupRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PickupPassUiState(
    val passInfo: PickupPassInfo? = null,
    val hasNotifiedArrival: Boolean = false,
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

    fun loadPickupPass(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = pickupRepository.getPickupPass(orderId)
            result.fold(
                onSuccess = { info ->
                    _uiState.value = _uiState.value.copy(passInfo = info, isLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Không thể tải vé nhận hàng"
                    )
                }
            )
        }
    }

    fun notifyArriving(orderId: String) {
        viewModelScope.launch {
            val result = orderRepository.notifyArriving(orderId)
            result.onSuccess {
                _uiState.value = _uiState.value.copy(hasNotifiedArrival = true)
            }
        }
    }
}
