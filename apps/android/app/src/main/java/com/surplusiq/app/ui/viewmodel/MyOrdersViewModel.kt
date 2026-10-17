package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.OrderStatus
import com.surplusiq.app.domain.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MyOrdersUiState(
    val activeOrders: List<ActiveOrder> = emptyList(),
    val pastOrders: List<ActiveOrder> = emptyList(),
    val selectedTab: Int = 0, // 0: Đang mở, 1: Lịch sử
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class MyOrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MyOrdersUiState(isLoading = true))
    val uiState: StateFlow<MyOrdersUiState> = _uiState.asStateFlow()

    init {
        loadOrders()
    }

    fun loadOrders() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = orderRepository.getActiveOrders()
            result.fold(
                onSuccess = { allOrders ->
                    val active = allOrders.filter {
                        it.status == OrderStatus.PENDING_PAYMENT || it.status == OrderStatus.PAID_WAITING_PICKUP
                    }
                    val past = allOrders.filter {
                        it.status == OrderStatus.PICKED_UP || it.status == OrderStatus.CANCELLED || it.status == OrderStatus.EXPIRED
                    }
                    _uiState.value = _uiState.value.copy(
                        activeOrders = active,
                        pastOrders = past,
                        isLoading = false
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Không thể tải danh sách đơn hàng"
                    )
                }
            )
        }
    }

    fun selectTab(tabIndex: Int) {
        _uiState.value = _uiState.value.copy(selectedTab = tabIndex)
    }

    fun cancelOrder(orderId: String) {
        viewModelScope.launch {
            orderRepository.cancelHold(orderId, "Khách hủy chủ động")
            loadOrders()
        }
    }
}
