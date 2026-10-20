package com.surplusiq.app.domain.repository

interface AuthRepository {
    suspend fun login(phone: String, password: String): Result<Boolean>
    suspend fun loginWithGoogle(idToken: String): Result<Boolean>
    suspend fun register(phone: String, password: String, fullName: String): Result<Boolean>
    suspend fun verifyOtp(phone: String, otp: String): Result<Boolean>
    suspend fun resendOtp(phone: String): Result<Boolean>
    suspend fun forgotPassword(target: String): Result<Boolean>
    suspend fun resetPassword(target: String, otpCode: String, newPassword: String): Result<Boolean>
    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Boolean>
    suspend fun logout(): Result<Boolean>
    fun isLoggedIn(): Boolean
    fun getCurrentUserName(): String
}
