package com.surplusiq.app.ui.screens.ordersupport

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
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
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.LilacWash
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBlueLight
import com.surplusiq.app.ui.theme.SkyBluePrimary
import com.surplusiq.app.ui.theme.SurfaceSubtle
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
            Column(Modifier.padding(padding).fillMaxSize().wrapContentWidth(androidx.compose.ui.Alignment.CenterHorizontally).widthIn(max = 640.dp).fillMaxWidth().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
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

// Gợi ý câu hỏi: bấm chỉ điền vào ô nhập, người dùng tự gửi.
private val CHAT_SUGGESTIONS = listOf(
    "Đơn của tôi đã sẵn sàng chưa?",
    "Tôi đến nhận lúc mấy giờ được?",
    "Lối vào cửa hàng ở đâu?",
    "Có thể giữ hàng thêm không?"
)

/** KX11 Trò chuyện theo đơn: làm mới 6 giây một lần để nhận tin cửa hàng vừa gửi. Chỉ hiển thị dữ liệu máy chủ trả về. */
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
    LaunchedEffect(chat?.messages?.size) {
        if (chat != null && chat.messages.isNotEmpty()) listState.animateScrollToItem(chat.messages.lastIndex)
    }
    var input by remember { mutableStateOf("") }
    val storeName = chat?.storeName?.takeIf { it.isNotBlank() } ?: state.tracking?.store?.name ?: "Cửa hàng"
    val storeInitials = storeName.split(" ", "-").filter { it.isNotBlank() }.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar() }.joinToString("")

    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(shadowElevation = 2.dp, color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 4.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = TextPrimary) }
                Box(
                    Modifier.size(42.dp).clip(CircleShape).background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(SkyBluePrimary, SkyBlueLight))),
                    contentAlignment = Alignment.Center
                ) { Text(storeInitials.ifBlank { "CH" }, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp) }
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(storeName, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TextPrimary, maxLines = 1)
                    chat?.orderCode?.let { Text("Đơn $it", fontSize = 12.sp, color = TextSecondary) }
                }
            }
        }
        Box(Modifier.weight(1f).widthIn(max = 640.dp).fillMaxWidth()) {
            when {
                chat == null && state.chatError == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = SkyBluePrimary) }
                chat == null -> Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(state.chatError.orEmpty(), color = TextSecondary, fontSize = 14.sp)
                    TextButton(onClick = onLoad) { Text("Thử lại", color = SkyBluePrimary) }
                }
                chat.messages.isEmpty() -> Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(72.dp).clip(CircleShape).background(SkyBlueContainer), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Chat, contentDescription = null, tint = SkyBluePrimary, modifier = Modifier.size(32.dp))
                    }
                    Spacer(Modifier.height(14.dp))
                    Text("Bắt đầu cuộc trò chuyện", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = TextPrimary)
                    Text("Hỏi về món, giờ nhận hoặc lối vào.", fontSize = 13.sp, color = TextSecondary)
                }
                else -> LazyColumn(Modifier.fillMaxSize(), state = listState, contentPadding = PaddingValues(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(chat.messages, key = { it.id }) { m ->
                        ChatBubble(body = m.body, fromMe = m.fromMe, timestamp = formatDateTime(m.createdAt), read = m.readAt != null)
                    }
                }
            }
            SnackbarHost(snackbar, Modifier.align(Alignment.BottomCenter))
        }

        if (chat != null && chat.isOpen) {
            Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 4.dp) {
                Column(Modifier.widthIn(max = 640.dp).fillMaxWidth().navigationBarsPadding()) {
                    androidx.compose.foundation.lazy.LazyRow(contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(CHAT_SUGGESTIONS) { q ->
                            Box(
                                Modifier.clip(RoundedCornerShape(20.dp)).border(1.dp, DividerColor, RoundedCornerShape(20.dp))
                                    .clickable { input = q }.padding(horizontal = 12.dp, vertical = 6.dp)
                            ) { Text(q, fontSize = 12.sp, color = TextPrimary, maxLines = 1) }
                        }
                    }
                    Row(Modifier.padding(horizontal = 12.dp).padding(bottom = 10.dp).fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                        TextField(
                            value = input, onValueChange = { input = it.take(500) },
                            placeholder = { Text("Nhập tin nhắn…", color = TextMuted) },
                            modifier = Modifier.weight(1f).clip(RoundedCornerShape(24.dp)), maxLines = 4,
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = SurfaceSubtle, unfocusedContainerColor = SurfaceSubtle,
                                focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = SkyBluePrimary
                            )
                        )
                        Spacer(Modifier.width(8.dp))
                        val canSend = input.isNotBlank() && !state.isBusy
                        Box(
                            Modifier.size(50.dp).clip(CircleShape).background(if (canSend) SkyBluePrimary else SurfaceSubtle)
                                .clickable(enabled = canSend) { onSend(input.trim()); input = "" },
                            contentAlignment = Alignment.Center
                        ) {
                            if (state.isBusy) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                            else Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Gửi", tint = if (canSend) Color.White else TextMuted, modifier = Modifier.size(22.dp))
                        }
                    }
                }
            }
        } else if (chat != null) {
            Surface(color = MaterialTheme.colorScheme.surface) {
                Row(Modifier.fillMaxWidth().navigationBarsPadding().padding(16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Trò chuyện đã đóng sau 24 giờ kể từ khi đơn kết thúc.", color = TextSecondary, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun ChatBubble(body: String, fromMe: Boolean, timestamp: String, read: Boolean) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (fromMe) Arrangement.End else Arrangement.Start) {
        Column(Modifier.widthIn(max = 290.dp), horizontalAlignment = if (fromMe) Alignment.End else Alignment.Start) {
            Box(
                Modifier.clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = if (fromMe) 18.dp else 4.dp, bottomEnd = if (fromMe) 4.dp else 18.dp))
                    .background(if (fromMe) SkyBluePrimary else LilacWash).padding(horizontal = 14.dp, vertical = 10.dp)
            ) { Text(body, color = if (fromMe) Color.White else TextPrimary, fontSize = 14.sp, lineHeight = 20.sp) }
            Row(Modifier.padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(timestamp, color = TextMuted, fontSize = 10.sp)
                // "Đã xem" chỉ khi máy chủ có readAt, tức cửa hàng đã mở đọc tin.
                if (fromMe) Text(if (read) "Đã xem" else "Đã gửi", color = if (read) SkyBluePrimary else TextMuted, fontSize = 10.sp)
            }
        }
    }
}

private data class IncidentType(val key: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val INCIDENT_TYPES = listOf(
    IncidentType("STORE_CLOSED", "Cửa hàng đóng cửa", Icons.Default.Storefront),
    IncidentType("NOT_READY", "Món chưa sẵn sàng", Icons.Default.Schedule),
    IncidentType("WRONG_ITEM", "Sai món", Icons.Default.Inventory2),
    IncidentType("LONG_WAIT", "Chờ quá lâu", Icons.Default.AccessTime),
    IncidentType("OTHER", "Sự cố khác", Icons.Default.MoreHoriz)
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

    Scaffold(
        topBar = { BackTopBar("Báo sự cố", onBackClick) },
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            Box(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface), contentAlignment = Alignment.Center) {
                Button(
                    onClick = { type?.let { onSubmit(it, note) } },
                    enabled = type != null && !state.isBusy,
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    modifier = Modifier.widthIn(max = 640.dp).fillMaxWidth().padding(16.dp).height(52.dp)
                ) { Text("Gửi báo sự cố", fontWeight = FontWeight.Bold) }
            }
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().wrapContentWidth(Alignment.CenterHorizontally).widthIn(max = 640.dp).fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Bạn gặp vấn đề gì khi đến nhận?", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = TextPrimary)
            Text("Cửa hàng không phản hồi trong 2 giờ, hệ thống hoàn tiền cho bạn.", fontSize = 13.sp, color = TextSecondary)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp), maxItemsInEachRow = 2) {
                INCIDENT_TYPES.forEach { t ->
                    val selected = type == t.key
                    Row(
                        Modifier.weight(1f).heightIn(min = 64.dp).clip(RoundedCornerShape(16.dp))
                            .background(if (selected) com.surplusiq.app.ui.theme.SkyBlueContainer else com.surplusiq.app.ui.theme.SurfaceSubtle)
                            .border(if (selected) 1.5.dp else 1.dp, if (selected) ForestGreenPrimary else com.surplusiq.app.ui.theme.DividerColor, RoundedCornerShape(16.dp))
                            .clickable { type = t.key }.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(Modifier.size(36.dp).clip(CircleShape).background(if (selected) ForestGreenPrimary else Color.White), contentAlignment = Alignment.Center) {
                            Icon(t.icon, contentDescription = null, tint = if (selected) Color.White else TextSecondary, modifier = Modifier.size(20.dp))
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(t.label, fontSize = 14.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium, color = TextPrimary)
                    }
                }
            }
            TextField(
                value = note, onValueChange = { note = it.take(500) },
                placeholder = { Text("Mô tả thêm (không bắt buộc)") },
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)), minLines = 3,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = com.surplusiq.app.ui.theme.SurfaceSubtle, unfocusedContainerColor = com.surplusiq.app.ui.theme.SurfaceSubtle,
                    focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent
                )
            )

            if (state.incidents.isNotEmpty()) {
                Text("Các sự cố đã báo", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                state.incidents.forEach { i ->
                    SectionCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(i.typeLabel, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            StatusChip(friendlyStatus(i.status), if (i.status == "RESOLVED") TextPrimary else TextSecondary)
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
            LazyColumn(Modifier.padding(padding).fillMaxSize().wrapContentWidth(androidx.compose.ui.Alignment.CenterHorizontally).widthIn(max = 640.dp).fillMaxWidth().navigationBarsPadding(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
