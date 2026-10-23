package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ReviewDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val REVIEW_TABS = listOf("all" to "Tất cả", "good" to "Tích cực", "bad" to "Tiêu cực", "open" to "Chưa phản hồi")

/**
 * S45 - Đánh giá của khách (GET store/reviews, POST store/reviews/:id/reply).
 * Phản hồi công khai chỉ được gửi một lần, tối đa 500 ký tự; chỉ chủ và quản lý được phản hồi.
 * Tiêu đề và nhóm lọc cố định phía trên; danh sách đánh giá cuộn bên dưới, tự chia cột theo bề rộng.
 */
@Composable
fun ReviewsScreen(repository: StoreRepository, canReply: Boolean, onBack: () -> Unit) {
    var list by remember { mutableStateOf<List<ReviewDto>?>(null) }
    var tab by remember { mutableStateOf("all") }
    var error by remember { mutableStateOf<String?>(null) }
    var replying by remember { mutableStateOf<ReviewDto?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        list = null; error = null
        repository.getReviews(null, null).fold(onSuccess = { list = it }, onFailure = { error = it.message })
    }

    Box(Modifier.fillMaxSize().background(SqCanvas), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = 1100.dp).fillMaxSize().padding(horizontal = 20.dp).padding(top = 20.dp)) {
            ScreenHeader("Đánh giá của khách", onBack)
            Spacer(Modifier.height(8.dp))
            ChipRow(REVIEW_TABS, tab) { tab = it }
            Spacer(Modifier.height(12.dp))
            val all = list
            when {
                error != null -> ErrorState(error!!) { reloadKey++ }
                all == null -> FullScreenLoading()
                all.isEmpty() -> EmptyState("Chưa có đánh giá nào", "Khách hàng sẽ để lại đánh giá sau khi hoàn thành đơn hàng.", Icons.Default.Star)
                else -> {
                    val shown = all.filter {
                        when (tab) { "good" -> it.rating >= 4; "bad" -> it.rating <= 2; "open" -> it.storeReply == null; else -> true }
                    }
                    LazyVerticalGrid(
                        columns = GridCells.Adaptive(340.dp),
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        contentPadding = PaddingValues(bottom = 96.dp)
                    ) {
                        item(span = { GridItemSpan(maxLineSpan) }) { Column(Modifier.fillMaxWidth()) { RatingSummary(all) } }
                        if (shown.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                            Column(Modifier.fillMaxWidth()) { EmptyState("Không có đánh giá phù hợp", "Thử chọn nhóm khác.", Icons.Default.Star) }
                        }
                        items(shown, key = { it.id }) { r -> ReviewCard(r, canReply) { replying = r } }
                    }
                }
            }
        }
    }

    replying?.let { r ->
        ReplyDialog(r, onDismiss = { replying = null }) { text ->
            repository.replyReview(r.id, text).fold(
                onSuccess = { replying = null; reloadKey++; null }, onFailure = { it.message }
            )
        }
    }
}

/** Điểm trung bình, số đánh giá chưa phản hồi và phân bố số sao tính từ chính danh sách đánh giá. */
@Composable
private fun RatingSummary(all: List<ReviewDto>) {
    val avg = all.map { it.rating }.average()
    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("%.1f".format(avg), fontSize = 34.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                Stars(avg.toInt().coerceIn(0, 5))
                Text("${all.size} đánh giá", fontSize = 11.sp, color = SqInkSoft, modifier = Modifier.padding(top = 2.dp))
            }
            Spacer(Modifier.width(16.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                (5 downTo 1).forEach { star ->
                    val n = all.count { it.rating == star }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("$star", fontSize = 11.sp, color = SqInkSoft, modifier = Modifier.width(12.dp))
                        LinearProgressIndicator(
                            progress = { n.toFloat() / all.size.coerceAtLeast(1) },
                            modifier = Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(50)),
                            color = SqCoral, trackColor = SqCoralWash
                        )
                        Text("$n", fontSize = 11.sp, color = SqInkSoft, modifier = Modifier.width(26.dp).padding(start = 6.dp))
                    }
                }
            }
        }
        val open = all.count { it.storeReply == null }
        if (open > 0) Text("$open đánh giá chưa phản hồi", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = SqCoralDeep, modifier = Modifier.padding(top = 10.dp))
    }
}

@Composable
private fun Stars(rating: Int, size: androidx.compose.ui.unit.Dp = 16.dp) {
    Row {
        repeat(5) { i ->
            Icon(
                if (i < rating) Icons.Default.Star else Icons.Outlined.StarBorder,
                contentDescription = null, tint = if (i < rating) SqCoral else SqInkMuted, modifier = Modifier.size(size)
            )
        }
    }
}

@Composable
private fun ReviewCard(r: ReviewDto, canReply: Boolean, onReply: () -> Unit) {
    SqCard(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Stars(r.rating)
            Spacer(Modifier.weight(1f))
            if (r.status != "VISIBLE") StatusBadge(r.status)
        }
        Text(shortDateTime(r.createdAt), fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 2.dp))
        r.comment?.takeIf { it.isNotBlank() }?.let { Text(it, fontSize = 14.sp, color = SqInk, lineHeight = 20.sp, modifier = Modifier.padding(top = 8.dp)) }
        if (r.storeReply != null) {
            Spacer(Modifier.height(10.dp))
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqSurfaceSoft).padding(10.dp)) {
                Text("Quán phản hồi · ${shortDateTime(r.storeReplyAt)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqInkSoft)
                Text(r.storeReply, fontSize = 13.sp, color = SqInk, modifier = Modifier.padding(top = 2.dp))
            }
        } else if (canReply) {
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onReply, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                Text("Phản hồi công khai", color = SqCoralDeep, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ReplyDialog(review: ReviewDto, onDismiss: () -> Unit, onSubmit: suspend (String) -> String?) {
    var text by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    ConfirmDialog(
        title = "Phản hồi đánh giá ${review.rating} sao",
        message = "Phản hồi hiển thị công khai và chỉ gửi được một lần.",
        confirmLabel = if (busy) "Đang gửi…" else "Gửi phản hồi",
        confirmEnabled = text.isNotBlank() && !busy,
        onDismiss = onDismiss,
        onConfirm = {
            busy = true; error = null
            scope.launch { error = onSubmit(text.trim()); busy = false }
        }
    ) {
        Spacer(Modifier.height(8.dp))
        SqField("Nội dung (tối đa 500 ký tự)", text, singleLine = false) { text = it.take(500) }
        InlineError(error)
    }
}
