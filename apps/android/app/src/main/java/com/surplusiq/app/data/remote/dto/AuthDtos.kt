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
    @SerializedName("phone") val phone: String,
    @SerializedName("password") val password: String,
    @SerializedName("deviceId") val deviceId: String? = null
)

data class VerifyOtpRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("otp") val otp: String
)

data class ResendOtpRequest(
    @SerializedName("phone") val phone: String
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
