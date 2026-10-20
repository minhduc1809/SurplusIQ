package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.JsonObject
import com.surplusiq.merchant.data.OfferEventDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*

/** Nhóm lọc -> các OfferEventType backend. */
private val HISTORY_FILTERS = listOf<Pair<String?, String>>(
    null to "Tất cả", "PRICE" to "Giá", "STOCK" to "Điều chỉnh tồn", "STATUS" to "Trạng thái", "EDIT" to "Chỉnh sửa",
)
private val FILTER_TYPES = mapOf(
    "PRICE" to setOf("PRICE_CHANGED"),
    "STOCK" to setOf("STOCK_ADJUSTED"),
    "STATUS" to setOf("CREATED", "OPENED", "CLOSED", "CANCELLED", "AUTO_CLOSED"),
    "EDIT" to setOf("EDITED"),
)
private val EVENT_LABELS = mapOf(
    "CREATED" to "Tạo suất", "OPENED" to "Mở bán", "EDITED" to "Chỉnh sửa thông tin", "STOCK_ADJUSTED" to "Điều chỉnh tồn",
    "PRICE_CHANGED" to "Đổi giá", "CLOSED" to "Đóng suất", "CANCELLED" to "Hủy suất", "AUTO_CLOSED" to "Tự đóng khi hết giờ nhận",
)

private fun JsonObject?.long(key: String): Long? =
    this?.get(key)?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asLong

/** Chi tiết cũ -> mới đọc từ payload jsonb của từng loại sự kiện (offers.service.ts). */
private fun eventDetail(e: OfferEventDto): String? {
    val p = e.payload
    return when (e.type) {
        "CREATED" -> if (p?.has("clonedFromOfferId") == true) "Nhân bản từ suất hôm qua"
            else listOfNotNull(p.long("totalQuantity")?.let { "$it suất" }, p.long("currentPrice")?.let { "giá ${currency(it)}" }).joinToString(", ").ifEmpty { null }
        "PRICE_CHANGED" -> {
            val old = p.long("oldPrice"); val new = p.long("newPrice")
            if (old != null && new != null) "Giá: ${currency(old)} → ${currency(new)} (lần ${p.long("changeCount") ?: "?"})" else null
        }
        "STOCK_ADJUSTED" -> {
            val delta = p.long("deltaQuantity") ?: 0
            "${if (delta > 0) "+" else ""}$delta suất · Còn: ${p.long("oldRemaining")} → ${p.long("newRemaining")} · Tổng: ${p.long("oldTotal")} → ${p.long("newTotal")}"
        }
        "CLOSED" -> p.long("wasteQuantity")?.let { "$it suất còn lại tính là bỏ" }
        "AUTO_CLOSED" -> p.long("remainingWaste")?.let { "$it suất còn lại tính là bỏ" }
        "CANCELLED" -> p.long("affectedOrdersCount")?.let { "$it đơn được hoàn tiền" }
        else -> null
    }
}

private fun eventNote(e: OfferEventDto): String? =
    e.payload?.get("note")?.takeIf { it.isJsonPrimitive }?.asString?.takeIf { it.isNotBlank() }

/** S29 - Lịch sử thay đổi của suất (GET store/offers/:id/history). */
@Composable
fun OfferHistoryScreen(repository: StoreRepository, offerId: String, onBack: () -> Unit) {
    var events by remember { mutableStateOf<List<OfferEventDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var filter by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }

    LaunchedEffect(attempt) {
        error = null
        repository.getOfferHistory(offerId).fold(onSuccess = { events = it.reversed() }, onFailure = { error = it.message })
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp).padding(top = 20.dp)) {
        ScreenHeader("Lịch sử thay đổi", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        ChipRow(HISTORY_FILTERS, filter) { filter = it }
        Spacer(modifier = Modifier.height(12.dp))
        when {
            error != null -> ErrorState(error!!) { attempt++ }
            events == null -> FullScreenLoading()
            else -> {
                val shown = events!!.filter { e -> filter == null || e.type in FILTER_TYPES.getValue(filter!!) }
                if (shown.isEmpty()) EmptyState("Chưa có thay đổi", "Không có sự kiện nào thuộc loại này.")
                else LazyColumn(contentPadding = PaddingValues(bottom = 20.dp)) {
                    items(shown, key = { it.id }) { e -> TimelineEntry(e, isLast = e == shown.last()) }
                }
            }
        }
    }
}

@Composable
private fun TimelineEntry(e: OfferEventDto, isLast: Boolean) {
    val accent = when (e.type) {
        "PRICE_CHANGED" -> SqButter
        "STOCK_ADJUSTED" -> SqLilac
        "CANCELLED", "CLOSED", "AUTO_CLOSED" -> SqCoral
        else -> SqMint
    }
    Row(modifier = Modifier.height(IntrinsicSize.Min)) {
        Column(modifier = Modifier.width(20.dp).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally) {
            Spacer(modifier = Modifier.height(6.dp))
            Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(accent))
            if (!isLast) Box(modifier = Modifier.width(2.dp).weight(1f).background(SqLine))
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f).padding(bottom = 18.dp)) {
            Text(EVENT_LABELS[e.type] ?: e.type, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
            Text(
                "${shortDateTime(e.createdAt)} · ${e.actorId?.let { "Nhân viên #${it.takeLast(6)}" } ?: "Hệ thống"}",
                fontSize = 12.sp, color = SqInkMuted
            )
            eventDetail(e)?.let { Text(it, fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(top = 4.dp)) }
            e.reason?.takeIf { it.isNotBlank() }?.let { Text("Lý do: $it", fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 2.dp)) }
            eventNote(e)?.let { Text("Ghi chú: $it", fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 2.dp)) }
        }
    }
}
