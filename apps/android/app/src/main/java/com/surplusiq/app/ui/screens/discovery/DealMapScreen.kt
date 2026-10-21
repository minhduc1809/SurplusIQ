package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.DefaultMapCenter
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.domain.model.dealCategoryOf
import com.surplusiq.app.ui.components.accent
import com.surplusiq.app.ui.components.icon
import com.surplusiq.app.ui.components.map.OsmMapView
import com.surplusiq.app.ui.components.rememberLocationPermissionRequest
import com.surplusiq.app.ui.theme.DividerColor
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.NavigationUtil

private enum class MapSort(val label: String, val hint: String) {
    NEAREST("Gần nhất", "Sắp xếp theo khoảng cách gần bạn"),
    DEEPEST("Giảm nhiều nhất", "Sắp xếp theo mức giảm cao nhất"),
    RATING("Đánh giá cao", "Sắp xếp theo điểm đánh giá cao nhất")
}

/**
 * K10 Bản đồ deal (R1-021) trên OpenStreetMap. Từ trên xuống: chip nhóm món (kèm số quán), khung bản đồ cố định
 * (chấm "Vị trí của tôi", ghim quán), rồi danh sách quán dạng thẻ chữ nhật có sắp xếp. Chọn một quán thì vùng dưới
 * đổi thành thông tin quán đó (thực đơn, đánh giá, thông tin) qua [storePanel].
 */
@Composable
fun DealMapScreen(
    pins: List<MapPin>,
    location: LocationSettings,
    isLoading: Boolean,
    errorMessage: String?,
    onLoad: () -> Unit,
    onOpenStore: (storeId: String) -> Unit,
    userLocation: Pair<Double, Double>? = null,
    isLocating: Boolean = false,
    locateError: String? = null,
    onLocateMe: () -> Unit = {},
    onLocatePermissionDenied: () -> Unit = {},
    storePanel: (@Composable (pin: MapPin, onClose: () -> Unit) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val requestLocation = rememberLocationPermissionRequest(onGranted = onLocateMe, onDenied = onLocatePermissionDenied)
    val context = LocalContext.current
    var selectedPin by remember { mutableStateOf<MapPin?>(null) }
    var selectedCategory by remember { mutableStateOf<DealCategory?>(null) }
    var sort by remember { mutableStateOf(MapSort.NEAREST) }

    // Số quán theo từng nhóm món (quán tính vào nhóm nếu có ít nhất một suất thuộc nhóm đó)
    val countByCategory = remember(pins) {
        DealCategory.values().associateWith { c -> pins.count { p -> p.categories.any { dealCategoryOf(it) == c } } }
    }
    val shownPins = remember(pins, selectedCategory) {
        selectedCategory?.let { c -> pins.filter { p -> p.categories.any { dealCategoryOf(it) == c } } } ?: pins
    }
    val sortedPins = remember(shownPins, sort) {
        when (sort) {
            MapSort.NEAREST -> shownPins.sortedBy { it.distanceMeters ?: Double.MAX_VALUE }
            MapSort.DEEPEST -> shownPins.sortedByDescending { it.maxDiscountPercent }
            MapSort.RATING -> shownPins.sortedByDescending { it.ratingAvg ?: -1.0 }
        }
    }

    val focus = selectedPin
    val centerLat = focus?.latitude ?: location.latitude ?: pins.firstOrNull()?.latitude ?: DefaultMapCenter.LATITUDE
    val centerLng = focus?.longitude ?: location.longitude ?: pins.firstOrNull()?.longitude ?: DefaultMapCenter.LONGITUDE

    // Mở bản đồ là định vị luôn để hiện chấm vị trí của tôi
    LaunchedEffect(Unit) { if (userLocation == null) requestLocation() }

    // Tải lại ghim khi vị trí hoặc bán kính đổi (vd. vừa bấm định vị)
    LaunchedEffect(location.latitude, location.longitude, location.radiusKm) { onLoad() }

    Column(modifier.fillMaxSize()) {
        // ---- Bộ lọc nhóm món nằm trên bản đồ ----
        Row(
            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            MapCategoryChip("Tất cả", Icons.Default.Apps, ForestGreenPrimary, pins.size, selectedCategory == null) { selectedCategory = null }
            DealCategory.values().filter { (countByCategory[it] ?: 0) > 0 || it == selectedCategory }.forEach { c ->
                MapCategoryChip(c.label, c.icon(), c.accent(), countByCategory[c] ?: 0, selectedCategory == c) {
                    selectedCategory = if (selectedCategory == c) null else c
                }
            }
        }

        // ---- Khung bản đồ cố định ----
        Box(
            Modifier
                .weight(if (focus != null) 0.30f else 0.38f)
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .clip(RoundedCornerShape(20.dp))
        ) {
            OsmMapView(
                centerLatitude = centerLat,
                centerLongitude = centerLng,
                zoomLevel = if (focus != null) 16.0 else 15.5,
                radiusKm = if (location.hasCoordinates) location.radiusKm else null,
                pins = shownPins,
                selectedStoreId = focus?.storeId,
                userLocation = userLocation,
                showZoomButtons = true,
                onPinClick = { pin -> selectedPin = pin },
                modifier = Modifier.fillMaxSize()
            )
            when {
                isLoading -> LinearProgressIndicator(Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(8.dp), color = ForestGreenPrimary)
                locateError != null -> MapBanner(locateError, Modifier.align(Alignment.TopCenter))
                errorMessage != null -> MapBanner(errorMessage, Modifier.align(Alignment.TopCenter), actionLabel = "Thử lại", onAction = onLoad)
            }
            SmallFloatingActionButton(
                onClick = requestLocation,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = ForestGreenDark,
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 12.dp, bottom = 112.dp)
            ) {
                if (isLocating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = ForestGreenPrimary)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = "Định vị vị trí của tôi")
                }
            }
        }

        // ---- Vùng dưới: danh sách quán hoặc thông tin quán đang chọn ----
        Box(Modifier.weight(if (focus != null) 0.70f else 0.62f).fillMaxWidth()) {
            if (focus != null && storePanel != null) {
                storePanel(focus) { selectedPin = null }
            } else {
                Column(Modifier.fillMaxSize()) {
                    StoreListHeader(count = sortedPins.size, bestDiscount = shownPins.maxOfOrNull { it.maxDiscountPercent } ?: 0, hint = sort.hint)
                    Row(
                        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        MapSort.values().forEach { m -> SortChip(m.label, sort == m) { sort = m } }
                    }
                    if (sortedPins.isEmpty()) {
                        Text(
                            if (selectedCategory != null) "Không có quán nào bán nhóm \"${selectedCategory?.label}\" trong khu vực này."
                            else "Chưa có cửa hàng nào có deal đang mở trong bán kính này.",
                            fontSize = 13.sp,
                            color = TextSecondary,
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                    LazyColumn(
                        Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 12.dp, end = 12.dp, top = 6.dp, bottom = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(sortedPins, key = { it.storeId }) { pin ->
                            StoreCard(
                                pin = pin,
                                onVisit = { if (storePanel != null) selectedPin = pin else onOpenStore(pin.storeId) },
                                onDirections = { NavigationUtil.openMapOrCopyAddress(context, pin.storeAddress, pin.storeName, pin.latitude, pin.longitude) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StoreListHeader(count: Int, bestDiscount: Int, hint: String) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Quán gần bạn ($count)", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
            if (bestDiscount > 0) {
                Spacer(Modifier.width(8.dp))
                Text(
                    "Tiết kiệm đến $bestDiscount%",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MintDeep,
                    modifier = Modifier.clip(RoundedCornerShape(50)).background(MintDeep.copy(alpha = 0.12f)).padding(horizontal = 10.dp, vertical = 3.dp)
                )
            }
        }
        Text(hint, fontSize = 12.sp, color = TextSecondary)
    }
}

/**
 * Thẻ quán: ảnh (có nhãn số suất), tên quán, đánh giá · khoảng cách · giờ đóng nhận, khoảng giá của các suất đang mở,
 * và hai nút Chỉ đường, Ghé thăm.
 */
@Composable
private fun StoreCard(pin: MapPin, onVisit: () -> Unit, onDirections: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onVisit)
    ) {
      Column {
        Row(Modifier.padding(10.dp), verticalAlignment = Alignment.Top) {
            Box(Modifier.size(86.dp).clip(RoundedCornerShape(14.dp)).background(ForestGreenPrimary.copy(alpha = 0.10f)), contentAlignment = Alignment.Center) {
                val image = pin.imageUrl?.takeIf { it.isNotBlank() } ?: pin.logoUrl?.takeIf { it.isNotBlank() }
                if (image != null) {
                    AsyncImage(model = image, contentDescription = pin.storeName, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                } else {
                    Text(pin.storeName.trim().take(1).uppercase().ifEmpty { "?" }, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = ForestGreenDark)
                }
                Text(
                    "${pin.activeDealsCount} suất",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(50))
                        .background(if (pin.activeDealsCount <= 2) Color(0xFFE5534B) else MintDeep)
                        .padding(horizontal = 7.dp, vertical = 2.dp)
                )
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(pin.storeName, fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.height(3.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (pin.ratingAvg != null && pin.ratingCount > 0) {
                        Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFFF5A524), modifier = Modifier.size(14.dp))
                        Text(" ${"%.1f".format(pin.ratingAvg)} (${pin.ratingCount} đánh giá)", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    } else {
                        Text("Chưa có đánh giá", fontSize = 12.sp, color = TextMuted)
                    }
                }
                Text(
                    listOfNotNull(pin.distanceText?.let { "Cách $it" }, pin.pickupUntil?.let { "Nhận trước $it" }).joinToString("  •  "),
                    fontSize = 12.sp,
                    color = TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(4.dp))
                Text(priceRange(pin), fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenPrimary)
                if (pin.maxDiscountPercent > 0) {
                    Text("Giảm đến ${pin.maxDiscountPercent}%", fontSize = 11.sp, color = TextSecondary)
                }
            }
        }
        // Hai nút nằm dưới, tách khỏi phần thông tin để không bị bóp trên màn hẹp
        Row(Modifier.padding(start = 10.dp, end = 10.dp, bottom = 10.dp).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(
                onClick = onDirections,
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 8.dp),
                modifier = Modifier.weight(1f).height(38.dp)
            ) {
                Icon(Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(4.dp))
                Text("Chỉ đường", fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            }
            Button(
                onClick = onVisit,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                contentPadding = PaddingValues(horizontal = 8.dp),
                modifier = Modifier.weight(1f).height(38.dp)
            ) { Text("Ghé thăm", fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1) }
        }
      }
    }
}

/** "15.000đ – 28.000đ" (giá các suất đang mở); chỉ một mức giá thì hiện "Từ"/giá đơn. */
private fun priceRange(pin: MapPin): String {
    val min = pin.minPrice ?: return "Chưa có giá"
    val max = pin.maxPrice
    fun f(v: Int) = "${String.format("%,d", v)}đ"
    return if (max != null && max > min) "${f(min)} – ${f(max)}" else f(min)
}

@Composable
private fun SortChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        color = if (selected) ForestGreenPrimary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) ForestGreenPrimary else DividerColor)
    ) {
        Text(
            label,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) ForestGreenPrimary else TextPrimary,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp)
        )
    }
}

@Composable
private fun MapCategoryChip(label: String, icon: ImageVector, accent: Color, count: Int, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        color = if (selected) accent else MaterialTheme.colorScheme.surface,
        border = if (selected) null else androidx.compose.foundation.BorderStroke(1.dp, DividerColor)
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.White else accent, modifier = Modifier.size(17.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else TextPrimary)
            Spacer(Modifier.width(6.dp))
            Text(
                "$count",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = if (selected) Color.White else TextSecondary,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (selected) Color.White.copy(alpha = 0.25f) else DividerColor.copy(alpha = 0.6f))
                    .padding(horizontal = 7.dp, vertical = 1.dp)
            )
        }
    }
}

@Composable
private fun MapBanner(message: String, modifier: Modifier = Modifier, actionLabel: String? = null, onAction: () -> Unit = {}) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = modifier.fillMaxWidth().padding(8.dp)
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(message, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f))
            if (actionLabel != null) TextButton(onClick = onAction) { Text(actionLabel, color = ForestGreenPrimary) }
        }
    }
}
