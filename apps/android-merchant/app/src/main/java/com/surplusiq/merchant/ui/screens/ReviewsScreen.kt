package com.surplusiq.merchant.ui.screens

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
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
 * S45 - Đánh giá của khách (GET store/reviews?rating&hasReply, POST store/reviews/:id/reply).
 * Phản hồi công khai chỉ được gửi một lần, tối đa 500 ký tự; chỉ chủ và quản lý được phản hồi.
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

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(SqCanvas),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            ScreenHeader("Đánh giá của khách", onBack)
            Spacer(Modifier.height(8.dp))
            ChipRow(REVIEW_TABS, tab) { tab = it }
        }
        val all = list
        when {
            error != null -> item { ErrorState(error!!) { reloadKey++ } }
            all == null -> item { FullScreenLoading() }
            all.isEmpty() -> item { EmptyState("Chưa có đánh giá nào", "Khách hàng sẽ để lại đánh giá sau khi hoàn thành đơn hàng.", androidx.compose.material.icons.Icons.Default.Star) }
            else -> {
                item {
                    SqCard {
                        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                            Text("%.1f".format(all.map { it.rating }.average()), fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text("★".repeat(all.map { it.rating }.average().toInt().coerceIn(0, 5)), fontSize = 16.sp, color = SqButter)
                                Text("${all.size} đánh giá · ${all.count { it.storeReply == null }} chưa phản hồi", fontSize = 12.sp, color = SqInkSoft)
                            }
                        }
                    }
                }
                val shown = all.filter {
                    when (tab) { "good" -> it.rating >= 4; "bad" -> it.rating <= 2; "open" -> it.storeReply == null; else -> true }
                }
                if (shown.isEmpty()) item { EmptyState("Không có đánh giá phù hợp", "Thử chọn nhóm khác.", androidx.compose.material.icons.Icons.Default.Star) }
                items(shown, key = { it.id }) { r -> ReviewCard(r, canReply) { replying = r } }
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

@Composable
private fun ReviewCard(r: ReviewDto, canReply: Boolean, onReply: () -> Unit) {
    SqCard {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text("★".repeat(r.rating) + "☆".repeat((5 - r.rating).coerceAtLeast(0)), fontSize = 16.sp, color = SqButter, modifier = Modifier.weight(1f))
            if (r.status != "VISIBLE") StatusBadge(r.status)
        }
        Text(shortDateTime(r.createdAt), fontSize = 11.sp, color = SqInkMuted)
        r.comment?.takeIf { it.isNotBlank() }?.let { Text(it, fontSize = 14.sp, color = SqInk, modifier = Modifier.padding(top = 6.dp)) }
        if (r.storeReply != null) {
            Spacer(Modifier.height(8.dp))
            Column(Modifier.fillMaxWidth().background(SqSurfaceSoft, androidx.compose.foundation.shape.RoundedCornerShape(12.dp)).padding(10.dp)) {
                Text("Quán phản hồi · ${shortDateTime(r.storeReplyAt)}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SqInkSoft)
                Text(r.storeReply, fontSize = 13.sp, color = SqInk)
            }
        } else if (canReply) {
            TextButton(onClick = onReply, contentPadding = PaddingValues(0.dp)) {
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
