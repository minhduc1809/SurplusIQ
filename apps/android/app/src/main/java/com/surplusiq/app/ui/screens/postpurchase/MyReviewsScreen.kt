package com.surplusiq.app.ui.screens.postpurchase

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.RateReview
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.CustomerReviewDto
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.theme.*
import com.surplusiq.app.ui.viewmodel.InteractionsUiState

/**
 * K38 - Đánh giá của tôi (R1-065, R1-066).
 * Hiển thị danh sách đánh giá của khách hàng, cho phép chỉnh sửa trong vòng 24 giờ và ẩn đánh giá.
 */
@Composable
fun MyReviewsScreen(
    state: InteractionsUiState,
    onLoad: () -> Unit,
    onUpdateReview: (reviewId: String, rating: Int, comment: String?) -> Unit,
    onHideReview: (reviewId: String) -> Unit,
    onConsumeMessage: () -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val snackbarHostState = remember { SnackbarHostState() }
    var editingReview by remember { mutableStateOf<CustomerReviewDto?>(null) }
    var hidingReview by remember { mutableStateOf<CustomerReviewDto?>(null) }

    LaunchedEffect(Unit) {
        onLoad()
    }

    LaunchedEffect(state.reviewActionMessage) {
        state.reviewActionMessage?.let {
            snackbarHostState.showSnackbar(it)
            onConsumeMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = { BackTopBar("Đánh giá của tôi", onBackClick) },
        modifier = modifier.fillMaxSize()
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when {
                state.isMyReviewsLoading && state.myReviews.isEmpty() -> {
                    LoadingState(Modifier.fillMaxSize())
                }
                state.myReviewsError != null && state.myReviews.isEmpty() -> {
                    ErrorState(
                        message = state.myReviewsError,
                        onRetry = onLoad,
                        modifier = Modifier.fillMaxSize()
                    )
                }
                state.myReviews.isEmpty() -> {
                    EmptyState(
                        icon = Icons.Default.RateReview,
                        title = "Bạn chưa có đánh giá nào",
                        subtitle = "Sau khi nhận suất cứu món thành công, hãy chia sẻ trải nghiệm để giúp đỡ cộng đồng nhé!"
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.myReviews, key = { it.id }) { review ->
                            MyReviewCard(
                                review = review,
                                onEdit = { editingReview = review },
                                onHide = { hidingReview = review }
                            )
                        }
                    }
                }
            }

            // Dialog chỉnh sửa đánh giá (trong 24 giờ)
            editingReview?.let { review ->
                EditReviewDialog(
                    initialRating = review.rating,
                    initialComment = review.comment.orEmpty(),
                    isLoading = state.isReviewActionLoading,
                    onDismiss = { editingReview = null },
                    onConfirm = { newRating, newComment ->
                        onUpdateReview(review.id, newRating, newComment)
                        editingReview = null
                    }
                )
            }

            // Dialog xác nhận ẩn đánh giá
            hidingReview?.let { review ->
                AlertDialog(
                    onDismissRequest = { hidingReview = null },
                    title = { Text("Ẩn đánh giá này?", fontWeight = FontWeight.Bold) },
                    text = {
                        Text(
                            "Đánh giá sẽ không còn hiển thị công khai trên trang của quán. Bạn có chắc chắn muốn ẩn không?",
                            color = TextSecondary
                        )
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                onHideReview(review.id)
                                hidingReview = null
                            },
                            colors = ButtonDefaults.textButtonColors(contentColor = CoralRed)
                        ) {
                            Text("Ẩn đánh giá", fontWeight = FontWeight.Bold)
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { hidingReview = null }) {
                            Text("Hủy")
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun MyReviewCard(
    review: CustomerReviewDto,
    onEdit: () -> Unit,
    onHide: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Hàng đầu: Tên quán + Mã đơn
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(
                        Icons.Default.Storefront,
                        contentDescription = null,
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        text = review.store.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimary
                    )
                }

                review.orderCode?.let { code ->
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = SurfaceSubtle
                    ) {
                        Text(
                            text = "#$code",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextSecondary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Hàng sao + Ngày tạo
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    repeat(5) { index ->
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = if (index < review.rating) AmberAccent else Color(0xFFE2E8F0),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = "${review.rating}/5",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = AmberAccent
                    )
                }

                Text(
                    text = review.createdAt.take(10),
                    fontSize = 12.sp,
                    color = TextMuted
                )
            }

            // Nhận xét của khách
            if (!review.comment.isNullOrBlank()) {
                Spacer(Modifier.height(10.dp))
                Text(
                    text = review.comment,
                    fontSize = 14.sp,
                    color = TextPrimary,
                    lineHeight = 20.sp
                )
            }

            // Phản hồi từ chủ quán (Store Reply)
            if (!review.storeReply.isNullOrBlank()) {
                Spacer(Modifier.height(12.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(SkyBlueIce.copy(alpha = 0.5f))
                        .padding(12.dp)
                ) {
                    Text(
                        text = "Phản hồi từ quán",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenPrimary
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = review.storeReply,
                        fontSize = 13.sp,
                        color = TextSecondary,
                        lineHeight = 18.sp
                    )
                }
            }

            // Hàng hành động (Sửa / Ẩn)
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (review.canEdit) {
                    OutlinedButton(
                        onClick = onEdit,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(34.dp)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Sửa (trong 24h)", fontSize = 12.sp)
                    }
                    Spacer(Modifier.width(8.dp))
                }

                TextButton(
                    onClick = onHide,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 6.dp),
                    modifier = Modifier.height(34.dp),
                    colors = ButtonDefaults.textButtonColors(contentColor = TextMuted)
                ) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Ẩn", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun EditReviewDialog(
    initialRating: Int,
    initialComment: String,
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (rating: Int, comment: String?) -> Unit
) {
    var rating by remember { mutableIntStateOf(initialRating) }
    var comment by remember { mutableStateOf(initialComment) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Chỉnh sửa đánh giá", fontWeight = FontWeight.Bold) },
        text = {
            Column(Modifier.fillMaxWidth()) {
                Text("Chọn số sao đánh giá:", fontSize = 13.sp, color = TextSecondary)
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    (1..5).forEach { star ->
                        IconButton(onClick = { rating = star }) {
                            Icon(
                                Icons.Default.Star,
                                contentDescription = "$star sao",
                                tint = if (star <= rating) AmberAccent else Color(0xFFCBD5E1),
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = comment,
                    onValueChange = { comment = it },
                    label = { Text("Nhận xét của bạn") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    maxLines = 5,
                    shape = RoundedCornerShape(10.dp)
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onConfirm(rating, comment.takeIf { it.isNotBlank() }) },
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Text("Lưu thay đổi")
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isLoading) {
                Text("Hủy")
            }
        }
    )
}
