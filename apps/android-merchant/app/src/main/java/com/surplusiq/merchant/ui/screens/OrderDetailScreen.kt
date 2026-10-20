package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ComplaintDto
import com.surplusiq.merchant.data.OrderDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val CANCELLABLE = setOf("PENDING_PAYMENT", "PAID")
private val COMPLAINT_STATUS = mapOf(
    "PENDING_STORE" to "Chờ quán xử lý", "ACCEPTED" to "Đã chấp nhận", "REJECTED" to "Đã từ chối", "CLOSED" to "Đã đóng"
)
private val CANCELLED_BY = mapOf("CUSTOMER" to "khách", "STORE" to "quán", "SYSTEM" to "hệ thống")

/**
 * S40 - Chi tiết đơn (GET store/orders/:id, POST store/orders/:id/cancel, khiếu nại lọc từ GET store/complaints).
 * Backend không tính hoa hồng theo đơn (chỉ có trong sao kê tuần) nên không hiển thị tiền sau hoa hồng.
 */
@Composable
fun OrderDetailScreen(repository: StoreRepository, orderId: String, canCancel: Boolean, onBack: () -> Unit) {
    var order by remember { mutableStateOf<OrderDto?>(null) }
    var itemName by remember { mutableStateOf<String?>(null) }
    var complaints by remember { mutableStateOf<List<ComplaintDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var confirming by remember { mutableStateOf(false) }
    var reason by remember { mutableStateOf("") }
    var cancelling by remember { mutableStateOf(false) }
    var cancelError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(reloadKey) {
        error = null
        repository.getOrder(orderId).fold(onSuccess = { order = it }, onFailure = { error = it.message; return@LaunchedEffect })
        order?.offer?.itemId?.let { id -> repository.getItem(id).onSuccess { itemName = it.name } }
        // Nhân viên quầy không có quyền xem khiếu nại - bỏ qua lỗi, khối khiếu nại chỉ là phụ.
        repository.getComplaints().onSuccess { list -> complaints = list.filter { it.orderId == orderId } }
    }

    fun cancel() {
        cancelling = true
        cancelError = null
        scope.launch {
            val r = repository.cancelOrder(orderId, reason.trim())
            cancelling = false
            r.fold(onSuccess = { reason = ""; reloadKey++ }, onFailure = { cancelError = it.message })
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Chi tiết đơn", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        val o = order
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            o == null -> FullScreenLoading()
            else -> {
                SqCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(o.code, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.weight(1f))
                        StatusBadge(o.status)
                    }
                    o.pickupSlot?.let { Text("Hẹn nhận lúc ${shortDateTime(it)}", fontSize = 13.sp, color = SqInkSoft) }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SectionTitle("Món và thanh toán")
                    Spacer(modifier = Modifier.height(6.dp))
                    InfoRow("Món", "${itemName ?: "Suất"} × ${o.quantity}")
                    o.unitPrice?.let { InfoRow("Đơn giá", currency(it)) }
                    o.discountAmount?.takeIf { it > 0 }?.let { InfoRow("Giảm giá", "-${currency(it)}", SqCoralDeep) }
                    HorizontalDivider(color = SqLine, modifier = Modifier.padding(vertical = 6.dp))
                    InfoRow("Tổng tiền", currency(o.totalAmount))
                    o.paymentProofUrl?.let { url ->
                        val uri = LocalUriHandler.current
                        InfoRow("Biên lai khách gửi", shortDateTime(o.paymentProofUploadedAt.orEmpty()))
                        TextButton(onClick = { uri.openUri(url) }, contentPadding = PaddingValues(0.dp)) { Text("Xem ảnh biên lai", color = SqCoralDeep) }
                    }
                    Text("Hoa hồng tính theo sao kê đối soát tuần, chưa có theo từng đơn.", fontSize = 11.sp, color = SqInkMuted)
                }

                o.note?.takeIf { it.isNotBlank() }?.let { note ->
                    Spacer(modifier = Modifier.height(12.dp))
                    SqCard {
                        SectionTitle("Ghi chú của khách")
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(note, fontSize = 14.sp, color = SqInk)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))
                SqCard {
                    SectionTitle("Mốc thời gian")
                    Spacer(modifier = Modifier.height(8.dp))
                    val steps = listOfNotNull(
                        Triple("Đặt đơn", o.createdAt, SqInkSoft),
                        o.paidAt?.let { Triple("Đã thanh toán", it, SqMintDeep) },
                        o.arrivingNotifiedAt?.let { Triple("Khách báo sắp đến", it, SqButter) },
                        o.pickedUpAt?.let { Triple("Đã nhận hàng", it, SqMintDeep) },
                        o.cancelledAt?.let { Triple("Đã hủy bởi ${CANCELLED_BY[o.cancelledBy] ?: "—"}", it, SqCoralDeep) },
                    )
                    steps.forEach { (label, at, color) -> TimelineStep(label, shortDateTime(at), color) }
                    o.cancelReason?.let { Text("Lý do hủy: $it", fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 4.dp)) }
                }

                complaints.forEach { c ->
                    Spacer(modifier = Modifier.height(12.dp))
                    SqCard {
                        SectionTitle("Khiếu nại liên quan")
                        Spacer(modifier = Modifier.height(4.dp))
                        InfoRow("Trạng thái", COMPLAINT_STATUS[c.status] ?: c.status)
                        InfoRow("Loại", c.category)
                        InfoRow("Ngày gửi", shortDateTime(c.createdAt))
                        c.refundAmount?.takeIf { it > 0 }?.let { InfoRow("Hoàn tiền", currency(it)) }
                        Text(c.description, fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.padding(top = 4.dp))
                    }
                }

                if (canCancel && o.status in CANCELLABLE) {
                    Spacer(modifier = Modifier.height(16.dp))
                    InlineError(cancelError)
                    OutlinedButton(onClick = { confirming = true }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(25.dp)) {
                        Text("Hủy đơn", color = SqCoralDeep, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    val o = order
    if (confirming && o != null) {
        ConfirmDialog(
            title = "Hủy đơn ${o.code}?",
            message = if (o.status == "PAID") "Khách được hoàn đủ ${currency(o.totalAmount)}. Không thể hoàn tác."
            else "Đơn chưa thanh toán, suất sẽ được trả lại kho. Không thể hoàn tác.",
            confirmLabel = if (cancelling) "Đang hủy..." else "Hủy đơn",
            confirmEnabled = reason.isNotBlank() && !cancelling,
            onDismiss = { confirming = false },
            onConfirm = { confirming = false; cancel() }
        ) {
            Spacer(modifier = Modifier.height(12.dp))
            SqField("Lý do hủy (bắt buộc)", reason, placeholder = "Hết nguyên liệu, sự cố bếp...") { reason = it.take(255) }
        }
    }
}

@Composable
private fun TimelineStep(label: String, time: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 4.dp)) {
        Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(color))
        Spacer(modifier = Modifier.width(10.dp))
        Text(label, fontSize = 13.sp, color = SqInk, modifier = Modifier.weight(1f))
        Text(time, fontSize = 12.sp, color = SqInkSoft)
    }
}
