package com.surplusiq.app.ui.screens.discovery

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
    onFavoriteToggle: (Deal) -> Unit
) {
    var showWhy by remember { mutableStateOf(false) }
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
            LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                if (result != null) {
                    item {
                        val line = when {
                            result.note != null -> result.note
                            result.excludedByDietary > 0 -> "Đã ẩn ${result.excludedByDietary} suất không hợp hồ sơ ăn uống của bạn."
                            else -> "Xếp theo thói quen mua, cửa hàng yêu thích và giờ bạn hay lấy hàng."
                        }
                        Text(line, fontSize = 12.sp, color = TextSecondary, lineHeight = 17.sp)
                    }
                    items(result.deals, key = { it.deal.id }) { item ->
                        Column {
                            DealCard(deal = item.deal, onDealClick = onDealClick, onFavoriteToggle = onFavoriteToggle)
                            Spacer(Modifier.height(6.dp))
                            item.reasons.forEach { reason ->
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 6.dp, top = 2.dp)) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(12.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(reason, fontSize = 12.sp, color = TextSecondary)
                                }
                            }
                        }
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
