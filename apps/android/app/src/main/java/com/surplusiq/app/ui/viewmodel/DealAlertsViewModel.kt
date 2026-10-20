package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.DealAlert
import com.surplusiq.app.domain.model.DealAlertCriteria
import com.surplusiq.app.domain.model.StoreOption
import com.surplusiq.app.domain.repository.DiscoveryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DealAlertsUiState(
    val alerts: List<DealAlert> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isSaving: Boolean = false,
    val storeOptions: List<StoreOption> = emptyList(),
    val isSearchingStores: Boolean = false,
    val message: String? = null
)

/** K19 Danh sách cảnh báo deal, K20 Tạo hoặc sửa cảnh báo. */
@HiltViewModel
class DealAlertsViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(DealAlertsUiState())
    val uiState: StateFlow<DealAlertsUiState> = _uiState.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            discoveryRepository.getDealAlerts().fold(
                onSuccess = { list -> _uiState.update { it.copy(isLoading = false, alerts = list) } },
                onFailure = { e -> _uiState.update { it.copy(isLoading = false, errorMessage = e.message) } }
            )
        }
    }

    fun setActive(alert: DealAlert, active: Boolean) {
        viewModelScope.launch {
            discoveryRepository.saveDealAlert(alert.id, alert.criteria, active).fold(
                onSuccess = { updated -> replace(updated) },
                // Backend chặn bật quá 10 cảnh báo: báo lỗi thật, giữ nguyên trạng thái cũ.
                onFailure = { e -> _uiState.update { it.copy(message = e.message) } }
            )
        }
    }

    fun delete(alert: DealAlert) {
        _uiState.update { it.copy(alerts = it.alerts - alert) }
        viewModelScope.launch {
            discoveryRepository.deleteDealAlert(alert.id).fold(
                onSuccess = { _uiState.update { it.copy(message = "Đã xóa cảnh báo.") } },
                onFailure = { e -> _uiState.update { it.copy(alerts = it.alerts + alert, message = e.message) } }
            )
        }
    }

    /** id null = tạo mới. */
    fun save(id: String?, criteria: DealAlertCriteria, isActive: Boolean, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true) }
            discoveryRepository.saveDealAlert(id, criteria, isActive).fold(
                onSuccess = { saved ->
                    if (id == null) _uiState.update { it.copy(alerts = listOf(saved) + it.alerts) } else replace(saved)
                    _uiState.update { it.copy(isSaving = false, message = "Đã lưu cảnh báo.") }
                    onSuccess()
                },
                onFailure = { e -> _uiState.update { it.copy(isSaving = false, message = e.message) } }
            )
        }
    }

    fun searchStores(query: String) {
        if (query.isBlank()) {
            _uiState.update { it.copy(storeOptions = emptyList()) }
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isSearchingStores = true) }
            discoveryRepository.searchStores(query.trim()).fold(
                onSuccess = { list -> _uiState.update { it.copy(isSearchingStores = false, storeOptions = list) } },
                onFailure = { e -> _uiState.update { it.copy(isSearchingStores = false, message = e.message) } }
            )
        }
    }

    fun consumeMessage() = _uiState.update { it.copy(message = null) }

    private fun replace(alert: DealAlert) {
        _uiState.update { state -> state.copy(alerts = state.alerts.map { if (it.id == alert.id) alert else it }) }
    }
}
