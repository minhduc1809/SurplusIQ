package com.surplusiq.app.ui.screens.discovery

import com.surplusiq.app.domain.model.DefaultMapCenter
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Close
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.ElectricBolt
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Storefront
import com.surplusiq.app.ui.components.rememberLocationPermissionRequest
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.DealCategory
import com.surplusiq.app.domain.model.dealCategoryOf
import com.surplusiq.app.ui.components.accent
import com.surplusiq.app.ui.components.icon
import androidx.compose.material.icons.filled.Apps
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.ui.components.map.OsmMapView
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.NavigationUtil

/**
 * K10 Bản đồ deal (R1-021) trên nền tảng OpenStreetMap Native (OsmDroid) & Realtime WebSocket.
 * Hiển thị ghim quán có suất cứu, bán kính tìm kiếm và cập nhật realtime.
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

    val centerLat = location.latitude ?: pins.firstOrNull()?.latitude ?: DefaultMapCenter.LATITUDE
    val centerLng = location.longitude ?: pins.firstOrNull()?.longitude ?: DefaultMapCenter.LONGITUDE

    // Mở bản đồ là định vị luôn để hiện chấm vị trí của tôi
    LaunchedEffect(Unit) { if (userLocation == null) requestLocation() }

    // Tải lại ghim khi vị trí hoặc bán kính đổi (vd. vừa bấm định vị)
    LaunchedEffect(location.latitude, location.longitude, location.radiusKm) { onLoad() }

    Box(modifier.fillMaxSize()) {
        // Bản đồ mở OsmDroid
        OsmMapView(
            centerLatitude = centerLat,
            centerLongitude = centerLng,
            zoomLevel = 15.5,
            radiusKm = if (location.hasCoordinates) location.radiusKm else null,
            pins = shownPins,
            selectedStoreId = selectedPin?.storeId,
            userLocation = userLocation,
            showZoomButtons = false,
            onPinClick = { pin -> selectedPin = pin },
            modifier = Modifier.fillMaxSize()
        )

        // Banner thông tin trạng thái & Realtime badge
        Column(
            Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(12.dp)
        ) {
            Card(
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.ElectricBolt,
                        contentDescription = null,
                        tint = ForestGreenDark,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Bản đồ mở OpenStreetMap • Cập nhật trực tiếp",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ForestGreenDark
                    )
                }
            }

            // Chip nhóm món: cuộn ngang ngay dưới thanh trạng thái
            Row(
                Modifier.padding(top = 8.dp).horizontalScroll(rememberScrollState()),
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
                isLoading -> LinearProgressIndicator(
                    Modifier.fillMaxWidth().padding(top = 6.dp),
                    color = ForestGreenPrimary
                )
                locateError != null -> MapBanner(locateError, actionLabel = null, onAction = {})
                errorMessage != null -> MapBanner(errorMessage, actionLabel = "Thử lại", onAction = onLoad)
                shownPins.isEmpty() && selectedCategory != null -> MapBanner(
                    "Không có cửa hàng nào bán nhóm \"${selectedCategory?.label}\" trong khu vực này.",
                    actionLabel = null,
                    onAction = {}
                )
                pins.isEmpty() -> MapBanner(
                    if (location.hasCoordinates) "Chưa có cửa hàng nào có deal đang mở trong bán kính này."
                    else "Chưa có cửa hàng nào có deal đang mở.",
                    actionLabel = null,
                    onAction = {}
                )
            }
        }

        // Đáy màn hình: nút định vị, rồi thẻ quán đang chọn hoặc danh sách quán gần bạn
        Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(bottom = 8.dp),
            horizontalAlignment = Alignment.End
        ) {
            SmallFloatingActionButton(
                onClick = requestLocation,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = ForestGreenDark,
                modifier = Modifier.padding(end = 16.dp, bottom = 10.dp)
            ) {
                if (isLocating) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = ForestGreenPrimary)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = "Định vị vị trí của tôi")
                }
            }
            val pin = selectedPin
            if (pin != null) {
                PinSummaryCard(
                    pin = pin,
                    onDirections = {
                        NavigationUtil.openMapOrCopyAddress(context, pin.storeAddress, pin.storeName, pin.latitude, pin.longitude)
                    },
                    onOpenStore = { onOpenStore(pin.storeId) },
                    onClose = { selectedPin = null },
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            } else if (shownPins.isNotEmpty()) {
                NearbyStoresPanel(
                    pins = shownPins,
                    onSelect = { selectedPin = it },
                    onDirections = { p ->
                        NavigationUtil.openMapOrCopyAddress(context, p.storeAddress, p.storeName, p.latitude, p.longitude)
                    },
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
        }
    }
}

/** Danh sách quán trong bán kính, gần nhất trước; mỗi dòng có nút Chỉ đường, chạm dòng để xem quán. */
@Composable
private fun NearbyStoresPanel(
    pins: List<MapPin>,
    onSelect: (MapPin) -> Unit,
    onDirections: (MapPin) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    val sorted = remember(pins) { pins.sortedBy { it.distanceMeters ?: Double.MAX_VALUE } }
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 10.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Column {
            Row(
                Modifier.fillMaxWidth().clickable { expanded = !expanded }.padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Quán gần bạn (${sorted.size})", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary, modifier = Modifier.weight(1f))
                Text(if (expanded) "Thu gọn" else "Xem hết", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
            }
            LazyColumn(
                Modifier.fillMaxWidth().heightIn(max = if (expanded) 380.dp else 170.dp),
                contentPadding = PaddingValues(start = 12.dp, end = 12.dp, bottom = 10.dp)
            ) {
                items(sorted, key = { it.storeId }) { pin ->
                    StoreRow(pin, onClick = { onSelect(pin) }, onDirections = { onDirections(pin) })
                }
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
            Modifier.size(44.dp).clip(CircleShape).background(ForestGreenPrimary.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            if (!pin.logoUrl.isNullOrBlank()) {
                coil.compose.AsyncImage(model = pin.logoUrl, contentDescription = pin.storeName, contentScale = androidx.compose.ui.layout.ContentScale.Crop, modifier = Modifier.fillMaxSize())
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
private fun MapCategoryChip(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, accent: androidx.compose.ui.graphics.Color, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        color = if (selected) accent else MaterialTheme.colorScheme.surface,
        shadowElevation = 3.dp
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = if (selected) androidx.compose.ui.graphics.Color.White else accent, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(6.dp))
            Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = if (selected) androidx.compose.ui.graphics.Color.White else TextPrimary)
        }
    }
}

@Composable
private fun MapBanner(message: String, actionLabel: String?, onAction: () -> Unit) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 6.dp)
    ) {
        Row(
            Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(message, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f))
            if (actionLabel != null) {
                TextButton(onClick = onAction) {
                    Text(actionLabel, color = ForestGreenPrimary)
                }
            }
        }
    }
}

@Composable
private fun PinSummaryCard(pin: MapPin, onDirections: () -> Unit, onOpenStore: () -> Unit, onClose: () -> Unit, modifier: Modifier = Modifier) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        modifier = modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Storefront,
                    contentDescription = null,
                    tint = ForestGreenPrimary,
                    modifier = Modifier.size(22.dp)
                )
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        pin.storeName,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        listOfNotNull(pin.distanceText, pin.storeAddress.ifBlank { null }).joinToString(" • "),
                        fontSize = 12.sp,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                IconButton(onClick = onClose, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Đóng", tint = TextMuted, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "${pin.activeDealsCount} suất đang mở",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MintDeep
                )
                pin.minPrice?.let {
                    Text("Từ ${String.format("%,d", it)} ₫", fontSize = 12.sp, color = TextPrimary)
                }
                if (pin.maxDiscountPercent > 0) {
                    Text("Giảm đến ${pin.maxDiscountPercent}%", fontSize = 12.sp, color = TextMuted)
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = onDirections,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp)
                ) {
                    Icon(
                        Icons.Default.Directions,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(Modifier.width(4.dp))
                    Text("Chỉ đường", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = onOpenStore,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    modifier = Modifier
                        .weight(1.3f)
                        .height(40.dp)
                ) {
                    Text("Xem thực đơn & đánh giá", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
