package com.surplusiq.app.ui.screens.discovery

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.app.domain.model.RadarSettings
import com.surplusiq.app.domain.model.RadarWindow
import com.surplusiq.app.ui.theme.ForestGreenPrimary
import com.surplusiq.app.ui.theme.TextSecondary

/** KC15 Thiết lập Radar: điểm xuất phát, khung giờ nhận, ngân sách, lọc dị ứng, ưu tiên nhận kịp. */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun RadarSettingsSheet(
    settings: RadarSettings,
    locationLabel: String?,
    onDismiss: () -> Unit,
    onOpenLocation: () -> Unit,
    onApply: (RadarSettings) -> Unit
) {
    var budget by remember { mutableStateOf(settings.budgetMax?.toString().orEmpty()) }
    var window by remember { mutableStateOf(settings.window) }
    var hideAllergens by remember { mutableStateOf(settings.hideMyAllergens) }
    var inTime by remember { mutableStateOf(settings.prioritizeInTime) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 28.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text("Thiết lập Radar", fontWeight = FontWeight.Bold, fontSize = 18.sp)

            Column {
                Text("Điểm xuất phát", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(locationLabel ?: "Chưa chọn vị trí: Radar chưa tính được khoảng cách", fontSize = 13.sp, color = TextSecondary, modifier = Modifier.weight(1f))
                    TextButton(onClick = onOpenLocation) { Text("Đổi", color = ForestGreenPrimary) }
                }
            }

            Column {
                Text("Khung giờ nhận", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    RadarWindow.entries.forEach { w ->
                        FilterChip(selected = window == w, onClick = { window = w }, label = { Text(w.label) })
                    }
                }
            }

            OutlinedTextField(
                value = budget,
                onValueChange = { budget = it.filter(Char::isDigit).take(7) },
                label = { Text("Ngân sách tối đa mỗi suất (đ), bỏ trống nếu không giới hạn") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Ẩn món có chất gây dị ứng của tôi", fontSize = 14.sp)
                    Text("Theo hồ sơ ăn uống của bạn", fontSize = 11.sp, color = TextSecondary)
                }
                Switch(checked = hideAllergens, onCheckedChange = { hideAllergens = it })
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Ưu tiên deal nhận kịp", fontSize = 14.sp)
                    Text("Ẩn suất còn dưới 15 phút và ưu tiên thời gian còn lại", fontSize = 11.sp, color = TextSecondary)
                }
                Switch(checked = inTime, onCheckedChange = { inTime = it })
            }

            Button(
                onClick = { onApply(RadarSettings(budget.toIntOrNull()?.takeIf { it > 0 }, window, hideAllergens, inTime)) },
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreenPrimary),
                modifier = Modifier.fillMaxWidth().height(48.dp)
            ) { Text("Áp dụng") }
        }
    }
}
