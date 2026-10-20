package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.QuotaDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/** S19 - Hạn mức sử dụng (GET store/subscription/quotas -> map quotaKey -> QuotaCheckResult). */
@Composable
fun UsageQuotasScreen(repository: StoreRepository, onUpgrade: () -> Unit, onBack: () -> Unit) {
    var quotas by remember { mutableStateOf<List<QuotaDto>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getQuotas()
            isLoading = false
            result.fold(onSuccess = { quotas = it.values.toList() }, onFailure = { error = it.message })
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(20.dp)) {
        ScreenHeader("Hạn mức sử dụng", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            quotas.isNullOrEmpty() -> EmptyState("Chưa có hạn mức", "Không có dữ liệu hạn mức cho gói hiện tại.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(quotas!!) { q -> QuotaCard(q, onUpgrade) }
            }
        }
    }
}

@Composable
private fun QuotaCard(q: QuotaDto, onUpgrade: () -> Unit) {
    val ratio = if (q.limit > 0) q.used.toFloat() / q.limit else 0f
    val color = when {
        q.isExceeded || ratio >= 1f -> SqError
        ratio >= 0.8f -> SqCoral
        else -> SqMint
    }
    SqCard {
        Text(q.name, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
        Spacer(modifier = Modifier.height(8.dp))
        LinearProgressIndicator(
            progress = { ratio.coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(8.dp),
            color = color,
            trackColor = SqSurfaceSoft
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Text("Đã dùng ${q.used}/${q.limit} · còn ${q.remaining}", fontSize = 12.sp, color = color)
            Text(
                when (q.period) {
                    "PER_REQUEST" -> "Áp dụng mỗi lần"
                    "EXISTENCE" -> "Tính số đang hoạt động"
                    else -> q.resetsAt?.let { "Đặt lại ${shortDate(it)}" } ?: ""
                },
                fontSize = 11.sp, color = SqInkMuted
            )
        }
        if (q.isExceeded || ratio >= 1f) {
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(onClick = onUpgrade) { Text("Nâng cấp", color = SqCoralDeep) }
        }
    }
}
