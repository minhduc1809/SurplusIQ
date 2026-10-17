package com.surplusiq.app.data.remote

import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthInterceptor @Inject constructor(
    private val sessionManager: SessionManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val requestBuilder = originalRequest.newBuilder()
            .header("x-channel", "CUSTOMER")
            .header("x-device-id", sessionManager.getDeviceId())
            .header("Accept", "application/json")

        val token = sessionManager.getAccessToken()
        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val userId = sessionManager.getUserId()
        if (!userId.isNullOrBlank()) {
            requestBuilder.header("x-user-id", userId)
        }

        return chain.proceed(requestBuilder.build())
    }
}
