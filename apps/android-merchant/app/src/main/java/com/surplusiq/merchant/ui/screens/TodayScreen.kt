package com.surplusiq.merchant.ui.screens

import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material3.TextButton
import com.surplusiq.merchant.data.RescueLot
import com.surplusiq.merchant.data.LabScenario
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import com.surplusiq.merchant.ui.components.DualBarChart
import androidx.compose.material.icons.filled.Science
import androidx.compose.material.icons.filled.Timeline
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.EditNote
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Delete
import com.surplusiq.merchant.ui.components.QuickItem
import com.surplusiq.merchant.ui.components.QuickAccessRow
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.DailyOverviewDto
import com.surplusiq.merchant.data.ReportsOverviewDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.TaskDto
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val DAY_FMT = DateTimeFormatter.ofPattern("dd/MM")

/** Số liệu một ngày. Trường null = nguồn dữ liệu không có (nhân viên quầy không gọi được báo cáo). */
private data class DayStats(
    val revenue: Long,
    val total: Int,
    val completed: Int,
    val cancelled: Int,
    val noShow: Int,
    val foodSavedKg: Double,
    val co2Kg: Double?,
    val ratingAvg: Double?,
    val ratingCount: Int,
    val wasteKg: Double?,
    val wasteCost: Long?,
    val recoveryPercent: Double?
)

private fun ReportsOverviewDto.toStats() = DayStats(
    revenue = summary.grossRevenue, total = summary.totalOrders, completed = summary.completedOrders,
    cancelled = summary.cancelledOrders, noShow = summary.noShowOrders, foodSavedKg = summary.foodSavedKg,
    co2Kg = summary.co2SavedKg, ratingAvg = summary.ratingAvg, ratingCount = summary.ratingCount,
    wasteKg = waste.wastedWeightKg, wasteCost = waste.wastedEstimatedCost, recoveryPercent = recovery.recoveryRatePercent
)

private fun DailyOverviewDto.toStats() = DayStats(
    revenue = grossRevenue, total = orders.total, completed = orders.completed, cancelled = orders.cancelled,
    noShow = orders.noShow, foodSavedKg = foodSavedKg, co2Kg = null, ratingAvg = null, ratingCount = 0,
    wasteKg = null, wasteCost = null, recoveryPercent = null
)

private fun dec(v: Double) = "%.1f".format(v).replace('.', ',')

private data class Tile(
    val title: String,
    val icon: ImageVector,
    val value: String,
    val sub: String,
    val tone: TileTone,
    val progress: Float?,
    val onClick: (() -> Unit)? = null
)

/**
 * S06 - Bảng điều khiển. Lịch tuần chọn ngày; số liệu ngày lấy từ GET store/reports/overview (OWNER/MANAGER),
 * riêng hôm nay kèm GET store/daily-overview (suất đang mở, đơn chờ nhận, khiếu nại chờ, trạng thái cửa hàng).
 * Nhân viên quầy bị 403 ở báo cáo nên chỉ thấy số liệu hôm nay từ daily-overview, không có lịch/biểu đồ.
 */
@Composable
fun TodayScreen(repository: StoreRepository, onOpenTasks: () -> Unit = {}, onNavigate: (String) -> Unit = {}) {
    val today = remember { LocalDate.now() }
    val week = remember { weekOf(today) }
    var overview by remember { mutableStateOf<DailyOverviewDto?>(null) }
    var reports by remember { mutableStateOf<List<ReportsOverviewDto>?>(null) }
    var lots by remember { mutableStateOf<List<RescueLot>>(emptyList()) }
    var lab by remember { mutableStateOf<LabScenario?>(null) }
    var labLoaded by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf(today) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        // Khối phụ tải song song, không chặn Dashboard: suất sắp hết hạn.
        scope.launch {
            repository.getRescueTimeline().onSuccess { r ->
                lots = r.items.filter { it.dataQualityStatus != "INSUFFICIENT" && it.riskLevel != null }
                    .sortedByDescending { riskRank(it.riskLevel) }.take(3)
            }
        }
        scope.launch {
            // Gói Cơ bản không có phòng mô phỏng (backend trả 403) nên không hiện thẻ này.
            repository.getLabScenarios().onSuccess { list ->
                lab = list.firstOrNull { it.latestVersion?.simulatedMetrics != null }
                labLoaded = true
            }
        }
        scope.launch {
            // Hiện ngay số liệu hôm nay; các khối phụ (việc cần xử lý, lịch và biểu đồ tuần) về sau thì tự hiện thêm.
            val result = repository.getDailyOverview()
            isLoading = false
            result.fold(onSuccess = { overview = it }, onFailure = { error = it.message })
            // Backend chỉ trả tổng cả khoảng: gọi 7 lần song song, mỗi lần một ngày [00:00, 00:00 hôm sau).
            val rs = coroutineScope {
                week.map { d -> async { repository.getReportsOverview(d.toString(), d.plusDays(1).toString()) } }.awaitAll()
            }
            reports = if (rs.all { it.isSuccess }) rs.map { it.getOrThrow() } else null
        }
    }

    LaunchedEffect(Unit) { load() }

    when {
        isLoading -> FullScreenLoading()
        error != null -> ErrorState(message = error!!, onRetry = ::load)
        overview != null -> {
            val d = overview!!
            val isToday = selected == today
            // Báo cáo chỉ tính đơn đã nhận; riêng hôm nay lấy doanh thu/đơn từ daily-overview (gồm cả đơn đã thanh toán chờ nhận).
            val base = reports?.get(week.indexOf(selected))?.toStats()
            val live = d.toStats()
            val stats = if (base == null) live else if (isToday) base.copy(
                revenue = live.revenue, total = live.total, completed = live.completed, cancelled = live.cancelled, noShow = live.noShow
            ) else base
            val dayLabel = if (isToday) "hôm nay" else "ngày ${selected.format(DAY_FMT)}"
            val ratio = if (stats.total > 0) stats.completed.toFloat() / stats.total else 0f
            val tiles = buildList {
                add(Tile("Đã nhận hàng", Icons.Default.TaskAlt, "${stats.completed}", "trên ${stats.total} đơn", TileTone.MINT, ratio))
                add(
                    Tile(
                        "Hủy / quá hạn", Icons.Default.EventBusy, "${stats.cancelled + stats.noShow}",
                        "hủy ${stats.cancelled} · quá hạn ${stats.noShow}", TileTone.PEACH,
                        if (stats.total > 0) (stats.cancelled + stats.noShow).toFloat() / stats.total else 0f
                    )
                )
                add(
                    Tile(
                        "Thực phẩm được cứu", Icons.Default.Eco, "${dec(stats.foodSavedKg)} kg",
                        stats.co2Kg?.let { "giảm ${dec(it)} kg CO₂" } ?: "${d.rescuedItemsCount} món được cứu", TileTone.SKY, null
                    )
                )
                if (stats.wasteKg != null) {
                    add(Tile("Hao hụt", Icons.Default.Delete, "${dec(stats.wasteKg)} kg", "ước tính ${currency(stats.wasteCost ?: 0)}", TileTone.BUTTER, null))
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().background(SqCanvas),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 92.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                reports?.let { rs ->
                    item {
                        WeeklyCalendarStrip(
                            week = week,
                            selected = selected,
                            markedDays = week.filterIndexed { i, day -> if (day == today) d.orders.total > 0 else rs[i].summary.totalOrders > 0 }.toSet(),
                            onSelect = { selected = it }
                        )
                    }
                }
                item { CoreActionsCard(onNavigate) }
                item {
                    // Số đơn đã nhận và tổng đơn đã nằm ở thẻ chỉ số bên dưới nên ở đây chỉ nêu việc chưa có chỗ nào khác.
                    HeroGaugeCard(
                        title = "Doanh thu",
                        chip = dayLabel.replaceFirstChar { it.uppercase() },
                        value = stats.revenue,
                        unit = "đ",
                        caption = "Doanh thu $dayLabel",
                        progress = ratio,
                        leftLabel = "Chờ nhận: ${d.orders.paid} đơn",
                        rightLabel = stats.recoveryPercent?.let { "Tỷ lệ thu hồi: ${dec(it)}%" } ?: ""
                    )
                }
                items(tiles.chunked(2)) { row ->
                    Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { t ->
                            PastelTile(t.title, t.icon, t.value, t.sub, t.tone, Modifier.weight(1f), t.progress, t.onClick)
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
                reports?.let { rs ->
                    item {
                        // Hôm nay dùng doanh thu daily-overview cho khớp thẻ hero (báo cáo chỉ tính đơn đã nhận).
                        val revenue = rs.mapIndexed { i, r -> if (week[i] == today) d.grossRevenue else r.summary.grossRevenue }
                        SqCard {
                            SectionTitle("Doanh thu tuần này")
                            Spacer(modifier = Modifier.height(10.dp))
                            LineChart(
                                series = listOf(ChartSeries("Doanh thu", revenue.map { it.toFloat() }, SqCoral)),
                                xLabels = week.map { it.format(DAY_FMT) },
                                describe = "Biểu đồ doanh thu tuần này, cao nhất ${currency(revenue.max())}",
                                yFormat = { currency(it.toLong()) }
                            )
                        }
                    }
                }
                item { OrdersToHandleCard(paid = d.orders.paid, complaints = d.pendingComplaints, onNavigate = onNavigate) }
                if (lots.isNotEmpty()) item { ExpiringOffersCard(lots) { onNavigate("rescue-timeline") } }
                if (labLoaded) item { LabCompareCard(lab) { onNavigate("rescue-lab") } }
            }
        }
    }
}

private fun riskRank(level: String?) = when (level) { "CRITICAL" -> 3; "HIGH" -> 2; "MEDIUM" -> 1; else -> 0 }

/** Đơn cần xử lý: số đơn đã thanh toán đang chờ khách đến nhận và số khiếu nại chờ phản hồi. */
@Composable
private fun OrdersToHandleCard(paid: Int, complaints: Int, onNavigate: (String) -> Unit) {
    SqCard {
        SectionTitle("Đơn cần xử lý")
        Spacer(Modifier.height(10.dp))
        if (paid == 0 && complaints == 0) {
            Text("Không có đơn nào cần xử lý lúc này.", fontSize = 13.sp, color = SqInkSoft)
        } else {
            Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                HandleTile("Chờ khách nhận", paid, "đơn đã thanh toán", Icons.Default.ShoppingBag, SqCoral, Modifier.weight(1f).fillMaxHeight()) { onNavigate("orders") }
                HandleTile("Khiếu nại", complaints, "phản hồi trong 48 giờ", Icons.Default.ReportProblem, SqCoralDeep, Modifier.weight(1f).fillMaxHeight()) { onNavigate("complaints") }
            }
        }
    }
}

@Composable
private fun HandleTile(label: String, count: Int, hint: String, icon: ImageVector, tint: androidx.compose.ui.graphics.Color, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(if (count > 0) SqCoralWash else SqSurfaceSoft)
            .clickable(onClick = onClick)
            .padding(14.dp)
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(8.dp))
        Text("$count", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
        Text(hint, fontSize = 11.sp, color = SqInkSoft)
    }
}

/** Suất cứu món sắp hết hạn nhận: tối đa 3 suất nguy cơ tồn cao nhất, cùng nguồn với màn Suất sắp hết hạn. */
@Composable
private fun ExpiringOffersCard(lots: List<RescueLot>, onOpenAll: () -> Unit) {
    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                SectionTitle("Suất sắp hết hạn")
                Text("Ưu tiên bán hoặc hạ giá trước giờ đóng nhận", fontSize = 12.sp, color = SqInkSoft)
            }
            TextButton(onClick = onOpenAll, contentPadding = PaddingValues(0.dp)) { Text("Xem tất cả", color = SqCoralDeep, fontSize = 13.sp) }
        }
        lots.forEach { lot ->
            val style = riskStyle(lot.riskLevel ?: "LOW")
            Row(Modifier.fillMaxWidth().clickable(onClick = onOpenAll).padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(lotName(lot.itemName, lot.kind), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk, maxLines = 1)
                    Text("Còn ${lot.quantityAvailable} suất · ${minutesLeft(lot.pickupEndAt)}", fontSize = 12.sp, color = SqInkSoft, maxLines = 1)
                }
                Text(style.label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = style.fg, modifier = Modifier.clip(RoundedCornerShape(50)).background(style.bg).padding(horizontal = 10.dp, vertical = 4.dp))
            }
        }
    }
}

/** Ba việc cốt lõi của chủ quán: quét QR giao món, đăng suất bán, chiến lược giá. */
@Composable
private fun CoreActionsCard(onNavigate: (String) -> Unit) {
    SqCard {
        SectionTitle("Việc chính hôm nay")
        Spacer(Modifier.height(10.dp))
        Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            CoreActionTile("Quét QR giao món", "Đối chiếu mã khách đưa", Icons.Default.QrCodeScanner, SqCoral, Modifier.weight(1f).fillMaxHeight()) { onNavigate("verify") }
            CoreActionTile("Đăng suất bán", "Giảm giá món còn dư", Icons.Default.LocalOffer, SqCoralDeep, Modifier.weight(1f).fillMaxHeight()) { onNavigate("offer-new") }
        }
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurfaceSoft).clickable { onNavigate("price-proposals") }.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.TrendingDown, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Giá và chiến lược giảm giá", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Text("Đề xuất hạ giá theo giờ, duyệt hoặc từ chối", fontSize = 12.sp, color = SqInkSoft)
            }
            Icon(Icons.Default.KeyboardArrowRight, contentDescription = null, tint = SqInkMuted)
        }
    }
}

@Composable
private fun CoreActionTile(title: String, hint: String, icon: ImageVector, tint: androidx.compose.ui.graphics.Color, modifier: Modifier, onClick: () -> Unit) {
    Column(
        modifier.clip(RoundedCornerShape(16.dp)).background(SqCoralWash).clickable(onClick = onClick).padding(14.dp)
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
        Spacer(Modifier.height(8.dp))
        Text(title, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
        Text(hint, fontSize = 11.sp, color = SqInkSoft)
    }
}

/** Biểu đồ so sánh kết quả mô phỏng của kịch bản mới nhất với số liệu kỳ nền (cùng số liệu với màn Phòng mô phỏng). */
@Composable
private fun LabCompareCard(lab: LabScenario?, onOpen: () -> Unit) {
    SqCard(Modifier.clickable(onClick = onOpen)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                SectionTitle("Phòng mô phỏng")
                Text("Dự đoán khi giảm giá so với thực tế kỳ nền", fontSize = 12.sp, color = SqInkSoft)
            }
            Text("Mở", color = SqCoralDeep, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        }
        val m = lab?.latestVersion?.simulatedMetrics
        if (lab == null || m == null) {
            Text("Chưa có kịch bản mô phỏng. Tạo kịch bản để so sánh dự đoán với thực tế.", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.padding(top = 6.dp))
        } else {
            Spacer(Modifier.height(6.dp))
            Text("${lab.title} · giảm ${pct(lab.latestVersion.assumptions.discountRatio)} · ${m.baseline.periodDays} ngày", fontSize = 12.sp, color = SqInkSoft)
            Spacer(Modifier.height(6.dp))
            DualBarChart(dualRows(m.simulated, m.baseline), "Mô phỏng", "Thực tế")
        }
    }
}
