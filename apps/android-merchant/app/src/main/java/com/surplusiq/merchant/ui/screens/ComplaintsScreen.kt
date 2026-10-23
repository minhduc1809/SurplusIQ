package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ComplaintDetailResponse
import com.surplusiq.merchant.data.ComplaintDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant

private val COMPLAINT_FILTERS = listOf(
    null to "Tất cả",
    "PENDING_STORE" to "Chờ xử lý",
    "ACCEPTED" to "Đã chấp nhận",
    "REJECTED" to "Đã từ chối",
    "CLOSED" to "Đã đóng"
)

/** Thời gian còn lại đến hạn phản hồi; null nếu không còn đếm ngược. */
private fun dueText(dueAt: String?): String? {
    val due = runCatching { Instant.parse(dueAt) }.getOrNull() ?: return null
    val left = Duration.between(Instant.now(), due)
    return if (left.isNegative) "Đã quá hạn" else "Còn ${left.toHours()} giờ ${left.toMinutes() % 60} phút"
}

/** S43 - Danh sách khiếu nại (GET store/complaints?status=). Chỉ chủ và quản lý được vào (backend). */
@Composable
fun ComplaintsScreen(repository: StoreRepository, onOpen: (String) -> Unit, onBack: () -> Unit) {
    var list by remember { mutableStateOf<List<ComplaintDto>?>(null) }
    var status by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(status, reloadKey) {
        list = null; error = null
        repository.getComplaints(status).fold(onSuccess = { list = it }, onFailure = { error = it.message })
    }

    Box(Modifier.fillMaxSize().background(SqCanvas), contentAlignment = androidx.compose.ui.Alignment.TopCenter) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(340.dp),
        modifier = Modifier.widthIn(max = 1100.dp).fillMaxSize(),
        contentPadding = PaddingValues(20.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) { Column(Modifier.fillMaxWidth()) {
            ScreenHeader("Khiếu nại", onBack)
            Spacer(Modifier.height(8.dp))
            ChipRow(COMPLAINT_FILTERS, status) { status = it }
        }}
        val l = list
        when {
            error != null -> item(span = { GridItemSpan(maxLineSpan) }) { Column(Modifier.fillMaxWidth()) { ErrorState(error!!) { reloadKey++ } }}
            l == null -> item(span = { GridItemSpan(maxLineSpan) }) { Column(Modifier.fillMaxWidth()) { FullScreenLoading() }}
            l.isEmpty() -> item(span = { GridItemSpan(maxLineSpan) }) { Column(Modifier.fillMaxWidth()) { EmptyState("Không có khiếu nại", "Khiếu nại của khách sẽ hiện ở đây. Quán có 24 giờ để phản hồi.") }}
            else -> items(l, key = { it.id }) { c -> ComplaintRow(c) { onOpen(c.id) } }
        }
    }
    }
}

@Composable
private fun ComplaintRow(c: ComplaintDto, onClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().sqSurface(18.dp, 2.dp).clickable(onClick = onClick).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f)) {
            Text(c.category, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
            Text(c.description, fontSize = 12.sp, color = SqInkSoft, maxLines = 2)
            val due = if (c.status == "PENDING_STORE") dueText(c.responseDueAt) else null
            Text(due ?: shortDateTime(c.createdAt), fontSize = 12.sp, color = if (due != null) SqCoralDeep else SqInkMuted)
        }
        StatusBadge(c.status)
    }
}

/** S44 - Xử lý khiếu nại: chấp nhận + hoàn tiền, từ chối kèm lý do, gia hạn 24 giờ (một lần). */
@Composable
fun ComplaintDetailScreen(
    repository: StoreRepository,
    complaintId: String,
    canHandle: Boolean,
    onOpenOrder: (String) -> Unit,
    onBack: () -> Unit
) {
    var detail by remember { mutableStateOf<ComplaintDetailResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var dialog by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(complaintId, reloadKey) {
        error = null
        repository.getComplaint(complaintId).fold(onSuccess = { detail = it }, onFailure = { error = it.message })
    }

    fun extend() {
        busy = true; actionError = null
        scope.launch {
            repository.extendComplaint(complaintId).fold(onSuccess = { reloadKey++ }, onFailure = { actionError = it.message })
            busy = false
        }
    }

    val sidePad = ((androidx.compose.ui.platform.LocalConfiguration.current.screenWidthDp.dp - 720.dp) / 2).coerceAtLeast(0.dp)
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(horizontal = sidePad).padding(20.dp)) {
        ScreenHeader("Xử lý khiếu nại", onBack)
        Spacer(Modifier.height(12.dp))
        val d = detail
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            d == null -> FullScreenLoading()
            else -> {
                val c = d.complaint
                val pending = c.status == "PENDING_STORE"
                SqCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(c.category, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.weight(1f))
                        StatusBadge(c.status)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(c.description, fontSize = 14.sp, color = SqInk)
                    Spacer(Modifier.height(6.dp))
                    InfoRow("Gửi lúc", shortDateTime(c.createdAt))
                    if (pending) dueText(c.responseDueAt)?.let { InfoRow("Hạn phản hồi", it, SqCoralDeep) }
                    if (c.extended) InfoRow("Gia hạn", "Đã gia hạn 24 giờ")
                    if (c.autoAccepted) Text("Hệ thống tự chấp nhận vì quá hạn phản hồi.", fontSize = 12.sp, color = SqInkSoft)
                    c.refundAmount?.takeIf { it > 0 }?.let { InfoRow("Đã hoàn", currency(it)) }
                    d.refundDestination?.let { InfoRow("Hoàn về", "${it.bankName} ••••${it.accountLast4} · ${it.accountHolder}") }
                    c.rejectReason?.let { InfoRow("Lý do từ chối", it) }
                }
                d.order?.let { o ->
                    Spacer(Modifier.height(12.dp))
                    SqCard(Modifier.clickable { onOpenOrder(o.id) }) {
                        SectionTitle("Đơn liên quan")
                        InfoRow("Mã đơn", o.code)
                        InfoRow("Số lượng", "${o.quantity} suất")
                        InfoRow("Tổng tiền", currency(o.totalAmount))
                        Text("Chạm để xem chi tiết đơn", fontSize = 11.sp, color = SqInkMuted)
                    }
                }
                if (d.attachments.isNotEmpty()) {
                    Spacer(Modifier.height(12.dp))
                    SqCard {
                        SectionTitle("Ảnh bằng chứng")
                        Spacer(Modifier.height(8.dp))
                        d.attachments.chunked(2).forEach { row ->
                            Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                row.forEach { RemoteImage(it.url, Modifier.weight(1f).height(140.dp)) }
                                if (row.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
                if (pending && canHandle) {
                    Spacer(Modifier.height(16.dp))
                    InlineError(actionError)
                    PrimaryButton("Chấp nhận và hoàn tiền", onClick = { dialog = "resolve" }, enabled = !busy)
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = { dialog = "reject" }, enabled = !busy, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(25.dp)) {
                        Text("Từ chối", color = SqCoralDeep, fontWeight = FontWeight.Bold)
                    }
                    if (!c.extended) {
                        OutlinedButton(onClick = ::extend, enabled = !busy, modifier = Modifier.fillMaxWidth().height(50.dp).padding(top = 8.dp), shape = RoundedCornerShape(25.dp)) {
                            Text("Gia hạn thêm 24 giờ (một lần)", color = SqInkSoft, fontWeight = FontWeight.Bold)
                        }
                    }
                } else if (pending) {
                    Text("Chỉ chủ và quản lý được xử lý khiếu nại.", fontSize = 12.sp, color = SqInkMuted, modifier = Modifier.padding(top = 12.dp))
                }

                val order = d.order
                if (dialog == "resolve") ResolveDialog(order?.totalAmount, onDismiss = { dialog = null }) { amount, note ->
                    repository.resolveComplaint(complaintId, amount, note).fold(
                        onSuccess = { dialog = null; reloadKey++; null }, onFailure = { it.message }
                    )
                }
                if (dialog == "reject") ReasonDialog("Từ chối khiếu nại", "Lý do sẽ được gửi cho khách.", { dialog = null }) { reason ->
                    repository.rejectComplaint(complaintId, reason).fold(
                        onSuccess = { dialog = null; reloadKey++; null }, onFailure = { it.message }
                    )
                }
            }
        }
    }
}

@Composable
private fun ResolveDialog(orderTotal: Long?, onDismiss: () -> Unit, onSubmit: suspend (Long?, String) -> String?) {
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val value = amount.toLongOrNull()
    val invalid = amount.isNotBlank() && (value == null || (orderTotal != null && value > orderTotal))
    ConfirmDialog(
        title = "Chấp nhận khiếu nại",
        message = "Để trống số tiền để hoàn 100%${orderTotal?.let { " (${currency(it)})" }.orEmpty()}. Không thể hoàn tác.",
        confirmLabel = if (busy) "Đang gửi…" else "Hoàn tiền",
        confirmEnabled = !busy && !invalid,
        onDismiss = onDismiss,
        onConfirm = {
            busy = true; error = null
            scope.launch { error = onSubmit(value, note.trim()); busy = false }
        }
    ) {
        Spacer(Modifier.height(8.dp))
        SqField("Số tiền hoàn (đ)", amount, keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
            hint = if (invalid) "Tối đa ${currency(orderTotal ?: 0)}" else null) { amount = it.filter(Char::isDigit).take(9) }
        Spacer(Modifier.height(8.dp))
        SqField("Ghi chú (tối đa 300 ký tự)", note, singleLine = false) { note = it.take(300) }
        InlineError(error)
    }
}
