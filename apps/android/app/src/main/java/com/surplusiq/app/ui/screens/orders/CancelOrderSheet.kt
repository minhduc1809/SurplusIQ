package com.surplusiq.app.ui.screens.orders

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.clip
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.model.OrderStatus
import com.surplusiq.app.ui.components.LabelValueRow
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.CoralRedLight
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDateTimeMillis
import com.surplusiq.app.ui.util.formatTimeMillis
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.viewmodel.MyOrdersUiState

private val cancelReasons = listOf("Thay đổi kế hoạch", "Không đến kịp giờ nhận", "Đặt nhầm món hoặc số lượng", "Khác")
private const val OTHER_REASON = "Khác"

/** K30 - xác nhận hủy đơn (R1-043). Hạn hủy lấy từ server qua MyOrdersViewModel.prepareCancel. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CancelOrderSheet(
    order: ActiveOrder,
    state: MyOrdersUiState,
    onConfirm: (reason: String) -> Unit,
    onDismiss: () -> Unit
) {
    var selectedReason by remember { mutableStateOf<String?>(null) }
    var otherText by remember { mutableStateOf("") }
    val isPaid = order.status == OrderStatus.PAID_WAITING_PICKUP
    val deadline = state.cancelDeadlineMillis
    val isPastDeadline = deadline != null && System.currentTimeMillis() > deadline
    val reason = if (selectedReason == OTHER_REASON) otherText.trim().takeIf { it.length >= 5 }?.let { "Khác: $it" } else selectedReason
    val canSubmit = reason != null && !isPastDeadline && !state.isCancelling && !state.isCancelDeadlineLoading

    Column(
        modifier = Modifier
            .widthIn(max = 640.dp)
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(bottom = 24.dp)
    ) {
        Text(if (isPaid) "Hủy đơn hàng" else "Hủy giữ suất", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Text(order.deal.title.substringAfter("• ") + " · " + order.deal.storeName.substringBefore(" - "), fontSize = 13.sp, color = TextSecondary, maxLines = 1, modifier = Modifier.padding(top = 2.dp))

        Spacer(modifier = Modifier.height(14.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SurfaceSubtle).padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Mã đơn", fontSize = 11.sp, color = TextMuted)
                Text(order.orderCode, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("Số tiền hoàn", fontSize = 11.sp, color = TextMuted)
                Text(if (isPaid) formatVnd(order.totalPrice) else "Chưa thanh toán", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenPrimary)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(if (isPastDeadline) CoralRedLight else LilacWash).padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Schedule, contentDescription = null, tint = if (isPastDeadline) CoralRed else Color(0xFF6A5BC2), modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = when {
                    state.isCancelDeadlineLoading -> "Đang kiểm tra hạn hủy…"
                    deadline == null -> "Hệ thống sẽ kiểm tra hạn hủy khi bạn xác nhận."
                    isPastDeadline && isPaid -> "Đã quá hạn hủy (${formatDateTimeMillis(deadline)}). Nếu gặp sự cố, hãy gửi khiếu nại."
                    isPastDeadline -> "Thời gian giữ suất đã hết, đơn sẽ tự hủy."
                    else -> "Hủy được đến ${formatTimeMillis(deadline)} (${formatDateTimeMillis(deadline)})"
                },
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isPastDeadline) CoralRed else TextPrimary
            )
        }

        Spacer(modifier = Modifier.height(18.dp))
        Text("Lý do hủy", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            cancelReasons.forEach { item ->
                val selected = selectedReason == item
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
                        .background(if (selected) SkyBlueContainer else SurfaceSubtle)
                        .border(if (selected) 1.5.dp else 1.dp, if (selected) ForestGreenPrimary else DividerColor, RoundedCornerShape(14.dp))
                        .clickable(enabled = !isPastDeadline) { selectedReason = item }.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    RadioButton(selected = selected, onClick = null, enabled = !isPastDeadline, colors = RadioButtonDefaults.colors(selectedColor = ForestGreenPrimary))
                    Spacer(Modifier.width(10.dp))
                    Text(item, fontSize = 14.sp, color = TextPrimary, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal)
                }
            }
        }
        if (selectedReason == OTHER_REASON) {
            TextField(
                value = otherText,
                onValueChange = { if (it.length <= 200) otherText = it },
                placeholder = { Text("Nhập lý do (tối thiểu 5 ký tự)") },
                supportingText = { Text("${otherText.length}/200") },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(14.dp)),
                maxLines = 3,
                colors = TextFieldDefaults.colors(focusedContainerColor = SurfaceSubtle, unfocusedContainerColor = SurfaceSubtle, focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent)
            )
        }

        Text(
            "Không thể hoàn tác. Suất được trả lại, mã QR và mã nhận hộ bị vô hiệu." + if (isPaid) " Hủy đúng hạn được hoàn 100%." else "",
            fontSize = 12.sp,
            color = TextSecondary,
            modifier = Modifier.padding(top = 14.dp)
        )

        state.cancelError?.let {
            Text(it, fontSize = 13.sp, color = CoralRed, modifier = Modifier.padding(top = 10.dp))
        }

        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = onDismiss,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
        ) { Text("Giữ đơn", fontWeight = FontWeight.Bold, color = Color.White) }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = { reason?.let(onConfirm) },
            enabled = canSubmit,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            if (state.isCancelling) {
                CircularProgressIndicator(color = TextPrimary, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
            } else {
                Text("Xác nhận hủy", fontWeight = FontWeight.Bold, color = if (canSubmit) TextPrimary else TextMuted)
            }
        }
    }
}
