package com.surplusiq.merchant.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.PersonOff
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Paid
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.*
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import java.time.LocalDate

private val TABS = listOf("overview" to "Tổng quan", "finance" to "Tài chính", "items" to "Theo món", "hours" to "Theo giờ", "pricing" to "Hiệu quả giá", "compare" to "So sánh kỳ")
private val RANGES = listOf(7 to "7 ngày", 30 to "30 ngày", 90 to "90 ngày")

/** Backend lọc createdAt ≤ endDate lúc 00:00, nên lấy ngày mai để tính cả đơn hôm nay. */
private fun rangeOf(days: Int): Pair<String, String> {
    val today = LocalDate.now()
    return today.minusDays(days.toLong()).toString() to today.plusDays(1).toString()
}

/**
 * S46-S50 - Báo cáo kinh doanh (OWNER/MANAGER): tổng quan hao hụt và thu hồi, theo món, theo giờ,
 * hiệu quả đề xuất giá, so sánh hai kỳ. Dữ liệu lấy nguyên từ backend, không tự tính lại.
 */
@Composable
fun ReportsScreen(repository: StoreRepository, onUpgrade: () -> Unit, onBack: () -> Unit) {
    var tab by remember { mutableStateOf("overview") }
    var days by remember { mutableIntStateOf(7) }
    var basic by remember { mutableStateOf<Boolean?>(null) }
    LaunchedEffect(Unit) {
        repository.getSubscription().onSuccess { basic = (it.effectivePlan ?: it.plan) == "BASIC"; if (basic == false) days = 30 }
            .onFailure { basic = true }
    }
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Báo cáo kinh doanh", onBack)
        Spacer(Modifier.height(8.dp))
        ChipRow(TABS, tab) { tab = it }
        if (tab != "pricing" && tab != "compare") {
            Spacer(Modifier.height(6.dp))
            if (basic == true) Text("Gói Cơ bản xem được 7 ngày gần nhất. Chuyên nghiệp xem đến 365 ngày.", fontSize = 12.sp, color = SqInkSoft)
            else ChipRow(RANGES, days) { days = it }
        }
        Spacer(Modifier.height(12.dp))
        when {
            basic == null -> FullScreenLoading()
            tab == "overview" -> OverviewTab(repository, days)
            tab == "finance" -> FinanceTab(repository, days)
            tab == "items" -> ItemsTab(repository, days)
            tab == "hours" -> if (basic == true) ProLockCard("Báo cáo theo giờ", onUpgrade) else HoursTab(repository, days)
            tab == "pricing" -> if (basic == true) ProLockCard("Báo cáo hiệu quả giá", onUpgrade) else PricingTab(repository)
            else -> CompareTab(repository)
        }
    }
}

/** Tải một lần theo [key]; trả (dữ liệu, lỗi, thử lại). */
@Composable
private fun <T> rememberLoad(key: Any, load: suspend () -> Result<T>): Triple<T?, String?, () -> Unit> {
    var data by remember(key) { mutableStateOf<T?>(null) }
    var error by remember(key) { mutableStateOf<String?>(null) }
    var retry by remember(key) { mutableIntStateOf(0) }
    LaunchedEffect(key, retry) {
        data = null; error = null
        load().fold(onSuccess = { data = it }, onFailure = { error = it.message })
    }
    return Triple(data, error) { retry++ }
}

@Composable
private fun <T> Loaded(state: Triple<T?, String?, () -> Unit>, content: @Composable (T) -> Unit) {
    val (data, error, retry) = state
    when {
        error != null -> ErrorState(error, retry)
        data == null -> FullScreenLoading()
        else -> content(data)
    }
}

@Composable
private fun OverviewTab(repository: StoreRepository, days: Int) {
    Loaded(rememberLoad(days) { val (s, e) = rangeOf(days); repository.getReportsOverview(s, e) }) { r ->
        val s = r.summary
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Doanh thu", currency(s.grossRevenue), SqCoral, Modifier.weight(1f))
            MetricCard("Tổng đơn", "${s.totalOrders}", SqMint, Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        SqCard {
            SectionTitle("Thu hồi")
            InfoRow("Đơn đã nhận", "${s.completedOrders}")
            InfoRow("Suất cứu được", "${r.recovery.recoveredItemsCount}")
            InfoRow("Thực phẩm cứu được", "%.1f kg".format(s.foodSavedKg))
            InfoRow("CO₂ giảm", "%.1f kg".format(s.co2SavedKg))
            InfoRow("Tỷ lệ thu hồi", "%.1f%%".format(r.recovery.recoveryRatePercent), SqMintDeep)
        }
        Spacer(Modifier.height(10.dp))
        SectionTitle("Hao hụt")
        Spacer(Modifier.height(6.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PastelTile("Đơn hủy", Icons.Default.Cancel, "${r.waste.cancelledCount}", "trong kỳ", TileTone.PEACH, Modifier.weight(1f))
            PastelTile("Không đến nhận", Icons.Default.PersonOff, "${r.waste.noShowCount}", "đơn bỏ", TileTone.BUTTER, Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PastelTile("Khối lượng bỏ", Icons.Default.Delete, "%.1f kg".format(r.waste.wastedWeightKg), "ước tính 0,4 kg/suất", TileTone.PEACH, Modifier.weight(1f))
            PastelTile("Giá trị hao hụt", Icons.Default.Paid, currency(r.waste.wastedEstimatedCost), "theo giá bán", TileTone.BUTTER, Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        SqCard {
            SectionTitle("Chất lượng")
            InfoRow("Đánh giá trung bình", if (s.ratingCount > 0) "%.1f ★ (${s.ratingCount})".format(s.ratingAvg) else "Chưa có")
            InfoRow("Khiếu nại trong kỳ", "${s.complaintsCount}")
        }
    }
}

@Composable
private fun FinanceTab(repository: StoreRepository, days: Int) {
    Loaded(rememberLoad(days) { val (s, e) = rangeOf(days); repository.getFinanceSummary(s, e) }) { r ->
        val s = r.summary
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Doanh thu gộp", currency(s.grossSales), SqCoral, Modifier.weight(1f))
            MetricCard("Thực nhận ước tính", currency(s.netPayout), SqMint, Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        SqCard {
            SectionTitle("Chi tiết")
            InfoRow("Đơn đã tính doanh thu", "${s.soldOrders}")
            InfoRow("Giá trị trung bình mỗi đơn", currency(s.averageOrderValue))
            InfoRow("Hoa hồng nền tảng (${(s.commissionRate * 100).toInt()}%)", "- " + currency(s.commissionAmount))
            InfoRow("Hoàn tiền khiếu nại", "- " + currency(s.refundsDeduction))
            InfoRow("Đã thu, chờ khách nhận hàng", currency(s.pendingPaidAmount))
        }
        r.explanation?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, fontSize = 12.sp, color = SqInkSoft)
        }
        Spacer(Modifier.height(10.dp))
        SqCard {
            SectionTitle("Doanh thu theo ngày")
            if (r.daily.isEmpty()) Text("Chưa có đơn trong kỳ này.", fontSize = 13.sp, color = SqInkSoft)
            r.daily.forEach { d -> InfoRow(d.date.takeLast(5).split("-").reversed().joinToString("/"), currency(d.grossSales) + " · ${d.orders} đơn") }
        }
    }
}

@Composable
private fun ItemsTab(repository: StoreRepository, days: Int) {
    var byWaste by remember { mutableStateOf(false) }
    Loaded(rememberLoad(days) { val (s, e) = rangeOf(days); repository.getItemReports(s, e) }) { r ->
        ChipRow(listOf(false to "Bán chạy", true to "Hao hụt nhiều"), byWaste) { byWaste = it }
        Spacer(Modifier.height(10.dp))
        val rows = if (byWaste) r.items.sortedByDescending { it.cancelledQuantity } else r.items.sortedByDescending { it.totalQuantitySold }
        if (rows.isEmpty()) EmptyState("Chưa có dữ liệu", "Chưa có đơn nào trong kỳ này.")
        val top = rows.maxOfOrNull { if (byWaste) it.cancelledQuantity else it.totalQuantitySold }?.coerceAtLeast(1) ?: 1
        rows.forEach { row ->
            val value = if (byWaste) row.cancelledQuantity else row.totalQuantitySold
            SqCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(row.itemName, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                    Text("$value suất", fontSize = 13.sp, color = SqInkSoft)
                }
                Bar(value.toFloat() / top, if (byWaste) SqCoral else SqMint)
                Text(
                    "Bán hết ${row.rescueRate}% · doanh thu ${currency(row.totalRevenue)} · ${row.totalOrders} đơn",
                    fontSize = 12.sp, color = if (row.rescueRate < 50) SqCoralDeep else SqInkSoft
                )
                if (row.rescueRate < 50) Text("Tỷ lệ bán hết thấp: nên giảm số suất hoặc hạ giá sớm hơn.", fontSize = 11.sp, color = SqCoralDeep)
            }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun HoursTab(repository: StoreRepository, days: Int) {
    Loaded(rememberLoad(days) { val (s, e) = rangeOf(days); repository.getHourlyDistribution(s, e) }) { r ->
        val hours = r.distribution
        val peak = hours.maxByOrNull { it.orderCount }
        val max = (peak?.orderCount ?: 0).coerceAtLeast(1)
        if (peak == null || peak.orderCount == 0) {
            EmptyState("Chưa có dữ liệu", "Chưa có đơn nào trong kỳ này.")
            return@Loaded
        }
        SqCard {
            SectionTitle("Đơn đặt theo giờ trong ngày")
            Text("Khung ${peak.hour}–${peak.hour + 1}h có nhiều đơn nhất (${peak.orderCount} đơn).", fontSize = 13.sp, color = SqInkSoft)
            Spacer(Modifier.height(8.dp))
            hours.filter { it.orderCount > 0 }.forEach { h ->
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 3.dp)) {
                    Text(h.label, fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.width(44.dp))
                    Box(Modifier.weight(1f)) { Bar(h.orderCount.toFloat() / max, SqCoral) }
                    Text("${h.orderCount} (nhận ${h.pickedUpCount})", fontSize = 12.sp, color = SqInk, modifier = Modifier.padding(start = 8.dp))
                }
            }
            Text("Dùng để chọn khung giờ nhận hàng và thời điểm giảm giá. Giờ theo máy chủ.", fontSize = 11.sp, color = SqInkMuted)
        }
    }
}

@Composable
private fun PricingTab(repository: StoreRepository) {
    Loaded(rememberLoad(Unit) { repository.getPricingEfficacy() }) { p ->
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            MetricCard("Đề xuất giá", "${p.totalProposals}", SqCoral, Modifier.weight(1f))
            MetricCard("Tỷ lệ duyệt", "${p.adoptionRate}%", SqMint, Modifier.weight(1f))
        }
        Spacer(Modifier.height(10.dp))
        SqCard {
            InfoRow("Đã duyệt / tự áp dụng", "${p.acceptedCount}")
            InfoRow("Từ chối / hết hạn", "${p.rejectedCount}")
            InfoRow("Doanh thu cộng thêm (ước tính)", currency(p.estimatedAdditionalRevenue))
            Spacer(Modifier.height(6.dp))
            Text(p.recommendation, fontSize = 13.sp, color = SqInk)
            Text("Số liệu quan sát, không phải thử nghiệm đối chứng. Doanh thu cộng thêm tính ước lượng.", fontSize = 11.sp, color = SqInkMuted)
        }
    }
}

@Composable
private fun CompareTab(repository: StoreRepository) {
    var mode by remember { mutableIntStateOf(7) }
    Text("So sánh kỳ gần nhất với kỳ ngay trước đó.", fontSize = 13.sp, color = SqInkSoft)
    Spacer(Modifier.height(6.dp))
    ChipRow(listOf(7 to "7 ngày", 14 to "14 ngày", 30 to "30 ngày"), mode) { mode = it }
    Spacer(Modifier.height(10.dp))
    val today = LocalDate.now()
    val req = ComparePeriodsRequest(
        today.minusDays(2L * mode - 1).toString(), today.minusDays(mode.toLong()).toString(),
        today.minusDays(mode - 1L).toString(), today.plusDays(1).toString()
    )
    Loaded(rememberLoad(mode) { repository.comparePeriods(req) }) { c ->
        val a = c.periodA.metrics; val b = c.periodB.metrics; val g = c.growthPercent
        SqCard {
            Text("Kỳ A: ${req.periodAFrom} → ${req.periodATo}", fontSize = 12.sp, color = SqInkSoft)
            Text("Kỳ B: ${req.periodBFrom} → hôm nay", fontSize = 12.sp, color = SqInkSoft)
            Spacer(Modifier.height(8.dp))
            CompareRow("Doanh thu", currency(a.totalRevenue), currency(b.totalRevenue), g.revenue)
            CompareRow("Số đơn", "${a.orderCount}", "${b.orderCount}", g.orderCount)
            CompareRow("Số suất bán", "${a.totalQuantity}", "${b.totalQuantity}", g.quantity)
            CompareRow("Khách mua", "${a.uniqueCustomers}", "${b.uniqueCustomers}", g.uniqueCustomers)
        }
    }
}

@Composable
private fun CompareRow(label: String, a: String, b: String, growth: Int) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 5.dp)) {
        Column(Modifier.weight(1f)) {
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
            Text("$a → $b", fontSize = 12.sp, color = SqInkSoft)
        }
        val up = growth >= 0
        Text((if (up) "▲ +" else "▼ ") + "$growth%", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (up) SqMintDeep else SqCoralDeep)
    }
}

/** Thanh ngang theo tỷ lệ 0..1. */
@Composable
internal fun Bar(fraction: Float, color: Color) {
    Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(SqSurfaceSoft)) {
        Box(Modifier.fillMaxWidth(fraction.coerceIn(0.02f, 1f)).height(8.dp).clip(RoundedCornerShape(4.dp)).background(color))
    }
}
