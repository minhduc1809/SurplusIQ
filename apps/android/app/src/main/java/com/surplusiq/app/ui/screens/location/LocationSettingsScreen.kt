package com.surplusiq.app.ui.screens.location

import androidx.compose.foundation.background
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmarks
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.NearMe
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.CircleShape
import com.surplusiq.app.domain.model.DefaultMapCenter
import com.surplusiq.app.ui.components.map.OsmMapView
import kotlin.math.ln
import com.surplusiq.app.ui.components.AddressSearchField
import com.surplusiq.app.ui.components.RadiusSlider
import com.surplusiq.app.ui.components.formatRadius
import com.surplusiq.app.ui.components.rememberLocationPermissionRequest
import com.surplusiq.app.ui.screens.profile.ProfileMenuItem
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.MintDeep
import com.surplusiq.app.ui.theme.SkyBlueIce
import com.surplusiq.app.ui.theme.ForestGreenDark
import androidx.compose.foundation.clickable
import androidx.compose.ui.graphics.Color
import com.surplusiq.app.ui.theme.SkyInfoWash
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.PlacesUiState

/** K06 Quyền vị trí và bán kính: lần mở app đầu tiên và trong Cài đặt. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationSettingsScreen(
    state: PlacesUiState,
    onBackClick: () -> Unit,
    onUseDeviceLocation: () -> Unit,
    onSearchAddress: (String) -> Unit,
    onSelectSuggestion: (com.surplusiq.app.domain.model.AddressSuggestion) -> Unit,
    onApply: (radiusKm: Double) -> Unit,
    onOpenSavedPlaces: () -> Unit,
    onOpenPinLocation: () -> Unit,
    onConsumeMessage: () -> Unit
) {
    var radiusKm by remember { mutableDoubleStateOf(state.location.radiusKm) }
    var showManualEntry by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    var permissionDenied by remember { mutableStateOf(false) }
    val requestPermission = rememberLocationPermissionRequest(
        onGranted = onUseDeviceLocation,
        onDenied = { permissionDenied = true }
    )

    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); onConsumeMessage() }
    }
    LaunchedEffect(permissionDenied) {
        if (permissionDenied) {
            snackbarHostState.showSnackbar("Chưa có quyền vị trí. Bạn có thể nhập địa chỉ thủ công.")
            permissionDenied = false
        }
    }

    // Điểm đang chọn: vị trí vừa định vị/chọn, nếu chưa có thì vị trí đã lưu, cuối cùng là tâm mặc định.
    val centerLat = state.selected?.latitude ?: state.location.latitude ?: DefaultMapCenter.LATITUDE
    val centerLng = state.selected?.longitude ?: state.location.longitude ?: DefaultMapCenter.LONGITUDE
    val hasPoint = state.selected != null || state.location.hasCoordinates
    // Zoom theo bán kính để vòng tròn luôn nằm gọn trong khung bản đồ
    val zoom = (14.6 - ln(radiusKm / 0.5) / ln(2.0)).coerceIn(9.5, 15.0)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vị trí & Bán kính", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Quay lại") } },
                actions = { TextButton(onClick = onBackClick) { Text("Bỏ qua", color = TextSecondary, fontWeight = FontWeight.SemiBold) } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Bản đồ thật: ghim ở vị trí đang chọn, vòng tròn là bán kính tìm deal
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(280.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(SkyInfoWash)
            ) {
                OsmMapView(
                    centerLatitude = centerLat,
                    centerLongitude = centerLng,
                    zoomLevel = zoom,
                    radiusKm = if (hasPoint) radiusKm else null,
                    isCenterPinMode = hasPoint,
                    interactive = false,
                    showZoomButtons = false,
                    modifier = Modifier.fillMaxSize()
                )
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                    shadowElevation = 3.dp,
                    modifier = Modifier.align(Alignment.TopStart).padding(12.dp)
                ) {
                    Text(
                        "PHỦ SÓNG: ${formatRadius(radiusKm)}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = InfoOnLight,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
                FloatingActionButton(
                    onClick = requestPermission,
                    containerColor = MaterialTheme.colorScheme.surface,
                    contentColor = ForestGreenPrimary,
                    modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp)
                ) {
                    if (state.isLocating) {
                        CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = ForestGreenPrimary)
                    } else {
                        Icon(Icons.Default.MyLocation, contentDescription = "Định vị vị trí của tôi")
                    }
                }
                if (!hasPoint) {
                    Text(
                        "Chưa chọn vị trí",
                        fontSize = 13.sp,
                        color = TextSecondary,
                        modifier = Modifier.align(Alignment.Center)
                    )
                }
            }

            // Giới thiệu
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Tìm deal quanh bạn", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    "SurplusIQ chỉ dùng vị trí để gợi ý các suất ăn ngon và ưu đãi giải cứu thực phẩm trong phạm vi bạn chọn. Dữ liệu lưu an toàn trên máy.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    lineHeight = 19.sp
                )
            }

            // Vị trí sẽ dùng
            SqCard(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.size(42.dp).clip(CircleShape).background(ForestGreenPrimary.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) { Icon(Icons.Default.NearMe, contentDescription = null, tint = ForestGreenPrimary) }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("VỊ TRÍ SẼ DÙNG", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = ForestGreenDark, letterSpacing = 0.6.sp)
                            if (hasPoint) {
                                Spacer(Modifier.width(8.dp))
                                Row(
                                    Modifier.clip(RoundedCornerShape(50)).background(SkyBlueIce).padding(horizontal = 8.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = MintDeep, modifier = Modifier.size(11.dp))
                                    Spacer(Modifier.width(3.dp))
                                    Text("Đã xác định", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MintDeep)
                                }
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            state.selected?.address ?: state.location.label ?: "Chưa chọn - đang hiện deal mọi khu vực",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary,
                            maxLines = 3
                        )
                    }
                    if (hasPoint) {
                        Text(
                            "Sửa",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = ForestGreenDark,
                            modifier = Modifier.clickable { showManualEntry = true }.padding(start = 8.dp)
                        )
                    }
                }
            }

            // Hai cách chọn vị trí
            Button(
                onClick = requestPermission,
                enabled = !state.isLocating,
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(54.dp)
            ) {
                if (state.isLocating) {
                    CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                Spacer(Modifier.width(8.dp))
                Text(if (state.isLocating) "Đang định vị..." else "Cho phép dùng vị trí hiện tại", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }
            OutlinedButton(
                onClick = { showManualEntry = !showManualEntry },
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("Nhập địa chỉ khác thủ công", color = TextPrimary, fontWeight = FontWeight.SemiBold)
            }
            if (showManualEntry) {
                AddressSearchField(
                    isSearching = state.isSearching,
                    suggestions = state.suggestions,
                    onSearch = onSearchAddress,
                    onSelect = onSelectSuggestion
                )
            }

            // Bán kính
            SqCard(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    RadiusSlider(radiusKm = radiusKm, onRadiusChange = { radiusKm = it })
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Vị trí chỉ lưu trên máy bạn, dùng để lọc suất cứu món gần đó.",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                }
            }

            // Lối tắt
            SqCard(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                ProfileMenuItem(
                    icon = Icons.Default.Bookmarks,
                    title = "Địa điểm của tôi",
                    subtitle = "Nhà, nơi làm việc... tối đa ${com.surplusiq.app.domain.model.SavedPlace.MAX_PLACES} địa điểm",
                    onClick = onOpenSavedPlaces
                )
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                ProfileMenuItem(
                    icon = Icons.Default.PushPin,
                    title = "Ghim vị trí tạm trên bản đồ",
                    subtitle = "Kéo bản đồ để xem deal ở nơi khác",
                    onClick = onOpenPinLocation
                )
            }
            // Nút áp dụng nằm cuối trang, cuộn cùng nội dung; chừa chỗ thanh điều hướng
            Button(
                onClick = { onApply(radiusKm) },
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                Text("Áp dụng vị trí & Khám phá", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Spacer(Modifier.width(8.dp))
                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.windowInsetsPadding(WindowInsets.navigationBars).height(8.dp))
        }
    }
}

