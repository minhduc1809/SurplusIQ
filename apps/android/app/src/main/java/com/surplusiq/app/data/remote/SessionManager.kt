package com.surplusiq.app.data.remote

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("surplusiq_session_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ACCESS_TOKEN = "key_access_token"
        private const val KEY_REFRESH_TOKEN = "key_refresh_token"
        private const val KEY_USER_ID = "key_user_id"
        private const val KEY_PHONE = "key_phone"
        private const val KEY_FULL_NAME = "key_full_name"
        private const val KEY_DEVICE_ID = "key_device_id"
        private const val KEY_BASE_URL = "key_base_url"
        const val DEFAULT_BASE_URL = "http://10.0.2.2:3000/api/"
    }

    init {
        if (!prefs.contains(KEY_DEVICE_ID)) {
            prefs.edit().putString(KEY_DEVICE_ID, UUID.randomUUID().toString()).apply()
        }
    }

    fun saveSession(accessToken: String, refreshToken: String, userId: String, phone: String? = null, fullName: String? = null) {
        prefs.edit().apply {
            putString(KEY_ACCESS_TOKEN, accessToken)
            putString(KEY_REFRESH_TOKEN, refreshToken)
            putString(KEY_USER_ID, userId)
            if (phone != null) putString(KEY_PHONE, phone)
            if (fullName != null) putString(KEY_FULL_NAME, fullName)
            apply()
        }
    }

    fun getAccessToken(): String? = prefs.getString(KEY_ACCESS_TOKEN, null)

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH_TOKEN, null)

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun getPhone(): String? = prefs.getString(KEY_PHONE, null)

    fun getFullName(): String = prefs.getString(KEY_FULL_NAME, "Khách hàng SurplusIQ") ?: "Khách hàng SurplusIQ"

    fun getDeviceId(): String = prefs.getString(KEY_DEVICE_ID, "android-device-emulator") ?: "android-device-emulator"

    fun getBaseUrl(): String = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL

    fun setBaseUrl(url: String) {
        val sanitized = if (url.endsWith("/")) url else "$url/"
        prefs.edit().putString(KEY_BASE_URL, sanitized).apply()
    }

    fun isLoggedIn(): Boolean = !getAccessToken().isNullOrBlank()

    fun clearSession() {
        prefs.edit().apply {
            remove(KEY_ACCESS_TOKEN)
            remove(KEY_REFRESH_TOKEN)
            remove(KEY_USER_ID)
            remove(KEY_PHONE)
            remove(KEY_FULL_NAME)
            apply()
        }
    }
}
