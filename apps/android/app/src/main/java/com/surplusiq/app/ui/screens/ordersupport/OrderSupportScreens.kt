package com.surplusiq.app.ui.screens.ordersupport

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.*
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.SectionCard
import com.surplusiq.app.ui.components.StatusChip
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.formatDateTime
import com.surplusiq.app.ui.util.formatVnd
import com.surplusiq.app.ui.viewmodel.OrderSupportUiState
import kotlinx.coroutines.delay

private fun friendlyStatus(s: String) = when (s) {
    "OPEN" -> "Chờ cửa hàng phản hồi"
    "ACKNOWLEDGED" -> "Cửa hàng đã nhận thông tin"
    "RESOLVED" -> "Đã xử lý"
    "REJECTED" -> "Cửa hàng không công nhận"
    "PENDING" -> "Đang chờ"
    "ACCEPTED" -> "Đã chấp nhận"
    "DECLINED" -> "Đã từ chối"
    "CANCELLED" -> "Đã thu hồi"
    "EXPIRED" -> "Đã hết hạn"
    else -> s
}

/** KX12 Theo dõi đơn trực tiếp: làm mới 10 giây một lần khi màn hình đang mở. */
@Composable
fun OrderTrackingScreen(
    state: OrderSupportUiState,
    orderId: String,
    onLoad: () -> Unit,
    onBackClick: () -> Unit,
    onOpenChat: () -> Unit,
    onReportIncident: () -> Unit,
    onOpenMap: (name: String, address: String) -> Unit
) {
    LaunchedEffect(orderId) {
        while (true) { onLoad(); delay(10_000) }
    }
    val t = state.tracking
    var holdLeft by remember(t?.holdSecondsLeft) { mutableIntStateOf(t?.holdSecondsLeft ?: 0) }
    LaunchedEffect(t?.holdSecondsLeft) {
        while (holdLeft > 0) { delay(1000); holdLeft -= 1 }
    }
    Scaffold(topBar = { BackTopBar("Theo dõi đơn", onBackClick) }) { padding ->
        LoadStateContent(
            isLoading = t == null && state.trackingError == null,
            errorMessage = if (t == null) state.trackingError else null,
            isEmpty = t == null,
            emptyIcon = Icons.Default.LocalShipping,
            emptyTitle = "Chưa có dữ liệu",
            emptyMessage = "Không đọc được tiến trình đơn.",
            modifier = Modifier.padding(padding),
            onRetry = onLoad
        ) {
            if (t == null) return@LoadStateContent
            Column(Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                SectionCard {
                    Text("Đơn ${t.code}", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    t.store?.let { Text(it.name, fontSize = 13.sp, color = TextSecondary) }
                    if (t.status == "PENDING_PAYMENT") {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            if (holdLeft > 0) "Giữ suất còn %d:%02d".format(holdLeft / 60, holdLeft % 60) else "Đã hết hạn giữ suất",
                            color = if (holdLeft > 0) ForestGreenPrimary else CoralRed, fontWeight = FontWeight.Bold
                        )
                    }
                    t.pickup?.takeIf { t.status == "PAID" }?.let {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            if (it.inWindow) "Đang trong khung nhận, còn ${it.minutesLeft} phút" else "Khung nhận: ${formatDateTime(it.start)} - ${formatDateTime(it.end)}",
                            fontSize = 13.sp, color = TextSecondary
                        )
                    }
                }
                SectionCard {
                    t.steps.forEachIndexed { index, step ->
                        Row(verticalAlignment = Alignment.Top) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Box(
                                    Modifier.size(20.dp).clip(CircleShape).background(
                                        when (step.state) { "done" -> ForestGreenPrimary; "current" -> Color(0xFFF59E0B); else -> Color(0xFFD1D5DB) }
                                    ),
                                    contentAlignment = Alignment.Center
                                ) { if (step.state == "done") Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp)) }
                                if (index < t.steps.lastIndex) Box(Modifier.width(2.dp).height(28.dp).background(Color(0xFFE5E7EB)))
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text(step.label, fontWeight = if (step.state == "pending") FontWeight.Normal else FontWeight.SemiBold, color = if (step.state == "pending") TextMuted else TextPrimary)
                                step.at?.let { Text(formatDateTime(it), fontSize = 12.sp, color = TextMuted) }
                            }
                        }
                    }
                    t.terminal?.let {
                        Spacer(Modifier.height(10.dp))
                        Text(it.label, fontWeight = FontWeight.Bold, color = CoralRed)
                        it.reason?.let { r -> Text(r, fontSize = 12.sp, color = TextSecondary) }
                    }
                }
                t.store?.let { store ->
                    OutlinedButton(onClick = { onOpenMap(store.name, store.address.orEmpty()) }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp)); Text("Chỉ đường tới cửa hàng")
                    }
                }
                if (t.status == "PAID" || t.status == "PICKED_UP" || t.unreadMessages > 0) {
                    OutlinedButton(onClick = onOpenChat, modifier = Modifier.fillMaxWidth()) {
                        BadgedBox(badge = { if (t.unreadMessages > 0) Badge { Text("${t.unreadMessages}") } }) {
                            Icon(Icons.Default.Chat, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                        Spacer(Modifier.width(10.dp)); Text("Nhắn cho cửa hàng")
                    }
                }
                if (t.status == "PAID") {
                    OutlinedButton(onClick = onReportIncident, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.ReportProblem, contentDescription = null, modifier = Modifier.size(18.dp), tint = if (t.hasOpenIncident) CoralRed else LocalContentColor.current)
                        Spacer(Modifier.width(6.dp)); Text(if (t.hasOpenIncident) "Sự cố đang chờ xử lý" else "Báo sự cố khi nhận hàng")
                    }
                }
            }
        }
    }
}

/** KX11 Trò chuyện theo đơn: làm mới 6 giây một lần. */
@Composable
fun OrderChatScreen(
    state: OrderSupportUiState,
    orderId: String,
    onLoad: () -> Unit,
    onSend: (String) -> Unit,
    onBackClick: () -> Unit,
    onConsumeMessage: () -> Unit
) {
    LaunchedEffect(orderId) { while (true) { onLoad(); delay(6_000) } }
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(state.message) { state.message?.let { snackbar.showSnackbar(it); onConsumeMessage() } }
    val chat = state.chat
    val listState = rememberLazyListState()
    LaunchedEffect(chat?.messages?.size) { if (chat != null && chat.messages.isNotEmpty()) listState.animateScrollToItem(chat.messages.lastIndex) }
    var input by remember { mutableStateOf("") }

    Scaffold(
        topBar = { BackTopBar("Nhắn cho cửa hàng", onBackClick) },
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (chat?.isOpen != false) Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = input, onValueChange = { input = it.take(500) },
                    placeholder = { Text("Nhập tin nhắn…") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(24.dp), maxLines = 3
                )
                Spacer(Modifier.width(8.dp))
                IconButton(
                    onClick = { onSend(input.trim()); input = "" },
                    enabled = input.isNotBlank() && !state.isBusy,
                    modifier = Modifier.size(48.dp).clip(CircleShape).background(if (input.isNotBlank()) ForestGreenPrimary else Color(0xFFD1D5DB))
                ) { Icon(Icons.Default.Send, contentDescription = "Gửi", tint = Color.White) }
            } else Text("Trò chuyện đã đóng sau 24 giờ kể từ khi đơn kết thúc.", color = TextSecondary, fontSize = 12.sp, modifier = Modifier.padding(16.dp))
        }
    ) { padding ->
        LoadStateContent(
            isLoading = chat == null && state.chatError == null,
            errorMessage = if (chat == null) state.chatError else null,
            isEmpty = chat == null || chat.messages.isEmpty(),
            emptyIcon = Icons.Default.Chat,
            emptyTitle = "Chưa có tin nhắn",
            emptyMessage = "Hỏi cửa hàng về món, giờ nhận hoặc lối vào. Tin nhắn chỉ dành cho đơn này.",
            modifier = Modifier.padding(padding),
            onRetry = onLoad
        ) {
            LazyColumn(Modifier.padding(padding), state = listState, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(chat?.messages.orEmpty(), key = { it.id }) { m ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (m.fromMe) Arrangement.End else Arrangement.Start) {
                        Column(
                            Modifier.widthIn(max = 280.dp).clip(RoundedCornerShape(16.dp))
                                .background(if (m.fromMe) ForestGreenPrimary else Color(0xFFF3F4F6)).padding(horizontal = 12.dp, vertical = 8.dp)
                        ) {
                            Text(m.body, color = if (m.fromMe) Color.White else TextPrimary, fontSize = 14.sp)
                            Text(formatDateTime(m.createdAt), color = if (m.fromMe) Color.White.copy(alpha = 0.8f) else TextMuted, fontSize = 10.sp)
                        }
                    }
                }
            }
        }
    }
}

private val INCIDENT_TYPES = listOf(
    "STORE_CLOSED" to "Cửa hàng đóng cửa",
    "NOT_READY" to "Món chưa sẵn sàng",
    "WRONG_ITEM" to "Sai món",
    "LONG_WAIT" to "Chờ quá lâu",
    "OTHER" to "Sự cố khác"
)

/** KX03 Báo sự cố khi đến nhận. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ReportIncidentScreen(
    state: OrderSupportUiState,
    orderId: String,
    onLoad: () -> Unit,
    onSubmit: (type: String, note: String) -> Unit,
    onBackClick: () -> Unit,
    onConsumeMessage: () -> Unit
) {
    LaunchedEffect(orderId) { onLoad() }
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(state.message) { state.message?.let { snackbar.showSnackbar(it); onConsumeMessage() } }
    var type by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf("") }

    Scaffold(topBar = { BackTopBar("Báo sự cố khi nhận hàng", onBackClick) }, snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        Column(Modifier.padding(padding).verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(
                "Nếu cửa hàng đóng cửa hoặc món chưa sẵn sàng, bạn sẽ không bị tính là không đến nhận trong lúc chờ xử lý. " +
                    "Cửa hàng không phản hồi trong 2 giờ thì hệ thống hoàn tiền cho bạn.",
                fontSize = 13.sp, color = TextSecondary, lineHeight = 19.sp
            )
            Text("Bạn gặp vấn đề gì?", fontWeight = FontWeight.SemiBold)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                INCIDENT_TYPES.forEach { (key, label) -> FilterChip(selected = type == key, onClick = { type = key }, label = { Text(label) }) }
            }
            OutlinedTextField(value = note, onValueChange = { note = it.take(500) }, label = { Text("Mô tả thêm (không bắt buộc)") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
            Button(
                onClick = { type?.let { onSubmit(it, note) } },
                enabled = type != null && !state.isBusy,
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) { Text("Gửi báo sự cố") }

            if (state.incidents.isNotEmpty()) {
                Text("Các sự cố đã báo", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                state.incidents.forEach { i ->
                    SectionCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(i.typeLabel, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            StatusChip(friendlyStatus(i.status), if (i.status == "RESOLVED") ForestGreenPrimary else TextSecondary)
                        }
                        i.note?.let { Text(it, fontSize = 12.sp, color = TextSecondary) }
                        i.storeResponse?.let { Text("Cửa hàng: $it", fontSize = 12.sp, color = TextPrimary) }
                        Text(formatDateTime(i.createdAt), fontSize = 11.sp, color = TextMuted)
                    }
                }
            }
        }
    }
}

/** KX05 Đổi suất cùng cửa hàng. */
@Composable
fun SwapOrderScreen(
    state: OrderSupportUiState,
    orderId: String,
    onLoad: () -> Unit,
    onSwap: (offerId: String) -> Unit,
    onBackClick: () -> Unit,
    onDone: () -> Unit,
    onConsumeMessage: () -> Unit
) {
    LaunchedEffect(orderId) { onLoad() }
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(state.message) { state.message?.let { snackbar.showSnackbar(it); onConsumeMessage() } }
    val doneAtStart = remember { state.doneCounter }
    LaunchedEffect(state.doneCounter) { if (state.doneCounter > doneAtStart) onDone() }
    var confirm by remember { mutableStateOf<SwapOptionDto?>(null) }
    val swap = state.swap

    Scaffold(topBar = { BackTopBar("Đổi suất", onBackClick) }, snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        LoadStateContent(
            isLoading = state.isLoading,
            errorMessage = state.swapError,
            isEmpty = swap == null || swap.options.isEmpty(),
            emptyIcon = Icons.Default.SwapHoriz,
            emptyTitle = "Chưa có suất để đổi",
            emptyMessage = swap?.note ?: "Hiện cửa hàng chưa có suất nào phù hợp để đổi.",
            modifier = Modifier.padding(padding),
            onRetry = onLoad
        ) {
            LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { Text(swap?.note.orEmpty(), fontSize = 12.sp, color = TextSecondary) }
                items(swap?.options.orEmpty(), key = { it.offerId }) { o ->
                    SectionCard {
                        Text(o.title, fontWeight = FontWeight.Bold)
                        Text("${formatVnd(o.currentPrice)} mỗi suất • còn ${o.remainingQuantity} suất • nhận đến ${formatDateTime(o.pickupEnd)}", fontSize = 12.sp, color = TextSecondary)
                        TextButton(onClick = { confirm = o }, enabled = !state.isBusy) { Text("Đổi sang suất này", color = ForestGreenPrimary) }
                    }
                }
            }
        }
    }
    confirm?.let { o ->
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text("Đổi sang ${o.title}?") },
            text = { Text("Mỗi đơn chỉ đổi một lần và không hoàn phần chênh lệch giá. Mã QR hiện tại vẫn dùng được.") },
            confirmButton = { TextButton(onClick = { onSwap(o.offerId); confirm = null }) { Text("Xác nhận đổi") } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("Hủy") } }
        )
    }
}

/** Hộp thoại tặng suất (KX18), mở từ chi tiết đơn đã thanh toán. */
@Composable
fun GiftOrderDialog(isBusy: Boolean, onSend: (recipient: String, message: String) -> Unit, onDismiss: () -> Unit) {
    var recipient by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Tặng suất cho bạn bè") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Nhập số điện thoại hoặc email của người đã có tài khoản SurplusIQ. Suất chỉ chuyển khi họ chấp nhận; chưa chấp nhận thì suất vẫn là của bạn.", fontSize = 12.sp, color = TextSecondary)
                OutlinedTextField(value = recipient, onValueChange = { recipient = it }, label = { Text("Số điện thoại hoặc email") }, singleLine = true)
                OutlinedTextField(value = message, onValueChange = { message = it.take(200) }, label = { Text("Lời nhắn (không bắt buộc)") })
            }
        },
        confirmButton = { TextButton(enabled = recipient.trim().length >= 5 && !isBusy, onClick = { onSend(recipient, message) }) { Text("Gửi lời tặng") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Hủy") } }
    )
}

/** KX18 Hộp thư quà tặng: lời tặng nhận được và đã gửi. */
@Composable
fun GiftsScreen(
    state: OrderSupportUiState,
    onLoad: () -> Unit,
    onRespond: (id: String, action: String) -> Unit,
    onBackClick: () -> Unit,
    onConsumeMessage: () -> Unit
) {
    LaunchedEffect(Unit) { onLoad() }
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(state.message) { state.message?.let { snackbar.showSnackbar(it); onConsumeMessage() } }
    val gifts = state.gifts
    var tab by remember { mutableIntStateOf(0) }
    val list = if (tab == 0) gifts?.incoming.orEmpty() else gifts?.outgoing.orEmpty()

    Scaffold(topBar = { BackTopBar("Quà tặng", onBackClick) }, snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        Column(Modifier.padding(padding)) {
            TabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Nhận được") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Đã tặng") })
            }
            LoadStateContent(
                isLoading = state.isLoading && gifts == null,
                errorMessage = if (gifts == null) state.giftsError else null,
                isEmpty = list.isEmpty(),
                emptyIcon = Icons.Default.CardGiftcard,
                emptyTitle = if (tab == 0) "Chưa có quà tặng" else "Bạn chưa tặng suất nào",
                emptyMessage = if (tab == 0) "Khi bạn bè tặng suất cứu món, lời tặng sẽ hiện ở đây." else "Mở chi tiết một đơn đã thanh toán để tặng suất cho bạn bè.",
                onRetry = onLoad
            ) {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(list, key = { it.id }) { g ->
                        SectionCard {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(g.itemName ?: "Suất cứu món", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                StatusChip(friendlyStatus(g.status), if (g.status == "ACCEPTED") ForestGreenPrimary else TextSecondary)
                            }
                            Text(
                                (if (tab == 0) "Từ " else "Cho ") + (g.counterpart.name ?: g.counterpart.contact ?: "một người dùng") + (g.quantity?.let { " • $it suất" } ?: ""),
                                fontSize = 12.sp, color = TextSecondary
                            )
                            g.message?.let { Text("“$it”", fontSize = 13.sp) }
                            g.pickupEnd?.let { Text("Nhận hàng đến ${formatDateTime(it)}", fontSize = 11.sp, color = TextMuted) }
                            if (g.status == "PENDING") {
                                Text("Hết hạn ${formatDateTime(g.expiresAt)}", fontSize = 11.sp, color = TextMuted)
                                Row {
                                    if (tab == 0) {
                                        TextButton(onClick = { onRespond(g.id, "DECLINE") }, enabled = !state.isBusy) { Text("Từ chối", color = TextSecondary) }
                                        TextButton(onClick = { onRespond(g.id, "ACCEPT") }, enabled = !state.isBusy) { Text("Nhận suất", color = ForestGreenPrimary) }
                                    } else TextButton(onClick = { onRespond(g.id, "CANCEL") }, enabled = !state.isBusy) { Text("Thu hồi", color = CoralRed) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
