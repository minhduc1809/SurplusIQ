package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.CreateSpecialEventRequest
import com.surplusiq.merchant.data.SpecialEventDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

// type lưu dạng mã (SpecialEventType của @surplusiq/core); backend nhận chuỗi tự do ≤100 ký tự.
private val EVENT_TYPES = listOf(
    Triple("HOLIDAY", "Lễ", SqCoral),
    Triple("PROMOTION", "Khuyến mãi", SqButter),
    Triple("LOCAL_EVENT", "Sự kiện", SqLilac),
    Triple("CLOSURE", "Đóng cửa", SqInkMuted),
)
// Mức ảnh hưởng -> impactFactor (1.25 = tăng 25%). Đóng cửa luôn 0.
private val IMPACTS = listOf(0.8 to "Giảm", 1.0 to "Trung bình", 1.25 to "Tăng")

private fun typeOf(code: String) = EVENT_TYPES.firstOrNull { it.first == code } ?: Triple(code, code, SqInkSoft)

private fun impactLabel(factor: Double) = when {
    factor == 0.0 -> "Không bán"
    factor < 1.0 -> "Giảm"
    factor > 1.0 -> "Tăng"
    else -> "Trung bình"
}

/**
 * S34 - Sự kiện đặc biệt (GET/POST/DELETE store/special-events).
 * Backend không có cột ghi chú và không có API sửa -> chỉ tạo / xóa.
 */
@Composable
fun SpecialEventsScreen(repository: StoreRepository, onBack: () -> Unit) {
    var events by remember { mutableStateOf<List<SpecialEventDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var month by remember { mutableStateOf(YearMonth.now()) }
    var date by remember { mutableStateOf(LocalDate.now().toString()) }
    var type by remember { mutableStateOf("HOLIDAY") }
    var impact by remember { mutableDoubleStateOf(1.25) }
    var saving by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    var toDelete by remember { mutableStateOf<SpecialEventDto?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(reloadKey) {
        error = null
        repository.getSpecialEvents().fold(onSuccess = { events = it }, onFailure = { error = it.message })
    }

    fun create() {
        formError = null
        val parsed = runCatching { LocalDate.parse(date) }.getOrNull()
        when {
            parsed == null -> { formError = "Ngày phải có dạng YYYY-MM-DD."; return }
            parsed < LocalDate.now() -> { formError = "Chỉ khai báo sự kiện từ hôm nay trở đi."; return }
            events.orEmpty().any { it.date == date && it.type == type } -> { formError = "Ngày này đã có sự kiện cùng loại."; return }
        }
        saving = true
        scope.launch {
            val factor = if (type == "CLOSURE") 0.0 else impact
            val r = repository.createSpecialEvent(CreateSpecialEventRequest(date, type, factor))
            saving = false
            r.fold(onSuccess = { reloadKey++ }, onFailure = { formError = it.message })
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Sự kiện đặc biệt", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            events == null -> FullScreenLoading()
            else -> {
                EventCalendar(month, events!!, onMonth = { month = it }, onPick = { date = it.toString() })
                Spacer(modifier = Modifier.height(12.dp))

                SqCard {
                    SectionTitle("Khai báo sự kiện")
                    Spacer(modifier = Modifier.height(10.dp))
                    SqField("Ngày", date, placeholder = "2026-10-20", hint = "Chạm vào ngày trên lịch để chọn nhanh.") { date = it.take(10) }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Loại", fontSize = 12.sp, color = SqInkSoft)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        EVENT_TYPES.forEach { (code, label, _) -> SqChip(label, type == code) { type = code } }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Mức ảnh hưởng", fontSize = 12.sp, color = SqInkSoft)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        IMPACTS.forEach { (f, label) ->
                            SqChip(label, type != "CLOSURE" && impact == f, enabled = type != "CLOSURE") { impact = f }
                        }
                    }
                    InlineError(formError)
                    Spacer(modifier = Modifier.height(10.dp))
                    PrimaryButton("Thêm sự kiện", loading = saving, onClick = ::create)
                }

                Spacer(modifier = Modifier.height(16.dp))
                SectionTitle("Sự kiện sắp tới")
                Spacer(modifier = Modifier.height(8.dp))
                val upcoming = events!!.filter { it.date >= LocalDate.now().toString() }
                if (upcoming.isEmpty()) {
                    EmptyState("Chưa có sự kiện", "Khai báo ngày lễ, khuyến mãi hoặc ngày nghỉ để dự báo sát thực tế hơn.")
                } else {
                    Column(modifier = Modifier.clip(RoundedCornerShape(16.dp)).background(SqSurface)) {
                        upcoming.forEach { e ->
                            val (_, label, color) = typeOf(e.type)
                            Row(modifier = Modifier.fillMaxWidth().padding(start = 16.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(color))
                                Spacer(modifier = Modifier.width(10.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("${shortDate(e.date)} · $label", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                                    Text("Ảnh hưởng: ${impactLabel(e.impactFactor)} (×%.2f)".format(e.impactFactor), fontSize = 12.sp, color = SqInkSoft)
                                }
                                IconButton(onClick = { toDelete = e }) {
                                    Icon(Icons.Default.DeleteOutline, contentDescription = "Xóa sự kiện ${shortDate(e.date)}", tint = SqInkMuted)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    toDelete?.let { e ->
        ConfirmDialog(
            title = "Xóa sự kiện?",
            message = "${shortDate(e.date)} · ${typeOf(e.type).second}",
            confirmLabel = "Xóa",
            onDismiss = { toDelete = null },
            onConfirm = {
                toDelete = null
                scope.launch { repository.deleteSpecialEvent(e.id).fold(onSuccess = { reloadKey++ }, onFailure = { formError = it.message }) }
            }
        )
    }
}

@Composable
private fun EventCalendar(month: YearMonth, events: List<SpecialEventDto>, onMonth: (YearMonth) -> Unit, onPick: (LocalDate) -> Unit) {
    val byDate = events.groupBy { it.date }
    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { onMonth(month.minusMonths(1)) }) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Tháng trước", tint = SqInk)
            }
            Text("Tháng ${month.monthValue}/${month.year}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk,
                modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            IconButton(onClick = { onMonth(month.plusMonths(1)) }) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Tháng sau", tint = SqInk)
            }
        }
        Row {
            listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN").forEach {
                Text(it, fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.weight(1f), textAlign = TextAlign.Center)
            }
        }
        val lead = month.atDay(1).dayOfWeek.value - 1 // Thứ Hai = cột đầu
        val cells = List(lead) { null } + (1..month.lengthOfMonth()).map { month.atDay(it) }
        cells.chunked(7).forEach { week ->
            Row {
                week.forEach { day -> DayCell(day, byDate[day?.toString()].orEmpty(), Modifier.weight(1f), onPick) }
                repeat(7 - week.size) { Spacer(modifier = Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun DayCell(day: LocalDate?, dayEvents: List<SpecialEventDto>, modifier: Modifier, onPick: (LocalDate) -> Unit) {
    if (day == null) { Spacer(modifier = modifier.height(40.dp)); return }
    val isToday = day == LocalDate.now()
    Column(
        modifier = modifier.height(40.dp).clip(RoundedCornerShape(10.dp))
            .then(if (isToday) Modifier.border(1.dp, SqCoral, RoundedCornerShape(10.dp)) else Modifier)
            .clickable { onPick(day) },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("${day.dayOfMonth}", fontSize = 13.sp, color = SqInk)
        Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            dayEvents.take(3).forEach { e ->
                Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(typeOf(e.type).third))
            }
        }
    }
}
