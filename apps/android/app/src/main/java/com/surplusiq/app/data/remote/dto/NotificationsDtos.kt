package com.surplusiq.app.data.remote.dto

data class NotificationDto(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val isRead: Boolean,
    val createdAt: String
)

data class NotificationListResponse(
    val items: List<NotificationDto>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int,
    val unreadCount: Int
)

data class MarkAllReadResponse(
    val success: Boolean,
    val message: String
)

data class UpdateNotificationSettingsRequest(
    val transactionPush: Boolean? = null,
    val promoPush: Boolean? = null,
    val reminderPush: Boolean? = null
)

data class NotificationSettingsDto(
    val transactionPush: Boolean,
    val promoPush: Boolean,
    val reminderPush: Boolean
)

data class RegisterFcmTokenRequest(
    val deviceId: String,
    val token: String,
    val enabled: Boolean? = null
)

data class FcmTokenResponse(
    val success: Boolean,
    val message: String
)
