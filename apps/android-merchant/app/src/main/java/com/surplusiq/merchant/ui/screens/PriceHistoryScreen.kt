package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.OfferEventDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate

private data class PriceChange(val offerId: String, val itemName: String, val event: OfferEventDto, val oldPrice: Long, val newPrice: Long, val approved: Boolean)

// offers.service applyPricingRecommendation ghi note này khi chủ quán bấm áp dụng giá đề xuất.
private const val APPLIED_PREFIX = "Áp dụng định giá động"
private val SOURCES = listOf(null to "Tất cả", true to "Chủ duyệt", false to "Thủ công")

/**
 * S37 - Lịch sử quyết định giá: sự kiện PRICE_CHANGED của các suất trong ngày (GET store/offers?date= rồi
 * GET store/offers/:id/history cho từng suất). Backend không có API lịch sử giá toàn quán.
 */
@Composable
fun PriceHistoryScreen(repository: StoreRepository, onBack: () -> Unit) {
    var date by remember { mutableStateOf(LocalDate.now()) }
    var changes by remember { mutableStateOf<List<PriceChange>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var source by remember { mutableStateOf<Boolean?>(null) }
    var selected by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(date, reloadKey) {
        error = null
        changes = null
        selected = null
        val items = repository.getItemLookup().getOrDefault(emptyMap())
        val offers = repository.getOffers(date.toString(), limit = 100).getOrElse { error = it.message; return@LaunchedEffect }.data
        // shortcut: một request lịch sử cho mỗi suất (≤100/ngày); đổi sang API gộp khi backend có.
        val histories = coroutineScope { offers.map { o -> async { o to repository.getOfferHistory(o.id) } }.awaitAll() }
        histories.firstNotNullOfOrNull { it.second.exceptionOrNull() }?.let { error = it.message; return@LaunchedEffect }
        changes = histories.flatMap { (o, h) ->
            h.getOrThrow().filter { it.type == "PRICE_CHANGED" }.map { e ->
                PriceChange(
                    offerId = o.id,
                    itemName = o.itemId?.let(items::get)?.name ?: "Suất",
                    event = e,
                    oldPrice = e.payload?.get("oldPrice")?.asLong ?: 0,
                    newPrice = e.payload?.get("newPrice")?.asLong ?: 0,
                    approved = e.reason?.startsWith(APPLIED_PREFIX) == true
                )
            }
        }.sortedByDescending { it.event.createdAt }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Lịch sử quyết định giá", onBack)
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { date = date.minusDays(1) }) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Ngày trước", tint = SqInk)
            }
            Text(shortDate(date.toString()), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            IconButton(onClick = { date = date.plusDays(1) }, enabled = date < LocalDate.now()) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Ngày sau", tint = if (date < LocalDate.now()) SqInk else SqLine)
            }
        }
        ChipRow(SOURCES, source) { source = it }
        Spacer(modifier = Modifier.height(12.dp))

        val all = changes
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            all == null -> FullScreenLoading()
            else -> {
                val rows = all.filter { source == null || it.approved == source }
                selected?.let { id -> PriceChart(all.filter { it.offerId == id }.sortedBy { it.event.createdAt }) }
                if (rows.isEmpty()) {
                    EmptyState("Không có thay đổi giá", "Chưa có lần đổi giá nào trong ngày này.")
                } else {
                    Column(modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(SqSurface)) {
                        rows.forEach { c ->
                            Row(
                                modifier = Modifier.fillMaxWidth()
                                    .background(if (selected == c.offerId) SqCoralWash else SqSurface)
                                    .clickable { selected = c.offerId }
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(shortTime(c.event.createdAt), fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.width(48.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(c.itemName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                                    Text("${currency(c.oldPrice)} → ${currency(c.newPrice)}", fontSize = 12.sp, color = SqInkSoft)
                                }
                                Text(if (c.approved) "Chủ duyệt" else "Thủ công", fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                    color = if (c.approved) SqMintDeep else SqInkSoft)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Giá duyệt từ màn Đề xuất giá và giá đổi tự động hiện chưa được máy chủ ghi vào lịch sử suất; số bán sau 30 phút chưa có dữ liệu.",
                    fontSize = 11.sp, color = SqInkMuted
                )
            }
        }
    }
}

@Composable
private fun PriceChart(changes: List<PriceChange>) {
    if (changes.isEmpty()) return
    SqCard {
        SectionTitle("Giá theo giờ · ${changes.first().itemName}")
        Spacer(modifier = Modifier.height(10.dp))
        LineChart(
            series = listOf(ChartSeries("Giá", listOf(changes.first().oldPrice.toFloat()) + changes.map { it.newPrice.toFloat() }, SqCoral)),
            xLabels = listOf("Đầu") + changes.map { shortTime(it.event.createdAt) },
            describe = "Giá ${changes.first().itemName} từ ${currency(changes.first().oldPrice)} đến ${currency(changes.last().newPrice)}",
            yFormat = { "%.0fk".format(it / 1000) }
        )
    }
    Spacer(modifier = Modifier.height(12.dp))
}
