package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CreatePromotionRequest
import com.surplusiq.merchant.data.PromotionDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDateTime

internal val PROMO_TARGETS = listOf("ALL" to "Tất cả khách", "FAVORITES" to "Khách yêu thích", "LOYAL" to "Khách thân thiết", "AT_RISK" to "Khách sắp rời bỏ")
private val PROMO_TYPES = listOf("PERCENT" to "Giảm %", "FIXED" to "Giảm tiền")

private fun valueLabel(p: PromotionDto) = if (p.type == "PERCENT") "-${p.value}%" else "-${currency(p.value)}"

/**
 * S59/S60 - Ưu đãi của cửa hàng (GET/POST store/marketing/promotions, PATCH .../:id/status). Chủ và quản lý.
 * Sửa (PUT .../:id) chỉ cho ưu đãi chưa có lượt dùng. Backend không chặn đưa giá thấp hơn giá sàn của suất.
 */
@Composable
fun PromotionsScreen(repository: StoreRepository, onBack: () -> Unit) {
    var list by remember { mutableStateOf<List<PromotionDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<PromotionDto?>(null) }
    var ending by remember { mutableStateOf<PromotionDto?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(reloadKey) {
        error = null
        repository.getPromotions().fold(onSuccess = { list = it }, onFailure = { error = it.message })
    }

    if (creating || editing != null) {
        PromotionForm(repository, editing, onCancel = { creating = false; editing = null }, onDone = { creating = false; editing = null; list = null; reloadKey++ })
        return
    }

    fun setStatus(p: PromotionDto, status: String) {
        actionError = null
        scope.launch {
            repository.setPromotionStatus(p.id, status).fold(onSuccess = { reloadKey++ }, onFailure = { actionError = it.message })
        }
    }

    LazyColumn(Modifier.fillMaxSize().background(SqCanvas), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item {
            ScreenHeader("Ưu đãi", onBack)
            Spacer(Modifier.height(8.dp))
            PrimaryButton("＋ Tạo ưu đãi", onClick = { creating = true })
            InlineError(actionError)
        }
        val l = list
        when {
            error != null -> item { ErrorState(error!!) { reloadKey++ } }
            l == null -> item { FullScreenLoading() }
            l.isEmpty() -> item { EmptyState("Chưa có ưu đãi", "Tạo ưu đãi để kéo khách quay lại mua suất của quán.") }
            else -> items(l, key = { it.id }) { p ->
                SqCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(p.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                        StatusBadge(p.status)
                    }
                    Text("${valueLabel(p)} · ${PROMO_TARGETS.firstOrNull { it.first == p.target }?.second ?: p.target}", fontSize = 13.sp, color = SqInkSoft)
                    Text("${shortDate(p.startAt)} – ${shortDate(p.endAt)}", fontSize = 12.sp, color = SqInkMuted)
                    Spacer(Modifier.height(6.dp))
                    val used = p.analytics?.usedOrdersCount ?: p.usedCount
                    InfoRow("Lượt dùng", "$used / ${p.maxUses}")
                    p.analytics?.let {
                        InfoRow("Doanh thu từ đơn dùng ưu đãi", currency(it.grossRevenueGenerated))
                        InfoRow("Tiền đã giảm", currency(it.totalDiscountGiven), SqCoralDeep)
                    }
                    if (p.status != "ENDED") Row {
                        if (used == 0) TextButton(onClick = { editing = p }, contentPadding = PaddingValues(0.dp)) { Text("Sửa", color = SqInk) }
                        Spacer(Modifier.width(16.dp))
                        if (p.status == "ACTIVE") TextButton(onClick = { setStatus(p, "PAUSED") }, contentPadding = PaddingValues(0.dp)) { Text("Tạm dừng", color = SqCoralDeep) }
                        if (p.status == "PAUSED" || p.status == "DRAFT") TextButton(onClick = { setStatus(p, "ACTIVE") }, contentPadding = PaddingValues(0.dp)) { Text("Kích hoạt", color = SqMintDeep) }
                        Spacer(Modifier.width(16.dp))
                        TextButton(onClick = { ending = p }, contentPadding = PaddingValues(0.dp)) { Text("Kết thúc sớm", color = SqInkSoft) }
                    }
                }
            }
        }
    }

    ending?.let { p ->
        ConfirmDialog(
            title = "Kết thúc ưu đãi?", message = "\"${p.name}\" sẽ dừng hẳn và không bật lại được.", confirmLabel = "Kết thúc",
            onDismiss = { ending = null }, onConfirm = { ending = null; setStatus(p, "ENDED") }
        )
    }
}

private fun isoToLocal(iso: String): LocalDateTime? =
    runCatching { java.time.Instant.parse(iso).atZone(java.time.ZoneId.systemDefault()).toLocalDateTime() }.getOrNull()

@Composable
private fun PromotionForm(repository: StoreRepository, initial: PromotionDto?, onCancel: () -> Unit, onDone: () -> Unit) {
    var name by remember { mutableStateOf(initial?.name.orEmpty()) }
    var type by remember { mutableStateOf(initial?.type ?: "PERCENT") }
    var value by remember { mutableStateOf(initial?.value?.toString().orEmpty()) }
    var target by remember { mutableStateOf(initial?.target ?: "ALL") }
    var maxUses by remember { mutableStateOf(initial?.maxUses?.toString().orEmpty()) }
    var minOrder by remember { mutableStateOf(initial?.minOrderAmount?.takeIf { it > 0 }?.toString().orEmpty()) }
    var start by remember { mutableStateOf<LocalDateTime?>(initial?.let { isoToLocal(it.startAt) } ?: LocalDateTime.now().withSecond(0).withNano(0)) }
    var end by remember { mutableStateOf<LocalDateTime?>(initial?.let { isoToLocal(it.endAt) }) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val v = value.toLongOrNull()
    val uses = maxUses.toIntOrNull()
    val problem = when {
        name.trim().length !in 2..60 -> "Tên ưu đãi từ 2 đến 60 ký tự."
        v == null || v < 1 -> "Nhập giá trị giảm."
        type == "PERCENT" && v > 100 -> "Giảm theo % tối đa 100."
        uses == null || uses < 1 -> "Nhập giới hạn lượt dùng."
        start == null || end == null -> "Chọn thời gian hiệu lực."
        !end!!.isAfter(start) -> "Thời gian kết thúc phải sau thời gian bắt đầu."
        else -> null
    }

    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader(if (initial == null) "Tạo ưu đãi" else "Sửa ưu đãi", onCancel)
        Spacer(Modifier.height(12.dp))
        SqCard {
            SqField("Tên ưu đãi (2–60 ký tự)", name) { name = it.take(60) }
            Spacer(Modifier.height(10.dp))
            Text("Loại", fontSize = 12.sp, color = SqInkSoft)
            ChipRow(PROMO_TYPES, type) { type = it }
            Spacer(Modifier.height(10.dp))
            SqField(if (type == "PERCENT") "Giảm bao nhiêu % (1–100)" else "Giảm bao nhiêu đồng", value, keyboardType = KeyboardType.Number) { value = it.filter(Char::isDigit).take(9) }
            Spacer(Modifier.height(10.dp))
            Text("Đối tượng", fontSize = 12.sp, color = SqInkSoft)
            ChipRow(PROMO_TARGETS, target) { target = it }
        }
        Spacer(Modifier.height(12.dp))
        SqCard {
            DateTimeField("Bắt đầu", start) { start = it }
            Spacer(Modifier.height(10.dp))
            DateTimeField("Kết thúc", end) { end = it }
            Spacer(Modifier.height(10.dp))
            SqField("Giới hạn lượt dùng", maxUses, keyboardType = KeyboardType.Number) { maxUses = it.filter(Char::isDigit).take(6) }
            Spacer(Modifier.height(10.dp))
            SqField("Đơn tối thiểu (đ, bỏ trống nếu không có)", minOrder, keyboardType = KeyboardType.Number) { minOrder = it.filter(Char::isDigit).take(9) }
        }
        Spacer(Modifier.height(12.dp))
        SqCard {
            SectionTitle("Xem trước")
            Spacer(Modifier.height(6.dp))
            Text(name.ifBlank { "Tên ưu đãi" }, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
            Text(
                (if (v == null) "—" else if (type == "PERCENT") "Giảm $v%" else "Giảm ${currency(v)}") +
                    " · " + (PROMO_TARGETS.firstOrNull { it.first == target }?.second ?: ""),
                fontSize = 14.sp, color = SqCoralDeep, fontWeight = FontWeight.Bold
            )
            minOrder.toLongOrNull()?.takeIf { it > 0 }?.let { Text("Đơn từ ${currency(it)}", fontSize = 12.sp, color = SqInkSoft) }
            Text("${start?.let { shortDate(it.toLocalDate().toString()) } ?: "…"} – ${end?.let { shortDate(it.toLocalDate().toString()) } ?: "…"}", fontSize = 12.sp, color = SqInkMuted)
        }
        Text("Ưu đãi trừ trực tiếp vào giá suất và hệ thống không tự chặn giá thấp hơn giá sàn. Hãy chọn mức giảm hợp lý.", fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(vertical = 8.dp))
        InlineError(error ?: problem.takeIf { name.isNotBlank() || value.isNotBlank() })
        PrimaryButton(if (initial == null) "Tạo ưu đãi" else "Lưu thay đổi", enabled = problem == null && !busy, loading = busy, onClick = {
            busy = true; error = null
            val req = CreatePromotionRequest(name.trim(), type, v!!, target, uses!!, start!!.toIsoUtc(), end!!.toIsoUtc(), minOrder.toLongOrNull())
            scope.launch {
                (if (initial == null) repository.createPromotion(req) else repository.updatePromotion(initial.id, req))
                    .fold(onSuccess = { onDone() }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}
