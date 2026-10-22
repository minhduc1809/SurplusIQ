package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.PlanCatalogDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.SubscriptionDto
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Icon
import androidx.compose.ui.graphics.Color
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

/** Giá dự phòng khi chưa tải được danh mục gói; giá thật lấy từ GET store/subscription/catalog. */
internal const val PRO_PRICE_VND = 300_000L

private val QUOTA_LABELS = mapOf(
    "daily_offers" to "Suất mở bán mỗi ngày", "csv_import_lines" to "Dòng nhập CSV mỗi lần", "active_promotions" to "Ưu đãi chạy cùng lúc",
    "campaigns_per_month" to "Chiến dịch thông báo / tháng", "export_orders" to "Xuất đơn hàng / tháng", "export_reports" to "Xuất báo cáo / tháng",
    "ai_chat_query" to "Hỏi đáp AI / tháng", "ai_content_gen" to "AI soạn nội dung / tháng", "ai_image_scan" to "AI phân tích ảnh / tháng", "active_staff" to "Nhân viên"
)

internal val PLAN_LABELS = mapOf("BASIC" to "Cơ bản", "TRIAL" to "Dùng thử Chuyên nghiệp", "PRO" to "Chuyên nghiệp")

/** S16 - Gói dịch vụ (GET store/subscription/current, POST upgrade/downgrade). */
@Composable
fun SubscriptionScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    var sub by remember { mutableStateOf<SubscriptionDto?>(null) }
    var catalog by remember { mutableStateOf<PlanCatalogDto?>(null) }
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
            val cat = repository.getPlanCatalog()
            isLoading = false
            cat.onSuccess { catalog = it }
            result.fold(onSuccess = { sub = it }, onFailure = { error = it.message })
            cat.exceptionOrNull()?.let { if (error == null) error = it.message }
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

                catalog?.let { c -> PlanComparison(c, current = s.plan) }
                Spacer(modifier = Modifier.height(12.dp))
                InlineError(actionError)

                if (s.plan != "PRO") {
                    PrimaryButton("Nâng cấp lên Chuyên nghiệp", loading = acting) { confirm = "upgrade" }
                } else {
                    PrimaryButton("Gia hạn gói Chuyên nghiệp") { onNavigate("subscription-renew") }
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
            title = { Text(if (kind == "upgrade") "Nâng cấp lên Chuyên nghiệp?" else "Hạ về gói Cơ bản?", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    when {
                        kind == "upgrade" -> "Phí ${currency(catalog?.proPriceVnd ?: PRO_PRICE_VND)} cho ${catalog?.periodDays ?: 30} ngày, tính từ hôm nay."
                        s?.isTrial == true -> "Dùng thử kết thúc ngay. Định giá tự động sẽ tắt và nhân viên vượt hạn mức bị khóa."
                        else -> "Bạn vẫn dùng Chuyên nghiệp đến ${shortDate(s?.periodEnd)}, sau đó chuyển về Cơ bản."
                    },
                    fontSize = 13.sp, color = SqInkSoft
                )
            },
            confirmButton = { TextButton(onClick = { confirm = null; act(kind) }) { Text("Xác nhận", color = SqCoralDeep) } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Hủy", color = SqInkSoft) } }
        )
    }
}

@Composable
private fun PlanComparison(c: PlanCatalogDto, current: String) {
    val rate = c.commissionRate?.let { r -> (r * 100).let { if (it % 1.0 == 0.0) "${it.toInt()}%" else "$it%" } } ?: "—"
    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Spacer(Modifier.weight(1.4f))
            PlanHeader("Cơ bản", current == "BASIC", SqInk, Modifier.weight(1f))
            PlanHeader("Chuyên nghiệp", current != "BASIC", SqCoralDeep, Modifier.weight(1f))
        }
        HorizontalDivider(color = SqLine, modifier = Modifier.padding(vertical = 8.dp))
        PlanSection("Chi phí")
        PlanRow("Giá gói", "Miễn phí", "${currency(c.proPriceVnd)} / ${c.periodDays} ngày")
        PlanRow("Hoa hồng mỗi đơn", rate, rate)
        PlanSection("Hạn mức sử dụng")
        c.quotas.forEach { q -> PlanRow(QUOTA_LABELS[q.key] ?: q.name, "${q.basic}", "${q.pro}") }
        PlanRow("Xem lịch sử báo cáo", "${c.reportHistoryDays.basic} ngày", "${c.reportHistoryDays.pro} ngày")
        PlanSection("Chỉ có ở Chuyên nghiệp")
        c.proFeatures.forEach { f ->
            Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(f.name, Modifier.weight(1.4f), fontSize = 12.sp, color = SqInkSoft)
                Icon(Icons.Default.Lock, contentDescription = "Không có ở gói Cơ bản", tint = SqInkMuted, modifier = Modifier.weight(1f).size(16.dp))
                Icon(Icons.Default.CheckCircle, contentDescription = "Có ở gói Chuyên nghiệp", tint = SqMintDeep, modifier = Modifier.weight(1f).size(18.dp))
            }
        }
    }
}

@Composable
private fun PlanHeader(label: String, active: Boolean, color: Color, modifier: Modifier) {
    Column(modifier) {
        Text(label, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = color)
        if (active) Text("Đang dùng", fontSize = 10.sp, color = SqMintDeep, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PlanSection(title: String) {
    Text(title, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqInkMuted, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
}

@Composable
private fun PlanRow(label: String, basic: String, pro: String) {
    Row(Modifier.padding(vertical = 4.dp)) {
        Text(label, Modifier.weight(1.4f), fontSize = 12.sp, color = SqInkSoft)
        Text(basic, Modifier.weight(1f), fontSize = 13.sp, color = SqInk)
        Text(pro, Modifier.weight(1f), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
    }
}
