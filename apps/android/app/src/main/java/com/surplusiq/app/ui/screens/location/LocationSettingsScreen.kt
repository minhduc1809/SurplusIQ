package com.surplusiq.app.ui.screens.location

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmarks
import androidx.compose.material.icons.filled.EditLocationAlt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PushPin
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.ui.components.AddressSearchField
import com.surplusiq.app.ui.components.RadiusSlider
import com.surplusiq.app.ui.components.formatRadius
import com.surplusiq.app.ui.components.rememberLocationPermissionRequest
import com.surplusiq.app.ui.screens.profile.ProfileMenuItem
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.InfoOnLight
import com.surplusiq.app.ui.theme.SkyInfoAccent
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Vị trí và bán kính", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại") } },
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
                .padding(16.dp)
        ) {
            RadiusIllustration(radiusKm)
            Spacer(Modifier.height(16.dp))
            Text("Tìm deal quanh bạn", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(Modifier.height(6.dp))
            Text(
                "SurplusIQ chỉ dùng vị trí để lọc suất cứu món trong bán kính bạn chọn. Vị trí được lưu trên máy, không lưu vào hồ sơ của bạn.",
                fontSize = 13.sp,
                color = TextSecondary,
                lineHeight = 19.sp
            )
            Spacer(Modifier.height(16.dp))

            Card(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = ForestGreenPrimary)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Vị trí sẽ dùng", fontSize = 12.sp, color = TextSecondary)
                        Text(
                            state.selected?.address ?: "Chưa chọn vị trí - đang hiển thị deal của mọi khu vực",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            Button(
                onClick = requestPermission,
                enabled = !state.isLocating,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                if (state.isLocating) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(18.dp))
                }
                Spacer(Modifier.width(8.dp))
                Text("Cho phép vị trí", fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { showManualEntry = !showManualEntry },
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Icon(Icons.Default.EditLocationAlt, contentDescription = null, modifier = Modifier.size(18.dp), tint = ForestGreenPrimary)
                Spacer(Modifier.width(8.dp))
                Text("Nhập địa chỉ thủ công", color = ForestGreenPrimary, fontWeight = FontWeight.SemiBold)
            }
            if (showManualEntry) {
                Spacer(Modifier.height(10.dp))
                AddressSearchField(
                    isSearching = state.isSearching,
                    suggestions = state.suggestions,
                    onSearch = onSearchAddress,
                    onSelect = onSelectSuggestion
                )
            }

            Spacer(Modifier.height(20.dp))
            RadiusSlider(radiusKm = radiusKm, onRadiusChange = { radiusKm = it })
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { onApply(radiusKm) },
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(50.dp)
            ) {
                Text("Áp dụng", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            Spacer(Modifier.height(20.dp))
            Card(
                shape = RoundedCornerShape(16.dp),
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
                    subtitle = "Xem deal ở nơi khác mà không đổi vị trí đã lưu",
                    onClick = onOpenPinLocation
                )
            }
        }
    }
}

/** Minh họa vòng bán kính quanh điểm ghim, co giãn theo bán kính đang chọn. */
@Composable
private fun RadiusIllustration(radiusKm: Double) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(180.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(SkyInfoWash),
        contentAlignment = Alignment.Center
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val fraction = (radiusKm / LocationSettings.MAX_RADIUS_KM).toFloat()
            val ringRadius = size.minDimension * (0.12f + 0.36f * fraction)
            drawCircle(color = SkyInfoAccent.copy(alpha = 0.25f), radius = ringRadius)
            drawCircle(color = InfoOnLight.copy(alpha = 0.6f), radius = ringRadius, style = Stroke(width = 2.dp.toPx()))
        }
        Icon(Icons.Default.LocationOn, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(36.dp))
        Text(
            formatRadius(radiusKm),
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = InfoOnLight,
            modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp)
        )
    }
}
