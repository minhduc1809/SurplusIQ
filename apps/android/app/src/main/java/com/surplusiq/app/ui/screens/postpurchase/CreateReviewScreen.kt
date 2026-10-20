package com.surplusiq.app.ui.screens.postpurchase

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.ActiveOrder
import com.surplusiq.app.domain.repository.InteractionsRepository
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateReviewScreen(
    order: ActiveOrder,
    interactionsRepository: InteractionsRepository,
    onBackClick: () -> Unit,
    onSubmitSuccess: () -> Unit,
    modifier: Modifier = Modifier
) {
    val coroutineScope = rememberCoroutineScope()
    var rating by remember { mutableStateOf(5) }
    var comment by remember { mutableStateOf("") }
    val selectedTags = remember { mutableStateListOf<String>() }
    var isSubmitting by remember { mutableStateOf(false) }
    var showSuccessDialog by remember { mutableStateOf(false) }

    val praiseTags = listOf(
        "Bánh tươi nóng giòn",
        "Đóng gói cẩn thận",
        "Nhân viên nhiệt tình",
        "Đúng giờ",
        "Rất đáng tiền",
        "Sẽ ủng hộ tiếp"
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        TopAppBar(
            title = {
                Text(
                    text = "Đánh giá đơn hàng",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back"
                    )
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Order Summary Card
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = order.deal.storeName,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "${order.deal.title} • Mã #${order.orderCode}",
                        fontSize = 13.sp,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Đã thanh toán: ${String.format("%,d", order.totalPrice)} ₫",
                        fontWeight = FontWeight.SemiBold,
                        color = ForestGreenPrimary,
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Star Rating Section
            Text(
                text = "Trải nghiệm cứu món của bạn thế nào?",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = TextPrimary
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Interactive Star Row (1-5)
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                for (star in 1..5) {
                    val isFilled = star <= rating
                    IconButton(
                        onClick = { rating = star },
                        modifier = Modifier.size(48.dp)
                    ) {
                        Icon(
                            imageVector = if (isFilled) Icons.Filled.Star else Icons.Outlined.StarBorder,
                            contentDescription = "$star sao",
                            tint = if (isFilled) Color(0xFFF59E0B) else Color(0xFFD1D5DB),
                            modifier = Modifier.size(40.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            val ratingCaption = when (rating) {
                5 -> "Tuyệt vời! Rất hài lòng"
                4 -> "Ngon và đáng tiền"
                3 -> "Bình thường"
                2 -> "Chưa hài lòng"
                else -> "Rất thất vọng"
            }
            Text(
                text = ratingCaption,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (rating >= 4) ForestGreenPrimary else Color(0xFFE11D48)
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Quick Tag Chips
            Text(
                text = "Điểm bạn yêu thích nhất (chọn nhanh):",
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
                color = TextSecondary,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Flow of Chips
            OptInFlowTags(
                tags = praiseTags,
                selectedTags = selectedTags,
                onTagToggle = { tag ->
                    if (selectedTags.contains(tag)) {
                        selectedTags.remove(tag)
                    } else {
                        selectedTags.add(tag)
                    }
                }
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Comment Field with Counter (max 300 chars, R1-064)
            OutlinedTextField(
                value = comment,
                onValueChange = { if (it.length <= 300) comment = it },
                label = { Text("Nhận xét chi tiết (tùy chọn)") },
                placeholder = { Text("Món ăn có tươi ngon không? Thái độ nhân viên ra sao?...") },
                modifier = Modifier.fillMaxWidth().height(130.dp),
                shape = RoundedCornerShape(12.dp),
                supportingText = {
                    Text(
                        text = "${comment.length} / 300 ký tự",
                        fontSize = 11.sp,
                        color = TextMuted,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = androidx.compose.ui.text.style.TextAlign.End
                    )
                }
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Policy Notice (R1-065)
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "💡 Theo quy chuẩn R1-065, bạn có quyền chỉnh sửa lại đánh giá này trong vòng 24 giờ sau khi gửi.",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(12.dp),
                    lineHeight = 16.sp
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Submit Button
            Button(
                onClick = {
                    isSubmitting = true
                    coroutineScope.launch {
                        val finalComment = if (selectedTags.isNotEmpty()) {
                            val tagsText = "[${selectedTags.joinToString(", ")}]"
                            if (comment.isNotBlank()) "$tagsText $comment" else tagsText
                        } else {
                            comment
                        }

                        interactionsRepository.submitReview(
                            orderId = order.id,
                            rating = rating,
                            comment = finalComment.ifBlank { null }
                        )
                        isSubmitting = false
                        showSuccessDialog = true
                    }
                },
                enabled = !isSubmitting,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(25.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Gửi đánh giá",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }
        }
    }

    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = {
                showSuccessDialog = false
                onSubmitSuccess()
            },
            icon = {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = ForestGreenPrimary,
                    modifier = Modifier.size(48.dp)
                )
            },
            title = {
                Text(
                    text = "Cảm ơn đánh giá của bạn!",
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Text(
                    text = "Đánh giá của bạn giúp cộng đồng Cứu Món lựa chọn dễ dàng hơn và giúp cửa hàng ngày càng nâng cao chất lượng dịch vụ.",
                    fontSize = 14.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSuccessDialog = false
                        onSubmitSuccess()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
                ) {
                    Text("Hoàn tất")
                }
            }
        )
    }
}

@Composable
fun OptInFlowTags(
    tags: List<String>,
    selectedTags: List<String>,
    onTagToggle: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        val rows = tags.chunked(2)
        rows.forEach { rowTags ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rowTags.forEach { tag ->
                    val isSelected = selectedTags.contains(tag)
                    FilterChip(
                        selected = isSelected,
                        onClick = { onTagToggle(tag) },
                        label = { Text(text = tag, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = ForestGreenPrimary.copy(alpha = 0.15f),
                            selectedLabelColor = ForestGreenDark
                        ),
                        modifier = Modifier.weight(1f)
                    )
                }
                if (rowTags.size == 1) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
