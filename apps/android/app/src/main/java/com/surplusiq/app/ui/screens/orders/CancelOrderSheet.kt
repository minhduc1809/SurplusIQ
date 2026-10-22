package com.surplusiq.app.ui.screens.orders

import androidx.compose.foundation.layout.*
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
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = 24.dp)
    ) {
        Text(if (isPaid) "Hủy đơn hàng" else "Hủy giữ suất", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Spacer(modifier = Modifier.height(12.dp))

        SqCard(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                LabelValueRow("Mã đơn", order.orderCode)
                LabelValueRow("Món", "${order.deal.title} x${order.quantity}")
                LabelValueRow("Cửa hàng", order.deal.storeName)
                LabelValueRow(
                    "Số tiền hoàn",
                    if (isPaid) formatVnd(order.totalPrice) else "Chưa thanh toán",
                    valueColor = ForestGreenPrimary,
                    bold = isPaid
                )
            }
        }
        if (isPaid) {
            Text(
                "Hoàn 100% về tài khoản đã thanh toán khi hủy đúng hạn.",
                fontSize = 12.sp,
                color = TextMuted,
                modifier = Modifier.padding(top = 6.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Schedule, contentDescription = null, tint = if (isPastDeadline) CoralRed else ForestGreenPrimary, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = when {
                    state.isCancelDeadlineLoading -> "Đang kiểm tra hạn hủy…"
                    deadline == null -> "Không xác định được hạn hủy, hệ thống sẽ kiểm tra khi bạn xác nhận."
                    isPastDeadline && isPaid -> "Đã quá hạn hủy (${formatDateTimeMillis(deadline)}), tức 60 phút trước giờ nhận. Nếu gặp sự cố, hãy gửi khiếu nại."
                    isPastDeadline -> "Thời gian giữ suất đã hết, đơn sẽ tự hủy."
                    else -> "Hủy được đến ${formatTimeMillis(deadline)} (${formatDateTimeMillis(deadline)})"
                },
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isPastDeadline) CoralRed else TextPrimary
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
        Text("Lý do hủy", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
        Spacer(modifier = Modifier.height(8.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            cancelReasons.forEach { item ->
                FilterChip(
                    selected = selectedReason == item,
                    onClick = { selectedReason = item },
                    label = { Text(item, fontSize = 13.sp) },
                    enabled = !isPastDeadline
                )
            }
        }
        if (selectedReason == OTHER_REASON) {
            OutlinedTextField(
                value = otherText,
                onValueChange = { if (it.length <= 200) otherText = it },
                label = { Text("Lý do khác (tối thiểu 5 ký tự)") },
                supportingText = { Text("${otherText.length}/200") },
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                shape = RoundedCornerShape(10.dp),
                maxLines = 3
            )
        }

        Spacer(modifier = Modifier.height(16.dp))
        Surface(color = CoralRedLight, shape = RoundedCornerShape(10.dp), modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.WarningAmber, contentDescription = null, tint = CoralRed, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Không thể hoàn tác. Suất sẽ được nhả lại cho người khác, mã QR và mã nhận hộ bị vô hiệu.",
                    fontSize = 12.sp,
                    color = CoralRed
                )
            }
        }

        state.cancelError?.let {
            Text(it, fontSize = 13.sp, color = CoralRed, modifier = Modifier.padding(top = 10.dp))
        }

        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { reason?.let(onConfirm) },
            enabled = canSubmit,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(25.dp),
            colors = ButtonDefaults.buttonColors(containerColor = CoralRed)
        ) {
            if (state.isCancelling) {
                CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
            } else {
                Text("Xác nhận hủy", fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
        TextButton(onClick = onDismiss, modifier = Modifier.fillMaxWidth()) {
            Text("Giữ đơn", color = TextSecondary, fontWeight = FontWeight.SemiBold)
        }
    }
}
