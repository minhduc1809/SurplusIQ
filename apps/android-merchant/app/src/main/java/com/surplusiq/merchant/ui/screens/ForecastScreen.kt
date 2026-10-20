package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ForecastDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

private val CONFIDENCE = mapOf(
    "LOW" to Triple("Tin cậy thấp", SqCoralWash, SqCoralDeep),
    "MEDIUM" to Triple("Tin cậy vừa", SqButterWash, SqInk),
    "HIGH" to Triple("Tin cậy cao", SqMintWash, SqMintDeep),
)

@Composable
internal fun ConfidenceBadge(confidence: String?) {
    val (label, bg, fg) = CONFIDENCE[confidence] ?: Triple("Chưa rõ", SqSurfaceSoft, SqInkSoft)
    Text(
        label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = fg,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(bg).padding(horizontal = 8.dp, vertical = 3.dp)
    )
}

/** Backend gắn emoji vào chuỗi cảnh báo - bỏ đi, giao diện dùng icon Material. */
internal fun stripSymbols(text: String) = text.replace(Regex("[\\p{So}\\uFE0F]"), "").trim()

internal fun forecastMethodLabel(method: String?) = when (method) {
    "DOW_AVG" -> "Trung bình các ngày cùng thứ"
    "YESTERDAY_FALLBACK" -> "Theo ngày gần nhất (chưa đủ 14 ngày dữ liệu)"
    else -> method ?: "—"
}

/** S32 - Dự báo số lượng ngày mai (GET store/forecast, POST store/forecast/:id/override). Gói Pro. */
@Composable
fun ForecastScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Dự báo số lượng", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        ProGate(repository, "Dự báo số lượng", onUpgrade = { onNavigate("subscription") }) {
            ForecastContent(repository)
        }
    }
}

@Composable
private fun ForecastContent(repository: StoreRepository) {
    val targetDate = remember { LocalDate.now().plusDays(1).toString() }
    var forecasts by remember { mutableStateOf<List<ForecastDto>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        error = null
        repository.getForecasts(targetDate).fold(onSuccess = { forecasts = it }, onFailure = { error = it.message })
    }

    Text("Cho ngày ${shortDate(targetDate)}", fontSize = 13.sp, color = SqInkSoft)
    Spacer(modifier = Modifier.height(12.dp))
    when {
        error != null -> ErrorState(error!!) { reloadKey++ }
        forecasts == null -> FullScreenLoading()
        forecasts!!.isEmpty() -> EmptyState("Chưa có món đang bán", "Thêm món ở tab Món để hệ thống dự báo số lượng.")
        else -> Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            forecasts!!.forEach { f -> ForecastCard(f, repository, onSaved = { reloadKey++ }) }
        }
    }
}

@Composable
private fun ForecastCard(f: ForecastDto, repository: StoreRepository, onSaved: () -> Unit) {
    var showWhy by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    var qty by remember(f.id, f.chosenQuantity) { mutableStateOf((f.chosenQuantity ?: f.recommended).toString()) }
    var reason by remember(f.id) { mutableStateOf(f.overrideReason.orEmpty()) }
    var saving by remember { mutableStateOf(false) }
    var saveError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun save() {
        val n = qty.toIntOrNull()
        if (n == null || n < 1) { saveError = "Số lượng phải là số nguyên từ 1."; return }
        saving = true
        saveError = null
        scope.launch {
            val r = repository.overrideForecast(f.id, n, reason.trim().ifEmpty { null })
            saving = false
            r.fold(onSuccess = { editing = false; onSaved() }, onFailure = { saveError = it.message })
        }
    }

    SqCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(f.item?.name ?: "Món", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
                Text("Khoảng ${f.low}–${f.high} · tính lúc ${shortDateTime(f.createdAt)}", fontSize = 12.sp, color = SqInkSoft)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("${f.chosenQuantity ?: f.recommended}", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep)
                Text(if (f.chosenQuantity != null) "đã chỉnh (gợi ý ${f.recommended})" else "suất gợi ý", fontSize = 11.sp, color = SqInkMuted)
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        ConfidenceBadge(f.confidence)
        f.warning?.let { w ->
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqButterWash).padding(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.WarningAmber, contentDescription = null, tint = SqInk, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(stripSymbols(w), fontSize = 12.sp, color = SqInk)
            }
        }
        Row {
            TextButton(onClick = { showWhy = !showWhy }) { Text(if (showWhy) "Ẩn giải thích" else "Vì sao?", color = SqCoral) }
            TextButton(onClick = { editing = !editing }) { Text(if (editing) "Đóng" else "Điều chỉnh", color = SqCoral) }
        }

        if (showWhy) {
            Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(SqSurfaceSoft).padding(12.dp)) {
                f.explanation?.let { Text(it, fontSize = 12.sp, color = SqInkSoft) }
                Spacer(modifier = Modifier.height(6.dp))
                val c = f.components
                InfoRow("Phương pháp", forecastMethodLabel(f.method))
                c.num("historyDaysCount")?.let { InfoRow("Số ngày có dữ liệu", "%.0f".format(it)) }
                c.num("dowSampleCount")?.let { InfoRow("Số ngày cùng thứ", "%.0f".format(it)) }
                c.num("baseDowAverage")?.let { InfoRow("Trung bình cùng thứ", "%.1f suất".format(it)) }
                c.num("eventFactor")?.let { InfoRow("Hệ số sự kiện", "×%.2f".format(it)) }
                c.num("mape7Days")?.let { InfoRow("Chênh lệch làm - bán 7 ngày", "%.0f%%".format(it * 100)) }
                InfoRow("Nguồn dữ liệu", "Số thực tế cuối ngày đã nhập")
            }
        }

        if (editing) {
            Spacer(modifier = Modifier.height(4.dp))
            f.fallbackSuggestions.orEmpty().takeIf { it.isNotEmpty() }?.let { options ->
                Text("Phương án gợi ý", fontSize = 12.sp, color = SqInkSoft)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    options.forEach { o ->
                        SqChip("${o.recommendedQuantity} suất", qty == o.recommendedQuantity.toString()) { qty = o.recommendedQuantity.toString() }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }
            Row {
                SqField("Số lượng làm", qty, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Number) { qty = it.filter(Char::isDigit).take(4) }
                Spacer(modifier = Modifier.width(10.dp))
                SqField("Lý do (tùy chọn)", reason, modifier = Modifier.weight(2f), placeholder = "Có đoàn đặt trước") { reason = it.take(300) }
            }
            InlineError(saveError)
            Spacer(modifier = Modifier.height(8.dp))
            PrimaryButton("Lưu điều chỉnh", loading = saving, onClick = ::save)
        }
    }
}
