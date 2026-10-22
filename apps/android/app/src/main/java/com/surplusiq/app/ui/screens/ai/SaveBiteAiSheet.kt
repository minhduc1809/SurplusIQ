package com.surplusiq.app.ui.screens.ai

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.material.icons.filled.HealthAndSafety
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Search
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AddComment
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.History
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.filled.OpenInNew
import com.surplusiq.app.data.remote.dto.AiSuggestedActionDto
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.AiUiState

data class ChatMessage(
    val sender: String, // "user" or "ai"
    val text: String,
    val recommendedDeals: List<Deal> = emptyList(),
    val action: AiSuggestedActionDto? = null
)

/** Nhóm câu hỏi gợi ý: chỉ là mẫu câu hỏi, câu trả lời luôn lấy từ dữ liệu thật qua trợ lý. */
private data class AiTopic(val title: String, val icon: ImageVector, val questions: List<String>)

private val AiTopics = listOf(
    AiTopic("Tìm suất", Icons.Default.Search, listOf(
        "Tìm món rẻ dưới 35k gần tôi",
        "Hôm nay quán nào gần tôi đang có suất?",
        "Món nào còn nhiều suất nhất?"
    )),
    AiTopic("Bữa ăn", Icons.Default.Restaurant, listOf(
        "Gợi ý bữa tối no bụng giá mềm",
        "Món nào ít calo, hợp ăn kiêng?"
    )),
    AiTopic("Sức khỏe", Icons.Default.HealthAndSafety, listOf(
        "Tôi dị ứng đậu phộng, nên tránh món nào?"
    )),
    AiTopic("Đơn & mẹo", Icons.Default.ReceiptLong, listOf(
        "Đơn của tôi nhận hàng lúc mấy giờ?",
        "Cách hâm nóng bún, phở mang về"
    ))
)

private val SuggestedQuestions = AiTopics.flatMap { it.questions }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaveBiteAiSheet(
    state: AiUiState,
    onSendMessage: (String) -> Unit,
    onOpenHistory: () -> Unit,
    onNewChat: () -> Unit,
    onDealClick: (Deal) -> Unit,
    onActionClick: (AiSuggestedActionDto) -> Unit = {},
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    var queryText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    // Chỉ có lời chào mở đầu: hiện màn chào kèm câu hỏi gợi ý thay vì khoảng trống
    val isFreshChat = state.messages.size <= 1 && !state.isChatLoading
    val canSend = (state.remainingQuota ?: 1) > 0 && !state.isChatLoading

    fun send(text: String) {
        val t = text.trim()
        if (t.isNotBlank() && canSend) {
            queryText = ""
            onSendMessage(t)
        }
    }

    // Luôn cuộn tới tin mới nhất
    LaunchedEffect(state.messages.size, state.isChatLoading) {
        val last = state.messages.size + (if (state.isChatLoading) 1 else 0) - 1
        if (last >= 0) listState.animateScrollToItem(last)
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = state.activeConversationTitle ?: "Trợ Lý Cứu Món AI",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = (state.remainingQuota?.let { "Còn $it lượt hôm nay • " } ?: "") + if (state.rememberContext) "Đang ghi nhớ" else "Không ghi nhớ",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onClose) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                    }
                },
                actions = {
                    IconButton(onClick = onNewChat) {
                        Icon(Icons.Default.AddComment, contentDescription = "Hội thoại mới", tint = ForestGreenPrimary)
                    }
                    IconButton(onClick = onOpenHistory) {
                        Icon(Icons.Default.History, contentDescription = "Lịch sử hội thoại", tint = TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        // Thanh nhập chừa chỗ thanh điều hướng hệ thống hoặc bàn phím (lấy cái lớn hơn, không cộng dồn)
        bottomBar = {
            Surface(color = MaterialTheme.colorScheme.surface, shadowElevation = 6.dp) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .windowInsetsPadding(WindowInsets.navigationBars.union(WindowInsets.ime))
                        .padding(top = 8.dp, bottom = 8.dp)
                ) {
                    if (!isFreshChat) {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(SuggestedQuestions) { q ->
                                SuggestionChip(text = q, enabled = canSend) { send(q) }
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = queryText,
                            onValueChange = { queryText = it },
                            placeholder = { Text("Hỏi suất, dinh dưỡng, dị ứng...", fontSize = 13.sp) },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(24.dp),
                            maxLines = 3,
                            enabled = !state.isChatLoading
                        )
                        Spacer(Modifier.width(8.dp))
                        val active = queryText.isNotBlank() && canSend
                        IconButton(
                            onClick = { send(queryText) },
                            enabled = active,
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(if (active) ForestGreenPrimary else TextMuted)
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Gửi",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    ) { inner ->
        if (isFreshChat) {
            WelcomePanel(
                greeting = state.messages.firstOrNull()?.text.orEmpty(),
                enabled = canSend,
                onPick = { send(it) },
                modifier = Modifier.padding(inner)
            )
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .padding(inner)
                    .fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                itemsIndexed(state.messages) { _, msg ->
                    val isAi = msg.sender.equals("ai", ignoreCase = true)
                    MessageRow(
                        msg = msg,
                        isAi = isAi,
                        onDealClick = onDealClick,
                        onActionClick = onActionClick
                    )
                }
                if (state.isChatLoading) {
                    item { TypingIndicator() }
                }
            }
        }
    }
}

@Composable
private fun WelcomePanel(
    greeting: String,
    enabled: Boolean,
    onPick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var topicIndex by remember { mutableStateOf(0) }
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        item {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                Modifier.size(64.dp).clip(CircleShape).background(ForestGreenPrimary.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(32.dp))
            }
            Spacer(Modifier.height(14.dp))
            Text("Trợ lý Cứu Món xin chào!", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary, textAlign = TextAlign.Center)
            Spacer(Modifier.height(8.dp))
            Text(
                greeting,
                fontSize = 13.sp,
                color = TextSecondary,
                lineHeight = 19.sp,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(22.dp))
            Text(
                "Bạn muốn hỏi về",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextMuted,
                modifier = Modifier.align(Alignment.Start)
            )
            Spacer(Modifier.height(10.dp))
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(AiTopics.size) { i ->
                    val t = AiTopics[i]
                    val selected = i == topicIndex
                    Surface(
                        onClick = { topicIndex = i },
                        shape = RoundedCornerShape(50),
                        color = if (selected) ForestGreenPrimary else MaterialTheme.colorScheme.surface,
                        border = if (selected) null else BorderStroke(1.dp, ForestGreenPrimary.copy(alpha = 0.25f))
                    ) {
                        Row(Modifier.padding(horizontal = 14.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(t.icon, contentDescription = null, tint = if (selected) Color.White else ForestGreenPrimary, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text(t.title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else TextPrimary)
                        }
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            }
        }
        items(AiTopics[topicIndex].questions) { q ->
            SuggestionCard(text = q, icon = AiTopics[topicIndex].icon, enabled = enabled) { onPick(q) }
            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SuggestionCard(text: String, icon: ImageVector, enabled: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp,
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, ForestGreenPrimary.copy(alpha = 0.25f), RoundedCornerShape(16.dp))
            .clickable(enabled = enabled, onClick = onClick)
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(12.dp))
            Text(text, fontSize = 14.sp, color = TextPrimary, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun SuggestionChip(text: String, enabled: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(50),
        color = ForestGreenPrimary.copy(alpha = 0.10f),
        modifier = Modifier.clip(RoundedCornerShape(50)).clickable(enabled = enabled, onClick = onClick)
    ) {
        Text(
            text,
            fontSize = 12.sp,
            color = ForestGreenDark,
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp)
        )
    }
}

@Composable
private fun MessageRow(
    msg: ChatMessage,
    isAi: Boolean,
    onDealClick: (Deal) -> Unit,
    onActionClick: (AiSuggestedActionDto) -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isAi) Alignment.Start else Alignment.End
    ) {
        Row(verticalAlignment = Alignment.Top) {
            if (isAi) {
                Box(
                    Modifier.size(28.dp).clip(CircleShape).background(ForestGreenPrimary.copy(alpha = 0.14f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(16.dp))
                }
                Spacer(Modifier.width(8.dp))
            }
            Box(
                modifier = Modifier
                    .widthIn(max = 300.dp)
                    .clip(
                        RoundedCornerShape(
                            topStart = 16.dp, topEnd = 16.dp,
                            bottomStart = if (isAi) 4.dp else 16.dp,
                            bottomEnd = if (isAi) 16.dp else 4.dp
                        )
                    )
                    .background(if (isAi) ForestGreenPrimary.copy(alpha = 0.08f) else ForestGreenPrimary)
                    .padding(horizontal = 14.dp, vertical = 10.dp)
            ) {
                Text(
                    text = msg.text,
                    fontSize = 14.sp,
                    color = if (isAi) TextPrimary else Color.White,
                    lineHeight = 20.sp
                )
            }
        }
        if (isAi && msg.action != null) {
            Spacer(Modifier.height(8.dp))
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = ForestGreenPrimary,
                shadowElevation = 2.dp,
                modifier = Modifier
                    .padding(start = 36.dp)
                    .clickable { onActionClick(msg.action) }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.OpenInNew,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = msg.action.label,
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        if (msg.recommendedDeals.isNotEmpty()) {
            Spacer(Modifier.height(8.dp))
            msg.recommendedDeals.forEach { deal ->
                DealCard(
                    deal = deal,
                    onDealClick = onDealClick,
                    onFavoriteToggle = {},
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }
        }
    }
}

@Composable
private fun TypingIndicator() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(ForestGreenPrimary.copy(alpha = 0.08f))
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = ForestGreenPrimary)
        Spacer(Modifier.width(8.dp))
        Text("Trợ lý đang suy nghĩ...", fontSize = 12.sp, color = TextSecondary)
    }
}
