package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.SubscriptionDto
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

// shortcut: backend không có API danh mục gói - giá 300.000đ hardcode trong subscriptions.service.ts,
// hoa hồng từ platform setting commission.rate, hạn mức từ quota.constants.ts. Đổi sang API khi backend có.
internal const val PRO_PRICE_VND = 300_000L
private val PLAN_ROWS = listOf(
    Triple("Giá tháng", "Miễn phí", currency(PRO_PRICE_VND)),
    Triple("Hoa hồng / đơn", "10%", "10%"),
    Triple("Định giá tự động", "—", "Có"),
    Triple("Suất mở / ngày", "20", "100"),
    Triple("AI phân tích ảnh / tháng", "20", "300"),
    Triple("Hỏi đáp AI / tháng", "10", "300"),
    Triple("AI soạn nội dung / tháng", "10", "200"),
    Triple("Xuất báo cáo / tháng", "3", "30"),
    Triple("Nhân viên", "1", "5"),
)

internal val PLAN_LABELS = mapOf("BASIC" to "Cơ bản", "TRIAL" to "Dùng thử Pro", "PRO" to "Pro")

/** S16 - Gói dịch vụ (GET store/subscription/current, POST upgrade/downgrade). */
@Composable
fun SubscriptionScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    var sub by remember { mutableStateOf<SubscriptionDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var acting by remember { mutableStateOf(false) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var confirm by remember { mutableStateOf<String?>(null) } // "upgrade" | "downgrade"
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getSubscription()
            isLoading = false
            result.fold(onSuccess = { sub = it }, onFailure = { error = it.message })
        }
    }

    fun act(kind: String) {
        acting = true
        actionError = null
        scope.launch {
            val result = if (kind == "upgrade") repository.upgradeSubscription() else repository.downgradeSubscription()
            acting = false
            result.fold(onSuccess = { sub = it }, onFailure = { actionError = it.message })
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Gói dịch vụ", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            sub != null -> {
                val s = sub!!
                SqCard {
                    Text("Gói hiện tại", fontSize = 12.sp, color = SqInkMuted)
                    Text(PLAN_LABELS[s.plan] ?: s.plan, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep)
                    if (s.plan != "BASIC") {
                        Text(
                            "${if (s.isTrial) "Dùng thử đến" else "Hết hạn"} ${shortDate(s.periodEnd)} · còn ${s.daysRemaining} ngày",
                            fontSize = 13.sp, color = SqInkSoft
                        )
                    }
                    if (s.downgradeAtPeriodEnd) {
                        Text("Sẽ chuyển về gói Cơ bản khi hết kỳ.", fontSize = 12.sp, color = SqCoralDeep)
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    Row {
                        Text("", modifier = Modifier.weight(1.4f))
                        Text("Cơ bản", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SqInk)
                        Text("Pro", modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = SqCoralDeep)
                    }
                    HorizontalDivider(color = SqLine, modifier = Modifier.padding(vertical = 8.dp))
                    PLAN_ROWS.forEach { (label, basic, pro) ->
                        Row(modifier = Modifier.padding(vertical = 4.dp)) {
                            Text(label, modifier = Modifier.weight(1.4f), fontSize = 12.sp, color = SqInkSoft)
                            Text(basic, modifier = Modifier.weight(1f), fontSize = 13.sp, color = SqInk)
                            Text(pro, modifier = Modifier.weight(1f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                InlineError(actionError)

                if (s.plan != "PRO") {
                    PrimaryButton("Nâng cấp lên Pro", loading = acting) { confirm = "upgrade" }
                } else {
                    PrimaryButton("Gia hạn gói Pro") { onNavigate("subscription-renew") }
                }
                if (s.plan != "BASIC" && !s.downgradeAtPeriodEnd) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedButton(onClick = { confirm = "downgrade" }, enabled = !acting, modifier = Modifier.fillMaxWidth()) {
                        Text("Hạ về gói Cơ bản", color = SqInkSoft)
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = { onNavigate("invoices") }) { Text("Hóa đơn gói", color = SqCoral) }
                    TextButton(onClick = { onNavigate("quotas") }) { Text("Hạn mức sử dụng", color = SqCoral) }
                }
            }
        }
    }

    confirm?.let { kind ->
        val s = sub
        AlertDialog(
            onDismissRequest = { confirm = null },
            containerColor = SqSurface,
            title = { Text(if (kind == "upgrade") "Nâng cấp lên Pro?" else "Hạ về gói Cơ bản?", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    when {
                        kind == "upgrade" -> "Phí ${currency(PRO_PRICE_VND)} cho 30 ngày, tính từ hôm nay."
                        s?.isTrial == true -> "Dùng thử kết thúc ngay. Định giá tự động sẽ tắt và nhân viên vượt hạn mức bị khóa."
                        else -> "Bạn vẫn dùng Pro đến ${shortDate(s?.periodEnd)}, sau đó chuyển về Cơ bản."
                    },
                    fontSize = 13.sp, color = SqInkSoft
                )
            },
            confirmButton = { TextButton(onClick = { confirm = null; act(kind) }) { Text("Xác nhận", color = SqCoralDeep) } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Hủy", color = SqInkSoft) } }
        )
    }
}
