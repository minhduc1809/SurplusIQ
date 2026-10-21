package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import com.surplusiq.app.domain.model.ForYouDeal
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.TextPrimary
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.ForYouResult
import com.surplusiq.app.ui.components.BackTopBar
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.DiscoveryUiState

/** K21 Gợi ý dành cho bạn (R1-084, R1-085, R1-093): mỗi thẻ kèm lý do thật; sheet "Vì sao gợi ý?" giải thích cách xếp. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForYouScreen(
    state: DiscoveryUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onDealClick: (Deal) -> Unit,
    onFavoriteToggle: (Deal) -> Unit,
    onCustomize: () -> Unit = {}
) {
    var showWhy by remember { mutableStateOf(false) }
    var sort by remember { mutableStateOf(ForYouSort.BEST) }
    val result: ForYouResult? = state.forYou

    Scaffold(
        topBar = {
            BackTopBar("Dành cho bạn", onBackClick) {
                IconButton(onClick = { showWhy = true }) { Icon(Icons.Default.HelpOutline, contentDescription = "Vì sao gợi ý?") }
            }
        }
    ) { padding ->
        LoadStateContent(
            isLoading = state.isForYouLoading,
            errorMessage = state.forYouErrorMessage,
            isEmpty = result == null || result.deals.isEmpty(),
            emptyIcon = Icons.Default.AutoAwesome,
            emptyTitle = "Chưa có gợi ý phù hợp",
            emptyMessage = if (result != null && result.excludedByDietary > 0)
                "${result.excludedByDietary} suất quanh bạn đã được loại vì chứa chất gây dị ứng hoặc món bạn không ăn."
            else "Hiện chưa có suất nào đang mở quanh bạn. Thử mở rộng bán kính trong cài đặt vị trí.",
            modifier = Modifier.padding(padding),
            onRetry = onRetry
        ) {
            val deals = remember(result, sort) {
                val list = result?.deals.orEmpty()
                when (sort) {
                    ForYouSort.BEST -> list
                    ForYouSort.DEEPEST -> list.sortedByDescending { it.deal.discountPercent }
                    ForYouSort.URGENT -> list.sortedByDescending { it.deal.isUrgent }
                }
            }
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (result != null) {
                    item {
                        AiEngineCard(
                            line = when {
                                result.note != null -> result.note
                                result.excludedByDietary > 0 -> "Đã ẩn ${result.excludedByDietary} suất không hợp hồ sơ vị giác & dị ứng của bạn."
                                else -> "Xếp theo thói quen mua, cửa hàng yêu thích và giờ bạn hay lấy hàng."
                            },
                            suggestionCount = deals.size,
                            filtered = result.excludedByDietary > 0,
                            onCustomize = onCustomize
                        )
                    }
                    item {
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SortChip("Phù hợp nhất", sort == ForYouSort.BEST, selectedIcon = true) { sort = ForYouSort.BEST }
                            SortChip("Giảm sâu nhất", sort == ForYouSort.DEEPEST) { sort = ForYouSort.DEEPEST }
                            SortChip("Sắp hết giờ", sort == ForYouSort.URGENT) { sort = ForYouSort.URGENT }
                            SortChip("Khẩu vị & Dị ứng", false, onClick = onCustomize)
                        }
                    }
                    items(deals, key = { it.deal.id }) { item ->
                        DealCard(
                            deal = item.deal,
                            onDealClick = onDealClick,
                            onFavoriteToggle = onFavoriteToggle,
                            footer = {
                                Spacer(Modifier.height(14.dp))
                                ReasonPanel(item)
                                Spacer(Modifier.height(14.dp))
                                Button(
                                    onClick = { onDealClick(item.deal) },
                                    shape = RoundedCornerShape(18.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                                    modifier = Modifier.fillMaxWidth().height(52.dp)
                                ) {
                                    Icon(Icons.Default.ShoppingBag, contentDescription = null, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Giữ suất ngay • ${"%,d".format(item.deal.discountPrice)}đ", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    if (showWhy) {
        ModalBottomSheet(onDismissRequest = { showWhy = false }) {
            Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Vì sao gợi ý?", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                Text("Danh sách được xếp bằng các yếu tố sau, đều lấy từ dữ liệu của chính bạn:", fontSize = 13.sp, color = TextSecondary)
                listOf(
                    "Cửa hàng bạn đã đánh dấu yêu thích",
                    "Loại món bạn đã nhận trong 90 ngày gần nhất",
                    "Khung giờ bạn hay lấy hàng",
                    "Món và cửa hàng bạn vừa xem",
                    "Khoảng cách, thời gian còn nhận được và mức giảm giá",
                    "Hồ sơ ăn uống: suất chứa chất gây dị ứng hoặc món bạn loại trừ bị ẩn hẳn, không chỉ xuống hạng"
                ).forEach { Text("• $it", fontSize = 13.sp) }
                Text(
                    "Khách mới chưa có lịch sử sẽ thấy danh sách xếp theo khoảng cách, thời gian nhận và mức giảm.",
                    fontSize = 12.sp,
                    color = TextSecondary
                )
            }
        }
    }
}

private enum class ForYouSort { BEST, DEEPEST, URGENT }

@Composable
private fun AiEngineCard(line: String, suggestionCount: Int, filtered: Boolean, onCustomize: () -> Unit) {
    Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp) {
        Column(Modifier.fillMaxWidth().padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(38.dp).clip(CircleShape).background(ForestGreenPrimary.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(10.dp))
                Text("SURPLUSIQ AI ENGINE", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = TextSecondary, letterSpacing = 0.6.sp, modifier = Modifier.weight(1f))
                if (suggestionCount > 0) {
                    Text(
                        "$suggestionCount gợi ý",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MintDeep,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(MintDeep.copy(alpha = 0.12f)).padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(line, fontSize = 13.sp, color = TextPrimary, lineHeight = 18.sp)
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (filtered) {
                    Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = MintDeep, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Lọc theo hồ sơ ẩm thực", fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f))
                } else {
                    Spacer(Modifier.weight(1f))
                }
                Text("Tùy chỉnh", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = ForestGreenPrimary, modifier = Modifier.clickable(onClick = onCustomize))
            }
        }
    }
}

@Composable
private fun SortChip(label: String, selected: Boolean, selectedIcon: Boolean = false, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        color = if (selected) ForestGreenPrimary else MaterialTheme.colorScheme.surface,
        border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, DividerColor),
    ) {
        Row(Modifier.padding(horizontal = 14.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
            if (selectedIcon && selected) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White, modifier = Modifier.size(15.dp))
                Spacer(Modifier.width(6.dp))
            }
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else TextPrimary)
        }
    }
}

/** Khung "Vì sao món này hợp với bạn?": mỗi dòng là một lý do thật do máy chủ tính cho suất này. */
@Composable
private fun ReasonPanel(item: ForYouDeal) {
    if (item.reasons.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Favorite, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(6.dp))
            Text("Vì sao món này hợp với bạn?", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimary, modifier = Modifier.weight(1f))
        }
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SkyBlueContainer).padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            item.reasons.forEach { reason ->
                Text("•  $reason", fontSize = 12.sp, color = TextPrimary, lineHeight = 17.sp)
            }
        }
    }
}
