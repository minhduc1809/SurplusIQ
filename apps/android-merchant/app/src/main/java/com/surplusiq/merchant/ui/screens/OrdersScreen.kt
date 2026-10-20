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
import androidx.compose.material.icons.automirrored.filled.StickyNote2
import androidx.compose.material.icons.automirrored.filled.EventNote
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.OrderDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

private val STATUS_FILTERS = listOf(
    null to "Tất cả",
    "PAID" to "Chờ nhận",
    "PENDING_PAYMENT" to "Chờ thanh toán",
    "PICKED_UP" to "Đã nhận",
    "PICKUP_EXPIRED" to "Quá hạn nhận",
    "CANCELLED" to "Đã hủy",
    "REFUNDED" to "Đã hoàn tiền"
)

/**
 * S39 - Danh sách đơn (GET store/orders: lọc status + date theo ngày tạo, phân trang 20). Mặc định đơn hôm nay.
 * Backend không trả tên khách và không lọc theo món / tìm theo mã - ô tìm chỉ lọc trong các trang đã tải.
 */
@Composable
fun OrdersScreen(repository: StoreRepository, onNavigate: (String) -> Unit = {}) {
    var orders by remember { mutableStateOf<List<OrderDto>>(emptyList()) }
    var page by remember { mutableIntStateOf(1) }
    var totalPages by remember { mutableIntStateOf(1) }
    var isLoading by remember { mutableStateOf(true) }
    var loadingMore by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var date by remember { mutableStateOf<LocalDate?>(LocalDate.now()) }
    var search by remember { mutableStateOf("") }
    var exporting by remember { mutableStateOf(false) }
    var exportMsg by remember { mutableStateOf<String?>(null) }
    var exportError by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val saveCsv = rememberFileSaver("text/csv") { ok -> if (ok) exportMsg = "Đã lưu tệp CSV." else exportError = "Không ghi được tệp." }

    LaunchedEffect(status, date, reloadKey) {
        isLoading = true
        error = null
        repository.getOrders(status, date?.toString(), page = 1).fold(
            onSuccess = { orders = it.data; page = 1; totalPages = it.totalPages },
            onFailure = { error = it.message }
        )
        isLoading = false
    }

    fun loadMore() {
        loadingMore = true
        scope.launch {
            repository.getOrders(status, date?.toString(), page = page + 1).fold(
                onSuccess = { orders = orders + it.data; page = it.page; totalPages = it.totalPages },
                onFailure = { error = it.message }
            )
            loadingMore = false
        }
    }

    fun exportCsv() {
        exporting = true
        exportMsg = null
        exportError = null
        scope.launch {
            // Kiểm tra hạn mức trước để báo rõ thay vì để backend từ chối.
            val quota = repository.getQuotas().getOrNull()?.get("export_orders")
            if (quota?.isExceeded == true) {
                exporting = false
                exportError = "Đã hết lượt xuất đơn (${quota.used}/${quota.limit}). Nâng cấp gói để xuất thêm."
                return@launch
            }
            val d = date?.toString()
            val r = repository.exportOrders(d, d)
            exporting = false
            r.fold(onSuccess = { saveCsv(it.filename, it.content.toByteArray(Charsets.UTF_8)) }, onFailure = { exportError = it.message })
        }
    }

    val visible = orders.filter { search.isBlank() || it.code.contains(search.trim(), ignoreCase = true) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(SqCanvas),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Đơn hàng", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.weight(1f))
                IconButton(onClick = { onNavigate("pickup-schedule") }) {
                    Icon(Icons.AutoMirrored.Filled.EventNote, contentDescription = "Lịch hẹn nhận hàng", tint = SqInkSoft)
                }
                IconButton(onClick = ::exportCsv, enabled = !exporting) {
                    if (exporting) CircularProgressIndicator(color = SqCoral, strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                    else Icon(Icons.Default.FileDownload, contentDescription = "Xuất CSV", tint = SqInkSoft)
                }
            }
            InlineError(exportError)
            InlineSuccess(exportMsg)
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { date = (date ?: LocalDate.now()).minusDays(1) }) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Ngày trước", tint = SqInk)
                }
                Text(
                    when (date) { null -> "Tất cả ngày"; LocalDate.now() -> "Hôm nay"; else -> shortDate(date.toString()) },
                    fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f), textAlign = TextAlign.Center
                )
                IconButton(onClick = { date = date?.plusDays(1) }, enabled = date != null && date!! < LocalDate.now()) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Ngày sau", tint = SqInk)
                }
                SqChip("Tất cả ngày", date == null) { date = if (date == null) LocalDate.now() else null }
            }
            Spacer(modifier = Modifier.height(8.dp))
            ChipRow(STATUS_FILTERS, status) { status = it }
            Spacer(modifier = Modifier.height(8.dp))
            SqField("", search, placeholder = "Tìm mã đơn trong danh sách đã tải") { search = it.take(30) }
        }

        when {
            isLoading -> item { FullScreenLoading() }
            error != null -> item { ErrorState(message = error!!) { reloadKey++ } }
            visible.isEmpty() -> item { EmptyState("Chưa có đơn nào", "Đơn sẽ xuất hiện khi khách đặt suất của bạn.") }
            else -> {
                items(visible, key = { it.id }) { order -> OrderRow(order) { onNavigate("order/${order.id}") } }
                if (page < totalPages) item {
                    TextButton(onClick = ::loadMore, enabled = !loadingMore, modifier = Modifier.fillMaxWidth()) {
                        Text(if (loadingMore) "Đang tải..." else "Tải thêm đơn", color = SqCoral, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderRow(order: OrderDto, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SqSurface).clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = order.code, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                if (!order.note.isNullOrBlank()) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Icon(Icons.AutoMirrored.Filled.StickyNote2, contentDescription = "Có ghi chú của khách", tint = SqCoralDeep, modifier = Modifier.size(16.dp))
                }
            }
            val slot = order.pickupSlot?.let { " · hẹn ${shortTime(it)}" }.orEmpty()
            Text(text = "${order.quantity} suất$slot · đặt ${shortDateTime(order.createdAt)}", fontSize = 12.sp, color = SqInkSoft)
            order.note?.takeIf { it.isNotBlank() }?.let {
                Text(text = it, fontSize = 12.sp, color = SqInkMuted, maxLines = 1)
            }
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(text = currency(order.totalAmount), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
            Spacer(modifier = Modifier.height(4.dp))
            StatusBadge(status = order.status)
        }
    }
}
