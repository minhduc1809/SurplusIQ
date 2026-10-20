package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.VolunteerActivism
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.DonationSuggestionDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.delay
import java.time.Duration
import java.time.Instant

private data class Suggestion(val s: DonationSuggestionDto, val title: String, val end: Instant?)

/**
 * S31 - Gợi ý tặng phần không bán được (GET store/donations/suggestions).
 * Danh sách nơi nhận tự nhập + nút "Đã tặng" của bản cũ đã bị backend bỏ; bàn giao nay đi qua Rescue Bridge.
 */
@Composable
fun DonationSuggestionsScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    var suggestions by remember { mutableStateOf<List<Suggestion>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    var now by remember { mutableStateOf(Instant.now()) }

    LaunchedEffect(Unit) { while (true) { delay(30_000); now = Instant.now() } }

    LaunchedEffect(attempt) {
        error = null
        val result = repository.getDonationSuggestions()
        val list = result.getOrElse { error = it.message; return@LaunchedEffect }.suggestions
        // Gợi ý chỉ có offerId: lấy suất đang mở + bảng món để hiện tên.
        val lookup = repository.getItemLookup().getOrDefault(emptyMap())
        val offers = repository.getOffers(date = null, status = "OPEN", limit = 100).getOrNull()?.data.orEmpty().associateBy { it.id }
        suggestions = list.map { s ->
            Suggestion(s, offers[s.offerId]?.let { offerTitle(it, lookup) } ?: "Suất đang mở", runCatching { Instant.parse(s.pickupSlot) }.getOrNull())
        }.sortedBy { it.end }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp).padding(top = 20.dp)) {
        ScreenHeader("Gợi ý tặng phần còn lại", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        when {
            error != null -> ErrorState(error!!) { attempt++ }
            suggestions == null -> FullScreenLoading()
            else -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 20.dp)) {
                item { RescueBridgePending() }
                item {
                    Text(
                        if (suggestions!!.isEmpty()) "Không còn suất tồn nào đang mở." else "Suất còn tồn - cân nhắc tặng cho nơi nhận hỗ trợ trước khi hết giờ nhận",
                        fontSize = 13.sp, color = SqInkSoft
                    )
                }
                items(suggestions!!, key = { it.s.offerId }) { sg -> SuggestionRow(sg, now) { onNavigate("offer/${sg.s.offerId}") } }
            }
        }
    }
}

@Composable
private fun SuggestionRow(sg: Suggestion, now: Instant, onClick: () -> Unit) {
    val minutes = sg.end?.let { Duration.between(now, it).toMinutes() }
    val urgent = minutes != null && minutes in 0..60
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurface).clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(sg.title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
            Text("Còn ${sg.s.remainingQuantity} suất · hết nhận lúc ${shortTime(sg.s.pickupSlot)}", fontSize = 12.sp, color = SqInkSoft)
        }
        Row(
            modifier = Modifier.clip(RoundedCornerShape(50)).background(if (urgent) SqCoralWash else SqSurfaceSoft).padding(horizontal = 10.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Timer, contentDescription = null, tint = if (urgent) SqCoralDeep else SqInkSoft, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                when {
                    minutes == null -> "—"
                    minutes < 0 -> "Đã hết giờ"
                    minutes < 60 -> "$minutes phút"
                    else -> "${minutes / 60}g ${minutes % 60}p"
                },
                fontSize = 12.sp, fontWeight = FontWeight.Bold, color = if (urgent) SqCoralDeep else SqInkSoft
            )
        }
    }
}

/** Bàn giao từ thiện đã chuyển sang Rescue Bridge (nơi nhận đã duyệt, ghép theo điều kiện); màn Android sẽ làm ở batch sau. */
@Composable
private fun RescueBridgePending() {
    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.VolunteerActivism, contentDescription = null, tint = SqMintDeep, modifier = Modifier.size(28.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text("Bàn giao qua Rescue Bridge", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Text(
                    "Nơi nhận nay là đơn vị đã được duyệt và ghép theo điều kiện, không còn danh sách tự nhập. " +
                        "Màn Rescue Bridge trên ứng dụng chưa có - tạm thời thực hiện bàn giao trên cổng web.",
                    fontSize = 12.sp, color = SqInkSoft
                )
            }
        }
    }
}
