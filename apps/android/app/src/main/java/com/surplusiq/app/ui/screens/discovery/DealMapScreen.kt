package com.surplusiq.app.ui.screens.discovery

import com.surplusiq.app.domain.model.DefaultMapCenter
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.ElectricBolt
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
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var selectedPin by remember { mutableStateOf<MapPin?>(null) }

    val centerLat = location.latitude ?: pins.firstOrNull()?.latitude ?: DefaultMapCenter.LATITUDE
    val centerLng = location.longitude ?: pins.firstOrNull()?.longitude ?: DefaultMapCenter.LONGITUDE

    LaunchedEffect(Unit) { onLoad() }

    Box(modifier.fillMaxSize()) {
        // Bản đồ mở OsmDroid
        OsmMapView(
            centerLatitude = centerLat,
            centerLongitude = centerLng,
            zoomLevel = 14.5,
            radiusKm = if (location.hasCoordinates) location.radiusKm else null,
            pins = pins,
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

            when {
                isLoading -> LinearProgressIndicator(
                    Modifier.fillMaxWidth().padding(top = 6.dp),
                    color = ForestGreenPrimary
                )
                errorMessage != null -> MapBanner(errorMessage, actionLabel = "Thử lại", onAction = onLoad)
                pins.isEmpty() -> MapBanner(
                    if (location.hasCoordinates) "Chưa có cửa hàng nào có deal đang mở trong bán kính này."
                    else "Chưa có cửa hàng nào có deal đang mở.",
                    actionLabel = null,
                    onAction = {}
                )
            }
        }

        // Card chi tiết ghim quán khi người dùng chạm vào marker
        AnimatedVisibility(
            visible = selectedPin != null,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp)
        ) {
            selectedPin?.let { pin ->
                PinSummaryCard(
                    pin = pin,
                    onDirections = {
                        NavigationUtil.openMapOrCopyAddress(
                            context,
                            pin.storeAddress,
                            pin.storeName,
                            pin.latitude,
                            pin.longitude
                        )
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
private fun PinSummaryCard(pin: MapPin, onDirections: () -> Unit, onOpenStore: () -> Unit) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        modifier = Modifier.fillMaxWidth()
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
                    Text("Xem chi tiết", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
