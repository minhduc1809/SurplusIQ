package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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

@OptIn(ExperimentalMaterial3Api::class)
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
    onOpenSavedDeals: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var showRadar by remember { mutableStateOf(false) }
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top App Bar
        TopAppBar(
            title = {
                Text(
                    text = "Tất cả deal",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            actions = {
                IconButton(onClick = onOpenSavedDeals) {
                    Icon(Icons.Default.Bookmarks, contentDescription = "Deal đã lưu, đã xem và so sánh")
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        )

        // Rescue Radar (CM-C05): "Gần nhất" (dữ liệu discover) vs "Khả năng nhận cao" (xếp hạng radar)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
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

        if (showRadar) {
            when {
                isRadarLoading -> {
                    Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = ForestGreenPrimary)
                    }
                }
                radarErrorMessage != null -> {
                    Text(
                        text = radarErrorMessage,
                        modifier = Modifier.padding(16.dp),
                        color = MaterialTheme.colorScheme.error
                    )
                }
                radarDeals.isEmpty() -> {
                    Text(
                        text = "Chưa có deal nào xếp hạng theo Rescue Radar.",
                        modifier = Modifier.padding(16.dp),
                        color = TextSecondary
                    )
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        items(radarDeals) { radarDeal ->
                            Column {
                                DealCard(
                                    deal = radarDeal.deal,
                                    onDealClick = onDealClick,
                                    onFavoriteToggle = onFavoriteToggle
                                )
                                radarDeal.rankingReasons.forEach { reason ->
                                    Text(
                                        text = "• $reason",
                                        fontSize = 11.sp,
                                        color = TextMuted,
                                        modifier = Modifier.padding(start = 4.dp, top = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
            return@Column
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Recommendation Banner matching Image 2 Screen 3
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

            // Deal Items List matching Image 2 Screen 3
            items(deals) { deal ->
                DealCard(
                    deal = deal,
                    onDealClick = onDealClick,
                    onFavoriteToggle = onFavoriteToggle
                )
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
