package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.*
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

private val OBJECTIVES = listOf(
    "REDUCE_SURPLUS" to "Giảm tồn dư",
    "INCREASE_RECOVERY_REVENUE" to "Tăng doanh thu thu hồi",
    "INCREASE_SELLTHROUGH" to "Tăng tỷ lệ bán",
    "COMPARE_STRATEGIES" to "So sánh chiến lược"
)
private val STATUS_LABEL = mapOf("DRAFT" to "Nháp", "RUNNING" to "Đang chạy", "COMPLETED" to "Hoàn tất", "FAILED" to "Thất bại")
private val METRIC_LABEL = mapOf(
    "offeredUnits" to "Suất đưa lên cứu", "soldUnits" to "Suất bán được", "surplusUnits" to "Tồn dư không cứu được",
    "sellThroughRate" to "Tỷ lệ bán", "recoveryRevenue" to "Doanh thu thu hồi", "avgRealizedPrice" to "Giá thực thu bình quân",
    "avgOriginalPrice" to "Giá gốc bình quân", "realizedDiscountRatio" to "Mức giảm giá thực tế"
)

internal fun pct(r: Double) = "%.1f%%".format(r * 100)
internal fun money(v: Double) = currency(v.toLong())
/** Tiền rút gọn cho nhãn trên đầu cột, tránh chữ dài đè lên cột bên cạnh. */
internal fun compactMoney(v: Double) = if (v >= 1_000_000) "%.1f tr".format(v / 1_000_000).replace('.', ',') else "%.0f k".format(v / 1_000)

internal fun units(v: Double) = "%.1f".format(v).removeSuffix(".0")

private fun metricRows(m: LabMetrics) = listOf(
    "Suất đưa lên cứu" to units(m.offeredUnits), "Suất bán được" to units(m.soldUnits), "Tồn dư" to units(m.surplusUnits),
    "Tỷ lệ bán" to pct(m.sellThroughRate), "Doanh thu thu hồi" to money(m.recoveryRevenue), "Giá thực thu bình quân" to money(m.avgRealizedPrice)
)

/** Bốn chỉ số chính, mỗi chỉ số một thang riêng; số liệu lấy nguyên từ backend. */
internal fun dualRows(sim: LabMetrics, real: LabMetrics) = listOf(
    DualRow("Suất bán được", sim.soldUnits, real.soldUnits, units(sim.soldUnits), units(real.soldUnits)),
    DualRow("Tồn dư không cứu được", sim.surplusUnits, real.surplusUnits, units(sim.surplusUnits), units(real.surplusUnits)),
    DualRow("Tỷ lệ bán", sim.sellThroughRate, real.sellThroughRate, pct(sim.sellThroughRate), pct(real.sellThroughRate)),
    DualRow("Doanh thu thu hồi", sim.recoveryRevenue, real.recoveryRevenue, compactMoney(sim.recoveryRevenue), compactMoney(real.recoveryRevenue)),
)

private fun assumptionText(a: LabAssumptions) =
    "Giảm ${pct(a.discountRatio)} · co giãn ${a.priceElasticity} · số suất ${if (a.volumeChangePct >= 0) "+" else ""}${a.volumeChangePct}%"

private fun scopeText(s: LabItemScope) = s.categories?.takeIf { it.isNotEmpty() }?.let { "Nhóm: ${it.joinToString()}" } ?: "Tất cả món"

/**
 * Rescue Lab (CM-B04) - mô phỏng mức giảm giá trên dữ liệu bán thật, so sánh kịch bản, ghi nhận áp dụng và đối chiếu thực tế.
 * Chỉ mô phỏng và ghi nhận: không thao tác nào ở đây đổi giá hay tồn kho thật. Chủ và quản lý.
 * shortcut: phạm vi chọn theo nhóm món, chưa chọn từng món riêng (web có), thêm khi cần.
 */
@Composable
fun RescueLabScreen(repository: StoreRepository, onBack: () -> Unit) {
    var openId by remember { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf(setOf<String>()) }
    var comparing by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableIntStateOf(0) }

    when {
        creating -> VersionForm(repository, scenarioId = null, from = null, onCancel = { creating = false }) { creating = false; reloadKey++ }
        openId != null -> ScenarioDetail(
            repository, openId!!, selected, reloadKey,
            onToggle = { id -> selected = if (id in selected) selected - id else if (selected.size < 5) selected + id else selected },
            onCompare = { comparing = true },
            onChanged = { reloadKey++ },
            onBack = { openId = null }
        )
        else -> ScenarioList(repository, selected, reloadKey, onOpen = { openId = it }, onCreate = { creating = true }, onCompare = { comparing = true }, onBack = onBack)
    }

    if (comparing) CompareDialog(repository, selected.toList()) { comparing = false }
}

@Composable
private fun ScenarioList(
    repository: StoreRepository, selected: Set<String>, reloadKey: Int,
    onOpen: (String) -> Unit, onCreate: () -> Unit, onCompare: () -> Unit, onBack: () -> Unit
) {
    var list by remember { mutableStateOf<List<LabScenario>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(reloadKey, retry) {
        error = null
        repository.getLabScenarios().fold(onSuccess = { list = it }, onFailure = { error = it.message })
    }
    val sidePad = ((androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp.dp - 760.dp) / 2).coerceAtLeast(0.dp)
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = sidePad).padding(20.dp)) {
        ScreenHeader("Phòng mô phỏng", onBack)
        Text("Thử mức giảm giá trên số liệu bán thật của quán. Kết quả là mô phỏng, không đổi giá hay tồn kho.", fontSize = 12.sp, color = SqInkSoft)
        Spacer(Modifier.height(10.dp))
        PrimaryButton("＋ Tạo kịch bản", onClick = onCreate)
        if (selected.size >= 2) {
            Spacer(Modifier.height(6.dp))
            OutlinedButton(onClick = onCompare, modifier = Modifier.fillMaxWidth()) { Text("So sánh ${selected.size} phiên bản đã chọn", color = SqCoralDeep) }
        }
        Spacer(Modifier.height(12.dp))
        val l = list
        when {
            error != null -> ErrorState(error!!) { retry++ }
            l == null -> FullScreenLoading()
            l.isEmpty() -> EmptyState("Chưa có kịch bản", "Tạo kịch bản để xem mức giảm giá nào bán được nhiều nhất.")
            else -> l.forEach { s ->
                SqCard(Modifier.clickable { onOpen(s.id) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(s.title, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                        s.latestVersion?.let { Text(STATUS_LABEL[it.simulationStatus] ?: it.simulationStatus, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep) }
                    }
                    Text("Mục tiêu: ${OBJECTIVES.firstOrNull { it.first == s.objective }?.second ?: s.objective} · ${s.currentVersion} phiên bản", fontSize = 12.sp, color = SqInkSoft)
                    s.latestVersion?.simulatedMetrics?.let { Text("Dự kiến bán ${pct(it.simulated.sellThroughRate)} · thu ${money(it.simulated.recoveryRevenue)}", fontSize = 12.sp, color = SqInk) }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun ScenarioDetail(
    repository: StoreRepository, scenarioId: String, selected: Set<String>, reloadKey: Int,
    onToggle: (String) -> Unit, onCompare: () -> Unit, onChanged: () -> Unit, onBack: () -> Unit
) {
    var scenario by remember { mutableStateOf<LabScenario?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf<String?>(null) }
    var newFrom by remember { mutableStateOf<LabVersion?>(null) }
    var applying by remember { mutableStateOf<LabVersion?>(null) }
    var observing by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(scenarioId, reloadKey, retry) {
        error = null
        repository.getLabScenario(scenarioId).fold(onSuccess = { scenario = it }, onFailure = { error = it.message })
    }

    newFrom?.let { v ->
        VersionForm(repository, scenarioId, v, onCancel = { newFrom = null }) { newFrom = null; onChanged() }
        return
    }

    val sidePad = ((androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp.dp - 760.dp) / 2).coerceAtLeast(0.dp)
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = sidePad).padding(20.dp)) {
        ScreenHeader(scenario?.title ?: "Kịch bản", onBack)
        InlineError(actionError)
        val s = scenario
        when {
            error != null -> ErrorState(error!!) { retry++ }
            s == null -> FullScreenLoading()
            else -> {
                Text("Mỗi lần sửa tạo phiên bản mới; phiên bản cũ và kết quả của nó được giữ nguyên.", fontSize = 12.sp, color = SqInkSoft)
                if (selected.size >= 2) OutlinedButton(onClick = onCompare, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) { Text("So sánh ${selected.size} phiên bản đã chọn", color = SqCoralDeep) }
                Spacer(Modifier.height(10.dp))
                s.versions.orEmpty().forEach { v ->
                    SqCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Phiên bản ${v.versionNo}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                            Text(STATUS_LABEL[v.simulationStatus] ?: v.simulationStatus, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                        }
                        Text("Dữ liệu nền ${v.dateRange.start} → ${v.dateRange.end} · ${scopeText(v.itemScope)}", fontSize = 12.sp, color = SqInkSoft)
                        Text(assumptionText(v.assumptions), fontSize = 12.sp, color = SqInkSoft)
                        v.assumptions.note?.takeIf { it.isNotBlank() }?.let { Text("\"$it\"", fontSize = 12.sp, color = SqInkMuted) }
                        if (v.dataQualityWarnings.isNotEmpty()) {
                            Spacer(Modifier.height(6.dp))
                            Text(if (v.blocked) "Chưa chạy được - thiếu dữ liệu:" else "Chạy ở chế độ hạn chế:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                            v.dataQualityWarnings.forEach { Text("• ${it.message}", fontSize = 12.sp, color = SqInkSoft) }
                        }
                        if (v.simulationStatus == "FAILED") Text("Lỗi tính toán, không có kết quả được lưu. ${v.failedReason.orEmpty()}", fontSize = 12.sp, color = SqCoralDeep)
                        v.simulatedMetrics?.let { m ->
                            Spacer(Modifier.height(8.dp))
                            SectionTitle("Mô phỏng so với thực tế kỳ nền (${m.baseline.periodDays} ngày)")
                            Spacer(Modifier.height(4.dp))
                            DualBarChart(dualRows(m.simulated, m.baseline), "Mô phỏng", "Thực tế kỳ nền")
                        }
                        v.applied?.let { Text("Đã ghi nhận áp dụng ${shortDateTime(it.appliedAt)} · ${it.appliedScope?.note.orEmpty()}", fontSize = 12.sp, color = SqCoralDeep, modifier = Modifier.padding(top = 6.dp)) }
                        if (v.simulationStatus == "COMPLETED") Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = v.id in selected, onCheckedChange = { onToggle(v.id) })
                            Text("Chọn để so sánh", fontSize = 12.sp, color = SqInkSoft)
                        }
                        Row {
                            TextButton(onClick = { newFrom = v }, contentPadding = PaddingValues(0.dp)) { Text("Phiên bản mới từ bản này", color = SqInk) }
                        }
                        Row {
                            if (v.simulationStatus == "DRAFT") TextButton(
                                onClick = {
                                    busy = v.id; actionError = null
                                    scope.launch { repository.runLabVersion(v.id).fold(onSuccess = { retry++ }, onFailure = { actionError = it.message }); busy = null }
                                }, enabled = busy == null, contentPadding = PaddingValues(0.dp)
                            ) { Text(if (busy == v.id) "Đang chạy…" else "Chạy lại", color = SqCoralDeep) }
                            if (v.simulationStatus == "COMPLETED" && v.applied == null) TextButton(onClick = { applying = v }, contentPadding = PaddingValues(0.dp)) { Text("Ghi nhận áp dụng", color = SqCoralDeep) }
                            if (v.applied != null) TextButton(onClick = { observing = if (observing == v.id) null else v.id }, contentPadding = PaddingValues(0.dp)) {
                                Text(if (observing == v.id) "Ẩn đối chiếu thực tế" else "Xem đối chiếu thực tế", color = SqCoralDeep)
                            }
                        }
                        if (observing == v.id) ObservationPanel(repository, v.id)
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }
        }
    }

    applying?.let { v -> ApplyDialog(repository, v, onDismiss = { applying = null }) { applying = null; retry++; onChanged() } }
}

@Composable
private fun ObservationPanel(repository: StoreRepository, versionId: String) {
    var obs by remember { mutableStateOf<LabObservation?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(versionId) { repository.getLabObservation(versionId).fold(onSuccess = { obs = it }, onFailure = { error = it.message }) }
    Spacer(Modifier.height(8.dp))
    val o = obs
    when {
        error != null -> InlineError(error)
        o == null -> FullScreenLoading()
        else -> {
            o.message?.let { Text(it, fontSize = 12.sp, color = SqInkSoft) }
            if (o.limitationNotes.isNotEmpty()) {
                Text("Giới hạn diễn giải", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                o.limitationNotes.forEach { Text("• $it", fontSize = 12.sp, color = SqInkSoft) }
            }
            if (o.status == "OBSERVING" && o.simulated != null && o.actual != null) {
                SectionTitle("Mô phỏng so với thực tế tạm tính (${o.actual.periodDays} ngày)")
                DualBarChart(dualRows(o.simulated, o.actual), "Mô phỏng", "Thực tế")
            }
            o.comparisonResult?.takeIf { o.status == "COMPLETED" }?.let { c ->
                c.rows.forEach { r ->
                    val isMoney = r.metric.let { it == "recoveryRevenue" || it.startsWith("avg") }
                    val isRate = r.metric == "sellThroughRate" || r.metric == "realizedDiscountRatio"
                    fun f(v: Double) = if (isMoney) money(v) else if (isRate) pct(v) else units(v)
                    InfoRow(METRIC_LABEL[r.metric] ?: r.label, "mô phỏng ${f(r.simulated)} · thực tế ${f(r.actual)}")
                }
                if (c.confounders.isNotEmpty()) {
                    Text("Yếu tố có thể làm lệch kết quả:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqInk)
                    c.confounders.forEach { Text("• ${it.label} (${it.count})", fontSize = 12.sp, color = SqInkSoft) }
                }
            }
        }
    }
}

@Composable
private fun VersionForm(repository: StoreRepository, scenarioId: String?, from: LabVersion?, onCancel: () -> Unit, onDone: () -> Unit) {
    val end0 = LocalDate.now().minusDays(1)
    var title by remember { mutableStateOf("") }
    var objective by remember { mutableStateOf("REDUCE_SURPLUS") }
    var start by remember { mutableStateOf(from?.dateRange?.start ?: end0.minusDays(27).toString()) }
    var end by remember { mutableStateOf(from?.dateRange?.end ?: end0.toString()) }
    var cats by remember { mutableStateOf(from?.itemScope?.categories.orEmpty().toSet()) }
    var discount by remember { mutableStateOf(((from?.assumptions?.discountRatio ?: 0.5) * 100).toInt().toString()) }
    var elasticity by remember { mutableStateOf((from?.assumptions?.priceElasticity ?: 1.5).toString()) }
    var volume by remember { mutableStateOf((from?.assumptions?.volumeChangePct ?: 0.0).toString()) }
    var note by remember { mutableStateOf(from?.assumptions?.note.orEmpty()) }
    var categories by remember { mutableStateOf<List<String>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { repository.getItems(status = "ALL", limit = 100).onSuccess { r -> categories = r.data.map { it.category }.distinct().sorted() } }

    val d = discount.toDoubleOrNull(); val e = elasticity.toDoubleOrNull(); val vol = volume.toDoubleOrNull()
    val s = runCatching { LocalDate.parse(start) }.getOrNull(); val en = runCatching { LocalDate.parse(end) }.getOrNull()
    val problem = when {
        scenarioId == null && title.isBlank() -> "Nhập tên kịch bản."
        s == null || en == null -> "Ngày phải có dạng YYYY-MM-DD."
        en.isBefore(s) -> "Ngày kết thúc phải sau ngày bắt đầu."
        d == null || d < 5 || d > 70 -> "Mức giảm từ 5% đến 70%."
        e == null || e < 0 || e > 5 -> "Độ co giãn từ 0 đến 5."
        vol == null || vol < -90 || vol > 200 -> "Thay đổi số suất từ -90% đến 200%."
        else -> null
    }

    val sidePad = ((androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp.dp - 760.dp) / 2).coerceAtLeast(0.dp)
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = sidePad).padding(20.dp)) {
        ScreenHeader(if (scenarioId == null) "Tạo kịch bản" else "Phiên bản mới (từ v${from?.versionNo})", onCancel)
        Spacer(Modifier.height(12.dp))
        SqCard {
            if (scenarioId == null) {
                SqField("Tên kịch bản", title) { title = it.take(150) }
                Spacer(Modifier.height(10.dp))
                Text("Mục tiêu", fontSize = 12.sp, color = SqInkSoft)
                ChipRow(OBJECTIVES, objective) { objective = it }
                Spacer(Modifier.height(10.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SqField("Dữ liệu từ ngày", start, Modifier.weight(1f), placeholder = "YYYY-MM-DD") { start = it.take(10) }
                SqField("Đến ngày", end, Modifier.weight(1f), placeholder = "YYYY-MM-DD") { end = it.take(10) }
            }
            if (categories.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Text("Nhóm món (bỏ trống = tất cả)", fontSize = 12.sp, color = SqInkSoft)
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    categories.forEach { c -> SqChip(c, c in cats) { cats = if (c in cats) cats - c else cats + c } }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        SqCard {
            SqField("Mức giảm giá (%)", discount, keyboardType = KeyboardType.Number) { discount = it.filter(Char::isDigit).take(2) }
            Spacer(Modifier.height(10.dp))
            SqField("Độ co giãn theo giá (0–5)", elasticity, keyboardType = KeyboardType.Decimal) { elasticity = it.take(4) }
            Spacer(Modifier.height(10.dp))
            SqField("Thay đổi số suất (%)", volume, keyboardType = KeyboardType.Decimal) { volume = it.take(5) }
            Spacer(Modifier.height(10.dp))
            SqField("Ghi chú (không bắt buộc)", note, singleLine = false) { note = it.take(500) }
        }
        Spacer(Modifier.height(12.dp))
        InlineError(error ?: problem.takeIf { title.isNotBlank() || scenarioId != null })
        PrimaryButton("Lưu và chạy mô phỏng", enabled = problem == null && !busy, loading = busy, onClick = {
            busy = true; error = null
            scope.launch {
                val r = if (scenarioId == null) repository.createLabScenario(
                    LabCreateScenario(title.trim(), objective, start, end, cats.toList(), d!! / 100, e!!, vol!!, note.trim().ifBlank { null })
                ) else repository.createLabVersion(
                    scenarioId, LabVersionParams(start, end, cats.toList(), d!! / 100, e!!, vol!!, note.trim().ifBlank { null })
                )
                r.fold(onSuccess = { onDone() }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}

@Composable
private fun ApplyDialog(repository: StoreRepository, v: LabVersion, onDismiss: () -> Unit, onDone: () -> Unit) {
    val s0 = runCatching { LocalDate.parse(v.dateRange.end).plusDays(1) }.getOrDefault(LocalDate.now())
    var from by remember { mutableStateOf(s0.toString()) }
    var to by remember { mutableStateOf(s0.plusDays(13).toString()) }
    var note by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val ok = note.isNotBlank() && runCatching { !LocalDate.parse(to).isBefore(LocalDate.parse(from)) }.getOrDefault(false)
    ConfirmDialog(
        title = "Ghi nhận áp dụng v${v.versionNo}",
        message = "Chỉ ghi nhận rằng bạn đã (hoặc sẽ) thay đổi ngoài thực tế để theo dõi kết quả. Không đổi giá, không đổi tồn kho, và không sửa được sau khi lưu.",
        confirmLabel = if (busy) "Đang lưu…" else "Xác nhận", confirmEnabled = ok && !busy, onDismiss = onDismiss,
        onConfirm = {
            busy = true; error = null
            scope.launch { repository.applyLabVersion(v.id, LabApplyRequest(from, to, note.trim())).fold(onSuccess = { onDone() }, onFailure = { error = it.message }); busy = false }
        }
    ) {
        Spacer(Modifier.height(8.dp))
        SqField("Đã thay đổi gì, cho món nào?", note, singleLine = false) { note = it.take(500) }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SqField("Quan sát từ", from, Modifier.weight(1f), placeholder = "YYYY-MM-DD") { from = it.take(10) }
            SqField("Đến", to, Modifier.weight(1f), placeholder = "YYYY-MM-DD") { to = it.take(10) }
        }
        InlineError(error)
    }
}

@Composable
private fun CompareDialog(repository: StoreRepository, ids: List<String>, onDismiss: () -> Unit) {
    var result by remember { mutableStateOf<LabCompareResult?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(ids) { repository.compareLabVersions(ids).fold(onSuccess = { result = it }, onFailure = { error = it.message }) }
    ConfirmDialog(title = "So sánh kịch bản", message = "", confirmLabel = "Đóng", onConfirm = onDismiss, onDismiss = onDismiss) {
        Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState())) {
            val r = result
            when {
                error != null -> InlineError(error)
                r == null -> FullScreenLoading()
                else -> {
                    Text(r.notice, fontSize = 12.sp, color = SqInkSoft)
                    r.primaryMetric?.let { Text("Xếp theo ${METRIC_LABEL[it.metric] ?: it.metric} (${if (it.direction == "MAX") "cao hơn tốt hơn" else "thấp hơn tốt hơn"})", fontSize = 12.sp, color = SqInk) }
                    r.rows.forEach { row ->
                        Spacer(Modifier.height(8.dp))
                        Text("${row.scenarioTitle} · v${row.versionNo}" + if (r.bestVersionId == row.versionId) "  ★ tốt nhất (mô phỏng)" else "", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInk)
                        Text(assumptionText(row.assumptions) + if (row.runMode == "RESTRICTED") " · chế độ hạn chế" else "", fontSize = 11.sp, color = SqInkSoft)
                        metricRows(row.simulated).forEach { InfoRow(it.first, it.second) }
                    }
                }
            }
        }
    }
}
