package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.BakeryDining
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.LocalGroceryStore
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.SkyBlueContainer
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
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.ui.components.formatRadius
import com.surplusiq.app.ui.components.LoadStateContent
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.ui.text.style.TextOverflow
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.screens.notifications.NotificationBellIcon
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary

import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.ViewList

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverHomeScreen(
    deals: List<Deal>,
    onDealClick: (Deal) -> Unit,
    onFavoriteToggle: (Deal) -> Unit,
    onOpenPreferences: () -> Unit,
    onSeeAllClick: () -> Unit,
    userName: String = "",
    onOpenProfile: () -> Unit = {},
    unreadNotificationCount: Int = 0,
    onOpenNotifications: () -> Unit = {},
    // K06/K08: vị trí khám phá đang dùng
    location: LocationSettings = LocationSettings(),
    onOpenLocation: () -> Unit = {},
    onClearTemporaryLocation: () -> Unit = {},
    // K10: bản đồ deal
    mapPins: List<MapPin> = emptyList(),
    isMapLoading: Boolean = false,
    mapErrorMessage: String? = null,
    onLoadMap: () -> Unit = {},
    onOpenStore: (storeId: String) -> Unit = {},
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onRetry: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var isMapView by remember { mutableStateOf(false) }
    var category by remember { mutableStateOf<DealCategory?>(null) }
    val shown = remember(deals, searchQuery, category) {
        val q = searchQuery.trim()
        deals.filter { d ->
            (category == null || d.category == category) &&
                (q.isEmpty() || d.title.contains(q, ignoreCase = true) || d.storeName.contains(q, ignoreCase = true))
        }
    }
    // Thẻ chiếm ~78% bề rộng để thẻ kế tiếp hé ra, báo hiệu cuộn ngang
    val cardWidth = (LocalConfiguration.current.screenWidthDp * 0.78f).dp.coerceIn(240.dp, 320.dp)

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Header gọn một hàng: avatar | vị trí + bán kính | chuông (tên người dùng xem ở tab Tôi)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(ForestGreenPrimary.copy(alpha = 0.15f))
                    .clickable(onClick = onOpenProfile),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = userName.trim().substringAfterLast(" ").take(1).ifEmpty { "?" }.uppercase(),
                    fontWeight = FontWeight.Bold,
                    color = ForestGreenPrimary
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp))
                    .clickable(onClick = onOpenLocation)
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = "Vị trí",
                    tint = ForestGreenPrimary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = location.label ?: if (location.hasCoordinates) "Vị trí đã chọn" else "Chọn vị trí của bạn",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = TextPrimary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f, fill = false)
                        )
                        Icon(
                            imageVector = Icons.Default.KeyboardArrowDown,
                            contentDescription = null,
                            tint = TextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Text(
                        text = if (location.hasCoordinates) "trong bán kính ${formatRadius(location.radiusKm)}" else "đang hiển thị mọi khu vực",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }
            NotificationBellIcon(
                unreadCount = unreadNotificationCount,
                onClick = onOpenNotifications
            )
        }

        // K08: đang xem deal ở vị trí ghim tạm
        if (location.isTemporary) {
            AssistChip(
                onClick = onClearTemporaryLocation,
                label = { Text("Đang xem ở vị trí khác", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.PushPin, contentDescription = null, modifier = Modifier.size(16.dp)) },
                trailingIcon = { Icon(Icons.Default.Close, contentDescription = "Quay về vị trí đã lưu", modifier = Modifier.size(16.dp)) },
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        // Search & Filter Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .clip(RoundedCornerShape(26.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, DividerColor, RoundedCornerShape(26.dp))
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Search, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                BasicTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    textStyle = TextStyle(fontSize = 14.sp, color = TextPrimary),
                    cursorBrush = SolidColor(ForestGreenPrimary),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (searchQuery.isEmpty()) Text("Tìm món, cửa hàng...", fontSize = 14.sp, color = TextMuted)
                        inner()
                    }
                )
                if (searchQuery.isNotEmpty()) {
                    Icon(
                        Icons.Default.Close, contentDescription = "Xóa tìm kiếm", tint = TextMuted,
                        modifier = Modifier.size(18.dp).clickable { searchQuery = "" }
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

                IconButton(
                    onClick = { isMapView = !isMapView },
                    modifier = Modifier
                        .size(52.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surface)
                        .border(1.dp, DividerColor, CircleShape)
                ) {
                    Icon(
                        imageVector = if (isMapView) Icons.Default.ViewList else Icons.Default.Map,
                        contentDescription = if (isMapView) "Chuyển sang danh sách" else "Chuyển sang bản đồ",
                        tint = ForestGreenPrimary,
                        modifier = Modifier.size(20.dp)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

            Spacer(modifier = Modifier.width(8.dp))

            // Filter button leading to Preferences
            IconButton(
                onClick = onOpenPreferences,
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(ForestGreenPrimary)
            ) {
                Icon(
                    imageVector = Icons.Default.Tune,
                    contentDescription = "Preferences",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (isMapView) {
            // Interactive Map View of Nearby Deals (R1-021)
            DealMapScreen(
                pins = mapPins,
                location = location,
                isLoading = isMapLoading,
                errorMessage = mapErrorMessage,
                onLoad = onLoadMap,
                onOpenStore = onOpenStore,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            LoadStateContent(
                isLoading = isLoading,
                errorMessage = errorMessage,
                isEmpty = deals.isEmpty(),
                emptyIcon = Icons.Default.LocationOn,
                emptyTitle = "Chưa có deal quanh đây",
                emptyMessage = if (location.hasCoordinates) "Thử tăng bán kính hoặc chọn vị trí khác." else "Hiện chưa có suất cứu món nào đang mở bán.",
                onRetry = onRetry
            ) {
            // Main Content List (Carousels)
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 96.dp)
            ) {
                item {
                    Text(
                        text = buildAnnotatedString {
                            append("Hôm nay bạn muốn ")
                            withStyle(SpanStyle(color = ForestGreenPrimary)) { append("cứu món gì") }
                            append("?")
                        },
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                    )
                }
                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        item { CategoryCircle("Tất cả", Icons.Default.Apps, category == null) { category = null } }
                        items(DealCategory.values().toList()) { c ->
                            CategoryCircle(c.shortName(), c.icon(), category == c) { category = if (category == c) null else c }
                        }
                    }
                }
                if (shown.isEmpty()) item {
                    Text(
                        "Không có suất nào khớp bộ lọc.",
                        fontSize = 14.sp, color = TextSecondary,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 24.dp)
                    )
                }
                // Section 1: Recommended for you (Carousel)
                if (shown.isNotEmpty()) item {
                    SectionHeader(
                        title = "Dành cho bạn",
                        onSeeAllClick = onSeeAllClick
                    )
                }

                item {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(shown) { deal ->
                            DealCard(
                                deal = deal,
                                onDealClick = onDealClick,
                                onFavoriteToggle = onFavoriteToggle,
                                modifier = Modifier.width(cardWidth)
                            )
                        }
                    }
                }

                // Section 2: Save before it's too late
                if (shown.any { it.isUrgent }) item {
                    Spacer(modifier = Modifier.height(16.dp))
                    SectionHeader(
                        title = "Sắp hết giờ nhận",
                        onSeeAllClick = onSeeAllClick
                    )
                }

                if (shown.any { it.isUrgent }) item {
                    val urgentDeals = shown.filter { it.isUrgent }
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        items(urgentDeals) { deal ->
                            DealCard(
                                deal = deal,
                                onDealClick = onDealClick,
                                onFavoriteToggle = onFavoriteToggle,
                                modifier = Modifier.width(cardWidth)
                            )
                        }
                    }
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
            text = "Xem tất cả",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = ForestGreenPrimary,
            modifier = Modifier.clickable { onSeeAllClick() }.padding(vertical = 8.dp)
        )
    }
}

private fun DealCategory.shortName() = when (this) {
    DealCategory.MEALS -> "Món chính"
    DealCategory.BAKED_GOODS -> "Bánh"
    DealCategory.GROCERIES -> "Nông sản"
    DealCategory.OTHER -> "Khác"
}

private fun DealCategory.icon() = when (this) {
    DealCategory.MEALS -> Icons.Default.Restaurant
    DealCategory.BAKED_GOODS -> Icons.Default.BakeryDining
    DealCategory.GROCERIES -> Icons.Default.LocalGroceryStore
    DealCategory.OTHER -> Icons.Default.Category
}

@Composable
private fun CategoryCircle(label: String, icon: ImageVector, selected: Boolean, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(68.dp).clip(RoundedCornerShape(16.dp)).clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .clip(CircleShape)
                .background(if (selected) ForestGreenPrimary else SkyBlueContainer)
                .border(1.dp, if (selected) ForestGreenPrimary else DividerColor, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.White else ForestGreenDark, modifier = Modifier.size(26.dp))
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(label, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium, color = TextPrimary, maxLines = 1)
    }
}
