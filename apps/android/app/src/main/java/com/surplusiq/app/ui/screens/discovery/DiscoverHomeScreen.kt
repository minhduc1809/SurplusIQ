package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Sparkles
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
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverHomeScreen(
    deals: List<Deal>,
    onDealClick: (Deal) -> Unit,
    onFavoriteToggle: (Deal) -> Unit,
    onOpenPreferences: () -> Unit,
    onOpenAiChat: () -> Unit,
    onSeeAllClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var currentRadiusKm by remember { mutableStateOf(2) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Top Location Header Bar (matching Image 3 Too Good To Go)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .clickable { currentRadiusKm = if (currentRadiusKm == 2) 5 else 2 }
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Location",
                    tint = ForestGreenPrimary,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Quận 1, TP. Hồ Chí Minh",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = TextPrimary
                        )
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowDown,
                            contentDescription = "Expand",
                            tint = TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = "trong bán kính $currentRadiusKm km",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }

            // Quick AI Assistant action button
            IconButton(
                onClick = onOpenAiChat,
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(ForestGreenPrimary.copy(alpha = 0.1f))
            ) {
                Icon(
                    imageVector = Icons.Default.Sparkles,
                    contentDescription = "AI Cứu Món",
                    tint = ForestGreenPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        // Search & Filter Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.CenterStart
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = TextMuted,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (searchQuery.isEmpty()) "Search" else searchQuery,
                        fontSize = 14.sp,
                        color = if (searchQuery.isEmpty()) TextMuted else TextPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            // Filter button leading to Preferences
            IconButton(
                onClick = onOpenPreferences,
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface)
            ) {
                Icon(
                    imageVector = Icons.Default.Tune,
                    contentDescription = "Preferences",
                    tint = TextPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Main Content List
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            // Section 1: Recommended for you (Carousel)
            item {
                SectionHeader(
                    title = "Recommended for you",
                    onSeeAllClick = onSeeAllClick
                )
            }

            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(deals) { deal ->
                        DealCard(
                            deal = deal,
                            onDealClick = onDealClick,
                            onFavoriteToggle = onFavoriteToggle,
                            modifier = Modifier.width(280.dp)
                        )
                    }
                }
            }

            // Section 2: Save before it's too late
            item {
                Spacer(modifier = Modifier.height(20.dp))
                SectionHeader(
                    title = "Save before it's too late",
                    onSeeAllClick = onSeeAllClick
                )
            }

            item {
                val urgentDeals = deals.filter { it.isUrgent }.ifEmpty { deals }
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(urgentDeals) { deal ->
                        DealCard(
                            deal = deal,
                            onDealClick = onDealClick,
                            onFavoriteToggle = onFavoriteToggle,
                            modifier = Modifier.width(280.dp)
                        )
                    }
                }
            }

            // Section 3: New Magic Bags
            item {
                Spacer(modifier = Modifier.height(20.dp))
                SectionHeader(
                    title = "New Magic Bags",
                    onSeeAllClick = onSeeAllClick
                )
            }

            item {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(deals.reversed()) { deal ->
                        DealCard(
                            deal = deal,
                            onDealClick = onDealClick,
                            onFavoriteToggle = onFavoriteToggle,
                            modifier = Modifier.width(280.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SectionHeader(
    title: String,
    onSeeAllClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = TextPrimary
        )
        Text(
            text = "See all >",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = ForestGreenPrimary,
            modifier = Modifier.clickable { onSeeAllClick() }
        )
    }
}
