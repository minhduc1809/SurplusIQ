package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.data.remote.dto.ReviewResponse
import com.surplusiq.app.domain.repository.InteractionsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InteractionsUiState(
    val complaints: List<ComplaintResponse> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val lastSubmittedReview: ReviewResponse? = null,
    val lastSubmittedComplaint: ComplaintResponse? = null
)

@HiltViewModel
class InteractionsViewModel @Inject constructor(
    val interactionsRepository: InteractionsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(InteractionsUiState())
    val uiState: StateFlow<InteractionsUiState> = _uiState.asStateFlow()

    fun loadComplaints() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = interactionsRepository.getComplaints()
            result.fold(
                onSuccess = { list ->
                    _uiState.value = _uiState.value.copy(
                        complaints = list,
                        isLoading = false
                    )
                },
                onFailure = { err ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = err.localizedMessage ?: "Không thể tải danh sách khiếu nại"
                    )
                }
            )
        }
    }
}
