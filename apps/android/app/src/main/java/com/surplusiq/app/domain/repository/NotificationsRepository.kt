package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.AppNotification
import com.surplusiq.app.domain.model.NotificationSettings

/** Notifications module: danh sách thông báo, trạng thái đã đọc, cài đặt push. */
interface NotificationsRepository {
    suspend fun getNotifications(unreadOnly: Boolean = false): Result<Pair<List<AppNotification>, Int>>
    suspend fun markAsRead(id: String): Result<Unit>
    suspend fun markAllAsRead(): Result<Unit>
    suspend fun updateSettings(settings: NotificationSettings): Result<NotificationSettings>
    suspend fun registerFcmToken(token: String, deviceId: String): Result<Unit>
    suspend fun unregisterFcmToken(deviceId: String): Result<Unit>
}
