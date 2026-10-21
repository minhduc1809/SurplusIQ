package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.LoginOutcome
import com.surplusiq.app.domain.model.LoginSession
import com.surplusiq.app.domain.model.TwoFactorStatus

interface AuthRepository {
    suspend fun login(phone: String, password: String, otpCode: String? = null): Result<LoginOutcome>
    suspend fun loginWithGoogle(idToken: String): Result<Boolean>
    suspend fun register(phone: String, password: String, fullName: String): Result<Boolean>
    suspend fun verifyOtp(phone: String, otp: String): Result<Boolean>
    suspend fun resendOtp(phone: String): Result<Boolean>
    suspend fun forgotPassword(target: String): Result<Boolean>
    suspend fun resetPassword(target: String, otpCode: String, newPassword: String): Result<Boolean>
    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Boolean>
    suspend fun logout(): Result<Boolean>
    suspend fun getTwoFactorStatus(): Result<TwoFactorStatus>
    suspend fun setTwoFactor(enabled: Boolean, password: String): Result<Boolean>
    suspend fun getSessions(): Result<List<LoginSession>>
    suspend fun revokeSession(sessionId: String): Result<Boolean>
    fun setRememberLogin(remember: Boolean)
    fun isLoggedIn(): Boolean
    fun getCurrentUserName(): String
}
