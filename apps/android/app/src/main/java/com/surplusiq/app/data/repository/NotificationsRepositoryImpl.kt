package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.NotificationsApiService
import com.surplusiq.app.data.remote.dto.NotificationDto
import com.surplusiq.app.data.remote.dto.RegisterFcmTokenRequest
import com.surplusiq.app.data.remote.dto.UpdateNotificationSettingsRequest
import com.surplusiq.app.domain.model.AppNotification
import com.surplusiq.app.domain.model.NotificationSettings
import com.surplusiq.app.domain.repository.NotificationsRepository
import javax.inject.Inject
import javax.inject.Singleton

/** Không tự tạo danh sách/trạng thái giả khi API lỗi - trả Result.failure để UI hiển thị lỗi thật (rule 0.1). */
@Singleton
class NotificationsRepositoryImpl @Inject constructor(
    private val notificationsApiService: NotificationsApiService
) : NotificationsRepository {

    override suspend fun getNotifications(unreadOnly: Boolean): Result<Pair<List<AppNotification>, Int>> {
        return try {
            val response = notificationsApiService.getNotifications(unreadOnly = unreadOnly)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(body.items.map { it.toModel() } to body.unreadCount)
            } else {
                Result.failure(Exception("Không thể tải thông báo (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markAsRead(id: String): Result<Unit> {
        return try {
            val response = notificationsApiService.markAsRead(id)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Không thể đánh dấu đã đọc (${response.code()})"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun markAllAsRead(): Result<Unit> {
        return try {
            val response = notificationsApiService.markAllAsRead()
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Không thể đánh dấu đã đọc toàn bộ (${response.code()})"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateSettings(settings: NotificationSettings): Result<NotificationSettings> {
        return try {
            val response = notificationsApiService.updateSettings(
                UpdateNotificationSettingsRequest(
                    transactionPush = settings.transactionPush,
                    promoPush = settings.promoPush,
                    reminderPush = settings.reminderPush
                )
            )
            val body = response.body()
            if (response.isSuccessful && body != null) {
                Result.success(
                    NotificationSettings(body.transactionPush, body.promoPush, body.reminderPush)
                )
            } else {
                Result.failure(Exception("Không thể lưu cài đặt thông báo (${response.code()})"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun registerFcmToken(token: String, deviceId: String): Result<Unit> {
        return try {
            val response = notificationsApiService.registerFcmToken(
                RegisterFcmTokenRequest(deviceId = deviceId, token = token)
            )
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Không thể đăng ký FCM token (${response.code()})"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun unregisterFcmToken(deviceId: String): Result<Unit> {
        return try {
            val response = notificationsApiService.unregisterFcmToken(deviceId)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Không thể hủy đăng ký FCM token (${response.code()})"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun NotificationDto.toModel() = AppNotification(
        id = id,
        type = type,
        title = title,
        body = body,
        isRead = isRead,
        createdAt = createdAt
    )
}
