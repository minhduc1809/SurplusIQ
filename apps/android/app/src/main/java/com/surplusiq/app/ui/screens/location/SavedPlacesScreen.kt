package com.surplusiq.app.ui.screens.location

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.WhereToVote
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.AddressSuggestion
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.domain.model.SavedPlace
import com.surplusiq.app.ui.components.AddressSearchField
import com.surplusiq.app.ui.components.LoadStateContent
import com.surplusiq.app.ui.components.RadiusSlider
import com.surplusiq.app.ui.components.formatRadius
import com.surplusiq.app.ui.components.rememberLocationPermissionRequest
import com.surplusiq.app.ui.theme.CoralRed
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.viewmodel.PlacesUiState

/** K07 Địa điểm của tôi: tối đa 5 địa điểm quen thuộc (R1-015). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SavedPlacesScreen(
    state: PlacesUiState,
    onBackClick: () -> Unit,
    onRetry: () -> Unit,
    onUsePlace: (SavedPlace) -> Unit,
    onDeletePlace: (SavedPlace) -> Unit,
    onStartAdd: () -> Unit,
    onSearchAddress: (String) -> Unit,
    onSelectSuggestion: (AddressSuggestion) -> Unit,
    onUseDeviceLocation: () -> Unit,
    onCreatePlace: (label: String, radiusKm: Double?, onSuccess: () -> Unit) -> Unit,
    onConsumeMessage: () -> Unit
) {
    val snackbarHostState = remember { SnackbarHostState() }
    var showAddSheet by remember { mutableStateOf(false) }
    var pendingDelete by remember { mutableStateOf<SavedPlace?>(null) }
    val isFull = state.savedPlaces.size >= SavedPlace.MAX_PLACES

    LaunchedEffect(state.message) {
        state.message?.let { snackbarHostState.showSnackbar(it); onConsumeMessage() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Địa điểm của tôi", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = { IconButton(onClick = onBackClick) { Icon(Icons.Default.ArrowBack, contentDescription = "Quay lại") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            Column(Modifier.padding(16.dp)) {
                if (isFull) {
                    Text(
                        "Đã đủ ${SavedPlace.MAX_PLACES} địa điểm. Xóa bớt một địa điểm để thêm mới.",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                Button(
                    onClick = { onStartAdd(); showAddSheet = true },
                    enabled = !isFull && !state.isPlacesLoading,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(6.dp))
                    Text("Thêm địa điểm", fontWeight = FontWeight.Bold)
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        LoadStateContent(
            isLoading = state.isPlacesLoading,
            errorMessage = state.placesError,
            isEmpty = state.savedPlaces.isEmpty(),
            emptyIcon = Icons.Default.WhereToVote,
            emptyTitle = "Chưa có địa điểm nào",
            emptyMessage = "Lưu nhà, nơi làm việc để chuyển nhanh khu vực tìm deal.",
            onRetry = onRetry,
            modifier = Modifier.padding(padding)
        ) {
            LazyColumn(
                modifier = Modifier.padding(padding).fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(state.savedPlaces, key = { it.id }) { place ->
                    SavedPlaceCard(
                        place = place,
                        defaultRadiusKm = state.location.radiusKm,
                        onClick = { onUsePlace(place) },
                        onDelete = { pendingDelete = place }
                    )
                }
            }
        }
    }

    pendingDelete?.let { place ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Xóa \"${place.label}\"?") },
            text = { Text("Địa điểm sẽ bị xóa khỏi danh sách của bạn.") },
            confirmButton = {
                TextButton(onClick = { onDeletePlace(place); pendingDelete = null }) { Text("Xóa", color = CoralRed, fontWeight = FontWeight.Bold) }
            },
            dismissButton = { TextButton(onClick = { pendingDelete = null }) { Text("Hủy") } }
        )
    }

    if (showAddSheet) {
        AddPlaceSheet(
            state = state,
            onDismiss = { showAddSheet = false },
            onSearchAddress = onSearchAddress,
            onSelectSuggestion = onSelectSuggestion,
            onUseDeviceLocation = onUseDeviceLocation,
            onSave = { label, radius -> onCreatePlace(label, radius) { showAddSheet = false } }
        )
    }
}

@Composable
private fun SavedPlaceCard(place: SavedPlace, defaultRadiusKm: Double, onClick: () -> Unit, onDelete: () -> Unit) {
    val label = place.label.lowercase()
    val icon = when {
        "nhà" in label || "home" in label -> Icons.Default.Home
        "làm" in label || "công ty" in label || "văn phòng" in label || "work" in label -> Icons.Default.Work
        else -> Icons.Default.Place
    }
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(place.label, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Text(
                    place.address ?: "%.5f, %.5f".format(place.latitude, place.longitude),
                    fontSize = 12.sp,
                    color = TextSecondary,
                    maxLines = 2
                )
                Text(
                    place.radiusKm?.let { "Bán kính riêng ${formatRadius(it)}" } ?: "Theo bán kính chung ${formatRadius(defaultRadiusKm)}",
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Default.DeleteOutline, contentDescription = "Xóa ${place.label}", tint = TextMuted)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddPlaceSheet(
    state: PlacesUiState,
    onDismiss: () -> Unit,
    onSearchAddress: (String) -> Unit,
    onSelectSuggestion: (AddressSuggestion) -> Unit,
    onUseDeviceLocation: () -> Unit,
    onSave: (label: String, radiusKm: Double?) -> Unit
) {
    var label by remember { mutableStateOf("") }
    var hasOwnRadius by remember { mutableStateOf(false) }
    var radiusKm by remember { mutableDoubleStateOf(LocationSettings.DEFAULT_RADIUS_KM) }
    val requestPermission = rememberLocationPermissionRequest(onGranted = onUseDeviceLocation, onDenied = {})
    val labelValid = label.trim().length in 1..SavedPlace.MAX_LABEL_LENGTH

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp)
        ) {
            Text("Thêm địa điểm", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = label,
                onValueChange = { if (it.length <= SavedPlace.MAX_LABEL_LENGTH) label = it },
                label = { Text("Tên địa điểm (vd. Nhà, Nơi làm việc)") },
                supportingText = { Text("${label.length}/${SavedPlace.MAX_LABEL_LENGTH}") },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(8.dp))
            AddressSearchField(
                isSearching = state.isSearching,
                suggestions = state.suggestions,
                onSearch = onSearchAddress,
                onSelect = onSelectSuggestion
            )
            TextButton(onClick = requestPermission, enabled = !state.isLocating) {
                Icon(Icons.Default.MyLocation, contentDescription = null, modifier = Modifier.size(16.dp), tint = ForestGreenPrimary)
                Spacer(Modifier.width(6.dp))
                Text(if (state.isLocating) "Đang định vị..." else "Dùng vị trí hiện tại", color = ForestGreenPrimary)
            }
            Text(
                state.selected?.address ?: "Chưa chọn địa chỉ",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (state.selected != null) TextPrimary else TextMuted
            )
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = hasOwnRadius, onCheckedChange = { hasOwnRadius = it })
                Text("Đặt bán kính riêng cho địa điểm này", fontSize = 13.sp, color = TextPrimary)
            }
            if (hasOwnRadius) RadiusSlider(radiusKm = radiusKm, onRadiusChange = { radiusKm = it }, label = "Bán kính")
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = { onSave(label.trim(), radiusKm.takeIf { hasOwnRadius }) },
                enabled = labelValid && state.selected != null && !state.isSaving,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) {
                Text(if (state.isSaving) "Đang lưu..." else "Lưu địa điểm", fontWeight = FontWeight.Bold)
            }
        }
    }
}
