package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.RewardCatalog
import com.surplusiq.app.domain.model.RewardHistoryEntry
import com.surplusiq.app.domain.model.RewardRuleSection
import com.surplusiq.app.domain.repository.RewardsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RewardsUiState(
    val pointsBalance: Int = 0,
    val history: List<RewardHistoryEntry> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isRedeeming: Boolean = false,
    val redeemMessage: String? = null,
    // KC13: danh mục đổi điểm; KC14: quy tắc chương trình
    val catalog: RewardCatalog? = null,
    val catalogError: String? = null,
    val rules: List<RewardRuleSection> = emptyList(),
    val rulesError: String? = null
)

@HiltViewModel
class RewardsViewModel @Inject constructor(
    private val rewardsRepository: RewardsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RewardsUiState(isLoading = true))
    val uiState: StateFlow<RewardsUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val balanceResult = rewardsRepository.getBalance()
            val historyResult = rewardsRepository.getHistory()

            val balance = balanceResult.getOrNull()
            val history = historyResult.getOrNull()
            if (balance != null) {
                _uiState.value = _uiState.value.copy(
                    pointsBalance = balance.pointsBalance,
                    history = history ?: _uiState.value.history,
                    isLoading = false
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = balanceResult.exceptionOrNull()?.localizedMessage
                        ?: "Không thể tải Rescue Rewards"
                )
            }
        }
    }

    fun loadCatalog() {
        viewModelScope.launch {
            rewardsRepository.getCatalog().fold(
                onSuccess = { _uiState.value = _uiState.value.copy(catalog = it, catalogError = null) },
                onFailure = { _uiState.value = _uiState.value.copy(catalogError = it.localizedMessage ?: "Không thể tải danh mục đổi điểm") }
            )
        }
    }

    fun loadRules() {
        viewModelScope.launch {
            rewardsRepository.getRules().fold(
                onSuccess = { _uiState.value = _uiState.value.copy(rules = it, rulesError = null) },
                onFailure = { _uiState.value = _uiState.value.copy(rulesError = it.localizedMessage ?: "Không thể tải quy tắc") }
            )
        }
    }

    fun redeem(redemptionId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRedeeming = true, redeemMessage = null)
            rewardsRepository.redeem(redemptionId).fold(
                onSuccess = { result ->
                    _uiState.value = _uiState.value.copy(
                        pointsBalance = result.pointsBalance,
                        isRedeeming = false,
                        redeemMessage = "Đổi điểm thành công. ${result.voucherName ?: "Voucher"} đã có trong Ví ưu đãi."
                    )
                    load()
                    loadCatalog()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isRedeeming = false,
                        redeemMessage = error.localizedMessage ?: "Đổi điểm thất bại"
                    )
                    loadCatalog()
                }
            )
        }
    }
}
