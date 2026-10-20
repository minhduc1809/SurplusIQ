package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.RewardHistoryEntry
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
    val redeemMessage: String? = null
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

    fun redeem(points: Int, redemptionId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRedeeming = true, redeemMessage = null)
            val result = rewardsRepository.redeem(points, redemptionId)
            result.fold(
                onSuccess = { balance ->
                    _uiState.value = _uiState.value.copy(
                        pointsBalance = balance.pointsBalance,
                        isRedeeming = false,
                        redeemMessage = "Đổi điểm thành công!"
                    )
                    load()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isRedeeming = false,
                        redeemMessage = error.localizedMessage ?: "Đổi điểm thất bại"
                    )
                }
            )
        }
    }
}
