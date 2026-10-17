package com.surplusiq.app.domain.repository

interface AuthRepository {
    suspend fun login(phone: String, password: String): Result<Boolean>
    suspend fun register(phone: String, password: String, fullName: String): Result<Boolean>
    suspend fun verifyOtp(phone: String, otp: String): Result<Boolean>
    suspend fun resendOtp(phone: String): Result<Boolean>
    suspend fun logout(): Result<Boolean>
    fun isLoggedIn(): Boolean
    fun getCurrentUserName(): String
}
