package com.surplusiq.app.ui.components.map

import android.graphics.Color as AndroidColor
import android.graphics.drawable.GradientDrawable
import android.view.MotionEvent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.surplusiq.app.domain.model.MapPin
import com.surplusiq.app.ui.theme.ForestGreenDark
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapListener
import org.osmdroid.events.ScrollEvent
import org.osmdroid.events.ZoomEvent
import org.osmdroid.tileprovider.tilesource.XYTileSource
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon

/**
 * Nền bản đồ: ô OpenStreetMap do OpenStreetMap France phục vụ. Dùng thay tile.openstreetmap.org vì máy chủ đó
 * bị chặn ở một số mạng (DNS trỏ về 127.0.0.1) khiến bản đồ chỉ hiện lưới xám. CARTO đã yêu cầu khóa API nên không dùng.
 */
private val MapTileSource = XYTileSource(
    "OsmFrance", 0, 19, 256, ".png",
    arrayOf(
        "https://a.tile.openstreetmap.fr/osmfr/",
        "https://b.tile.openstreetmap.fr/osmfr/",
        "https://c.tile.openstreetmap.fr/osmfr/"
    ),
    "© OpenStreetMap contributors, OSM France"
)

/** Từ mức zoom này trở lên mọi ghim hiện bong bóng tên và giá; xa hơn chỉ ghim đang chọn có bong bóng, còn lại là chấm. */
private const val BUBBLE_MIN_ZOOM = 16.5

/**
 * OpenStreetMap Compose Component sử dụng OsmDroid Native (Chi phí 0đ, không cần API Key Google Maps).
 * Hỗ trợ hiển thị ghim deal, vòng tròn bán kính và chế độ kéo ghim tâm vị trí.
 */
@Composable
fun OsmMapView(
    centerLatitude: Double,
    centerLongitude: Double,
    zoomLevel: Double = 15.0,
    radiusKm: Double? = null,
    pins: List<MapPin> = emptyList(),
    userLocation: Pair<Double, Double>? = null,
    isCenterPinMode: Boolean = false,
    interactive: Boolean = true,
    showZoomButtons: Boolean = true,
    onCenterChanged: ((lat: Double, lng: Double) -> Unit)? = null,
    onPinClick: ((pin: MapPin) -> Unit)? = null,
    selectedStoreId: String? = null,
    modifier: Modifier = Modifier
) {
    var mapViewInstance by remember { mutableStateOf<MapView?>(null) }
    var lastCenter by remember { mutableStateOf(centerLatitude to centerLongitude) }
    var lastZoom by remember { mutableStateOf(zoomLevel) }
    // Phóng đủ gần thì hiện bong bóng tên quán trên đầu ghim; xa hơn chỉ hiện chấm để bản đồ không rối
    var showBubbles by remember { mutableStateOf(zoomLevel >= BUBBLE_MIN_ZOOM) }

    LaunchedEffect(Unit) {
        Configuration.getInstance().userAgentValue = "SurplusIQ-Android"
    }

    Box(modifier = modifier) {
        AndroidView(
            factory = { ctx ->
                MapView(ctx).apply {
                    setTileSource(MapTileSource)
                    setMultiTouchControls(interactive)
                    if (!interactive) setOnTouchListener { _, _ -> true } // chỉ xem: không bắt cử chỉ, cuộn trang vẫn mượt
                    isTilesScaledToDpi = true
                    zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)

                    val startPoint = GeoPoint(centerLatitude, centerLongitude)
                    controller.setZoom(zoomLevel)
                    controller.setCenter(startPoint)

                    addMapListener(object : MapListener {
                        override fun onScroll(event: ScrollEvent?) = false
                        override fun onZoom(event: ZoomEvent?): Boolean {
                            val near = zoomLevelDouble >= BUBBLE_MIN_ZOOM
                            if (near != showBubbles) showBubbles = near
                            return false
                        }
                    })

                    if (isCenterPinMode && onCenterChanged != null) {
                        addMapListener(object : MapListener {
                            override fun onScroll(event: ScrollEvent?): Boolean {
                                val c = mapCenter
                                onCenterChanged(c.latitude, c.longitude)
                                return true
                            }

                            override fun onZoom(event: ZoomEvent?): Boolean {
                                val c = mapCenter
                                onCenterChanged(c.latitude, c.longitude)
                                return true
                            }
                        })
                    }

                    mapViewInstance = this
                }
            },
            update = { mapView ->
                // Xoá các overlay cũ để vẽ lại
                mapView.overlays.clear()

                val centerGeo = GeoPoint(centerLatitude, centerLongitude)

                // Vẽ vòng tròn bán kính nếu có
                if (radiusKm != null && radiusKm > 0.0) {
                    val circlePolygon = Polygon(mapView).apply {
                        points = Polygon.pointsAsCircle(centerGeo, radiusKm * 1000.0)
                        fillPaint.color = AndroidColor.argb(35, 46, 125, 50) // Xanh lá cây trong suốt
                        outlinePaint.color = AndroidColor.argb(180, 46, 125, 50)
                        outlinePaint.strokeWidth = 4f
                    }
                    mapView.overlays.add(circlePolygon)
                }

                // Vẽ các Marker cửa hàng có Deal
                // Ghim đang chọn vẽ sau cùng để bong bóng nổi lên trên các ghim khác
                pins.sortedBy { it.storeId == selectedStoreId }.forEach { pin ->
                    val marker = Marker(mapView).apply {
                        position = GeoPoint(pin.latitude, pin.longitude)
                        title = pin.storeName
                        setInfoWindow(null) // thông tin đã nằm ngay trong bong bóng, thẻ chi tiết hiện ở dưới màn hình

                        if (showBubbles || pin.storeId == selectedStoreId) {
                            val bubble = pinBubbleDrawable(mapView.context, pin, pin.storeId == selectedStoreId)
                            icon = bubble
                            val density = mapView.context.resources.displayMetrics.density
                            setAnchor(Marker.ANCHOR_CENTER, 1f - (13f * density) / bubble.intrinsicHeight)
                        } else {
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        val markerDrawable = GradientDrawable().apply {
                            shape = GradientDrawable.OVAL
                            setColor(
                                if (pin.activeDealsCount > 3) AndroidColor.parseColor("#2E7D32")
                                else AndroidColor.parseColor("#E65100")
                            )
                            setStroke(3, AndroidColor.WHITE)
                            setSize(64, 64)
                        }
                        icon = markerDrawable
                        }

                        setOnMarkerClickListener { _, _ ->
                            onPinClick?.invoke(pin)
                            true
                        }
                    }
                    mapView.overlays.add(marker)
                }

                // Chấm xanh vị trí hiện tại của người dùng
                userLocation?.let { (lat, lng) ->
                    mapView.overlays.add(
                        Marker(mapView).apply {
                            position = GeoPoint(lat, lng)
                            title = "Bạn đang ở đây"
                            setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                            icon = GradientDrawable().apply {
                                shape = GradientDrawable.OVAL
                                setColor(AndroidColor.parseColor("#1E88E5"))
                                setStroke(6, AndroidColor.WHITE)
                                setSize(44, 44)
                            }
                        }
                    )
                }

                // Tâm đổi (vd. vừa định vị xong) thì dời bản đồ tới đó, trừ chế độ kéo ghim
                if (lastZoom != zoomLevel) {
                    lastZoom = zoomLevel
                    mapView.controller.setZoom(zoomLevel)
                }
                if (!isCenterPinMode && lastCenter != (centerLatitude to centerLongitude)) {
                    lastCenter = centerLatitude to centerLongitude
                    mapView.controller.animateTo(centerGeo)
                }

                mapView.invalidate()
            },
            modifier = Modifier.fillMaxSize()
        )

        // Ghim ở tâm màn hình khi ở chế độ kéo chọn toạ độ K08
        if (isCenterPinMode) {
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = "Ghim tâm vị trí",
                tint = ForestGreenPrimary,
                modifier = Modifier
                    .align(Alignment.Center)
                    .offset(y = (-20).dp)
                    .size(44.dp)
            )
        }

        Text(
            "© OpenStreetMap contributors · OSM France",
            fontSize = 9.sp,
            color = androidx.compose.ui.graphics.Color(0xFF555555),
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 6.dp, bottom = 4.dp)
        )

        // Nút điều khiển Zoom tiện lợi
        if (showZoomButtons) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Surface(
                shape = CircleShape,
                shadowElevation = 4.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                IconButton(
                    onClick = { mapViewInstance?.controller?.zoomIn() },
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Phóng to", tint = ForestGreenDark)
                }
            }

            Surface(
                shape = CircleShape,
                shadowElevation = 4.dp,
                color = MaterialTheme.colorScheme.surface
            ) {
                IconButton(
                    onClick = { mapViewInstance?.controller?.zoomOut() },
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(imageVector = Icons.Default.Remove, contentDescription = "Thu nhỏ", tint = ForestGreenDark)
                }
            }
        }
        }
    }
}
