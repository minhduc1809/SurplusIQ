package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.OrderDto
import com.surplusiq.merchant.data.PickupSlotDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.delay

private const val REFRESH_MS = 60_000L

/**
 * S42 - Lịch hẹn nhận hàng hôm nay theo khung 15 phút (GET store/pickup-schedule, chỉ hôm nay - backend
 * chưa hỗ trợ ngày mai). Ghi chú, "Khách sắp đến" và tên món ghép từ đơn hôm nay + suất hôm nay.
 */
@Composable
fun PickupScheduleScreen(repository: StoreRepository, onOpenOrder: (String) -> Unit, onBack: () -> Unit) {
    var slots by remember { mutableStateOf<List<PickupSlotDto>?>(null) }
    var orders by remember { mutableStateOf<Map<String, OrderDto>>(emptyMap()) }
    var itemByOffer by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        while (true) {
            error = null
            val today = todayIso()
            repository.getPickupSchedule().fold(onSuccess = { slots = it }, onFailure = { error = it.message })
            // Bổ sung hiển thị - lỗi ở đây không chặn lịch.
            repository.getOrders(null, today, limit = 100).onSuccess { r -> orders = r.data.associateBy { it.id } }
            val items = repository.getItemLookup().getOrDefault(emptyMap())
            repository.getOffers(today, limit = 100).onSuccess { r ->
                itemByOffer = r.data.mapNotNull { o -> o.itemId?.let(items::get)?.let { o.id to it.name } }.toMap()
            }
            delay(REFRESH_MS) // quầy để màn này mở - tự làm mới mỗi phút
        }
    }

    val sidePad = ((androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp.dp - 720.dp) / 2).coerceAtLeast(0.dp)
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = sidePad).padding(20.dp)) {
        ScreenHeader("Lịch hẹn nhận hàng", onBack) {
            IconButton(onClick = { reloadKey++ }) { Icon(Icons.Default.Refresh, contentDescription = "Làm mới", tint = SqInkSoft) }
        }
        Text("Hôm nay · tự làm mới mỗi phút", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.padding(start = 12.dp))
        Spacer(modifier = Modifier.height(12.dp))
        val list = slots
        when {
            error != null && list == null -> ErrorState(error!!) { reloadKey++ }
            list == null -> FullScreenLoading()
            list.isEmpty() -> EmptyState("Chưa có lịch hẹn", "Đơn đã thanh toán hôm nay sẽ xếp vào các khung 15 phút ở đây.")
            else -> list.forEach { slot ->
                val arriving = slot.orders.any { o -> o.status == "PAID" && orders[o.id]?.arrivingNotifiedAt != null }
                val toPrepare = slot.orders.filter { it.status == "PAID" }.sumOf { it.quantity }
                SqCard(modifier = if (arriving) Modifier.border(2.dp, SqButter, RoundedCornerShape(16.dp)) else Modifier) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(slot.timeSlot, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.weight(1f))
                        Text("${slot.orderCount} đơn · $toPrepare suất cần chuẩn bị", fontSize = 12.sp, color = SqInkSoft)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    slot.orders.forEach { o ->
                        val full = orders[o.id]
                        val isArriving = o.status == "PAID" && full?.arrivingNotifiedAt != null
                        Row(
                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                                .background(if (isArriving) SqButterWash else SqSurfaceSoft)
                                .clickable { onOpenOrder(o.id) }.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(o.code, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                                Text("${full?.offerId?.let(itemByOffer::get) ?: "Suất"} × ${o.quantity}", fontSize = 12.sp, color = SqInkSoft)
                                full?.note?.takeIf { it.isNotBlank() }?.let { Text("Ghi chú: $it", fontSize = 12.sp, color = SqCoralDeep) }
                                if (isArriving) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.AutoMirrored.Filled.DirectionsWalk, contentDescription = null, tint = SqInk, modifier = Modifier.size(14.dp))
                                        Text(" Khách sắp đến · báo lúc ${shortTime(full?.arrivingNotifiedAt)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqInk)
                                    }
                                }
                            }
                            StatusBadge(o.status)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
            }
        }
    }
}
