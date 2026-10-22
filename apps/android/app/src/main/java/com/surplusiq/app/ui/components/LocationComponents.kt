package com.surplusiq.app.ui.components

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.BuildConfig
import com.surplusiq.app.domain.model.AddressSuggestion
import com.surplusiq.app.domain.model.LocationSettings
import com.surplusiq.app.ui.theme.AmberLight
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextMuted
import com.surplusiq.app.ui.theme.TextPrimary
import com.surplusiq.app.ui.theme.TextSecondary
import com.surplusiq.app.ui.theme.WarningOnLight
import kotlin.math.roundToInt

fun formatRadius(km: Double): String = if (km < 1) "${(km * 1000).roundToInt()} m" else "%.1f km".format(km)

/** Ô tìm địa chỉ (Geocoder trên máy) + danh sách gợi ý; dùng ở K06, K07, K08. */
@Composable
fun AddressSearchField(
    isSearching: Boolean,
    suggestions: List<AddressSuggestion>,
    onSearch: (String) -> Unit,
    onSelect: (AddressSuggestion) -> Unit,
    modifier: Modifier = Modifier
) {
    var query by rememberSaveable { mutableStateOf("") }
    Column(modifier) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Nhập địa chỉ...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextMuted) },
            trailingIcon = {
                if (isSearching) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = ForestGreenPrimary)
                else TextButton(onClick = { onSearch(query) }, enabled = query.isNotBlank()) { Text("Tìm") }
            },
            singleLine = true,
            shape = RoundedCornerShape(14.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { onSearch(query) }),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                unfocusedContainerColor = MaterialTheme.colorScheme.surface
            ),
            modifier = Modifier.fillMaxWidth()
        )
        if (suggestions.isNotEmpty()) {
            SqCard(
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
                modifier = Modifier.fillMaxWidth().padding(top = 6.dp)
            ) {
                suggestions.forEachIndexed { index, suggestion ->
                    if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(suggestion); query = "" }
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Place, contentDescription = null, tint = ForestGreenPrimary, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(suggestion.address, fontSize = 13.sp, color = TextPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}

/** Thanh trượt bán kính 0,5-10 km, bước 0,5 km. */
@Composable
fun RadiusSlider(
    radiusKm: Double,
    onRadiusChange: (Double) -> Unit,
    modifier: Modifier = Modifier,
    label: String = "Bán kính tìm suất"
) {
    val min = LocationSettings.MIN_RADIUS_KM
    val max = LocationSettings.MAX_RADIUS_KM
    Column(modifier) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Text(formatRadius(radiusKm), fontSize = 14.sp, fontWeight = FontWeight.Bold, color = ForestGreenPrimary)
        }
        Slider(
            value = radiusKm.toFloat(),
            onValueChange = { onRadiusChange(((it * 2).roundToInt() / 2.0).coerceIn(min, max)) },
            valueRange = min.toFloat()..max.toFloat(),
            steps = ((max - min) / 0.5).toInt() - 1,
            colors = SliderDefaults.colors(thumbColor = ForestGreenPrimary, activeTrackColor = ForestGreenPrimary)
        )
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(formatRadius(min), fontSize = 11.sp, color = TextMuted)
            Text(formatRadius(max), fontSize = 11.sp, color = TextMuted)
        }
    }
}

/** Trả về hàm xin quyền vị trí; gọi onGranted khi khách cấp ít nhất quyền vị trí gần đúng. */
@Composable
fun rememberLocationPermissionRequest(onGranted: () -> Unit, onDenied: () -> Unit): () -> Unit {
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { result ->
        if (result.values.any { it }) onGranted() else onDenied()
    }
    return {
        launcher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
    }
}

/** Google Maps cần MAPS_API_KEY trong local.properties; thiếu key thì bản đồ chỉ hiện nền trống. */
@Composable
fun MapsKeyNotice(modifier: Modifier = Modifier) {
    if (BuildConfig.MAPS_API_KEY.isNotBlank()) return
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(AmberLight)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.WarningAmber, contentDescription = null, tint = WarningOnLight, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(
            "Bản đồ chưa hiển thị: bản build này chưa cấu hình MAPS_API_KEY. Danh sách và tìm địa chỉ vẫn hoạt động.",
            fontSize = 12.sp,
            color = TextSecondary
        )
    }
}
