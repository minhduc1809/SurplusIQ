package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.BakeryDining
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LocalGroceryStore
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.R
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.ui.components.DealCard
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.formatRadius
import com.surplusiq.app.ui.screens.notifications.NotificationBellIcon
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.SkyBlueContainer
import com.surplusiq.app.ui.theme.SkyBlueLight
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
    onSeeAllClick: () -> Unit,
    onSeeAllForYou: () -> Unit = onSeeAllClick,
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
    userLocation: Pair<Double, Double>? = null,
    isLocating: Boolean = false,
    locateError: String? = null,
    onLocateMe: () -> Unit = {},
    onLocatePermissionDenied: () -> Unit = {},
    onOpenStore: (storeId: String) -> Unit = {},
    isLoading: Boolean = false,
    errorMessage: String? = null,
    onRetry: () -> Unit = {},
    onOpenSearch: () -> Unit = {},
    currentSortBy: String? = null,
    currentMinDiscount: Int? = null,
    onApplyFilterSort: (sortBy: String?, minDiscount: Int?) -> Unit = { _, _ -> },
    onResetFilterSort: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var searchQuery by remember { mutableStateOf("") }
    var isMapView by remember { mutableStateOf(false) }
    var showFilterSortSheet by remember { mutableStateOf(false) }
    var category by remember { mutableStateOf<DealCategory?>(null) }
    val shown = remember(deals, searchQuery, category) {
        val q = searchQuery.trim()
        deals.filter { d ->
            (category == null || d.category == category) &&
                (q.isEmpty() || d.title.contains(q, ignoreCase = true) || d.storeName.contains(q, ignoreCase = true))
        }
    }
    // Số quán đang mở và mức giảm cao nhất lấy từ chính danh sách suất đang hiển thị
    val openStores = remember(deals) { deals.map { it.storeId }.distinct().size }
    val maxDiscount = remember(deals) { deals.maxOfOrNull { it.discountPercent } ?: 0 }
    val urgentDeals = remember(shown) { shown.filter { it.isUrgent } }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Hàng 1: logo + tên màn, chuông, avatar
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(R.drawable.logo_surplusiq_icon),
                contentDescription = "SurplusIQ",
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(38.dp)
            )
            Spacer(Modifier.width(8.dp))
            Column(Modifier.weight(1f)) {
                Text("SURPLUSIQ", fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark, letterSpacing = 0.8.sp)
                Text("Khám Phá", fontSize = 12.sp, color = TextSecondary)
            }
            NotificationBellIcon(unreadCount = unreadNotificationCount, onClick = onOpenNotifications)
            Spacer(Modifier.width(6.dp))
            Box(
                modifier = Modifier.size(38.dp).clip(CircleShape).background(ForestGreenPrimary).clickable(onClick = onOpenProfile),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = userName.trim().substringAfterLast(" ").take(1).ifEmpty { "?" }.uppercase(),
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }

        // Hàng 2: vị trí + bán kính + số quán đang mở
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .clip(RoundedCornerShape(16.dp))
                .clickable(onClick = onOpenLocation)
                .padding(vertical = 4.dp)
        ) {
            Box(Modifier.size(34.dp).clip(CircleShape).background(SkyBlueContainer), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.LocationOn, contentDescription = "Vị trí", tint = ForestGreenPrimary, modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = location.label ?: if (location.hasCoordinates) "Vị trí đã chọn" else "Chọn vị trí của bạn",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false)
                    )
                    Icon(Icons.Default.KeyboardArrowDown, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(18.dp))
                }
                Text(
                    text = if (location.hasCoordinates) "Bán kính ${formatRadius(location.radiusKm)} • $openStores quán đang mở" else "Đang hiển thị mọi khu vực • $openStores quán đang mở",
                    fontSize = 11.sp,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
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

        // Tìm kiếm + bản đồ + bộ lọc
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .height(52.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, DividerColor, RoundedCornerShape(18.dp))
                    .clickable { onOpenSearch() }
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Search, contentDescription = "Tìm kiếm", tint = ForestGreenPrimary, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                BasicTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    textStyle = TextStyle(fontSize = 14.sp, color = TextPrimary),
                    cursorBrush = SolidColor(ForestGreenPrimary),
                    modifier = Modifier.weight(1f),
                    decorationBox = { inner ->
                        if (searchQuery.isEmpty()) Text("Tìm món ngon, tiệm bánh...", fontSize = 14.sp, color = TextMuted)
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

            Spacer(Modifier.width(10.dp))

            IconButton(
                onClick = { isMapView = !isMapView },
                modifier = Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .border(1.dp, DividerColor, RoundedCornerShape(16.dp))
            ) {
                Icon(
                    imageVector = if (isMapView) Icons.AutoMirrored.Filled.ViewList else Icons.Default.Map,
                    contentDescription = if (isMapView) "Chuyển sang danh sách" else "Chuyển sang bản đồ",
                    tint = ForestGreenDark,
                    modifier = Modifier.size(22.dp)
                )
            }

            Spacer(Modifier.width(8.dp))

            IconButton(
                onClick = { showFilterSortSheet = true },
                modifier = Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (currentSortBy != null || currentMinDiscount != null) ForestGreenDark else ForestGreenPrimary)
            ) {
                Icon(Icons.Default.Tune, contentDescription = "Bộ lọc & Sắp xếp", tint = Color.White, modifier = Modifier.size(22.dp))
            }
        }

        if (showFilterSortSheet) {
            FilterSortBottomSheet(
                currentSortBy = currentSortBy,
                currentMinDiscount = currentMinDiscount,
                onDismissRequest = { showFilterSortSheet = false },
                onApply = { sortBy, minDiscount ->
                    onApplyFilterSort(sortBy, minDiscount)
                    showFilterSortSheet = false
                },
                onReset = {
                    onResetFilterSort()
                    showFilterSortSheet = false
                }
            )
        }

        if (isMapView) {
            DealMapScreen(
                pins = mapPins,
                location = location,
                isLoading = isMapLoading,
                errorMessage = mapErrorMessage,
                onLoad = onLoadMap,
                onOpenStore = onOpenStore,
                userLocation = userLocation,
                isLocating = isLocating,
                locateError = locateError,
                onLocateMe = onLocateMe,
                onLocatePermissionDenied = onLocatePermissionDenied,
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
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    item {
                        Column {
                            Text(
                                text = buildAnnotatedString {
                                    append("Hôm nay bạn muốn ")
                                    withStyle(SpanStyle(color = ForestGreenPrimary)) { append("cứu món gì") }
                                    append("?")
                                },
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = TextPrimary
                            )
                            if (maxDiscount > 0) {
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    "Tiết kiệm tới $maxDiscount% ngân sách và chung tay giảm lãng phí thực phẩm.",
                                    fontSize = 13.sp,
                                    color = TextSecondary,
                                    lineHeight = 18.sp
                                )
                            }
                        }
                    }
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            item { CategoryTile("Tất cả", Icons.Default.Apps, category == null) { category = null } }
                            items(DealCategory.values().toList()) { c ->
                                CategoryTile(c.shortName(), c.icon(), category == c) { category = if (category == c) null else c }
                            }
                        }
                    }
                    if (urgentDeals.isNotEmpty()) item {
                        GoldenHourBanner(
                            count = urgentDeals.size,
                            maxDiscount = urgentDeals.maxOf { it.discountPercent },
                            onClick = onSeeAllClick
                        )
                    }
                    if (shown.isEmpty()) item {
                        Text("Không có suất nào khớp bộ lọc.", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(vertical = 24.dp))
                    }
                    if (shown.isNotEmpty()) item {
                        SectionHeader(
                            title = "Dành cho bạn",
                            subtitle = "Suất cứu món nóng hổi gần vị trí của bạn nhất",
                            onSeeAllClick = onSeeAllForYou
                        )
                    }
                    items(shown, key = { it.id }) { deal ->
                        DealCard(deal = deal, onDealClick = onDealClick, onFavoriteToggle = onFavoriteToggle)
                    }
                }
            }
        }
    }
}

/** Dải nhắc các suất sắp hết giờ nhận (số liệu lấy từ danh sách đang hiển thị). */
@Composable
private fun GoldenHourBanner(count: Int, maxDiscount: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(Brush.horizontalGradient(listOf(SkyBlueLight, ForestGreenPrimary)))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(Modifier.size(42.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.25f)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Bolt, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text("GIỜ VÀNG CỨU MÓN", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Color.White.copy(alpha = 0.9f), letterSpacing = 0.8.sp)
            Text(
                "$count suất sắp hết giờ nhận" + if (maxDiscount > 0) ", giảm tới $maxDiscount%" else "",
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                lineHeight = 20.sp
            )
        }
        Text("Xem  ›", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.White)
    }
}

@Composable
fun SectionHeader(
    title: String,
    onSeeAllClick: () -> Unit,
    subtitle: String? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Column(Modifier.weight(1f)) {
            Text(text = title, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            if (subtitle != null) Text(text = subtitle, fontSize = 12.sp, color = TextSecondary, lineHeight = 16.sp)
        }
        Text(
            text = "Xem tất cả  ›",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = ForestGreenDark,
            modifier = Modifier.clickable { onSeeAllClick() }.padding(start = 12.dp, top = 2.dp, bottom = 8.dp)
        )
    }
}

private fun DealCategory.shortName() = when (this) {
    DealCategory.MEALS -> "Món chính"
    DealCategory.BAKED_GOODS -> "Bánh & Đồ ngọt"
    DealCategory.GROCERIES -> "Nông sản"
    DealCategory.OTHER -> "Khác"
}

private fun DealCategory.icon() = when (this) {
    DealCategory.MEALS -> Icons.Default.Restaurant
    DealCategory.BAKED_GOODS -> Icons.Default.BakeryDining
    DealCategory.GROCERIES -> Icons.Default.LocalGroceryStore
    DealCategory.OTHER -> Icons.Default.Category
}

/** Ô danh mục bo vuông: chọn thì nền cam, chữ trắng. */
@Composable
private fun CategoryTile(label: String, icon: ImageVector, selected: Boolean, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(76.dp).clip(RoundedCornerShape(18.dp)).clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .size(60.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(if (selected) ForestGreenPrimary else MaterialTheme.colorScheme.surface)
                .border(1.dp, if (selected) ForestGreenPrimary else DividerColor, RoundedCornerShape(18.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.White else ForestGreenDark, modifier = Modifier.size(26.dp))
        }
        Spacer(Modifier.height(6.dp))
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            color = TextPrimary,
            maxLines = 2,
            lineHeight = 14.sp,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
    }
}
