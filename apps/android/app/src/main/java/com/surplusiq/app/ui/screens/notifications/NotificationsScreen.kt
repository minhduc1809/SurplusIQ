package com.surplusiq.app.ui.screens.notifications

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.AppNotification
import com.surplusiq.app.domain.model.NotificationSettings
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.NotificationsUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    state: NotificationsUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onNotificationClick: (AppNotification) -> Unit,
    onMarkAllRead: () -> Unit,
    onSaveSettings: (NotificationSettings) -> Unit,
    modifier: Modifier = Modifier
) {
    var showSettings by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(
                    if (state.unreadCount > 0) "Thông báo (${state.unreadCount})" else "Thông báo",
                    fontWeight = FontWeight.Bold,
                    fontSize = 17.sp
                )
            },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = onMarkAllRead) {
                    Icon(Icons.Default.DoneAll, contentDescription = "Đánh dấu đã đọc toàn bộ")
                }
                IconButton(onClick = { showSettings = true }) {
                    Icon(Icons.Default.Settings, contentDescription = "Cài đặt thông báo")
                }
            }
        )

        when {
            state.isLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = ForestGreenPrimary)
                }
            }
            state.errorMessage != null -> {
                Column(
                    modifier = Modifier.fillMaxSize().padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(state.errorMessage, color = CoralRed, fontSize = 14.sp)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = onRetry) { Text("Thử lại") }
                }
            }
            state.notifications.isEmpty() -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Chưa có thông báo nào.", color = TextSecondary)
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(state.notifications) { notification ->
                        NotificationRow(notification, onClick = { onNotificationClick(notification) })
                    }
                }
            }
        }
    }

    if (showSettings) {
        NotificationSettingsSheet(
            settings = state.settings,
            isSaving = state.isSavingSettings,
            onDismiss = { showSettings = false },
            onSave = { onSaveSettings(it) }
        )
    }
}

@Composable
private fun NotificationRow(notification: AppNotification, onClick: () -> Unit) {
    SqCard(
        modifier = Modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (!notification.isRead) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(ForestGreenPrimary, CircleShape)
                )
                Spacer(modifier = Modifier.width(10.dp))
            } else {
                Spacer(modifier = Modifier.width(18.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    notification.title,
                    fontSize = 14.sp,
                    fontWeight = if (notification.isRead) FontWeight.Normal else FontWeight.Bold,
                    color = TextPrimary
                )
                Text(notification.body, fontSize = 12.sp, color = TextMuted)
                Text(notification.createdAt, fontSize = 11.sp, color = TextSecondary)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NotificationSettingsSheet(
    settings: NotificationSettings,
    isSaving: Boolean,
    onDismiss: () -> Unit,
    onSave: (NotificationSettings) -> Unit
) {
    var local by remember(settings) { mutableStateOf(settings) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
            Text("Cài đặt thông báo", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimary)
            Spacer(modifier = Modifier.height(12.dp))

            SettingToggleRow(
                label = "Thông báo giao dịch",
                checked = local.transactionPush,
                onCheckedChange = { local = local.copy(transactionPush = it) }
            )
            SettingToggleRow(
                label = "Thông báo khuyến mãi",
                checked = local.promoPush,
                onCheckedChange = { local = local.copy(promoPush = it) }
            )
            SettingToggleRow(
                label = "Nhắc nhở lấy hàng",
                checked = local.reminderPush,
                onCheckedChange = { local = local.copy(reminderPush = it) }
            )

            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = { onSave(local) },
                enabled = !isSaving,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (isSaving) "Đang lưu..." else "Lưu cài đặt")
            }
        }
    }
}

@Composable
private fun SettingToggleRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, fontSize = 14.sp, color = TextPrimary)
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

/** Icon chuông với badge số lượng chưa đọc - dùng ở top bar các màn hình chính. */
@Composable
fun NotificationBellIcon(unreadCount: Int, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier) {
        IconButton(
            onClick = onClick,
            modifier = Modifier
                .size(40.dp)
                .background(ForestGreenPrimary.copy(alpha = 0.1f), CircleShape)
        ) {
            Icon(
                imageVector = Icons.Default.Notifications,
                contentDescription = "Thông báo",
                tint = ForestGreenPrimary,
                modifier = Modifier.size(20.dp)
            )
        }
        if (unreadCount > 0) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(16.dp)
                    .background(CoralRed, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (unreadCount > 9) "9+" else unreadCount.toString(),
                    color = Color.White,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
