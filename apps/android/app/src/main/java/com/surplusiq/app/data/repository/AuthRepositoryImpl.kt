package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.SessionManager
import com.surplusiq.app.data.remote.api.AuthApiService
import com.surplusiq.app.data.remote.dto.ChangePasswordRequest
import com.surplusiq.app.data.remote.dto.CustomerLoginRequest
import com.surplusiq.app.data.remote.dto.CustomerRegisterRequest
import com.surplusiq.app.data.remote.dto.ForgotPasswordRequest
import com.surplusiq.app.data.remote.dto.GoogleLoginRequest
import com.surplusiq.app.data.remote.dto.ResendOtpRequest
import com.surplusiq.app.data.remote.dto.ResetPasswordRequest
import com.surplusiq.app.data.remote.dto.TwoFactorToggleRequest
import com.surplusiq.app.data.remote.dto.VerifyOtpRequest
import com.surplusiq.app.domain.model.LoginOutcome
import com.surplusiq.app.domain.model.LoginSession
import com.surplusiq.app.domain.model.TwoFactorStatus
import com.surplusiq.app.domain.repository.AuthRepository
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Nguyên tắc bắt buộc (rule 0.1): KHÔNG tự tạo "fake success" khi API lỗi/mất
 * mạng. Mọi exception trả Result.failure với lý do thật, để UI hiển thị lỗi +
 * thử lại - không âm thầm đăng nhập giả bằng JWT bịa.
 */
@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApiService: AuthApiService,
    private val sessionManager: SessionManager
) : AuthRepository {

    override suspend fun login(phone: String, password: String, otpCode: String?): Result<LoginOutcome> {
        return try {
            val response = authApiService.loginCustomer(
                CustomerLoginRequest(
                    identifier = phone,
                    phone = phone,
                    password = password,
                    deviceId = sessionManager.getDeviceId(),
                    otpCode = otpCode
                )
            )
            val body = response.body()
            when {
                response.isSuccessful && body?.twoFactorRequired == true ->
                    Result.success(LoginOutcome.TwoFactorRequired(body.target, body.message, body.otpPreview))
                response.isSuccessful && body?.accessToken != null && body.refreshToken != null -> {
                    sessionManager.saveSession(
                        accessToken = body.accessToken,
                        refreshToken = body.refreshToken,
                        userId = body.user?.id ?: "",
                        phone = phone,
                        fullName = body.user?.fullName ?: ""
                    )
                    Result.success(LoginOutcome.Success)
                }
                else -> Result.failure(
                    Exception(
                        extractErrorMessage(
                            response.errorBody()?.string(),
                            friendlyStatusMessage(response.code(), "Đăng nhập không thành công.")
                        )
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    override suspend fun loginWithGoogle(idToken: String): Result<Boolean> {
        return try {
            val response = authApiService.loginWithGoogle(
                GoogleLoginRequest(
                    idToken = idToken,
                    deviceId = sessionManager.getDeviceId()
                )
            )
            val body = response.body()
            if (response.isSuccessful && body != null) {
                sessionManager.saveSession(
                    accessToken = body.accessToken,
                    refreshToken = body.refreshToken,
                    userId = body.user?.id ?: "",
                    phone = body.user?.phone ?: "",
                    fullName = body.user?.fullName ?: ""
                )
                Result.success(true)
            } else {
                Result.failure(
                    Exception(
                        extractErrorMessage(
                            response.errorBody()?.string(),
                            friendlyStatusMessage(response.code(), "Đăng nhập Google không thành công.")
                        )
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    override suspend fun register(phone: String, password: String, fullName: String, email: String?): Result<Boolean> {
        return try {
            val response = authApiService.registerCustomer(
                CustomerRegisterRequest(
                    phone = phone,
                    email = email?.takeIf { it.isNotBlank() },
                    password = password,
                    fullName = fullName,
                    deviceId = sessionManager.getDeviceId()
                )
            )
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(
                    Exception(
                        extractErrorMessage(
                            response.errorBody()?.string(),
                            friendlyStatusMessage(response.code(), "Đăng ký không thành công.")
                        )
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    override suspend fun verifyOtp(phone: String, otp: String): Result<Boolean> {
        return try {
            val response = authApiService.verifyOtp(
                VerifyOtpRequest(target = phone, code = otp, purpose = "VERIFY")
            )
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(
                    Exception(
                        extractErrorMessage(
                            response.errorBody()?.string(),
                            friendlyStatusMessage(response.code(), "Mã OTP không chính xác.")
                        )
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    override suspend fun resendOtp(phone: String): Result<Boolean> {
        return try {
            val response = authApiService.resendOtp(ResendOtpRequest(target = phone, purpose = "VERIFY"))
            if (response.isSuccessful) Result.success(true)
            else Result.failure(Exception(friendlyStatusMessage(response.code(), "Không gửi lại được mã OTP.")))
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    override suspend fun forgotPassword(target: String): Result<Boolean> {
        return try {
            val response = authApiService.forgotPassword(ForgotPasswordRequest(target))
            if (response.isSuccessful) Result.success(true)
            else Result.failure(Exception(friendlyStatusMessage(response.code(), "Không gửi được mã xác thực.")))
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    override suspend fun resetPassword(target: String, otpCode: String, newPassword: String): Result<Boolean> {
        return try {
            val response = authApiService.resetPassword(ResetPasswordRequest(target, otpCode, newPassword))
            if (response.isSuccessful) Result.success(true)
            else Result.failure(
                Exception(
                    extractErrorMessage(
                        response.errorBody()?.string(),
                        friendlyStatusMessage(response.code(), "Không đặt lại được mật khẩu.")
                    )
                )
            )
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    override suspend fun changePassword(currentPassword: String, newPassword: String, otpCode: String?): Result<Boolean> {
        val userId = sessionManager.getUserId()
        if (userId.isNullOrBlank()) {
            return Result.failure(Exception("Bạn cần đăng nhập lại để đổi mật khẩu."))
        }
        return try {
            val response = authApiService.changePassword(
                userId,
                ChangePasswordRequest(currentPassword, newPassword, otpCode)
            )
            if (response.isSuccessful) Result.success(true)
            else Result.failure(
                Exception(
                    extractErrorMessage(
                        response.errorBody()?.string(),
                        friendlyStatusMessage(response.code(), "Không đổi được mật khẩu.")
                    )
                )
            )
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
        }
    }

    private fun otpResult(response: retrofit2.Response<Map<String, Any>>, fallback: String): Result<com.surplusiq.app.domain.repository.OtpSent> =
        if (response.isSuccessful) {
            val body = response.body().orEmpty()
            Result.success(
                com.surplusiq.app.domain.repository.OtpSent(
                    message = body["message"] as? String ?: "Đã gửi mã OTP về email của bạn.",
                    preview = body["otpPreview"] as? String
                )
            )
        } else {
            Result.failure(Exception(extractErrorMessage(response.errorBody()?.string(), friendlyStatusMessage(response.code(), fallback))))
        }

    override suspend fun requestPasswordChangeOtp(): Result<com.surplusiq.app.domain.repository.OtpSent> = try {
        otpResult(authApiService.requestPasswordChangeOtp(), "Không gửi được mã OTP.")
    } catch (e: Exception) {
        Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
    }

    override suspend fun requestEmailOtp(email: String): Result<com.surplusiq.app.domain.repository.OtpSent> = try {
        otpResult(authApiService.requestEmailOtp(com.surplusiq.app.data.remote.dto.EmailOtpRequest(email.trim())), "Không gửi được mã OTP.")
    } catch (e: Exception) {
        Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
    }

    override suspend fun confirmEmail(email: String, code: String): Result<Boolean> = try {
        val response = authApiService.confirmEmail(com.surplusiq.app.data.remote.dto.EmailConfirmRequest(email.trim(), code.trim()))
        if (response.isSuccessful) Result.success(true)
        else Result.failure(Exception(extractErrorMessage(response.errorBody()?.string(), friendlyStatusMessage(response.code(), "Không xác minh được email."))))
    } catch (e: Exception) {
        Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
    }

    override suspend fun logout(): Result<Boolean> {
        val userId = sessionManager.getUserId()
        if (userId != null) {
            try {
                authApiService.logout(userId, sessionManager.getDeviceId())
            } catch (_: Exception) {
                // Đăng xuất phía server là best-effort; vẫn xóa phiên cục bộ dù lỗi mạng.
            }
        }
        sessionManager.clearSession()
        return Result.success(true)
    }

    override suspend fun getTwoFactorStatus(): Result<TwoFactorStatus> = call("Không tải được trạng thái xác thực 2 bước.") {
        val r = authApiService.getTwoFactorStatus()
        r to r.body()?.let { TwoFactorStatus(it.twoFactorEnabled, it.target, it.trustedDeviceDays) }
    }

    override suspend fun setTwoFactor(enabled: Boolean, password: String): Result<Boolean> =
        call("Không cập nhật được xác thực 2 bước.") {
            val request = TwoFactorToggleRequest(password)
            val r = if (enabled) authApiService.enableTwoFactor(request) else authApiService.disableTwoFactor(request)
            r to (if (r.isSuccessful) enabled else null)
        }

    override suspend fun getSessions(): Result<List<LoginSession>> = call("Không tải được danh sách thiết bị.") {
        val r = authApiService.getSessions()
        r to r.body()?.map {
            LoginSession(it.id, it.deviceName?.takeIf { n -> n.isNotBlank() } ?: "Thiết bị không tên", it.ip, it.lastUsedAt, it.isCurrent)
        }
    }

    override suspend fun revokeSession(sessionId: String): Result<Boolean> = call("Không thu hồi được phiên đăng nhập.") {
        val r = authApiService.revokeSession(sessionId)
        r to (if (r.isSuccessful) true else null)
    }

    /** Gọi API cần đăng nhập, trả lỗi thật của máy chủ thay vì thành công giả. */
    private suspend fun <T> call(fallback: String, block: suspend () -> Pair<retrofit2.Response<*>, T?>): Result<T> = try {
        val (response, value) = block()
        if (response.isSuccessful && value != null) Result.success(value)
        else Result.failure(Exception(extractErrorMessage(response.errorBody()?.string(), friendlyStatusMessage(response.code(), fallback))))
    } catch (e: Exception) {
        Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
    }

    override fun setRememberLogin(remember: Boolean) = sessionManager.setRememberLogin(remember)

    override fun isLoggedIn(): Boolean = sessionManager.isLoggedIn()

    override fun getCurrentUserName(): String = sessionManager.getFullName()

    private fun friendlyStatusMessage(code: Int, fallback: String): String = when (code) {
        400 -> fallback
        401 -> "Sai thông tin đăng nhập."
        404 -> "Không tìm thấy tài khoản."
        409 -> "Thông tin đã tồn tại, vui lòng kiểm tra lại."
        429 -> "Bạn đang thao tác quá nhanh, vui lòng thử lại sau một chút."
        in 500..599 -> "Hệ thống đang gặp sự cố. Vui lòng thử lại sau."
        else -> fallback
    }

    private fun extractErrorMessage(rawError: String?, defaultMessage: String): String {
        if (rawError.isNullOrBlank()) return defaultMessage
        return try {
            val json = org.json.JSONObject(rawError)
            when {
                json.has("message") -> {
                    val msgObj = json.get("message")
                    if (msgObj is org.json.JSONArray) {
                        val messages = mutableListOf<String>()
                        for (i in 0 until msgObj.length()) {
                            messages.add(msgObj.getString(i))
                        }
                        messages.joinToString("\n")
                    } else {
                        msgObj.toString()
                    }
                }
                json.has("error") -> json.getString("error")
                else -> defaultMessage
            }
        } catch (_: Exception) {
            defaultMessage
        }
    }
}
