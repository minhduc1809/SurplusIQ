package com.surplusiq.app.domain.model

/** Kết quả bước đăng nhập mật khẩu: vào thẳng, hoặc cần thêm mã 2FA (R1-013). */
sealed interface LoginOutcome {
    data object Success : LoginOutcome

    /** [otpPreview] chỉ có ở môi trường phát triển (chưa gửi SMS/email thật). */
    data class TwoFactorRequired(val target: String?, val message: String?, val otpPreview: String?) : LoginOutcome
}

data class TwoFactorStatus(
    val enabled: Boolean,
    /** Nơi nhận mã đã che bớt, ví dụ k***@gmail.com. */
    val target: String?,
    val trustedDeviceDays: Int
)

data class LoginSession(
    val id: String,
    val deviceName: String,
    val ip: String?,
    val lastUsedAt: String?,
    val isCurrent: Boolean
)
