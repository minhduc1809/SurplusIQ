package com.surplusiq.app.data.remote

import com.google.gson.JsonParser
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 401 -> đổi refresh token lấy access token mới (POST auth/refresh; access token chỉ sống 15 phút)
 * rồi gửi lại đúng request đó. Refresh hỏng thì xóa phiên để lần mở sau quay về đăng nhập.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val sessionManager: SessionManager
) : Authenticator {
    private val bare = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS).build()

    @Synchronized
    override fun authenticate(route: Route?, response: Response): Request? {
        // Không tự làm mới cho chính các lệnh auth; chỉ thử một lần cho mỗi request.
        if (response.request.url.encodedPath.contains("/auth/") || response.priorResponse != null) return null
        val usedToken = response.request.header("Authorization")?.removePrefix("Bearer ")
        val current = sessionManager.getAccessToken()
        // Luồng khác vừa làm mới xong: dùng lại token mới.
        if (current != null && current != usedToken) {
            return response.request.newBuilder().header("Authorization", "Bearer $current").build()
        }

        val refresh = sessionManager.getRefreshToken() ?: return null
        val req = Request.Builder()
            .url(sessionManager.getBaseUrl() + "auth/refresh")
            .header("x-channel", "CUSTOMER")
            .header("x-device-id", sessionManager.getDeviceId())
            .post("""{"refreshToken":"$refresh"}""".toRequestBody("application/json".toMediaType()))
            .build()
        val fresh = runCatching {
            bare.newCall(req).execute().use { r ->
                if (!r.isSuccessful) null
                else JsonParser.parseString(r.body?.string()).asJsonObject.get("accessToken")?.asString
            }
        }.getOrNull()
        if (fresh == null) {
            sessionManager.clearSession()
            return null
        }
        sessionManager.saveSession(fresh, refresh, sessionManager.getUserId().orEmpty())
        return response.request.newBuilder().header("Authorization", "Bearer $fresh").build()
    }
}
