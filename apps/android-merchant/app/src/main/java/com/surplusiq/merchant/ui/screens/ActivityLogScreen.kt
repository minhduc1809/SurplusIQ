package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.AuditLogDto
import com.surplusiq.merchant.data.AuditLogsResponse
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Các action backend thực sự ghi (grep AuditLogService.log). */
private val ACTION_FILTERS = listOf(
    null to "Tất cả",
    "OFFER_PRICE_CHANGED" to "Đổi giá suất",
    "ITEM_PRICE_CHANGED" to "Đổi giá món",
    "OFFER_CANCELLED" to "Hủy suất",
    "STOCK_ADJUSTED" to "Điều chỉnh tồn",
    "ORDER_CANCELLED_BY_STORE" to "Hủy đơn",
    "ITEMS_CSV_IMPORTED" to "Nhập CSV",
)

private val ACTION_LABELS = ACTION_FILTERS.mapNotNull { (k, v) -> k?.let { it to v } }.toMap() + mapOf(
    "OFFER_CREATED" to "Tạo suất", "OFFER_CLOSED" to "Đóng suất", "ITEM_CREATED" to "Tạo món",
    "ITEM_ARCHIVED" to "Lưu trữ món", "ITEM_RESTORED" to "Khôi phục món", "ORDER_PICKUP_VERIFIED" to "Xác nhận nhận hàng",
)

/** S15 - Nhật ký hoạt động (GET store/audit-logs, lọc theo store của JWT, chỉ Chủ quán). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityLogScreen(repository: StoreRepository, onBack: () -> Unit) {
    var data by remember { mutableStateOf<AuditLogsResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var action by remember { mutableStateOf<String?>(null) }
    var fromDate by remember { mutableStateOf("") }
    var toDate by remember { mutableStateOf("") }
    var page by remember { mutableIntStateOf(1) }
    var selected by remember { mutableStateOf<AuditLogDto?>(null) }
    val scope = rememberCoroutineScope()

    fun load() {
        val from = fromDate.trim().ifEmpty { null }
        val to = toDate.trim().ifEmpty { null }
        if (listOfNotNull(from, to).any { runCatching { LocalDate.parse(it) }.isFailure }) {
            error = "Ngày phải có dạng YYYY-MM-DD."
            isLoading = false
            return
        }
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getAuditLogs(action, from, to?.let { "${it}T23:59:59" }, page)
            isLoading = false
            result.fold(onSuccess = { data = it }, onFailure = { error = it.message })
        }
    }

    LaunchedEffect(action, page) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).padding(20.dp)) {
        ScreenHeader("Nhật ký hoạt động", onBack)
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ACTION_FILTERS.forEach { (key, label) -> SqChip(label, action == key) { action = key; page = 1 } }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            SqField("Từ ngày", fromDate, modifier = Modifier.weight(1f), placeholder = "YYYY-MM-DD") { fromDate = it.take(10) }
            Spacer(modifier = Modifier.width(8.dp))
            SqField("Đến ngày", toDate, modifier = Modifier.weight(1f), placeholder = "YYYY-MM-DD") { toDate = it.take(10) }
            Spacer(modifier = Modifier.width(8.dp))
            Button(onClick = { page = 1; load() }, colors = ButtonDefaults.buttonColors(containerColor = SqCoral)) { Text("Lọc") }
        }
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            data?.items.isNullOrEmpty() -> EmptyState("Chưa có hoạt động", "Nhật ký được lưu tối đa 12 tháng.")
            else -> {
                val d = data!!
                LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(d.items) { log ->
                        Column(
                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SqSurface)
                                .clickable { selected = log }.padding(12.dp)
                        ) {
                            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                Text(ACTION_LABELS[log.action] ?: log.action, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                                Text(shortDateTime(log.createdAt), fontSize = 11.sp, color = SqInkMuted)
                            }
                            Text("${log.targetType.orEmpty()} ${log.targetId?.take(8).orEmpty()} · ${log.actorRole.orEmpty()}", fontSize = 12.sp, color = SqInkSoft)
                        }
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = { page-- }, enabled = page > 1) { Text("‹ Trước") }
                    Text("Trang ${d.page}/${maxOf(d.totalPages, 1)} · ${d.total} bản ghi", fontSize = 12.sp, color = SqInkSoft)
                    TextButton(onClick = { page++ }, enabled = page < d.totalPages) { Text("Sau ›") }
                }
            }
        }
    }

    selected?.let { log ->
        ModalBottomSheet(onDismissRequest = { selected = null }, containerColor = SqSurface) {
            Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp)) {
                Text(ACTION_LABELS[log.action] ?: log.action, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Spacer(modifier = Modifier.height(12.dp))
                listOf(
                    "Thời gian" to shortDateTime(log.createdAt),
                    "Mã hành động" to log.action,
                    "Đối tượng" to "${log.targetType.orEmpty()} ${log.targetId.orEmpty()}",
                    "Giá trị cũ" to (log.oldValue?.toString() ?: "—"),
                    "Giá trị mới" to (log.newValue?.toString() ?: "—"),
                    "Người thực hiện" to "${log.actorRole.orEmpty()} · ${log.actorId.orEmpty()}",
                    "IP" to (log.ip ?: "—"),
                    "Thiết bị" to (log.userAgent ?: "—"),
                ).forEach { (label, value) ->
                    Text(label, fontSize = 12.sp, color = SqInkMuted)
                    Text(value, fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(bottom = 10.dp))
                }
                Spacer(modifier = Modifier.height(20.dp))
            }
        }
    }
}
