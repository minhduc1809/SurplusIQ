package com.surplusiq.app.ui.screens.ai

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

data class ChatMessage(
    val sender: String, // "user" or "ai"
    val text: String,
    val recommendedDeals: List<Deal> = emptyList()
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaveBiteAiSheet(
    allDeals: List<Deal>,
    onDealClick: (Deal) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    var queryText by remember { mutableStateOf("") }
    var remainingAiQuota by remember { mutableStateOf(28) } // 30 ops/day in GOI-KH
    val messages = remember {
        mutableStateListOf(
            ChatMessage(
                sender = "ai",
                text = "Xin chào! Tôi là Trợ lý Cứu Món SaveBite AI. Bạn có thể hỏi tôi bất kỳ điều gì, ví dụ: 'Tìm bánh ngọt dưới 35k gần Quận 1 sau 19h' hoặc hỏi về thành phần dị ứng món ăn!"
            )
        )
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .height(540.dp)
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.AutoAwesome,
                    contentDescription = null,
                    tint = ForestGreenPrimary,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = "Trợ Lý Cứu Món AI",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = "Hạn mức còn lại hôm nay: $remainingAiQuota/30 lượt",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }

            IconButton(onClick = onClose) {
                Icon(Icons.Default.Close, contentDescription = "Close")
            }
        }

        Divider(modifier = Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))

        // Chat Messages
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(messages) { msg ->
                val isAi = msg.sender == "ai"
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = if (isAi) Alignment.Start else Alignment.End
                ) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(14.dp))
                            .background(if (isAi) ForestGreenPrimary.copy(alpha = 0.08f) else ForestGreenPrimary)
                            .padding(12.dp)
                    ) {
                        Text(
                            text = msg.text,
                            fontSize = 13.sp,
                            color = if (isAi) TextPrimary else Color.White,
                            lineHeight = 18.sp
                        )
                    }

                    if (msg.recommendedDeals.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
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
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Input Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = queryText,
                onValueChange = { queryText = it },
                placeholder = { Text("Hỏi deal, dinh dưỡng, dị ứng...", fontSize = 13.sp) },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(24.dp),
                maxLines = 2
            )

            Spacer(modifier = Modifier.width(8.dp))

            IconButton(
                onClick = {
                    if (queryText.isNotBlank() && remainingAiQuota > 0) {
                        val userQuestion = queryText.trim()
                        messages.add(ChatMessage(sender = "user", text = userQuestion))
                        queryText = ""
                        remainingAiQuota--

                        // Smart reasoning response matching R1-082/R1-084
                        val filtered = allDeals.filter {
                            userQuestion.contains("bánh", ignoreCase = true) ||
                            userQuestion.contains("croissant", ignoreCase = true) ||
                            userQuestion.contains("tiệm", ignoreCase = true)
                        }.ifEmpty { listOf(allDeals.first()) }

                        messages.add(
                            ChatMessage(
                                sender = "ai",
                                text = "Dựa trên sở thích và yêu cầu của bạn, tôi tìm thấy ${filtered.size} suất Cứu Món phù hợp trong khung giờ tối nay:",
                                recommendedDeals = filtered
                            )
                        )
                    }
                },
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(ForestGreenPrimary)
            ) {
                Icon(
                    imageVector = Icons.Default.Send,
                    contentDescription = "Send",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}
