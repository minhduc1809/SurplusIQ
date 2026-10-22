package com.surplusiq.app.ui.screens.store

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.data.remote.dto.StoreReviewItemDto
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.EmptyState
import com.surplusiq.app.ui.components.ErrorState
import com.surplusiq.app.ui.components.LoadingState
import com.surplusiq.app.ui.theme.*
import com.surplusiq.app.ui.viewmodel.StoreUiState

/**
 * K15 - Đánh giá công khai của quán (R1-027).
 * Hiển thị thống kê sao trung bình, phân bổ 1-5 sao, bộ lọc theo số sao và phản hồi từ chủ quán.
 */
@Composable
fun StoreReviewsScreen(
    storeId: String,
    state: StoreUiState,
    onLoadReviews: (storeId: String, rating: Int?) -> Unit,
    onBackClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedFilter by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(storeId, selectedFilter) {
        onLoadReviews(storeId, selectedFilter)
    }

    Scaffold(
        topBar = { BackTopBar("Đánh giá từ khách hàng", onBackClick) },
        modifier = modifier.fillMaxSize()
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when {
                state.isStoreReviewsLoading && state.storeReviews == null -> {
                    LoadingState(Modifier.fillMaxSize())
                }
                state.storeReviewsError != null && state.storeReviews == null -> {
                    ErrorState(
                        message = state.storeReviewsError,
                        onRetry = { onLoadReviews(storeId, selectedFilter) },
                        modifier = Modifier.fillMaxSize()
                    )
                }
                else -> {
                    val reviewsData = state.storeReviews
                    val reviews = reviewsData?.reviews.orEmpty()

                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        // Khối 1: Thống kê tổng quan & phân bổ sao
                        item {
                            RatingSummaryCard(
                                averageRating = reviewsData?.averageRating ?: 5.0,
                                totalReviews = reviewsData?.totalReviews ?: 0,
                                distribution = reviewsData?.distribution ?: emptyMap()
                            )
                        }

                        // Khối 2: Filter chip theo số sao
                        item {
                            RatingFilterChips(
                                selectedRating = selectedFilter,
                                onSelectRating = { selectedFilter = it }
                            )
                        }

                        // Khối 3: Danh sách các đánh giá
                        if (reviews.isEmpty()) {
                            item {
                                EmptyState(
                                    icon = Icons.Default.StarOutline,
                                    title = if (selectedFilter != null) "Chưa có đánh giá ${selectedFilter} sao nào" else "Chưa có đánh giá nào",
                                    subtitle = "Cửa hàng này chưa nhận được đánh giá theo tiêu chí đã chọn."
                                )
                            }
                        } else {
                            items(reviews, key = { it.id }) { review ->
                                StoreReviewItemCard(review = review)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun RatingSummaryCard(
    averageRating: Double,
    totalReviews: Int,
    distribution: Map<String, Int>,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Cột trái: Điểm số trung bình
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(0.4f)
            ) {
                Text(
                    text = if (totalReviews > 0) "%.1f".format(averageRating) else "--",
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = ForestGreenPrimary
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    repeat(5) { index ->
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = if (index < averageRating.toInt()) AmberAccent else Color(0xFFE2E8F0),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "$totalReviews đánh giá",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }

            Spacer(Modifier.width(16.dp))

            // Cột phải: Thanh tiến trình phân bổ 5 đến 1 sao
            Column(
                modifier = Modifier.weight(0.6f),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                (5 downTo 1).forEach { star ->
                    val count = distribution[star.toString()] ?: distribution[star.toString().trim()] ?: 0
                    val fraction = if (totalReviews > 0) count.toFloat() / totalReviews else 0f

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "$star",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextSecondary,
                            modifier = Modifier.width(12.dp)
                        )
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = AmberAccent,
                            modifier = Modifier.size(10.dp)
                        )
                        Spacer(Modifier.width(6.dp))
                        LinearProgressIndicator(
                            progress = { fraction },
                            modifier = Modifier
                                .weight(1f)
                                .height(6.dp)
                                .clip(RoundedCornerShape(3.dp)),
                            color = ForestGreenPrimary,
                            trackColor = SurfaceSubtle
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "$count",
                            fontSize = 11.sp,
                            color = TextMuted,
                            modifier = Modifier.width(20.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
internal fun RatingFilterChips(
    selectedRating: Int?,
    onSelectRating: (Int?) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            FilterChip(
                selected = selectedRating == null,
                onClick = { onSelectRating(null) },
                label = { Text("Tất cả", fontSize = 13.sp) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = ForestGreenPrimary,
                    selectedLabelColor = Color.White
                )
            )
        }
        (5 downTo 1).forEach { star ->
            item {
                FilterChip(
                    selected = selectedRating == star,
                    onClick = { onSelectRating(if (selectedRating == star) null else star) },
                    label = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("$star", fontSize = 13.sp)
                            Spacer(Modifier.width(2.dp))
                            Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(13.dp))
                        }
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = ForestGreenPrimary,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }
    }
}

@Composable
internal fun StoreReviewItemCard(
    review: StoreReviewItemDto,
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
            // Hàng đầu: Avatar + Tên khách + Ngày
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(SkyBlueIce),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = ForestGreenPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(
                            text = review.customerName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = TextPrimary
                        )
                        Text(
                            text = review.createdAt.take(10),
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                }

                // Sao
                Row(verticalAlignment = Alignment.CenterVertically) {
                    repeat(5) { index ->
                        Icon(
                            Icons.Default.Star,
                            contentDescription = null,
                            tint = if (index < review.rating) AmberAccent else Color(0xFFE2E8F0),
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
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

            // Phản hồi chính thức từ quán
            if (!review.storeReply.isNullOrBlank()) {
                Spacer(Modifier.height(12.dp))
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(SkyBlueIce.copy(alpha = 0.5f))
                        .padding(12.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Phản hồi từ chủ quán",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = ForestGreenPrimary
                        )
                        review.storeReplyAt?.let { replyTime ->
                            Text(
                                text = replyTime.take(10),
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = review.storeReply,
                        fontSize = 13.sp,
                        color = TextSecondary,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}
