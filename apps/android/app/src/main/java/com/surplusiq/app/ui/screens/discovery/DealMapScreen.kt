package com.surplusiq.app.ui.screens.discovery

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.rememberCameraPositionState
import com.google.maps.android.compose.rememberMarkerState
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.ui.components.MapsKeyNotice
import com.surplusiq.app.ui.screens.location.DEFAULT_MAP_CENTER
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.util.NavigationUtil

/** K10 Bản đồ deal (R1-021): ghim cửa hàng có deal đang mở, chạm ghim để xem tóm tắt. */
@Composable
fun DealMapScreen(
    pins: List<MapPin>,
    location: LocationSettings,
    isLoading: Boolean,
    errorMessage: String?,
    onLoad: () -> Unit,
    onOpenStore: (storeId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedPin by remember { mutableStateOf<MapPin?>(null) }
    val center = if (location.latitude != null && location.longitude != null) {
        LatLng(location.latitude, location.longitude)
    } else pins.firstOrNull()?.let { LatLng(it.latitude, it.longitude) } ?: DEFAULT_MAP_CENTER
    val cameraState = rememberCameraPositionState { position = CameraPosition.fromLatLngZoom(center, 14f) }

    LaunchedEffect(Unit) { onLoad() }
    // Không có vị trí thì canh camera theo ghim đầu tiên khi dữ liệu về.
    LaunchedEffect(pins.firstOrNull()?.storeId) {
        if (!location.hasCoordinates) pins.firstOrNull()?.let { cameraState.move(CameraUpdateFactory.newLatLng(LatLng(it.latitude, it.longitude))) }
    }

    Box(modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = cameraState,
            uiSettings = MapUiSettings(zoomControlsEnabled = false, mapToolbarEnabled = false),
            onMapClick = { selectedPin = null }
        ) {
            if (location.latitude != null && location.longitude != null) {
                Circle(
                    center = LatLng(location.latitude, location.longitude),
                    radius = location.radiusKm * 1000,
                    fillColor = ForestGreenPrimary.copy(alpha = 0.08f),
                    strokeColor = ForestGreenPrimary.copy(alpha = 0.5f),
                    strokeWidth = 3f
                )
            }
            pins.forEach { pin ->
                Marker(
                    state = rememberMarkerState(key = pin.storeId, position = LatLng(pin.latitude, pin.longitude)),
                    title = pin.storeName,
                    snippet = "${pin.activeDealsCount} suất đang mở",
                    onClick = { selectedPin = pin; false }
                )
            }
        }

        Column(Modifier.align(Alignment.TopCenter).fillMaxWidth().padding(12.dp)) {
            MapsKeyNotice()
            when {
                isLoading -> LinearProgressIndicator(Modifier.fillMaxWidth().padding(top = 6.dp), color = ForestGreenPrimary)
                errorMessage != null -> MapBanner(errorMessage, actionLabel = "Thử lại", onAction = onLoad)
                pins.isEmpty() -> MapBanner(
                    if (location.hasCoordinates) "Chưa có cửa hàng nào có deal đang mở trong bán kính này." else "Chưa có cửa hàng nào có deal đang mở.",
                    actionLabel = null,
                    onAction = {}
                )
            }
        }

        AnimatedVisibility(
            visible = selectedPin != null,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp)
        ) {
            selectedPin?.let { pin ->
                PinSummaryCard(
                    pin = pin,
                    onDirections = {
                        NavigationUtil.openMapOrCopyAddress(context, pin.storeAddress, pin.storeName, pin.latitude, pin.longitude)
                    },
                    onOpenStore = { onOpenStore(pin.storeId) }
                )
            }
        }
    }
}

@Composable
private fun MapBanner(message: String, actionLabel: String?, onAction: () -> Unit) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
    ) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(message, fontSize = 12.sp, color = TextSecondary, modifier = Modifier.weight(1f))
            if (actionLabel != null) TextButton(onClick = onAction) { Text(actionLabel, color = ForestGreenPrimary) }
        }
    }
}

@Composable
private fun PinSummaryCard(pin: MapPin, onDirections: () -> Unit, onOpenStore: () -> Unit) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Storefront, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(22.dp))
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(pin.storeName, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        listOfNotNull(pin.distanceText, pin.storeAddress.ifBlank { null }).joinToString(" • "),
                        fontSize = 12.sp,
                        color = TextSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("${pin.activeDealsCount} suất đang mở", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MintDeep)
                pin.minPrice?.let { Text("Từ ${String.format("%,d", it)} ₫", fontSize = 12.sp, color = TextPrimary) }
                if (pin.maxDiscountPercent > 0) Text("Giảm đến ${pin.maxDiscountPercent}%", fontSize = 12.sp, color = TextMuted)
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onDirections, shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(40.dp)) {
                    Icon(Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Chỉ đường", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Button(
                    onClick = onOpenStore,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    modifier = Modifier.weight(1.3f).height(40.dp)
                ) {
                    Text("Xem chi tiết", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
