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
        // Địa chỉ backend cấu hình lúc build qua -PAPI_BASE_URL (xem build.gradle.kts).
        /** Bật khi refresh token hết hạn/bị thu hồi: UI quay về màn đăng nhập. */
        val expired = MutableStateFlow(false)
        val DEFAULT_BASE_URL: String = com.surplusiq.merchant.BuildConfig.API_BASE_URL
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

    // Hệ thống chỉ còn vai trò chủ cửa hàng: mọi tài khoản cửa hàng đều là OWNER.
    fun getPermission(): String? = if (prefs.getString(KEY_PERMISSION, null) == null) null else "OWNER"

    fun saveLogin(res: LoginResponse) {
        prefs.edit()
            .putString(KEY_TOKEN, res.accessToken)
            .putString(KEY_REFRESH, res.refreshToken)
            .putString(KEY_USER_EMAIL, res.user.email)
            .putString(KEY_USER_ID, res.user.id)
            .putString(KEY_PERMISSION, res.user.permission)
            .apply()
    }

    /** Ghi nhớ đăng nhập (mặc định bật). Tắt thì phiên bị xóa ở lần mở app kế tiếp. */
    fun isRememberLogin(): Boolean = prefs.getBoolean("remember_login", true)

    fun setRememberLogin(remember: Boolean) {
        prefs.edit().putBoolean("remember_login", remember).apply()
    }

    fun isLoggedIn(): Boolean = !getAccessToken().isNullOrBlank()

    fun logout() {
        prefs.edit().remove(KEY_TOKEN).remove(KEY_REFRESH).remove(KEY_USER_EMAIL).remove(KEY_USER_ID).remove(KEY_PERMISSION).apply()
    }
}
