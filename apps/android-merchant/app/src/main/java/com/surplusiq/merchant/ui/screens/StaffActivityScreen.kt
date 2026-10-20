package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.AuditLogsResponse
import com.surplusiq.merchant.data.StaffMemberDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*

private val ACTIONS = listOf(
    null to "Tất cả",
    "ORDER_PICKUP_VERIFIED" to "Quét QR",
    "OFFER_PRICE_CHANGED" to "Đổi giá",
    "OFFER_CANCELLED" to "Hủy suất",
    "STOCK_ADJUSTED" to "Điều chỉnh tồn"
)
private val ACTION_NAME = mapOf(
    "ORDER_PICKUP_VERIFIED" to "Quét QR nhận hàng", "OFFER_PRICE_CHANGED" to "Đổi giá suất", "OFFER_CANCELLED" to "Hủy suất",
    "STOCK_ADJUSTED" to "Điều chỉnh tồn", "ORDER_CANCELLED_BY_STORE" to "Hủy đơn", "OFFER_CREATED" to "Tạo suất"
)

/** S65 - Hoạt động của từng nhân viên (GET store/audit-logs?actorId=, chỉ chủ cửa hàng; giữ tối đa 12 tháng). */
@Composable
fun StaffActivityScreen(repository: StoreRepository, onBack: () -> Unit) {
    var staff by remember { mutableStateOf<List<StaffMemberDto>?>(null) }
    var selected by remember { mutableStateOf<String?>(null) }
    var action by remember { mutableStateOf<String?>(null) }
    var logs by remember { mutableStateOf<AuditLogsResponse?>(null) }
    var page by remember { mutableIntStateOf(1) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        repository.getStaff().fold(
            onSuccess = { r -> staff = r.members; if (selected == null) selected = r.members.firstOrNull()?.userId },
            onFailure = { error = it.message }
        )
    }
    LaunchedEffect(selected, action, page) {
        val id = selected ?: return@LaunchedEffect
        logs = null
        repository.getAuditLogs(action, null, null, page, actorId = id).fold(onSuccess = { logs = it }, onFailure = { error = it.message })
    }

    LazyColumn(Modifier.fillMaxSize().background(SqCanvas), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { ScreenHeader("Hoạt động nhân viên", onBack) }
        val s = staff
        when {
            error != null -> item { ErrorState(error!!) { error = null; reloadKey++ } }
            s == null -> item { FullScreenLoading() }
            s.isEmpty() -> item { EmptyState("Chưa có nhân viên", "Mời nhân viên rồi quay lại để xem thao tác của họ.") }
            else -> {
                item {
                    ChipRow(s.map { it.userId to (it.user?.email ?: it.user?.phone ?: "Nhân viên") }, selected) { selected = it; page = 1 }
                    Spacer(Modifier.height(6.dp))
                    ChipRow(ACTIONS, action) { action = it; page = 1 }
                }
                val l = logs
                when {
                    l == null -> item { FullScreenLoading() }
                    l.items.isEmpty() -> item { EmptyState("Chưa có thao tác", "Nhân viên này chưa có thao tác nào được ghi lại.") }
                    else -> {
                        item { Text("${l.total} thao tác", fontSize = 12.sp, color = SqInkSoft) }
                        items(l.items, key = { it.id }) { log ->
                            SqCard {
                                Text(ACTION_NAME[log.action] ?: log.action, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                                Text("${log.targetType.orEmpty()} ${log.targetId?.take(8).orEmpty()} · ${shortDateTime(log.createdAt)}", fontSize = 12.sp, color = SqInkSoft)
                            }
                        }
                        item {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                TextButton(onClick = { page-- }, enabled = page > 1) { Text("‹ Trước") }
                                Text("Trang ${l.page}/${maxOf(l.totalPages, 1)}", fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 12.dp))
                                TextButton(onClick = { page++ }, enabled = page < l.totalPages) { Text("Sau ›") }
                            }
                        }
                    }
                }
            }
        }
    }
}
