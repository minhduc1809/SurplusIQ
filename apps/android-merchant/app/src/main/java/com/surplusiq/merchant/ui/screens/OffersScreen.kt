package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.OfferDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

private val OFFER_STATUS = listOf(
    null to "Tất cả", "DRAFT" to "Nháp", "OPEN" to "Đang mở", "SOLD_OUT" to "Hết suất", "CLOSED" to "Đã đóng", "CANCELLED" to "Đã hủy",
)

/** Tên hiển thị của suất: túi bất ngờ không gắn món. */
internal fun offerTitle(offer: OfferDto, lookup: Map<String, ItemDto>): String = when {
    offer.kind == "SURPRISE_BAG" -> "Túi bất ngờ"
    else -> offer.item?.name ?: lookup[offer.itemId]?.name ?: "Món không xác định"
}

/** "Đang giữ" = đã đặt nhưng chưa tính là bán (backend chưa có cột riêng: tổng - còn - đã bán). */
internal fun heldQuantity(o: OfferDto): Int = (o.totalQuantity - o.remainingQuantity - o.soldQuantity).coerceAtLeast(0)

/** S25 - Danh sách suất theo ngày (GET store/offers có lọc trạng thái, món, phân trang). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OffersScreen(repository: StoreRepository, onNavigate: (String) -> Unit) {
    var date by rememberSaveable { mutableStateOf(LocalDate.now()) }
    var status by rememberSaveable { mutableStateOf<String?>(null) }
    var itemId by rememberSaveable { mutableStateOf<String?>(null) }
    var offers by remember { mutableStateOf<List<OfferDto>>(emptyList()) }
    var lookup by remember { mutableStateOf<Map<String, ItemDto>>(emptyMap()) }
    var page by remember { mutableIntStateOf(1) }
    var totalPages by remember { mutableIntStateOf(1) }
    var isLoading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var showPicker by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { lookup = repository.getItemLookup().getOrDefault(emptyMap()) }

    LaunchedEffect(date, status, itemId, reloadKey) {
        isLoading = true
        error = null
        repository.getOffers(date.toString(), status, itemId).fold(
            onSuccess = { offers = it.data; page = 1; totalPages = it.totalPages },
            onFailure = { error = it.message }
        )
        isLoading = false
    }

    fun loadMore() {
        loadingMore = true
        scope.launch {
            repository.getOffers(date.toString(), status, itemId, page + 1).onSuccess {
                offers = offers + it.data; page += 1; totalPages = it.totalPages
            }
            loadingMore = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp).padding(top = 20.dp)) {
        FoodSwitch("offers", onNavigate)
        TabHeader(
            title = "Thực phẩm", addLabel = "Tạo suất", onAdd = { onNavigate("offer-new") },
            menu = listOf(
                MenuEntry("Nhân bản suất hôm qua", Icons.Default.ContentCopy) { onNavigate("offers-clone") },
                MenuEntry("Túi bất ngờ", Icons.Default.CardGiftcard) { onNavigate("surprise-bags") },
                MenuEntry("Gợi ý tặng phần còn lại", Icons.Default.VolunteerActivism) { onNavigate("donation-suggestions") },
            )
        )
        Spacer(modifier = Modifier.height(12.dp))

        DatePill(
            label = dayLabel(date), canNext = true,
            onPrev = { date = date.minusDays(1) }, onNext = { date = date.plusDays(1) }, onPick = { showPicker = true }
        )
        Spacer(modifier = Modifier.height(10.dp))
        ChipRow(OFFER_STATUS, status) { status = it }
        Spacer(modifier = Modifier.height(8.dp))
        SqDropdown(
            "", listOf<Pair<String?, String>>(null to "Tất cả món") + lookup.values.map { it.id to it.name },
            itemId, searchable = true
        ) { itemId = it }
        Spacer(modifier = Modifier.height(10.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = { reloadKey++ })
            offers.isEmpty() -> EmptyState("Không có suất nào", "Chưa có suất phù hợp trong ngày này. Bấm + để tạo suất mới.")
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 92.dp)) {
                items(offers, key = { it.id }) { offer ->
                    OfferCard(offer, offerTitle(offer, lookup)) { onNavigate("offer/${offer.id}") }
                }
                if (page < totalPages) item {
                    TextButton(onClick = ::loadMore, enabled = !loadingMore, modifier = Modifier.fillMaxWidth()) {
                        Text(if (loadingMore) "Đang tải…" else "Tải thêm", color = SqCoral)
                    }
                }
            }
        }
    }

    if (showPicker) {
        val state = rememberDatePickerState(initialSelectedDateMillis = date.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { date = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate() }
                    showPicker = false
                }) { Text("Chọn", color = SqCoral) }
            },
            dismissButton = { TextButton(onClick = { showPicker = false }) { Text("Hủy", color = SqInkSoft) } }
        ) { DatePicker(state = state) }
    }
}

private fun dayLabel(date: LocalDate): String {
    val prefix = when (date) {
        LocalDate.now() -> "Hôm nay · "
        LocalDate.now().minusDays(1) -> "Hôm qua · "
        LocalDate.now().plusDays(1) -> "Ngày mai · "
        else -> ""
    }
    return prefix + shortDate(date.toString())
}

/** Thẻ suất: giá, tiến độ bán và 4 số tồn - dùng ở S25 và lịch sử suất của món (S21). */
@Composable
internal fun OfferCard(offer: OfferDto, title: String, onClick: () -> Unit) {
    val ordered = offer.totalQuantity - offer.remainingQuantity
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurface).clickable(onClick = onClick).padding(14.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Nhận ${shortTime(offer.pickupStart)} – ${shortTime(offer.pickupEnd)}", fontSize = 12.sp, color = SqInkSoft)
            }
            StatusBadge(status = offer.status)
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(currency(offer.currentPrice), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
            if (offer.originalPrice != offer.currentPrice) {
                Spacer(modifier = Modifier.width(6.dp))
                Text(currency(offer.originalPrice), fontSize = 12.sp, color = SqInkMuted, textDecoration = TextDecoration.LineThrough)
                Spacer(modifier = Modifier.width(6.dp))
                Text("-${discountPercent(offer.originalPrice, offer.currentPrice)}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqMintDeep)
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        LinearProgressIndicator(
            progress = { if (offer.totalQuantity > 0) ordered.toFloat() / offer.totalQuantity else 0f },
            color = SqMint, trackColor = SqSurfaceSoft,
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp))
        )
        Spacer(modifier = Modifier.height(8.dp))
        StockStats(offer)
    }
}

@Composable
internal fun StockStats(offer: OfferDto) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        listOf(
            "Tổng" to offer.totalQuantity, "Đã bán" to offer.soldQuantity,
            "Đang giữ" to heldQuantity(offer), "Còn" to offer.remainingQuantity,
        ).forEach { (label, value) ->
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("$value", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Text(label, fontSize = 11.sp, color = SqInkMuted)
            }
        }
    }
}
