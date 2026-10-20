package com.surplusiq.app.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CallMade
import androidx.compose.material.icons.filled.CallReceived
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.PaymentTransactionRecordDto
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LabelValueRow
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import com.surplusiq.app.ui.util.formatDateTime
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.util.parseIsoMillis

private fun isRefund(kind: String) = kind.endsWith("_REFUND")

private fun txStatusLabel(status: String): Pair<String, Color> = when (status) {
    "SUCCEEDED" -> "Thành công" to MintDeep
    "PENDING_CONFIRM" -> "Chờ xác nhận" to WarningOnLight
    "MANUAL_REVIEW" -> "Đang đối soát" to WarningOnLight
    "FAILED" -> "Lỗi" to CoralRed
    else -> status to TextMuted
}

private val kindFilters = listOf("ALL" to "Tất cả", "PAYMENT" to "Thanh toán", "REFUND" to "Hoàn tiền")
private val rangeFilters = listOf(0 to "Mọi lúc", 7 to "7 ngày", 30 to "30 ngày", 90 to "90 ngày")

/** K46 - Lịch sử thanh toán và hoàn tiền (R1-077, R1-047). */
@Composable
fun TransactionHistoryScreen(
    transactions: List<PaymentTransactionRecordDto>,
    isLoading: Boolean,
    errorMessage: String?,
    knownOrders: List<ActiveOrder>,
    onBackClick: () -> Unit,
    onRetry: () -> Unit
) {
    var kind by rememberSaveable { mutableStateOf("ALL") }
    var rangeDays by rememberSaveable { mutableStateOf(0) }
    var expandedId by rememberSaveable { mutableStateOf<String?>(null) }
    val since = if (rangeDays == 0) 0L else System.currentTimeMillis() - rangeDays * 24L * 60 * 60 * 1000
    val visible = transactions.filter { tx ->
        (kind == "ALL" || (kind == "REFUND") == isRefund(tx.kind)) &&
            (parseIsoMillis(tx.createdAt) ?: 0L) >= since
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        BackTopBar("Thanh toán & hoàn tiền", onBackClick)
        Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
            FilterRow(kindFilters, kind) { kind = it }
            FilterRow(rangeFilters, rangeDays) { rangeDays = it }
        }
        when {
            isLoading && transactions.isEmpty() -> LoadingState()
            errorMessage != null -> ErrorState(errorMessage, onRetry)
            visible.isEmpty() -> EmptyState(Icons.Default.ReceiptLong, "Chưa có giao dịch nào phù hợp")
            else -> LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(visible, key = { it.id }) { tx ->
                    TransactionCard(
                        tx = tx,
                        orderCode = knownOrders.find { it.id == tx.orderId }?.orderCode,
                        expanded = expandedId == tx.id,
                        onClick = { expandedId = if (expandedId == tx.id) null else tx.id }
                    )
                }
            }
        }
    }
}

@Composable
private fun <T> FilterRow(options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit) {
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.forEach { (value, label) ->
            FilterChip(selected = selected == value, onClick = { onSelect(value) }, label = { Text(label, fontSize = 13.sp) })
        }
    }
}

@Composable
private fun TransactionCard(tx: PaymentTransactionRecordDto, orderCode: String?, expanded: Boolean, onClick: () -> Unit) {
    val refund = isRefund(tx.kind)
    val (statusText, statusColor) = txStatusLabel(tx.status)
    val accent = if (refund) InfoOnLight else TextPrimary
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier.size(36.dp).background(accent.copy(alpha = 0.1f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (refund) Icons.Default.CallReceived else Icons.Default.CallMade,
                        contentDescription = null,
                        tint = accent,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(if (refund) "Hoàn tiền" else "Thanh toán", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text(formatDateTime(tx.createdAt), fontSize = 12.sp, color = TextMuted)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        (if (refund) "+" else "-") + formatVnd(tx.amount),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = accent
                    )
                    StatusChip(statusText, statusColor)
                }
            }
            if (expanded) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                LabelValueRow("Mã giao dịch", tx.gatewayTxnId)
                LabelValueRow("Mã đơn", orderCode ?: tx.orderId?.take(8)?.uppercase() ?: "—")
                tx.method?.let { LabelValueRow("Phương thức", it) }
                tx.parentTxnId?.let { LabelValueRow("Hoàn cho giao dịch", it) }
                Spacer(modifier = Modifier.height(6.dp))
                Text("Dòng thời gian", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                TimelineLine("Khởi tạo", formatDateTime(tx.createdAt), WarningOnLight)
                if (tx.status != "PENDING_CONFIRM") {
                    TimelineLine(statusText, formatDateTime(tx.updatedAt ?: tx.createdAt), statusColor)
                }
            }
        }
    }
}

@Composable
private fun TimelineLine(title: String, time: String, color: Color) {
    Row(modifier = Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(8.dp).background(color, CircleShape))
        Spacer(modifier = Modifier.width(8.dp))
        Text(title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, modifier = Modifier.weight(1f))
        Text(time, fontSize = 12.sp, color = TextMuted)
    }
}
