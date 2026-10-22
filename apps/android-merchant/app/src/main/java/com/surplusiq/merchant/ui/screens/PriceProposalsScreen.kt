package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.OfferDto
import com.surplusiq.merchant.data.PriceProposalDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant

/**
 * S36 - Đề xuất giá giảm theo giờ. Dùng họ endpoint store/decisions/pricing/... vì chỉ nó lưu đề xuất
 * (price_proposals, hạn 15 phút, duyệt/từ chối); store/offers/:id/pricing-recommendation chỉ tính tức thời.
 * Backend không trả dự kiến bán hết / tốc độ bán nên không hiển thị.
 */
@Composable
fun PriceProposalsScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Đề xuất giá theo giờ", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        ProGate(repository, "Đề xuất giá theo giờ", onUpgrade = { onNavigate("subscription") }) { ProposalsContent(repository) }
    }
}

@Composable
private fun ProposalsContent(repository: StoreRepository) {
    var proposals by remember { mutableStateOf<List<PriceProposalDto>?>(null) }
    var openOffers by remember { mutableStateOf<List<OfferDto>>(emptyList()) }
    var items by remember { mutableStateOf<Map<String, ItemDto>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var proposeNotes by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var now by remember { mutableStateOf(Instant.now()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { while (true) { delay(1000); now = Instant.now() } }
    LaunchedEffect(reloadKey) {
        error = null
        repository.getItemLookup().onSuccess { items = it }
        repository.getOffers(todayIso(), status = "OPEN", limit = 100).onSuccess { openOffers = it.data }
        repository.getPricingProposals().fold(onSuccess = { proposals = it }, onFailure = { error = it.message })
    }

    fun act(id: String, call: suspend () -> Result<com.surplusiq.merchant.data.MessageResponse>) {
        busyId = id
        message = null
        actionError = null
        scope.launch {
            val r = call()
            busyId = null
            r.fold(onSuccess = { message = it.message; reloadKey++ }, onFailure = { actionError = it.message })
        }
    }

    fun propose(offerId: String) {
        busyId = offerId
        actionError = null
        scope.launch {
            val r = repository.proposePrice(offerId)
            busyId = null
            r.fold(
                onSuccess = { res -> if (res.canPropose) reloadKey++ else proposeNotes = proposeNotes + (offerId to (res.explanation ?: "Chưa thể đề xuất.")) },
                onFailure = { actionError = it.message }
            )
        }
    }

    InlineError(actionError)
    InlineSuccess(message)
    when {
        error != null -> ErrorState(error!!) { reloadKey++ }
        proposals == null -> FullScreenLoading()
        else -> {
            SectionTitle("Chờ duyệt (${proposals!!.size})")
            Spacer(modifier = Modifier.height(8.dp))
            if (proposals!!.isEmpty()) {
                EmptyState("Không có đề xuất chờ duyệt", "Đề xuất tự động theo giờ còn lại và tồn kho, hoặc tạo cho suất đang mở.")
            }
            proposals!!.forEach { p ->
                ProposalCard(
                    p, p.offer?.itemId?.let(items::get), now, busy = busyId == p.id,
                    onAccept = { act(p.id) { repository.acceptPriceProposal(p.id) } },
                    onReject = { act(p.id) { repository.rejectPriceProposal(p.id) } }
                )
                Spacer(modifier = Modifier.height(10.dp))
            }

            val pendingOfferIds = proposals!!.map { it.offerId }.toSet()
            val candidates = openOffers.filter { it.id !in pendingOfferIds }
            if (candidates.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                SectionTitle("Suất đang mở hôm nay")
                Spacer(modifier = Modifier.height(8.dp))
                Column(modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(SqSurface).padding(horizontal = 16.dp, vertical = 8.dp)) {
                    candidates.forEach { o ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(o.itemId?.let(items::get)?.name ?: "Suất", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                                Text("${currency(o.currentPrice)} · còn ${o.remainingQuantity}/${o.totalQuantity} · nhận ${shortTime(o.pickupStart)}–${shortTime(o.pickupEnd)}", fontSize = 12.sp, color = SqInkSoft)
                                proposeNotes[o.id]?.let { Text(it, fontSize = 11.sp, color = SqInkMuted) }
                            }
                            TextButton(onClick = { propose(o.id) }, enabled = busyId == null) {
                                Text(if (busyId == o.id) "Đang tính..." else "Đề xuất giá", color = SqCoral)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProposalCard(
    p: PriceProposalDto,
    item: ItemDto?,
    now: Instant,
    busy: Boolean,
    onAccept: () -> Unit,
    onReject: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val left = runCatching { Duration.between(now, Instant.parse(p.expiresAt)) }.getOrDefault(Duration.ZERO)
    val expired = left.isNegative || left.isZero
    val offer = p.offer
    val current = offer?.currentPrice ?: p.oldPrice

    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item?.name ?: "Suất", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                offer?.let { Text("Còn ${it.remainingQuantity}/${it.totalQuantity} suất · nhận ${shortTime(it.pickupStart)}–${shortTime(it.pickupEnd)}", fontSize = 12.sp, color = SqInkSoft) }
            }
            Row(
                modifier = Modifier.clip(RoundedCornerShape(50)).background(if (expired) SqSurfaceSoft else SqButterWash).padding(horizontal = 10.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Timer, contentDescription = null, tint = SqInk, modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    if (expired) "Hết hiệu lực" else "%d:%02d".format(left.toMinutes(), left.seconds % 60),
                    fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqInk
                )
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(currency(current), fontSize = 13.sp, color = SqInkMuted, textDecoration = TextDecoration.LineThrough)
            Spacer(modifier = Modifier.width(8.dp))
            Text(currency(p.proposedPrice), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep)
            Spacer(modifier = Modifier.width(8.dp))
            Text("-${discountPercent(current, p.proposedPrice)}%", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
        }
        Text("Hiệu lực ${shortTime(p.createdAt)}–${shortTime(p.expiresAt)}", fontSize = 12.sp, color = SqInkSoft)

        TextButton(onClick = { expanded = !expanded }, contentPadding = PaddingValues(0.dp)) {
            Text(if (expanded) "Ẩn lý do" else "Xem lý do", color = SqCoral)
        }
        if (expanded) {
            Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqSurfaceSoft).padding(12.dp)) {
                val c = p.components
                c.num("timeElapsedRatio")?.let { InfoRow("Thời gian nhận đã trôi qua", "%.0f%%".format(it * 100)) }
                c.num("stockRemainingRatio")?.let { InfoRow("Tồn còn lại", "%.0f%%".format(it * 100)) }
                offer?.let { InfoRow("Đã bán", "${it.soldQuantity} suất") }
                (c.num("floorPrice") ?: offer?.floorPrice?.toDouble())?.let { InfoRow("Giá sàn", currency(it.toLong())) }
                c.num("priceChangeCount")?.let { InfoRow("Số lần đã đổi giá", "%.0f/3".format(it)) }
                item?.standardShelfLifeHours?.let { InfoRow("Hạn dùng chuẩn", "$it giờ") }
                (c?.get("reason") as? String)?.let { Text(it, fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 4.dp)) }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedButton(onClick = onReject, enabled = !busy, modifier = Modifier.weight(1f)) { Text("Từ chối", color = SqInkSoft) }
            PrimaryButton("Duyệt giá", modifier = Modifier.weight(1f), enabled = !expired, loading = busy, onClick = onAccept)
        }
    }
}
