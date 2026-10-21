package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.LoginSession
import com.surplusiq.app.domain.model.TwoFactorStatus
import com.surplusiq.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SecurityUiState(
    val twoFactor: TwoFactorStatus? = null,
    val sessions: List<LoginSession> = emptyList(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val message: String? = null
)

/** K55 Xác thực hai bước và K56 Thiết bị đăng nhập: mọi dữ liệu lấy từ máy chủ, lỗi hiển thị nguyên văn. */
@HiltViewModel
class SecurityViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SecurityUiState())
    val uiState: StateFlow<SecurityUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val status = authRepository.getTwoFactorStatus()
            val sessions = authRepository.getSessions()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                twoFactor = status.getOrNull() ?: _uiState.value.twoFactor,
                sessions = sessions.getOrNull() ?: _uiState.value.sessions,
                errorMessage = status.exceptionOrNull()?.localizedMessage ?: sessions.exceptionOrNull()?.localizedMessage
            )
        }
    }

    /** Bật hoặc tắt 2FA: máy chủ bắt buộc nhập lại mật khẩu hiện tại. */
    fun setTwoFactor(enabled: Boolean, password: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, message = null)
            authRepository.setTwoFactor(enabled, password).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isSaving = false,
                        message = if (enabled) "Đã bật xác thực 2 bước." else "Đã tắt xác thực 2 bước."
                    )
                    load()
                },
                onFailure = { _uiState.value = _uiState.value.copy(isSaving = false, message = it.localizedMessage ?: "Không cập nhật được.") }
            )
        }
    }

    fun revokeSession(sessionId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSaving = true, message = null)
            authRepository.revokeSession(sessionId).fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isSaving = false, message = "Đã đăng xuất thiết bị.")
                    load()
                },
                onFailure = { _uiState.value = _uiState.value.copy(isSaving = false, message = it.localizedMessage ?: "Không thu hồi được.") }
            )
        }
    }

    fun consumeMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }
}
