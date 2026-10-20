package com.surplusiq.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.surplusiq.app.domain.model.AppNotification
import com.surplusiq.app.domain.model.NotificationSettings
import com.surplusiq.app.domain.repository.NotificationsRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotificationsUiState(
    val notifications: List<AppNotification> = emptyList(),
    val unreadCount: Int = 0,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val settings: NotificationSettings = NotificationSettings(),
    val isSavingSettings: Boolean = false
)

@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val notificationsRepository: NotificationsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(NotificationsUiState())
    val uiState: StateFlow<NotificationsUiState> = _uiState.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            val result = notificationsRepository.getNotifications()
            result.fold(
                onSuccess = { (items, unreadCount) ->
                    _uiState.value = _uiState.value.copy(
                        notifications = items,
                        unreadCount = unreadCount,
                        isLoading = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        errorMessage = error.localizedMessage ?: "Không thể tải thông báo"
                    )
                }
            )
        }
    }

    fun markAsRead(id: String) {
        viewModelScope.launch {
            val result = notificationsRepository.markAsRead(id)
            if (result.isSuccess) {
                val updated = _uiState.value.notifications.map {
                    if (it.id == id && !it.isRead) it.copy(isRead = true) else it
                }
                val newUnread = updated.count { !it.isRead }
                _uiState.value = _uiState.value.copy(notifications = updated, unreadCount = newUnread)
            }
        }
    }

    fun markAllAsRead() {
        viewModelScope.launch {
            val result = notificationsRepository.markAllAsRead()
            if (result.isSuccess) {
                val updated = _uiState.value.notifications.map { it.copy(isRead = true) }
                _uiState.value = _uiState.value.copy(notifications = updated, unreadCount = 0)
            }
        }
    }

    fun saveSettings(settings: NotificationSettings) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingSettings = true)
            val result = notificationsRepository.updateSettings(settings)
            _uiState.value = _uiState.value.copy(
                isSavingSettings = false,
                settings = result.getOrNull() ?: _uiState.value.settings
            )
        }
    }
}
