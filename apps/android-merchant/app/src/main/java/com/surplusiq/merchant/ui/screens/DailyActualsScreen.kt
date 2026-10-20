package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
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
import com.surplusiq.merchant.data.DailyActualRequest
import com.surplusiq.merchant.data.ItemDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.UpdateTaskRemindersRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId

private class ActualRow(val item: ItemDto, val soldApp: Int) {
    var produced by mutableStateOf("")
    var soldOffline by mutableStateOf("")
    var stockout by mutableStateOf("")
}

private val HH_MM = Regex("^([01]\\d|2[0-3]):[0-5]\\d$")

/**
 * S33 - Nhập số thực tế cuối ngày (POST store/forecast/actuals, mỗi món một lần gọi).
 * "Bán qua app" = tổng soldQuantity các suất của món trong ngày (GET store/offers?date=).
 * Backend không có API đọc lại số đã nhập - lưu lần nữa sẽ ghi đè.
 */
@Composable
fun DailyActualsScreen(repository: StoreRepository, onBack: () -> Unit) {
    var date by remember { mutableStateOf(LocalDate.now()) }
    var rows by remember { mutableStateOf<List<ActualRow>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var saving by remember { mutableStateOf(false) }
    var saveError by remember { mutableStateOf<String?>(null) }
    var saved by remember { mutableStateOf<String?>(null) }
    var reminderOn by remember { mutableStateOf<Boolean?>(null) }
    var reminderTime by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(date, reloadKey) {
        error = null
        rows = null
        val items = repository.getItems(status = "ACTIVE", sortBy = "name", sortOrder = "ASC", limit = 100)
        val offers = repository.getOffers(date.toString(), limit = 100)
        val failure = items.exceptionOrNull() ?: offers.exceptionOrNull()
        if (failure != null) { error = failure.message; return@LaunchedEffect }
        val appSold = offers.getOrThrow().data.groupBy { it.itemId }.mapValues { (_, list) -> list.sumOf { it.soldQuantity } }
        rows = items.getOrThrow().data.map { ActualRow(it, appSold[it.id] ?: 0) }
    }
    LaunchedEffect(Unit) {
        repository.getTodayTasks().onSuccess { reminderOn = it.reminders.actualsEntry; reminderTime = it.reminders.reminderTime }
    }

    fun save() {
        val list = rows ?: return
        saveError = null
        saved = null
        val filled = list.filter { it.produced.isNotBlank() }
        if (filled.isEmpty()) { saveError = "Nhập Số đã làm cho ít nhất một món."; return }
        filled.forEach { r ->
            val produced = r.produced.toInt()
            val offline = r.soldOffline.toIntOrNull() ?: 0
            if (offline + r.soldApp > produced) { saveError = "${r.item.name}: số bán (${offline + r.soldApp}) lớn hơn số đã làm."; return }
            if (r.stockout.isNotBlank() && !HH_MM.matches(r.stockout)) { saveError = "${r.item.name}: giờ hết hàng phải có dạng HH:mm."; return }
        }
        saving = true
        scope.launch {
            val failed = filled.mapNotNull { r ->
                val stockoutAt = r.stockout.takeIf { it.isNotBlank() }?.let {
                    date.atTime(LocalTime.parse(it)).atZone(ZoneId.systemDefault()).toInstant().toString()
                }
                repository.logDailyActual(
                    DailyActualRequest(r.item.id, date.toString(), r.produced.toInt(), r.soldOffline.toIntOrNull() ?: 0, r.soldApp, stockoutAt)
                ).exceptionOrNull()?.let { "${r.item.name}: ${it.message}" }
            }
            saving = false
            if (failed.isEmpty()) saved = "Đã lưu ${filled.size} món. Số liệu giúp dự báo chính xác hơn."
            else saveError = failed.joinToString("\n")
        }
    }

    fun toggleReminder(on: Boolean) {
        reminderOn = on
        scope.launch {
            repository.updateTaskReminders(UpdateTaskRemindersRequest(actualsEntryReminder = on))
                .onFailure { reminderOn = !on; saveError = it.message }
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Số thực tế cuối ngày", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SqChip("Hôm nay", date == LocalDate.now()) { date = LocalDate.now() }
            SqChip("Hôm qua", date == LocalDate.now().minusDays(1)) { date = LocalDate.now().minusDays(1) }
        }
        reminderOn?.let { on ->
            Spacer(modifier = Modifier.height(12.dp))
            SqCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Nhắc nhập hằng ngày", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                        Text("Lúc $reminderTime", fontSize = 12.sp, color = SqInkSoft)
                    }
                    Switch(checked = on, onCheckedChange = ::toggleReminder, colors = SwitchDefaults.colors(checkedTrackColor = SqCoral))
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        when {
            error != null -> ErrorState(error!!) { reloadKey++ }
            rows == null -> FullScreenLoading()
            rows!!.isEmpty() -> EmptyState("Chưa có món đang bán", "Thêm món ở tab Món trước khi nhập số thực tế.")
            else -> {
                rows!!.forEach { r ->
                    SqCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(r.item.name, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.weight(1f))
                            Text("Bán qua app: ${r.soldApp}", fontSize = 12.sp, color = SqMintDeep, fontWeight = FontWeight.SemiBold)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            SqField("Số đã làm", r.produced, Modifier.weight(1f), keyboardType = KeyboardType.Number) { r.produced = it.filter(Char::isDigit).take(4) }
                            SqField("Bán tại quầy", r.soldOffline, Modifier.weight(1f), keyboardType = KeyboardType.Number) { r.soldOffline = it.filter(Char::isDigit).take(4) }
                            SqField("Hết sớm lúc", r.stockout, Modifier.weight(1f), placeholder = "HH:mm") { r.stockout = it.take(5) }
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                }
                InlineError(saveError)
                InlineSuccess(saved)
                PrimaryButton("Lưu số thực tế", loading = saving, onClick = ::save)
            }
        }
    }
}
