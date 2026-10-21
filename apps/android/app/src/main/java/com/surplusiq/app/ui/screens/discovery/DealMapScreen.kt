package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Apps
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.MyLocation
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
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.NavigationUtil

/**
 * K10 Bản đồ deal (R1-021) trên OpenStreetMap. Bố cục chia hai vùng: khung bản đồ cố định ở trên (chip nhóm món,
 * chấm "Vị trí của tôi", ghim quán) và vùng bên dưới là danh sách quán gần bạn; chọn một quán thì vùng dưới
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
    // Lọc theo nhóm món ngay trên danh sách ghim đã tải (quán hiện nếu có ít nhất một suất thuộc nhóm đó)
    val shownPins = remember(pins, selectedCategory) {
        selectedCategory?.let { c -> pins.filter { p -> p.categories.any { dealCategoryOf(it) == c } } } ?: pins
    }

    val focus = selectedPin
    val centerLat = focus?.latitude ?: location.latitude ?: pins.firstOrNull()?.latitude ?: DefaultMapCenter.LATITUDE
    val centerLng = focus?.longitude ?: location.longitude ?: pins.firstOrNull()?.longitude ?: DefaultMapCenter.LONGITUDE

    // Mở bản đồ là định vị luôn để hiện chấm vị trí của tôi
    LaunchedEffect(Unit) { if (userLocation == null) requestLocation() }

    // Tải lại ghim khi vị trí hoặc bán kính đổi (vd. vừa bấm định vị)
    LaunchedEffect(location.latitude, location.longitude, location.radiusKm) { onLoad() }

    Column(modifier.fillMaxSize()) {
        // ---- Khung bản đồ cố định ----
        Box(
            Modifier
                .weight(if (focus != null) 0.34f else 0.42f)
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .clip(RoundedCornerShape(22.dp))
        ) {
            OsmMapView(
                centerLatitude = centerLat,
                centerLongitude = centerLng,
                zoomLevel = if (focus != null) 16.0 else 15.5,
                radiusKm = if (location.hasCoordinates) location.radiusKm else null,
                pins = shownPins,
                selectedStoreId = focus?.storeId,
                userLocation = userLocation,
                showZoomButtons = false,
                onPinClick = { pin -> selectedPin = pin },
                modifier = Modifier.fillMaxSize()
            )

            Column(Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(top = 8.dp)) {
                Row(
                    Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    MapCategoryChip("Tất cả", Icons.Default.Apps, ForestGreenPrimary, selectedCategory == null) { selectedCategory = null }
                    DealCategory.values().forEach { c ->
                        MapCategoryChip(c.label, c.icon(), c.accent(), selectedCategory == c) {
                            selectedCategory = if (selectedCategory == c) null else c
                        }
                    }
                }
                when {
                    isLoading -> LinearProgressIndicator(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp), color = ForestGreenPrimary)
                    locateError != null -> MapBanner(locateError)
                    errorMessage != null -> MapBanner(errorMessage, actionLabel = "Thử lại", onAction = onLoad)
                }
            }

            SmallFloatingActionButton(
                onClick = requestLocation,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = ForestGreenDark,
                modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp)
            ) {
                if (isLocating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = ForestGreenPrimary)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = "Định vị vị trí của tôi")
                }
            }
        }

        // ---- Vùng dưới: danh sách quán hoặc thông tin quán đang chọn ----
        Box(Modifier.weight(if (focus != null) 0.66f else 0.58f).fillMaxWidth()) {
            if (focus != null && storePanel != null) {
                storePanel(focus) { selectedPin = null }
            } else {
                StoreList(
                    pins = shownPins,
                    hasFilter = selectedCategory != null,
                    categoryLabel = selectedCategory?.label,
                    onSelect = { pin -> if (storePanel != null) selectedPin = pin else onOpenStore(pin.storeId) },
                    onDirections = { p -> NavigationUtil.openMapOrCopyAddress(context, p.storeAddress, p.storeName, p.latitude, p.longitude) }
                )
            }
        }
    }
}

/** Danh sách quán trong bán kính, gần nhất trước; mỗi dòng có nút Chỉ đường, chạm dòng để xem quán. */
@Composable
private fun StoreList(
    pins: List<MapPin>,
    hasFilter: Boolean,
    categoryLabel: String?,
    onSelect: (MapPin) -> Unit,
    onDirections: (MapPin) -> Unit
) {
    val sorted = remember(pins) { pins.sortedBy { it.distanceMeters ?: Double.MAX_VALUE } }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "Quán gần bạn (${sorted.size})",
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = TextPrimary,
                modifier = Modifier.weight(1f)
            )
        }
        if (sorted.isEmpty()) {
            Text(
                if (hasFilter) "Không có quán nào bán nhóm \"$categoryLabel\" trong khu vực này." else "Chưa có cửa hàng nào có deal đang mở trong bán kính này.",
                fontSize = 13.sp,
                color = TextSecondary,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 24.dp)) {
            items(sorted, key = { it.storeId }) { pin ->
                StoreRow(pin, onClick = { onSelect(pin) }, onDirections = { onDirections(pin) })
            }
        }
    }
}

@Composable
private fun StoreRow(pin: MapPin, onClick: () -> Unit, onDirections: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(horizontal = 4.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier.size(46.dp).clip(CircleShape).background(ForestGreenPrimary.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            if (!pin.logoUrl.isNullOrBlank()) {
                AsyncImage(model = pin.logoUrl, contentDescription = pin.storeName, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            } else {
                Text(pin.storeName.trim().take(1).uppercase().ifEmpty { "?" }, fontWeight = FontWeight.Bold, color = ForestGreenDark)
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(pin.storeName, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                listOfNotNull(
                    "${pin.activeDealsCount} suất",
                    pin.minPrice?.let { "từ ${String.format("%,d", it)}₫" },
                    pin.distanceText
                ).joinToString(" · "),
                fontSize = 12.sp,
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Spacer(Modifier.width(8.dp))
        OutlinedButton(
            onClick = onDirections,
            shape = RoundedCornerShape(12.dp),
            contentPadding = PaddingValues(horizontal = 12.dp),
            modifier = Modifier.height(36.dp)
        ) {
            Icon(Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(15.dp))
            Spacer(Modifier.width(4.dp))
            Text("Chỉ đường", fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun MapCategoryChip(label: String, icon: ImageVector, accent: Color, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        color = if (selected) accent else MaterialTheme.colorScheme.surface,
        shadowElevation = 3.dp
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = if (selected) Color.White else accent, modifier = Modifier.size(17.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (selected) Color.White else TextPrimary)
        }
    }
}

@Composable
private fun MapBanner(message: String, actionLabel: String? = null, onAction: () -> Unit = {}) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(message, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f))
            if (actionLabel != null) TextButton(onClick = onAction) { Text(actionLabel, color = ForestGreenPrimary) }
        }
    }
}
