package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmarks
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
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.RadarDeal
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class, androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
fun BrowseScreen(
    deals: List<Deal>,
    onBackClick: () -> Unit,
    onDealClick: (Deal) -> Unit,
    onFavoriteToggle: (Deal) -> Unit,
    radarDeals: List<RadarDeal> = emptyList(),
    isRadarLoading: Boolean = false,
    radarErrorMessage: String? = null,
    onLoadRadar: () -> Unit = {},
    radarSettings: com.surplusiq.app.domain.model.RadarSettings = com.surplusiq.app.domain.model.RadarSettings(),
    locationLabel: String? = null,
    onApplyRadarSettings: (com.surplusiq.app.domain.model.RadarSettings) -> Unit = {},
    onOpenLocation: () -> Unit = {},
    onOpenSavedDeals: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var showRadar by remember { mutableStateOf(false) }
    var showRadarSettings by remember { mutableStateOf(false) }
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top App Bar
        TopAppBar(
            navigationIcon = {
                IconButton(onClick = onBackClick) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại")
                }
            },
            title = {
                Text(
                    text = "Tất cả suất",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            actions = {
                IconButton(onClick = onOpenSavedDeals) {
                    Icon(Icons.Default.Bookmarks, contentDescription = "Suất đã lưu, đã xem và so sánh")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        // Toàn bộ nội dung bên dưới thanh tiêu đề cuộn cùng nhau (không cố định bố cục)
        if (showRadar && showRadarSettings) {
            RadarSettingsSheet(
                settings = radarSettings,
                locationLabel = locationLabel,
                onDismiss = { showRadarSettings = false },
                onOpenLocation = { showRadarSettings = false; onOpenLocation() },
                onApply = { onApplyRadarSettings(it); showRadarSettings = false }
            )
        }
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Rescue Radar (CM-C05): "Gần nhất" (dữ liệu discover) vs "Khả năng nhận cao" (xếp hạng radar)
            item {
                Row(modifier = Modifier.fillMaxWidth()) {
                    SegmentedChip(
                        text = "Gần nhất",
                        selected = !showRadar,
                        onClick = { showRadar = false },
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    SegmentedChip(
                        text = "Khả năng nhận cao",
                        selected = showRadar,
                        onClick = {
                            showRadar = true
                            onLoadRadar()
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            if (showRadar) {
                item {
                    RadarHeader(
                        settings = radarSettings,
                        locationLabel = locationLabel,
                        resultCount = if (isRadarLoading) null else radarDeals.size,
                        onOpenSettings = { showRadarSettings = true },
                        onReset = { onApplyRadarSettings(com.surplusiq.app.domain.model.RadarSettings()) }
                    )
                }
                when {
                    isRadarLoading -> item {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = ForestGreenPrimary)
                        }
                    }
                    radarErrorMessage != null -> item {
                        Text(text = radarErrorMessage, color = MaterialTheme.colorScheme.error)
                    }
                    radarDeals.isEmpty() -> item {
                        Column(Modifier.fillMaxWidth().padding(vertical = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("Không có suất nào khớp thiết lập", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Thử nới bộ lọc (ngân sách, khung giờ) hoặc tăng bán kính ở phần vị trí.",
                                color = TextSecondary,
                                fontSize = 13.sp
                            )
                            TextButton(onClick = { onApplyRadarSettings(com.surplusiq.app.domain.model.RadarSettings()) }) {
                                Text("Đặt lại thiết lập", color = ForestGreenPrimary, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                    else -> itemsIndexed(radarDeals) { index, radarDeal ->
                        Column {
                            RadarRankRow(rank = index + 1, canArriveInTime = radarDeal.canArriveInTime)
                            DealCard(
                                deal = radarDeal.deal,
                                onDealClick = onDealClick,
                                onFavoriteToggle = onFavoriteToggle
                            )
                            if (radarDeal.rankingReasons.isNotEmpty()) {
                                FlowRow(
                                    modifier = Modifier.padding(top = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    radarDeal.rankingReasons.forEach { reason -> ReasonChip(reason) }
                                }
                            }
                        }
                    }
                }
            } else {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.dp, ForestGreenPrimary.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                            .background(Color.White)
                            .padding(horizontal = 16.dp, vertical = 14.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.StarOutline,
                                contentDescription = "Recommendation",
                                tint = ForestGreenPrimary,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "Suất cứu món phù hợp với bạn.",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = ForestGreenPrimary
                            )
                        }
                    }
                }
                items(deals) { deal ->
                    DealCard(deal = deal, onDealClick = onDealClick, onFavoriteToggle = onFavoriteToggle)
                }
            }
        }
    }
}

@Composable
private fun SegmentedChip(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) ForestGreenPrimary else Color.Transparent)
            .border(1.dp, ForestGreenPrimary, RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) Color.White else ForestGreenPrimary
        )
    }
}


@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun RadarHeader(
    settings: com.surplusiq.app.domain.model.RadarSettings,
    locationLabel: String?,
    resultCount: Int?,
    onOpenSettings: () -> Unit,
    onReset: () -> Unit
) {
    val active = buildList {
        settings.budgetMax?.let { add("Dưới ${"%,d".format(it)}đ") }
        if (settings.window != com.surplusiq.app.domain.model.RadarWindow.ANY) add(settings.window.label)
        if (settings.prioritizeInTime) add("Nhận kịp")
        if (settings.hideMyAllergens) add("Ẩn dị ứng")
    }
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = androidx.compose.foundation.BorderStroke(1.dp, com.surplusiq.app.ui.theme.DividerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(ForestGreenPrimary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) { Icon(Icons.Default.Tune, contentDescription = null, tint = ForestGreenPrimary) }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text("Radar cứu món", fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                    Text("Xếp theo khả năng bạn nhận được hàng", fontSize = 12.sp, color = TextSecondary)
                }
                OutlinedButton(onClick = onOpenSettings, shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 12.dp)) {
                    Text("Thiết lập", color = ForestGreenPrimary, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(
                text = "Từ: ${locationLabel ?: "chưa chọn vị trí (chưa tính được khoảng cách)"}",
                fontSize = 12.sp,
                color = TextSecondary,
                maxLines = 1,
                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
            )
            if (active.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    active.forEach { ReasonChip(it, selected = true) }
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = resultCount?.let { "$it suất phù hợp" } ?: "Đang tìm suất phù hợp…",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    modifier = Modifier.weight(1f)
                )
                if (settings != com.surplusiq.app.domain.model.RadarSettings()) {
                    TextButton(onClick = onReset) { Text("Đặt lại", color = TextSecondary, fontSize = 12.sp) }
                }
            }
        }
    }
}

@Composable
private fun RadarRankRow(rank: Int, canArriveInTime: Boolean?) {
    Row(Modifier.fillMaxWidth().padding(bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(26.dp).clip(androidx.compose.foundation.shape.CircleShape)
                .background(if (rank <= 3) ForestGreenPrimary else TextMuted),
            contentAlignment = Alignment.Center
        ) { Text("$rank", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp) }
        Spacer(Modifier.width(8.dp))
        Text(
            text = when (canArriveInTime) {
                true -> "Bạn có thể kịp nhận"
                false -> "Có thể không kịp giờ nhận"
                null -> if (rank <= 3) "Phù hợp nhất với bạn" else "Gợi ý"
            },
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (canArriveInTime == false) MaterialTheme.colorScheme.error else TextSecondary
        )
    }
}

@Composable
private fun ReasonChip(text: String, selected: Boolean = false) {
    Text(
        text = text,
        fontSize = 11.sp,
        fontWeight = FontWeight.SemiBold,
        color = if (selected) ForestGreenPrimary else TextSecondary,
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) ForestGreenPrimary.copy(alpha = 0.12f) else com.surplusiq.app.ui.theme.SurfaceSubtle)
            .padding(horizontal = 10.dp, vertical = 4.dp)
    )
}
