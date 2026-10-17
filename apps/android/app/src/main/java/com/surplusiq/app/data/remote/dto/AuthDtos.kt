package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CustomerRegisterRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("password") val password: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("termsAccepted") val termsAccepted: Boolean = true,
    @SerializedName("privacyAccepted") val privacyAccepted: Boolean = true
)

data class CustomerLoginRequest(
    @SerializedName("identifier") val identifier: String,
    @SerializedName("phone") val phone: String = identifier,
    @SerializedName("password") val password: String,
    @SerializedName("deviceId") val deviceId: String
)

data class VerifyOtpRequest(
    @SerializedName("target") val target: String,
    @SerializedName("code") val code: String,
    @SerializedName("purpose") val purpose: String = "VERIFY",
    @SerializedName("phone") val phone: String = target,
    @SerializedName("otp") val otp: String = code
)

data class ResendOtpRequest(
    @SerializedName("target") val target: String,
    @SerializedName("purpose") val purpose: String = "VERIFY",
    @SerializedName("phone") val phone: String = target
)

data class RefreshTokenRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class AuthResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("expiresIn") val expiresIn: Long? = null,
    @SerializedName("user") val user: UserDto? = null
)

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("phone") val phone: String? = null,
    @SerializedName("fullName") val fullName: String? = null,
    @SerializedName("role") val role: String? = "CUSTOMER",
    @SerializedName("status") val status: String? = "ACTIVE",
    @SerializedName("isPhoneVerified") val isPhoneVerified: Boolean = true
)
