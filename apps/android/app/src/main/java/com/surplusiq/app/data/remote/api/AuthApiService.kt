package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Path
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
    ): Response<LoginResponse>

    @POST("auth/customer/google")
    suspend fun loginWithGoogle(
        @Body request: GoogleLoginRequest
    ): Response<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(
        @Header("x-user-id") userId: String,
        @Header("x-device-id") deviceId: String
    ): Response<Map<String, Any>>

    @POST("auth/password/forgot")
    suspend fun forgotPassword(
        @Body request: ForgotPasswordRequest
    ): Response<Map<String, Any>>

    @POST("auth/password/reset")
    suspend fun resetPassword(
        @Body request: ResetPasswordRequest
    ): Response<Map<String, Any>>

    @POST("auth/password/change/otp")
    suspend fun requestPasswordChangeOtp(): Response<Map<String, Any>>

    @POST("auth/email/otp")
    suspend fun requestEmailOtp(@Body request: EmailOtpRequest): Response<Map<String, Any>>

    @POST("auth/email/confirm")
    suspend fun confirmEmail(@Body request: EmailConfirmRequest): Response<Map<String, Any>>

    @POST("auth/password/change")
    suspend fun changePassword(
        @Header("x-user-id") userId: String,
        @Body request: ChangePasswordRequest
    ): Response<Map<String, Any>>

    // --- Bảo mật tài khoản: 2FA (K55) và thiết bị đăng nhập (K56) ---

    @GET("me/2fa")
    suspend fun getTwoFactorStatus(): Response<TwoFactorStatusDto>

    @POST("me/2fa/enable")
    suspend fun enableTwoFactor(@Body request: TwoFactorToggleRequest): Response<Map<String, Any>>

    @POST("me/2fa/disable")
    suspend fun disableTwoFactor(@Body request: TwoFactorToggleRequest): Response<Map<String, Any>>

    @GET("me/sessions")
    suspend fun getSessions(): Response<List<SessionDto>>

    @DELETE("me/sessions/{id}")
    suspend fun revokeSession(@Path("id") id: String): Response<Map<String, Any>>
}
