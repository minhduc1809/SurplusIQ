package com.surplusiq.merchant.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.Info
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.NotificationDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val TYPE_FILTERS = listOf(
    null to "Tất cả",
    "ORDER" to "Đơn hàng",
    "COMPLAINT" to "Khiếu nại",
    "PRICE_PROPOSAL" to "Đề xuất giá",
    "SYSTEM" to "Hệ thống",
)

/** createdAt ISO 8601 UTC -> "HH:mm dd/MM" theo giờ máy. */
private fun localTime(iso: String): String = try {
    java.time.Instant.parse(iso).atZone(java.time.ZoneId.systemDefault())
        .format(java.time.format.DateTimeFormatter.ofPattern("HH:mm dd/MM"))
} catch (_: Exception) {
    iso
}

/** Loại thông báo -> route liên quan. */
private fun notificationRoute(n: NotificationDto): String? {
    val orderId = n.data?.get("orderId") as? String
    // Tin nhắn của khách mở thẳng cuộc trò chuyện của đơn đó; thông báo đơn khác mở chi tiết đơn nếu có mã đơn.
    if (orderId != null && n.data?.get("kind") == "ORDER_MESSAGE") return "order/$orderId/chat"
    if (orderId != null && (n.type == "ORDER" || n.type == "PICKUP_REMINDER")) return "order/$orderId"
    return notificationRoute(n.type)
}

private fun notificationRoute(type: String): String? = when (type) {
    "ORDER", "PICKUP_REMINDER" -> "orders"
    "PRICE_PROPOSAL" -> "price-proposals"
    "COMPLAINT" -> "complaints"
    "REVIEW" -> "reviews"
    else -> null
}

/**
 * S08 - Thông báo cửa hàng (GET store/notifications, PATCH .../{id}/read, PATCH .../read-all).
 * read-all backend chỉ cho OWNER/MANAGER nên ẩn với nhân viên quầy.
 */
@Composable
fun NotificationsScreen(repository: StoreRepository, canMarkAll: Boolean, onNavigate: (String) -> Unit) {
    var items by remember { mutableStateOf<List<NotificationDto>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var filter by remember { mutableStateOf<String?>(null) }
    var tasks by remember { mutableStateOf<List<com.surplusiq.merchant.data.TaskDto>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getNotifications()
            isLoading = false
            result.fold(onSuccess = { items = it.items }, onFailure = { error = it.message })
        }
        // Việc cần làm (nhắc việc, số cuối ngày...) gom về đây thay vì chiếm chỗ ở trang chủ
        scope.launch { repository.getTodayTasks().onSuccess { r -> tasks = r.tasks.filter { it.urgent || it.count > 0 } } }
    }

    fun open(n: NotificationDto) {
        if (!n.isRead) {
            items = items?.map { if (it.id == n.id) it.copy(isRead = true) else it }
            scope.launch { repository.markNotificationRead(n.id) }
        }
        notificationRoute(n)?.let(onNavigate)
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(20.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(text = "Thông báo", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.weight(1f))
            if (canMarkAll && items.orEmpty().any { !it.isRead }) {
                TextButton(onClick = {
                    scope.launch {
                        repository.markAllNotificationsRead().fold(
                            onSuccess = { items = items?.map { it.copy(isRead = true) } },
                            onFailure = { error = it.message }
                        )
                    }
                }) { Text("Đọc tất cả", color = SqCoral, fontWeight = FontWeight.Bold) }
            }
        }
        Spacer(modifier = Modifier.height(8.dp))

        Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TYPE_FILTERS.forEach { (type, label) ->
                val unread = items.orEmpty().count { !it.isRead && (type == null || it.type == type) }
                SqChip(if (unread > 0) "$label ($unread)" else label, filter == type) { filter = type }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        // Lọc phía client trên 50 thông báo mới nhất - đủ cho lượng thông báo trong ngày của một quán.
        val shown = items.orEmpty().filter { filter == null || it.type == filter }
        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            shown.isEmpty() && tasks.isEmpty() -> EmptyState("Chưa có thông báo", "Đơn mới, khiếu nại và nhắc việc sẽ hiện ở đây.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (filter == null && tasks.isNotEmpty()) {
                    item { Text("Việc cần làm", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = SqInk) }
                    items(tasks, key = { "task-" + it.id }) { t -> TaskRow(t, onNavigate) }
                    item { Text("Thông báo", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.padding(top = 6.dp)) }
                }
                items(shown, key = { it.id }) { n -> NotificationRow(n) { open(n) } }
            }
        }
    }
}

@Composable
private fun NotificationRow(n: NotificationDto, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(if (n.isRead) SqSurface else SqCoralWash.copy(alpha = 0.4f))
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        val (icon, tint) = when (n.type) {
            "ORDER", "PICKUP_REMINDER" -> Icons.Default.ShoppingBag to SqCoral
            "COMPLAINT" -> Icons.Default.ReportProblem to SqCoralDeep
            "REVIEW" -> Icons.Default.Star to SqButter
            "PRICE_PROPOSAL" -> Icons.Default.LocalOffer to SqMintDeep
            else -> Icons.Default.Info to SqInkSoft
        }
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(SqSurfaceSoft), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
            if (!n.isRead) Box(Modifier.align(Alignment.TopEnd).size(9.dp).clip(CircleShape).background(SqCoral))
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = n.title, fontSize = 14.sp, fontWeight = if (n.isRead) FontWeight.Medium else FontWeight.Bold, color = SqInk)
            Spacer(modifier = Modifier.height(2.dp))
            Text(text = n.body, fontSize = 12.sp, color = SqInkSoft)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = localTime(n.createdAt), fontSize = 11.sp, color = SqInkMuted)
        }
    }
}
