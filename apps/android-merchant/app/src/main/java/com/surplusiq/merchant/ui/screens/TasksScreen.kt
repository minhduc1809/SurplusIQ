package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.TaskDto
import com.surplusiq.merchant.data.TaskReminders
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.UpdateTaskRemindersRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * actionUrl backend (đường dẫn web) -> route NavHost của app.
 */
fun taskRoute(actionUrl: String): String? = when (actionUrl) {
    "/offers" -> "offers"
    "/complaints" -> "complaints"
    "/forecasting" -> "forecast-actuals"
    else -> null
}

/** S07 - Việc cần làm hôm nay (GET store/tasks/today) + cấu hình nhắc việc (PUT store/tasks/reminders). */
@Composable
fun TasksScreen(repository: StoreRepository, onNavigate: (String) -> Unit) {
    var tasks by remember { mutableStateOf<List<TaskDto>?>(null) }
    var reminders by remember { mutableStateOf<TaskReminders?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var saveError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getTodayTasks()
            isLoading = false
            result.fold(onSuccess = { tasks = it.tasks; reminders = it.reminders }, onFailure = { error = it.message })
        }
    }

    fun saveReminders(updated: TaskReminders, request: UpdateTaskRemindersRequest) {
        val previous = reminders
        reminders = updated
        saveError = null
        scope.launch {
            repository.updateTaskReminders(request).onFailure { reminders = previous; saveError = it.message }
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(20.dp)) {
        Text(text = "Việc cần làm hôm nay", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Spacer(modifier = Modifier.height(16.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(tasks.orEmpty()) { task -> TaskRow(task, onNavigate) }
                reminders?.let { r ->
                    item {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(top = 10.dp).clip(RoundedCornerShape(16.dp)).background(SqSurface).padding(16.dp)
                        ) {
                            Text(text = "Cấu hình nhắc việc", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SqInk)
                            Text(text = "Giờ nhắc: ${r.reminderTime}", fontSize = 12.sp, color = SqInkSoft)
                            ReminderSwitch("Nhắc nhập số thực tế cuối ngày", r.actualsEntry) {
                                saveReminders(r.copy(actualsEntry = it), UpdateTaskRemindersRequest(actualsEntryReminder = it))
                            }
                            ReminderSwitch("Nhắc duyệt đề xuất giá", r.priceReview) {
                                saveReminders(r.copy(priceReview = it), UpdateTaskRemindersRequest(priceReviewReminder = it))
                            }
                            if (saveError != null) ErrorBanner(saveError ?: "")
                        }
                    }
                }
            }
        }
    }
}

/** Mức khẩn: backend chỉ có cờ urgent + count -> Cao (urgent) / Vừa (còn việc) / Thấp. */
@Composable
fun TaskRow(task: TaskDto, onNavigate: (String) -> Unit) {
    val (label, bg, fg) = when {
        task.urgent -> Triple("Cao", SqCoralWash, SqCoralDeep)
        task.count > 0 -> Triple("Vừa", SqButterWash, SqInk)
        else -> Triple("Thấp", SqSurfaceSoft, SqInkMuted)
    }
    val icon = when (task.id) {
        "complaints_review" -> Icons.Default.ReportProblem
        "active_offers_monitoring" -> Icons.Default.Inventory2
        "daily_actuals" -> Icons.Default.EditNote
        else -> Icons.AutoMirrored.Filled.Assignment
    }
    Row(
        modifier = Modifier.fillMaxWidth().sqSurface(20.dp).padding(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(bg), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = fg)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = "${task.title} (${task.count})", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk, modifier = Modifier.weight(1f))
                Text(
                    text = label,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = fg,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 8.dp, vertical = 2.dp)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = task.description, fontSize = 12.sp, color = SqInkSoft)
            taskRoute(task.actionUrl)?.let { route ->
                TextButton(onClick = { onNavigate(route) }, contentPadding = PaddingValues(0.dp)) {
                    Text(text = "Xử lý ngay", color = SqCoral, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}

@Composable
private fun ReminderSwitch(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(text = label, fontSize = 14.sp, color = SqInk, modifier = Modifier.weight(1f))
        Switch(
            checked = checked,
            onCheckedChange = onChange,
            colors = SwitchDefaults.colors(checkedThumbColor = Color.White, checkedTrackColor = SqCoral)
        )
    }
}
