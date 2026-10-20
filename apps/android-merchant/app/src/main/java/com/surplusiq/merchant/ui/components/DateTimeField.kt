package com.surplusiq.merchant.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Event
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.ui.theme.*
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

private val DISPLAY = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")

/** LocalDateTime giờ máy -> ISO UTC gửi backend. */
fun LocalDateTime.toIsoUtc(): String = atZone(ZoneId.systemDefault()).toInstant().toString()

/** Ô chọn ngày giờ: bấm mở lịch rồi chọn giờ; [value] null = chưa chọn. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DateTimeField(label: String, value: LocalDateTime?, modifier: Modifier = Modifier, onChange: (LocalDateTime) -> Unit) {
    var step by remember { mutableIntStateOf(0) } // 0 đóng, 1 chọn ngày, 2 chọn giờ
    var pickedDate by remember { mutableStateOf(value ?: LocalDateTime.now()) }

    Column(modifier = modifier) {
        Text(label, fontSize = 12.sp, color = SqInkSoft)
        Spacer(Modifier.height(4.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(SqSurfaceSoft)
                .border(1.dp, SqLine, RoundedCornerShape(14.dp))
                .clickable { pickedDate = value ?: LocalDateTime.now().plusHours(1).withMinute(0); step = 1 }
                .padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Event, contentDescription = null, tint = SqCoralDeep, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(10.dp))
            Text(
                value?.format(DISPLAY) ?: "Chọn ngày giờ",
                fontSize = 14.sp, fontWeight = FontWeight.Medium, color = if (value == null) SqInkMuted else SqInk
            )
        }
    }

    if (step == 1) {
        val state = rememberDatePickerState(initialSelectedDateMillis = pickedDate.toLocalDate().atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { step = 0 },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let {
                        pickedDate = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().atTime(pickedDate.toLocalTime())
                    }
                    step = 2
                }) { Text("Tiếp", color = SqCoral) }
            },
            dismissButton = { TextButton(onClick = { step = 0 }) { Text("Hủy", color = SqInkSoft) } }
        ) { DatePicker(state = state) }
    }
    if (step == 2) {
        val t = rememberTimePickerState(initialHour = pickedDate.hour, initialMinute = pickedDate.minute, is24Hour = true)
        AlertDialog(
            onDismissRequest = { step = 0 },
            containerColor = SqSurface,
            text = { TimePicker(state = t) },
            confirmButton = {
                TextButton(onClick = {
                    onChange(pickedDate.withHour(t.hour).withMinute(t.minute).withSecond(0).withNano(0))
                    step = 0
                }) { Text("Chọn", color = SqCoral) }
            },
            dismissButton = { TextButton(onClick = { step = 0 }) { Text("Hủy", color = SqInkSoft) } }
        )
    }
}
