package com.surplusiq.app.ui.screens.location

import com.surplusiq.app.domain.model.DefaultMapCenter
import com.surplusiq.app.ui.components.SqCard
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkAdd
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.AddressSuggestion
import com.surplusiq.app.domain.model.SavedPlace
import com.surplusiq.app.ui.components.AddressSearchField
import com.surplusiq.app.ui.components.RadiusSlider
import com.surplusiq.app.ui.components.map.OsmMapView
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.PlacesUiState
import com.surplusiq.app.ui.viewmodel.PlacesViewModel

/**
 * K08 Ghim vị trí tạm trên OpenStreetMap: kéo bản đồ để đặt ghim, xem deal tại đó mà không đổi vị trí đã lưu.
 * Tích hợp OsmDroid native, độc lập 100% với Google Play Services và API key.
 */
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
    var centerLat by remember {
        mutableDoubleStateOf(state.selected?.latitude ?: DefaultMapCenter.LATITUDE)
    }
    var centerLng by remember {
        mutableDoubleStateOf(state.selected?.longitude ?: DefaultMapCenter.LONGITUDE)
    }
    var radiusKm by remember { mutableDoubleStateOf(state.location.radiusKm) }
    var showSaveDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(state.message) {
        state.message?.let {
            snackbarHostState.showSnackbar(it)
            onConsumeMessage()
        }
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Box(Modifier.padding(padding).fillMaxSize()) {
            // Bản đồ mở OsmDroid với chế độ ghim tâm
            OsmMapView(
                centerLatitude = centerLat,
                centerLongitude = centerLng,
                zoomLevel = 15.0,
                radiusKm = radiusKm,
                isCenterPinMode = true,
                onCenterChanged = { lat, lng ->
                    centerLat = lat
                    centerLng = lng
                    onPinMoved(lat, lng)
                },
                modifier = Modifier.fillMaxSize()
            )

            // Thanh tìm kiếm địa chỉ ở trên cùng
            Column(Modifier.fillMaxWidth().padding(12.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Surface(
                        shape = CircleShape,
                        shadowElevation = 4.dp,
                        color = MaterialTheme.colorScheme.surface
                    ) {
                        IconButton(onClick = onBackClick) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Quay lại"
                            )
                        }
                    }
                    Spacer(Modifier.width(8.dp))
                    AddressSearchField(
                        isSearching = state.isSearching,
                        suggestions = state.suggestions,
                        onSearch = onSearchAddress,
                        onSelect = { suggestion ->
                            onSelectSuggestion(suggestion)
                            centerLat = suggestion.latitude
                            centerLng = suggestion.longitude
                            onPinMoved(suggestion.latitude, suggestion.longitude)
                        },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Bottom Card chỉnh bán kính và xác nhận xem deal
            SqCard(
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth()
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("Vị trí ghim (OpenStreetMap)", fontSize = 12.sp, color = TextSecondary)
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
                        leadingIcon = {
                            Icon(
                                Icons.Default.BookmarkAdd,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    )
                    Spacer(Modifier.height(6.dp))
                    Button(
                        onClick = { onViewDealsHere(radiusKm) },
                        enabled = state.selected != null,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                        modifier = Modifier.fillMaxWidth().height(48.dp)
                    ) {
                        Text("Xem suất tại đây", fontWeight = FontWeight.Bold)
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
                    onClick = {
                        onSaveAsPlace(label.trim(), radiusKm)
                        showSaveDialog = false
                    },
                    enabled = label.isNotBlank()
                ) {
                    Text("Lưu", color = ForestGreenPrimary, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSaveDialog = false }) { Text("Hủy") }
            }
        )
    }
}
