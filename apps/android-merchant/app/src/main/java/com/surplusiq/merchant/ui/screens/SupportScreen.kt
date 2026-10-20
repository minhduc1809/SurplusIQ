package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.*
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.data.uploadImageUri
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val CATEGORIES = listOf("PAYMENT" to "Thanh toán", "BUG" to "Lỗi", "DISPUTE" to "Tranh chấp", "OTHER" to "Khác")
private val TICKET_STATUS = mapOf("OPEN" to "Đã gửi", "IN_PROGRESS" to "Đang xử lý", "ANSWERED" to "Đã phản hồi", "CLOSED" to "Đã đóng")

/**
 * S73/S74 - Hỗ trợ nền tảng (store/support-tickets). Nội dung 10–1000 ký tự; tối đa 5 yêu cầu đang mở.
 * shortcut: chưa đính kèm tệp (backend chưa nhận tệp cho yêu cầu hỗ trợ).
 */
@Composable
fun SupportScreen(repository: StoreRepository, myUserId: String, onBack: () -> Unit) {
    var openId by remember { mutableStateOf<String?>(null) }
    var creating by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableIntStateOf(0) }
    when {
        creating -> TicketForm(repository, onCancel = { creating = false }) { creating = false; reloadKey++; openId = it }
        openId != null -> TicketThread(repository, openId!!, myUserId, onBack = { openId = null; reloadKey++ })
        else -> TicketList(repository, reloadKey, onOpen = { openId = it }, onCreate = { creating = true }, onBack = onBack)
    }
}

@Composable
private fun TicketList(repository: StoreRepository, reloadKey: Int, onOpen: (String) -> Unit, onCreate: () -> Unit, onBack: () -> Unit) {
    var list by remember { mutableStateOf<List<SupportTicketDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(reloadKey, retry) { error = null; repository.getSupportTickets().fold(onSuccess = { list = it }, onFailure = { error = it.message }) }
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Hỗ trợ", onBack)
        PrimaryButton("＋ Gửi yêu cầu hỗ trợ", onClick = onCreate)
        Spacer(Modifier.height(12.dp))
        val l = list
        when {
            error != null -> ErrorState(error!!) { retry++ }
            l == null -> FullScreenLoading()
            l.isEmpty() -> EmptyState("Chưa có yêu cầu", "Gặp vấn đề về thanh toán, lỗi hay tranh chấp thì gửi yêu cầu ở đây.")
            else -> l.forEach { t ->
                SqCard(Modifier.clickable { onOpen(t.id) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (t.hasNewReply && t.status != "CLOSED") Text("● ", color = SqMintDeep, fontSize = 14.sp)
                        Text(t.subject, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f), maxLines = 1)
                        Text(TICKET_STATUS[t.status] ?: t.status, fontSize = 12.sp, color = SqCoralDeep, fontWeight = FontWeight.Bold)
                    }
                    Text("${CATEGORIES.firstOrNull { it.first == t.category }?.second ?: "Khác"} · cập nhật ${shortDateTime(t.lastMessageAt ?: t.createdAt)}", fontSize = 12.sp, color = SqInkSoft)
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun TicketForm(repository: StoreRepository, onCancel: () -> Unit, onCreated: (String) -> Unit) {
    var category by remember { mutableStateOf("PAYMENT") }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val attach = rememberAttachments(repository, scope)
    val problem = when {
        subject.isBlank() -> "Nhập tiêu đề."
        message.trim().length < 10 -> "Nội dung từ 10 đến 1000 ký tự."
        else -> null
    }
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Yêu cầu hỗ trợ", onCancel)
        Spacer(Modifier.height(12.dp))
        SqCard {
            Text("Loại", fontSize = 12.sp, color = SqInkSoft)
            ChipRow(CATEGORIES, category) { category = it }
            Spacer(Modifier.height(10.dp))
            SqField("Tiêu đề", subject) { subject = it.take(150) }
            Spacer(Modifier.height(10.dp))
            SqField("Nội dung (10–1000 ký tự)", message, singleLine = false) { message = it.take(1000) }
            Text("${message.length}/1000", fontSize = 11.sp, color = SqInkMuted)
            Spacer(Modifier.height(10.dp))
            AttachmentBar(attach)
        }
        Spacer(Modifier.height(12.dp))
        InlineError(error ?: problem.takeIf { subject.isNotBlank() || message.isNotBlank() })
        PrimaryButton("Gửi", enabled = problem == null && !busy && !attach.uploading, loading = busy, onClick = {
            busy = true; error = null
            scope.launch {
                repository.createSupportTicket(subject.trim(), message.trim(), category, attach.urls.toList()).fold(onSuccess = { onCreated(it.id) }, onFailure = { error = it.message })
                busy = false
            }
        })
    }
}

@Composable
private fun TicketThread(repository: StoreRepository, id: String, myUserId: String, onBack: () -> Unit) {
    var detail by remember { mutableStateOf<SupportDetailResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var reply by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var closing by remember { mutableStateOf(false) }
    var retry by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val attach = rememberAttachments(repository, scope)
    LaunchedEffect(id, retry) { error = null; repository.getSupportTicket(id).fold(onSuccess = { detail = it }, onFailure = { error = it.message }) }
    Column(Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader(detail?.ticket?.subject ?: "Yêu cầu", onBack)
        val d = detail
        when {
            error != null -> ErrorState(error!!) { retry++ }
            d == null -> FullScreenLoading()
            else -> {
                val closed = d.ticket.status == "CLOSED"
                d.messages.forEach { m ->
                    val mine = m.senderId == myUserId
                    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = if (mine) Arrangement.End else Arrangement.Start) {
                        Column(Modifier.widthIn(max = 300.dp).clip(RoundedCornerShape(16.dp)).background(if (mine) SqCoralWash else SqSurface).padding(12.dp)) {
                            Text(if (mine) "Bạn" else "Hỗ trợ SurplusIQ", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqInkSoft)
                            Text(m.message, fontSize = 14.sp, color = SqInk)
                            m.attachmentUrls.forEach { u -> RemoteImage(u, Modifier.padding(top = 6.dp).size(160.dp), corner = 10.dp) }
                            Text(shortDateTime(m.createdAt), fontSize = 10.sp, color = SqInkMuted)
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                InlineError(actionError)
                if (closed) Text("Yêu cầu đã đóng.", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.fillMaxWidth().background(SqSurfaceSoft).padding(12.dp))
                else {
                    SqField("Trả lời (1–1000 ký tự)", reply, singleLine = false) { reply = it.take(1000) }
                    Spacer(Modifier.height(8.dp))
                    AttachmentBar(attach)
                    Spacer(Modifier.height(8.dp))
                    PrimaryButton("Gửi", enabled = reply.isNotBlank() && !busy && !attach.uploading, loading = busy, onClick = {
                        busy = true; actionError = null
                        scope.launch {
                            repository.sendSupportMessage(id, reply.trim(), attach.urls.toList()).fold(onSuccess = { reply = ""; attach.urls.clear(); retry++ }, onFailure = { actionError = it.message })
                            busy = false
                        }
                    })
                    TextButton(onClick = { closing = true }, contentPadding = PaddingValues(0.dp)) { Text("Đóng yêu cầu", color = SqInkSoft) }
                }
            }
        }
    }
    if (closing) ConfirmDialog(
        title = "Đóng yêu cầu?", message = "Đóng rồi thì không gửi thêm tin nhắn được.", confirmLabel = "Đóng", onDismiss = { closing = false },
        onConfirm = { closing = false; scope.launch { repository.closeSupportTicket(id).fold(onSuccess = { retry++ }, onFailure = { actionError = it.message }) } }
    )
}

/** Ảnh đính kèm đang chọn (tối đa 3), tải lên ngay khi chọn. */
private class Attachments(val urls: androidx.compose.runtime.snapshots.SnapshotStateList<String>, uploadingState: MutableState<Boolean>, val errorState: MutableState<String?>, val pick: () -> Unit) {
    val uploading by uploadingState
}

@Composable
private fun rememberAttachments(repository: StoreRepository, scope: kotlinx.coroutines.CoroutineScope): Attachments {
    val urls = remember { mutableStateListOf<String>() }
    val uploading = remember { mutableStateOf(false) }
    val error = remember { mutableStateOf<String?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val pick = rememberImagePicker { uri ->
        uploading.value = true; error.value = null
        scope.launch {
            repository.uploadImageUri(context, uri).fold(onSuccess = { urls.add(it) }, onFailure = { error.value = it.message })
            uploading.value = false
        }
    }
    return remember { Attachments(urls, uploading, error, pick) }
}

@Composable
private fun AttachmentBar(a: Attachments) {
    Column {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            a.urls.forEach { u ->
                Box {
                    RemoteImage(u, Modifier.size(56.dp), corner = 8.dp)
                }
            }
            if (a.urls.size < 3) TextButton(onClick = a.pick, enabled = !a.uploading, contentPadding = PaddingValues(0.dp)) {
                Text(if (a.uploading) "Đang tải ảnh…" else "＋ Đính kèm ảnh (${a.urls.size}/3)", color = SqCoralDeep)
            }
            if (a.urls.isNotEmpty()) TextButton(onClick = { a.urls.clear() }, contentPadding = PaddingValues(0.dp)) { Text("Bỏ ảnh", color = SqInkSoft, fontSize = 12.sp) }
        }
        InlineError(a.errorState.value)
    }
}
