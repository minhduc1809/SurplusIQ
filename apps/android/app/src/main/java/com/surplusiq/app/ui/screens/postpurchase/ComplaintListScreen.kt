package com.surplusiq.app.ui.screens.postpurchase

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.ui.screens.basket.BasketFrame
import com.surplusiq.app.ui.screens.basket.LilacInk
import com.surplusiq.app.ui.screens.basket.MutedText
import com.surplusiq.app.ui.screens.basket.Pill
import com.surplusiq.app.ui.screens.basket.WIDE_MAX_WIDTH
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDate
import com.surplusiq.app.ui.util.formatVnd

/** Nhãn và màu cho ComplaintStatus của backend (PENDING_STORE/ACCEPTED/REJECTED/CLOSED): cam, tím nhạt, đỏ, xám. */
internal fun complaintStatusLabel(status: String): Pair<String, Color> = when (status) {
    "PENDING_STORE" -> "Chờ cửa hàng" to SkyBluePrimary
    "ACCEPTED" -> "Đã hoàn tiền" to LilacInk
    "REJECTED" -> "Bị từ chối" to CoralRed
    "CLOSED" -> "Đã đóng" to TextSecondary
    else -> status to TextSecondary
}

private val complaintFilters = listOf(null, "PENDING_STORE", "ACCEPTED", "REJECTED", "CLOSED")

/** K35 - Lịch sử khiếu nại (R1-067), lọc theo trạng thái. Màn rộng tự chia lưới nhiều cột. */
@Composable
fun ComplaintListScreen(
    complaints: List<ComplaintResponse>,
    isLoading: Boolean,
    errorMessage: String?,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onComplaintClick: (ComplaintResponse) -> Unit
) {
    var filter by rememberSaveable { mutableStateOf<String?>(null) }
    val visible = complaints.filter { filter == null || it.status == filter }

    BasketFrame(title = "Khiếu nại của tôi", subtitle = "${complaints.size} khiếu nại", onBack = onBackClick) { inner ->
        Column(Modifier.padding(inner).fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
            LazyRow(
                Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(complaintFilters) { status ->
                    val on = filter == status
                    Text(
                        status?.let { complaintStatusLabel(it).first } ?: "Tất cả",
                        fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (on) Color.White else TextPrimary,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(if (on) SkyBluePrimary else SkyBlueContainer)
                            .clickable { filter = status }.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }
            when {
                isLoading && complaints.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = SkyBluePrimary) }
                errorMessage != null -> Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(errorMessage, color = CoralRed, fontSize = 14.sp)
                    TextButton(onClick = onRetry) { Text("Thử lại", color = SkyBluePrimary) }
                }
                visible.isEmpty() -> Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(if (complaints.isEmpty()) "Bạn chưa có khiếu nại nào" else "Không có khiếu nại ở trạng thái này", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = TextPrimary)
                    MutedText("Khiếu nại được gửi từ chi tiết đơn đã nhận hàng.")
                }
                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(340.dp),
                    modifier = Modifier.widthIn(max = WIDE_MAX_WIDTH).fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) { items(visible, key = { it.id }) { c -> ComplaintCard(c) { onComplaintClick(c) } } }
            }
        }
    }
}

@Composable
private fun ComplaintCard(complaint: ComplaintResponse, onClick: () -> Unit) {
    val (label, color) = complaintStatusLabel(complaint.status)
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(MaterialTheme.colorScheme.surface)
            .border(1.dp, DividerColor, RoundedCornerShape(20.dp)).clickable(onClick = onClick).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text(complaint.orderCode?.let { "Đơn #$it" } ?: "Đơn #${complaint.orderId.take(8).uppercase()}", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            Pill(label, if (complaint.status == "PENDING_STORE") SkyBlueContainer else if (complaint.status == "ACCEPTED") LilacWash else SurfaceSubtle, color)
        }
        complaint.store?.let { Text(it.name, fontSize = 13.sp, color = TextSecondary, maxLines = 1) }
        Text(complaint.category, fontSize = 13.sp, color = TextPrimary, maxLines = 2)
        Text("Gửi ngày ${formatDate(complaint.createdAt)}", fontSize = 12.sp, color = TextSecondary)
        if (complaint.status == "PENDING_STORE" && complaint.responseDueAt != null) {
            Text("Cửa hàng phản hồi trước ${formatDate(complaint.responseDueAt)}", fontSize = 12.sp, color = TextSecondary)
        }
        if ((complaint.refundAmount ?: 0) > 0) {
            Text("Hoàn ${formatVnd(complaint.refundAmount)}", fontSize = 14.sp, fontWeight = FontWeight.ExtraBold, color = SkyBluePrimary)
        }
    }
}
