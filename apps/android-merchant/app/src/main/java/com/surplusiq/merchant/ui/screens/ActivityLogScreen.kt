package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
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
    "OFFER_CREATED" to "Tạo suất", "OFFER_CLOSED" to "Đóng suất", "OFFER_AUTO_CLOSED" to "Suất tự động đóng", "OFFERS_CLONED" to "Nhân bản suất hôm qua",
    "ITEM_CREATED" to "Tạo món", "ITEM_ARCHIVED" to "Lưu trữ món", "ITEM_RESTORED" to "Khôi phục món", "ITEMS_BATCH_UPDATED" to "Cập nhật nhiều món",
    "TRUSTPASS_UPDATED" to "Cập nhật hồ sơ minh bạch", "PRICE_CHANGED" to "Đổi giá",
    "ORDER_HELD" to "Khách giữ suất", "ORDER_HOLD_CANCELLED" to "Khách hủy giữ suất", "ORDER_HOLD_RELEASED" to "Hết hạn giữ suất",
    "ORDER_PAYMENT_CONFIRMED" to "Xác nhận thanh toán", "ORDER_PAID_CANCELLED" to "Hủy đơn đã thanh toán", "ORDER_LATE_PAYMENT_REFUNDED" to "Hoàn tiền thanh toán trễ",
    "ORDER_PICKUP_VERIFIED" to "Xác nhận nhận hàng", "ORDER_PICKUP_EXPIRED" to "Quá hạn nhận hàng", "ORDER_PICKUP_SLOT_UPDATED" to "Đổi giờ hẹn nhận",
    "ORDER_SWAPPED" to "Đổi suất cho đơn", "ORDER_GIFT_CREATED" to "Tặng suất", "PICKUP_VERIFIED_VIA_PROXY_CODE" to "Nhận hộ bằng mã",
    "PROXY_PICKUP_CODE_CREATED" to "Tạo mã nhận hộ", "PROXY_PICKUP_CODE_REVOKED" to "Thu hồi mã nhận hộ",
    "PAYMENT_INITIATED" to "Bắt đầu thanh toán", "PAYMENT_AMOUNT_MISMATCH" to "Thanh toán lệch số tiền", "PAYMENT_PROOF_ATTACHED" to "Khách gửi biên lai",
    "PAYMENT_PROOF_CONFIRMED" to "Xác nhận biên lai", "PAYMENT_PROOF_REJECTED" to "Từ chối biên lai", "REFUND_PAID_OUT" to "Đã chi hoàn tiền",
    "PICKUP_INCIDENT" to "Sự cố nhận hàng", "PICKUP_INCIDENT_REPORTED" to "Khách báo sự cố nhận hàng", "PICKUP_INCIDENT_RESPONDED" to "Cửa hàng phản hồi sự cố",
    "COMPLAINT_AUTO_ACCEPTED" to "Khiếu nại tự động chấp nhận",
    "RESCUE_ACTION" to "Hành động cứu hàng", "RESCUE_ACTION_BLOCKED" to "Hành động cứu hàng bị chặn", "OPEN_RESCUE_BRIDGE" to "Mở bàn giao thực phẩm dư",
    "RESCUE_BRIDGE_CREATED" to "Tạo bàn giao thực phẩm dư", "RESCUE_BRIDGE_TRANSFER" to "Chuyển giao thực phẩm dư", "RESCUE_BRIDGE_CANCELLED" to "Hủy bàn giao",
    "RESCUE_BRIDGE_DISPUTED" to "Tranh chấp bàn giao", "RESCUE_BRIDGE_LINK_ROTATED" to "Đổi liên kết phản hồi", "RESCUE_BRIDGE_INVALID_TRANSITION" to "Chuyển trạng thái bàn giao không hợp lệ",
    "RESCUE_BRIDGE_RECIPIENT_CONFIRMED" to "Đơn vị nhận xác nhận", "RESCUE_BRIDGE_SENDER_CONFIRMED" to "Cửa hàng xác nhận bàn giao",
    "RESCUE_LAB_VERSION_APPLIED" to "Áp dụng kịch bản mô phỏng", "RESCUE_POOL_OFFER_PUBLISHED" to "Công bố đề nghị cung ứng", "RESCUE_POOL_OFFER_REVISED" to "Công bố lại đề nghị cung ứng",
    "REWARD_POINTS_EARNED" to "Cộng điểm thưởng", "REWARD_POINTS_REDEEMED" to "Đổi điểm thưởng", "REWARD_POINTS_REVERSED" to "Thu hồi điểm thưởng",
    "STAFF_LOCKED" to "Khóa nhân viên", "SUBSCRIPTION_DOWNGRADED_AUTO" to "Gói tự động hạ về Cơ bản",
    "ADMIN_STORE_SETTINGS_UPDATED" to "Nền tảng đổi cài đặt cửa hàng", "ADMIN_STORE_UPDATE" to "Nền tảng cập nhật cửa hàng", "ADMIN_REVIEW_MODERATED" to "Nền tảng kiểm duyệt đánh giá",
)

private val TARGET_LABELS = mapOf(
    "ORDER" to "Đơn hàng", "OFFER" to "Suất", "ITEM" to "Món", "STORE" to "Cửa hàng", "PAYMENT" to "Thanh toán", "COMPLAINT" to "Khiếu nại",
    "REVIEW" to "Đánh giá", "RESCUE_BRIDGE_TRANSFER" to "Chuyển giao thực phẩm dư", "RESCUE_POOL" to "Đợt mua chung", "SUBSCRIPTION" to "Gói dịch vụ",
    "PICKUP_INCIDENT" to "Sự cố nhận hàng", "USER" to "Tài khoản", "PROMOTION" to "Ưu đãi", "CAMPAIGN" to "Chiến dịch",
)

private val ROLE_LABELS = mapOf(
    "STORE_USER" to "Nhân viên cửa hàng", "STORE" to "Cửa hàng", "OWNER" to "Chủ cửa hàng", "MANAGER" to "Quản lý", "COUNTER" to "Nhân viên quầy",
    "CUSTOMER" to "Khách hàng", "SYSTEM" to "Hệ thống", "ADMIN" to "Quản trị viên",
)

private fun actionLabel(code: String) = ACTION_LABELS[code] ?: "Hoạt động khác"
private fun targetLabel(type: String?) = type?.let { TARGET_LABELS[it] ?: "Đối tượng khác" } ?: "Không rõ đối tượng"
private fun roleLabel(role: String?) = role?.let { ROLE_LABELS[it] ?: "Người dùng khác" } ?: "Không rõ"

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
            error = "Ngày phải có dạng năm-tháng-ngày, ví dụ 2026-10-23."
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

    Box(Modifier.fillMaxSize().background(SqCanvas), contentAlignment = Alignment.TopCenter) {
    Column(modifier = Modifier.widthIn(max = 1000.dp).fillMaxSize().padding(20.dp)) {
        ScreenHeader("Nhật ký hoạt động", onBack)
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ACTION_FILTERS.forEach { (key, label) -> SqChip(label, action == key) { action = key; page = 1 } }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            SqField("Từ ngày", fromDate, modifier = Modifier.weight(1f), placeholder = "2026-10-01") { fromDate = it.take(10) }
            Spacer(modifier = Modifier.width(8.dp))
            SqField("Đến ngày", toDate, modifier = Modifier.weight(1f), placeholder = "2026-10-31") { toDate = it.take(10) }
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
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(340.dp),
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(d.items) { log ->
                        Column(
                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SqSurface)
                                .clickable { selected = log }.padding(12.dp)
                        ) {
                            Text(actionLabel(log.action), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                            Text(shortDateTime(log.createdAt), fontSize = 11.sp, color = SqInkMuted)
                            Text(
                                listOfNotNull(targetLabel(log.targetType) + log.targetId?.take(8)?.let { " $it" }.orEmpty(), roleLabel(log.actorRole)).joinToString(" · "),
                                fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 2.dp)
                            )
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
    }

    selected?.let { log ->
        ModalBottomSheet(onDismissRequest = { selected = null }, containerColor = SqSurface) {
            Column(modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(20.dp)) {
                Text(actionLabel(log.action), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Spacer(modifier = Modifier.height(12.dp))
                listOf(
                    "Thời gian" to shortDateTime(log.createdAt),
                    "Đối tượng" to "${targetLabel(log.targetType)} ${log.targetId.orEmpty()}".trim(),
                    "Giá trị cũ" to (log.oldValue?.toString() ?: "—"),
                    "Giá trị mới" to (log.newValue?.toString() ?: "—"),
                    "Người thực hiện" to "${roleLabel(log.actorRole)} · ${log.actorId.orEmpty()}",
                    "Địa chỉ IP" to (log.ip ?: "—"),
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
