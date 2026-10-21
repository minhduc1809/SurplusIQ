package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.data.remote.dto.*
import com.surplusiq.app.data.repository.OrderSupportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OrderSupportUiState(
    val tracking: OrderTrackingDto? = null,
    val trackingError: String? = null,
    val incidents: List<IncidentDto> = emptyList(),
    val incidentsLoaded: Boolean = false,
    val incidentsError: String? = null,
    val chat: ChatThreadDto? = null,
    val chatError: String? = null,
    val swap: SwapOptionsDto? = null,
    val swapError: String? = null,
    val gifts: GiftsDto? = null,
    val giftsError: String? = null,
    val isLoading: Boolean = false,
    val isBusy: Boolean = false,
    /** Thông báo kết quả thao tác (thành công hoặc lỗi nguyên văn từ máy chủ). */
    val message: String? = null,
    /** Tăng mỗi khi một thao tác thành công để màn hình quay lại. */
    val doneCounter: Int = 0
)

/** KX12 theo dõi đơn, KX03 sự cố, KX11 trò chuyện, KX05 đổi suất, KX18 tặng suất; mọi dữ liệu lấy từ máy chủ. */
@HiltViewModel
class OrderSupportViewModel @Inject constructor(
    private val repository: OrderSupportRepository
) : ViewModel() {

    private val _state = MutableStateFlow(OrderSupportUiState())
    val state: StateFlow<OrderSupportUiState> = _state.asStateFlow()

    private fun update(block: OrderSupportUiState.() -> OrderSupportUiState) {
        _state.value = _state.value.block()
    }

    fun clear() = update { OrderSupportUiState(gifts = gifts) }
    fun consumeMessage() = update { copy(message = null) }

    fun loadTracking(orderId: String) {
        viewModelScope.launch {
            repository.tracking(orderId).fold(
                onSuccess = { update { copy(tracking = it, trackingError = null) } },
                onFailure = { update { copy(trackingError = it.localizedMessage) } }
            )
        }
    }

    fun loadIncidents(orderId: String) {
        viewModelScope.launch {
            repository.incidents(orderId).fold(
                onSuccess = { update { copy(incidents = it, incidentsLoaded = true, incidentsError = null) } },
                onFailure = { update { copy(incidentsLoaded = true, incidentsError = it.localizedMessage) } }
            )
        }
    }

    fun reportIncident(orderId: String, type: String, note: String) {
        viewModelScope.launch {
            update { copy(isBusy = true, message = null) }
            repository.createIncident(orderId, type, note).fold(
                onSuccess = { update { copy(isBusy = false, message = "Đã gửi báo sự cố. Cửa hàng sẽ phản hồi sớm.") }; loadIncidents(orderId) },
                onFailure = { update { copy(isBusy = false, message = it.localizedMessage) } }
            )
        }
    }

    fun loadChat(orderId: String) {
        viewModelScope.launch {
            repository.messages(orderId).fold(
                onSuccess = { update { copy(chat = it, chatError = null) } },
                onFailure = { update { copy(chatError = it.localizedMessage) } }
            )
        }
    }

    fun sendChat(orderId: String, body: String) {
        viewModelScope.launch {
            update { copy(isBusy = true, message = null) }
            repository.sendMessage(orderId, body).fold(
                onSuccess = { update { copy(isBusy = false) }; loadChat(orderId) },
                onFailure = { update { copy(isBusy = false, message = it.localizedMessage) } }
            )
        }
    }

    fun loadSwap(orderId: String) {
        viewModelScope.launch {
            update { copy(isLoading = true, swapError = null) }
            repository.swapOptions(orderId).fold(
                onSuccess = { update { copy(isLoading = false, swap = it) } },
                onFailure = { update { copy(isLoading = false, swapError = it.localizedMessage) } }
            )
        }
    }

    fun swap(orderId: String, offerId: String) {
        viewModelScope.launch {
            update { copy(isBusy = true, message = null) }
            repository.swap(orderId, offerId).fold(
                onSuccess = { update { copy(isBusy = false, message = "Đã đổi suất thành công.", doneCounter = doneCounter + 1) } },
                onFailure = { update { copy(isBusy = false, message = it.localizedMessage) } }
            )
        }
    }

    fun sendGift(orderId: String, recipient: String, message: String) {
        viewModelScope.launch {
            update { copy(isBusy = true, message = null) }
            repository.gift(orderId, recipient, message).fold(
                onSuccess = { update { copy(isBusy = false, message = "Đã gửi lời tặng. Suất chuyển cho người nhận khi họ chấp nhận.", doneCounter = doneCounter + 1) } },
                onFailure = { update { copy(isBusy = false, message = it.localizedMessage) } }
            )
        }
    }

    fun loadGifts() {
        viewModelScope.launch {
            update { copy(isLoading = true, giftsError = null) }
            repository.gifts().fold(
                onSuccess = { update { copy(isLoading = false, gifts = it) } },
                onFailure = { update { copy(isLoading = false, giftsError = it.localizedMessage) } }
            )
        }
    }

    fun respondGift(id: String, action: String) {
        viewModelScope.launch {
            update { copy(isBusy = true, message = null) }
            repository.respondGift(id, action).fold(
                onSuccess = {
                    val text = when (action) { "ACCEPT" -> "Đã nhận suất. Xem trong Đơn của tôi."; "DECLINE" -> "Đã từ chối lời tặng."; else -> "Đã thu hồi lời tặng." }
                    update { copy(isBusy = false, message = text) }
                    loadGifts()
                },
                onFailure = { update { copy(isBusy = false, message = it.localizedMessage) } }
            )
        }
    }
}
