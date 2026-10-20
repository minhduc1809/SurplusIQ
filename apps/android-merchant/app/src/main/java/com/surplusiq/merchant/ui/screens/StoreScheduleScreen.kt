package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CreateClosureRequest
import com.surplusiq.merchant.data.DayHoursDto
import com.surplusiq.merchant.data.StoreClosureDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

private const val MAX_RANGE_DAYS = 31L

/** S12 - Lịch cửa hàng (GET/POST/DELETE store/closures). Backend lưu theo từng ngày -> khoảng ngày gửi lần lượt. */
@Composable
fun StoreScheduleScreen(repository: StoreRepository, onBack: () -> Unit) {
    var closures by remember { mutableStateOf<List<StoreClosureDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var month by remember { mutableStateOf(YearMonth.now()) }
    var fromDate by remember { mutableStateOf<LocalDate?>(null) }
    var toDate by remember { mutableStateOf<LocalDate?>(null) }
    var type by remember { mutableStateOf("CLOSED") }
    var openTime by remember { mutableStateOf("08:00") }
    var closeTime by remember { mutableStateOf("12:00") }
    var saving by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val today = LocalDate.now()

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getClosures()
            isLoading = false
            result.fold(onSuccess = { closures = it }, onFailure = { error = it.message })
        }
    }

    fun onDayClick(d: LocalDate) {
        val from = fromDate
        if (from == null || toDate != null || d < from) { fromDate = d; toDate = null } else toDate = d
        formError = null
        success = null
    }

    fun save() {
        val from = fromDate ?: return
        val to = toDate ?: from
        if (to.toEpochDay() - from.toEpochDay() >= MAX_RANGE_DAYS) { formError = "Mỗi lần khai báo tối đa $MAX_RANGE_DAYS ngày."; return }
        if (type == "SPECIAL_HOURS") {
            if (!HHMM.matches(openTime) || !HHMM.matches(closeTime)) { formError = "Giờ phải có dạng HH:mm."; return }
            if (closeTime <= openTime) { formError = "Giờ đóng phải sau giờ mở."; return }
        }
        saving = true
        formError = null
        scope.launch {
            var d = from
            while (d <= to) {
                val request = CreateClosureRequest(
                    date = d.toString(), type = type,
                    openHours = if (type == "SPECIAL_HOURS") DayHoursDto(openTime, closeTime) else null
                )
                val failure = repository.createClosure(request).exceptionOrNull()
                if (failure != null) { formError = "Ngày ${shortDate(d.toString())}: ${failure.message}"; break }
                d = d.plusDays(1)
            }
            saving = false
            if (formError == null) { success = "Đã lưu khai báo."; fromDate = null; toDate = null }
            load()
        }
    }

    fun delete(c: StoreClosureDto) {
        scope.launch {
            repository.deleteClosure(c.id).fold(onSuccess = { load() }, onFailure = { formError = it.message })
        }
    }

    LaunchedEffect(Unit) { load() }

    val byDate = closures.associateBy { it.date.take(10) }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Lịch cửa hàng", onBack)
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            else -> {
                SqCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { month = month.minusMonths(1) }) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Tháng trước")
                        }
                        Text(
                            "Tháng ${month.monthValue}/${month.year}", modifier = Modifier.weight(1f),
                            fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        IconButton(onClick = { month = month.plusMonths(1) }) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Tháng sau")
                        }
                    }
                    MonthGrid(month, today, byDate, fromDate, toDate ?: fromDate, ::onDayClick)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Legend(SqCoralWash, "Nghỉ")
                        Legend(SqButterWash, "Giờ đặc biệt")
                        Legend(SqLilacWash, "Đang chọn")
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    Text("Khai báo", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                    Spacer(modifier = Modifier.height(6.dp))
                    val from = fromDate
                    Text(
                        text = when {
                            from == null -> "Chạm một ngày (hoặc hai ngày để chọn khoảng) trên lịch."
                            toDate == null || toDate == from -> "Ngày ${shortDate(from.toString())}"
                            else -> "Từ ${shortDate(from.toString())} đến ${shortDate(toDate.toString())}"
                        },
                        fontSize = 13.sp, color = SqInkSoft
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SqChip("Nghỉ", type == "CLOSED") { type = "CLOSED" }
                        SqChip("Giờ đặc biệt", type == "SPECIAL_HOURS") { type = "SPECIAL_HOURS" }
                    }
                    if (type == "SPECIAL_HOURS") {
                        Spacer(modifier = Modifier.height(10.dp))
                        Row {
                            SqField("Mở", openTime, modifier = Modifier.weight(1f)) { openTime = it.take(5) }
                            Spacer(modifier = Modifier.width(10.dp))
                            SqField("Đóng", closeTime, modifier = Modifier.weight(1f)) { closeTime = it.take(5) }
                        }
                    }
                    InlineError(formError)
                    InlineSuccess(success)
                    Spacer(modifier = Modifier.height(8.dp))
                    PrimaryButton("Lưu khai báo", enabled = from != null, loading = saving, onClick = ::save)
                }
                Spacer(modifier = Modifier.height(12.dp))

                Text("Sắp tới", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Spacer(modifier = Modifier.height(8.dp))
                val upcoming = closures.filter { it.date.take(10) >= today.toString() }
                if (upcoming.isEmpty()) {
                    EmptyState("Chưa có khai báo", "Ngày nghỉ và giờ đặc biệt sắp tới sẽ hiện ở đây.")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        upcoming.forEach { c ->
                            Row(
                                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(SqSurface).padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(shortDate(c.date), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                                    Text(
                                        if (c.type == "SPECIAL_HOURS") "Giờ đặc biệt ${c.openHours?.open ?: ""}–${c.openHours?.close ?: ""}" else "Nghỉ cả ngày",
                                        fontSize = 12.sp, color = SqInkSoft
                                    )
                                }
                                IconButton(onClick = {
                                    val d = LocalDate.parse(c.date.take(10))
                                    fromDate = d; toDate = null; month = YearMonth.from(d)
                                    type = c.type
                                    c.openHours?.open?.let { openTime = it }
                                    c.openHours?.close?.let { closeTime = it }
                                }) { Icon(Icons.Default.Edit, contentDescription = "Sửa", tint = SqInkSoft) }
                                IconButton(onClick = { delete(c) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Xóa", tint = SqCoralDeep)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MonthGrid(
    month: YearMonth,
    today: LocalDate,
    byDate: Map<String, StoreClosureDto>,
    from: LocalDate?,
    to: LocalDate?,
    onDayClick: (LocalDate) -> Unit
) {
    val offset = month.atDay(1).dayOfWeek.value - 1 // Thứ 2 = cột đầu
    val cells = List(offset) { null } + (1..month.lengthOfMonth()).map { month.atDay(it) }
    Row {
        listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN").forEach {
            Text(it, modifier = Modifier.weight(1f), fontSize = 11.sp, color = SqInkMuted, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        }
    }
    cells.chunked(7).forEach { week ->
        Row {
            (0 until 7).forEach { i ->
                val d = week.getOrNull(i)
                val closure = d?.let { byDate[it.toString()] }
                val selected = d != null && from != null && to != null && d in from..to
                val bg = when {
                    selected -> SqLilacWash
                    closure?.type == "CLOSED" -> SqCoralWash
                    closure?.type == "SPECIAL_HOURS" -> SqButterWash
                    else -> Color.Transparent
                }
                Box(
                    modifier = Modifier.weight(1f).aspectRatio(1f).padding(2.dp).clip(RoundedCornerShape(8.dp)).background(bg)
                        .then(if (d == today) Modifier.border(1.dp, SqCoral, RoundedCornerShape(8.dp)) else Modifier)
                        .then(if (d != null && d >= today) Modifier.clickable { onDayClick(d) } else Modifier),
                    contentAlignment = Alignment.Center
                ) {
                    if (d != null) Text("${d.dayOfMonth}", fontSize = 13.sp, color = if (d < today) SqInkMuted else SqInk)
                }
            }
        }
    }
}

@Composable
private fun Legend(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(12.dp).clip(RoundedCornerShape(3.dp)).background(color))
        Spacer(modifier = Modifier.width(4.dp))
        Text(label, fontSize = 11.sp, color = SqInkSoft)
    }
}
