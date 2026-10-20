package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
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
import kotlinx.coroutines.launch
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

private val HOUR_FMT = DateTimeFormatter.ofPattern("HH:mm")

private fun hhmm(iso: String) = runCatching { OffsetDateTime.parse(iso).toLocalTime().format(HOUR_FMT) }.getOrDefault("")

private fun lotName(name: String?, kind: String?) = name ?: if (kind == "SURPRISE_BAG") "Túi bất ngờ" else "Suất bán"

private fun minutesLeft(iso: String): String {
    val m = runCatching { ChronoUnit.MINUTES.between(OffsetDateTime.now(), OffsetDateTime.parse(iso)) }.getOrDefault(0L)
    return when {
        m <= 0 -> "Đã hết khung nhận"
        m < 120 -> "Còn $m phút"
        else -> "Còn ${(m + 30) / 60} giờ"
    }
}

/** Lý do chính = hai yếu tố điểm cao nhất (BR-B01-03). */
private fun topReasons(factors: List<RescueRiskFactor>) =
    factors.filter { it.points > 0 }.sortedByDescending { it.points }.take(2).joinToString(" · ") { it.label }

private data class RiskStyle(val bg: Color, val fg: Color, val label: String)

private fun riskStyle(level: String) = when (level) {
    "CRITICAL" -> RiskStyle(SqCoral, Color.White, "Khẩn cấp")
    "HIGH" -> RiskStyle(SqCoralWash, SqCoralDeep, "Cao")
    "MEDIUM" -> RiskStyle(SqButterWash, WarningText, "Trung bình")
    else -> RiskStyle(SqMintWash, SqMintDeep, "Thấp")
}

/**
 * CM-B01 Rescue Timeline - GET store/rescue-timeline (snapshot do tác vụ nền tính; "Làm mới" tính lại ngay).
 * Hành động trên lô do backend quyết định (availableActions); app chỉ gửi những gì người dùng đang thấy.
 */
@Composable
fun RescueTimelineScreen(repository: StoreRepository, onBack: () -> Unit) {
    var data by remember { mutableStateOf<RescueTimelineResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var refreshing by remember { mutableStateOf(false) }
    var refreshError by remember { mutableStateOf<String?>(null) }
    var openLotId by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        loading = true
        error = null
        scope.launch {
            repository.getRescueTimeline().fold(onSuccess = { data = it }, onFailure = { error = it.message })
            loading = false
        }
    }

    fun refresh() {
        refreshing = true
        refreshError = null
        scope.launch {
            repository.refreshRescueTimeline().fold(onSuccess = { load() }, onFailure = { refreshError = it.message })
            refreshing = false
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp)) {
        ScreenHeader("Rescue Timeline", onBack) {
            IconButton(onClick = ::refresh, enabled = !refreshing) {
                Icon(Icons.Default.Refresh, contentDescription = "Làm mới", tint = SqCoralDeep)
            }
        }
        val d = data
        when {
            loading && d == null -> FullScreenLoading()
            error != null -> ErrorState(error!!, ::load)
            d != null -> {
                val ranked = d.items.filter { it.dataQualityStatus != "INSUFFICIENT" }
                val insufficient = d.items.filter { it.dataQualityStatus == "INSUFFICIENT" }
                LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item {
                        Text(
                            "Lô cần xử lý trước, theo số lượng còn, thời gian còn và tốc độ bán." +
                                (d.oldestCalculatedAt?.let { " Tính lúc ${hhmm(it)}." } ?: ""),
                            fontSize = 13.sp, color = SqInkSoft
                        )
                    }
                    if (refreshing) item { InfoBanner("Đang tính lại…") }
                    refreshError?.let { item { ErrorBanner(it) } }
                    if (d.needsRecalculation) {
                        item { InfoBanner("Một số lô có dữ liệu đã thay đổi hoặc đã cũ - đang hiển thị tạm tính. Bấm \"Làm mới\" để tính lại.") }
                    }
                    if (d.items.isEmpty()) {
                        item { EmptyState("Chưa có lô cần cứu", "Không có lô nào đang mở bán cần theo dõi.") }
                    }
                    items(ranked) { LotRow(it) { openLotId = it.lotId } }
                    if (insufficient.isNotEmpty()) {
                        item { SectionTitle("Chưa đủ dữ liệu để xếp mức nguy cơ") }
                        items(insufficient) { LotRow(it) { openLotId = it.lotId } }
                    }
                }
            }
        }
    }

    openLotId?.let { id ->
        LotDetailSheet(repository, id, onClose = { openLotId = null }, onChanged = ::load)
    }
}

@Composable
private fun LotRow(lot: RescueLot, onOpen: () -> Unit) {
    SqCard(modifier = Modifier.clickable(onClick = onOpen)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(lotName(lot.itemName, lot.kind), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                val note = if (lot.dataQualityStatus == "INSUFFICIENT") {
                    lot.riskFactors.firstOrNull { it.code == "VELOCITY_UNAVAILABLE" || it.code == "EXPIRY_INVALID" }?.label
                } else topReasons(lot.riskFactors).ifEmpty { "Không có yếu tố nguy cơ đáng kể" }
                note?.let { Text(it, fontSize = 12.sp, color = SqInkSoft) }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${lot.quantityAvailable} suất", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AccessTime, contentDescription = null, tint = SqInkMuted, modifier = Modifier.size(12.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(minutesLeft(lot.pickupEndAt), fontSize = 12.sp, color = SqInkSoft)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        RiskBadge(lot.riskLevel, lot.dataQualityStatus)
    }
}

/** Không hiển thị mức nguy cơ như dữ liệu hợp lệ khi dữ liệu thiếu/cũ (BR-B01-02). */
@Composable
private fun RiskBadge(level: String?, quality: String) {
    if (quality == "INSUFFICIENT" || level == null) {
        Pill("Chưa đủ dữ liệu", SqSurfaceSoft, SqInkMuted)
        return
    }
    val s = riskStyle(level)
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Pill(s.label, s.bg, s.fg)
        if (quality == "STALE") Text("Tạm tính", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = WarningText)
    }
}

@Composable
private fun Pill(text: String, bg: Color, fg: Color) {
    Text(
        text, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = fg,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 10.dp, vertical = 4.dp)
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LotDetailSheet(repository: StoreRepository, lotId: String, onClose: () -> Unit, onChanged: () -> Unit) {
    var lot by remember { mutableStateOf<RescueLotDetail?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<Pair<Boolean, String>?>(null) } // (isError, text)
    var extra by remember { mutableStateOf<String?>(null) }
    var stockForm by remember { mutableStateOf(false) }
    var delta by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("Bán tại quầy") }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch { repository.getRescueLot(lotId).fold(onSuccess = { lot = it }, onFailure = { error = it.message }) }
    }

    /** Sau khi backend ghi nhận, gọi tiếp API mà Rescue Timeline trỏ tới (xem giá, đề xuất giá, đối tác nhận). */
    suspend fun followUp(type: String, res: RescueActionResult) {
        when (type) {
            "UPDATE_STOCK" -> message = false to "Đã cập nhật tồn và tính lại mức nguy cơ."
            "REQUEST_MANAGER" -> message = false to "Đã chuyển yêu cầu cho quản lý."
            "VIEW_PRICE" -> res.next?.let { n ->
                repository.getRaw(n.path).onSuccess { j ->
                    val rec = j.getAsJsonObject("recommendation")
                    val proposed = rec?.get("proposedPrice")?.takeIf { !it.isJsonNull }?.asLong
                    extra = "Giá hiện tại ${currency(j.get("currentPrice").asLong)} (sàn ${currency(j.get("floorPrice").asLong)})" +
                        (proposed?.let { " · đề xuất ${currency(it)}" } ?: "") + ". " +
                        (rec?.get("explanation")?.takeIf { !it.isJsonNull }?.asString ?: "")
                }
            }
            "ADJUST_PRICE" -> res.next?.let { n ->
                repository.postRaw(n.path).onSuccess { j ->
                    val can = j.get("canPropose")?.asBoolean == true
                    val expl = j.get("explanation")?.takeIf { !it.isJsonNull }?.asString ?: ""
                    message = !can to (if (can) "Đã tạo đề xuất giá chờ duyệt. $expl" else expl)
                }
            }
            "OPEN_RESCUE_BRIDGE" -> res.next?.let { n ->
                repository.getRaw(n.path).onSuccess { j ->
                    extra = "Đối tác nhận quyên góp gần quán:\n" + j.getAsJsonArray("verifiedCharities").joinToString("\n") { c ->
                        val o = c.asJsonObject
                        "${o.get("name").asString} - ${o.get("address").asString} (${o.get("distanceKm").asString} km)"
                    }
                }
            }
        }
    }

    fun run(action: RescueAvailableAction, extraBody: Map<String, Any> = emptyMap()) {
        val current = lot ?: return
        busy = action.type
        message = null
        extra = null
        scope.launch {
            val body = mapOf<String, Any>("actionType" to action.type, "expectedQuantity" to current.quantityAvailable) + extraBody
            repository.rescueLotAction(lotId, body).fold(
                onSuccess = { res ->
                    stockForm = false
                    followUp(action.type, res)
                    reload()
                    onChanged()
                },
                onFailure = {
                    message = true to (it.message ?: "Không thực hiện được hành động.")
                    reload()
                    onChanged()
                }
            )
            busy = null
        }
    }

    LaunchedEffect(lotId) { reload() }

    ModalBottomSheet(
        onDismissRequest = onClose,
        containerColor = SqSurface,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp)) {
            val l = lot
            when {
                error != null -> ErrorState(error!!) { error = null; reload() }
                l == null -> FullScreenLoading()
                else -> {
                    Text(lotName(l.itemName, l.kind), fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                    Spacer(Modifier.height(8.dp))
                    RiskBadge(l.riskLevel, l.dataQualityStatus)
                    Text(
                        "${l.quantityAvailable}/${l.offer.totalQuantity} suất · ${minutesLeft(l.pickupEndAt)} · ${currency(l.offer.currentPrice)}",
                        fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.padding(top = 6.dp)
                    )
                    if (l.dataQualityStatus != "OK") {
                        Spacer(Modifier.height(10.dp))
                        InfoBanner(
                            if (l.dataQualityStatus == "INSUFFICIENT") "Chưa đủ dữ liệu - hệ thống không đưa ra mức nguy cơ cho lô này."
                            else "Tồn có thể đã cũ - mức nguy cơ chỉ là tạm tính. Hãy xác nhận lại tồn."
                        )
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("YẾU TỐ TÍNH TOÁN · LÚC ${hhmm(l.calculatedAt)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqInkMuted)
                    l.riskFactors.forEach { f ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(f.label, fontSize = 14.sp, color = SqInk, modifier = Modifier.weight(1f))
                            if (f.points > 0) Text("+${f.points}", fontSize = 13.sp, color = SqInkMuted)
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    l.availableActions.forEach { a ->
                        // App chưa có màn tạo túi bất ngờ từ Timeline (đã có ở màn Túi bất ngờ trong menu cửa hàng).
                        val noUi = a.type == "CREATE_SURPRISE_BAG"
                        val disabled = !a.enabled || noUi || busy != null
                        val why = if (noUi) "Tạo túi bất ngờ ở Cửa hàng › Túi bất ngờ" else a.disabledReason
                        val label = if (busy == a.type) "Đang xử lý…" else a.label + if (a.recommended) " · đề xuất" else ""
                        val onClick = {
                            when (a.type) {
                                "UPDATE_STOCK" -> stockForm = true
                                "REQUEST_MANAGER" -> run(a, mapOf("note" to "Cần xử lý lô ${lotName(l.itemName, l.kind)}"))
                                else -> run(a)
                            }
                        }
                        if (a.recommended && !disabled) {
                            Button(
                                onClick = onClick, modifier = Modifier.fillMaxWidth().height(48.dp),
                                shape = RoundedCornerShape(24.dp), colors = ButtonDefaults.buttonColors(containerColor = SqCoral)
                            ) { Text(label, fontWeight = FontWeight.Bold, color = Color.White) }
                        } else {
                            OutlinedButton(
                                onClick = onClick, enabled = !disabled, modifier = Modifier.fillMaxWidth().height(48.dp),
                                shape = RoundedCornerShape(24.dp), border = BorderStroke(1.dp, SqLine)
                            ) { Text(label, fontWeight = FontWeight.SemiBold, color = if (disabled) SqInkMuted else SqInk) }
                        }
                        why?.let { Text(it, fontSize = 12.sp, color = SqInkMuted, modifier = Modifier.padding(start = 6.dp, top = 2.dp)) }
                        Spacer(Modifier.height(8.dp))
                    }
                    if (stockForm) {
                        SqField("Thay đổi (+/-)", delta, keyboardType = androidx.compose.ui.text.input.KeyboardType.Number) { delta = it }
                        Spacer(Modifier.height(8.dp))
                        ChipRow(listOf("Bán tại quầy", "Làm thêm", "Hỏng", "Khác").map { it to it }, reason) { reason = it }
                        Spacer(Modifier.height(8.dp))
                        val n = delta.toIntOrNull()
                        PrimaryButton("Lưu", enabled = n != null && n != 0 && busy == null, onClick = {
                            l.availableActions.firstOrNull { it.type == "UPDATE_STOCK" }
                                ?.let { run(it, mapOf("deltaQuantity" to n!!, "reason" to reason)) }
                        })
                    }
                    message?.let { (isError, text) ->
                        Spacer(Modifier.height(8.dp))
                        if (isError) ErrorBanner(text) else InfoBanner(text)
                    }
                    extra?.let { Text(it, fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(top = 8.dp)) }
                    if (l.history.isNotEmpty()) {
                        Spacer(Modifier.height(14.dp))
                        Text("LỊCH SỬ HÀNH ĐỘNG", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqInkMuted)
                        l.history.forEach { h ->
                            Text(
                                "${hhmm(h.at)} · ${h.actorRole} · ${h.result?.get("actionType") ?: h.action} → ${h.result?.get("outcome") ?: h.result?.get("code") ?: ""}",
                                fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
