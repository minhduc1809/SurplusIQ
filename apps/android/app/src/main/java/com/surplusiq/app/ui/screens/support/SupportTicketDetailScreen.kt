package com.surplusiq.app.ui.screens.support

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.SupportMessageResponse
import com.surplusiq.app.data.remote.dto.SupportTicketDetailResponse
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportTicketDetailScreen(
    detail: SupportTicketDetailResponse?,
    isLoading: Boolean,
    errorMessage: String?,
    isSending: Boolean,
    onBackClick: () -> Unit,
    onSendMessage: (String) -> Unit,
    onCloseTicket: () -> Unit,
    modifier: Modifier = Modifier
) {
    var draft by remember { mutableStateOf("") }
    val isClosed = detail?.ticket?.status == "CLOSED"

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(
                    text = detail?.ticket?.subject ?: "Chi tiết yêu cầu hỗ trợ",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    maxLines = 1
                )
            },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            },
            actions = {
                if (detail != null && !isClosed) {
                    TextButton(onClick = onCloseTicket) {
                        Text("Đóng yêu cầu", color = CoralRed, fontSize = 13.sp)
                    }
                }
            }
        )

        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when {
                isLoading && detail == null -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }
                errorMessage != null && detail == null -> {
                    Text(
                        text = errorMessage,
                        color = CoralRed,
                        modifier = Modifier.align(Alignment.Center).padding(24.dp)
                    )
                }
                detail != null -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(detail.messages) { message ->
                            MessageBubble(message = message, isMine = message.senderId == detail.ticket.userId)
                        }
                    }
                }
            }
        }

        if (errorMessage != null && detail != null) {
            Text(
                text = errorMessage,
                color = CoralRed,
                fontSize = 12.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )
        }

        if (isClosed) {
            Text(
                text = "Yêu cầu hỗ trợ này đã đóng, không thể gửi thêm tin nhắn.",
                color = TextMuted,
                fontSize = 12.sp,
                modifier = Modifier.padding(16.dp)
            )
        } else if (detail != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    placeholder = { Text("Nhập tin nhắn...") },
                    modifier = Modifier.weight(1f),
                    maxLines = 4
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (draft.isNotBlank()) {
                            onSendMessage(draft.trim())
                            draft = ""
                        }
                    },
                    enabled = !isSending && draft.isNotBlank()
                ) {
                    Icon(Icons.Default.Send, contentDescription = "Gửi", tint = ForestGreenPrimary)
                }
            }
        }
    }
}

@Composable
private fun MessageBubble(message: SupportMessageResponse, isMine: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start
    ) {
        Column(
            modifier = Modifier
                .background(
                    if (isMine) ForestGreenPrimary else MaterialTheme.colorScheme.surfaceVariant,
                    RoundedCornerShape(14.dp)
                )
                .padding(horizontal = 14.dp, vertical = 10.dp)
                .widthIn(max = 280.dp)
        ) {
            Text(
                text = message.message,
                fontSize = 14.sp,
                color = if (isMine) Color.White else TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = message.createdAt ?: "",
                fontSize = 10.sp,
                color = if (isMine) Color.White.copy(alpha = 0.7f) else TextSecondary
            )
        }
    }
}
