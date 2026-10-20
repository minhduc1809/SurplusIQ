package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.RescuePool
import com.surplusiq.app.domain.repository.RescuePoolRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RescuePoolUiState(
    val pools: List<RescuePool> = emptyList(),
    val isListLoading: Boolean = false,
    val listError: String? = null,
    val selectedPool: RescuePool? = null,
    val isDetailLoading: Boolean = false,
    val detailError: String? = null,
    val isSubmitting: Boolean = false,
    val actionMessage: String? = null,
    val actionError: String? = null,
    /** Mã đơn thật vừa tạo từ đề nghị - chỉ có sau khi khách chủ động xác nhận mua. */
    val createdOrderCode: String? = null
)

/** Mọi trạng thái hiển thị đều nạp lại từ server sau thao tác - không tự suy diễn ở client. */
@HiltViewModel
class RescuePoolViewModel @Inject constructor(
    private val repository: RescuePoolRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RescuePoolUiState())
    val uiState: StateFlow<RescuePoolUiState> = _uiState.asStateFlow()

    fun loadPools(serviceArea: String? = null) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isListLoading = true, listError = null)
            repository.listPools(serviceArea).fold(
                onSuccess = { _uiState.value = _uiState.value.copy(pools = it, isListLoading = false) },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        isListLoading = false,
                        listError = it.message ?: "Không tải được danh sách đợt"
                    )
                }
            )
        }
    }

    fun openPool(poolId: String) {
        _uiState.value = _uiState.value.copy(
            selectedPool = _uiState.value.pools.find { it.id == poolId },
            actionMessage = null,
            actionError = null,
            createdOrderCode = null
        )
        refreshPool(poolId)
    }

    fun refreshPool(poolId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isDetailLoading = true, detailError = null)
            repository.getPool(poolId).fold(
                onSuccess = { _uiState.value = _uiState.value.copy(selectedPool = it, isDetailLoading = false) },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        isDetailLoading = false,
                        detailError = it.message ?: "Không tải được đợt"
                    )
                }
            )
        }
    }

    fun register(poolId: String, quantity: Int, budgetMax: Int?, pickupStart: String?, pickupEnd: String?) =
        submit(poolId, "Đã ghi nhận nhu cầu. Đây KHÔNG phải đơn hàng - bạn chưa bị thu tiền.") {
            repository.register(poolId, quantity, budgetMax, pickupStart, pickupEnd)
        }

    fun updateRegistration(poolId: String, quantity: Int, budgetMax: Int?, pickupStart: String?, pickupEnd: String?) =
        submit(poolId, "Đã cập nhật nhu cầu.") {
            repository.updateRegistration(poolId, quantity, budgetMax, pickupStart, pickupEnd)
        }

    fun withdraw(poolId: String, reason: String) =
        submit(poolId, "Đã rút nhu cầu.") { repository.withdraw(poolId, reason) }

    /** Khách chủ động xác nhận; gửi kèm phiên bản đề nghị đang xem để server chặn nếu điều kiện đã đổi. */
    fun confirmOffer(poolId: String, offerVersion: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, actionError = null, actionMessage = null)
            repository.confirmOffer(poolId, offerVersion).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        actionMessage = it.message,
                        createdOrderCode = it.orderCode
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        actionError = it.message ?: "Không xác nhận được đề nghị"
                    )
                }
            )
            // Luôn nạp lại: nếu đề nghị đổi/hết hạn, khách thấy điều kiện mới nhất trước khi thử lại.
            refreshPool(poolId)
        }
    }

    private fun submit(poolId: String, successMessage: String, action: suspend () -> Result<RescuePool>) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true, actionError = null, actionMessage = null)
            action().fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        selectedPool = it,
                        actionMessage = successMessage
                    )
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        actionError = it.message ?: "Thao tác thất bại"
                    )
                    refreshPool(poolId)
                }
            )
        }
    }
}
