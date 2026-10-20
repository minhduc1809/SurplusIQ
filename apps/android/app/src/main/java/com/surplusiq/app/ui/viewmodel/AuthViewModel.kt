package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val phone: String = "",
    val password: String = "",
    val fullName: String = "",
    val otp: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isOtpSent: Boolean = false,
    val otpSecondsRemaining: Int = 300, // 5 minutes per BR-002
    val isLoggedIn: Boolean = false,
    val isGuestMode: Boolean = false,
    // Quên mật khẩu (R1-008)
    val forgotTarget: String = "",
    val isForgotCodeSent: Boolean = false,
    val resetOtp: String = "",
    val newPassword: String = "",
    val confirmNewPassword: String = "",
    val isPasswordResetSuccess: Boolean = false,
    // Đổi mật khẩu từ Hồ sơ (Profile)
    val currentPassword: String = "",
    val newChangePassword: String = "",
    val confirmChangePassword: String = "",
    val isChangePasswordSuccess: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState(isLoggedIn = authRepository.isLoggedIn()))
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private var otpTimerJob: Job? = null

    fun onPhoneChanged(newPhone: String) {
        _uiState.value = _uiState.value.copy(phone = newPhone, errorMessage = null)
    }

    fun onPasswordChanged(newPassword: String) {
        _uiState.value = _uiState.value.copy(password = newPassword, errorMessage = null)
    }

    fun onFullNameChanged(newName: String) {
        _uiState.value = _uiState.value.copy(fullName = newName, errorMessage = null)
    }

    fun onOtpChanged(newOtp: String) {
        if (newOtp.length <= 6 && newOtp.all { it.isDigit() }) {
            _uiState.value = _uiState.value.copy(otp = newOtp, errorMessage = null)
            if (newOtp.length == 6) {
                verifyOtp()
            }
        }
    }

    fun login() {
        val state = _uiState.value
        if (state.phone.isBlank() || state.password.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.login(state.phone.trim(), state.password)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isLoggedIn = true,
                        isGuestMode = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Đăng nhập thất bại"
                    )
                }
            )
        }
    }

    fun onGoogleSignInFailed(message: String) {
        _uiState.value = _uiState.value.copy(isLoading = false, errorMessage = message)
    }

    fun loginWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.loginWithGoogle(idToken)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isLoggedIn = true,
                        isGuestMode = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Đăng nhập Google thất bại"
                    )
                }
            )
        }
    }

    fun register() {
        val state = _uiState.value
        if (state.phone.isBlank() || state.password.isBlank() || state.fullName.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Vui lòng điền đầy đủ thông tin Họ tên, SĐT và Mật khẩu")
            return
        }
        if (weakPassword(state.password)) {
            _uiState.value = state.copy(errorMessage = "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.register(state.phone.trim(), state.password, state.fullName.trim())
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isOtpSent = true,
                        otpSecondsRemaining = 300
                    )
                    startOtpTimer()
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Đăng ký không thành công"
                    )
                }
            )
        }
    }

    fun verifyOtp() {
        val state = _uiState.value
        if (state.otp.length < 6) {
            _uiState.value = state.copy(errorMessage = "Mã OTP phải gồm 6 chữ số")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.verifyOtp(state.phone.trim(), state.otp.trim())
            result.fold(
                onSuccess = {
                    otpTimerJob?.cancel()
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isLoggedIn = true,
                        isOtpSent = false,
                        isGuestMode = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Mã OTP không hợp lệ hoặc đã hết hạn"
                    )
                }
            )
        }
    }

    fun resendOtp() {
        val state = _uiState.value
        if (state.otpSecondsRemaining > 0) return

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.resendOtp(state.phone.trim())
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        otpSecondsRemaining = 300,
                        otp = ""
                    )
                    startOtpTimer()
                },
                onFailure = {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = "Không thể gửi lại OTP, vui lòng thử lại sau"
                    )
                }
            )
        }
    }

    fun onForgotTargetChanged(value: String) {
        _uiState.value = _uiState.value.copy(forgotTarget = value, errorMessage = null)
    }

    fun onResetOtpChanged(value: String) {
        if (value.length <= 6 && value.all { it.isDigit() }) {
            _uiState.value = _uiState.value.copy(resetOtp = value, errorMessage = null)
        }
    }

    fun onNewPasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(newPassword = value, errorMessage = null)
    }

    fun onConfirmNewPasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(confirmNewPassword = value, errorMessage = null)
    }

    fun requestPasswordReset() {
        val state = _uiState.value
        if (state.forgotTarget.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Vui lòng nhập số điện thoại hoặc email.")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.forgotPassword(state.forgotTarget.trim())
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false, isForgotCodeSent = true)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Không gửi được mã xác thực."
                    )
                }
            )
        }
    }

    fun confirmPasswordReset() {
        val state = _uiState.value
        if (state.resetOtp.length < 6) {
            _uiState.value = state.copy(errorMessage = "Mã OTP phải gồm 6 chữ số.")
            return
        }
        if (weakPassword(state.newPassword)) {
            _uiState.value = state.copy(errorMessage = "Mật khẩu mới tối thiểu 8 ký tự, gồm cả chữ và số.")
            return
        }
        if (state.newPassword != state.confirmNewPassword) {
            _uiState.value = state.copy(errorMessage = "Mật khẩu nhập lại không khớp.")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.resetPassword(state.forgotTarget.trim(), state.resetOtp, state.newPassword)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(isLoading = false, isPasswordResetSuccess = true)
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Không đặt lại được mật khẩu."
                    )
                }
            )
        }
    }

    fun resetForgotPasswordFlow() {
        _uiState.value = _uiState.value.copy(
            forgotTarget = "",
            isForgotCodeSent = false,
            resetOtp = "",
            newPassword = "",
            confirmNewPassword = "",
            isPasswordResetSuccess = false,
            errorMessage = null
        )
    }

    fun onCurrentPasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(currentPassword = value, errorMessage = null)
    }

    fun onNewChangePasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(newChangePassword = value, errorMessage = null)
    }

    fun onConfirmChangePasswordChanged(value: String) {
        _uiState.value = _uiState.value.copy(confirmChangePassword = value, errorMessage = null)
    }

    fun changePassword() {
        val state = _uiState.value
        if (state.currentPassword.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Vui lòng nhập mật khẩu hiện tại.")
            return
        }
        if (weakPassword(state.newChangePassword)) {
            _uiState.value = state.copy(errorMessage = "Mật khẩu mới tối thiểu 8 ký tự, gồm cả chữ và số.")
            return
        }
        if (state.newChangePassword != state.confirmChangePassword) {
            _uiState.value = state.copy(errorMessage = "Mật khẩu nhập lại không khớp.")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = authRepository.changePassword(state.currentPassword, state.newChangePassword)
            result.fold(
                onSuccess = {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isChangePasswordSuccess = true,
                        currentPassword = "",
                        newChangePassword = "",
                        confirmChangePassword = ""
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.message ?: "Không đổi được mật khẩu."
                    )
                }
            )
        }
    }

    fun resetChangePasswordFlow() {
        _uiState.value = _uiState.value.copy(
            currentPassword = "",
            newChangePassword = "",
            confirmChangePassword = "",
            isChangePasswordSuccess = false,
            errorMessage = null
        )
    }

    fun continueAsGuest() {
        _uiState.value = _uiState.value.copy(isGuestMode = true, errorMessage = null)
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.value = AuthUiState(isLoggedIn = false, isGuestMode = false)
        }
    }

    private fun startOtpTimer() {
        otpTimerJob?.cancel()
        otpTimerJob = viewModelScope.launch {
            while (_uiState.value.otpSecondsRemaining > 0) {
                delay(1000L)
                val next = _uiState.value.otpSecondsRemaining - 1
                _uiState.value = _uiState.value.copy(otpSecondsRemaining = next)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        otpTimerJob?.cancel()
    }
}

private fun weakPassword(p: String) = p.length < 8 || p.none(Char::isLetter) || p.none(Char::isDigit)
