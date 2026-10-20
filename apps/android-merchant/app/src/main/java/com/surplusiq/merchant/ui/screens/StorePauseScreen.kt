package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/**
 * S11 - Tạm ngưng / mở lại (POST store/pause-today, store/resume-today).
 * Backend chỉ hỗ trợ tạm ngưng trong hôm nay, không nhận lý do hay ngày mở lại -> nghỉ dài ngày dùng Lịch cửa hàng.
 */
@Composable
fun StorePauseScreen(repository: StoreRepository, onOpenSchedule: () -> Unit, onBack: () -> Unit) {
    var isPaused by remember { mutableStateOf<Boolean?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var acting by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    var showConfirm by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getStoreProfile()
            isLoading = false
            result.fold(onSuccess = { isPaused = it.isPausedToday }, onFailure = { error = it.message })
        }
    }

    fun act(pause: Boolean) {
        acting = true
        actionError = null
        success = null
        scope.launch {
            val result = if (pause) repository.pauseToday() else repository.resumeToday()
            acting = false
            result.fold(
                onSuccess = { isPaused = pause; success = it.message },
                onFailure = { actionError = it.message }
            )
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(20.dp)) {
        ScreenHeader("Trạng thái cửa hàng", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            isPaused != null -> {
                val paused = isPaused!!
                Column(
                    modifier = Modifier.fillMaxWidth()
                        .background(if (paused) SqCoralWash else SqMintWash, RoundedCornerShape(20.dp))
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = if (paused) "Đang tạm ngưng" else "Đang mở bán",
                        fontSize = 26.sp, fontWeight = FontWeight.ExtraBold,
                        color = if (paused) SqCoralDeep else SqMintDeep
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = if (paused) "Cửa hàng không nhận đơn mới trong hôm nay." else "Khách đang có thể đặt các suất bạn mở.",
                        fontSize = 13.sp, color = SqInkSoft
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                InlineError(actionError)
                InlineSuccess(success)
                Spacer(modifier = Modifier.height(8.dp))
                if (paused) {
                    PrimaryButton("Mở lại cửa hàng", loading = acting, color = SqMintDeep) { act(false) }
                } else {
                    PrimaryButton("Tạm ngưng hôm nay", loading = acting) { showConfirm = true }
                }
                Spacer(modifier = Modifier.height(8.dp))
                TextButton(onClick = onOpenSchedule, modifier = Modifier.fillMaxWidth()) {
                    Text("Nghỉ nhiều ngày? Khai báo trong Lịch cửa hàng", color = SqCoral)
                }
            }
        }
    }

    if (showConfirm) {
        AlertDialog(
            onDismissRequest = { showConfirm = false },
            containerColor = SqSurface,
            title = { Text("Tạm ngưng nhận đơn hôm nay?", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "• Tất cả suất đang mở sẽ bị đóng và ẩn khỏi bản đồ.\n" +
                        "• Đơn đã thanh toán vẫn giữ nguyên, xử lý theo chính sách hiện hành.\n" +
                        "• Bạn có thể mở lại bất cứ lúc nào trong ngày.",
                    fontSize = 13.sp, color = SqInkSoft
                )
            },
            confirmButton = {
                TextButton(onClick = { showConfirm = false; act(true) }) { Text("Tạm ngưng", color = SqCoralDeep) }
            },
            dismissButton = {
                TextButton(onClick = { showConfirm = false }) { Text("Hủy", color = SqInkSoft) }
            }
        )
    }
}
