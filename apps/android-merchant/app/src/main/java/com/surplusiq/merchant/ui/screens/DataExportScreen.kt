package com.surplusiq.merchant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.GsonBuilder
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch
import java.time.LocalDate

/**
 * S14 - Xuất dữ liệu (GET store/export/orders, store/export/accounting).
 * Backend trả file ngay trong response, không có hàng đợi "yêu cầu xuất" / lịch sử / link 24h
 * -> màn xuất trực tiếp rồi lưu qua hộp thoại hệ thống.
 */
@Composable
fun DataExportScreen(repository: StoreRepository, onBack: () -> Unit) {
    var scopeKey by remember { mutableStateOf("orders") }
    var format by remember { mutableStateOf("csv") }
    var fromDate by remember { mutableStateOf("") }
    var toDate by remember { mutableStateOf("") }
    var exporting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var success by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val onSaved: (Boolean) -> Unit = { ok -> if (ok) success = "Đã lưu tệp." else error = "Không ghi được tệp." }
    val saveCsv = rememberFileSaver("text/csv", onSaved)
    val saveJson = rememberFileSaver("application/json", onSaved)

    fun export() {
        error = null
        success = null
        val from = fromDate.trim().ifEmpty { null }
        val to = toDate.trim().ifEmpty { null }
        // Backend chỉ lọc khi có đủ cả hai ngày.
        if ((from == null) != (to == null)) { error = "Nhập đủ cả Từ ngày và Đến ngày, hoặc để trống cả hai."; return }
        if (from != null && runCatching { LocalDate.parse(from) <= LocalDate.parse(to) }.getOrNull() != true) {
            error = "Ngày phải có dạng YYYY-MM-DD và Từ ngày không sau Đến ngày."
            return
        }
        exporting = true
        scope.launch {
            val result = if (scopeKey == "orders") repository.exportOrders(from, to) else repository.exportAccounting(from, to)
            exporting = false
            result.fold(
                onSuccess = { r ->
                    if (format == "csv") {
                        saveCsv(r.filename, r.content.toByteArray(Charsets.UTF_8))
                    } else {
                        val json = GsonBuilder().setPrettyPrinting().create().toJson(r.data ?: r.statements)
                        saveJson(r.filename.removeSuffix(".csv") + ".json", json.toByteArray(Charsets.UTF_8))
                    }
                },
                onFailure = { error = it.message }
            )
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(SqCanvas).verticalScroll(rememberScrollState()).padding(20.dp)) {
        ScreenHeader("Xuất dữ liệu", onBack)
        Spacer(modifier = Modifier.height(12.dp))
        SqCard {
            Text("Phạm vi", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SqChip("Đơn hàng", scopeKey == "orders") { scopeKey = "orders" }
                SqChip("Sao kê đối soát", scopeKey == "accounting") { scopeKey = "accounting" }
            }
            Text(
                if (scopeKey == "orders") "Khách hàng chỉ hiện mã định danh, không kèm tên/SĐT." else "Chỉ Chủ quán được xuất sao kê.",
                fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 6.dp)
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text("Định dạng", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = SqInk)
            Spacer(modifier = Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SqChip("CSV", format == "csv") { format = "csv" }
                SqChip("JSON", format == "json") { format = "json" }
            }
            Spacer(modifier = Modifier.height(14.dp))
            Row {
                SqField("Từ ngày", fromDate, modifier = Modifier.weight(1f), placeholder = "2026-10-01") { fromDate = it.take(10) }
                Spacer(modifier = Modifier.width(10.dp))
                SqField("Đến ngày", toDate, modifier = Modifier.weight(1f), placeholder = "2026-10-31") { toDate = it.take(10) }
            }
            Text("Để trống để xuất toàn bộ.", fontSize = 11.sp, color = SqInkMuted, modifier = Modifier.padding(top = 4.dp))
        }
        InlineError(error)
        InlineSuccess(success)
        Spacer(modifier = Modifier.height(12.dp))
        PrimaryButton("Xuất và lưu tệp", loading = exporting, onClick = ::export)
    }
}
