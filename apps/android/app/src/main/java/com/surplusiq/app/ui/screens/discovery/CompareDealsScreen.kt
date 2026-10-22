package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.AmberLight
import com.surplusiq.app.ui.theme.AmberAccent
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.CompareDeal
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.SqCard
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.SurfaceSubtle
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

private const val NOT_PROVIDED = "Chưa được cung cấp"

/** Chỉ số các ô có điểm cao nhất; rỗng nếu thiếu điểm hoặc mọi ô bằng nhau (không có lựa chọn nổi trội). */
internal fun bestIndices(scores: List<Double?>): Set<Int> {
    val valid = scores.filterNotNull()
    if (valid.size < 2 || valid.distinct().size == 1) return emptySet()
    val best = valid.max()
    return scores.indices.filter { scores[it] == best }.toSet()
}


/** K16 So sánh deal (R1-036): 2-3 suất đặt cạnh nhau, các ô cao bằng nhau, ô tốt nhất tô xanh. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CompareDealsScreen(
    deals: List<CompareDeal>,
    isLoading: Boolean,
    errorMessage: String?,
    onRetry: () -> Unit,
    onBackClick: () -> Unit,
    onChoose: (CompareDeal) -> Unit = {}
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("So sánh suất", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        bottomBar = {
            if (deals.isNotEmpty()) {
                Row(
                    Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).navigationBarsPadding().padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    val cheapest = bestIndices(deals.map { -it.currentPrice.toDouble() })
                    deals.forEachIndexed { index, deal ->
                        Button(
                            onClick = { onChoose(deal) },
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = if (index in cheapest) MintDeep else ForestGreenPrimary),
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 8.dp),
                            modifier = Modifier.weight(1f).height(52.dp)
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Chọn " + shortTitle(deal).split(" ").take(2).joinToString(" "), fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("%,dk".format(deal.currentPrice / 1000), fontSize = 11.sp, maxLines = 1)
                            }
                        }
                    }
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LoadStateContent(
            isLoading = isLoading,
            errorMessage = errorMessage,
            isEmpty = deals.isEmpty(),
            emptyIcon = Icons.AutoMirrored.Filled.CompareArrows,
            emptyTitle = "Chưa có suất để so sánh",
            emptyMessage = "Chọn 2-3 suất trong mục Đã lưu hoặc Xem gần đây.",
            onRetry = onRetry,
            modifier = Modifier.padding(padding)
        ) {
            val bestPrice = bestIndices(deals.map { -it.currentPrice.toDouble() })
            val bestDiscount = bestIndices(deals.map { it.discountPercent.toDouble() })
            Column(
                Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(Modifier.height(IntrinsicSize.Max), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    deals.forEachIndexed { index, deal ->
                        CompareHeaderCard(deal, isCheapest = index in bestPrice, isBestDiscount = index in bestDiscount, modifier = Modifier.weight(1f).fillMaxHeight())
                    }
                }

                SectionCard("Bảng đối chiếu thông số") {
                    MetricRow(Icons.Default.Schedule, "Khung nhận", deals.size) { i -> MetricCell(deals[i].pickupWindow.ifBlank { NOT_PROVIDED }) }
                    MetricRow(Icons.Default.Inventory2, "Còn lại", deals.size) { i ->
                        val d = deals[i]
                        Column(Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp)).background(SurfaceSubtle).padding(horizontal = 10.dp, vertical = 8.dp), verticalArrangement = Arrangement.Center) {
                            Text("Còn ${d.remainingQuantity} suất", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Spacer(Modifier.height(6.dp))
                            LinearProgressIndicator(
                                progress = { (d.remainingQuantity / 10f).coerceIn(0.05f, 1f) },
                                modifier = Modifier.fillMaxWidth().height(5.dp).clip(RoundedCornerShape(50)),
                                color = if (d.remainingQuantity <= 3) ForestGreenPrimary else MintDeep,
                                trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)
                            )
                        }
                    }
                    val ratingBest = bestIndices(deals.map { it.rating })
                    MetricRow(Icons.Default.Star, "Đánh giá quán", deals.size) { i ->
                        val d = deals[i]
                        MetricCell(d.rating?.let { "%.1f ★".format(it) } ?: "Chưa có", sub = if (d.rating != null) "${d.reviewsCount} đánh giá" else null, highlight = i in ratingBest)
                    }
                    MetricRow(Icons.Default.CheckCircle, "Trạng thái", deals.size, last = true) { i ->
                        val open = deals[i].isAvailable
                        MetricCell(if (open) "Đang mở bán" else "Đã hết", highlight = open)
                    }
                }

                SectionCard("Thành phần & dị ứng") {
                    deals.forEachIndexed { i, deal ->
                        if (i > 0) HorizontalDivider(Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                        Text(shortTitle(deal), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = ForestGreenPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            deal.ingredients ?: NOT_PROVIDED,
                            fontSize = 12.sp,
                            lineHeight = 17.sp,
                            color = if (deal.ingredients == null) TextMuted else TextPrimary
                        )
                        Spacer(Modifier.height(8.dp))
                        val allergens = deal.allergens
                        if (allergens.isNullOrEmpty()) {
                            Text(if (allergens == null) NOT_PROVIDED else "Không có chất gây dị ứng", fontSize = 11.sp, color = TextMuted)
                        } else {
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                allergens.forEach { a ->
                                    Text(
                                        a,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFFA96B18),
                                        modifier = Modifier.clip(RoundedCornerShape(50)).background(AmberLight).padding(horizontal = 10.dp, vertical = 3.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Bỏ tiền tố "Suất Cứu Món • " để tên món không bị cắt mất phần quan trọng. */
private fun shortTitle(deal: CompareDeal) = deal.title.substringAfter("• ")

@Composable
private fun SectionCard(title: String, content: @Composable ColumnScope.() -> Unit) {
    SqCard(shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(title.uppercase(), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.8.sp)
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun MetricRow(icon: ImageVector, label: String, count: Int, last: Boolean = false, cell: @Composable (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
    }
    Spacer(Modifier.height(6.dp))
    Row(Modifier.height(IntrinsicSize.Max), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        repeat(count) { i -> Box(Modifier.weight(1f).fillMaxHeight()) { cell(i) } }
    }
    if (!last) Spacer(Modifier.height(14.dp))
}

@Composable
private fun MetricCell(text: String, sub: String? = null, highlight: Boolean = false) {
    Column(
        Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp)).background(if (highlight) SkyBlueIce else SurfaceSubtle).padding(horizontal = 8.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = when {
                highlight -> MintDeep
                text == NOT_PROVIDED -> TextMuted
                else -> TextPrimary
            }
        )
        if (sub != null) Text(sub, fontSize = 10.sp, color = TextMuted, textAlign = TextAlign.Center)
    }
}

@Composable
private fun CompareHeaderCard(deal: CompareDeal, isCheapest: Boolean, isBestDiscount: Boolean, modifier: Modifier = Modifier) {
    SqCard(
        shape = RoundedCornerShape(18.dp),
        modifier = modifier,
        border = androidx.compose.foundation.BorderStroke(if (isCheapest) 1.5.dp else 1.dp, if (isCheapest) MintDeep.copy(alpha = 0.6f) else com.surplusiq.app.ui.theme.DividerColor)
    ) {
        Column {
            Box {
                AsyncImage(
                    model = deal.imageUrl?.ifBlank { null },
                    contentDescription = deal.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxWidth().height(110.dp).background(SurfaceSubtle)
                )
                Text(
                    "-${deal.discountPercent}%",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White,
                    modifier = Modifier.padding(8.dp).clip(RoundedCornerShape(50)).background(if (isBestDiscount) MintDeep else ForestGreenPrimary).padding(horizontal = 8.dp, vertical = 3.dp)
                )
            }
            Column(Modifier.fillMaxHeight().padding(horizontal = 10.dp, vertical = 8.dp)) {
                Text(shortTitle(deal), fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 2, minLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 17.sp)
                Text(deal.storeName.substringBefore(" - "), fontSize = 11.sp, color = TextSecondary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(6.dp))
                Text("%,d ₫".format(deal.currentPrice), fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, color = if (isCheapest) MintDeep else ForestGreenPrimary)
                Text("%,d ₫".format(deal.originalPrice), fontSize = 11.sp, color = TextMuted, textDecoration = TextDecoration.LineThrough)
                Spacer(Modifier.weight(1f))
                Box(Modifier.padding(top = 8.dp).height(24.dp)) {
                    if (isCheapest) Text(
                        "Giá tốt nhất",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MintDeep,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(SkyBlueIce).padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }
        }
    }
}
