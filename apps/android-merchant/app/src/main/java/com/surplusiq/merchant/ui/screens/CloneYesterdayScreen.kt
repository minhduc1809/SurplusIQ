package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CloneYesterdayRequest
import com.surplusiq.merchant.data.OfferDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.UpdateOfferRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Một suất hôm qua kèm giá trị sửa nhanh (điền sẵn theo hôm qua). */
private class CloneRow(val offer: OfferDto, val title: String, val archived: Boolean) {
    var selected by mutableStateOf(!archived)
    var qty by mutableStateOf(offer.totalQuantity.toString())
    var price by mutableStateOf(offer.currentPrice.toString())
    var start by mutableStateOf(shortTime(offer.pickupStart))
    var end by mutableStateOf(shortTime(offer.pickupEnd))
    var error by mutableStateOf<String?>(null)
    var done by mutableStateOf(false)

    fun validate(): String? {
        val q = qty.toIntOrNull()
        return when {
            q == null || q !in 1..500 -> "Số lượng từ 1 đến 500."
            else -> offerPriceError(price.toLongOrNull(), offer.originalPrice, offer.floorPrice ?: floorPriceFor(offer.originalPrice))
                ?: pickupWindowError(start, end)
        }
    }
}

/**
 * S27 - Nhân bản suất hôm qua (POST store/offers/clone-yesterday, rồi PATCH từng suất mới với giá trị đã sửa).
 * Gọi clone từng suất một để biết chắc suất mới tương ứng suất nguồn nào.
 */
@Composable
fun CloneYesterdayScreen(repository: StoreRepository, onDone: () -> Unit, onBack: () -> Unit) {
    val today = remember { LocalDate.now() }
    var rows by remember { mutableStateOf<List<CloneRow>?>(null) }
    var closedToday by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    var openNow by remember { mutableStateOf(false) }
    var running by remember { mutableStateOf(false) }
    var summary by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(attempt) {
        error = null
        val lookup = repository.getItemLookup().getOrDefault(emptyMap())
        closedToday = repository.getClosures().getOrNull().orEmpty().any { it.date == today.toString() && it.type == "CLOSED" }
        repository.getOffers(today.minusDays(1).toString(), limit = 100).fold(
            onSuccess = { r ->
                rows = r.data.map { o -> CloneRow(o, offerTitle(o, lookup), archived = o.itemId?.let { lookup[it]?.status } == "ARCHIVED") }
            },
            onFailure = { error = it.message }
        )
    }

    val selected = rows.orEmpty().filter { it.selected && !it.done }

    fun createToday() {
        selected.forEach { it.error = it.validate() }
        if (selected.any { it.error != null }) return
        running = true
        summary = null
        scope.launch {
            var created = 0
            selected.forEach { row ->
                val result = repository.cloneYesterday(CloneYesterdayRequest(listOf(row.offer.id), today.toString()))
                val clone = result.getOrNull()?.clonedOffers?.firstOrNull()
                if (clone == null) {
                    row.error = result.exceptionOrNull()?.message ?: result.getOrNull()?.skippedOffers?.firstOrNull()?.reason ?: "Không nhân bản được suất này."
                    return@forEach
                }
                // Luôn gửi lại khung nhận theo giờ máy cho hôm nay; chỉ gửi giá khi đổi (mỗi lần đổi giá tính vào giới hạn 3 lần).
                val newPrice = row.price.toLong()
                val patch = UpdateOfferRequest(
                    totalQuantity = row.qty.toInt().takeIf { it != clone.totalQuantity },
                    currentPrice = newPrice.takeIf { it != clone.currentPrice },
                    pickupStart = isoAt(today, row.start),
                    pickupEnd = isoAt(today, row.end),
                    status = if (openNow) "OPEN" else null,
                )
                repository.updateOffer(clone.id, patch).fold(
                    onSuccess = { row.done = true; row.selected = false; created++ },
                    onFailure = { row.error = "Đã tạo nháp nhưng chưa áp dụng thay đổi: ${it.message}"; row.done = true }
                )
            }
            summary = "Đã tạo $created suất ${if (openNow) "đang mở" else "nháp"} cho hôm nay."
            running = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp).padding(top = 20.dp)) {
        ScreenHeader("Nhân bản suất hôm qua", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        when {
            error != null -> ErrorState(error!!) { attempt++ }
            rows == null -> FullScreenLoading()
            rows!!.isEmpty() -> EmptyState("Hôm qua chưa có suất nào", "Không có suất để nhân bản. Hãy tạo suất mới.")
            else -> {
                LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 12.dp)) {
                    if (closedToday) item { ErrorBanner("Hôm nay cửa hàng đã khai báo nghỉ. Suất tạo ra sẽ không có khách nhận.") }
                    summary?.let { item { InfoBanner(it) } }
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SqChip("Lưu nháp", !openNow) { openNow = false }
                            SqChip("Mở bán ngay", openNow) { openNow = true }
                        }
                    }
                    items(rows!!, key = { it.offer.id }) { row -> CloneRowCard(row) }
                }
                if (selected.isNotEmpty()) {
                    SelectionBar("Đã chọn ${selected.size} suất", "Tạo suất hôm nay", loading = running, onAction = ::createToday)
                } else if (summary != null) {
                    PrimaryButton("Xem danh sách suất", onClick = onDone)
                }
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}

@Composable
private fun CloneRowCard(row: CloneRow) {
    val o = row.offer
    Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurface).padding(end = 14.dp, bottom = 12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(
                checked = row.selected, onCheckedChange = { row.selected = it; row.error = null },
                enabled = !row.archived && !row.done, colors = CheckboxDefaults.colors(checkedColor = SqCoral)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(row.title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                Text(
                    "Hôm qua: đặt ${o.totalQuantity - o.remainingQuantity}/${o.totalQuantity} · ${currency(o.currentPrice)} · ${shortTime(o.pickupStart)}–${shortTime(o.pickupEnd)}",
                    fontSize = 12.sp, color = SqInkSoft
                )
            }
            when {
                row.done && row.error == null -> StatusBadge("Đã tạo")
                row.archived -> StatusBadge("ARCHIVED")
            }
        }
        Column(modifier = Modifier.padding(start = 14.dp)) {
            if (row.archived) Text("Món đã lưu trữ - khôi phục món để nhân bản suất này.", fontSize = 12.sp, color = SqCoralDeep)
            if (row.selected) {
                Spacer(modifier = Modifier.height(6.dp))
                Row {
                    SqField("Số lượng", row.qty, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number) { row.qty = it.filter(Char::isDigit).take(3) }
                    Spacer(modifier = Modifier.width(8.dp))
                    SqField("Giá bán", row.price, modifier = Modifier.weight(1.3f), keyboardType = KeyboardType.Number) { row.price = it.filter(Char::isDigit).take(7) }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row {
                    SqField("Nhận từ", row.start, modifier = Modifier.weight(1f)) { row.start = it.take(5) }
                    Spacer(modifier = Modifier.width(8.dp))
                    SqField("Đến", row.end, modifier = Modifier.weight(1f)) { row.end = it.take(5) }
                }
            }
            InlineError(row.error)
        }
    }
}
