package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface AuthApiService {

    @POST("auth/customer/register")
    suspend fun registerCustomer(
        @Body request: CustomerRegisterRequest
    ): Response<Map<String, Any>>

    @POST("auth/customer/verify-otp")
    suspend fun verifyOtp(
        @Body request: VerifyOtpRequest
    ): Response<AuthResponse>

    @POST("auth/customer/resend-otp")
    suspend fun resendOtp(
        @Body request: ResendOtpRequest
    ): Response<Map<String, Any>>

    @POST("auth/customer/login")
    suspend fun loginCustomer(
        @Body request: CustomerLoginRequest
    ): Response<AuthResponse>

    @POST("auth/refresh")
    suspend fun refreshAccessToken(
        @Body request: RefreshTokenRequest
    ): Response<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(
        @Header("x-user-id") userId: String,
        @Header("x-device-id") deviceId: String
    ): Response<Map<String, Any>>
}
