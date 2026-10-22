package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.CompareDeal
import com.surplusiq.app.domain.model.SavedDealItem
import com.surplusiq.app.domain.repository.DiscoveryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SavedDealsUiState(
    // K17 Deal đã lưu và đã xem
    val savedDeals: List<SavedDealItem> = emptyList(),
    val isSavedLoading: Boolean = false,
    val savedError: String? = null,
    val viewHistory: List<SavedDealItem> = emptyList(),
    val isHistoryLoading: Boolean = false,
    val historyError: String? = null,
    // K16 So sánh deal
    val compareDeals: List<CompareDeal> = emptyList(),
    val isCompareLoading: Boolean = false,
    val compareError: String? = null,
    val message: String? = null
) {
    val savedIds: Set<String> get() = savedDeals.map { it.offerId }.toSet()
}

@HiltViewModel
class SavedDealsViewModel @Inject constructor(
    private val discoveryRepository: DiscoveryRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SavedDealsUiState())
    val uiState: StateFlow<SavedDealsUiState> = _uiState.asStateFlow()

    fun loadSaved() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSavedLoading = true, savedError = null) }
            discoveryRepository.getSavedDeals().fold(
                onSuccess = { list -> _uiState.update { it.copy(isSavedLoading = false, savedDeals = list) } },
                onFailure = { e -> _uiState.update { it.copy(isSavedLoading = false, savedError = e.message) } }
            )
        }
    }

    fun loadHistory() {
        viewModelScope.launch {
            _uiState.update { it.copy(isHistoryLoading = true, historyError = null) }
            discoveryRepository.getViewHistory().fold(
                onSuccess = { list -> _uiState.update { it.copy(isHistoryLoading = false, viewHistory = list) } },
                onFailure = { e -> _uiState.update { it.copy(isHistoryLoading = false, historyError = e.message) } }
            )
        }
    }

    /** Lưu/bỏ lưu deal (nút bookmark ở chi tiết deal, vuốt để bỏ lưu ở K17). */
    fun setSaved(dealId: String, saved: Boolean) {
        viewModelScope.launch {
            discoveryRepository.setDealSaved(dealId, saved).fold(
                onSuccess = {
                    _uiState.update { it.copy(message = if (saved) "Đã lưu suất để xem sau." else "Đã bỏ lưu suất.") }
                    loadSaved()
                },
                onFailure = { e -> _uiState.update { it.copy(message = e.message) } }
            )
        }
    }

    fun compare(dealIds: List<String>) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCompareLoading = true, compareError = null, compareDeals = emptyList()) }
            discoveryRepository.compareDeals(dealIds).fold(
                onSuccess = { list -> _uiState.update { it.copy(isCompareLoading = false, compareDeals = list) } },
                onFailure = { e -> _uiState.update { it.copy(isCompareLoading = false, compareError = e.message) } }
            )
        }
    }

    fun consumeMessage() = _uiState.update { it.copy(message = null) }
}
