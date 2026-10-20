package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.data.remote.dto.PromotionWalletItemDto
import com.surplusiq.app.domain.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/** Ví ưu đãi thật (R1-078, R1-079) - dùng chung cho sheet "Chọn ưu đãi" (K23) và màn Ví ưu đãi (K47). */
data class PromotionWalletUiState(
    val items: List<PromotionWalletItemDto> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isClaiming: Boolean = false,
    val claimError: String? = null,
    val lastClaimedId: String? = null
)

@HiltViewModel
class PromotionWalletViewModel @Inject constructor(
    private val profileRepository: ProfileRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PromotionWalletUiState())
    val uiState: StateFlow<PromotionWalletUiState> = _uiState.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            profileRepository.getPromotionWallet().fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(items = list, isLoading = false)
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Không thể tải ví ưu đãi"
                    )
                }
            )
        }
    }

    /** Backend nhận diện ưu đãi theo ID promotion (không có mã chữ riêng). */
    fun claim(promotionId: String) {
        val id = promotionId.trim()
        if (id.isEmpty()) {
            _uiState.value = _uiState.value.copy(claimError = "Vui lòng nhập mã ưu đãi.")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isClaiming = true, claimError = null, lastClaimedId = null)
            profileRepository.claimPromotion(id).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isClaiming = false, lastClaimedId = id)
                    load()
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isClaiming = false,
                        claimError = err.localizedMessage ?: "Không thể thu thập ưu đãi"
                    )
                }
            )
        }
    }
}
