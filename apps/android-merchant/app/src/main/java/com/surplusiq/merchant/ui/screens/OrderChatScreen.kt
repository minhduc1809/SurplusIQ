package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.OrderChatMessage
import com.surplusiq.merchant.data.OrderChatThread
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.ErrorState
import com.surplusiq.merchant.ui.components.FullScreenLoading
import com.surplusiq.merchant.ui.components.shortDateTime
import com.surplusiq.merchant.ui.theme.*
import compose.icons.FeatherIcons
import compose.icons.feathericons.ArrowLeft
import compose.icons.feathericons.Lock
import compose.icons.feathericons.MessageCircle
import compose.icons.feathericons.Send
import compose.icons.feathericons.User
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Câu trả lời nhanh: bấm để điền vào ô nhập, chủ quán tự kiểm tra rồi gửi.
private val QUICK_REPLIES = listOf(
    "Đơn của bạn đã sẵn sàng, mời bạn đến nhận.",
    "Quán đã nhận tin nhắn, sẽ phản hồi bạn ngay.",
    "Quán xin lỗi vì sự bất tiện, mong bạn thông cảm."
)

/** Nhắn tin với khách theo đơn (GET/POST store/orders/:id/messages). Làm mới 5 giây một lần để nhận tin khách vừa gửi. */
@Composable
fun OrderChatScreen(repository: StoreRepository, orderId: String, onBack: () -> Unit) {
    var thread by remember { mutableStateOf<OrderChatThread?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var input by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var sendError by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    LaunchedEffect(orderId, reload) {
        while (true) {
            repository.getOrderChat(orderId).fold(onSuccess = { thread = it; error = null }, onFailure = { if (thread == null) error = it.message })
            delay(5_000)
        }
    }
    val count = thread?.messages?.size ?: 0
    LaunchedEffect(count) { if (count > 0) listState.animateScrollToItem(count - 1) }

    fun send() {
        val text = input.trim()
        if (text.isEmpty() || sending) return
        sending = true
        sendError = null
        scope.launch {
            repository.sendOrderChat(orderId, text).fold(
                onSuccess = { input = ""; reload++ },
                onFailure = { sendError = it.message }
            )
            sending = false
        }
    }

    Column(Modifier.fillMaxSize().background(SqCanvas), horizontalAlignment = Alignment.CenterHorizontally) {
        ChatHeader(orderCode = thread?.orderCode, onBack = onBack)
        Box(Modifier.weight(1f).widthIn(max = 640.dp).fillMaxWidth()) {
            val t = thread
            when {
                error != null && t == null -> ErrorState(error!!) { reload++ }
                t == null -> FullScreenLoading()
                t.messages.isEmpty() -> Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(Modifier.size(72.dp).clip(CircleShape).background(SqCoralWash), contentAlignment = Alignment.Center) {
                        Icon(FeatherIcons.MessageCircle, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(32.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("Chưa có tin nhắn", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                    Text("Nhắn cho khách về giờ nhận hoặc tình trạng đơn.", fontSize = 13.sp, color = SqInkSoft, textAlign = TextAlign.Center)
                }
                else -> LazyColumn(
                    Modifier.fillMaxSize(),
                    state = listState,
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(t.messages, key = { it.id }) { m -> Bubble(m) }
                }
            }
        }

        val open = thread?.isOpen != false
        Surface(color = SqSurface, shadowElevation = 4.dp) {
            Column(Modifier.widthIn(max = 640.dp).fillMaxWidth()) {
                sendError?.let { Text(it, color = SqCoralDeep, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) }
                if (open) {
                    LazyRow(contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(QUICK_REPLIES) { reply ->
                            SuggestionChip(
                                onClick = { input = reply },
                                label = { Text(reply, fontSize = 12.sp, maxLines = 1) },
                                shape = RoundedCornerShape(20.dp),
                                border = SuggestionChipDefaults.suggestionChipBorder(enabled = true, borderColor = SqLine)
                            )
                        }
                    }
                    Row(Modifier.padding(horizontal = 12.dp).padding(bottom = 10.dp).fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                        TextField(
                            value = input,
                            onValueChange = { input = it.take(500) },
                            placeholder = { Text("Nhập tin nhắn…", color = SqInkMuted) },
                            modifier = Modifier.weight(1f).clip(RoundedCornerShape(24.dp)),
                            maxLines = 4,
                            colors = TextFieldDefaults.colors(
                                focusedContainerColor = SqSurfaceSoft, unfocusedContainerColor = SqSurfaceSoft,
                                focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = SqCoral
                            )
                        )
                        Spacer(Modifier.width(8.dp))
                        val canSend = input.isNotBlank() && !sending
                        Box(
                            Modifier.size(50.dp).clip(CircleShape).background(if (canSend) SqCoral else SqSurfaceSoft).clickable(enabled = canSend, onClick = ::send),
                            contentAlignment = Alignment.Center
                        ) {
                            if (sending) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                            else Icon(FeatherIcons.Send, contentDescription = "Gửi", tint = if (canSend) Color.White else SqInkMuted, modifier = Modifier.size(22.dp))
                        }
                    }
                } else {
                    Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                        Icon(FeatherIcons.Lock, contentDescription = null, tint = SqInkMuted, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Trò chuyện đã đóng sau 24 giờ kể từ khi đơn kết thúc.", color = SqInkSoft, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatHeader(orderCode: String?, onBack: () -> Unit) {
    Surface(color = SqSurface, shadowElevation = 2.dp) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(FeatherIcons.ArrowLeft, contentDescription = "Quay lại", tint = SqInk) }
            Box(Modifier.size(42.dp).clip(CircleShape).background(SqCoralWash), contentAlignment = Alignment.Center) {
                Icon(FeatherIcons.User, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("Khách hàng", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = SqInk)
                orderCode?.let { Text("Đơn $it", fontSize = 12.sp, color = SqInkSoft) }
            }
        }
    }
}

@Composable
private fun Bubble(m: OrderChatMessage) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (m.fromMe) Arrangement.End else Arrangement.Start) {
        Column(Modifier.widthIn(max = 290.dp), horizontalAlignment = if (m.fromMe) Alignment.End else Alignment.Start) {
            Box(
                Modifier.clip(RoundedCornerShape(topStart = 18.dp, topEnd = 18.dp, bottomStart = if (m.fromMe) 18.dp else 4.dp, bottomEnd = if (m.fromMe) 4.dp else 18.dp))
                    .background(if (m.fromMe) SqCoral else SqSurface)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) { Text(m.body, color = if (m.fromMe) Color.White else SqInk, fontSize = 14.sp, lineHeight = 20.sp) }
            Row(Modifier.padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(shortDateTime(m.createdAt), color = SqInkMuted, fontSize = 10.sp)
                // Trạng thái lấy từ readAt của máy chủ: khách đã mở đọc tin thì mới là "Đã xem".
                if (m.fromMe) Text(if (m.readAt != null) "Đã xem" else "Đã gửi", color = if (m.readAt != null) SqCoralDeep else SqInkMuted, fontSize = 10.sp)
            }
        }
    }
}
