package com.surplusiq.app.ui.screens.support

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.SupportTicketResponse
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportTicketListScreen(
    tickets: List<SupportTicketResponse>,
    isLoading: Boolean,
    errorMessage: String?,
    onBackClick: () -> Unit,
    onTicketClick: (SupportTicketResponse) -> Unit,
    onCreateTicket: (subject: String, message: String) -> Unit,
    modifier: Modifier = Modifier
) {
    var showCreateDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = { Text("Yêu cầu hỗ trợ", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                IconButton(onClick = { showCreateDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Tạo yêu cầu mới")
                }
            }
        )

        Box(modifier = Modifier.fillMaxSize()) {
            when {
                isLoading && tickets.isEmpty() -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                errorMessage != null && tickets.isEmpty() -> {
                    Text(
                        text = errorMessage,
                        color = CoralRed,
                        modifier = Modifier.align(Alignment.Center).padding(24.dp)
                    )
                }
                tickets.isEmpty() -> {
                    Text(
                        text = "Bạn chưa có yêu cầu hỗ trợ nào. Nhấn + để tạo yêu cầu mới.",
                        color = TextMuted,
                        fontSize = 13.sp,
                        modifier = Modifier.align(Alignment.Center).padding(24.dp)
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(tickets) { ticket ->
                            SupportTicketRow(ticket = ticket, onClick = { onTicketClick(ticket) })
                        }
                    }
                }
            }
        }
    }

    if (showCreateDialog) {
        CreateSupportTicketDialog(
            onDismiss = { showCreateDialog = false },
            onSubmit = { subject, message ->
                showCreateDialog = false
                onCreateTicket(subject, message)
            }
        )
    }
}

@Composable
private fun SupportTicketRow(ticket: SupportTicketResponse, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = ticket.subject,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                TicketStatusBadge(status = ticket.status)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "Cập nhật: ${ticket.updatedAt ?: ticket.createdAt ?: ""}",
                fontSize = 11.sp,
                color = TextSecondary
            )
        }
    }
}

@Composable
private fun TicketStatusBadge(status: String) {
    val (label, color) = when (status) {
        "OPEN" -> "Đang mở" to ForestGreenPrimary
        "IN_PROGRESS" -> "Đang xử lý" to ForestGreenPrimary
        "ANSWERED" -> "Đã phản hồi" to ForestGreenPrimary
        "CLOSED" -> "Đã đóng" to TextMuted
        else -> status to TextMuted
    }
    Box(
        modifier = Modifier
            .background(color.copy(alpha = 0.12f), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(text = label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = color)
    }
}

@Composable
private fun CreateSupportTicketDialog(
    onDismiss: () -> Unit,
    onSubmit: (subject: String, message: String) -> Unit
) {
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Tạo yêu cầu hỗ trợ") },
        text = {
            Column {
                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Tiêu đề") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = message,
                    onValueChange = { message = it },
                    label = { Text("Nội dung chi tiết") },
                    minLines = 3,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSubmit(subject.trim(), message.trim()) },
                enabled = subject.isNotBlank() && message.isNotBlank()
            ) {
                Text("Gửi", fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Hủy")
            }
        }
    )
}
