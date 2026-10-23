package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.BoxWithConstraints
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

/** Khung chung bốn màn Gói dịch vụ: tiêu đề, nội dung căn giữa, bề rộng tối đa 760dp, cuộn dọc. */
@Composable
internal fun PlanFrame(title: String, onBack: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize().background(SqCanvas), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 760.dp).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp)) {
            ScreenHeader(title, onBack)
            Spacer(Modifier.height(12.dp))
            content()
            Spacer(Modifier.height(24.dp))
        }
    }
}

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

    PlanFrame("Gói dịch vụ", onBack) {
        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            sub != null -> {
                val s = sub!!
                CurrentPlanCard(s)
                Spacer(Modifier.height(14.dp))
                catalog?.let { c -> PlanComparison(c, current = s.plan) }
                Spacer(Modifier.height(14.dp))
                InlineError(actionError)
                if (s.plan != "PRO") PrimaryButton("Nâng cấp lên Chuyên nghiệp", loading = acting) { confirm = "upgrade" }
                else PrimaryButton("Gia hạn gói Chuyên nghiệp") { onNavigate("subscription-renew") }
                if (s.plan != "BASIC" && !s.downgradeAtPeriodEnd) {
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = { confirm = "downgrade" }, enabled = !acting, shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                        Text("Hạ về gói Cơ bản", color = SqInkSoft)
                    }
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SqChip("Hóa đơn gói", false) { onNavigate("invoices") }
                    SqChip("Hạn mức sử dụng", false) { onNavigate("quotas") }
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
private fun CurrentPlanCard(s: SubscriptionDto) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(SqCoralWash).padding(20.dp)) {
        Text("GÓI HIỆN TẠI", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep, letterSpacing = 0.6.sp)
        Text(PLAN_LABELS[s.plan] ?: s.plan, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.padding(top = 4.dp))
        if (s.plan != "BASIC") {
            Text("${if (s.isTrial) "Dùng thử đến" else "Hết hạn"} ${shortDate(s.periodEnd)}", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.padding(top = 2.dp))
            Spacer(Modifier.height(10.dp))
            LinearProgressIndicator(
                progress = { (s.daysRemaining / 30f).coerceIn(0f, 1f) },
                modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)),
                color = SqCoral, trackColor = androidx.compose.ui.graphics.Color.White
            )
            Text("Còn ${s.daysRemaining} ngày", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = SqInk, modifier = Modifier.padding(top = 6.dp))
        }
        if (s.downgradeAtPeriodEnd) Text("Sẽ chuyển về gói Cơ bản khi hết kỳ.", fontSize = 12.sp, color = SqCoralDeep, modifier = Modifier.padding(top = 8.dp))
    }
}

/** So sánh hai gói: hai thẻ cạnh nhau từ 600dp, xếp dọc trên điện thoại; mỗi dòng là nhãn bên trái, giá trị bên phải nên không bị bóp cột. */
@Composable
private fun PlanComparison(c: PlanCatalogDto, current: String) {
    val rate = c.commissionRate?.let { r -> (r * 100).let { if (it % 1.0 == 0.0) "${it.toInt()}%" else "$it%" } } ?: "—"
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val sideBySide = maxWidth >= 600.dp
        val basic: @Composable (Modifier) -> Unit = { m ->
            PlanCard("Cơ bản", current == "BASIC", m) {
                PlanRow("Giá gói", "Miễn phí")
                PlanRow("Hoa hồng mỗi đơn", rate)
                PlanSection("Hạn mức sử dụng")
                c.quotas.forEach { q -> PlanRow(QUOTA_LABELS[q.key] ?: q.name, "${q.basic}") }
                PlanRow("Xem lịch sử báo cáo", "${c.reportHistoryDays.basic} ngày")
            }
        }
        val pro: @Composable (Modifier) -> Unit = { m ->
            PlanCard("Chuyên nghiệp", current != "BASIC", m, highlight = true) {
                PlanRow("Giá gói", "${currency(c.proPriceVnd)} / ${c.periodDays} ngày", strong = true)
                PlanRow("Hoa hồng mỗi đơn", rate, strong = true)
                PlanSection("Hạn mức sử dụng")
                c.quotas.forEach { q -> PlanRow(QUOTA_LABELS[q.key] ?: q.name, "${q.pro}", strong = true) }
                PlanRow("Xem lịch sử báo cáo", "${c.reportHistoryDays.pro} ngày", strong = true)
                PlanSection("Chỉ có ở Chuyên nghiệp")
                c.proFeatures.forEach { f ->
                    Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = "Có ở gói Chuyên nghiệp", tint = SqCoral, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(f.name, fontSize = 13.sp, color = SqInk)
                    }
                }
            }
        }
        if (sideBySide) {
            Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                basic(Modifier.weight(1f).fillMaxHeight()); pro(Modifier.weight(1f).fillMaxHeight())
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { basic(Modifier.fillMaxWidth()); pro(Modifier.fillMaxWidth()) }
        }
    }
}

@Composable
private fun PlanCard(name: String, active: Boolean, modifier: Modifier, highlight: Boolean = false, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier.clip(RoundedCornerShape(20.dp)).background(SqSurface)
            .border(if (highlight) 1.5.dp else 1.dp, if (highlight) SqCoral else SqLine, RoundedCornerShape(20.dp)).padding(16.dp)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(name, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = if (highlight) SqCoralDeep else SqInk)
            if (active) Text(
                "Đang dùng", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(SqCoralWash).padding(horizontal = 10.dp, vertical = 3.dp)
            )
        }
        Spacer(Modifier.height(6.dp))
        content()
    }
}

@Composable
private fun PlanSection(title: String) {
    Text(title.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = SqInkMuted, letterSpacing = 0.5.sp, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
}

@Composable
private fun PlanRow(label: String, value: String, strong: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
        Text(label, Modifier.weight(1f).padding(end = 10.dp), fontSize = 13.sp, color = SqInkSoft)
        Text(value, fontSize = 13.sp, fontWeight = if (strong) FontWeight.Bold else FontWeight.SemiBold, color = SqInk, textAlign = androidx.compose.ui.text.style.TextAlign.End)
    }
}
