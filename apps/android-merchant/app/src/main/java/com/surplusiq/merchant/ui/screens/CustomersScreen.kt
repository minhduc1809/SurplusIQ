package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.*
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val TABS = listOf("bought" to "Đã mua", "segments" to "Phân nhóm", "favorites" to "Yêu thích")
private val SEGMENT_INFO = listOf(
    Triple("NEW", "Mới", "Vừa mua lần đầu trong thời gian gần đây"),
    Triple("LOYAL", "Thân thiết", "Mua đều đặn, nhiều đơn trong 30 ngày"),
    Triple("AT_RISK", "Có nguy cơ rời", "Lâu chưa quay lại mua"),
    Triple("HIGH_NOSHOW", "Hay không đến nhận", "Tỷ lệ bỏ đơn cao, cần nhắc hẹn")
)

/**
 * S56-S58 - Khách của cửa hàng. Mọi khách đều ẩn danh: chỉ thấy chữ cái đầu hoặc mã rút gọn (BR-083).
 * shortcut: backend chưa trả lịch sử đơn, món hay mua, khiếu nại, đánh giá theo từng khách, và chưa lưu ngưỡng phân nhóm
 * do chủ cấu hình (R2-087); thêm khi backend có.
 */
@Composable
fun CustomersScreen(repository: StoreRepository, canEditNote: Boolean, isOwner: Boolean, onUpgrade: () -> Unit, onBack: () -> Unit) {
    var tab by remember { mutableStateOf("bought") }
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Khách của cửa hàng", onBack)
        Spacer(Modifier.height(8.dp))
        ChipRow(TABS, tab) { tab = it }
        Spacer(Modifier.height(12.dp))
        when (tab) {
            "bought" -> BoughtTab(repository, canEditNote)
            "segments" -> ProGate(repository, "Phân nhóm khách hàng", onUpgrade) { SegmentsTab(repository, isOwner) }
            else -> FavoritesTab(repository)
        }
    }
}

@Composable
private fun BoughtTab(repository: StoreRepository, canEditNote: Boolean) {
    var list by remember { mutableStateOf<List<StoreCustomerDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf<StoreCustomerDto?>(null) }
    var detail by remember { mutableStateOf<StoreCustomerDto?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(retry) {
        error = null
        repository.getCustomers().fold(onSuccess = { list = it.sortedByDescending { c -> c.lastOrderDate } }, onFailure = { error = it.message })
    }
    val l = list
    when {
        error != null -> ErrorState(error!!) { retry++ }
        l == null -> FullScreenLoading()
        l.isEmpty() -> EmptyState("Chưa có khách", "Khách xuất hiện sau khi có đơn đầu tiên.")
        else -> l.forEach { c ->
            SqCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Khách ${c.customerName} · KH-${c.customerId.takeLast(4).uppercase()}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                    Text(currency(c.totalSpend), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqMintDeep)
                }
                Text("${c.totalOrders} đơn · ${c.completedOrders} đã nhận · ${c.noShowCount} lần không đến", fontSize = 12.sp, color = if (c.noShowCount > 0) SqCoralDeep else SqInkSoft)
                Text("Mua gần nhất ${shortDateTime(c.lastOrderDate)}", fontSize = 11.sp, color = SqInkMuted)
                c.internalNote?.let { Text("Ghi chú: $it", fontSize = 12.sp, color = SqInk, modifier = Modifier.padding(top = 4.dp)) }
                TextButton(onClick = { detail = c }, contentPadding = PaddingValues(0.dp)) { Text("Xem chi tiết", color = SqInk) }
                if (canEditNote) TextButton(onClick = { editing = c }, contentPadding = PaddingValues(0.dp)) {
                    Text(if (c.internalNote == null) "Thêm ghi chú nội bộ" else "Sửa ghi chú", color = SqCoralDeep)
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }
    detail?.let { c -> DetailDialog(repository, c) { detail = null } }
    editing?.let { c -> NoteDialog(repository, c, onDismiss = { editing = null }) { editing = null; retry++ } }
}

@Composable
private fun DetailDialog(repository: StoreRepository, c: StoreCustomerDto, onDismiss: () -> Unit) {
    var d by remember { mutableStateOf<CustomerDetailDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(c.customerId) { repository.getCustomerDetail(c.customerId).fold(onSuccess = { d = it }, onFailure = { error = it.message }) }
    ConfirmDialog(title = "Khách ${c.customerName} · KH-${c.customerId.takeLast(4).uppercase()}", message = "", confirmLabel = "Đóng", onConfirm = onDismiss, onDismiss = onDismiss) {
        Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState())) {
            val x = d
            when {
                error != null -> InlineError(error)
                x == null -> FullScreenLoading()
                else -> {
                    InfoRow("Tổng chi", currency(x.totalSpend))
                    InfoRow("Đơn", "${x.totalOrders} (${x.completedOrders} đã nhận, ${x.noShowCount} không đến)")
                    if (x.topItems.isNotEmpty()) {
                        SectionTitle("Món hay mua")
                        x.topItems.forEach { InfoRow(it.name, "${it.quantity} suất") }
                    }
                    SectionTitle("Đơn gần đây")
                    x.recentOrders.take(8).forEach { InfoRow("${it.code} · ${it.itemName ?: "Suất"}", "${currency(it.totalAmount)}") }
                    if (x.complaints.isNotEmpty()) {
                        SectionTitle("Khiếu nại (${x.complaints.size})")
                        x.complaints.forEach { InfoRow(it.category, it.status) }
                    }
                    if (x.reviews.isNotEmpty()) {
                        SectionTitle("Đánh giá")
                        x.reviews.forEach { InfoRow("${it.rating} ★", it.comment.orEmpty().take(40)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ThresholdDialog(repository: StoreRepository, onDismiss: () -> Unit, onSaved: () -> Unit) {
    var cfg by remember { mutableStateOf<SegmentConfigDto?>(null) }
    var f by remember { mutableStateOf(List(5) { "" }) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        repository.getSegmentConfig().fold(
            onSuccess = { cfg = it; f = listOf(it.loyalMinOrders, it.loyalMaxDaysSinceLastOrder, it.atRiskMinOrders, it.atRiskDaysThreshold, it.highNoShowRatioPercent).map(Int::toString) },
            onFailure = { error = it.message }
        )
    }
    val n = f.map { it.toIntOrNull() }
    val valid = n[0] in 1..20 && n[1] in 1..90 && n[2] in 1..20 && n[3] in 7..180 && n[4] in 5..100
    ConfirmDialog(
        title = "Ngưỡng phân nhóm", message = "Áp dụng từ lần phân nhóm kế tiếp.",
        confirmLabel = if (busy) "Đang lưu…" else "Lưu", confirmEnabled = valid && cfg != null && !busy, onDismiss = onDismiss,
        onConfirm = {
            busy = true; error = null
            scope.launch {
                repository.updateSegmentConfig(SegmentConfigDto(n[0]!!, n[1]!!, n[2]!!, n[3]!!, n[4]!!)).fold(onSuccess = { onSaved() }, onFailure = { error = it.message })
                busy = false
            }
        }
    ) {
        val labels = listOf("Thân thiết: tối thiểu số đơn (1–20)", "Thân thiết: mua gần nhất trong (ngày, 1–90)", "Có nguy cơ rời: tối thiểu số đơn (1–20)", "Có nguy cơ rời: chưa quay lại sau (ngày, 7–180)", "Hay không đến: tỷ lệ bỏ đơn từ (%, 5–100)")
        Column(Modifier.heightIn(max = 360.dp).verticalScroll(rememberScrollState())) {
            labels.forEachIndexed { i, l ->
                Spacer(Modifier.height(6.dp))
                SqField(l, f[i], keyboardType = androidx.compose.ui.text.input.KeyboardType.Number) { v -> f = f.toMutableList().also { it[i] = v.filter(Char::isDigit).take(3) } }
            }
            InlineError(error)
        }
    }
}

@Composable
private fun NoteDialog(repository: StoreRepository, c: StoreCustomerDto, onDismiss: () -> Unit, onSaved: () -> Unit) {
    var note by remember { mutableStateOf(c.internalNote.orEmpty()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    ConfirmDialog(
        title = "Ghi chú về khách ${c.customerName}", message = "Chỉ cửa hàng thấy ghi chú này; không ghi thông tin cá nhân của khách.",
        confirmLabel = if (busy) "Đang lưu…" else "Lưu", confirmEnabled = note.isNotBlank() && !busy, onDismiss = onDismiss,
        onConfirm = {
            busy = true; error = null
            scope.launch { repository.saveCustomerNote(c.customerId, note.trim()).fold(onSuccess = { onSaved() }, onFailure = { error = it.message }); busy = false }
        }
    ) {
        Spacer(Modifier.height(8.dp))
        SqField("Ghi chú (tối đa 200 ký tự)", note, singleLine = false) { note = it.take(200) }
        Text("${note.length}/200", fontSize = 11.sp, color = SqInkMuted)
        InlineError(error)
    }
}

@Composable
private fun SegmentsTab(repository: StoreRepository, isOwner: Boolean) {
    var seg by remember { mutableStateOf<SegmentsResponse?>(null) }
    var noShow by remember { mutableStateOf<List<NoShowCustomerDto>>(emptyList()) }
    var selected by remember { mutableStateOf("NEW") }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(retry) {
        error = null
        repository.getSegments().fold(onSuccess = { seg = it }, onFailure = { error = it.message })
        repository.getFrequentNoShow().onSuccess { noShow = it.customers }
    }
    var configuring by remember { mutableStateOf(false) }
    if (configuring) ThresholdDialog(repository, onDismiss = { configuring = false }) { configuring = false; seg = null; retry++ }
    val s = seg
    if (isOwner && s != null) TextButton(onClick = { configuring = true }, contentPadding = PaddingValues(0.dp)) { Text("Chỉnh ngưỡng phân nhóm", color = SqCoralDeep) }
    when {
        error != null -> ErrorState(error!!) { retry++ }
        s == null -> FullScreenLoading()
        !s.isEligible -> SqCard {
            SectionTitle("Chưa phân nhóm được")
            Text(s.reason ?: "Cần từ 20 khách trở lên để phân nhóm.", fontSize = 13.sp, color = SqInkSoft)
            Text("Hiện có ${s.totalCustomers} khách đã mua hoặc không đến nhận.", fontSize = 12.sp, color = SqInkMuted)
        }
        else -> {
            SEGMENT_INFO.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(bottom = 10.dp)) {
                    row.forEach { (key, title, desc) ->
                        SqCard(Modifier.weight(1f).let { m -> m }) {
                            Text(title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (selected == key) SqCoralDeep else SqInk)
                            Text("${s.summary[key] ?: 0}", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                            Text(desc, fontSize = 11.sp, color = SqInkSoft)
                            TextButton(onClick = { selected = key }, contentPadding = PaddingValues(0.dp)) { Text("Xem danh sách", fontSize = 12.sp, color = SqCoralDeep) }
                        }
                    }
                }
            }
            val rows = s.customers.filter { it.primarySegment == selected }
            SectionTitle(SEGMENT_INFO.first { it.first == selected }.second + " (${rows.size})")
            Spacer(Modifier.height(6.dp))
            if (rows.isEmpty()) Text("Không có khách trong nhóm này.", fontSize = 12.sp, color = SqInkSoft)
            rows.forEach { c ->
                InfoRow(c.anonymizedId, "${c.metrics.totalOrders} đơn · ${c.metrics.daysSinceLastOrder} ngày trước")
            }
            if (selected == "HIGH_NOSHOW" && noShow.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                noShow.forEach { n ->
                    SqCard {
                        Text(n.anonymizedCustomerId, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInk)
                        Text("${n.noShowCount}/${n.totalOrders} đơn không đến (${n.noShowRatePercent}%) · thiệt hại ${currency(n.estimatedLossAmount)}", fontSize = 12.sp, color = SqCoralDeep)
                        n.recommendedAction?.let { Text(it, fontSize = 12.sp, color = SqInkSoft) }
                    }
                    Spacer(Modifier.height(6.dp))
                }
            }
        }
    }
}

@Composable
private fun FavoritesTab(repository: StoreRepository) {
    var data by remember { mutableStateOf<FavoritesCountResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(retry) {
        error = null
        repository.getFavoritesCount().fold(onSuccess = { data = it }, onFailure = { error = it.message })
    }
    val d = data
    when {
        error != null -> ErrorState(error!!) { retry++ }
        d == null -> FullScreenLoading()
        else -> {
            MetricCard("Khách yêu thích cửa hàng", "${d.favoriteCount}", SqCoral, Modifier.fillMaxWidth())
            Spacer(Modifier.height(10.dp))
            SqCard {
                SectionTitle("Lượt yêu thích mới theo tuần (8 tuần gần nhất)")
                Spacer(Modifier.height(8.dp))
                val max = (d.newPerWeek.maxOrNull() ?: 0).coerceAtLeast(1)
                d.newPerWeek.forEachIndexed { i, n ->
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                        Text(if (i == d.newPerWeek.lastIndex) "Tuần này" else "−${d.newPerWeek.lastIndex - i} tuần", fontSize = 11.sp, color = SqInkSoft, modifier = Modifier.width(64.dp))
                        Box(Modifier.weight(1f)) { Bar(n.toFloat() / max, SqCoral) }
                        Text("$n", fontSize = 12.sp, color = SqInk, modifier = Modifier.padding(start = 8.dp))
                    }
                }
                Text("Chỉ đếm lượt thêm mới; lượt bỏ yêu thích không được ghi lại. Không hiển thị danh tính khách.", fontSize = 11.sp, color = SqInkMuted)
            }
            Spacer(Modifier.height(10.dp))
            SqCard {
                SectionTitle("Cách tăng lượt yêu thích")
                Text("• Giữ ảnh và mô tả món rõ ràng, đúng thực tế.\n• Mở suất đều đặn để khách quen quay lại.\n• Phản hồi đánh giá và xử lý khiếu nại kịp thời.", fontSize = 12.sp, color = SqInkSoft)
            }
        }
    }
}
