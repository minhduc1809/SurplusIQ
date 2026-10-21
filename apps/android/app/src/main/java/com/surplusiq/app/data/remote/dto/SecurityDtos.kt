package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

/** Phản hồi đăng nhập: hoặc có token, hoặc yêu cầu bước mã 2FA (R1-013). */
data class LoginResponse(
    @SerializedName("accessToken") val accessToken: String? = null,
    @SerializedName("refreshToken") val refreshToken: String? = null,
    @SerializedName("user") val user: UserDto? = null,
    @SerializedName("twoFactorRequired") val twoFactorRequired: Boolean? = null,
    @SerializedName("target") val target: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("otpPreview") val otpPreview: String? = null
)

data class TwoFactorStatusDto(
    @SerializedName("twoFactorEnabled") val twoFactorEnabled: Boolean,
    @SerializedName("target") val target: String? = null,
    @SerializedName("trustedDeviceDays") val trustedDeviceDays: Int = 30
)

data class TwoFactorToggleRequest(
    @SerializedName("password") val password: String
)

data class SessionDto(
    @SerializedName("id") val id: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String? = null,
    @SerializedName("ip") val ip: String? = null,
    @SerializedName("lastUsedAt") val lastUsedAt: String? = null,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("isCurrent") val isCurrent: Boolean = false
)
