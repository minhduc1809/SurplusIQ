package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.data.remote.dto.OrderReceiptDto
import com.surplusiq.app.data.remote.dto.ProxyCodeResponse
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.OrderStatus
import com.surplusiq.app.domain.repository.DiscoveryRepository
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
    val errorMessage: String? = null,
    val proxyCode: ProxyCodeResponse? = null,
    val isProxyCodeLoading: Boolean = false,
    val proxyCodeError: String? = null,
    // K30 Hủy đơn (R1-043)
    val cancelDeadlineMillis: Long? = null,
    val isCancelDeadlineLoading: Boolean = false,
    val isCancelling: Boolean = false,
    val cancelError: String? = null,
    val cancelledOrderId: String? = null,
    // K31 Biên nhận (R1-054)
    val receipt: OrderReceiptDto? = null,
    val isReceiptLoading: Boolean = false,
    val receiptError: String? = null,
    // K32 Đặt lại (R1-051): reorderChecked && reorderDeal == null -> chưa có suất mở
    val reorderDeal: Deal? = null,
    val isReorderLoading: Boolean = false,
    val reorderError: String? = null,
    val reorderChecked: Boolean = false,
    // KX02: Đính kèm biên lai chuyển khoản
    val isAttachingProof: Boolean = false,
    val attachProofError: String? = null,
    val attachProofSuccess: Boolean = false,
    // KX04: Gia hạn giờ nhận hàng
    val isUpdatingPickupSlot: Boolean = false,
    val updatePickupSlotError: String? = null,
    val updatePickupSlotSuccess: Boolean = false
)

@HiltViewModel
class MyOrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository,
    private val discoveryRepository: DiscoveryRepository,
    private val mediaRepository: com.surplusiq.app.domain.repository.MediaRepository
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

    /** Mở màn xác nhận hủy: lấy hạn hủy thật từ server (K30). */
    fun prepareCancel(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isCancelDeadlineLoading = true,
                cancelDeadlineMillis = null,
                cancelError = null,
                cancelledOrderId = null
            )
            val result = orderRepository.getCancelDeadlineMillis(orderId)
            _uiState.value = _uiState.value.copy(
                isCancelDeadlineLoading = false,
                cancelDeadlineMillis = result.getOrNull(),
                cancelError = result.exceptionOrNull()?.localizedMessage
            )
        }
    }

    fun confirmCancel(orderId: String, reason: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isCancelling = true, cancelError = null)
            orderRepository.cancelHold(orderId, reason).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isCancelling = false, cancelledOrderId = orderId)
                    loadOrders()
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isCancelling = false,
                        cancelError = err.localizedMessage ?: "Không thể hủy đơn hàng"
                    )
                }
            )
        }
    }

    fun loadReceipt(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isReceiptLoading = true, receiptError = null, receipt = null)
            orderRepository.getOrderReceipt(orderId).fold(
                onSuccess = { _uiState.value = _uiState.value.copy(receipt = it, isReceiptLoading = false) },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isReceiptLoading = false,
                        receiptError = err.localizedMessage ?: "Không thể tải biên nhận"
                    )
                }
            )
        }
    }

    /** Tìm suất đang mở cùng món qua backend, rồi lấy chi tiết deal để vào luồng xác nhận đặt. */
    fun checkReorder(oldOrderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isReorderLoading = true,
                reorderError = null,
                reorderDeal = null,
                reorderChecked = false
            )
            val offer = orderRepository.reorder(oldOrderId).getOrElse { err ->
                _uiState.value = _uiState.value.copy(
                    isReorderLoading = false,
                    reorderError = err.localizedMessage ?: "Không thể kiểm tra suất đang mở"
                )
                return@launch
            }
            if (offer == null) {
                _uiState.value = _uiState.value.copy(isReorderLoading = false, reorderChecked = true)
                return@launch
            }
            discoveryRepository.getDealDetail(offer.offerId).fold(
                onSuccess = { deal ->
                    _uiState.value = _uiState.value.copy(
                        isReorderLoading = false,
                        reorderChecked = true,
                        reorderDeal = deal
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isReorderLoading = false,
                        reorderError = err.localizedMessage ?: "Không thể tải suất đang mở"
                    )
                }
            )
        }
    }

    fun loadProxyCode(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isProxyCodeLoading = true, proxyCodeError = null)
            val result = orderRepository.getProxyCode(orderId)
            result.fold(
                onSuccess = { code ->
                    _uiState.value = _uiState.value.copy(proxyCode = code, isProxyCodeLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isProxyCodeLoading = false,
                        proxyCodeError = err.localizedMessage ?: "Không thể tải mã nhận hộ"
                    )
                }
            )
        }
    }

    fun createProxyCode(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isProxyCodeLoading = true, proxyCodeError = null)
            val result = orderRepository.createProxyCode(orderId)
            result.fold(
                onSuccess = { code ->
                    _uiState.value = _uiState.value.copy(proxyCode = code, isProxyCodeLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isProxyCodeLoading = false,
                        proxyCodeError = err.localizedMessage ?: "Không thể tạo mã nhận hộ"
                    )
                }
            )
        }
    }

    fun revokeProxyCode(orderId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isProxyCodeLoading = true, proxyCodeError = null)
            val result = orderRepository.revokeProxyCode(orderId)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(proxyCode = null, isProxyCodeLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isProxyCodeLoading = false,
                        proxyCodeError = err.localizedMessage ?: "Không thể thu hồi mã nhận hộ"
                    )
                }
            )
        }
    }

    /**
     * KX02: Đính kèm biên lai chuyển khoản khi ngân hàng chậm webhook
     */
    /** KX02: tải ảnh biên lai lên hệ thống rồi gắn vào đơn; máy chủ chỉ nhận ảnh đã tải lên qua hệ thống. */
    fun attachPaymentProofImage(orderId: String, bytes: ByteArray, fileName: String, mimeType: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAttachingProof = true, attachProofError = null, attachProofSuccess = false)
            mediaRepository.uploadImageBytes(bytes, fileName, mimeType).fold(
                onSuccess = { url -> attachPaymentProof(orderId, url) },
                onFailure = { _uiState.value = _uiState.value.copy(isAttachingProof = false, attachProofError = it.localizedMessage ?: "Không tải được ảnh biên lai") }
            )
        }
    }

    fun attachPaymentProof(orderId: String, proofUrl: String, onComplete: (Boolean, String?) -> Unit = { _, _ -> }) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isAttachingProof = true,
                attachProofError = null,
                attachProofSuccess = false
            )
            val result = orderRepository.attachPaymentProof(orderId, proofUrl)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isAttachingProof = false,
                        attachProofSuccess = true
                    )
                    loadOrders()
                    onComplete(true, null)
                },
                onFailure = { err ->
                    val errorMsg = err.localizedMessage ?: "Không thể gửi biên lai thanh toán"
                    _uiState.value = _uiState.value.copy(
                        isAttachingProof = false,
                        attachProofError = errorMsg
                    )
                    onComplete(false, errorMsg)
                }
            )
        }
    }

    /**
     * KX04: Gia hạn giờ nhận hàng (+15 phút, +30 phút)
     */
    fun updatePickupSlot(orderId: String, newSlotIso: String, onComplete: (Boolean, String?) -> Unit = { _, _ -> }) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isUpdatingPickupSlot = true,
                updatePickupSlotError = null,
                updatePickupSlotSuccess = false
            )
            val result = orderRepository.updatePickupSlot(orderId, newSlotIso)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isUpdatingPickupSlot = false,
                        updatePickupSlotSuccess = true
                    )
                    loadOrders()
                    onComplete(true, null)
                },
                onFailure = { err ->
                    val errorMsg = err.localizedMessage ?: "Không thể gia hạn giờ nhận hàng"
                    _uiState.value = _uiState.value.copy(
                        isUpdatingPickupSlot = false,
                        updatePickupSlotError = errorMsg
                    )
                    onComplete(false, errorMsg)
                }
            )
        }
    }

    fun resetActionStates() {
        _uiState.value = _uiState.value.copy(
            attachProofSuccess = false,
            attachProofError = null,
            updatePickupSlotSuccess = false,
            updatePickupSlotError = null
        )
    }
}
