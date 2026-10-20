package com.surplusiq.app.ui.screens.location

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.Circle
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.rememberCameraPositionState
import com.surplusiq.app.domain.model.AddressSuggestion
import com.surplusiq.app.domain.model.SavedPlace
import com.surplusiq.app.ui.components.AddressSearchField
import com.surplusiq.app.ui.components.MapsKeyNotice
import com.surplusiq.app.ui.components.RadiusSlider
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.PlacesUiState
import com.surplusiq.app.ui.viewmodel.PlacesViewModel

/** Tâm khung nhìn mặc định khi khách chưa có vị trí nào (trung tâm TP.HCM) - chỉ là vị trí camera, không phải dữ liệu. */
internal val DEFAULT_MAP_CENTER = LatLng(10.7769, 106.7009)

/** K08 Ghim vị trí tạm: kéo bản đồ để đặt ghim, xem deal tại đó mà không đổi vị trí đã lưu. */
@Composable
fun PinLocationScreen(
    state: PlacesUiState,
    onBackClick: () -> Unit,
    onPinMoved: (Double, Double) -> Unit,
    onSearchAddress: (String) -> Unit,
    onSelectSuggestion: (AddressSuggestion) -> Unit,
    onViewDealsHere: (radiusKm: Double) -> Unit,
    onSaveAsPlace: (label: String, radiusKm: Double) -> Unit,
    onConsumeMessage: () -> Unit
) {
    val start = state.selected?.let { LatLng(it.latitude, it.longitude) } ?: DEFAULT_MAP_CENTER
    val cameraState = rememberCameraPositionState { position = CameraPosition.fromLatLngZoom(start, 14f) }
    var radiusKm by remember { mutableDoubleStateOf(state.location.radiusKm) }
    var showSaveDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    // Ghim cố định ở tâm: khi bản đồ ngừng di chuyển, tâm mới chính là vị trí ghim.
    LaunchedEffect(cameraState.isMoving) {
        if (!cameraState.isMoving) {
            val target = cameraState.position.target
            onPinMoved(target.latitude, target.longitude)
        }
    }
    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraState,
                uiSettings = MapUiSettings(zoomControlsEnabled = false, mapToolbarEnabled = false)
            ) {
                Circle(
                    center = cameraState.position.target,
                    radius = radiusKm * 1000,
                    fillColor = ForestGreenPrimary.copy(alpha = 0.10f),
                    strokeColor = ForestGreenPrimary.copy(alpha = 0.6f),
                    strokeWidth = 3f
                )
            }
            // Ghim ở tâm, nhấc lên nửa chiều cao để mũi ghim chỉ đúng tâm.
            Icon(
                Icons.Default.LocationOn,
                contentDescription = "Vị trí ghim",
                tint = ForestGreenPrimary,
                modifier = Modifier.align(Alignment.Center).offset(y = (-20).dp).size(40.dp)
            )

            Column(Modifier.fillMaxWidth().padding(12.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Surface(shape = CircleShape, shadowElevation = 4.dp, color = MaterialTheme.colorScheme.surface) {
                        IconButton(onClick = onBackClick) { Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại") }
                    }
                    Spacer(Modifier.width(8.dp))
                    AddressSearchField(
                        isSearching = state.isSearching,
                        suggestions = state.suggestions,
                        onSearch = onSearchAddress,
                        onSelect = { suggestion ->
                            onSelectSuggestion(suggestion)
                            cameraState.move(CameraUpdateFactory.newLatLngZoom(LatLng(suggestion.latitude, suggestion.longitude), 15f))
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
                MapsKeyNotice(Modifier.padding(top = 8.dp))
            }

            Card(
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Vị trí ghim", fontSize = 12.sp, color = TextSecondary)
                    Text(
                        state.selected?.address ?: PlacesViewModel.PIN_RESOLVING,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        maxLines = 2
                    )
                    Spacer(Modifier.height(10.dp))
                    RadiusSlider(radiusKm = radiusKm, onRadiusChange = { radiusKm = it })
                    Spacer(Modifier.height(6.dp))
                    AssistChip(
                        onClick = { showSaveDialog = true },
                        enabled = state.selected != null && !state.isSaving,
                        label = { Text("Lưu thành địa điểm") },
                        leadingIcon = { Icon(Icons.Default.BookmarkAdd, contentDescription = null, modifier = Modifier.size(18.dp)) }
                    )
                    Spacer(Modifier.height(6.dp))
                    Button(
                        onClick = { onViewDealsHere(radiusKm) },
                        enabled = state.selected != null,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Text("Xem deal tại đây", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }

    if (showSaveDialog) {
        var label by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showSaveDialog = false },
            title = { Text("Lưu thành địa điểm") },
            text = {
                OutlinedTextField(
                    value = label,
                    onValueChange = { if (it.length <= SavedPlace.MAX_LABEL_LENGTH) label = it },
                    label = { Text("Tên địa điểm") },
                    supportingText = { Text("${label.length}/${SavedPlace.MAX_LABEL_LENGTH}") },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(
                    onClick = { onSaveAsPlace(label.trim(), radiusKm); showSaveDialog = false },
                    enabled = label.isNotBlank()
                ) { Text("Lưu", color = ForestGreenPrimary, fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { showSaveDialog = false }) { Text("Hủy") } }
        )
    }
}
