package com.surplusiq.merchant.ui.screens

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
    var urgentTasks by remember { mutableStateOf<List<TaskDto>>(emptyList()) }
    var reports by remember { mutableStateOf<List<ReportsOverviewDto>?>(null) }
    var selected by remember { mutableStateOf(today) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getDailyOverview()
            // Các khối phụ (việc cần xử lý, báo cáo tuần) lỗi thì ẩn, không chặn dashboard.
            repository.getTodayTasks().onSuccess { res ->
                urgentTasks = res.tasks.filter { it.urgent || it.id == "daily_actuals" }
            }
            // Backend chỉ trả tổng cả khoảng: gọi 7 lần, mỗi lần một ngày [00:00, 00:00 hôm sau).
            val rs = coroutineScope {
                week.map { d -> async { repository.getReportsOverview(d.toString(), d.plusDays(1).toString()) } }.awaitAll()
            }
            reports = if (rs.all { it.isSuccess }) rs.map { it.getOrThrow() } else null
            isLoading = false
            result.fold(onSuccess = { overview = it }, onFailure = { error = it.message })
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
                        stats.co2Kg?.let { "giảm ${dec(it)} kg CO₂" } ?: "${d.rescuedItemsCount} món được cứu", TileTone.MINT, null
                    )
                )
                if (stats.wasteKg != null) {
                    add(Tile("Hao hụt", Icons.Default.Delete, "${dec(stats.wasteKg)} kg", "ước tính ${currency(stats.wasteCost ?: 0)}", TileTone.BUTTER, null))
                }
                if (stats.ratingAvg != null) {
                    add(
                        Tile(
                            "Đánh giá", Icons.Default.Star, if (stats.ratingCount > 0) "${dec(stats.ratingAvg)} ★" else "–",
                            "${stats.ratingCount} lượt đánh giá", TileTone.BUTTER,
                            if (stats.ratingCount > 0) (stats.ratingAvg / 5).toFloat() else 0f
                        )
                    )
                }
                if (isToday) {
                    add(Tile("Suất đang mở", Icons.Default.Inventory2, "${d.activeOffers}", "chờ nhận: ${d.orders.paid} đơn", TileTone.PEACH, null) { onNavigate("offers") })
                    add(Tile("Khiếu nại chờ", Icons.Default.ReportProblem, "${d.pendingComplaints}", "cần phản hồi", TileTone.BUTTER, null, onOpenTasks))
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().background(SqCanvas),
                contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 24.dp),
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
                item {
                    HeroGaugeCard(
                        title = "Doanh thu",
                        chip = "Đã nhận: ${stats.completed} đơn",
                        value = stats.revenue,
                        unit = "đ",
                        caption = "Doanh thu $dayLabel",
                        progress = ratio,
                        leftLabel = "Tổng đơn: ${stats.total}",
                        rightLabel = stats.recoveryPercent?.let { "Tỷ lệ thu hồi: ${dec(it)}%" } ?: "Chờ nhận: ${d.orders.paid} đơn"
                    )
                }
                if (isToday) item { StoreStatusRow(paused = d.isPausedToday, onClick = { onNavigate("store-pause") }) }
                items(tiles.chunked(2)) { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
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
                item {
                    ActionBanner(
                        title = "Cần xử lý ngay",
                        subtitle = if (urgentTasks.isEmpty()) "Không có việc khẩn · xem tất cả việc" else "${urgentTasks.size} việc đang chờ bạn",
                        icon = Icons.Default.Checklist,
                        onClick = onOpenTasks
                    )
                }
                items(urgentTasks) { task -> TaskRow(task, onNavigate) }
            }
        }
    }
}

/** Trạng thái cửa hàng: tạm ngưng dùng coral, hoạt động dùng mint; bấm để mở màn tạm ngưng. */
@Composable
private fun StoreStatusRow(paused: Boolean, onClick: () -> Unit) {
    val (color, wash) = if (paused) SqCoralDeep to SqCoralWash else SqMintDeep to SqMintWash
    Row(
        modifier = Modifier.fillMaxWidth().sqSurface(20.dp).clickable(onClick = onClick).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(wash), contentAlignment = Alignment.Center) {
            Icon(if (paused) Icons.Default.PauseCircle else Icons.Default.Storefront, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("Trạng thái cửa hàng", fontSize = 12.sp, color = SqInkSoft)
            Text(if (paused) "Đang tạm ngưng" else "Đang hoạt động", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = color)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = SqInkMuted)
    }
}
