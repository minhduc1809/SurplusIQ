package com.surplusiq.merchant.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import java.util.UUID

/** Lưu JWT/thiết bị cho phiên đăng nhập cửa hàng - SharedPreferences, không mã hoá (MVP). */
class SessionManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("sq_merchant_session", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_TOKEN = "access_token"
        private const val KEY_REFRESH = "refresh_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_PERMISSION = "permission"
        // 10.0.2.2 ánh xạ tới localhost máy host khi chạy trên Android Emulator.
        // shortcut: hardcode cho dev; thêm màn Cài đặt đổi BASE_URL khi build bản thật.
        /** Bật khi refresh token hết hạn/bị thu hồi: UI quay về màn đăng nhập. */
        val expired = MutableStateFlow(false)
        const val DEFAULT_BASE_URL = "http://10.0.2.2:4000/"
    }

    fun getAccessToken(): String? = prefs.getString(KEY_TOKEN, null)

    fun setAccessToken(token: String?) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun getRefreshToken(): String? = prefs.getString(KEY_REFRESH, null)

    fun getDeviceId(): String {
        var id = prefs.getString(KEY_DEVICE_ID, null)
        if (id == null) {
            id = "merchant-" + UUID.randomUUID().toString()
            prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        }
        return id
    }

    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    /** id cần cho header x-user-id (đổi mật khẩu); permission: OWNER | MANAGER | COUNTER. */
    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun getPermission(): String? = prefs.getString(KEY_PERMISSION, null)

    fun saveLogin(res: LoginResponse) {
        prefs.edit()
            .putString(KEY_TOKEN, res.accessToken)
            .putString(KEY_REFRESH, res.refreshToken)
            .putString(KEY_USER_EMAIL, res.user.email)
            .putString(KEY_USER_ID, res.user.id)
            .putString(KEY_PERMISSION, res.user.permission)
            .apply()
    }

    fun isLoggedIn(): Boolean = !getAccessToken().isNullOrBlank()

    fun logout() {
        prefs.edit().remove(KEY_TOKEN).remove(KEY_REFRESH).remove(KEY_USER_EMAIL).remove(KEY_USER_ID).remove(KEY_PERMISSION).apply()
    }
}
