package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.LoginSession
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.LabelValueRow
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.SectionCard
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDateTime
import com.surplusiq.app.ui.viewmodel.SecurityUiState

/** K55 Xác thực hai bước (R1-013). */
@Composable
fun TwoFactorScreen(
    state: SecurityUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onToggle: (enabled: Boolean, password: String) -> Unit,
    onConsumeMessage: () -> Unit
) {
    val snackbar = remember { SnackbarHostState() }
    var askPasswordFor by remember { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(state.message) {
        state.message?.let { snackbar.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(
        topBar = { BackTopBar("Xác thực hai bước", onBackClick) },
        snackbarHost = { SnackbarHost(snackbar) }
    ) { padding ->
        val status = state.twoFactor
        LoadStateContent(
            isLoading = state.isLoading,
            errorMessage = state.errorMessage,
            isEmpty = status == null,
            emptyIcon = Icons.Default.PhoneAndroid,
            emptyTitle = "Chưa có dữ liệu",
            emptyMessage = "Không đọc được trạng thái bảo mật của tài khoản.",
            modifier = Modifier.padding(padding),
            onRetry = onRetry
        ) {
            if (status == null) return@LoadStateContent
            Column(Modifier.padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                SectionCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Trạng thái", fontWeight = FontWeight.Bold, fontSize = 15.sp, modifier = Modifier.weight(1f))
                        StatusChip(if (status.enabled) "Đang bật" else "Đang tắt", if (status.enabled) ForestGreenPrimary else TextSecondary)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Khi bật, mỗi lần đăng nhập trên thiết bị mới bạn cần nhập mã 6 số gửi tới ${status.target ?: "tài khoản của bạn"}. " +
                            "Thiết bị đã xác thực được tin cậy ${status.trustedDeviceDays} ngày.",
                        fontSize = 13.sp,
                        color = TextSecondary,
                        lineHeight = 19.sp
                    )
                    status.target?.let { LabelValueRow("Nơi nhận mã", it) }
                }
                Button(
                    onClick = { askPasswordFor = !status.enabled },
                    enabled = !state.isSaving,
                    colors = ButtonDefaults.buttonColors(containerColor = if (status.enabled) CoralRed else ForestGreenPrimary),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) { Text(if (status.enabled) "Tắt xác thực 2 bước" else "Bật xác thực 2 bước") }
            }
        }
    }

    askPasswordFor?.let { enable ->
        var password by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { askPasswordFor = null },
            title = { Text(if (enable) "Bật xác thực 2 bước" else "Tắt xác thực 2 bước") },
            text = {
                Column {
                    Text("Nhập lại mật khẩu hiện tại để xác nhận.", fontSize = 13.sp, color = TextSecondary)
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Mật khẩu hiện tại") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation()
                    )
                }
            },
            confirmButton = {
                TextButton(
                    enabled = password.isNotBlank() && !state.isSaving,
                    onClick = { onToggle(enable, password); askPasswordFor = null }
                ) { Text("Xác nhận") }
            },
            dismissButton = { TextButton(onClick = { askPasswordFor = null }) { Text("Hủy") } }
        )
    }
}

/** K56 Thiết bị đăng nhập (R1-014): xem và đăng xuất từ xa từng thiết bị. */
@Composable
fun DevicesScreen(
    state: SecurityUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onRevoke: (LoginSession) -> Unit,
    onConsumeMessage: () -> Unit
) {
    val snackbar = remember { SnackbarHostState() }
    var pending by remember { mutableStateOf<LoginSession?>(null) }
    LaunchedEffect(state.message) {
        state.message?.let { snackbar.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(
        topBar = { BackTopBar("Thiết bị đăng nhập", onBackClick) },
        snackbarHost = { SnackbarHost(snackbar) }
    ) { padding ->
        LoadStateContent(
            isLoading = state.isLoading,
            errorMessage = state.errorMessage,
            isEmpty = state.sessions.isEmpty(),
            emptyIcon = Icons.Default.PhoneAndroid,
            emptyTitle = "Không có phiên đăng nhập",
            emptyMessage = "Chưa có thiết bị nào đang đăng nhập.",
            modifier = Modifier.padding(padding),
            onRetry = onRetry
        ) {
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(state.sessions, key = { it.id }) { session ->
                    SectionCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.PhoneAndroid, contentDescription = null, tint = ForestGreenPrimary)
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(session.deviceName, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text(
                                    "Hoạt động gần nhất: ${formatDateTime(session.lastUsedAt)}",
                                    fontSize = 12.sp,
                                    color = TextSecondary
                                )
                                session.ip?.let { Text("Địa chỉ IP: $it", fontSize = 12.sp, color = TextSecondary) }
                            }
                            if (session.isCurrent) StatusChip("Thiết bị này", ForestGreenPrimary)
                        }
                        if (!session.isCurrent) {
                            TextButton(onClick = { pending = session }, enabled = !state.isSaving) {
                                Text("Đăng xuất thiết bị", color = CoralRed)
                            }
                        }
                    }
                }
            }
        }
    }

    pending?.let { session ->
        AlertDialog(
            onDismissRequest = { pending = null },
            title = { Text("Đăng xuất thiết bị này?") },
            text = { Text("${session.deviceName} sẽ bị đăng xuất và phải nhập mã 2FA (nếu đang bật) khi đăng nhập lại.") },
            confirmButton = { TextButton(onClick = { onRevoke(session); pending = null }) { Text("Đăng xuất", color = CoralRed) } },
            dismissButton = { TextButton(onClick = { pending = null }) { Text("Hủy") } }
        )
    }
}
