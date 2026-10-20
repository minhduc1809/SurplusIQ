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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.ForecastDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import java.time.LocalDate
import java.time.format.DateTimeFormatter

private val DAY_FMT = DateTimeFormatter.ofPattern("dd/MM")
private val DOW = listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN")

/**
 * S35 - Độ chính xác và xu hướng dự báo. Xu hướng = 7 lần GET store/forecast?targetDate= (backend tính và lưu
 * dự báo cho ngày chưa có). Backend chưa có API sai số dự báo theo ngày (MAE, so với "Nấu như hôm qua") -
 * tab Độ chính xác chỉ hiện chỉ số mape7Days mà engine trả kèm dự báo.
 */
@Composable
fun ForecastTrendsScreen(repository: StoreRepository, onNavigate: (String) -> Unit, onBack: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Độ chính xác và xu hướng", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        ProGate(repository, "Xu hướng dự báo", onUpgrade = { onNavigate("subscription") }) { TrendsContent(repository) }
    }
}

@Composable
private fun TrendsContent(repository: StoreRepository) {
    val days = remember { (1L..7L).map { LocalDate.now().plusDays(it) } }
    var byDay by remember { mutableStateOf<List<List<ForecastDto>>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var tab by remember { mutableIntStateOf(1) }
    var itemId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(reloadKey) {
        error = null
        val results = coroutineScope { days.map { d -> async { repository.getForecasts(d.toString()) } }.awaitAll() }
        val failure = results.firstNotNullOfOrNull { it.exceptionOrNull() }
        if (failure != null) error = failure.message
        else byDay = results.map { it.getOrThrow() }.also { itemId = itemId ?: it.first().firstOrNull()?.itemId }
    }

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        SqChip("Độ chính xác", tab == 0) { tab = 0 }
        SqChip("Xu hướng 7 ngày", tab == 1) { tab = 1 }
    }
    Spacer(modifier = Modifier.height(12.dp))

    val data = byDay
    when {
        error != null -> ErrorState(error!!) { reloadKey++ }
        data == null -> FullScreenLoading()
        data.first().isEmpty() -> EmptyState("Chưa có món đang bán", "Thêm món để hệ thống dự báo.")
        tab == 0 -> AccuracyTab(data.first())
        else -> {
            val items = data.first()
            ChipRow(items.map { it.itemId to (it.item?.name ?: "Món") }, itemId) { itemId = it }
            Spacer(modifier = Modifier.height(12.dp))
            val series = data.map { list -> list.firstOrNull { it.itemId == itemId } }
            if (series.any { it == null }) {
                EmptyState("Thiếu dữ liệu", "Không đủ dự báo 7 ngày cho món này.")
            } else {
                val f = series.filterNotNull()
                SqCard {
                    SectionTitle("Số lượng gợi ý 7 ngày tới")
                    Spacer(modifier = Modifier.height(10.dp))
                    LineChart(
                        series = listOf(
                            ChartSeries("Cao", f.map { it.high.toFloat() }, SqButter),
                            ChartSeries("Gợi ý", f.map { (it.chosenQuantity ?: it.recommended).toFloat() }, SqCoral),
                            ChartSeries("Thấp", f.map { it.low.toFloat() }, SqMint),
                        ),
                        xLabels = days.map { it.format(DAY_FMT) },
                        describe = "Biểu đồ số lượng gợi ý 7 ngày tới, từ ${f.minOf { it.low }} đến ${f.maxOf { it.high }} suất"
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                SqCard {
                    days.zip(f).forEach { (d, fc) ->
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text("${DOW[d.dayOfWeek.value - 1]} ${d.format(DAY_FMT)}", fontSize = 13.sp, color = SqInkSoft, modifier = Modifier.width(80.dp))
                            Text("${fc.chosenQuantity ?: fc.recommended}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk, modifier = Modifier.width(40.dp))
                            Text("${fc.low}–${fc.high}", fontSize = 12.sp, color = SqInkSoft, modifier = Modifier.weight(1f))
                            ConfidenceBadge(fc.confidence)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AccuracyTab(forecasts: List<ForecastDto>) {
    InfoBanner("Máy chủ chưa lưu sai số dự báo theo ngày, nên chưa so sánh được với cách \"Nấu như hôm qua\" và chưa có biểu đồ tuần/tháng. Dưới đây là chênh lệch giữa số làm và số bán 7 ngày gần nhất mà hệ thống dùng để đánh giá độ tin cậy.")
    Spacer(modifier = Modifier.height(12.dp))
    SqCard {
        forecasts.forEach { f ->
            val mape = f.components.num("mape7Days")
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(f.item?.name ?: "Món", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                    Text(forecastMethodLabel(f.method), fontSize = 11.sp, color = SqInkMuted)
                }
                Text(
                    if (mape != null) "%.0f%%".format(mape * 100) else "Chưa đủ dữ liệu",
                    fontSize = 13.sp, fontWeight = FontWeight.Bold,
                    color = when { mape == null -> SqInkMuted; mape <= 0.2 -> SqMintDeep; mape <= 0.35 -> SqInk; else -> SqCoralDeep }
                )
            }
        }
    }
}
