package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.ui.theme.ForestGreenPrimary

/** Màn duy nhất dùng được khi tài khoản đang chờ xóa: hủy yêu cầu hoặc đăng xuất. */
@Composable
fun PendingDeleteScreen(
    scheduledAt: String?,
    isBusy: Boolean,
    message: String?,
    onCancelDelete: () -> Unit,
    onLogout: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Tài khoản đang chờ xóa", fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(12.dp))
        Text(
            if (scheduledAt.isNullOrBlank()) "Tài khoản sẽ bị xóa sau 7 ngày kể từ lúc gửi yêu cầu."
            else "Tài khoản sẽ bị xóa vào ${scheduledAt.take(10)}. Bạn có thể hủy yêu cầu trước thời điểm này.",
            textAlign = TextAlign.Center
        )
        if (!message.isNullOrBlank()) {
            Spacer(Modifier.height(8.dp))
            Text(message, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.error)
        }
        Spacer(Modifier.height(24.dp))
        Button(
            onClick = onCancelDelete,
            enabled = !isBusy,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
        ) { Text("Hủy yêu cầu xóa") }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onLogout, enabled = !isBusy, modifier = Modifier.fillMaxWidth()) { Text("Đăng xuất") }
    }
}
