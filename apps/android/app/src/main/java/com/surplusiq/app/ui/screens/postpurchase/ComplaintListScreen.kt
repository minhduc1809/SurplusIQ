package com.surplusiq.app.ui.screens.postpurchase

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.ComplaintResponse
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.util.formatDate
import com.surplusiq.app.ui.util.formatVnd

/** Nhãn + màu cho ComplaintStatus của backend (PENDING_STORE/ACCEPTED/REJECTED/CLOSED). */
internal fun complaintStatusLabel(status: String): Pair<String, Color> = when (status) {
    "PENDING_STORE" -> "Chờ cửa hàng" to WarningOnLight
    "ACCEPTED" -> "Đã chấp nhận hoàn tiền" to MintDeep
    "REJECTED" -> "Bị từ chối" to CoralRed
    "CLOSED" -> "Đã đóng" to TextMuted
    else -> status to TextMuted
}

private val complaintFilters = listOf(null, "PENDING_STORE", "ACCEPTED", "REJECTED", "CLOSED")

/** K35 - Lịch sử khiếu nại (R1-067), lọc theo trạng thái. */
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

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Khiếu nại của tôi", onBackClick)
        Row(
            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            complaintFilters.forEach { status ->
                FilterChip(
                    selected = filter == status,
                    onClick = { filter = status },
                    label = { Text(status?.let { complaintStatusLabel(it).first } ?: "Tất cả", fontSize = 13.sp) }
                )
            }
        }
        when {
            isLoading && complaints.isEmpty() -> LoadingState()
            errorMessage != null -> ErrorState(errorMessage, onRetry)
            visible.isEmpty() -> EmptyState(
                icon = Icons.Default.ReportProblem,
                title = if (complaints.isEmpty()) "Bạn chưa có khiếu nại nào" else "Không có khiếu nại ở trạng thái này"
            )
            else -> LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(visible, key = { it.id }) { complaint ->
                    ComplaintCard(complaint, onClick = { onComplaintClick(complaint) })
                }
            }
        }
    }
}

@Composable
private fun ComplaintCard(complaint: ComplaintResponse, onClick: () -> Unit) {
    val (label, color) = complaintStatusLabel(complaint.status)
    SqCard(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        complaint.orderCode ?: "Đơn #${complaint.orderId.take(8).uppercase()}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    StatusChip(label, color)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(complaint.category, fontSize = 13.sp, color = TextSecondary)
                Text("Gửi ngày ${formatDate(complaint.createdAt)}", fontSize = 12.sp, color = TextMuted)
                if (complaint.status == "PENDING_STORE" && complaint.responseDueAt != null) {
                    Text("Hạn cửa hàng phản hồi: ${formatDate(complaint.responseDueAt)}", fontSize = 12.sp, color = TextMuted)
                }
                if ((complaint.refundAmount ?: 0) > 0) {
                    Text(
                        "Hoàn ${formatVnd(complaint.refundAmount)}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = ForestGreenPrimary
                    )
                }
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextMuted)
        }
    }
}
