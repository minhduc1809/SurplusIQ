package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.CompareDeal
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

private val LABEL_WIDTH = 104.dp
private val COLUMN_WIDTH = 150.dp
private const val NOT_PROVIDED = "Chưa được cung cấp"

/** Một hàng của bảng so sánh: score dùng để tìm ô tốt nhất (càng lớn càng tốt), null = không xếp hạng. */
private data class CompareRow(val label: String, val value: (CompareDeal) -> String, val score: ((CompareDeal) -> Double?)? = null)

private val ROWS = listOf(
    CompareRow("Giá gốc", { "%,d ₫".format(it.originalPrice) }),
    CompareRow("Giá bán", { "%,d ₫".format(it.currentPrice) }, { -it.currentPrice.toDouble() }),
    CompareRow("Giảm giá", { "${it.discountPercent}%" }, { it.discountPercent.toDouble() }),
    CompareRow("Khung nhận", { it.pickupWindow.ifBlank { NOT_PROVIDED } }),
    CompareRow("Còn lại", { "${it.remainingQuantity} suất" }),
    CompareRow("Thành phần", { it.ingredients ?: NOT_PROVIDED }),
    CompareRow("Dị ứng", { it.allergens?.joinToString(", ") ?: NOT_PROVIDED }),
    CompareRow("Đánh giá quán", { d -> d.rating?.let { "%.1f (%d)".format(it, d.reviewsCount) } ?: "Chưa có" }, { it.rating }),
    CompareRow("Trạng thái", { if (it.isAvailable) "Đang mở bán" else "Đã hết" })
)

/** Chỉ số các ô có điểm cao nhất; rỗng nếu thiếu điểm hoặc mọi ô bằng nhau (không có lựa chọn nổi trội). */
internal fun bestIndices(scores: List<Double?>): Set<Int> {
    val valid = scores.filterNotNull()
    if (valid.size < 2 || valid.distinct().size == 1) return emptySet()
    val best = valid.max()
    return scores.indices.filter { scores[it] == best }.toSet()
}

/** K16 So sánh deal (R1-036): bảng 2-3 suất cuộn ngang, tô ô tốt nhất mỗi hàng. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompareDealsScreen(
    deals: List<CompareDeal>,
    isLoading: Boolean,
    errorMessage: String?,
    onRetry: () -> Unit,
    onBackClick: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("So sánh deal", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LoadStateContent(
            isLoading = isLoading,
            errorMessage = errorMessage,
            isEmpty = deals.isEmpty(),
            emptyIcon = Icons.AutoMirrored.Filled.CompareArrows,
            emptyTitle = "Chưa có deal để so sánh",
            emptyMessage = "Chọn 2-3 deal trong mục Đã lưu hoặc Xem gần đây.",
            onRetry = onRetry,
            modifier = Modifier.padding(padding)
        ) {
            Column(
                Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(vertical = 12.dp)
            ) {
                Column(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp)) {
                    Row {
                        Spacer(Modifier.width(LABEL_WIDTH))
                        deals.forEach { deal ->
                            Column(Modifier.width(COLUMN_WIDTH).padding(end = 8.dp)) {
                                AsyncImage(
                                    model = deal.imageUrl,
                                    contentDescription = deal.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(84.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(SurfaceSubtle)
                                )
                                Spacer(Modifier.height(6.dp))
                                Text(deal.title, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                Text(deal.storeName, fontSize = 11.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    ROWS.forEach { row ->
                        val best = row.score?.let { score -> bestIndices(deals.map(score)) }.orEmpty()
                        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                        Row(Modifier.height(IntrinsicSize.Min)) {
                            Text(
                                row.label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextSecondary,
                                modifier = Modifier.width(LABEL_WIDTH).padding(vertical = 10.dp)
                            )
                            deals.forEachIndexed { index, deal ->
                                val isBest = index in best
                                Box(
                                    Modifier
                                        .width(COLUMN_WIDTH)
                                        .fillMaxHeight()
                                        .padding(end = 8.dp, top = 4.dp, bottom = 4.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isBest) SkyBlueIce else MaterialTheme.colorScheme.background)
                                        .padding(horizontal = 8.dp, vertical = 6.dp)
                                ) {
                                    val text = row.value(deal)
                                    Text(
                                        text,
                                        fontSize = 12.sp,
                                        fontWeight = if (isBest) FontWeight.Bold else FontWeight.Normal,
                                        color = when {
                                            isBest -> MintDeep
                                            text == NOT_PROVIDED -> TextMuted
                                            else -> TextPrimary
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
                Text(
                    "Ô màu xanh là lựa chọn tốt nhất ở hàng đó (giá thấp nhất, giảm nhiều nhất, đánh giá cao nhất). \"$NOT_PROVIDED\" nghĩa là cửa hàng chưa khai báo, không có nghĩa là không có.",
                    fontSize = 11.sp,
                    color = TextMuted,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
    }
}
