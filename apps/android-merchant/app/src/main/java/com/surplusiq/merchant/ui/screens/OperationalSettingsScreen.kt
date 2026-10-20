package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.SettingsHistoryDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.data.StoreSettingsDto
import com.surplusiq.merchant.data.UpdateStoreSettingsRequest
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.LocalTime
import kotlin.math.roundToInt

private val SETTING_LABELS = mapOf(
    "defaultPickupStart" to "Giờ nhận bắt đầu",
    "defaultPickupEnd" to "Giờ nhận kết thúc",
    "floorRatio" to "Giá sàn (tỷ lệ giá gốc)",
    "costPriceRatio" to "Tỷ lệ giá vốn",
    "pricingMode" to "Chế độ định giá",
    "lateGraceMinutes" to "Thời gian trễ cho phép",
    "maxQtyPerOrder" to "Suất tối đa mỗi đơn",
    "fixedDiscountSchedule" to "Lịch giảm giá cố định",
)

/**
 * S10 Cài đặt vận hành + S13 Quy tắc kinh doanh - gộp một màn vì backend chỉ có một tài nguyên
 * store/settings chứa cả hai nhóm field (lateGraceMinutes, maxQtyPerOrder nằm chung DTO).
 */
@Composable
fun OperationalSettingsScreen(repository: StoreRepository, onBack: () -> Unit) {
    var storeId by remember { mutableStateOf<String?>(null) }
    var isPro by remember { mutableStateOf(false) }
    var loaded by remember { mutableStateOf<StoreSettingsDto?>(null) }
    var history by remember { mutableStateOf<List<SettingsHistoryDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var tab by remember { mutableIntStateOf(0) }
    var saving by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }

    var pickupStart by remember { mutableStateOf("") }
    var pickupEnd by remember { mutableStateOf("") }
    var floorPct by remember { mutableStateOf("") }
    var pricingMode by remember { mutableStateOf("MANUAL") }
    var lateGrace by remember { mutableStateOf("") }
    var maxQty by remember { mutableIntStateOf(5) }
    val scope = rememberCoroutineScope()

    fun fill(s: StoreSettingsDto) {
        loaded = s
        pickupStart = s.defaultPickupStart.take(5)
        pickupEnd = s.defaultPickupEnd.take(5)
        floorPct = (s.floorRatio * 100).roundToInt().toString()
        pricingMode = s.pricingMode
        lateGrace = s.lateGraceMinutes.toString()
        maxQty = s.maxQtyPerOrder
    }

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            // store/settings lấy store từ header x-store-id -> phải đọc id từ hồ sơ trước.
            val id = repository.getStoreProfile().getOrElse { isLoading = false; error = it.message; return@launch }.store.id
            storeId = id
            isPro = repository.getSubscription().getOrNull()?.effectivePlan.let { it == "PRO" || it == "TRIAL" }
            val settings = repository.getStoreSettings(id)
            history = repository.getStoreSettingsHistory(id).getOrDefault(emptyList())
            isLoading = false
            settings.fold(onSuccess = ::fill, onFailure = { error = it.message })
        }
    }

    fun buildRequest(): Pair<UpdateStoreSettingsRequest?, String?> {
        val s = loaded ?: return null to "Chưa tải được cấu hình."
        if (!HHMM.matches(pickupStart) || !HHMM.matches(pickupEnd)) return null to "Giờ nhận phải có dạng HH:mm."
        val minutes = Duration.between(LocalTime.parse(pickupStart), LocalTime.parse(pickupEnd)).toMinutes()
        if (minutes <= 0) return null to "Giờ kết thúc phải sau giờ bắt đầu."
        if (minutes > 180) return null to "Khung giờ nhận tối đa 3 giờ."
        val minFloor = if (s.costPriceRatio != null) 10 else 40
        val pct = floorPct.toIntOrNull()
        if (pct == null || pct !in minFloor..100) return null to "Giá sàn phải trong khoảng $minFloor–100%."
        val late = lateGrace.toIntOrNull()
        if (late == null || late !in 0..30) return null to "Thời gian trễ phải trong khoảng 0–30 phút."
        if (maxQty !in 1..5) return null to "Suất tối đa mỗi đơn phải từ 1 đến 5."
        return UpdateStoreSettingsRequest(
            defaultPickupStart = pickupStart.takeIf { it != s.defaultPickupStart.take(5) },
            defaultPickupEnd = pickupEnd.takeIf { it != s.defaultPickupEnd.take(5) },
            floorRatio = (pct / 100.0).takeIf { pct != (s.floorRatio * 100).roundToInt() },
            pricingMode = pricingMode.takeIf { it != s.pricingMode },
            lateGraceMinutes = late.takeIf { it != s.lateGraceMinutes },
            maxQtyPerOrder = maxQty.takeIf { it != s.maxQtyPerOrder },
        ) to null
    }

    fun save() {
        val (request, validation) = buildRequest()
        formError = validation
        success = null
        val id = storeId
        if (request == null || id == null) return
        if (request == UpdateStoreSettingsRequest()) { success = "Không có thay đổi nào."; return }
        saving = true
        scope.launch {
            val result = repository.updateStoreSettings(id, isPro, request)
            saving = false
            result.fold(
                onSuccess = {
                    fill(it)
                    success = "Đã lưu cấu hình."
                    history = repository.getStoreSettingsHistory(id).getOrDefault(history)
                },
                onFailure = { formError = it.message }
            )
        }
    }

    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Cài đặt vận hành", onBack)
        Spacer(modifier = Modifier.height(8.dp))
        TabRow(selectedTabIndex = tab, containerColor = SqCanvas, contentColor = SqCoral) {
            listOf("Vận hành", "Quy tắc", "Lịch sử").forEachIndexed { i, label ->
                Tab(selected = tab == i, onClick = { tab = i }, text = { Text(label) })
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            tab == 2 -> HistoryList(history)
            else -> {
                if (tab == 0) {
                    SqCard {
                        Text("Khung giờ nhận mặc định", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row {
                            SqField("Bắt đầu", pickupStart, modifier = Modifier.weight(1f), placeholder = "19:00") { pickupStart = it.take(5) }
                            Spacer(modifier = Modifier.width(10.dp))
                            SqField("Kết thúc", pickupEnd, modifier = Modifier.weight(1f), placeholder = "21:00") { pickupEnd = it.take(5) }
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Tối đa 3 giờ.", fontSize = 11.sp, color = SqInkMuted)
                        Spacer(modifier = Modifier.height(12.dp))
                        SqField(
                            "Giá sàn (% giá gốc)", floorPct,
                            hint = if (loaded?.costPriceRatio != null) "Khoảng hợp lệ 10–100%" else "Khoảng hợp lệ 40–100% (dưới 40% cần khai báo giá vốn)"
                        ) { floorPct = it.filter(Char::isDigit).take(3) }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    SqCard {
                        Text("Chế độ định giá", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                        Spacer(modifier = Modifier.height(8.dp))
                        ModeCard("Duyệt tay", "Hệ thống chỉ đề xuất giá, bạn duyệt từng lần.", pricingMode == "MANUAL", true) { pricingMode = "MANUAL" }
                        Spacer(modifier = Modifier.height(8.dp))
                        ModeCard(
                            "Tự động", if (isPro) "Tự áp dụng đề xuất trong khoảng giá sàn – giá gốc." else "Chỉ dành cho gói Pro.",
                            pricingMode == "AUTO", isPro
                        ) { pricingMode = "AUTO" }
                    }
                } else {
                    SqCard {
                        Text("Suất tối đa mỗi đơn", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                        Text("Nền tảng cho phép 1–5", fontSize = 11.sp, color = SqInkMuted)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(onClick = { maxQty-- }, enabled = maxQty > 1) { Text("−") }
                            Text("$maxQty", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.padding(horizontal = 20.dp))
                            OutlinedButton(onClick = { maxQty++ }, enabled = maxQty < 5) { Text("+") }
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        SqField("Thời gian trễ cho phép (phút)", lateGrace, hint = "Nền tảng cho phép 0–30 phút") {
                            lateGrace = it.filter(Char::isDigit).take(2)
                        }
                    }
                }
                InlineError(formError)
                InlineSuccess(success)
                Spacer(modifier = Modifier.height(12.dp))
                PrimaryButton("Lưu cấu hình", loading = saving, onClick = ::save)
            }
        }
    }
}

@Composable
private fun ModeCard(title: String, subtitle: String, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp))
            .background(if (selected) SqCoralWash else SqSurfaceSoft)
            .border(1.dp, if (selected) SqCoral else SqLine, RoundedCornerShape(14.dp))
            .clickable(enabled = enabled, onClick = onClick).padding(14.dp)
    ) {
        Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (enabled) SqInk else SqInkMuted)
        Text(subtitle, fontSize = 12.sp, color = SqInkSoft)
    }
}

@Composable
private fun HistoryList(history: List<SettingsHistoryDto>) {
    if (history.isEmpty()) {
        EmptyState("Chưa có thay đổi", "Mỗi lần lưu cấu hình sẽ được ghi lại ở đây.")
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        history.forEach { h ->
            SqCard {
                Text(SETTING_LABELS[h.key] ?: h.key, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                Text("${h.oldValue ?: "—"}  →  ${h.newValue ?: "—"}", fontSize = 13.sp, color = SqInkSoft)
                Text(shortDateTime(h.createdAt), fontSize = 11.sp, color = SqInkMuted)
            }
        }
    }
}
