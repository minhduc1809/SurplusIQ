package com.surplusiq.app.ui.screens.alerts

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.DealAlert
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.SwipeToDeleteBox
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.DealAlertsUiState
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val DATE_TIME_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")

/** K19 Danh sách cảnh báo deal (R1-032). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DealAlertsScreen(
    state: DealAlertsUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onCreate: () -> Unit,
    onEdit: (DealAlert) -> Unit,
    onToggle: (DealAlert, Boolean) -> Unit,
    onDelete: (DealAlert) -> Unit,
    onConsumeMessage: () -> Unit
) {
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cảnh báo deal", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onCreate, containerColor = ForestGreenPrimary, contentColor = MaterialTheme.colorScheme.onPrimary) {
                Icon(Icons.Default.Add, contentDescription = "Tạo cảnh báo")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LoadStateContent(
            isLoading = state.isLoading,
            errorMessage = state.errorMessage,
            isEmpty = state.alerts.isEmpty(),
            emptyIcon = Icons.Default.NotificationsNone,
            emptyTitle = "Chưa có cảnh báo nào",
            emptyMessage = "Tạo cảnh báo theo danh mục, cửa hàng, giá hoặc mức giảm để không bỏ lỡ deal phù hợp.",
            onRetry = onRetry,
            modifier = Modifier.padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 88.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(state.alerts, key = { it.id }) { alert ->
                    SwipeToDeleteBox("Xóa cảnh báo", onDelete = { onDelete(alert) }) {
                        DealAlertCard(alert, onClick = { onEdit(alert) }, onToggle = { onToggle(alert, it) })
                    }
                }
            }
        }
    }
}

@Composable
private fun DealAlertCard(alert: DealAlert, onClick: () -> Unit, onToggle: (Boolean) -> Unit) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    alertSummary(alert.criteria),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (alert.isActive) TextPrimary else TextMuted
                )
                Spacer(Modifier.height(4.dp))
                val lastTriggered = alert.lastTriggeredAt?.let {
                    runCatching { Instant.parse(it).atZone(ZoneId.systemDefault()).format(DATE_TIME_FORMAT) }.getOrNull()
                }
                Text(
                    if (alert.triggeredCount == 0) "Chưa kích hoạt lần nào"
                    else "Đã kích hoạt ${alert.triggeredCount} lần" + (lastTriggered?.let { " · Gần nhất $it" } ?: ""),
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
            Switch(checked = alert.isActive, onCheckedChange = onToggle)
        }
    }
}
