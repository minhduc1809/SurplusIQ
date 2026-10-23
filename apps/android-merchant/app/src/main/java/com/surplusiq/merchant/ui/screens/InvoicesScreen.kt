package com.surplusiq.merchant.ui.screens

import android.util.Base64
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.surplusiq.merchant.data.InvoiceDto
import com.surplusiq.merchant.data.StoreRepository
import com.surplusiq.merchant.ui.components.*
import com.surplusiq.merchant.ui.theme.*
import kotlinx.coroutines.launch

private val INVOICE_STATUS = mapOf(
    "PAID" to ("Đã thanh toán" to SqCoralDeep),
    "PENDING" to ("Chờ thanh toán" to SqInkSoft),
    "FAILED" to ("Thất bại" to SqError),
    "REFUNDED" to ("Đã hoàn tiền" to SqCoralDeep),
)

/** S18 - Hóa đơn gói (GET store/subscription/invoices, invoices/:id/pdf trả PDF base64). */
@Composable
fun InvoicesScreen(repository: StoreRepository, onBack: () -> Unit) {
    var invoices by remember { mutableStateOf<List<InvoiceDto>?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var year by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val savePdf = rememberFileSaver("application/pdf") { ok -> message = if (ok) "Đã lưu hóa đơn." else "Không ghi được tệp." }

    fun load() {
        isLoading = true
        error = null
        scope.launch {
            val result = repository.getInvoices()
            isLoading = false
            result.fold(onSuccess = { invoices = it }, onFailure = { error = it.message })
        }
    }

    fun download(inv: InvoiceDto) {
        message = null
        scope.launch {
            repository.getInvoicePdf(inv.id).fold(
                onSuccess = { savePdf(it.filename, Base64.decode(it.dataBase64, Base64.DEFAULT)) },
                onFailure = { message = it.message }
            )
        }
    }

    LaunchedEffect(Unit) { load() }

    Box(Modifier.fillMaxSize().background(SqCanvas), contentAlignment = Alignment.TopCenter) {
    Column(modifier = Modifier.widthIn(max = 1000.dp).fillMaxSize().padding(20.dp)) {
        ScreenHeader("Hóa đơn gói", onBack)
        Spacer(modifier = Modifier.height(8.dp))

        when {
            isLoading -> FullScreenLoading()
            error != null -> ErrorState(message = error!!, onRetry = ::load)
            invoices.isNullOrEmpty() -> EmptyState("Chưa có hóa đơn", "Gói Cơ bản và thời gian dùng thử không phát sinh phí.")
            else -> {
                val all = invoices!!
                val years = all.map { it.createdAt.take(4) }.distinct().sortedDescending()
                val shown = all.filter { year == null || it.createdAt.startsWith(year!!) }
                Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SqChip("Tất cả", year == null) { year = null }
                    years.forEach { y -> SqChip(y, year == y) { year = y } }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(SqCoralWash).padding(16.dp)) {
                    Text("TỔNG ĐÃ CHI${year?.let { " NĂM $it" } ?: ""}", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = SqCoralDeep, letterSpacing = 0.5.sp)
                    Text(currency(shown.filter { it.status == "PAID" }.sumOf { it.amount }), fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = SqInk, modifier = Modifier.padding(top = 2.dp))
                    Text("${shown.size} hóa đơn", fontSize = 12.sp, color = SqInkSoft)
                }
                InlineSuccess(message)
                Spacer(modifier = Modifier.height(10.dp))
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(340.dp),
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(shown) { inv ->
                        val (label, color) = INVOICE_STATUS[inv.status] ?: (inv.status to SqInkSoft)
                        Row(
                            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(SqSurface).padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("${shortDate(inv.periodStart)} – ${shortDate(inv.periodEnd)}", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = SqInk)
                                Text(currency(inv.amount), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = SqInk)
                                Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = color)
                                Text("Mã giao dịch: ${inv.paymentTxnId ?: "—"}", fontSize = 11.sp, color = SqInkMuted)
                                Text("Ngày thanh toán: ${shortDate(inv.createdAt)}", fontSize = 11.sp, color = SqInkMuted)
                            }
                            IconButton(onClick = { download(inv) }) {
                                Icon(Icons.Default.Download, contentDescription = "Tải hóa đơn", tint = SqCoral)
                            }
                        }
                    }
                }
            }
        }
    }
    }
}
