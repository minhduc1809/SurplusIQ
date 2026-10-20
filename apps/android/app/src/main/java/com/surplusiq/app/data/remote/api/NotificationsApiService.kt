package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.FcmTokenResponse
import com.surplusiq.app.data.remote.dto.MarkAllReadResponse
import com.surplusiq.app.data.remote.dto.NotificationDto
import com.surplusiq.app.data.remote.dto.NotificationListResponse
import com.surplusiq.app.data.remote.dto.NotificationSettingsDto
import com.surplusiq.app.data.remote.dto.RegisterFcmTokenRequest
import com.surplusiq.app.data.remote.dto.UpdateNotificationSettingsRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface NotificationsApiService {

    @GET("customer/notifications")
    suspend fun getNotifications(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("unreadOnly") unreadOnly: Boolean? = null
    ): Response<NotificationListResponse>

    @PATCH("customer/notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: String): Response<NotificationDto>

    @PATCH("customer/notifications/read-all")
    suspend fun markAllAsRead(): Response<MarkAllReadResponse>

    @GET("customer/notification-settings")
    suspend fun getSettings(): Response<NotificationSettingsDto>

    @PUT("customer/notification-settings")
    suspend fun updateSettings(
        @Body request: UpdateNotificationSettingsRequest
    ): Response<NotificationSettingsDto>

    @POST("customer/fcm-token")
    suspend fun registerFcmToken(@Body request: RegisterFcmTokenRequest): Response<FcmTokenResponse>

    @DELETE("customer/fcm-token/{deviceId}")
    suspend fun unregisterFcmToken(@Path("deviceId") deviceId: String): Response<FcmTokenResponse>
}
