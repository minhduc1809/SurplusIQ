package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.automirrored.filled.ListAlt
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
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
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private data class ChatLine(val fromUser: Boolean, val text: String, val logId: String? = null)

private val AI_FEATURES = mapOf(
    "STORE_AI_CHAT" to "Hỏi đáp", "AI_WEEKLY_SUMMARY" to "Tóm tắt tuần", "AI_DESCRIBE_ITEM" to "Mô tả món",
    "AI_DRAFT_REVIEW_REPLY" to "Soạn phản hồi đánh giá", "AI_DRAFT_COMPLAINT_REPLY" to "Soạn phản hồi khiếu nại"
)
private val METRIC_NAME = mapOf(
    "REVENUE" to "Doanh thu", "ORDERS" to "Số đơn", "WASTE" to "Hao hụt", "SELL_THROUGH" to "Tỷ lệ bán hết", "NO_SHOW" to "Không đến nhận"
)
private val CARD_TYPE = mapOf("OPTIMIZE_PRICING" to "Tối ưu giá", "ADJUST_QUANTITY" to "Điều chỉnh số lượng", "OPEN_SURPRISE_BAG" to "Mở túi bất ngờ")

private val AI_SUGGESTIONS = listOf(
    "Tuần này đơn hàng thế nào?", "Doanh thu tuần này so với tuần trước?",
    "Có bao nhiêu khách không đến nhận?", "Có nên giảm giá sớm hơn không?"
)
private val AI_FOLLOW_UPS = listOf("Vì sao vậy?", "Nên làm gì tiếp theo?", "Tóm tắt ngắn hơn")

/**
 * S66-S70, S72 - Trợ lý AI: khung chat hiện đại; lịch sử, báo cáo tuần, cảnh báo, đề xuất, nhật ký và cấu hình nằm trong menu ⋯.
 * Số liệu do hệ thống tính; AI chỉ diễn đạt. Mức dùng xem ở màn Hạn mức sử dụng.
 * shortcut: chưa có cấu hình AI (S71) vì backend chưa lưu cài đặt; chưa nhập bằng micro.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AiScreen(repository: StoreRepository, isOwner: Boolean, onOpenQuotas: () -> Unit, onUpgrade: () -> Unit, onBack: () -> Unit) {
    var tab by remember { mutableStateOf("chat") }
    var menu by remember { mutableStateOf(false) }
    val chat = remember { mutableStateListOf<ChatLine>() }
    var conversationId by remember { mutableStateOf<String?>(null) }
    val pages = buildList {
        add(Triple("history", "Lịch sử đoạn chat", Icons.Default.History)); add(Triple("week", "Báo cáo tuần", Icons.Default.Assessment))
        add(Triple("quota", "Hạn mức AI", Icons.Default.Speed)); add(Triple("anomaly", "Cảnh báo bất thường", Icons.Default.Warning)); add(Triple("cards", "Đề xuất hành động", Icons.Default.Lightbulb))
        if (isOwner) add(Triple("logs", "Nhật ký sử dụng", Icons.AutoMirrored.Filled.ListAlt))
        add(Triple("config", "Cài đặt trợ lý", Icons.Default.Settings))
    }
    if (tab != "chat") {
        Column(Modifier.fillMaxSize().background(SqCanvas).padding(horizontal = 20.dp).padding(top = 20.dp)) {
            ScreenHeader(pages.first { it.first == tab }.second, { tab = "chat" })
            Spacer(Modifier.height(8.dp))
            when (tab) {
                "history" -> HistoryTab(repository) { id, lines -> conversationId = id; chat.clear(); chat.addAll(lines); tab = "chat" }
                "week" -> ProGate(repository, "Báo cáo tuần AI", onUpgrade) { WeekTab(repository) }
                "quota" -> AiQuotaTab(repository, onOpenQuotas)
                "anomaly" -> ProGate(repository, "Cảnh báo bất thường", onUpgrade) { AnomalyTab(repository) }
                "config" -> ConfigTab(repository, isOwner)
                "cards" -> ProGate(repository, "Đề xuất hành động", onUpgrade) { CardsTab(repository) }
                else -> LogsTab(repository)
            }
        }
        return
    }
    Column(Modifier.fillMaxSize().background(SqCanvas)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại", tint = SqInk) }
            AiAvatar(36.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text("Trợ lý SurplusIQ", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Text("Dựa trên số liệu 7 ngày của cửa hàng", fontSize = 11.sp, color = SqInkMuted)
            }
            IconButton(onClick = { menu = true }) { Icon(Icons.Default.MoreVert, contentDescription = "Tuỳ chọn", tint = SqInk) }
        }
        ChatTab(repository, chat, conversationId, { conversationId = it }, onOpenQuotas)
    }
    if (menu) ModalBottomSheet(onDismissRequest = { menu = false }, containerColor = Color.White) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 24.dp)) {
            AiMenuRow(Icons.Default.AddComment, "Cuộc trò chuyện mới") { chat.clear(); conversationId = null; menu = false }
            pages.forEach { (key, label, icon) -> AiMenuRow(icon, label) { tab = key; menu = false } }
        }
    }
}

@Composable
private fun AiAvatar(size: Dp) {
    Box(Modifier.size(size).clip(CircleShape).background(SqCoral), contentAlignment = Alignment.Center) {
        Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(size * 0.55f))
    }
}

@Composable
private fun AiMenuRow(icon: ImageVector, label: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(horizontal = 8.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(22.dp))
        Spacer(Modifier.width(16.dp))
        Text(label, fontSize = 15.sp, color = SqInk)
    }
}

@Composable
private fun ChatTab(repository: StoreRepository, chat: MutableList<ChatLine>, conversationId: String?, setConversation: (String?) -> Unit, onOpenQuotas: () -> Unit) {
    var input by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var rated by remember { mutableStateOf(setOf<String>()) }
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()
    var chatQuota by remember { mutableStateOf<QuotaDto?>(null) }
    LaunchedEffect(chat.size) { repository.getQuotas().onSuccess { chatQuota = it["ai_chat_query"] } }
    LaunchedEffect(chat.size, busy) { if (chat.isNotEmpty()) listState.animateScrollToItem(chat.lastIndex + if (busy) 1 else 0) }

    fun send(text: String) {
        val q = text.trim()
        if (q.isEmpty() || busy) return
        input = ""; error = null; busy = true; chat.add(ChatLine(true, q))
        scope.launch {
            repository.aiChat(q, conversationId).fold(
                onSuccess = { setConversation(it.conversationId); chat.add(ChatLine(false, it.reply, it.logId)) },
                onFailure = { error = it.message }
            )
            busy = false
        }
    }

    Column(Modifier.fillMaxSize()) {
        if (chat.isEmpty()) {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Spacer(Modifier.height(32.dp))
                AiAvatar(64.dp)
                Spacer(Modifier.height(16.dp))
                Text("Xin chào, tôi có thể giúp gì?", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Spacer(Modifier.height(6.dp))
                Text("Hỏi về đơn hàng, doanh thu, hao hụt hay cách bán tốt hơn. AI có thể sai, hãy đối chiếu trước khi quyết định.", fontSize = 13.sp, color = SqInkSoft, textAlign = TextAlign.Center)
                Spacer(Modifier.height(24.dp))
                AI_SUGGESTIONS.forEach { s ->
                    Row(
                        Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(RoundedCornerShape(16.dp)).background(Color.White)
                            .border(1.dp, SqCoralWash, RoundedCornerShape(16.dp)).clickable { send(s) }.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(s, Modifier.weight(1f), fontSize = 14.sp, color = SqInk)
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = SqCoral, modifier = Modifier.size(18.dp))
                    }
                }
            }
        } else {
            LazyColumn(Modifier.weight(1f), state = listState, verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) {
                items(chat.size) { i ->
                    val m = chat[i]
                    if (m.fromUser) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            Text(
                                m.text, fontSize = 14.sp, color = Color.White,
                                modifier = Modifier.widthIn(max = 300.dp).clip(RoundedCornerShape(18.dp, 18.dp, 4.dp, 18.dp)).background(SqCoral).padding(horizontal = 14.dp, vertical = 10.dp)
                            )
                        }
                    } else {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
                            AiAvatar(28.dp)
                            Spacer(Modifier.width(8.dp))
                            Column(Modifier.widthIn(max = 300.dp)) {
                                Text(
                                    m.text, fontSize = 14.sp, color = SqInk,
                                    modifier = Modifier.widthIn(max = 300.dp).clip(RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)).background(SqCoralWash).border(1.dp, SqCoral.copy(alpha = 0.35f), RoundedCornerShape(18.dp, 18.dp, 18.dp, 4.dp)).padding(horizontal = 14.dp, vertical = 10.dp)
                                )
                                val logId = m.logId
                                if (logId != null) Row(Modifier.padding(top = 2.dp)) {
                                    if (logId in rated) Text("Cảm ơn phản hồi của bạn", fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(8.dp))
                                    else {
                                        IconButton(onClick = { rated = rated + logId; scope.launch { repository.aiFeedback(logId, true) } }, Modifier.size(34.dp)) {
                                            Icon(Icons.Default.ThumbUp, contentDescription = "Hữu ích", tint = SqInkMuted, modifier = Modifier.size(16.dp))
                                        }
                                        IconButton(onClick = { rated = rated + logId; scope.launch { repository.aiFeedback(logId, false) } }, Modifier.size(34.dp)) {
                                            Icon(Icons.Default.ThumbDown, contentDescription = "Chưa đúng", tint = SqInkMuted, modifier = Modifier.size(16.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                if (busy) item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AiAvatar(28.dp); Spacer(Modifier.width(8.dp))
                        Text("Đang soạn câu trả lời…", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.clip(RoundedCornerShape(18.dp)).background(SqCoralWash).border(1.dp, SqCoral.copy(alpha = 0.35f), RoundedCornerShape(18.dp)).padding(horizontal = 14.dp, vertical = 10.dp))
                    }
                }
            }
        }
        Column(Modifier.padding(horizontal = 16.dp)) {
            chatQuota?.let { q ->
                Text(
                    if (q.isExceeded) "Đã hết lượt hỏi AI tháng này (${q.used}/${q.limit})" else "Còn ${q.remaining}/${q.limit} lượt hỏi AI trong tháng",
                    fontSize = 11.sp, color = if (q.isExceeded) SqCoralDeep else SqInkSoft, modifier = Modifier.padding(bottom = 6.dp)
                )
            }
            InlineError(error)
            if (error?.contains("hạn mức") == true) TextButton(onClick = onOpenQuotas, contentPadding = PaddingValues(0.dp)) { Text("Xem hạn mức sử dụng", color = SqCoralDeep) }
            if (chat.isNotEmpty() && !busy && !chat.last().fromUser) Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AI_FOLLOW_UPS.forEach { f ->
                    Text(
                        f, fontSize = 13.sp, color = SqCoralDeep, fontWeight = FontWeight.Medium,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(SqCoralWash).clickable { send(f) }.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }
        }
        Row(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f).heightIn(min = 48.dp).clip(RoundedCornerShape(26.dp)).background(SqCoralWash).border(1.5.dp, SqCoral, RoundedCornerShape(26.dp)).padding(horizontal = 18.dp, vertical = 12.dp), contentAlignment = Alignment.CenterStart) {
                if (input.isEmpty()) Text("Nhập câu hỏi…", fontSize = 15.sp, color = SqInkSoft)
                BasicTextField(input, { input = it.take(500) }, textStyle = TextStyle(fontSize = 15.sp, color = SqInk), maxLines = 4, modifier = Modifier.fillMaxWidth())
            }
            Spacer(Modifier.width(10.dp))
            val on = input.isNotBlank() && !busy
            IconButton(
                onClick = { send(input) }, enabled = on,
                modifier = Modifier.size(48.dp).clip(CircleShape).background(if (on) SqCoral else SqInkMuted.copy(alpha = 0.35f))
            ) { Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Gửi", tint = Color.White, modifier = Modifier.size(20.dp)) }
        }
    }
}

@Composable
private fun HistoryTab(repository: StoreRepository, onOpen: (String, List<ChatLine>) -> Unit) {
    var list by remember { mutableStateOf<List<AiConversationDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmAll by remember { mutableStateOf(false) }
    var retry by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(retry) { error = null; repository.getAiConversations().fold(onSuccess = { list = it }, onFailure = { error = it.message }) }
    val l = list
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        when {
            error != null -> ErrorState(error!!) { retry++ }
            l == null -> FullScreenLoading()
            l.isEmpty() -> EmptyState("Chưa có hội thoại", "Các cuộc hỏi đáp với trợ lý sẽ được lưu ở đây.")
            else -> {
                TextButton(onClick = { confirmAll = true }, contentPadding = PaddingValues(0.dp)) { Text("Xóa tất cả", color = SqCoralDeep) }
                l.forEach { c ->
                    SqCard(Modifier.clickable {
                        scope.launch {
                            repository.getAiConversation(c.id).onSuccess { d -> onOpen(d.id, d.messages.map { ChatLine(it.sender == "USER", it.content) }) }
                        }
                    }) {
                        Text(c.title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk, maxLines = 2)
                        Text(shortDateTime(c.updatedAt), fontSize = 11.sp, color = SqInkMuted)
                        TextButton(onClick = { scope.launch { repository.deleteAiConversation(c.id).onSuccess { retry++ } } }, contentPadding = PaddingValues(0.dp)) { Text("Xóa", fontSize = 12.sp, color = SqInkSoft) }
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
    if (confirmAll) ConfirmDialog(
        title = "Xóa tất cả hội thoại?", message = "Không thể hoàn tác.", confirmLabel = "Xóa tất cả", onDismiss = { confirmAll = false },
        onConfirm = { confirmAll = false; scope.launch { repository.deleteAllAiConversations().onSuccess { retry++ } } }
    )
}

@Composable
private fun WeekTab(repository: StoreRepository) {
    var data by remember { mutableStateOf<AiWeeklySummary?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    fun load() {
        busy = true; error = null
        scope.launch { repository.aiWeeklySummary().fold(onSuccess = { data = it }, onFailure = { error = it.message }); busy = false }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Text("Số liệu do hệ thống tính, văn bản do AI diễn đạt. Mỗi lần tạo dùng một lượt AI.", fontSize = 12.sp, color = SqInkSoft)
        Spacer(Modifier.height(8.dp))
        PrimaryButton(if (data == null) "Tạo báo cáo 7 ngày qua" else "Tạo lại", onClick = ::load, enabled = !busy, loading = busy)
        InlineError(error)
        val d = data
        if (d != null) {
            Spacer(Modifier.height(10.dp))
            SqCard { Text(d.summary, fontSize = 14.sp, color = SqInk) }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                MetricCard("Doanh thu", currency(d.totalRevenue), SqCoral, Modifier.weight(1f))
                MetricCard("Thực phẩm cứu", "%.1f kg".format(d.foodSavedKg), SqMint, Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))
            SqCard {
                SectionTitle("Điểm nổi bật")
                d.keyInsights.forEach { Text("• $it", fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(vertical = 2.dp)) }
            }
        }
    }
}

@Composable
private fun AnomalyTab(repository: StoreRepository) {
    var data by remember { mutableStateOf<AnomaliesResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    var why by remember { mutableStateOf<String?>(null) }
    why?.let { WhyDialog(repository, it) { why = null } }
    LaunchedEffect(retry) { error = null; repository.getAnomalies().fold(onSuccess = { data = it }, onFailure = { error = it.message }) }
    val d = data
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        when {
            error != null -> ErrorState(error!!) { retry++ }
            d == null -> FullScreenLoading()
            !d.isEligible -> SqCard {
                SectionTitle("Chưa đủ dữ liệu")
                Text(d.reason ?: "Cần ít nhất 28 ngày dữ liệu để phát hiện bất thường. Hiện có ${d.totalHistoryDays} ngày.", fontSize = 13.sp, color = SqInkSoft)
            }
            d.anomalies.isEmpty() -> EmptyState("Không có bất thường", "Các chỉ số hôm nay nằm trong mức kỳ vọng theo thứ.")
            else -> d.anomalies.forEach { a ->
                SqCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(METRIC_NAME[a.metric] ?: a.metric, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                        Text(if (a.severity == "CRITICAL") "Nghiêm trọng" else "Cảnh báo", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = SqCoralDeep)
                    }
                    Text("${if (a.direction == "SURGE") "▲ Tăng vọt" else "▼ Sụt giảm"}: thực tế ${"%.0f".format(a.actualValue)} so với kỳ vọng ${"%.0f".format(a.expectedValue)}", fontSize = 12.sp, color = SqInkSoft)
                    Text(a.explanation, fontSize = 12.sp, color = SqInk, modifier = Modifier.padding(top = 4.dp))
                    TextButton(onClick = { why = a.date }, contentPadding = PaddingValues(0.dp)) { Text("Vì sao?", color = SqCoralDeep) }
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun WhyDialog(repository: StoreRepository, date: String, onDismiss: () -> Unit) {
    var res by remember { mutableStateOf<AnomalyWhyResponse?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(date) { repository.getAnomalyWhy(date).fold(onSuccess = { res = it }, onFailure = { error = it.message }) }
    ConfirmDialog(title = "Yếu tố liên quan ngày ${shortDate(date)}", message = "", confirmLabel = "Đóng", onConfirm = onDismiss, onDismiss = onDismiss) {
        val r = res
        when {
            error != null -> InlineError(error)
            r == null -> FullScreenLoading()
            r.factors.isEmpty() -> Text("Không có yếu tố nào lệch rõ so với mức trung bình.", fontSize = 13.sp, color = SqInkSoft)
            else -> {
                r.factors.forEach { f ->
                    InfoRow((if (f.type == "HOUR") "Giờ " else "Món ") + f.label, "${"%.0f".format(f.actual)} đơn (TB ${f.average}) ${if (f.delta >= 0) "▲" else "▼"}")
                }
                r.note?.let { Text(it, fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 6.dp)) }
            }
        }
    }
}

@Composable
private fun ConfigTab(repository: StoreRepository, isOwner: Boolean) {
    var cfg by remember { mutableStateOf<AiConfigDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var msg by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { repository.getAiConfig().fold(onSuccess = { cfg = it }, onFailure = { error = it.message }) }
    val c = cfg
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        when {
            error != null && c == null -> ErrorState(error!!) { error = null }
            c == null -> FullScreenLoading()
            else -> {
                @Composable
                fun Row3(title: String, desc: String, on: Boolean, change: (Boolean) -> Unit) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 6.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                            Text(desc, fontSize = 12.sp, color = SqInkSoft)
                        }
                        androidx.compose.material3.Switch(checked = on, onCheckedChange = change, enabled = isOwner)
                    }
                }
                SqCard {
                    Row3("Trợ lý hỏi đáp", "Đọc số liệu đơn 7 ngày của quán để trả lời.", c.chat) { cfg = c.copy(chat = it) }
                    Row3("Tóm tắt tuần", "Đọc số liệu đơn và doanh thu 14 ngày.", c.weeklySummary) { cfg = c.copy(weeklySummary = it) }
                    Row3("Soạn nội dung", "Mô tả món, phản hồi đánh giá và khiếu nại, thông báo, gợi ý combo; đọc nội dung đánh giá của khách.", c.drafts) { cfg = c.copy(drafts = it) }
                    Row3("Cho Quản lý dùng AI", "Tắt thì chỉ chủ cửa hàng dùng được các tính năng AI.", c.managerCanUse) { cfg = c.copy(managerCanUse = it) }
                }
                Spacer(Modifier.height(10.dp))
                SqCard {
                    SectionTitle("Giọng điệu mặc định khi soạn phản hồi")
                    ChipRow(listOf("FRIENDLY" to "Thân thiện", "FORMAL" to "Trang trọng", "APOLOGETIC" to "Xin lỗi"), c.defaultTone) { if (isOwner) cfg = c.copy(defaultTone = it) }
                }
                Spacer(Modifier.height(10.dp))
                InlineError(error)
                InlineSuccess(msg)
                if (isOwner) PrimaryButton("Lưu cấu hình", loading = busy, onClick = {
                    busy = true; error = null; msg = null
                    scope.launch { repository.updateAiConfig(c).fold(onSuccess = { cfg = it; msg = "Đã lưu." }, onFailure = { error = it.message }); busy = false }
                }) else Text("Chỉ chủ cửa hàng đổi được cấu hình AI.", fontSize = 12.sp, color = SqInkMuted)
            }
        }
    }
}

@Composable
private fun CardsTab(repository: StoreRepository) {
    var list by remember { mutableStateOf<List<ActionCardDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var actionError by remember { mutableStateOf<String?>(null) }
    var watching by remember { mutableStateOf(false) }
    var retry by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(retry) { error = null; repository.getActionCards().fold(onSuccess = { list = it }, onFailure = { error = it.message }) }
    val l = list
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        ChipRow(listOf(false to "Đề xuất mới", true to "Đang theo dõi"), watching) { watching = it }
        Spacer(Modifier.height(8.dp))
        InlineError(actionError)
        when {
            error != null -> ErrorState(error!!) { retry++ }
            l == null -> FullScreenLoading()
            else -> {
                val rows = l.filter { if (watching) it.status == "ACCEPTED" else it.status == "PENDING" }
                if (rows.isEmpty()) EmptyState(if (watching) "Chưa có gì đang theo dõi" else "Chưa có đề xuất", if (watching) "Thẻ đã chấp nhận sẽ hiện ở đây." else "Đề xuất xuất hiện khi hệ thống phát hiện cơ hội cụ thể.")
                rows.forEach { c ->
                    SqCard {
                        Text(CARD_TYPE[c.actionType] ?: c.actionType, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                        Text(c.reasonText, fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(top = 2.dp))
                        c.expectedOutcome?.let { Text("Kỳ vọng: $it", fontSize = 12.sp, color = SqInkSoft) }
                        if (!watching) Row {
                            TextButton(onClick = { scope.launch { actionError = null; repository.applyActionCard(c.id).fold(onSuccess = { retry++ }, onFailure = { actionError = it.message }) } }, contentPadding = PaddingValues(0.dp)) { Text("Chấp nhận", color = SqMintDeep) }
                            Spacer(Modifier.width(16.dp))
                            TextButton(onClick = { scope.launch { actionError = null; repository.dismissActionCard(c.id).fold(onSuccess = { retry++ }, onFailure = { actionError = it.message }) } }, contentPadding = PaddingValues(0.dp)) { Text("Bỏ qua", color = SqInkSoft) }
                        } else Text("Chấp nhận không tự đổi giá hay tồn kho; hãy thực hiện ở màn tương ứng.", fontSize = 11.sp, color = SqInkMuted)
                    }
                    Spacer(Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun LogsTab(repository: StoreRepository) {
    var data by remember { mutableStateOf<AiLogsResponse?>(null) }
    var page by remember { mutableIntStateOf(1) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(page) { error = null; data = null; repository.getAiLogs(page).fold(onSuccess = { data = it }, onFailure = { error = it.message }) }
    val d = data
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        when {
            error != null -> ErrorState(error!!) { page = page }
            d == null -> FullScreenLoading()
            d.items.isEmpty() -> EmptyState("Chưa có lượt dùng AI", "Mỗi lượt gọi AI đều được ghi lại ở đây.")
            else -> {
                d.items.forEach { l ->
                    SqCard {
                        Row {
                            Text(AI_FEATURES[l.featureCode] ?: l.featureCode, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                            Text(shortDateTime(l.createdAt), fontSize = 11.sp, color = SqInkMuted)
                        }
                        Text("Hỏi: ${l.inputSummary}", fontSize = 12.sp, color = SqInkSoft, maxLines = 2)
                        Text("Trả lời: ${l.outputSummary}", fontSize = 12.sp, color = SqInk, maxLines = 3)
                        Text("${l.model} · ${l.latencyMs} ms", fontSize = 10.sp, color = SqInkMuted)
                    }
                    Spacer(Modifier.height(8.dp))
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    TextButton(onClick = { page-- }, enabled = page > 1) { Text("‹ Trước") }
                    Text("Trang ${d.page}/${maxOf(d.totalPages, 1)}", fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.padding(top = 12.dp))
                    TextButton(onClick = { page++ }, enabled = page < d.totalPages) { Text("Sau ›") }
                }
            }
        }
    }
}

private val AI_QUOTA_KEYS = listOf("ai_chat_query", "ai_content_gen", "ai_image_scan", "ai_customer_queries", "ai_complaint_gen")

/** Hạn mức từng loại tính năng AI (hỏi đáp, soạn nội dung, quét ảnh…) - lấy từ GET store/subscription/quotas. */
@Composable
private fun AiQuotaTab(repository: StoreRepository, onOpenQuotas: () -> Unit) {
    var list by remember { mutableStateOf<List<QuotaDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        repository.getQuotas().fold(onSuccess = { m -> list = AI_QUOTA_KEYS.mapNotNull { m[it] } }, onFailure = { error = it.message })
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        InlineError(error)
        val l = list
        if (l == null && error == null) FullScreenLoading()
        l?.forEach { q ->
            SqCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(q.name, Modifier.weight(1f), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = SqInk)
                    Text("${q.used}/${q.limit}", fontSize = 13.sp, color = if (q.isExceeded) SqCoralDeep else SqInkSoft)
                }
                Spacer(Modifier.height(8.dp))
                Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(SqCoralWash)) {
                    Box(Modifier.fillMaxWidth(if (q.limit > 0) (q.used.toFloat() / q.limit).coerceIn(0f, 1f) else 0f).fillMaxHeight().background(if (q.isExceeded) SqCoralDeep else SqCoral))
                }
            }
            Spacer(Modifier.height(10.dp))
        }
        TextButton(onClick = onOpenQuotas, contentPadding = PaddingValues(0.dp)) { Text("Xem tất cả hạn mức", color = SqCoralDeep) }
    }
}
