package com.surplusiq.merchant.data

import com.google.gson.JsonParser
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/** DI thủ công đơn giản - app chỉ có vài màn, không cần Hilt. */
object ApiClient {
    @Volatile private var service: StoreApiService? = null

    fun get(session: SessionManager): StoreApiService {
        return service ?: synchronized(this) {
            service ?: build(session).also { service = it }
        }
    }

    private fun build(session: SessionManager): StoreApiService {
        val authInterceptor = Interceptor { chain ->
            val request = chain.request().newBuilder()
                .header("x-channel", "STORE")
                .header("x-device-id", session.getDeviceId())
                .header("Accept", "application/json")
                .apply {
                    session.getAccessToken()?.let { header("Authorization", "Bearer $it") }
                }
                .build()
            chain.proceed(request)
        }

        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .authenticator(RefreshAuthenticator(session))
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(SessionManager.DEFAULT_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(StoreApiService::class.java)
    }
}

/**
 * 401 -> đổi refresh token lấy access token mới (POST auth/refresh) rồi gửi lại đúng request đó.
 * Refresh hỏng (hết hạn/thu hồi) thì xóa phiên và báo UI đăng nhập lại.
 */
private class RefreshAuthenticator(private val session: SessionManager) : Authenticator {
    private val bare = OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS).build()

    @Synchronized
    override fun authenticate(route: Route?, response: Response): Request? {
        val path = response.request.url.encodedPath
        // Không tự làm mới cho chính các lệnh đăng nhập/làm mới; chỉ thử một lần cho mỗi request.
        if (path.contains("/auth/") || response.priorResponse != null) return null
        val usedToken = response.request.header("Authorization")?.removePrefix("Bearer ")
        val current = session.getAccessToken()
        // Luồng khác vừa làm mới xong: dùng lại token mới.
        if (current != null && current != usedToken) return response.request.newBuilder().header("Authorization", "Bearer $current").build()

        val refresh = session.getRefreshToken() ?: return expire()
        val req = Request.Builder()
            .url(SessionManager.DEFAULT_BASE_URL + "auth/refresh")
            .header("x-channel", "STORE")
            .header("x-device-id", session.getDeviceId())
            .post("""{"refreshToken":"$refresh"}""".toRequestBody("application/json".toMediaType()))
            .build()
        val fresh = runCatching {
            bare.newCall(req).execute().use { r ->
                if (!r.isSuccessful) null
                else JsonParser.parseString(r.body?.string()).asJsonObject.get("accessToken")?.asString
            }
        }.getOrNull() ?: return expire()
        session.setAccessToken(fresh)
        return response.request.newBuilder().header("Authorization", "Bearer $fresh").build()
    }

    private fun expire(): Request? {
        session.logout()
        SessionManager.expired.value = true
        return null
    }
}
